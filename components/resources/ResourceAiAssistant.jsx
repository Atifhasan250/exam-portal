'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const INITIAL_MESSAGE = 'আমি এই নির্দিষ্ট resource-এর doubt solver bot। এই resource নিয়ে কোনো প্রশ্ন থাকলে জিজ্ঞেস করুন।'
const SUGGESTIONS = [
  'এই resource-টা summary করো',
  'গুরুত্বপূর্ণ topic গুলো দাও',
]

export default function ResourceAiAssistant({ resource, compact = false }) {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [messages, setMessages] = useState([{ role: 'assistant', text: INITIAL_MESSAGE }])
  const [input, setInput] = useState('')
  const [quota, setQuota] = useState({ limit: 5, remaining: 0, maxMessageChars: 50 })
  const [loadingQuota, setLoadingQuota] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)

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
    if (!isLoaded || !user || !resource?.slug) {
      setMessages([{ role: 'assistant', text: INITIAL_MESSAGE }])
      return undefined
    }

    let active = true
    setLoadingHistory(true)
    fetch(`/api/resources/${resource.slug}/ai-chat`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : { messages: [] })
      .then((data) => {
        if (!active) return
        const history = Array.isArray(data.messages) ? data.messages : []
        if (data.quota) {
          setQuota((current) => ({
            ...current,
            ...data.quota,
            maxMessageChars: data.maxMessageChars || current.maxMessageChars,
          }))
        }
        setMessages([{ role: 'assistant', text: INITIAL_MESSAGE }, ...history])
      })
      .catch(() => {
        if (active) setMessages([{ role: 'assistant', text: INITIAL_MESSAGE }])
      })
      .finally(() => {
        if (active) setLoadingHistory(false)
      })

    return () => { active = false }
  }, [isLoaded, user, resource?.slug])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [input])

  const remaining = Number(quota.remaining) || 0
  const maxChars = Number(quota.maxMessageChars) || 50
  const trimmedInput = input.trim()
  const overLimit = trimmedInput.length > maxChars
  const disabled = thinking || loadingQuota || loadingHistory || !isLoaded || !user || remaining <= 0
  const hasLoadedInitialUi = isLoaded && !loadingQuota && !loadingHistory
  const showInitialSkeleton = !hasLoadedInitialUi && messages.length === 1 && !thinking
  const panelHeight = compact
    ? 'h-[620px] max-h-[calc(100vh-140px)] min-h-[520px]'
    : 'h-[500px] max-h-[calc(100vh-240px)] min-h-[380px] lg:h-[460px]'

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
      if (data.mergeWithPreviousAssistant) {
        setMessages((current) => mergeContinuationMessages(current, data.answer || 'এই resource থেকে উত্তর পাওয়া যায়নি।'))
      } else {
        setMessages((current) => [...current, { role: 'assistant', text: data.answer || 'এই resource থেকে উত্তর পাওয়া যায়নি।' }])
      }
    } catch (err) {
      setMessages((current) => [...current, { role: 'assistant', text: 'দুঃখিত, এখন উত্তর দেওয়া যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।' }])
      console.error('[resource-ai] message failed', err)
      setError('')
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className={`flex min-h-0 flex-col ${panelHeight}`}>
      {showInitialSkeleton ? <AiAssistantSkeleton /> : (
        <>
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold leading-snug">Ask about this resource</h2>
            </div>
            <span className="rounded-lg border border-theme-border bg-theme-bg px-2.5 py-1 text-[11px] font-bold text-theme-secondary">
              {`${remaining}/${quota.limit || 5} left`}
            </span>
          </div>

          <div ref={scrollRef} className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
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

          <div className="mt-4 shrink-0 space-y-2">
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
            <div className="flex items-end gap-2 rounded-2xl border border-theme-border bg-theme-surface p-2 shadow-inner">
              <textarea
                ref={textareaRef}
                rows={1}
                className="max-h-[120px] min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2 text-sm font-medium leading-6 text-theme-primary outline-none placeholder:text-theme-secondary disabled:cursor-not-allowed"
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
        </>
      )}
    </div>
  )
}

