# Wedding Planner Pro — UI/UX Audit

**Date:** 15 July 2026 · reviewed against the live app (every screen, code-level)
**Priorities:** P0 = fix before beta couples · P1 = fix before public launch · P2 = post-launch polish
**Effort:** S = under an hour · M = a session · L = multi-session

> **PROGRESS (updated 15 Jul 2026):** Batches 1–3 shipped — 17 of 30 done.
> ✅ Done: 1.1, 1.2, 1.3 · 2.1, 2.2, 2.3, 2.4, 2.6 · 3.1, 3.2, 3.3, 3.5 · 4.2, 4.3 · 5.1, 5.2, 5.6 (focus rings)
> ⬜ Remaining P0-for-launch: 6.1 guests, 6.2 budget
> ⬜ Remaining P1: 1.4 settings/GDPR, 1.5 partner invite, 2.5 custom tasks, 2.8 ribbon, 3.4 panel expand, 4.1 Buzz-led onboarding, 4.4 Google sign-in, 5.4 contrast, 6.3 reminders
> ⬜ Remaining P2: 2.7, 2.9, 5.3, 5.5, 6.4 (Luxe builds)

---

## 1. Dead ends & missing doors (navigation)

| # | Finding | Why it matters | Pri | Effort |
|---|---------|----------------|-----|--------|
| 1.1 | **No sign-out button anywhere.** | Testers on shared/family devices are stuck; basic trust signal. | P0 | S |
| 1.2 | **Wedding details can't be edited after onboarding.** Date, budget, guests, style are locked in forever. Change the date → whole plan wrong. The engine supports recompute; there's just no door to it. | Real couples change dates and budgets constantly. | P0 | M |
| 1.3 | **Buzz saves suppliers… into a screen that doesn't exist.** The pipeline lives in the DB but couples can't see it. "Buzz, where did you put The Ferry House?" | Breaks the promise of the flagship feature loop. | P0 | M |
| 1.4 | **No settings/account page** (email shown, GDPR export/delete, manage billing link). | Privacy policy will promise deletion; there's no button for it. | P1 | M |
| 1.5 | **Partner invite has no UI.** The DB supports members; the pitch says "plan together". | Second-biggest retention hook after Buzz — a partner is a daily reminder. | P1 | M |

## 2. The plan screen (the daily driver)

| # | Finding | Why it matters | Pri | Effort |
|---|---------|----------------|-----|--------|
| 2.1 | **No "This Week" view.** The screen leads with phases, but a couple's daily question is "what's due *now*?" A This Week card at the top (3–5 soonest/overdue tasks across all phases) becomes the reason to open the app daily. | The single highest-value addition on this list. | P0 | M |
| 2.2 | **No task detail view.** Tapping a task does nothing; guidance is squeezed inline; typical cost and the questions-to-ask-suppliers (great content!) are invisible to users — only Buzz sees them. Tap → bottom sheet: full guidance, cost, supplier questions, notes, actions. | We wrote a book and show one sentence. | P0 | M |
| 2.3 | **Can't pin/override a task's date.** Engine supports `pinned_date`; no UI. "Our tasting is on the 14th" is a basic planner move. | Belongs in the task detail sheet. | P0 | S (once 2.2 exists) |
| 2.4 | **Can't skip a task.** Not everyone wants a videographer; status `skipped` exists but there's no button. Un-skippable tasks nag forever. | Also belongs in task detail. | P0 | S |
| 2.5 | **Can't add custom tasks.** "Order kilts", "Book dog-sitter" — every wedding has them. | P1 | M |
| 2.6 | **No overdue rollup.** Overdue items hide inside their phase; a couple 3 phases in never sees old debts. A gentle "3 things need catching up →" chip near the top. | P1 | S |
| 2.7 | **No celebration when a phase completes** — the confetti burst exists per-task; a phase-complete moment (bigger burst + "Big Decisions: done! 🎉") is cheap joy. | P2 | S |
| 2.8 | **Ribbon is cramped on small phones** — 6 columns of 11px text. Consider showing icons + current label only, or horizontal scroll with the current phase enlarged. | P1 | M |
| 2.9 | **Days-to-go deserves hero treatment** — it's currently a small line. Big warm countdown = screenshot bait and emotional anchor. | P2 | S |

## 3. Buzz chat

