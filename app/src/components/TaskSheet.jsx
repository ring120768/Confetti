import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { dueDate, formatDue } from '../lib/engine.js'

// Bottom sheet with a task's full story: guidance, cost, supplier questions,
// date pinning, skip, and notes. The library content finally gets seen.
const DELEGATE_STATUS = {
  sent: 'invite sent 💌', viewed: 'opened 👀', done: 'done ✅', declined: 'passed on',
}

export default function TaskSheet({ task, lib, onClose, onPatched, onAskBuzz, delegation, onDelegated, onUpgrade }) {
  const [notes, setNotes] = useState(task.notes || '')
  const [saving, setSaving] = useState(false)

  // Delegation
  const [showDelegate, setShowDelegate] = useState(false)
  const [dName, setDName] = useState('')
  const [dEmail, setDEmail] = useState('')
  const [dMsg, setDMsg] = useState('')
  const [dSending, setDSending] = useState(false)
  const [dErr, setDErr] = useState('')
  const [dQuota, setDQuota] = useState('')
  const [sent, setSent] = useState(false)
  const [guestOptions, setGuestOptions] = useState([])
  const canPickContacts = typeof navigator !== 'undefined' && 'contacts' in navigator && 'select' in (navigator.contacts || {})

  useEffect(() => {
    supabase.from('guests').select('id,full_name,email').eq('wedding_id', task.wedding_id).order('full_name')
      .then(({ data }) => setGuestOptions(data || []))
  }, [task.wedding_id])

  function selectGuest(id) {
    const g = guestOptions.find(x => String(x.id) === String(id))
    if (!g) return
    setDName(g.full_name || '')
    setDEmail(g.email || '')
  }

  async function pickContact() {
    try {
      const [c] = await navigator.contacts.select(['name', 'email'], { multiple: false })
      if (!c) return
      if (c.name?.[0]) setDName(c.name[0].trim())
      if (c.email?.[0]) setDEmail(c.email[0])
    } catch { /* user cancelled */ }
  }

  async function patch(fields) {
    setSaving(true)
    const { error } = await supabase.from('tasks').update(fields).eq('id', task.id)
    setSaving(false)
    if (!error) onPatched({ ...task, ...fields })
  }

  async function submitDelegate() {
    setDSending(true); setDErr(''); setDQuota('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delegate-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ task_id: task.id, delegate_name: dName, delegate_email: dEmail, message: dMsg }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 429) { setDQuota(body.detail || 'You\'ve used your free delegations.') }
      else if (!res.ok) { setDErr(body.error || 'Could not send — try again.') }
      else { setSent(true); onDelegated?.(task.id, body.delegation) }
    } catch {
      setDErr('Could not send — try again.')
    }
    setDSending(false)
  }

  const skipped = task.status === 'skipped'

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>{task.title}</h3>
        <p className="meta">
          {lib?.priority || 'custom task'} · {task.category}
          {lib?.typical_cost_gbp && <> · typically {lib.typical_cost_gbp}</>}
        </p>

        {lib?.guidance && <p>{lib.guidance}</p>}

        {lib?.ask_suppliers?.length > 0 && (
          <>
            <h4>Questions a pro would ask 📋</h4>
            <ul>{lib.ask_suppliers.map(q => <li key={q}>{q}</li>)}</ul>
          </>
        )}

        <h4>When</h4>
        <p className="meta">
          {task.pinned_date
            ? <>Pinned to <strong>{formatDue(task.pinned_date)}</strong> (suggested: {formatDue(task.computed_date)})</>
            : <>Suggested: <strong>{formatDue(dueDate(task))}</strong></>}
        </p>
        <div className="sheet-row">
          <input type="date" value={task.pinned_date || ''}
                 onChange={e => patch({ pinned_date: e.target.value || null })} />
          {task.pinned_date && (
            <button type="button" className="secondary" onClick={() => patch({ pinned_date: null })}>
              Unpin
            </button>
          )}
        </div>

        <h4>Notes</h4>
        <textarea rows="3" value={notes} placeholder="Quotes, thoughts, reminders…"
                  onChange={e => setNotes(e.target.value)} />
        {notes !== (task.notes || '') && (
          <button type="button" className="secondary" disabled={saving}
                  onClick={() => patch({ notes })}>
            {saving ? 'Saving…' : 'Save note'}
          </button>
        )}

        <h4>Hand this to someone 🤝</h4>
        {delegation ? (
          <p className="meta">
            Delegated to <strong>{delegation.delegate_name}</strong> · {DELEGATE_STATUS[delegation.status] || delegation.status}
          </p>
        ) : sent ? (
          <p className="meta">Sent to <strong>{dName}</strong> ✨ — they'll get an email with a link to mark it done. You'll hear back when they do.</p>
        ) : dQuota ? (
          <div>
            <p className="meta">{dQuota}</p>
            <button type="button" onClick={onUpgrade}>See Sparkle ✨</button>
          </div>
        ) : !showDelegate ? (
          <button type="button" className="secondary" onClick={() => setShowDelegate(true)}>
            Delegate this task
          </button>
        ) : (
          <div className="delegate-form">
            {(guestOptions.length > 0 || canPickContacts) && (
              <div className="delegate-pick">
                {guestOptions.length > 0 && (
                  <select value="" onChange={e => selectGuest(e.target.value)}>
                    <option value="" disabled>From guest list…</option>
                    {guestOptions.map(g => (
                      <option key={g.id} value={g.id}>{g.full_name}{g.email ? '' : ' — no email'}</option>
                    ))}
                  </select>
                )}
                {canPickContacts && (
                  <button type="button" className="secondary" onClick={pickContact}>📇 Contacts</button>
                )}
              </div>
            )}
            <input placeholder="Their name" value={dName} onChange={e => setDName(e.target.value)} />
            <input type="email" placeholder="Their email" value={dEmail} onChange={e => setDEmail(e.target.value)} />
            <textarea rows="2" placeholder="A personal note (optional)" value={dMsg} onChange={e => setDMsg(e.target.value)} />
            {dErr && <p className="meta" role="alert">{dErr}</p>}
            <div className="draft-actions">
              <button type="button" disabled={dSending || !dName.trim() || !dEmail.trim()} onClick={submitDelegate}>
                {dSending ? 'Sending…' : 'Send it 💌'}
              </button>
              <button type="button" className="secondary" onClick={() => setShowDelegate(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="sheet-actions">
          <button type="button" onClick={() => {
            onAskBuzz({
              text: `About "${task.title}" — where do we start, and what should we watch out for?`,
              taskId: task.id,
            })
            onClose()
          }}>
            🐝 Ask Buzz
          </button>
          <button type="button" className="secondary"
                  onClick={() => patch({ status: skipped ? 'todo' : 'skipped' })}>
            {skipped ? 'Un-skip — we\'re doing this' : 'Not doing this — skip it'}
          </button>
          <button type="button" className="secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
