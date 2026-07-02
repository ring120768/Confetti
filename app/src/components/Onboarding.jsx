import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Onboarding: the "here's your plan" reveal moment.
// Creates couple -> membership -> wedding, then asks Postgres to
// instantiate + date the task list (seed_wedding_tasks).
export default function Onboarding({ onCreated }) {
  const [form, setForm] = useState({
    wedding_date: '', wedding_type: 'uk', budget_total: '', guest_estimate: '', style: ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function create(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      // One atomic call: couple + membership + wedding + seeded tasks
      const { data: wedding, error } = await supabase.rpc('create_wedding', {
        p_wedding_date: form.wedding_date || null,
        p_wedding_type: form.wedding_type,
        p_budget_total: form.budget_total || null,
        p_guest_estimate: form.guest_estimate || null,
        p_style: form.style || null,
      })
      if (error) throw error
      onCreated(wedding)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="buzz-greeting">
        <img src="/buzz.png" alt="Buzz, your wedding planner" className="buzz" />
        <h1>Hi, I'm Buzz! Let's plan your wedding 🎉</h1>
      </div>
      <form onSubmit={create} className="card">
        <label>Wedding date (leave blank if not set yet)</label>
        <input type="date" value={form.wedding_date} onChange={set('wedding_date')} />

        <label>Where are you marrying?</label>
        <select value={form.wedding_type} onChange={set('wedding_type')}>
          <option value="uk">In the UK</option>
          <option value="destination">Abroad</option>
        </select>

        <label>Rough budget (£)</label>
        <input type="number" min="0" value={form.budget_total} onChange={set('budget_total')} placeholder="20000" />

        <label>Rough guest count</label>
        <input type="number" min="0" value={form.guest_estimate} onChange={set('guest_estimate')} placeholder="80" />

        <label>Your style, in a few words</label>
        <input value={form.style} onChange={set('style')} placeholder="rustic barn, relaxed, lots of flowers" />

        {error && <p style={{ color: 'var(--rose)' }}>{error}</p>}
        <button disabled={busy}>{busy ? 'Building your plan…' : 'Create my plan ✨'}</button>
      </form>
    </div>
  )
}
