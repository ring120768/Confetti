# Confetti — Your AI Wedding Planner
## Product Requirements Document (PRD)

**Version:** 1.0 · **Date:** 2 July 2026 · **Owner:** Ringo
**Tagline:** *Where Every Detail Sparkles*

---

## 1. Vision

Every couple gets a wedding planner. Not a checklist app — a planner. Confetti behaves the way the best human planners do: it learns your vision and budget, tells you exactly what to do and when, chases the things you've forgotten, handles supplier legwork, and keeps the whole journey calm. A human full-service planner in the UK costs £2,000–£6,000+. Confetti delivers the core of that service from free to ~£20/month.

**One-line pitch:** "The wedding planner you didn't think you could afford, in your pocket."

## 2. The Opportunity

- ~265,000 UK weddings per year; average spend £20,600–£22,000 (Bridebook/Hitched 2026 reports). UK wedding services market valued at £10.4bn.
- Bridebook is the UK incumbent — free, funded by venue/supplier advertising. Strong checklist, budget calculator, guest list, supplier directory. Its weakness: it's a *directory with tools*, not a planner. No proactive, personalised guidance.
- AI wedding tools exist (TheWeddingPlanner.ai, nupt.ai, ItsaYes, Joy's AI writer) but are fragmented, mostly US-focused, and bolt AI onto single features (vows, speeches) rather than replicating the *planner relationship*.
- **Gap Confetti fills:** UK-first, planner-first. The AI is the product, not a feature. The free tier competes with Bridebook's checklist; the paid tiers compete with a human planner.

## 3. Target Users

**Primary — "Emma & Jack" (the DIY-with-help couple).** Late 20s–30s, engaged, 12–18 months out, budget £15–25k. No human planner (can't justify the cost). Currently juggling spreadsheets, Instagram saves, and a WhatsApp group. Wants: to not miss anything, to not overspend, and to feel someone is on top of it.

**Secondary — "The short-runway couple."** 6 months or less to the day. Needs triage: what matters now, what to skip. High willingness to pay.

**Tertiary — the helper.** Mum, maid of honour, best man. Invited as collaborator; a growth loop, not a buyer.

## 4. What the Best Human Planners Do (research basis)

Full-service planners (per Zola, The Knot, Planners Lounge service breakdowns): vision/style discovery → budget creation and management → planning timeline with deadlines → venue and supplier research, shortlisting, negotiation → contract review → guest management → design/décor cohesion → day-of schedule and coordination → post-wedding wrap-up. The product maps each of these to an app capability (Section 6).

## 5. The Three Tiers

| | **Confetti Free** | **Sparkle** — £8.99/mo | **Luxe** — £18.99/mo |
|---|---|---|---|
| Positioning | Better than any paper checklist | Your planning co-pilot | The full monty — a planner in your pocket |
| Smart checklist + journey timeline | ✓ | ✓ | ✓ |
| Reminders & nudges | Basic | Smart, personalised | Smart, personalised |
| Partner collaboration | 1 partner | Unlimited helpers | Unlimited helpers |
| Budget planner | Simple totals | Full tracker, UK benchmarks, payment schedule | + AI spend coaching |
| Guest list & RSVP | Capped (50 guests) | Unlimited, dietary/RSVP tracking | + seating planner |
| AI planner chat ("Buzz") | 10 messages/mo taster | 200 messages/mo | Unlimited |
| Supplier tracker | — | ✓ (contacts, quotes, booked status) | ✓ |
| AI supplier assistant (draft enquiries, compare quotes, contract red flags) | — | — | ✓ |
| Vision & style board | — | ✓ | ✓ |
| Day-of schedule generator | — | — | ✓ |
| Speech/vow/website copy writer | — | — | ✓ |
| Crisis mode (rapid replanning when something falls through) | — | — | ✓ |

**Pricing notes.** Also offer annual passes (Sparkle £59/yr, Luxe £129/yr) — most couples plan for 12–18 months, and annual reduces monthly churn. Consider a "Final 8 Weeks" one-off Luxe pass (£39) later; short-runway couples convert well. Billing via Stripe on the PWA = no 15–30% app store commission.

**Free tier economics.** Free must be good enough to win installs from Bridebook comparisons but structurally limited (guest cap, AI taster, basic reminders). The AI taster is the conversion engine: let everyone *feel* the planner, then meter it.

## 6. Core Features

### 6.1 The Lead-Time Engine (core IP — all tiers)
Every task in the master task library carries a **lead time** (weeks before the wedding it should be done), a duration, a category, and dependencies. Enter your wedding date and Confetti auto-dates your entire plan: `due_date = wedding_date − lead_time`. Users can **pin** a real date (venue viewing booked for the 14th) and pins override computed dates; dependent tasks reflow. No wedding date yet? Tasks display in phase order with relative labels ("~12 months before").

The task library is the moat: UK-specific, curated, with per-task guidance notes, typical costs, and questions-to-ask-suppliers. v1.1 ships with 140 tasks across 16 categories (venue, legal/ceremony, attire, catering, photography, flowers, music, transport, stationery, beauty, honeymoon, guests, day-of, post-wedding, admin, destination). Tasks carry a `wedding_types` flag (`uk` / `destination`): onboarding asks whether the wedding is in the UK or abroad and the engine filters accordingly — destination weddings get the CNI/apostille legal pathway, local-planner and guest-travel tasks instead of the UK register-office pathway.

### 6.2 Journey Timeline (all tiers)
**Not a literal Gantt chart.** A warm, scrollable "journey ribbon" of phases (Just Engaged → Big Decisions → Details → Final Countdown → The Day) showing progress per phase, with the current phase expanded into its task list. Gantt semantics (dependencies, durations, reflow) live in the engine; the presentation is emotional, not project-management software. A compact "planner view" (weeks × categories grid) is available for power users in paid tiers.

### 6.3 Buzz — the AI Planner (tiered)
Buzz (mascot already in brand assets) is a conversational planner with full context: wedding date, budget, guest count, style, task status, supplier pipeline. Behaviours:
- **Reactive:** answer anything ("How much should flowers cost in Kent?", "What do I ask a videographer?") grounded in the task library and UK benchmark data.
- **Proactive (paid):** weekly check-in ("Three things this week…"), overdue-task chasing, budget drift warnings ("You're 12% over on catering — here's where couples usually claw it back").
- **Doing, not just talking (Luxe):** drafts supplier enquiry emails, builds quote comparisons, generates the day-of schedule, replans when a supplier cancels.
Guardrails: no legal/contractual advice presented as authoritative (always "flag for review"); no payments made on the user's behalf; clear AI labelling.

### 6.4 Budget Planner (Sparkle+)
Set total budget → suggested allocation from UK averages (editable). Track estimated vs quoted vs paid per category; deposit and balance due dates feed the timeline as tasks. Over/under indicators per category.

### 6.5 Guest List & RSVP (free capped, Sparkle+ full)
Households, +1s, children, dietary needs, addresses. Shareable RSVP link (no login for guests). Counts feed budget (per-head catering) and seating planner (Luxe).

### 6.6 Supplier Hub (Sparkle+)
Pipeline per category: researching → enquired → quoted → booked. Store contacts, quotes, contract PDFs, payment schedule. Luxe adds Buzz drafting enquiries and summarising/comparing quotes, plus contract red-flag review (with "not legal advice" framing).

### 6.7 Collaboration
Invite partner (free) and helpers (paid) with role-based access (e.g. helper sees tasks assigned to them, not the budget). Task assignment + nudges.

## 7. Technical Approach

- **Client:** PWA — mobile-first responsive web app, installable, push notifications (iOS supports web push since 16.4). React (or keep it simple with what Replit scaffolds well). Single codebase, no app store gatekeeping.
- **Backend:** Supabase (Postgres, Auth, Storage for contract PDFs, Row Level Security per couple, Edge Functions).
- **AI:** Claude/OpenAI API behind a server-side proxy (never expose keys client-side). System prompt assembles wedding context from DB. Per-tier metering table for message counts.
- **Billing:** Stripe Checkout + Customer Portal, webhooks → `subscriptions` table → feature gates.
- **Notifications:** web push + email (Resend or similar) for reminders; email fallback matters since push opt-in is imperfect.
- **Core tables:** `couples`, `users`, `weddings` (date, budget, guest_estimate, style), `task_library` (global, versioned), `tasks` (per-wedding instance: status, pinned_date, computed_date, assignee), `guests`, `budget_items`, `suppliers`, `ai_messages`, `subscriptions`.

## 8. Success Metrics

- **Activation:** % of signups who set a wedding date and complete 3 tasks in week 1 (target 40%).
- **Retention:** weekly active couples / total active plans (target 45% — wedding planning is naturally recurring).
- **Conversion:** free → paid (target 4–6% by month 6; freemium consumer norm 2–5%).
- **Revenue goal (your living):** ~1,000 paying subscribers at blended ~£10/mo ≈ £10k MRR. At 5% conversion that's ~20,000 registered couples — ~7.5% of one year's UK weddings. Ambitious but not silly; Bridebook claims the majority of UK couples, so the audience exists.
- **AI quality:** thumbs-up rate on Buzz answers >85%; zero tolerance for fabricated supplier/legal claims in QA.

## 9. Risks & Mitigations

- **Bridebook adds AI.** Likely eventually. Mitigation: move fast, be planner-first not directory-first, own "AI planner" positioning in UK app searches now.
- **AI cost per user.** Meter messages per tier; cache common Q&A; use cheaper models for classification/nudges, premium models only for Luxe conversations.
- **Churn cliff after the wedding.** Inherent — customers graduate. Mitigation: annual passes priced for it, referral loop (guests see Confetti via RSVP pages), and later: anniversary/newlywed content.
- **Solo-founder bandwidth.** Roadmap is phased so each phase ships a sellable product. Don't start Phase N+1 until Phase N is stable.
- **Trust & data.** Wedding data is personal; contracts contain names/addresses. RLS from day one, GDPR basics (export + delete), UK data residency where possible.

## 10. Out of Scope for v1

Native apps, supplier-side marketplace/advertising (possible later revenue), wedding websites, registries, US market, multi-language.

---

*Sources: [Zola — full-service planning](https://www.zola.com/expert-advice/what-is-included-in-full-service-wedding-planning-packages) · [Bridebook features](https://bridebook.com/uk) · [Bridebook 2026 cost report](https://bridebook.com/uk/article/how-much-does-a-wedding-cost-the-uk-average) · [Hitched/Knot Worldwide 2026](https://www.theknotww.com/press-releases/the-average-cost-of-a-wedding-in-2026-around-21990-according-to-hitched) · [UK industry stats](https://www.sonas.events/blog/an-overview-of-the-uk-wedding-industry/) · [AI wedding tools 2026](https://itsayes.io/blog/best-ai-wedding-planner-tools) · [TheWeddingPlanner.ai](https://www.theweddingplanner.ai/)*
