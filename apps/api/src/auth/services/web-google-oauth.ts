import { uuidv7 } from 'uuidv7'
import {
  WebGoogleAuthUrlResponseSchema,
  WebGoogleTicketLoginResponseSchema,
} from '@repo/contracts'
import type { Context } from 'hono'
import type { ApiBindings } from '@/bindings'
import { getDb } from '@/db/client'
import { getApiEnv } from '@/env'
import { authMethodDisabledError, authUnauthorizedError, adminRoleRequiredError } from '@/auth/errors'
import { normalizeEmail } from '@/auth/request-context'
import {
  createOAuthWebUser,
  ensureUserHasRole,
  findRoleIdByCode,
  findUserByNormalizedEmail,
  findWebUserByOAuthAccount,
  getWebApplicationId,
  insertOauthLoginTicket,
  isAuthMethodEnabledForApp,
  linkOAuthAccountToUser,
  consumeOauthLoginTicket,
} from '@/auth/repository'
import { hashTokenJti } from '@/auth/token-hash'
import {
  createOAuthState,
  isAllowedWebOrigin,
  issueWebSessionForUser,
  resolveWebOrigin,
  verifyOAuthState,
} from './web-github-oauth'

const googleAuthorizeUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
const googleAccessTokenUrl = 'https://oauth2.googleapis.com/token'
const googleUserInfoUrl = 'https://openidconnect.googleapis.com/v1/userinfo'
const oauthTicketTtlMs = 2 * 60 * 1000

type GoogleProfile = {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
}

function getGoogleOAuthConfig(c: Context<{ Bindings: ApiBindings }>) {
  const env = getApiEnv(c.env)

  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    throw authMethodDisabledError('Google login is not configured')
  }

  return {
    env,
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    callbackUrl: env.GOOGLE_OAUTH_CALLBACK_URL ?? new URL('/auth/web/google/callback', c.req.url).toString(),
  }
}

async function exchangeGoogleCode(params: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}) {
  const response = await fetch(googleAccessTokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const payload = await response.json() as { access_token?: string; error_description?: string }

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? 'Google token exchange failed')
  }

  return payload.access_token
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch(googleUserInfoUrl, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const payload = await response.json() as GoogleProfile & { error?: string }

  if (!response.ok || !payload.sub || !payload.email || payload.email_verified !== true) {
    throw new Error(payload.error ?? 'Google profile is unavailable or unverified')
  }

  return payload
}

async function resolveGoogleWebUser(params: {
  c: Context<{ Bindings: ApiBindings }>
  profile: GoogleProfile
}) {
  const db = getDb(params.c.env.DB)
  const nowMs = Date.now()
  const email = params.profile.email!
  const normalizedEmail = normalizeEmail(email)
  const existingGoogleUser = await findWebUserByOAuthAccount(db, 'google', params.profile.sub)

  if (existingGoogleUser) {
    if (existingGoogleUser.userStatus !== 'active') {
      throw authUnauthorizedError('Google account is not available')
    }

    return existingGoogleUser.userId
  }

  const existingEmailUser = await findUserByNormalizedEmail(db, normalizedEmail)
  const webRoleId = await findRoleIdByCode(db, 'web_user')

  if (!webRoleId) {
    throw adminRoleRequiredError()
  }

  if (existingEmailUser) {
    if (existingEmailUser.userStatus !== 'active') {
      throw authUnauthorizedError('Google account is not available')
    }

    await linkOAuthAccountToUser({
      db,
      oauthAccountId: uuidv7(),
      userId: existingEmailUser.userId,
      emailId: existingEmailUser.emailId,
      provider: 'google',
      providerUserId: params.profile.sub,
      providerLogin: null,
      nowMs,
    })
    await ensureUserHasRole({ db, bindingId: uuidv7(), userId: existingEmailUser.userId, roleId: webRoleId, nowMs })
    return existingEmailUser.userId
  }

  const userId = uuidv7()
  const emailId = uuidv7()

  await createOAuthWebUser({
    db,
    userId,
    emailId,
    oauthAccountId: uuidv7(),
    roleBindingId: uuidv7(),
    webRoleId,
    email,
    normalizedEmail,
    displayName: params.profile.name?.trim() || email,
    provider: 'google',
    providerUserId: params.profile.sub,
    providerLogin: null,
    nowMs,
  })

  return userId
}

