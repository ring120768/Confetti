import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// The moment after onboarding: a confetti storm and the plan headline.
const COLOURS = ['#F7D6B8', '#F4C9C5', '#F5E6A8', '#C9DCEA', '#C8E0CC', '#D6CCE4', '#D49A2E']

export default function Reveal({ wedding, onDone }) {
  const [count, setCount] = useState(null)

  useEffect(() => {
    supabase.from('tasks').select('*', { count: 'exact', head: true })
      .eq('wedding_id', wedding.id)
      .then(({ count }) => setCount(count ?? 0))
    // confetti storm from the top of the screen
    const pieces = []
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('div')
      p.className = 'confetti-piece'
      p.style.left = Math.random() * 100 + 'vw'
      p.style.top = '-10px'
      p.style.background = COLOURS[i % COLOURS.length]
      p.style.animationDuration = (0.9 + Math.random() * 1.2) + 's'
      p.style.animationDelay = (Math.random() * 0.8) + 's'
      p.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px')
      p.style.setProperty('--dy', (40 + Math.random() * 60) + 'vh')
      if (i % 3 === 0) p.style.borderRadius = '50%'
      document.body.appendChild(p)
      pieces.push(p)
    }
    const t = setTimeout(() => pieces.forEach(p => p.remove()), 2600)
    return () => { clearTimeout(t); pieces.forEach(p => p.remove()) }
  }, [wedding.id])

  return (
    <div className="sheet-overlay reveal">
      <div className="card reveal-card">
        <img src="/buzz.png" alt="" className="buzz" />
        <h2>Your plan is ready! 🎉</h2>
        <p>
          {count === null ? 'Buzz has built your wedding plan' :
            `${count} tasks, each arriving exactly when you need it`}
          {wedding.wedding_date ? ' — timed perfectly to your big day.' : '. Add your date and every task gets a real deadline.'}
        </p>
        <p className="meta">First on the list: celebrate being engaged. Properly. 🥂</p>
        <button type="button" onClick={onDone}>Show me the plan ✨</button>
      </div>
    </div>
  )
}
