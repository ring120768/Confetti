import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { isNativeApp } from '../lib/platform.js'

const TIERS = [
  {
    key: 'free', name: 'Free', monthly: '£0', annual: '£0',
    blurb: 'The best free wedding checklist in the UK',
    features: ['Full task plan with journey timeline', 'Calendar sync & reminders', 'Guest list (up to 50)', 'Budget tracker (15 items)', 'Supplier list (5)', 'Buzz taster — 10 messages/mo'],
  },
  {
    key: 'sparkle', name: 'Sparkle', monthly: '£8.99/mo', annual: '£59/yr',
    blurb: 'Your planning co-pilot',
    features: ['Everything in Free — without the limits', 'Unlimited guests, suppliers & budget items', 'RSVP & dietary tracking at full scale', 'Buzz — 200 messages/mo with weekly check-ins'],
  },
  {
    key: 'luxe', name: 'Luxe', monthly: '£18.99/mo', annual: '£129/yr',
    blurb: 'The full monty — a planner in your pocket',
    features: ['Everything in Sparkle', 'Unlimited Buzz with venue & supplier research', 'Enquiry email drafting', 'Day-of schedule generator', 'Seating planner', 'Crisis replanning'],
    highlight: true,
  },
]

export default function Pricing({ currentTier = 'free', onClose }) {
  const [annual, setAnnual] = useState(false)
  const [busy, setBusy] = useState(null)

  // Store builds: no purchasing, no steering — just show what each plan includes.
  if (isNativeApp()) return (
    <div className="pricing">
      <div className="pricing-head">
        <h2>Plans</h2>
        <button className="secondary" onClick={onClose}>Back to plan</button>
      </div>
      {TIERS.map(t => (
        <div key={t.key} className={'card tier' + (t.highlight ? ' highlight' : '')}>
          <div className="tier-head"><h3>{t.name}</h3></div>
          <p className="meta">{t.blurb}</p>
          <ul>{t.features.map(f => <li key={f}>{f}</li>)}</ul>
          {currentTier === t.key && <button className="secondary" disabled>Your current plan</button>}
        </div>
      ))}
    </div>
  )

  async function choose(tierKey) {
    if (tierKey === 'free' || tierKey === currentTier) return
    const plan = `${tierKey}_${annual ? 'annual' : 'monthly'}`
    setBusy(tierKey)
    const { data, error } = await supabase.functions.invoke('stripe', { body: { action: 'checkout', plan } })
    setBusy(null)
    if (data?.url) window.location.href = data.url
    else alert(error ? 'Checkout failed — try again shortly.' : data?.error)
  }

  async function managePlan() {
    const { data } = await supabase.functions.invoke('stripe', { body: { action: 'portal' } })
    if (data?.url) window.location.href = data.url
  }

  return (
    <div className="pricing">
      <div className="pricing-head">
        <h2>Choose your plan</h2>
        <button className="secondary" onClick={onClose}>Back to plan</button>
      </div>

      <p className="meta">Every paid plan starts with a 7-day free trial — cancel anytime before it ends and pay nothing.</p>

      <div className="billing-toggle">
        <button className={annual ? 'secondary' : ''} onClick={() => setAnnual(false)}>Monthly</button>
        <button className={annual ? '' : 'secondary'} onClick={() => setAnnual(true)}>Annual (save ~40%)</button>
      </div>

      {TIERS.map(t => (
        <div key={t.key} className={'card tier' + (t.highlight ? ' highlight' : '')}>
          <div className="tier-head">
            <h3>{t.name}</h3>
            <strong>{annual ? t.annual : t.monthly}</strong>
          </div>
          <p className="meta">{t.blurb}</p>
          <ul>{t.features.map(f => <li key={f}>{f}</li>)}</ul>
          {currentTier === t.key ? (
            <button className="secondary" disabled>Your current plan</button>
          ) : t.key === 'free' ? (
            currentTier !== 'free' && <button className="secondary" onClick={managePlan}>Downgrade via billing portal</button>
          ) : (
            <button onClick={() => choose(t.key)} disabled={busy === t.key}>
              {busy === t.key ? 'Opening checkout…' : `Try ${t.name} free for 7 days ✨`}
            </button>
          )}
        </div>
      ))}

      {currentTier !== 'free' && (
        <p className="meta" style={{ textAlign: 'center' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); managePlan() }}>Manage billing, invoices & cancellation</a>
        </p>
      )}
    </div>
  )
}
