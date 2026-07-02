// Lead-time engine — client-side helpers.
// The dates themselves are computed in Postgres (recompute_task_dates);
// this file handles presentation: which phase is "current", grouping, overdue.

export const PHASES = [
  { key: 'just-engaged',    label: 'Just Engaged' },
  { key: 'big-decisions',   label: 'Big Decisions' },
  { key: 'details',         label: 'Details' },
  { key: 'final-countdown', label: 'Final Countdown' },
  { key: 'the-day',         label: 'The Day' },
  { key: 'after',           label: 'After' },
]

// A task's effective due date: pinned wins over computed.
export const dueDate = (t) => t.pinned_date || t.computed_date

export const isOverdue = (t) =>
  t.status !== 'done' && t.status !== 'skipped' &&
  dueDate(t) && new Date(dueDate(t)) < new Date()

// Current phase = earliest phase that still has open tasks.
export function currentPhase(tasks, library) {
  const phaseOf = (t) => library[t.library_id]?.phase || 'details'
  for (const p of PHASES) {
    if (tasks.some(t => phaseOf(t) === p.key && t.status !== 'done' && t.status !== 'skipped'))
      return p.key
  }
  return 'after'
}

export function groupByPhase(tasks, library) {
  const groups = Object.fromEntries(PHASES.map(p => [p.key, []]))
  for (const t of tasks) {
    const phase = library[t.library_id]?.phase || 'details'
    groups[phase].push(t)
  }
  // within a phase: soonest due first, undated last
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => (dueDate(a) || '9999') < (dueDate(b) || '9999') ? -1 : 1)
  }
  return groups
}

export function phaseProgress(tasks, library, phaseKey) {
  const inPhase = tasks.filter(t => (library[t.library_id]?.phase || 'details') === phaseKey)
  if (!inPhase.length) return 0
  const done = inPhase.filter(t => t.status === 'done' || t.status === 'skipped').length
  return Math.round((done / inPhase.length) * 100)
}

export const formatDue = (iso) => {
  if (!iso) return 'no date yet'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
