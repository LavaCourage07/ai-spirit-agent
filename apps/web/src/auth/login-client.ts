import type { WebGithubTicketLoginRequest, WebGoogleTicketLoginRequest, WebPasswordLoginResponse } from '@repo/contracts'
import { saveClientSession } from '@/auth/client-session'
import { getWebGithubAuthUrl, getWebGoogleAuthUrl, loginWithWebGithubTicket, loginWithWebGoogleTicket } from '@/auth/api'
import { http } from '@/lib/http'

const githubOAuthStateStorageKey = 'web:github-oauth-state'
const googleOAuthStateStorageKey = 'web:google-oauth-state'

export type WebLoginInput = {
  email: string
  password: string
}

export async function loginByApi(input: WebLoginInput) {
  const response = await http.post<WebPasswordLoginResponse, WebLoginInput>('/auth/web/password/login', input)
  saveClientSession(response)
}

export async function redirectToGithubLogin() {
  const response = await getWebGithubAuthUrl()

  window.sessionStorage.setItem(githubOAuthStateStorageKey, response.state)
  window.location.assign(response.url)
}

export async function loginByGithubTicket(input: WebGithubTicketLoginRequest) {
  const response = await loginWithWebGithubTicket(input)
  saveClientSession(response)
}

export async function redirectToGoogleLogin() {
  const response = await getWebGoogleAuthUrl()

  window.sessionStorage.setItem(googleOAuthStateStorageKey, response.state)
  window.location.assign(response.url)
}

export async function loginByGoogleTicket(input: WebGoogleTicketLoginRequest) {
  const response = await loginWithWebGoogleTicket(input)
  saveClientSession(response)
}

export function consumeStoredGithubOAuthState() {
  const state = window.sessionStorage.getItem(githubOAuthStateStorageKey)

  window.sessionStorage.removeItem(githubOAuthStateStorageKey)

  return state
}

export function consumeStoredGoogleOAuthState() {
  const state = window.sessionStorage.getItem(googleOAuthStateStorageKey)

  window.sessionStorage.removeItem(googleOAuthStateStorageKey)

  return state
}
