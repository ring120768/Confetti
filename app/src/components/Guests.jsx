import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Tiny CSV parser that copes with quoted fields ("Smith, John").
function parseCsv(text) {
  const rows = []
  let row = [], cell = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') inQuotes = false
      else cell += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (cell !== '' || row.length) { row.push(cell); rows.push(row); row = []; cell = '' }
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

// Guess which columns are which from the header row.
function mapColumns(header) {
  const find = (...keys) => header.findIndex(h => keys.some(k => h.toLowerCase().includes(k)))
  return {
    name: find('name', 'guest'),
    email: find('email', 'e-mail'),
    household: find('household', 'group', 'family', 'party'),
    type: find('invite', 'type', 'day/evening'),
    dietary: find('diet', 'allerg', 'food'),
    child: find('child', 'kid', 'age'),
  }
}

function rowsToGuests(rows) {
  if (!rows.length) return []
  const header = rows[0].map(h => h.trim())
  const cols = mapColumns(header)
  // no recognisable name column? treat every row as data, first column = name
  const hasHeader = cols.name >= 0
  const dataRows = hasHeader ? rows.slice(1) : rows
  const nameIdx = hasHeader ? cols.name : 0
  return dataRows.map(r => {
    const val = (i) => (i >= 0 && r[i] ? r[i].trim() : '')
    const typeRaw = val(cols.type).toLowerCase()
    const childRaw = val(cols.child).toLowerCase()
    return {
      full_name: val(nameIdx),
      email: val(cols.email) || null,
      household: val(cols.household) || null,
      invite_type: typeRaw.includes('eve') ? 'evening' : 'day',
      dietary: val(cols.dietary) || null,
      is_child: ['y', 'yes', 'true', 'child', 'kid'].some(k => childRaw.startsWith(k)),
      rsvp_status: 'pending',
    }
  }).filter(g => g.full_name)
}

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
  const [importPreview, setImportPreview] = useState(null) // guests parsed from CSV
  const fileRef = useRef(null)
  const canPickContacts = typeof navigator !== 'undefined' && 'contacts' in navigator && 'select' in (navigator.contacts || {})

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

  function onCsvChosen(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = rowsToGuests(parseCsv(String(reader.result)))
      if (!parsed.length) { alert('Couldn\'t find any names in that file — is it a CSV with a name column?'); return }
      setImportPreview(parsed)
    }
    reader.readAsText(file)
    e.target.value = '' // allow re-choosing the same file
  }

  async function confirmImport() {
    let toAdd = importPreview
    if (tier === 'free' && guests.length + toAdd.length > FREE_CAP) {
      const room = Math.max(FREE_CAP - guests.length, 0)
      if (room === 0) { setImportPreview(null); onUpgrade(); return }
      if (!confirm(`Free plan holds ${FREE_CAP} guests — import the first ${room} of ${toAdd.length}?`)) return
      toAdd = toAdd.slice(0, room)
    }
    setBusy(true)
    await supabase.from('guests').insert(toAdd.map(g => ({ ...g, wedding_id: wedding.id })))
    setBusy(false); setImportPreview(null); load()
  }

  async function pickFromContacts() {
    try {
      const picked = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true })
      if (!picked?.length) return
      const toAdd = picked.map(c => ({
        wedding_id: wedding.id,
        full_name: (c.name?.[0] || '').trim(),
        email: c.email?.[0] || null,
        invite_type: 'day',
        rsvp_status: 'pending',
      })).filter(g => g.full_name)
      if (tier === 'free' && guests.length + toAdd.length > FREE_CAP) { onUpgrade(); return }
      await supabase.from('guests').insert(toAdd)
      load()
    } catch { /* user cancelled the picker */ }
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

        {!atCap && (
          <div className="filter-chips">
            <button type="button" className="stage-chip" onClick={() => fileRef.current?.click()}>⬆️ Import CSV</button>
            {canPickContacts && (
              <button type="button" className="stage-chip" onClick={pickFromContacts}>📇 From contacts</button>
            )}
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onCsvChosen} />
          </div>
        )}

        {guests.length === 0 ? (
          <p className="meta">Start with your must-haves — parents, wedding party, best friends. Or import the spreadsheet you've already started — columns for name, email, household, day/evening, dietary all understood. 💌</p>
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

      {importPreview && (
        <div className="sheet-overlay" onClick={() => setImportPreview(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3>Import {importPreview.length} guests?</h3>
            <p className="meta">
              {importPreview.filter(g => g.invite_type === 'evening').length} evening ·{' '}
              {importPreview.filter(g => g.dietary).length} with dietary notes ·{' '}
              {importPreview.filter(g => g.is_child).length} children
            </p>
            {importPreview.slice(0, 8).map((g, i) => (
              <div key={i} className="meta">• {g.full_name}{g.household ? ` (${g.household})` : ''}{g.dietary ? ` · ${g.dietary}` : ''}</div>
            ))}
            {importPreview.length > 8 && <div className="meta">…and {importPreview.length - 8} more</div>}
            <div className="sheet-actions">
              <button disabled={busy} onClick={confirmImport}>{busy ? 'Importing…' : `Import ${importPreview.length} guests ✨`}</button>
              <button type="button" className="secondary" onClick={() => setImportPreview(null)}>Cancel</button>
            </div>
          </div>
        </div>
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
