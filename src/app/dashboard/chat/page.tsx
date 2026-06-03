'use client'
import { useState, useRef, useEffect } from 'react'
import type { AIMessage } from '@/lib/ai/types'

const QUICK_PROMPTS = [
  'What\'s coming up this week?',
  'Log my weight',
  'Log blood pressure',
  'Log a workout',
  'Log a meal',
  'What household tasks are due?',
  'Log vehicle service',
  'How is my health trending?',
]

interface Message extends AIMessage {
  id: string
  loading?: boolean
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m your Stead assistant. You can log anything — weight, meals, workouts, vehicle service, household tasks — just by telling me. Or ask me questions like "what\'s coming up this week?" What can I help with?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content }
    const loadingMsg: Message = { id: 'loading', role: 'assistant', content: '', loading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setLoading(true)

    // Build history (exclude welcome + loading)
    const history: AIMessage[] = messages
      .filter(m => m.id !== 'welcome' && !m.loading)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, history }),
      })
      const data = await res.json() as { reply: string; error?: string }

      setMessages(prev =>
        prev.map(m =>
          m.id === 'loading'
            ? { id: Date.now().toString(), role: 'assistant', content: data.reply ?? data.error ?? 'Something went wrong.' }
            : m
        )
      )
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === 'loading'
            ? { id: Date.now().toString(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }
            : m
        )
      )
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">Chat</h1>
        <p className="text-sm text-gray-500">Log anything or ask a question</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.loading ? (
                <div className="flex gap-1 items-center py-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                msg.content.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                ))
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-6 py-2 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            disabled={loading}
            className="shrink-0 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKey}
            disabled={loading}
            rows={1}
            placeholder="Type anything — log weight, ask a question, add an event…"
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 min-h-[40px] max-h-[120px]"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-40 transition-colors shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
