# Confetti — Build Roadmap

**Version:** 1.0 · **Date:** 2 July 2026
Companion to `PRD.md`. Phased so every phase ends with something real users can use — no six-month dark builds. Timings assume you solo, part-time-plus, building with Claude Code; treat them as honest estimates, not promises.

---

## Phase 0 — Foundations (Weeks 1–2)

**Goal: nothing visible, everything ready.**

- Supabase project: schema for `couples`, `users`, `weddings`, `task_library`, `tasks`, `guests` (see PRD §7). Row Level Security on from the first table.
- Auth (email + Google), couple creation, partner invite by email.
- PWA shell: installable, app icon (asset exists), brand palette applied from `confetti-brand-guide.html`.
- **The task library** — the real work of this phase. Write ~150 UK wedding tasks with lead times, categories, guidance notes. This is content, not code, and it's your moat. Do it properly once.

**Exit test:** you can sign up, create a wedding, and the DB holds a dated task list.

## Phase 1 — Free Tier MVP (Weeks 3–8)

**Goal: the best free wedding checklist in the UK. Launchable.**

- Lead-time engine: auto-date tasks from wedding date; pin/override dates; reflow dependents; no-date fallback (relative phase labels).
- Journey ribbon timeline + current-phase task list (per agreed design — warm, not Gantt).
- Task detail: guidance notes, mark done, add custom tasks, assign to partner.
- Reminders: email first (simpler), web push second.
- Guest list (50-guest cap), simple budget totals.
- Buzz taster: 10 AI messages/mo, grounded in task library + wedding context.
- Onboarding: date → budget band → guest estimate → style → "here's your plan" moment (this reveal is the wow — invest in it).

**Milestone: soft launch.** 20–30 real couples (friends-of-friends, r/UKweddings, Facebook wedding groups). Watch activation metric, fix the top complaints.

## Phase 2 — Sparkle Tier + Billing (Weeks 9–14)

**Goal: first revenue.**

- Stripe Checkout, webhooks, feature gating, customer portal.
- Full budget planner: UK benchmark allocation, per-category tracking, deposit/balance dates feeding the timeline.
- Full guest list: unlimited, RSVP link pages, dietary tracking.
- Supplier tracker: pipeline, contacts, quotes, booked status.
- Buzz at 200 messages/mo + weekly proactive check-in ("three things this week").
- Vision board (simple image grid — don't gold-plate).
- Unlimited helper invites with role-based access.

**Milestone: public launch.** PWA live, Product Hunt / UK wedding press outreach, first paying subscribers. **Gate: don't start Phase 3 until ≥25 paying subscribers or clear evidence of demand** — that's the signal Sparkle is worth building on.

## Phase 3 — Luxe Tier: the Full Monty (Weeks 15–22)

**Goal: the "planner in your pocket" promise, justifying £18.99.**

- Buzz unlimited + agentic features: draft supplier enquiry emails, quote comparison tables, contract red-flag summaries (clearly labelled not-legal-advice).
- Day-of schedule generator (interview-style: ceremony time, venue count, suppliers → printable/shareable run sheet).
- Seating planner (tables, drag-drop, dietary flags from guest list).
- Speech/vow/website copy writer.
- Crisis mode: "my photographer cancelled" → replan tasks, draft replacement enquiries, adjust budget.
- AI spend coaching on the budget.

**Milestone: Luxe launch** to the existing paying base first (upgrade offer), then publicly.

## Phase 4 — Growth & Retention (Weeks 23+, ongoing)

- Annual passes + "Final 8 Weeks" one-off pass (short-runway couples).
- Referral loop: guest-facing RSVP pages carry tasteful "Planned with Confetti" branding.
- SEO content engine: task-library guidance pages published as web content ("How much does a wedding photographer cost in the UK?") — each of the ~150 tasks is a landing page. This is your Bridebook-style acquisition channel without their ad budget.
- App Store/Play wrapper (Capacitor) *only if* PWA install friction is measurably hurting conversion.
- Evaluate supplier-side revenue (featured listings) once couple volume justifies it.

---

## Operating principles

1. **Ship each phase to real users before starting the next.** The gates above are there to protect you from building Luxe features nobody buys.
2. **Content beats code.** The task library and UK benchmarks make Buzz smart; a fancier UI doesn't.
3. **Keep AI costs visible from day one** — log tokens per user, per tier, weekly.
4. **One codebase, one platform (PWA), Stripe not app stores** — margin protection is the retirement plan.

## Summary timeline

| Phase | Weeks | Ships | Revenue state |
|---|---|---|---|
| 0 Foundations | 1–2 | Infra + task library | — |
| 1 Free MVP | 3–8 | Free tier, soft launch | £0 (audience building) |
| 2 Sparkle | 9–14 | Paid tier, public launch | First MRR |
| 3 Luxe | 15–22 | Full-monty AI planner | Second tier MRR |
| 4 Growth | 23+ | Annual/one-off passes, SEO, referrals | Scale toward £10k MRR goal |
