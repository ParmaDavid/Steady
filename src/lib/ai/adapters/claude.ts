import Anthropic from '@anthropic-ai/sdk'
import type { AIRequest, AIResponse } from '../types'

export async function claudeAdapter(request: AIRequest): Promise<AIResponse> {
  const client = new Anthropic({ apiKey: request.apiKey })

  const response = await client.messages.create({
    model: request.model,
    max_tokens: request.maxTokens ?? 1024,
    system: request.systemPrompt,
    messages: request.messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  })

  const content = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('')

  return { content, provider: 'claude', model: request.model }
}