export async function buildWebGoogleAuthUrl(c: Context<{ Bindings: ApiBindings }>) {
  const db = getDb(c.env.DB)

  if (!(await isAuthMethodEnabledForApp(db, 'web', 'google'))) {
    throw authMethodDisabledError('Google login is disabled')
  }

  const { env, clientId, callbackUrl } = getGoogleOAuthConfig(c)
  const redirectOrigin = resolveWebOrigin(c, env)
  const state = await createOAuthState(env.JWT_REFRESH_SECRET, redirectOrigin)
  const url = new URL(googleAuthorizeUrl)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('prompt', 'select_account')

  return WebGoogleAuthUrlResponseSchema.parse({ url: url.toString(), state })
}

export async function handleWebGoogleCallback(c: Context<{ Bindings: ApiBindings }>) {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const error = c.req.query('error')
  const { env, clientId, clientSecret, callbackUrl } = getGoogleOAuthConfig(c)
  let callbackResultUrl = new URL('/login/google/callback', env.WEB_ORIGIN)

  if (state) {
    try {
      const { redirectOrigin } = await verifyOAuthState(state, env.JWT_REFRESH_SECRET)
      if (isAllowedWebOrigin(env, redirectOrigin)) callbackResultUrl = new URL('/login/google/callback', redirectOrigin)
    } catch {
      // The normal flow reports the signed-state error below.
    }
  }

  if (error) {
    callbackResultUrl.searchParams.set('error', error)
    return c.redirect(callbackResultUrl.toString())
  }

  if (!code || !state) {
    callbackResultUrl.searchParams.set('error', 'Google callback payload is invalid')
    return c.redirect(callbackResultUrl.toString())
  }

  try {
    const { redirectOrigin } = await verifyOAuthState(state, env.JWT_REFRESH_SECRET)
    if (!isAllowedWebOrigin(env, redirectOrigin)) throw authUnauthorizedError('Google redirect origin is not allowed')
    callbackResultUrl = new URL('/login/google/callback', redirectOrigin)
    const accessToken = await exchangeGoogleCode({ code, clientId, clientSecret, redirectUri: callbackUrl })
    const profile = await fetchGoogleProfile(accessToken)
    const userId = await resolveGoogleWebUser({ c, profile })
    const db = getDb(c.env.DB)
    const ticket = uuidv7()
    const nowMs = Date.now()

    await insertOauthLoginTicket({
      db,
      id: uuidv7(),
      ticketHash: await hashTokenJti(ticket),
      userId,
      applicationId: await getWebApplicationId(db),
      provider: 'google',
      createdAtMs: nowMs,
      expiresAtMs: nowMs + oauthTicketTtlMs,
    })
    callbackResultUrl.searchParams.set('ticket', ticket)
    callbackResultUrl.searchParams.set('state', state)
  } catch (oauthError) {
    callbackResultUrl.searchParams.set('error', oauthError instanceof Error ? oauthError.message : 'Google login failed')
  }

  return c.redirect(callbackResultUrl.toString())
}

export async function handleWebGoogleTicketLogin(params: {
  c: Context<{ Bindings: ApiBindings }>
  ticket: string
}) {
  const db = getDb(params.c.env.DB)
  const ticket = await consumeOauthLoginTicket({
    db,
    ticketHash: await hashTokenJti(params.ticket),
    provider: 'google',
    nowMs: Date.now(),
  })

  if (!ticket) throw authUnauthorizedError('Google login ticket is invalid')

  return issueWebSessionForUser({ c: params.c, userId: ticket.userId })
}
