export type LlmProviderPreset = {
  id: string
  name: string
  description: string
  providerName: string
  baseURL: string
  model: string
  wireApi: "chat_completions" | "responses"
}

export const llmProviderPresets: LlmProviderPreset[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "适合日常对话与中文创作",
    providerName: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    wireApi: "chat_completions",
  },
  {
    id: "kimi",
    name: "Kimi",
    description: "Moonshot 官方 API",
    providerName: "Kimi",
    baseURL: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    wireApi: "chat_completions",
  },
  {
    id: "glm",
    name: "GLM",
    description: "智谱开放平台",
    providerName: "GLM",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    wireApi: "chat_completions",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "官方 OpenAI API",
    providerName: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    wireApi: "chat_completions",
  },
  {
    id: "claude-compatible",
    name: "Claude",
    description: "填写支持 OpenAI 格式的 Claude 中转地址",
    providerName: "Claude 兼容接口",
    baseURL: "",
    model: "claude-sonnet-4-5",
    wireApi: "chat_completions",
  },
  {
    id: "custom",
    name: "自定义中转站",
    description: "支持大多数 OpenAI 兼容服务",
    providerName: "Custom Gateway",
    baseURL: "",
    model: "",
    wireApi: "chat_completions",
  },
]
