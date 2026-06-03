export type AIProvider = 'claude' | 'openai' | 'gemini'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIRequest {
  provider: AIProvider
  apiKey: string
  model: string
  systemPrompt: string
  messages: AIMessage[]
  maxTokens?: number
}

export interface AIResponse {
  content: string
  provider: AIProvider
  model: string
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
}
