import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { PHASES, currentPhase, groupByPhase, phaseProgress, dueDate, isOverdue, formatDue } from '../lib/engine.js'
import Buzz from './Buzz.jsx'
import Pricing from './Pricing.jsx'
import TaskSheet from './TaskSheet.jsx'
import EditWedding from './EditWedding.jsx'
import Suppliers from './Suppliers.jsx'
import Guests from './Guests.jsx'
import Budget from './Budget.jsx'
import AddTask from './AddTask.jsx'

// Calendar subscription sheet: one tap and the plan lives in their phone
// calendar, auto-updating. Alerts come free from the calendar app.
function CalendarSync({ token, onClose }) {
  const [copied, setCopied] = useState(false)
  const feedUrl = `https://mrkotkgivhnydtrzyoct.supabase.co/functions/v1/calendar?token=${token}`
  const webcal = feedUrl.replace('https://', 'webcal://')
  const copy = async () => {
    await navigator.clipboard.writeText(feedUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>Your plan, in your calendar 📅</h3>
        <p className="meta">Every dated task appears in your phone's calendar and stays in sync as your plan changes — with the big day itself front and centre.</p>
        <div className="sheet-actions">
          <a href={webcal}><button type="button" style={{ width: '100%' }}>Apple / Outlook — subscribe</button></a>
          <a href={`https://calendar.google.com/calendar/u/0/r/settings/addbyurl?curl=${encodeURIComponent(webcal)}`}
             target="_blank" rel="noopener noreferrer">
            <button type="button" style={{ width: '100%' }}>Google Calendar — subscribe</button>
          </a>
          <button type="button" className="secondary" onClick={copy}>
            {copied ? 'Link copied ✓' : 'Copy feed link'}
          </button>
          <button type="button" className="secondary" onClick={onClose}>Close</button>
        </div>
        <p className="meta">Google not taking the link? Paste the copied link in Google Calendar → Settings → Add calendar → From URL.</p>
      </div>
    </div>
  )
}

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
export default function Plan({ wedding, onWeddingChange }) {
  const [tasks, setTasks] = useState([])
  const [library, setLibrary] = useState({})   // id -> library row
  const [selected, setSelected] = useState(null) // phase key; null = auto (current)
  const [tier, setTier] = useState('free')
  const [showPricing, setShowPricing] = useState(false)
  const [buzzAsk, setBuzzAsk] = useState(null)
  const [sheetTask, setSheetTask] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [view, setView] = useState('plan') // plan | guests | budget | suppliers
  const [showAddTask, setShowAddTask] = useState(false)
  const [showCalSync, setShowCalSync] = useState(false)

  const loadTasks = () =>
    supabase.from('tasks').select('*').eq('wedding_id', wedding.id)
      .then(({ data }) => setTasks(data || []))

  useEffect(() => {
    loadTasks()
    supabase.from('task_library').select('id,phase,priority,guidance,typical_cost_gbp,ask_suppliers')
      .then(({ data }) => setLibrary(Object.fromEntries((data || []).map(r => [r.id, r]))))
    supabase.from('subscriptions').select('tier').eq('couple_id', wedding.couple_id).maybeSingle()
      .then(({ data }) => setTier(data?.tier || 'free'))
  }, [wedding.id, wedding.couple_id])

  const current = useMemo(() => currentPhase(tasks, library), [tasks, library])
  const groups = useMemo(() => groupByPhase(tasks, library), [tasks, library])
  const shown = selected || current
  const [showOverdue, setShowOverdue] = useState(false)
  const overdueTasks = useMemo(
    () => tasks.filter(isOverdue).sort((a, b) => (dueDate(a) < dueDate(b) ? -1 : 1)),
    [tasks]
  )
  const thisWeek = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    return tasks
      .filter(t => t.status !== 'done' && t.status !== 'skipped')
      .filter(t => { const d = dueDate(t); return d && d >= today && d <= weekOut })
      .sort((a, b) => (dueDate(a) < dueDate(b) ? -1 : 1))
      .slice(0, 5)
  }, [tasks])

  async function toggle(task, e) {
    const status = task.status === 'done' ? 'todo' : 'done'
    if (status === 'done' && e?.target) confettiBurst(e.target)
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status } : t)) // optimistic
    const { error } = await supabase.from('tasks').update({ status }).eq('id', task.id)
    if (error) setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: task.status } : t))
  }

  const renderTask = (t) => (
    <div key={t.id} className={'task' + (t.status === 'done' ? ' done' : '') + (t.status === 'skipped' ? ' skipped' : '')}>
      <input type="checkbox" checked={t.status === 'done'} onChange={(e) => toggle(t, e)} />
      <div>
        <div className="title" role="button" tabIndex={0}
             onClick={() => setSheetTask(t)}
             onKeyDown={(e) => e.key === 'Enter' && setSheetTask(t)}>
          {t.title}{t.status === 'skipped' && <span className="badge"> skipped</span>}
        </div>
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
                  onClick={() => setBuzzAsk({
                    text: `About "${t.title}" — where do we start, and what should we watch out for?`,
                    taskId: t.id,
                  })}>
            🐝 Ask Buzz
          </button>
        )}
      </div>
    </div>
  )

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
      {daysToGo !== null && (
        <p className="tagline">
          {daysToGo} days to go 💛{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setShowEdit(true) }}>edit details</a>
        </p>
      )}
      {daysToGo === null && (
        <p className="tagline">
          No date yet — <a href="#" onClick={(e) => { e.preventDefault(); setShowEdit(true) }}>set one</a> and your plan gets real dates ✨
        </p>
      )}

      <nav className="view-tabs">
        {[['plan', 'Plan'], ['guests', 'Guests'], ['budget', 'Budget'], ['suppliers', 'Suppliers']].map(([k, label]) => (
          <button key={k} type="button" className={view === k ? 'active' : ''} onClick={() => setView(k)}>{label}</button>
        ))}
      </nav>

      {view === 'suppliers' && <Suppliers wedding={wedding} tier={tier} onAskBuzz={setBuzzAsk} onUpgrade={() => setShowPricing(true)} />}
      {view === 'guests' && <Guests wedding={wedding} tier={tier} onUpgrade={() => setShowPricing(true)} />}
      {view === 'budget' && <Budget wedding={wedding} tier={tier} onEditWedding={() => setShowEdit(true)} onUpgrade={() => setShowPricing(true)} />}

      {view === 'plan' && <>
      <div className="card this-week">
        <div className="pricing-head">
          <h3>This week 🗓</h3>
          {wedding.ics_token && (
            <button type="button" className="secondary" style={{ fontSize: 13, padding: '6px 12px' }}
                    onClick={() => setShowCalSync(true)}>📅 Sync to calendar</button>
          )}
        </div>
        {thisWeek.length === 0
          ? <p className="meta">Nothing due this week — you're ahead of the game. Enjoy being engaged! 💛</p>
          : thisWeek.map(t => renderTask(t))}
      </div>

      {tier === 'free' && tasks.filter(t => t.status === 'done').length >= 10 &&
        !localStorage.getItem('wppNudge10') && (
        <div className="card milestone-nudge">
          <p><strong>10 tasks done — you're properly planning now! 🎉</strong></p>
          <p className="meta">Couples at this stage get the most from Sparkle: unlimited guests, the full budget planner, and Buzz with 200 messages a month for the venue-hunting ahead.</p>
          <div className="draft-actions">
            <button type="button" onClick={() => setShowPricing(true)}>Try Sparkle free for 7 days ✨</button>
            <button type="button" className="secondary"
                    onClick={(e) => { localStorage.setItem('wppNudge10', '1'); e.target.closest('.milestone-nudge').remove() }}>
              Maybe later
            </button>
          </div>
        </div>
      )}

      {overdueTasks.length > 0 && (
        <button type="button" className={'overdue-chip' + (showOverdue ? ' active' : '')}
                onClick={() => setShowOverdue(v => !v)}>
          🕰 {overdueTasks.length} {overdueTasks.length === 1 ? 'task needs' : 'tasks need'} catching up
        </button>
      )}

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

      {showOverdue && overdueTasks.length > 0 && (
        <div className="card overdue-card">
          <h3>Catching up 🕰</h3>
          <p className="meta">No panic — most couples have a few of these. Knock off one or two, or ask Buzz where to start.</p>
          {overdueTasks.map(t => renderTask(t))}
        </div>
      )}

      <div className="card">
        <div className="pricing-head">
          <h3>{PHASES.find(p => p.key === shown)?.label}</h3>
          <button type="button" className="secondary" onClick={() => setShowAddTask(true)}>+ Add task</button>
        </div>
        {groups[shown]?.length === 0 && <p>Nothing in this phase — enjoy the calm!</p>}
        {groups[shown]?.map(t => renderTask(t))}
      </div>
      </>}

      {showCalSync && <CalendarSync token={wedding.ics_token} onClose={() => setShowCalSync(false)} />}

      {showAddTask && (
        <AddTask wedding={wedding} onClose={() => setShowAddTask(false)}
                 onAdded={(t) => { setShowAddTask(false); setTasks(ts => [...ts, t]) }} />
      )}

      {sheetTask && (
        <TaskSheet
          task={sheetTask}
          lib={library[sheetTask.library_id]}
          onClose={() => setSheetTask(null)}
          onPatched={(updated) => {
            setTasks(ts => ts.map(x => x.id === updated.id ? updated : x))
            setSheetTask(updated)
          }}
          onAskBuzz={setBuzzAsk}
        />
      )}

      {showEdit && (
        <EditWedding
          wedding={wedding}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setShowEdit(false)
            onWeddingChange?.(updated)
            loadTasks()
          }}
        />
      )}

      <Buzz wedding={wedding} tier={tier} ask={buzzAsk} onAskConsumed={() => setBuzzAsk(null)}
            onUpgrade={() => setShowPricing(true)} />
    </div>
  )
}
