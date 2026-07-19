// Are we running inside the native store app (Capacitor webview)?
// Store rules (Apple/Google) forbid selling digital subscriptions via
// external payment inside store-distributed apps — so native builds
// hide every purchase path and simply reflect the user's tier.
// Purchases happen on the website; the app is the experience.
export const isNativeApp = () =>
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
