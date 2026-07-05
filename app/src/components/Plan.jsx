import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { PHASES, currentPhase, groupByPhase, phaseProgress, dueDate, isOverdue, formatDue } from '../lib/engine.js'
import Buzz from './Buzz.jsx'

// The journey ribbon + current-phase task list.
export default function Plan({ wedding }) {
  const [tasks, setTasks] = useState([])
  const [library, setLibrary] = useState({})   // id -> library row
  const [selected, setSelected] = useState(null) // phase key; null = auto (current)

  useEffect(() => {
    supabase.from('tasks').select('*').eq('wedding_id', wedding.id)
      .then(({ data }) => setTasks(data || []))
    supabase.from('task_library').select('id,phase,priority,guidance,typical_cost_gbp')
      .then(({ data }) => setLibrary(Object.fromEntries((data || []).map(r => [r.id, r]))))
  }, [wedding.id])

  const current = useMemo(() => currentPhase(tasks, library), [tasks, library])
  const groups = useMemo(() => groupByPhase(tasks, library), [tasks, library])
  const shown = selected || current

  async function toggle(task) {
    const status = task.status === 'done' ? 'todo' : 'done'
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status } : t)) // optimistic
    const { error } = await supabase.from('tasks').update({ status }).eq('id', task.id)
    if (error) setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: task.status } : t))
  }

  const daysToGo = wedding.wedding_date
    ? Math.ceil((new Date(wedding.wedding_date) - new Date()) / 86400000)
    : null

  return (
    <div>
      <header className="plan-header">
        <img src="/confetti-logo.png" alt="Confetti" className="logo-small" />
        <h1>Your wedding plan</h1>
      </header>
      {daysToGo !== null && <p className="tagline">{daysToGo} days to go 💛</p>}

      <div className="ribbon">
        {PHASES.map(p => (
          <div key={p.key}
               className={'phase' + (p.key === shown ? ' current' : '')}
               onClick={() => setSelected(p.key)}>
            {p.label}
            <div className="bar"><div style={{ width: phaseProgress(tasks, library, p.key) + '%' }} /></div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>{PHASES.find(p => p.key === shown)?.label}</h3>
        {groups[shown]?.length === 0 && <p>Nothing in this phase — enjoy the calm!</p>}
        {groups[shown]?.map(t => (
          <div key={t.id} className={'task' + (t.status === 'done' ? ' done' : '')}>
            <input type="checkbox" checked={t.status === 'done'} onChange={() => toggle(t)} />
            <div>
              <div className="title">{t.title}</div>
              <div className="meta">
                <span className={'due' + (isOverdue(t) ? ' overdue' : '')}>{formatDue(dueDate(t))}</span>
                {' · '}
                <span className={'badge ' + (library[t.library_id]?.priority || '')}>
                  {library[t.library_id]?.priority || 'custom'}
                </span>
              </div>
              {library[t.library_id]?.guidance && t.status !== 'done' && (
                <div className="meta">{library[t.library_id].guidance}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Buzz wedding={wedding} />
    </div>
  )
}
