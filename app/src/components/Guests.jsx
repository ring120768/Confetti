import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Guest list: households, day/evening, RSVP tracking, dietary needs.
// Free tier caps at 50 guests (Sparkle+ unlimited).
const FREE_CAP = 50
const RSVP_NEXT = { pending: 'yes', yes: 'no', no: 'pending' }
const RSVP_LABEL = { pending: 'No reply yet', yes: 'Coming 🎉', no: 'Can\'t make it' }

export default function Guests({ wedding, tier, onUpgrade }) {
  const [guests, setGuests] = useState([])
  const [editing, setEditing] = useState(null) // guest | 'new'
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('all') // all | yes | pending | day | evening

  const load = () =>
    supabase.from('guests').select('*').eq('wedding_id', wedding.id)
      .order('household', { ascending: true, nullsFirst: false }).order('full_name')
      .then(({ data }) => setGuests(data || []))

  useEffect(() => { load() }, [wedding.id])

  const stats = useMemo(() => ({
    total: guests.length,
    yes: guests.filter(g => g.rsvp_status === 'yes').length,
    pending: guests.filter(g => g.rsvp_status === 'pending').length,
    day: guests.filter(g => g.invite_type === 'day').length,
    evening: guests.filter(g => g.invite_type === 'evening').length,
    dietary: guests.filter(g => g.dietary).length,
  }), [guests])

  const shown = useMemo(() => guests.filter(g => {
    if (filter === 'yes') return g.rsvp_status === 'yes'
    if (filter === 'pending') return g.rsvp_status === 'pending'
    if (filter === 'day') return g.invite_type === 'day'
    if (filter === 'evening') return g.invite_type === 'evening'
    return true
  }), [guests, filter])

  const atCap = tier === 'free' && guests.length >= FREE_CAP

  async function cycleRsvp(g) {
    const rsvp_status = RSVP_NEXT[g.rsvp_status] || 'yes'
    setGuests(list => list.map(x => x.id === g.id ? { ...x, rsvp_status } : x))
    await supabase.from('guests').update({ rsvp_status }).eq('id', g.id)
  }

  async function saveEdit(form) {
    setBusy(true)
    if (editing === 'new') {
      await supabase.from('guests').insert({ ...form, wedding_id: wedding.id })
    } else {
      await supabase.from('guests').update(form).eq('id', editing.id)
    }
    setBusy(false); setEditing(null); load()
  }

  async function remove(g) {
    if (!confirm(`Remove ${g.full_name} from the list?`)) return
    await supabase.from('guests').delete().eq('id', g.id)
    load()
  }

  return (
    <div>
      <div className="card">
        <div className="pricing-head">
          <h3>Guest list</h3>
          {atCap
            ? <button type="button" className="secondary" onClick={onUpgrade}>50 guest limit · Upgrade ✨</button>
            : <button type="button" onClick={() => setEditing('new')}>+ Add</button>}
        </div>

        {guests.length > 0 && (
          <p className="meta">
            {stats.total} invited · {stats.yes} coming · {stats.pending} awaiting reply
            {stats.dietary > 0 && <> · {stats.dietary} dietary needs</>}
          </p>
        )}

        {guests.length === 0 ? (
          <p className="meta">Start with your must-haves — parents, wedding party, best friends. You can mark day or evening as you go. 💌</p>
        ) : (
          <div className="filter-chips">
            {['all', 'yes', 'pending', 'day', 'evening'].map(f => (
              <button key={f} type="button"
                      className={'stage-chip' + (filter === f ? ' booked' : '')}
                      onClick={() => setFilter(f)}>
                {f === 'all' ? `All ${stats.total}` : f === 'yes' ? `Coming ${stats.yes}` :
                 f === 'pending' ? `Awaiting ${stats.pending}` : f === 'day' ? `Day ${stats.day}` : `Evening ${stats.evening}`}
              </button>
            ))}
          </div>
        )}

        {shown.map(g => (
          <div key={g.id} className="supplier">
            <div className="supplier-head">
              <strong>{g.full_name}{g.is_child && ' 🧒'}</strong>
              <button type="button" className={'stage-chip rsvp-' + g.rsvp_status} onClick={() => cycleRsvp(g)}
                      title="Tap to change RSVP">
                {RSVP_LABEL[g.rsvp_status]}
              </button>
            </div>
            <div className="meta">
              {g.invite_type === 'day' ? 'Day guest' : 'Evening guest'}
              {g.household && <> · {g.household}</>}
              {g.dietary && <> · 🍽 {g.dietary}</>}
            </div>
            <div className="supplier-actions">
              <a href="#" onClick={(e) => { e.preventDefault(); setEditing(g) }}>Edit</a>
              <a href="#" className="danger" onClick={(e) => { e.preventDefault(); remove(g) }}>Remove</a>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <GuestSheet guest={editing === 'new' ? null : editing} busy={busy}
                    onSave={saveEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

function GuestSheet({ guest, busy, onSave, onClose }) {
  const [form, setForm] = useState({
    full_name: guest?.full_name || '',
    household: guest?.household || '',
    invite_type: guest?.invite_type || 'day',
    rsvp_status: guest?.rsvp_status || 'pending',
    dietary: guest?.dietary || '',
    email: guest?.email || '',
    is_child: guest?.is_child || false,
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>{guest ? guest.full_name : 'Add a guest'}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }}>
          <label>Name</label>
          <input value={form.full_name} onChange={set('full_name')} required />
          <label>Household / group (optional)</label>
          <input value={form.household} onChange={set('household')} placeholder="The Smiths" />
          <label>Invited to</label>
          <select value={form.invite_type} onChange={set('invite_type')}>
            <option value="day">Full day</option>
            <option value="evening">Evening only</option>
          </select>
          <label>RSVP</label>
          <select value={form.rsvp_status} onChange={set('rsvp_status')}>
            <option value="pending">No reply yet</option>
            <option value="yes">Coming</option>
            <option value="no">Can't make it</option>
          </select>
          <label>Dietary needs (optional)</label>
          <input value={form.dietary} onChange={set('dietary')} placeholder="vegetarian, nut allergy…" />
          <label>Email (optional)</label>
          <input type="email" value={form.email} onChange={set('email')} />
          <label className="check-row">
            <input type="checkbox" checked={form.is_child}
                   onChange={(e) => setForm({ ...form, is_child: e.target.checked })} /> Child
          </label>
          <div className="sheet-actions">
            <button disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
