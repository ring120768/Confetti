import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// The one way in: email -> magic link. Used on the landing page.
export default function EmailSignIn({ cta = 'Start planning free ✨' }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function signIn(e) {
    e?.preventDefault()
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    setSent(true)
    setCooldown(60)
  }

  if (sent) return (
    <div className="card signin-card">
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
  )

  return (
    <form onSubmit={signIn} className="signin-form">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
             placeholder="you@example.com" aria-label="Your email" />
      <button type="submit">{cta}</button>
      <p className="meta">Free forever plan · no card needed · sign in by email link</p>
    </form>
  )
}
