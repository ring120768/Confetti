import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Budget tracker: estimated vs quoted vs paid per item, with a one-tap
// starting allocation based on typical UK wedding spend.
const UK_SPLIT = [
  ['Venue', 'venue', 0.35], ['Catering & drinks', 'catering', 0.20],
  ['Photography', 'photography', 0.08], ['Attire & rings', 'attire', 0.12],
  ['Flowers & décor', 'flowers', 0.06], ['Music & entertainment', 'music', 0.05],
  ['Videography', 'videography', 0.04], ['Stationery', 'stationery', 0.02],
  ['Cake', 'cake', 0.02], ['Transport', 'transport', 0.02],
  ['Hair & beauty', 'beauty', 0.02], ['Contingency', 'other', 0.02],
]
const gbp = (n) => '£' + Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })

export default function Budget({ wedding, onEditWedding }) {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () =>
    supabase.from('budget_items').select('*').eq('wedding_id', wedding.id)
      .order('created_at').then(({ data }) => setItems(data || []))

  useEffect(() => { load() }, [wedding.id])

  const totals = useMemo(() => {
    const committed = items.reduce((a, b) => a + Number(b.quoted ?? b.estimated ?? 0), 0)
    const paid = items.reduce((a, b) => a + Number(b.paid ?? 0), 0)
    return { committed, paid, budget: Number(wedding.budget_total || 0) }
  }, [items, wedding.budget_total])

  const over = totals.budget > 0 && totals.committed > totals.budget

  async function seed() {
    if (!wedding.budget_total) { onEditWedding(); return }
    setBusy(true)
    await supabase.from('budget_items').insert(
      UK_SPLIT.map(([name, category, share]) => ({
        wedding_id: wedding.id, name, category,
        estimated: Math.round(wedding.budget_total * share),
      }))
    )
    setBusy(false); load()
  }

  async function saveEdit(form) {
    setBusy(true)
    if (editing === 'new') {
      await supabase.from('budget_items').insert({ ...form, wedding_id: wedding.id })
    } else {
      await supabase.from('budget_items').update(form).eq('id', editing.id)
    }
    setBusy(false); setEditing(null); load()
  }

  async function remove(item) {
    if (!confirm(`Remove "${item.name}"?`)) return
    await supabase.from('budget_items').delete().eq('id', item.id)
    load()
  }

  return (
    <div>
      <div className="card">
        <div className="pricing-head">
          <h3>Budget</h3>
          <button type="button" onClick={() => setEditing('new')}>+ Add</button>
        </div>

        <div className="budget-summary">
          <div><span className="meta">Budget</span><strong>{totals.budget ? gbp(totals.budget) : '—'}</strong></div>
          <div><span className="meta">Committed</span><strong className={over ? 'over' : ''}>{gbp(totals.committed)}</strong></div>
          <div><span className="meta">Paid so far</span><strong>{gbp(totals.paid)}</strong></div>
          <div><span className="meta">{over ? 'Over by' : 'Headroom'}</span>
            <strong className={over ? 'over' : ''}>{totals.budget ? gbp(Math.abs(totals.budget - totals.committed)) : '—'}</strong></div>
        </div>
        {totals.budget > 0 && (
          <div className="budget-bar">
            <div style={{ width: Math.min((totals.committed / totals.budget) * 100, 100) + '%' }}
                 className={over ? 'over' : ''} />
          </div>
        )}

        {items.length === 0 && (
          <div className="empty-budget">
            <p className="meta">
              {wedding.budget_total
                ? `Want a head start? I'll split your ${gbp(wedding.budget_total)} across typical UK wedding categories — then adjust to taste.`
                : 'Set your overall budget first, then I can suggest a starting split.'}
            </p>
            <button type="button" className="secondary" disabled={busy} onClick={seed}>
              {wedding.budget_total ? 'Suggest a starting split ✨' : 'Set your budget'}
            </button>
          </div>
        )}

        {items.map(item => (
          <div key={item.id} className="supplier">
            <div className="supplier-head">
              <strong>{item.name}</strong>
              <span className="meta">
                {item.quoted ? <>quoted {gbp(item.quoted)}</> : <>est. {gbp(item.estimated)}</>}
                {Number(item.paid) > 0 && <> · paid {gbp(item.paid)}</>}
              </span>
            </div>
            <div className="meta">{item.category}{item.due_date && <> · balance due {new Date(item.due_date).toLocaleDateString('en-GB')}</>}</div>
            <div className="supplier-actions">
              <a href="#" onClick={(e) => { e.preventDefault(); setEditing(item) }}>Edit</a>
              <a href="#" className="danger" onClick={(e) => { e.preventDefault(); remove(item) }}>Remove</a>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <BudgetSheet item={editing === 'new' ? null : editing} busy={busy}
                     onSave={saveEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

function BudgetSheet({ item, busy, onSave, onClose }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || 'other',
    estimated: item?.estimated || '',
    quoted: item?.quoted || '',
    paid: item?.paid || 0,
    due_date: item?.due_date || '',
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>{item ? item.name : 'Add a budget item'}</h3>
        <form onSubmit={(e) => {
          e.preventDefault()
          onSave({
            ...form,
            estimated: form.estimated || null,
            quoted: form.quoted || null,
            paid: form.paid || 0,
            due_date: form.due_date || null,
          })
        }}>
          <label>Name</label>
          <input value={form.name} onChange={set('name')} required placeholder="Venue hire" />
          <label>Category</label>
          <select value={form.category} onChange={set('category')}>
            {['venue', 'catering', 'photography', 'videography', 'attire', 'flowers', 'music', 'stationery', 'cake', 'transport', 'beauty', 'honeymoon', 'other'].map(c =>
              <option key={c} value={c}>{c}</option>)}
          </select>
          <label>Estimated (£)</label>
          <input type="number" min="0" value={form.estimated} onChange={set('estimated')} />
          <label>Quoted (£) — once you have a real price</label>
          <input type="number" min="0" value={form.quoted} onChange={set('quoted')} />
          <label>Paid so far (£)</label>
          <input type="number" min="0" value={form.paid} onChange={set('paid')} />
          <label>Balance due date (optional)</label>
          <input type="date" value={form.due_date} onChange={set('due_date')} />
          <div className="sheet-actions">
            <button disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
