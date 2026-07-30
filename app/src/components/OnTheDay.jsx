import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// On the Day — the wedding-day running order + supplier contacts sheet.
// Buzz drafts the schedule (Luxe); the couple edits it here. The contacts
// sheet renders from their existing supplier list.
export default function OnTheDay({ wedding, tier, onAskBuzz, onUpgrade }) {
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [copied, setCopied] = useState(false)
  const isLuxe = tier === 'luxe'

  const load = () => {
    supabase.from('schedule_items').select('*').eq('wedding_id', wedding.id)
      .then(({ data }) => setItems(sortItems(data || [])))
    supabase.from('suppliers').select('id,category,name,stage,phone,contact_email')
      .eq('wedding_id', wedding.id)
      .then(({ data }) => setSuppliers((data || []).filter(s => s.phone || s.contact_email)))
  }
  useEffect(() => { if (isLuxe) load() }, [wedding.id, isLuxe])

  function sortItems(list) {
    return [...list].sort((a, b) => {
      if (a.time && b.time) return a.time < b.time ? -1 : 1
      if (a.time) return -1
      if (b.time) return 1
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
  }

  async function addRow() {
    const { data } = await supabase.from('schedule_items')
      .insert({ wedding_id: wedding.id, title: 'New moment', time: null, sort_order: items.length })
      .select().single()
    if (data) setItems(sortItems([...items, data]))
  }

  async function patch(id, fields) {
    setItems(list => sortItems(list.map(i => i.id === id ? { ...i, ...fields } : i)))
    await supabase.from('schedule_items').update(fields).eq('id', id)
  }

  async function remove(id) {
    setItems(list => list.filter(i => i.id !== id))
    await supabase.from('schedule_items').delete().eq('id', id)
  }

  const shareText = useMemo(() => {
    const lines = items.map(i => `${i.time ? i.time + '  ' : ''}${i.title}${i.who ? ` — ${i.who}` : ''}`)
    const contacts = suppliers.map(s => `${s.name} (${s.category})${s.phone ? ' · ' + s.phone : ''}`)
    return `Running order — our wedding day\n\n${lines.join('\n')}` +
      (contacts.length ? `\n\nSupplier contacts:\n${contacts.join('\n')}` : '')
  }, [items, suppliers])

  async function copyShare() {
    await navigator.clipboard.writeText(shareText)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // Locked teaser for Free / Sparkle
  if (!isLuxe) {
    return (
      <div className="card">
        <h3>On the day 🕰</h3>
        <p className="meta">Your wedding-day running order — a minute-by-minute schedule from hair &amp; makeup to the last dance, with every supplier's arrival time and phone number on one page. Buzz builds it for you; share it with your suppliers and the wedding party so nobody rings the bride.</p>
        <p><strong>The on-the-day coordinator is part of Luxe 👑</strong></p>
        <button type="button" onClick={onUpgrade}>See Luxe ✨</button>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div className="pricing-head">
          <h3>Running order 🕰</h3>
          <button type="button" className="secondary" onClick={load}>↻ Refresh</button>
        </div>

        {items.length === 0 ? (
          <p className="meta">No schedule yet. Ask Buzz to draft your running order — she'll build a full day from your ceremony time — or add moments yourself.</p>
        ) : (
          items.map(i => (
            <div key={i.id} className="schedule-item">
              <input type="time" value={i.time || ''} onChange={e => patch(i.id, { time: e.target.value || null })} />
              <div className="schedule-body">
                <input className="schedule-title" value={i.title} onChange={e => patch(i.id, { title: e.target.value })} />
                <input className="schedule-who" placeholder="who's on it (optional)" value={i.who || ''} onChange={e => patch(i.id, { who: e.target.value || null })} />
              </div>
              <button type="button" className="linklike danger" onClick={() => remove(i.id)}>✕</button>
            </div>
          ))
        )}

        <div className="sheet-actions">
          <button type="button" onClick={() => onAskBuzz({ text: 'Build me a running order for our wedding day — a timed schedule from getting ready to the last dance. Ask me our ceremony time if you need it.' })}>
            🐝 Ask Buzz to draft it
          </button>
          <button type="button" className="secondary" onClick={addRow}>+ Add a moment</button>
          {items.length > 0 && (
            <button type="button" className="secondary" onClick={copyShare}>
              {copied ? 'Copied ✓' : 'Copy to share'}
            </button>
          )}
        </div>
      </div>

      {suppliers.length > 0 && (
        <div className="card">
          <h3>Supplier contacts 📇</h3>
          <p className="meta">One page for the day — hand it to your point person so vendors call them, not you.</p>
          {suppliers.map(s => (
            <div key={s.id} className="supplier">
              <div className="supplier-head">
                <strong>{s.name}</strong>
                <span className="badge">{s.category}</span>
              </div>
              <div className="meta">
                {s.phone && <a href={`tel:${s.phone}`}>{s.phone}</a>}
                {s.phone && s.contact_email && ' · '}
                {s.contact_email && <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
