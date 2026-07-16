import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Edit the wedding's core facts. Date changes recompute every task date;
// switching UK/abroad seeds the extra tasks for the new type (existing
// no-longer-relevant tasks can be skipped from their detail sheet).
export default function EditWedding({ wedding, onClose, onSaved }) {
  const [form, setForm] = useState({
    wedding_date: wedding.wedding_date || '',
    wedding_type: wedding.wedding_type,
    budget_total: wedding.budget_total || '',
    guest_estimate: wedding.guest_estimate || '',
    style: wedding.style || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function save(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const patch = {
        wedding_date: form.wedding_date || null,
        wedding_type: form.wedding_type,
        budget_total: form.budget_total || null,
        guest_estimate: form.guest_estimate || null,
        style: form.style || null,
      }
      const { data: updated, error: e1 } = await supabase.from('weddings')
        .update(patch).eq('id', wedding.id).select().single()
      if (e1) throw e1

      // type change may add tasks; either way, recompute all dates
      if (patch.wedding_type !== wedding.wedding_type) {
        const { error: e2 } = await supabase.rpc('seed_wedding_tasks', { w: wedding.id })
        if (e2) throw e2
      } else {
        const { error: e3 } = await supabase.rpc('recompute_task_dates', { w: wedding.id })
        if (e3) throw e3
      }
      onSaved(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>Your wedding details</h3>
        <form onSubmit={save}>
          <label>Wedding date</label>
          <input type="date" value={form.wedding_date} onChange={set('wedding_date')} />
          {form.wedding_date !== (wedding.wedding_date || '') && (
            <p className="meta">Changing the date re-times your whole plan automatically. ✨</p>
          )}

          <label>Where are you marrying?</label>
          <select value={form.wedding_type} onChange={set('wedding_type')}>
            <option value="uk">In the UK</option>
            <option value="destination">Abroad</option>
          </select>

          <label>Budget (£)</label>
          <input type="number" min="0" value={form.budget_total} onChange={set('budget_total')} />

          <label>Guest estimate</label>
          <input type="number" min="0" value={form.guest_estimate} onChange={set('guest_estimate')} />

          <label>Your style</label>
          <input value={form.style} onChange={set('style')} />

          {error && <p style={{ color: 'var(--rose)' }}>{error}</p>}
          <div className="sheet-actions">
            <button disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
