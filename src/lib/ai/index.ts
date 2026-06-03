import { claudeAdapter } from './adapters/claude'
import { openaiAdapter } from './adapters/openai'
import { geminiAdapter } from './adapters/gemini'
import type { AIRequest, AIResponse, AIProvider } from './types'
import { DEFAULT_MODELS } from './types'

export { DEFAULT_MODELS }
export type { AIProvider, AIRequest, AIResponse }

export async function callAI(request: AIRequest): Promise<AIResponse> {
  // Use default model if not specified
  const req = {
    ...request,
    model: request.model || DEFAULT_MODELS[request.provider],
  }

  switch (req.provider) {
    case 'claude':  return claudeAdapter(req)
    case 'openai':  return openaiAdapter(req)
    case 'gemini':  return geminiAdapter(req)
    default:        return claudeAdapter(req)
  }
}

// Resolve which API key to use:
// 1. User's own key (if supplied) — free for them, costs us nothing
// 2. Stead's default key for their chosen provider
export function resolveApiKey(
  provider: AIProvider,
  userApiKey?: string | null
): string {
  if (userApiKey) return userApiKey

  switch (provider) {
    case 'claude':  return process.env.ANTHROPIC_API_KEY ?? ''
    case 'openai':  return process.env.OPENAI_API_KEY ?? ''
    case 'gemini':  return process.env.GOOGLE_AI_API_KEY ?? ''
    default:        return process.env.ANTHROPIC_API_KEY ?? ''
  }
}
