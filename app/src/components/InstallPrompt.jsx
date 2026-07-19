import { useEffect, useState } from 'react'

// Nudges signed-in users to install the app on their phone.
// Android/Chrome: real install button (native prompt).
// iOS Safari: one-time instructions (Apple provides no install API).
// Hidden if already installed (standalone) or previously dismissed.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null) // Android beforeinstallprompt event
  const [show, setShow] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || !!window.Capacitor?.isNativePlatform?.() // already a real app
    if (standalone || localStorage.getItem('installPromptDismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (ios) { setIsIos(true); setShow(true) }

    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!show) return null

  const dismiss = () => {
    localStorage.setItem('installPromptDismissed', '1')
    setShow(false)
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setShow(false)
  }

  return (
    <div className="install-banner">
      <img src="/buzz.png" alt="" />
      <div>
        {isIos ? (
          <>Pop me on your home screen: tap <strong>Share</strong> <span aria-hidden>⎋</span> then <strong>"Add to Home Screen"</strong></>
        ) : (
          <>Get the app on your home screen for quick access</>
        )}
      </div>
      {!isIos && deferred && <button onClick={install}>Install</button>}
      <button className="secondary" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  )
}