function mergeContinuationMessages(messages, answer) {
  const next = [...messages]
  const lastAssistantIndex = next.map((message) => message.role).lastIndexOf('assistant')

  if (lastAssistantIndex >= 0) {
    next[lastAssistantIndex] = {
      ...next[lastAssistantIndex],
      text: `${next[lastAssistantIndex].text}\n\n${answer}`.trim(),
    }
    return next
  }

  return [...next, { role: 'assistant', text: answer }]
}

function AiAssistantSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="skeleton h-3 w-24 rounded-lg" />
          <div className="skeleton h-7 w-56 max-w-full rounded-xl" />
        </div>
        <div className="skeleton h-8 w-16 rounded-lg" />
      </div>
      <div className="mt-6 min-h-0 flex-1 space-y-4 overflow-hidden">
        <div className="skeleton h-20 w-[78%] rounded-2xl" />
        <div className="ml-auto space-y-2">
          <div className="skeleton ml-auto h-8 w-44 rounded-full" />
          <div className="skeleton ml-auto h-8 w-52 rounded-full" />
        </div>
        <div className="skeleton h-24 w-[86%] rounded-2xl" />
        <div className="skeleton h-16 w-[70%] rounded-2xl" />
      </div>
      <div className="mt-4 shrink-0 space-y-2">
        <div className="skeleton h-14 w-full rounded-2xl" />
        <div className="flex justify-between">
          <div className="skeleton h-3 w-32 rounded-lg" />
          <div className="skeleton h-3 w-10 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ tone, text }) {
  const isUser = tone === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`${isUser ? 'max-w-[88%]' : 'w-full'} rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-theme-accent text-theme-accent-text'
          : 'bg-theme-surface border border-theme-border text-theme-primary shadow-sm'
      }`}
      >
        {isUser ? text : (
          <div className="space-y-3">
            <MarkdownMessage text={text} />
            <ResponseCopyButton text={text} />
          </div>
        )}
      </div>
    </div>
  )
}

function ResponseCopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const copyResponse = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copyResponse}
      className="inline-flex h-8 items-center gap-2 rounded-lg px-2 text-xs font-bold text-theme-secondary transition-all hover:bg-theme-bg hover:text-theme-accent"
      aria-label="Copy AI response"
    >
      <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} />
      <span>{copied ? 'Copied' : 'Copy response'}</span>
    </button>
  )
}

function MarkdownMessage({ text }) {
  const blocks = splitCodeBlocks(text)

  return (
    <div className="space-y-3 whitespace-normal">
      {blocks.map((block, index) => (
        block.type === 'code'
          ? <CodeBlock key={index} code={block.code} language={block.language} />
          : <TextBlock key={index} text={block.text} />
      ))}
    </div>
  )
}

