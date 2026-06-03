import OpenAI from 'openai'
import type { AIRequest, AIResponse } from '../types'

export async function openaiAdapter(request: AIRequest): Promise<AIResponse> {
  const client = new OpenAI({ apiKey: request.apiKey })

  const response = await client.chat.completions.create({
    model: request.model,
    max_tokens: request.maxTokens ?? 1024,
    messages: [
      { role: 'system', content: request.systemPrompt },
      ...request.messages.map(m => ({ role: m.role, content: m.content })),
    ],
  })

  const content = response.choices[0]?.message?.content ?? ''
  return { content, provider: 'openai', model: request.model }
}
