import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import {
  WebGithubTicketLoginRequestSchema,
  WebGoogleTicketLoginRequestSchema,
  WebLogoutRequestSchema,
  WebPasswordLoginRequestSchema,
  WebTokenRefreshRequestSchema,
  buildSuccess,
} from '@repo/contracts'
import type { ApiBindings } from '@/bindings'
import { buildValidationErrorHandler } from '@/auth/http'
import {
  buildWebGithubAuthUrl,
  handleWebGithubCallback,
  handleWebGithubTicketLogin,
} from '@/auth/services/web-github-oauth'
import {
  buildWebGoogleAuthUrl,
  handleWebGoogleCallback,
  handleWebGoogleTicketLogin,
} from '@/auth/services/web-google-oauth'
import { handleWebLogout } from '@/auth/services/web-logout'
import { handleWebPasswordLogin } from '@/auth/services/web-password-login'
import { handleWebTokenRefresh } from '@/auth/services/web-token-refresh'
import { createApiMeta } from '@/lib/api-meta'

const webAuthRoute = new Hono<{ Bindings: ApiBindings }>()

webAuthRoute.get('/github/authorize', async (c) => {
  const res = await buildWebGithubAuthUrl(c)

  return c.json(buildSuccess(res, createApiMeta()))
})

webAuthRoute.get('/github/callback', async (c) => {
  return handleWebGithubCallback(c)
})

webAuthRoute.post(
  '/github/ticket/login',
  zValidator(
    'json',
    WebGithubTicketLoginRequestSchema,
    buildValidationErrorHandler('Invalid GitHub login payload'),
  ),
  async (c) => {
    const payload = c.req.valid('json')
    const res = await handleWebGithubTicketLogin({
      c,
      ticket: payload.ticket,
    })

    return c.json(buildSuccess(res, createApiMeta()))
  },
)

webAuthRoute.get('/google/authorize', async (c) => {
  const res = await buildWebGoogleAuthUrl(c)

  return c.json(buildSuccess(res, createApiMeta()))
})

webAuthRoute.get('/google/callback', async (c) => {
  return handleWebGoogleCallback(c)
})

webAuthRoute.post(
  '/google/ticket/login',
  zValidator(
    'json',
    WebGoogleTicketLoginRequestSchema,
    buildValidationErrorHandler('Invalid Google login payload'),
  ),
  async (c) => {
    const payload = c.req.valid('json')
    const res = await handleWebGoogleTicketLogin({ c, ticket: payload.ticket })

    return c.json(buildSuccess(res, createApiMeta()))
  },
)

webAuthRoute.post(
  '/password/login',
  zValidator(
    'json',
    WebPasswordLoginRequestSchema,
    buildValidationErrorHandler('Invalid web login payload'),
  ),
  async (c) => {
    const payload = c.req.valid('json')
    const res = await handleWebPasswordLogin({ c, payload })

    return c.json(buildSuccess(res, createApiMeta()))
  },
)

webAuthRoute.post(
  '/token/refresh',
  zValidator(
    'json',
    WebTokenRefreshRequestSchema,
    buildValidationErrorHandler('Invalid web refresh payload'),
  ),
  async (c) => {
    const payload = c.req.valid('json')
    const res = await handleWebTokenRefresh({ c, payload })

    return c.json(buildSuccess(res, createApiMeta()))
  },
)

webAuthRoute.post(
  '/logout',
  zValidator(
    'json',
    WebLogoutRequestSchema,
    buildValidationErrorHandler('Invalid web logout payload'),
  ),
  async (c) => {
    const payload = c.req.valid('json')
    const res = await handleWebLogout({ c, payload })

    return c.json(buildSuccess(res, createApiMeta()))
  },
)

export default webAuthRoute
