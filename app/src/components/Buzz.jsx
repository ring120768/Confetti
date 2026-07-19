import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Turn bare URLs in Buzz's text into safe, tappable links.
function Linkified({ text }) {
  const parts = text.split(/(https?:\/\/[^\s)\]}"']+)/g)
  return parts.map((p, i) =>
    i % 2 === 1
      ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)}</a>
      : <span key={i}>{p}</span>
  )
}

// Renders a chat message WhatsApp-style: Buzz's avatar sits beside her
// bubbles; ```email blocks become a draft card with Copy / mailto actions.
function Message({ role, content, time }) {
  const parts = content.split(/```email\n?([\s\S]*?)```/g)
  const bubble = (
    <div className={'bubble ' + role}>
      {parts.map((part, i) =>
        i % 2 === 0
          ? (part.trim() ? <Linkified key={i} text={part} /> : null)
          : <EmailDraft key={i} draft={part.trim()} />
      )}
      {time && <span className="stamp">{time}</span>}
    </div>
  )
  if (role !== 'assistant') return <div className="msg-row user">{bubble}</div>
  return (
    <div className="msg-row assistant">
      <img src="/buzz.png" alt="" className="avatar" />
      {bubble}
    </div>
  )
}

function Typing() {
  return (
    <div className="msg-row assistant">
      <img src="/buzz.png" alt="" className="avatar" />
      <div className="bubble assistant typing">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  )
}

const stamp = (iso) => iso
  ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  : new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

function EmailDraft({ draft }) {
  const [copied, setCopied] = useState(false)
  const to = draft.match(/^To:\s*(.*)$/m)?.[1]?.trim() || ''
  const subject = draft.match(/^Subject:\s*(.*)$/m)?.[1]?.trim() || 'Wedding enquiry'
  const body = draft.replace(/^To:.*$/m, '').replace(/^Subject:.*$/m, '').trim()

  const copy = async () => {
    await navigator.clipboard.writeText(draft)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <div className="email-draft">
      <div className="meta">✉️ {to ? `To: ${to}` : 'Add the supplier\'s email address'} · {subject}</div>
      <pre>{body}</pre>
      <div className="draft-actions">
        <button type="button" className="secondary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
        <a href={mailto}><button type="button">Open in your email app</button></a>
      </div>
    </div>
  )
}

// Buzz chat: floating button -> slide-up panel.
const TIER_QUOTA = { free: 10, sparkle: 200, luxe: Infinity }
const STARTERS = [
  "What should we be doing this month?",
  "Find wedding venues near us",
  "How much should we budget for flowers?",
]

export default function Buzz({ wedding, tier = 'free', ask, onAskConsumed, onUpgrade }) {
  const [quotaHit, setQuotaHit] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [quota, setQuota] = useState(null) // { used, quota }
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const [focusTaskId, setFocusTaskId] = useState(null)

  // "Ask Buzz" from a task: open the panel with the question ready to send,
  // carrying the task id so the server can load that task's full context.
  useEffect(() => {
    if (!ask) return
    setOpen(true)
    setInput(ask.text)
    setFocusTaskId(ask.taskId || null)
    onAskConsumed?.()
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [ask])

  useEffect(() => {
    if (!open) return
    supabase.from('ai_messages').select('role,content,created_at')
      .eq('wedding_id', wedding.id).order('created_at').limit(50)
      .then(({ data }) => setMessages(data || []))
    // used-this-month count so the free-tier limit is never a surprise
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
    supabase.from('ai_messages')
      .select('*', { count: 'exact', head: true })
      .eq('wedding_id', wedding.id).eq('role', 'user')
      .gte('created_at', monthStart.toISOString())
      .then(({ count }) => setQuota({ used: count ?? 0, quota: TIER_QUOTA[tier] ?? 10 }))
  }, [open, wedding.id, tier])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

  async function send(e, direct) {
    e?.preventDefault()
    const text = (direct ?? input).trim()
    if (!text || busy) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text }])
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('buzz', {
        body: { message: text, task_id: focusTaskId },
      })
      setFocusTaskId(null) // task focus applies to the message it came with
      if (error) {
        // supabase-js wraps non-2xx; try to read our error body
        let detail = 'Buzz is having a moment — give her a minute and try again. 🐝'
        try {
          const raw = await error.context?.text()
          console.error('Buzz request failed:', error.message, raw) // detail for devs, not couples
          try {
            const body = JSON.parse(raw)
            if (body?.error === 'quota') { detail = body.detail; setQuotaHit(true) }
            else if (body?.error) detail = body.error
          } catch { /* keep friendly default */ }
        } catch { console.error('Buzz request failed:', error?.message) }
        setMessages(m => [...m, { role: 'assistant', content: detail }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: data.reply }])
        setQuota({ used: data.used, quota: data.quota })
      }
    } finally {
      setBusy(false)
    }
  }

  if (!open) return (
    <button className="buzz-fab" onClick={() => setOpen(true)} aria-label="Chat with Buzz">
      <img src="/buzz.png" alt="" /> Ask Buzz
    </button>
  )

  return (
    <div className="buzz-panel card">
      <div className="buzz-head">
        <img src="/buzz.png" alt="" className="buzz-inline" />
        <strong>Buzz</strong>
        {quota && quota.quota !== Infinity && (
          <span className={'badge' + (quota.quota - quota.used <= 3 ? ' essential' : '')}>
            {Math.max(quota.quota - quota.used, 0)} of {quota.quota} left this month
          </span>
        )}
        <button className="secondary" onClick={() => setOpen(false)}>Close</button>
      </div>
      <div className="buzz-thread">
        {messages.length === 0 && (
          <div className="buzz-empty">
            <img src="/buzz-heart-web.png" alt="" className="buzz-empty-hero" />
            <p className="meta">Hi! I'm Buzz, your wedding planner. Try one of these to get going 🐝</p>
            <div className="starter-chips">
              {STARTERS.map(s => (
                <button key={s} type="button" className="secondary" onClick={(e) => send(e, s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} time={stamp(m.created_at)} />)}
        {busy && <Typing />}
        {quotaHit && onUpgrade && !window.Capacitor?.isNativePlatform?.() && (
          <div className="quota-upsell">
            <p className="meta">Buzz would love to keep helping — Sparkle gets you 200 messages a month, Luxe unlimited.</p>
            <button type="button" onClick={() => { setOpen(false); onUpgrade() }}>See plans — 7 days free ✨</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="buzz-input">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
               placeholder="Ask Buzz anything…" disabled={busy} />
        <button disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  )
}
