# Wedding Planner Pro — Store Submission Pack

*Working guide for App Store + Google Play. The native apps are thin Capacitor
wrappers over www.weddingplannerpro.co.uk — content updates ship via git push,
store resubmission only needed for wrapper/icon changes.*

---

## 1. Build steps (your Mac, ~30 min first time)

```bash
cd ~/Documents/Claude/Projects/"Confetti Your AI Wedding Planner"/app
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm run build                # capacitor wants a dist/ to exist
npx cap add android
npx cap add ios
npx cap sync
npx cap open android         # → Android Studio: Build → Generate Signed Bundle (AAB)
npx cap open ios             # → Xcode: Product → Archive → Distribute
```

Same drill as CCLAI. Icons: use `confetti-app-icon.png` (1024×1024) in each
platform's asset catalog (Android Studio: Image Asset tool; Xcode: AppIcon set).

## 2. Compliance built into the web app (already shipped)

- Native builds show **no purchase buttons anywhere**: landing page replaced by
  plain sign-in, tier badge says "Free plan" (no Upgrade), pricing screen is
  view-only plan descriptions, milestone/quota upsells hidden, PWA install
  banner hidden.
- No links or text steering users to buy on the website (Apple's steering rule).
- Subscriptions purchased on the web simply *appear* in the app (sign-in-only
  model — the Netflix/Spotify pattern).

## 3. Store listing copy

**Name:** Wedding Planner Pro — AI Wedding Planner
**Subtitle (Apple, 30 chars):** Buzz, your AI wedding planner
**Short description (Play, 80 chars):** Plan your UK wedding with Buzz — tasks, guests, budget & real venue research.

**Description (both stores):**
Meet Buzz — the wedding planner you didn't think you could afford. 🐝

Tell us your date and get a complete UK wedding plan instantly: 140 expert
tasks, each arriving exactly when you need it — from booking your venue to the
29-day legal notice most couples have never heard of.

• Buzz, your AI planner — ask anything, anytime. Real venue and supplier
  research near you, with ratings, contact details and drafted enquiry emails.
• The plan that plans itself — auto-scheduled to your date, with expert
  guidance, typical UK costs, and questions to ask every supplier.
• Guests made easy — RSVPs, dietary needs, day/evening lists, one-tap
  spreadsheet import.
• Budget with honest UK benchmarks — see committed vs paid at a glance.
• Supplier pipeline — from "found it" to "booked", in one place.
• Calendar sync — your whole plan in your phone's calendar, always up to date.
• Marrying abroad? Destination paperwork (CNI, apostille) handled too.

Where every detail sparkles ✨

**Keywords (Apple):** wedding,planner,wedding planner,checklist,bride,groom,engaged,venue,budget,guest list
**Category:** Lifestyle
**Age rating:** 4+ / Everyone

## 4. Required URLs & accounts

- Privacy policy: https://www.weddingplannerpro.co.uk/privacy.html
- Terms: https://www.weddingplannerpro.co.uk/terms.html
- Support: help@weddingplannerpro.co.uk
- **Apple demo account:** create a test account (e.g. review@weddingplannerpro.co.uk
  mailbox or a Gmail) with a populated wedding, and give Apple the credentials —
  note in review notes that sign-in is via email link, so give them the mailbox
  password too, or request Apple use the demo account flow.
  ⚠️ Magic-link-only sign-in can frustrate Apple review — if rejected for this,
  the fix is adding Google sign-in or an email+password option (planned anyway).

## 5. Data safety / privacy questionnaires (both stores)

Collected: email (account), user content (wedding/guest/budget data), no ads,
no tracking, no data sold, data encrypted in transit, deletable on request
(help@ email). Third-party processors: Supabase, Anthropic, Google, Stripe
(web only), Resend.

## 6. Screenshots (needed before submission)

Phone screenshots (6.7" iPhone + Android phone, ~5 each):
1. Landing/sign-in with heart branding
2. Plan with This Week + journey ribbon
3. Buzz researching venues (with ratings + distances)
4. Task detail sheet with pro questions
5. Guests or Budget screen
Take on real devices or simulators after the wrapper builds.

## 7. Review-rejection playbook

- "Minimum functionality / just a website" → wrapper apps get this sometimes;
  mitigations: push notifications later, mention offline-tolerant PWA shell,
  emphasise native install value. If pushed, we bundle assets locally
  (webDir build) instead of server.url.
- "Sign-in issues" → see demo account note above; add Google OAuth.
- "Where do users pay?" → answer honestly: accounts have optional web
  subscriptions; the app sells nothing (Netflix model). Do not link to pricing.
