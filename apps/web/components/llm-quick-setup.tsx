"use client"

import { useState } from "react"
import { X } from "lucide-react"

import {
  createDefaultLlmConfigItem,
  selectLocalLlmConfig,
  upsertLocalLlmConfigItem,
  type LocalLlmConfigItem,
} from "@/auth/local-llm-config"
import { llmProviderPresets } from "@/auth/llm-provider-presets"

type LlmQuickSetupProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

const inputClassName = "h-10 w-full rounded-lg border border-[#d9dfdc] bg-[#fffefa] px-3 text-sm text-[#53615e] outline-none transition-colors placeholder:text-[#b0b8b4] focus:border-[#9baba4] focus:ring-2 focus:ring-[#dce5e0]"

export function LlmQuickSetup({ open, onOpenChange, onSaved }: LlmQuickSetupProps) {
  const [form, setForm] = useState<LocalLlmConfigItem>(() => createDefaultLlmConfigItem())
  const [notice, setNotice] = useState("")

  if (!open) {
    return null
  }

  function handlePreset(preset: (typeof llmProviderPresets)[number]) {
    setForm((current) => ({
      ...current,
      name: preset.name,
      providerName: preset.providerName,
      baseURL: preset.baseURL,
      model: preset.model,
      wireApi: preset.wireApi,
      apiKey: "",
    }))
    setNotice(preset.id === "claude-compatible"
      ? "Claude 原生接口暂不直接兼容，请填写支持 OpenAI 格式的 Claude 中转地址。"
      : "已填入常用配置，请继续填写 API Key。")
  }

  function handleSave() {
    const nextForm = {
      ...form,
      name: form.name.trim(),
      providerName: form.providerName?.trim() || "OpenAI Compatible",
      baseURL: form.baseURL.trim(),
      model: form.model.trim(),
      apiKey: form.apiKey.trim(),
      enabled: true,
    }

    if (!nextForm.baseURL || !nextForm.model || !nextForm.apiKey) {
      setNotice("请填写 Base URL、模型名称和 API Key。")
      return
    }

    const item = upsertLocalLlmConfigItem(nextForm)
    selectLocalLlmConfig(item.id)
    onSaved?.()
    onOpenChange(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#27353a]/35 px-4 py-6 backdrop-blur-[2px]" role="presentation">
      <section
        aria-labelledby="llm-quick-setup-title"
        aria-modal="true"
        className="max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#e5e0d8] bg-[#fffefa] p-5 shadow-[0_24px_80px_rgba(39,53,58,0.20)] sm:p-7"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#a37b4f]">First connection</p>
            <h2 className="mt-2 text-xl font-semibold text-[#27353a]" id="llm-quick-setup-title">先接入一个模型，开始聊天</h2>
            <p className="mt-2 text-xs leading-5 text-[#7d8985]">选择你购买 Token 的服务商，填入自己的 API Key。Key 只保存在当前浏览器。</p>
          </div>
          <button
            aria-label="关闭模型配置"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#9aa39f] hover:bg-[#f1f3f1] hover:text-[#53615e]"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {llmProviderPresets.map((preset) => (
            <button
              className={`min-h-16 rounded-lg border px-3 py-2 text-left transition-colors hover:border-[#a37b4f] ${form.providerName === preset.providerName && form.name === preset.name ? "border-[#a37b4f] bg-[#fcf8f1] ring-1 ring-[#d9c2a7]" : "border-[#e1e3df] bg-[#fffefa]"}`}
              key={preset.id}
              onClick={() => handlePreset(preset)}
              type="button"
            >
              <span className="block text-xs font-semibold text-[#3d4b4d]">{preset.name}</span>
              <span className="mt-1 block text-[10px] leading-4 text-[#9a938c]">{preset.description}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1.5" htmlFor="quick-llm-base-url">
            <span className="text-[11px] font-medium text-[#687572]">接口地址 Base URL</span>
            <input className={inputClassName} id="quick-llm-base-url" onChange={(event) => setForm((current) => ({ ...current, baseURL: event.currentTarget.value }))} placeholder="https://api.example.com/v1" value={form.baseURL} />
          </label>
          <label className="grid gap-1.5" htmlFor="quick-llm-model">
            <span className="text-[11px] font-medium text-[#687572]">模型名称</span>
            <input className={inputClassName} id="quick-llm-model" onChange={(event) => setForm((current) => ({ ...current, model: event.currentTarget.value }))} placeholder="例如：deepseek-chat" value={form.model} />
          </label>
          <label className="grid gap-1.5" htmlFor="quick-llm-api-key">
            <span className="text-[11px] font-medium text-[#687572]">API Key</span>
            <input className={inputClassName} id="quick-llm-api-key" onChange={(event) => setForm((current) => ({ ...current, apiKey: event.currentTarget.value }))} placeholder="粘贴你的 API Key" type="password" value={form.apiKey} />
          </label>
        </div>

        {notice ? <p className="mt-3 rounded-lg bg-[#fcf8f1] px-3 py-2 text-xs leading-5 text-[#8b6331]">{notice}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="h-10 rounded-lg px-4 text-sm font-medium text-[#687572] hover:bg-[#f1f3f1]" onClick={() => onOpenChange(false)} type="button">稍后配置</button>
          <button className="h-10 rounded-lg bg-[#27353a] px-5 text-sm font-semibold text-white hover:bg-[#35484c]" onClick={handleSave} type="button">保存并开始聊天</button>
        </div>
      </section>
    </div>
  )
}
