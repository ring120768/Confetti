import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Add a custom task — "order kilts", "book the dog-sitter".
export default function AddTask({ wedding, onClose, onAdded }) {
  const [form, setForm] = useState({ title: '', category: 'admin', pinned_date: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    const { data } = await supabase.from('tasks').insert({
      wedding_id: wedding.id,
      title: form.title,
      category: form.category,
      pinned_date: form.pinned_date || null,
      notes: form.notes || null,
    }).select().single()
    setBusy(false)
    if (data) onAdded(data)
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>Add your own task</h3>
        <form onSubmit={save}>
          <label>What needs doing?</label>
          <input value={form.title} onChange={set('title')} required placeholder="Book the dog-sitter" />
          <label>Category</label>
          <select value={form.category} onChange={set('category')}>
            {['admin', 'venue', 'catering', 'photography', 'flowers', 'music', 'attire', 'guests', 'transport', 'beauty', 'honeymoon', 'day-of'].map(c =>
              <option key={c} value={c}>{c}</option>)}
          </select>
          <label>When by? (optional)</label>
          <input type="date" value={form.pinned_date} onChange={set('pinned_date')} />
          <label>Notes (optional)</label>
          <textarea rows="2" value={form.notes} onChange={set('notes')} />
          <div className="sheet-actions">
            <button disabled={busy}>{busy ? 'Adding…' : 'Add task'}</button>
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
