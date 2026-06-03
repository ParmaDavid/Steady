import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIRequest, AIResponse } from '../types'

export async function geminiAdapter(request: AIRequest): Promise<AIResponse> {
  const genAI = new GoogleGenerativeAI(request.apiKey)
  const model = genAI.getGenerativeModel({
    model: request.model,
    systemInstruction: request.systemPrompt,
  })

  // Convert message history to Gemini format
  const history = request.messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const lastMessage = request.messages[request.messages.length - 1]
  const chat = model.startChat({ history })
  const result = await chat.sendMessage(lastMessage?.content ?? '')
  const content = result.response.text()

  return { content, provider: 'gemini', model: request.model }
}
