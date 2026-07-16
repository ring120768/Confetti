import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { dueDate, formatDue } from '../lib/engine.js'

// Bottom sheet with a task's full story: guidance, cost, supplier questions,
// date pinning, skip, and notes. The library content finally gets seen.
export default function TaskSheet({ task, lib, onClose, onPatched, onAskBuzz }) {
  const [notes, setNotes] = useState(task.notes || '')
  const [saving, setSaving] = useState(false)

  async function patch(fields) {
    setSaving(true)
    const { error } = await supabase.from('tasks').update(fields).eq('id', task.id)
    setSaving(false)
    if (!error) onPatched({ ...task, ...fields })
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
