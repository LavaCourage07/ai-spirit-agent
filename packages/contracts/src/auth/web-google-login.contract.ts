import { z } from 'zod'
import { WebPasswordLoginResponseSchema } from './web-password-login.contract'

export const WebGoogleAuthUrlResponseSchema = z.object({
  url: z.string().url(),
  state: z.string().min(1),
})

export type WebGoogleAuthUrlResponse = z.infer<typeof WebGoogleAuthUrlResponseSchema>

export const WebGoogleTicketLoginRequestSchema = z.object({
  ticket: z.string().min(1),
})

export type WebGoogleTicketLoginRequest = z.infer<typeof WebGoogleTicketLoginRequestSchema>

export const WebGoogleTicketLoginResponseSchema = WebPasswordLoginResponseSchema

export type WebGoogleTicketLoginResponse = z.infer<typeof WebGoogleTicketLoginResponseSchema>