| # | Finding | Why it matters | Pri | Effort |
|---|---------|----------------|-----|--------|
| 3.1 | **Links in Buzz's replies aren't clickable** — venues, sources, maps links all render as plain text. Couples have to copy-paste URLs. | Undermines the research feature badly. | P0 | S |
| 3.2 | **Empty state has no tappable starter prompts.** Text suggestions exist; chips ("What's due this month?" · "Find venues near us" · "How much do flowers cost?") convert far better, especially for the 10-message free tier. | P1 | S |
| 3.3 | **Quota is a surprise.** Free users discover the 10-message limit by hitting it. Show "7 of 10 left this month" subtly from message ~5, with a warm upgrade path. | Converts better than an error ever will. | P1 | S |
| 3.4 | **Panel is small for research answers.** A venue shortlist with 5 options + sources needs room; add an expand/full-screen toggle. | P1 | S |
| 3.5 | **Temporary diagnostic error messages still live** (server + client) — must revert to friendly wording before beta. | P0 | S |

## 4. First-run experience

| # | Finding | Why it matters | Pri | Effort |
|---|---------|----------------|-----|--------|
| 4.1 | **Onboarding is a form; it should be Buzz.** One question per step, conversational ("Lovely! When's the big day — or shall I plan around a rough season?"). Same fields, but it *demonstrates the product's soul* before the plan even exists. | The brand moment of the whole app. | P1 | M/L |
| 4.2 | **The plan reveal is flat.** After "Create my plan ✨" you're just… on the plan. This is the wow beat: confetti storm + "Your plan is ready — 138 tasks, perfectly timed. First up: celebrate. 🥂" | P1 | S |
| 4.3 | **"Check your email" is a dead end** — no resend button, no "wrong email?" escape, no spam-folder hint. With current rate limits this screen needs honesty ("can take a couple of minutes"). | P0 | S |
| 4.4 | **No Google sign-in** (planned). Removes the email friction entirely for most couples. | P1 | M |

## 5. Visual & brand alignment

| # | Finding | Why it matters | Pri | Effort |
|---|---------|----------------|-----|--------|
| 5.1 | **Buttons are gold; the locked brand palette says Rose `#AD5249` is the primary CTA and gold is decorative-only.** Also Teal for secondary/success. Align once, everywhere. | Brand guide exists — use it. | P1 | S |
| 5.2 | **Typography off-brand:** guide specifies Cormorant Garamond headlines + Lato body (both free on Google Fonts); app uses system fonts. Headlines in Cormorant will transform the "wedding stationery" feel instantly. | P1 | S |
| 5.3 | **Checkboxes are browser-default squares.** A custom heart-check (pastel fill on tick) is the kind of detail couples screenshot. | P2 | S |
| 5.4 | **Muted-on-cream text contrast** is borderline for WCAG AA in places (guidance meta text); nudge `--muted` darker or reserve it for larger text. | P1 | S |
| 5.5 | **Header crowding on narrow phones:** logo + title + tier badge can wrap awkwardly; install banner above makes a chrome sandwich on first open. Cap stacked chrome; collapse title to logo-only under 360px. | P2 | S |
| 5.6 | **Focus states for keyboard users** are browser-default; fine for beta, needed for accessibility pass later. | P2 | M |

## 6. Features the pitch promises that don't exist yet

| # | Finding | Pri | Effort |
|---|---------|-----|--------|
| 6.1 | **Guest list screen** (DB + RSVP model exist; free tier promises 50 guests) | P0 for launch | L |
| 6.2 | **Budget screen** (DB exists; free tier promises totals; Buzz already reads it) | P0 for launch | L |
| 6.3 | **Reminders** — email "this week" digest (the PRD's core promise; needs Resend anyway) | P1 | M |
| 6.4 | **Vision board, seating planner, day-of generator** (Sparkle/Luxe roadmap — flagged honestly in pitch) | P2 | L each |

---

## Recommended attack order

**Batch 1 — "Beta-ready" (one session):** 1.1 sign-out · 3.1 clickable links · 3.5 strip diagnostics · 4.3 resend/change-email · 2.6 overdue chip · 5.1 + 5.2 palette & fonts (the app will *look* finished in an afternoon).

**Batch 2 — "The daily driver" (one session):** 2.1 This Week card · 2.2 task detail sheet · 2.3 pin date · 2.4 skip · 1.2 edit wedding details.

**Batch 3 — "The loop closes":** 1.3 supplier screen · 3.2 starter chips · 3.3 quota meter · 4.2 plan reveal moment.

**Batch 4 — "Launch tier promises":** 6.1 guests · 6.2 budget · 1.5 partner invite · 4.1 Buzz-led onboarding · 6.3 reminders.
