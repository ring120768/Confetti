import EmailSignIn from './EmailSignIn.jsx'

// The public front door: pitch, proof, pricing — then the email box.
const FEATURES = [
  {
    icon: '🐝', title: 'Meet Buzz, your planner',
    body: 'Ask anything, any time. Buzz knows your date, budget and progress — and researches real venues and suppliers near you, checks their ratings, finds their contact details, and drafts the enquiry email. You just hit send.',
  },
  {
    icon: '🗓', title: 'The plan that plans itself',
    body: 'Tell us your date and 140 expert tasks schedule themselves around it — from "book the registrar" to the 29-day legal notice deadline most couples have never heard of. Marrying abroad? The paperwork tasks change to match.',
  },
  {
    icon: '💷', title: 'Everything in one place',
    body: 'Guests with RSVPs and dietary needs (import your spreadsheet in one tap), a budget tracker with honest UK benchmarks, your supplier pipeline, and your whole plan synced live into your phone\'s calendar.',
  },
]

const STEPS = [
  ['Tell us about your day', 'Date, rough budget, style — 60 seconds.'],
  ['Get your plan instantly', 'Every task timed perfectly to your wedding, with expert guidance on each.'],
  ['Plan with Buzz at your side', 'Research, reminders, emails, and calm — like a planner in your pocket.'],
]

const TIERS = [
  { name: 'Free', price: '£0', per: 'forever', blurb: 'The best free wedding checklist in the UK.', features: ['Full task plan & timeline', 'Guest list (up to 50)', 'Budget totals', 'Buzz taster — 10 messages/mo'] },
  { name: 'Sparkle', price: '£8.99', per: '/month · or £59/yr', blurb: 'Your planning co-pilot.', features: ['Unlimited guests & RSVP tracking', 'Full budget planner', 'Supplier pipeline', 'Buzz — 200 messages/mo'], highlight: true },
  { name: 'Luxe', price: '£18.99', per: '/month · or £129/yr', blurb: 'The full monty.', features: ['Unlimited Buzz + venue research', 'Enquiry email drafting', 'Seating planner & day-of schedule', 'Crisis replanning'] },
]

export default function Landing() {
  const toTop = () => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="landing">
      <header className="landing-nav">
        <img src="/heart.png" alt="" />
        <strong>Wedding Planner Pro</strong>
        <button type="button" className="secondary" onClick={toTop}>Sign in</button>
      </header>

      <section className="hero" id="signup">
        <img src="/heart.png" alt="" className="logo-hero" />
        <h1>The wedding planner you didn't think you could afford</h1>
        <p className="sub">A professional planner costs £3,000+. Wedding Planner Pro gives you the same job description — a complete plan timed to your day, and Buzz, an AI planner who researches venues, chases what's late, and even drafts your emails — from free.</p>
        <EmailSignIn />
      </section>

      <section className="features">
        {FEATURES.map(f => (
          <div key={f.title} className="card feature">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <section className="steps">
        <h2>How it works</h2>
        {STEPS.map(([t, b], i) => (
          <div key={t} className="step">
            <span className="step-n">{i + 1}</span>
            <div><strong>{t}</strong><p className="meta">{b}</p></div>
          </div>
        ))}
      </section>

      <section className="landing-pricing">
        <h2>Simple, honest pricing</h2>
        <p className="meta">Every paid plan starts with a 7-day free trial. Cancel anytime.</p>
        {TIERS.map(t => (
          <div key={t.name} className={'card tier' + (t.highlight ? ' highlight' : '')}>
            <div className="tier-head">
              <h3>{t.name}</h3>
              <div><strong>{t.price}</strong><span className="meta"> {t.per}</span></div>
            </div>
            <p className="meta">{t.blurb}</p>
            <ul>{t.features.map(f => <li key={f}>{f}</li>)}</ul>
            <button type="button" onClick={toTop}>
              {t.name === 'Free' ? 'Start free ✨' : `Try ${t.name} free for 7 days`}
            </button>
          </div>
        ))}
      </section>

      <section className="founding card">
        <h3>Be one of our 50 founding couples 💛</h3>
        <p>We're launching with fifty couples who'll shape the product — and get their first month of any plan free with code <strong>FOUNDING50</strong> at checkout.</p>
        <button type="button" onClick={toTop}>Claim a founding spot</button>
      </section>

      <footer className="landing-footer">
        <p className="meta">Where every detail sparkles ✨</p>
        <p className="meta"><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a> · <a href="mailto:hello@weddingplannerpro.co.uk">hello@weddingplannerpro.co.uk</a></p>
      </footer>
    </div>
  )
}