function splitCodeBlocks(text) {
  const blocks = []
  const pattern = /```([a-zA-Z0-9_-]+)?\s*\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) blocks.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    blocks.push({ type: 'code', language: match[1] || '', code: match[2].trimEnd() })
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) blocks.push({ type: 'text', text: text.slice(lastIndex) })
  return blocks.filter((block) => block.type === 'code' || block.text.trim())
}

function TextBlock({ text }) {
  const blocks = parseMarkdownTextBlocks(text)

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => <MarkdownTextNode key={index} block={block} />)}
    </div>
  )
}

function MarkdownTextNode({ block }) {
  if (block.type === 'heading') {
    return (
      <h3 className="pt-1 text-[15px] font-extrabold leading-snug text-theme-primary">
        {renderInline(block.text)}
      </h3>
    )
  }

  if (block.type === 'list') {
    return (
      <ul className="space-y-1.5 pl-4">
        {block.items.map((item, index) => (
          <li key={index} className="list-disc pl-1 leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    )
  }

  if (block.type === 'numbered') {
    return (
      <ol className="space-y-1.5 pl-4">
        {block.items.map((item, index) => (
          <li key={index} className="list-decimal pl-1 leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ol>
    )
  }

  return (
    <p className="whitespace-pre-line leading-relaxed">
      {renderInline(block.text)}
    </p>
  )
}

function parseMarkdownTextBlocks(text) {
  const blocks = []
  const lines = stripHtmlTags(text).split('\n')
  let paragraph = []
  let list = null

  const flushParagraph = () => {
    const value = paragraph.join('\n').trim()
    if (value) blocks.push({ type: 'paragraph', text: value })
    paragraph = []
  }

  const flushList = () => {
    if (list?.items.length) blocks.push(list)
    list = null
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      return
    }

    const heading = line.match(/^#{1,6}\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'heading', text: heading[1].trim() })
      return
    }

    const bullet = line.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      flushParagraph()
      if (!list || list.type !== 'list') {
        flushList()
        list = { type: 'list', items: [] }
      }
      list.items.push(bullet[1].trim())
      return
    }

    const numbered = line.match(/^\d+[.)]\s+(.+)$/)
    if (numbered) {
      flushParagraph()
      if (!list || list.type !== 'numbered') {
        flushList()
        list = { type: 'numbered', items: [] }
      }
      list.items.push(numbered[1].trim())
      return
    }

    flushList()
    paragraph.push(line)
  })

  flushParagraph()
  flushList()
  return blocks
}

function stripHtmlTags(text) {
  return String(text || '').replace(/<\/?[^>]+>/g, '')
}

function renderInline(text) {
  const parts = []
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const value = match[0]
    if (value.startsWith('**')) {
      parts.push(<strong key={parts.length} className="font-extrabold text-theme-primary">{value.slice(2, -2)}</strong>)
    } else if (value.startsWith('*')) {
      parts.push(<em key={parts.length} className="italic">{value.slice(1, -1)}</em>)
    } else {
      parts.push(<code key={parts.length} className="rounded bg-theme-bg/70 px-1 py-0.5 font-mono text-[0.85em] font-semibold text-theme-accent">{value.slice(1, -1)}</code>)
    }
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.map((part, index) => typeof part === 'string' ? <span key={index}>{part}</span> : part)
}

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-theme-border bg-[#070b14]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-[#0b1020] px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1 text-[11px] font-bold text-slate-200 transition-all hover:border-violet-400 hover:text-violet-200"
        >
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto p-3 text-xs leading-relaxed text-slate-200">
        <code>{highlightCode(code)}</code>
      </pre>
    </div>
  )
}

function highlightCode(code) {
  const keywordPattern = /\b(auto|break|case|char|const|continue|default|do|double|else|enum|float|for|function|if|include|int|let|long|return|short|sizeof|static|struct|switch|var|void|while|printf|scanf|main)\b/
  const tokenPattern = /(\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g
  const nodes = []

  code.split('\n').forEach((line, lineIndex) => {
    if (/^\s*#/.test(line)) {
      nodes.push(<span key={`line-${lineIndex}`} className="text-sky-300">{line}</span>)
      nodes.push('\n')
      return
    }

    let lastIndex = 0
    let match
    while ((match = tokenPattern.exec(line)) !== null) {
      if (match.index > lastIndex) nodes.push(line.slice(lastIndex, match.index))
      const token = match[0]
      nodes.push(<span key={`${lineIndex}-${match.index}`} className={codeTokenClass(token, keywordPattern)}>{token}</span>)
      lastIndex = tokenPattern.lastIndex
    }
    if (lastIndex < line.length) nodes.push(line.slice(lastIndex))
    if (lineIndex < code.split('\n').length - 1) nodes.push('\n')
  })

  return nodes
}

function codeTokenClass(token, keywordPattern) {
  if (token.startsWith('//') || token.startsWith('/*')) return 'text-emerald-300'
  if (token.startsWith('"') || token.startsWith("'")) return 'text-amber-300'
  if (/^\d/.test(token)) return 'text-fuchsia-300'
  if (keywordPattern.test(token)) return 'font-semibold text-violet-300'
  return 'text-slate-100'
}
