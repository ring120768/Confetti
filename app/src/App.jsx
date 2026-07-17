import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import Onboarding from './components/Onboarding.jsx'
import Plan from './components/Plan.jsx'
import InstallPrompt from './components/InstallPrompt.jsx'
import Reveal from './components/Reveal.jsx'
import Landing from './components/Landing.jsx'

// Screens: loading -> signin -> onboarding (no wedding yet) -> plan
export default function App() {
  const [session, setSession] = useState(null)
  const [wedding, setWedding] = useState(null)
  const [justCreated, setJustCreated] = useState(false)
  const [loading, setLoading] = useState(true)

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

  if (loading) return <p>Loading…</p>

  if (!session) return <Landing />

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
