import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import Onboarding from './components/Onboarding.jsx'
import Plan from './components/Plan.jsx'
import InstallPrompt from './components/InstallPrompt.jsx'

// Screens: loading -> signin -> onboarding (no wedding yet) -> plan
export default function App() {
  const [session, setSession] = useState(null)
  const [wedding, setWedding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

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
    e.preventDefault()
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setSent(true)
  }

  if (loading) return <p>Loading…</p>

  if (!session) return (
    <div className="welcome">
      <img src="/heart.png" alt="" className="logo-hero" />
      <h1>Wedding Planner Pro</h1>
      <p className="tagline">Where every detail sparkles</p>
      <div className="card">
        {sent ? (
          <p><img src="/buzz.png" alt="" className="buzz-inline" /> Check your email — Buzz has sent you a sign-in link. 💌</p>
        ) : (
          <form onSubmit={signIn}>
            <label>Your email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            <button type="submit">Send me a sign-in link</button>
          </form>
        )}
      </div>
    </div>
  )

  if (!wedding) return <Onboarding onCreated={setWedding} />

  return (
    <>
      <InstallPrompt />
      <Plan wedding={wedding} onWeddingChange={setWedding} />
    </>
  )
}
