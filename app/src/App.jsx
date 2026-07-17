import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import Onboarding from './components/Onboarding.jsx'
import Plan from './components/Plan.jsx'
import InstallPrompt from './components/InstallPrompt.jsx'
import Reveal from './components/Reveal.jsx'

// Screens: loading -> signin -> onboarding (no wedding yet) -> plan
export default function App() {
  const [session, setSession] = useState(null)
  const [wedding, setWedding] = useState(null)
  const [justCreated, setJustCreated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setLoading(false); return }
    // find this user's wedding (via their couple membership)
    supabase
      .from('weddings')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setWedding(data); setLoading(false) })
  }, [session])

  async function signIn(e) {
    e?.preventDefault()
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setSent(true)
    setCooldown(60)
  }

  if (loading) return <p>Loading…</p>

  if (!session) return (
    <div className="welcome">
      <img src="/heart.png" alt="" className="logo-hero" />
      <h1>Wedding Planner Pro</h1>
      <p className="tagline">Where every detail sparkles</p>
      <div className="card">
        {sent ? (
          <div>
            <p><img src="/buzz.png" alt="" className="buzz-inline" /> Buzz has sent a sign-in link to <strong>{email}</strong> 💌</p>
            <p className="meta">It can take a minute or two — and do check your spam folder the first time.</p>
            <div className="draft-actions">
              <button type="button" className="secondary" disabled={cooldown > 0} onClick={() => signIn()}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
              </button>
              <button type="button" className="secondary" onClick={() => { setSent(false); setCooldown(0) }}>
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={signIn}>
            <label>Your email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            <button type="submit">Send me a sign-in link</button>
          </form>
        )}
      </div>
      <p className="meta"><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></p>
    </div>
  )

  if (!wedding) return <Onboarding onCreated={(w) => { setWedding(w); setJustCreated(true) }} />

  return (
    <>
      {justCreated && <Reveal wedding={wedding} onDone={() => setJustCreated(false)} />}
      <InstallPrompt />
      <Plan wedding={wedding} onWeddingChange={setWedding} />
      <footer className="account-footer">
        Signed in as {session.user.email} ·{' '}
        <a href="#" onClick={async (e) => { e.preventDefault(); await supabase.auth.signOut(); setWedding(null) }}>
          Sign out
        </a>
        <br /><a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a>
      </footer>
    </>
  )
}
