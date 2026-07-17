import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// The supplier pipeline — where Buzz's saved venues finally become visible.
const STAGES = ['researching', 'enquired', 'quoted', 'booked']
const STAGE_LABEL = { researching: 'Researching 🔍', enquired: 'Enquired ✉️', quoted: 'Quoted 💷', booked: 'Booked ✅', rejected: 'Passed on' }
const CATEGORIES = ['venue', 'catering', 'photography', 'videography', 'flowers', 'music', 'transport', 'beauty', 'stationery', 'cake', 'other']

export default function Suppliers({ wedding, onAskBuzz }) {
  const [suppliers, setSuppliers] = useState([])
  const [editing, setEditing] = useState(null) // supplier object or 'new'
  const [busy, setBusy] = useState(false)

  const load = () =>
    supabase.from('suppliers').select('*').eq('wedding_id', wedding.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setSuppliers(data || []))

  useEffect(() => { load() }, [wedding.id])

  async function advanceStage(s) {
    const next = STAGES[(STAGES.indexOf(s.stage) + 1) % STAGES.length]
    setSuppliers(list => list.map(x => x.id === s.id ? { ...x, stage: next } : x))
    await supabase.from('suppliers').update({ stage: next }).eq('id', s.id)
  }

  async function saveEdit(form) {
    setBusy(true)
    if (editing === 'new') {
      await supabase.from('suppliers').insert({ ...form, wedding_id: wedding.id })
    } else {
      await supabase.from('suppliers').update(form).eq('id', editing.id)
    }
    setBusy(false); setEditing(null); load()
  }

  async function remove(s) {
    if (!confirm(`Remove ${s.name} from your list?`)) return
    await supabase.from('suppliers').delete().eq('id', s.id)
    load()
  }

  const booked = suppliers.filter(s => s.stage === 'booked').length

  return (
    <div>
      <div className="card">
        <div className="pricing-head">
          <h3>Your suppliers</h3>
          <button type="button" onClick={() => setEditing('new')}>+ Add</button>
        </div>
        {suppliers.length === 0 && (
          <p className="meta">
            Nothing here yet. Ask Buzz to research venues or photographers —
            anything she finds that you like gets saved here automatically. 🐝
          </p>
        )}
        {suppliers.length > 0 && (
          <p className="meta">{booked} booked · {suppliers.length} in your pipeline</p>
        )}
        {suppliers.map(s => (
          <div key={s.id} className="supplier">
            <div className="supplier-head">
              <strong>{s.name}</strong>
              <button type="button" className={'stage-chip ' + s.stage} onClick={() => advanceStage(s)}
                      title="Tap to move to the next stage">
                {STAGE_LABEL[s.stage] || s.stage}
              </button>
            </div>
            <div className="meta">
              {s.category}
              {s.quote_amount && <> · quoted £{Number(s.quote_amount).toLocaleString()}</>}
            </div>
            {s.notes && <div className="meta">{s.notes}</div>}
            <div className="supplier-actions">
              {s.contact_email && <a href={`mailto:${s.contact_email}`}>✉️ Email</a>}
              {s.phone && <a href={`tel:${s.phone}`}>📞 Call</a>}
              <a href="#" onClick={(e) => { e.preventDefault(); setEditing(s) }}>Edit</a>
              <a href="#" onClick={(e) => {
                e.preventDefault()
                onAskBuzz({ text: `About ${s.name} (${s.category}, currently ${s.stage}) — what should our next step be?` })
              }}>🐝 Ask Buzz</a>
              <a href="#" className="danger" onClick={(e) => { e.preventDefault(); remove(s) }}>Remove</a>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <SupplierSheet
          supplier={editing === 'new' ? null : editing}
          busy={busy}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function SupplierSheet({ supplier, busy, onSave, onClose }) {
  const [form, setForm] = useState({
    name: supplier?.name || '',
    category: supplier?.category || 'venue',
    stage: supplier?.stage || 'researching',
    contact_email: supplier?.contact_email || '',
    phone: supplier?.phone || '',
    quote_amount: supplier?.quote_amount || '',
    notes: supplier?.notes || '',
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>{supplier ? supplier.name : 'Add a supplier'}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, quote_amount: form.quote_amount || null }) }}>
          <label>Name</label>
          <input value={form.name} onChange={set('name')} required />
          <label>Category</label>
          <select value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label>Stage</label>
          <select value={form.stage} onChange={set('stage')}>
            {[...STAGES, 'rejected'].map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
          <label>Email</label>
          <input type="email" value={form.contact_email} onChange={set('contact_email')} />
          <label>Phone</label>
          <input value={form.phone} onChange={set('phone')} />
          <label>Quote (£)</label>
          <input type="number" min="0" step="0.01" value={form.quote_amount} onChange={set('quote_amount')} />
          <label>Notes</label>
          <textarea rows="2" value={form.notes} onChange={set('notes')} />
          <div className="sheet-actions">
            <button disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
