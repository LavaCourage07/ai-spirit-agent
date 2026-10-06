"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@repo/ui/button"
import { readClientSession } from "@/auth/client-session"
import { consumeStoredGoogleOAuthState, loginByGoogleTicket } from "@/auth/login-client"

function GoogleLoginCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const exchangedTicketRef = useRef<string | null>(null)

  useEffect(() => {
    const ticket = searchParams.get("ticket")
    const state = searchParams.get("state")
    const callbackError = searchParams.get("error")

    if (callbackError) {
      setError(callbackError)
      return
    }

    if (!ticket) {
      setError("Google 登录结果缺少 ticket")
      return
    }

    if (exchangedTicketRef.current === ticket) return

    const expectedState = consumeStoredGoogleOAuthState()

    if (!state || !expectedState || state !== expectedState) {
      setError("Google 登录状态校验失败")
      return
    }

    exchangedTicketRef.current = ticket

    void loginByGoogleTicket({ ticket })
      .then(() => router.replace("/"))
      .catch((ticketError) => {
        if (readClientSession()) {
          router.replace("/")
          return
        }

        setError(ticketError instanceof Error ? ticketError.message : "Google 登录失败")
      })
  }, [router, searchParams])

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-sm bg-white p-6 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Loader2 className="size-5" />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-slate-950">{error ? "Google 登录未完成" : "正在完成 Google 登录"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{error ?? "正在校验 Google 授权结果，并创建当前浏览器会话。"}</p>
        {error ? <Button asChild className="mt-5 w-full"><Link href="/login">返回登录页</Link></Button> : null}
      </section>
    </main>
  )
}

export default function GoogleLoginCallbackPage() {
  return <Suspense fallback={<div className="flex min-h-svh items-center justify-center">正在读取 Google 登录结果...</div>}><GoogleLoginCallbackContent /></Suspense>
}
