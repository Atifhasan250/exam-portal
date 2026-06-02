'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const INITIAL_MESSAGE = 'আমি এই নির্দিষ্ট resource-এর doubt solver bot। এই video/PDF/resource নিয়ে কোনো প্রশ্ন থাকলে জিজ্ঞেস করুন।'
const SUGGESTIONS = [
  'এই resource-টা summary করো',
  'গুরুত্বপূর্ণ topicগুলো দাও',
]

export default function ResourceAiAssistant({ resource, compact = false }) {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [messages, setMessages] = useState([{ role: 'assistant', text: INITIAL_MESSAGE }])
  const [input, setInput] = useState('')
  const [quota, setQuota] = useState({ limit: 5, remaining: 0, maxMessageChars: 50 })
  const [loadingQuota, setLoadingQuota] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    let active = true
    fetch('/api/resources/ai/quota', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        setQuota({
          limit: data.limit || 5,
          remaining: data.remaining || 0,
          maxMessageChars: data.maxMessageChars || 50,
          resetAt: data.resetAt,
        })
      })
      .catch(() => {
        if (active) setError('Quota load করা যায়নি।')
      })
      .finally(() => {
        if (active) setLoadingQuota(false)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const remaining = Number(quota.remaining) || 0
  const maxChars = Number(quota.maxMessageChars) || 50
  const trimmedInput = input.trim()
  const overLimit = trimmedInput.length > maxChars
  const disabled = thinking || loadingQuota || !isLoaded || !user || remaining <= 0

  const sendMessage = async (text = trimmedInput) => {
    const message = text.trim()
    if (!message || thinking) return
    if (!user) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    if (message.length > maxChars) {
      setError(`প্রশ্ন ${maxChars} অক্ষরের মধ্যে লিখুন।`)
      return
    }
    if (remaining <= 0) return

    setInput('')
    setError('')
    setThinking(true)
    setMessages((current) => [...current, { role: 'user', text: message }])

    try {
      const response = await fetch(`/api/resources/${resource.slug}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (data.quota) setQuota((current) => ({ ...current, ...data.quota, maxMessageChars: data.maxMessageChars || current.maxMessageChars }))
        throw new Error(data.error || 'AI response failed.')
      }
      setQuota((current) => ({ ...current, ...data.quota, maxMessageChars: data.maxMessageChars || current.maxMessageChars }))
      setMessages((current) => [...current, { role: 'assistant', text: data.answer || 'এই resource থেকে উত্তর পাওয়া যায়নি।' }])
    } catch (err) {
      setMessages((current) => [...current, { role: 'assistant', text: 'দুঃখিত, এখন উত্তর দেওয়া যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।' }])
      setError(err.message)
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className={`flex flex-col ${compact ? 'min-h-[480px]' : 'min-h-[420px]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-theme-accent">AI Assistant</p>
          <h2 className="text-lg font-extrabold leading-snug">Ask about this resource</h2>
        </div>
        <span className="rounded-lg border border-theme-border bg-theme-bg px-2.5 py-1 text-[11px] font-bold text-theme-secondary">
          {loadingQuota ? 'Loading...' : `${remaining}/${quota.limit || 5} left`}
        </span>
      </div>

      <div ref={scrollRef} className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((message, index) => <ChatBubble key={index} tone={message.role} text={message.text} />)}
        {messages.length === 1 ? (
          <div className="space-y-2 pt-1">
            <div className="flex flex-col items-end gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  disabled={disabled || suggestion.length > maxChars}
                  className="rounded-full border border-theme-border bg-theme-bg px-3 py-2 text-xs font-bold text-theme-primary transition-all hover:border-theme-accent hover:text-theme-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {thinking ? (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-theme-border bg-theme-surface px-4 py-3 text-theme-primary shadow-sm">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-theme-accent" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-theme-accent [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-theme-accent [animation-delay:240ms]" />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {remaining <= 0 ? (
          <p className="rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-xs font-bold text-theme-secondary">
            আজকের জন্য doubt solving শেষ। আগামীকাল আবার চেষ্টা করুন।
          </p>
        ) : null}
        {!user && isLoaded ? (
          <p className="rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-xs font-bold text-theme-secondary">
            AI doubt solver ব্যবহার করতে sign in করুন।
          </p>
        ) : null}
        {error ? <p className="text-xs font-bold text-theme-error-text">{error}</p> : null}
        <div className="flex items-center gap-2 rounded-2xl border border-theme-border bg-theme-surface p-2 shadow-inner">
          <input
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-theme-primary outline-none placeholder:text-theme-secondary disabled:cursor-not-allowed"
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setError('')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                sendMessage()
              }
            }}
            maxLength={maxChars + 10}
            placeholder="Ask a question..."
            disabled={disabled}
          />
          <button
            type="button"
            disabled={disabled || !trimmedInput || overLimit}
            onClick={() => sendMessage()}
            className="h-10 w-10 rounded-xl bg-theme-accent text-theme-accent-text transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <i className="fas fa-paper-plane text-sm" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-theme-secondary">
          <span>Daily messages remaining: {remaining}</span>
          <span className={overLimit ? 'text-theme-error-text' : ''}>{trimmedInput.length}/{maxChars}</span>
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ tone, text }) {
  const isUser = tone === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-theme-accent text-theme-accent-text'
          : 'bg-theme-surface border border-theme-border text-theme-primary shadow-sm'
      }`}
      >
        {text}
      </div>
    </div>
  )
}
