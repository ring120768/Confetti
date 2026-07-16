import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { PHASES, currentPhase, groupByPhase, phaseProgress, dueDate, isOverdue, formatDue } from '../lib/engine.js'
import Buzz from './Buzz.jsx'
import Pricing from './Pricing.jsx'

// A little confetti burst from the ticked checkbox — brand moment.
const CONFETTI = ['#F7D6B8', '#F4C9C5', '#F5E6A8', '#C9DCEA', '#C8E0CC', '#D6CCE4', '#D49A2E']
function confettiBurst(el) {
  const { left, top, width, height } = el.getBoundingClientRect()
  const cx = left + width / 2, cy = top + height / 2
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div')
    p.className = 'confetti-piece'
    p.style.left = cx + 'px'
    p.style.top = cy + 'px'
    p.style.background = CONFETTI[i % CONFETTI.length]
    p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px')
    p.style.setProperty('--dy', (Math.random() * -90 - 20) + 'px')
    if (i % 3 === 0) p.style.borderRadius = '50%'
    document.body.appendChild(p)
    setTimeout(() => p.remove(), 950)
  }
}

// The journey ribbon + current-phase task list.
export default function Plan({ wedding }) {
  const [tasks, setTasks] = useState([])
  const [library, setLibrary] = useState({})   // id -> library row
  const [selected, setSelected] = useState(null) // phase key; null = auto (current)
  const [tier, setTier] = useState('free')
  const [showPricing, setShowPricing] = useState(false)
  const [buzzAsk, setBuzzAsk] = useState(null)

  useEffect(() => {
    supabase.from('tasks').select('*').eq('wedding_id', wedding.id)
      .then(({ data }) => setTasks(data || []))
    supabase.from('task_library').select('id,phase,priority,guidance,typical_cost_gbp')
      .then(({ data }) => setLibrary(Object.fromEntries((data || []).map(r => [r.id, r]))))
    supabase.from('subscriptions').select('tier').eq('couple_id', wedding.couple_id).maybeSingle()
      .then(({ data }) => setTier(data?.tier || 'free'))
  }, [wedding.id, wedding.couple_id])

  const current = useMemo(() => currentPhase(tasks, library), [tasks, library])
  const groups = useMemo(() => groupByPhase(tasks, library), [tasks, library])
  const shown = selected || current

  async function toggle(task, e) {
    const status = task.status === 'done' ? 'todo' : 'done'
    if (status === 'done' && e?.target) confettiBurst(e.target)
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status } : t)) // optimistic
    const { error } = await supabase.from('tasks').update({ status }).eq('id', task.id)
    if (error) setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: task.status } : t))
  }

  const daysToGo = wedding.wedding_date
    ? Math.ceil((new Date(wedding.wedding_date) - new Date()) / 86400000)
    : null

  if (showPricing) return <Pricing currentTier={tier} onClose={() => setShowPricing(false)} />

  return (
    <div>
      <header className="plan-header">
        <img src="/heart.png" alt="Wedding Planner Pro" className="logo-small" />
        <h1>Your wedding plan</h1>
        <button className="secondary tier-badge" onClick={() => setShowPricing(true)}>
          {tier === 'free' ? 'Free · Upgrade ✨' : tier === 'sparkle' ? 'Sparkle ✨' : 'Luxe 👑'}
        </button>
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
            <input type="checkbox" checked={t.status === 'done'} onChange={(e) => toggle(t, e)} />
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
              {t.status !== 'done' && t.status !== 'skipped' && (
                <button type="button" className="ask-buzz"
                        onClick={() => setBuzzAsk(`About "${t.title}" — where do we start, and what should we watch out for?`)}>
                  🐝 Ask Buzz
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Buzz wedding={wedding} ask={buzzAsk} onAskConsumed={() => setBuzzAsk(null)} />
    </div>
  )
}
