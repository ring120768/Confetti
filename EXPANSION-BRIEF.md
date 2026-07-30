# Wedding Planner Pro — Expansion Brief

Three additions on the table, in plain terms + what each really costs to build. Written to decide **build order**, not to build yet.

1. **On-the-Day Running Order** — one editable schedule auto-collated from what's already in the app.
2. **Find a Wedding Planner** — search real planners, so the app runs alongside a human one.
3. **Organiser edition** — a planner-facing (B2B) version for the wedding planners themselves.

---

## What the app already gives us to build on
- Data: couples → one wedding → tasks, **guests**, **suppliers** (with phone/email), budget, **task_delegations**. RLS is built around *one couple = one wedding*.
- **Buzz** already has hands: web search + `find_places` (real local suppliers with ratings/contacts) + `save_supplier` + email drafts.
- **Delegate plumbing** already sends secure email links to non-users and gets replies back — that's reusable for "share the running order with suppliers / the bridal party."
- Stripe tiers (Free / Sparkle / Luxe) + gating patterns.

---

## 1. On-the-Day Running Order  ·  *couple-facing · Luxe*
**What it is:** a minute-by-minute schedule for the day (hair & makeup → ceremony → photos → wedding breakfast → speeches → first dance), plus a **supplier arrival & contacts sheet** and a **point person** so vendors ring the best man, not the bride.

**How it collates from existing sections:** Buzz drafts it from data you already hold — ceremony time, venue, guest headcount, and the booked **suppliers** — then you edit. Arrival times sit on each supplier; the contacts sheet writes itself from supplier phone/email.

**Needs building:**
- Capture a couple of key times (ceremony start, venue access) — a small addition to the wedding record.
- New `schedule_items` table (wedding_id, time, title, who, note, category) — editable list.
- An `arrival_time` field on suppliers.
- New **"On the Day"** screen (timeline UI, reorder, edit).
- A Buzz tool: *"build my running order"* → drafts the schedule from their data.
- **Share/export:** reuse the delegate email flow to send it to suppliers & wedding party; optional PDF and calendar (ICS) export (you already have an ICS feed).

**Effort:** medium. **Value:** highest — this is the "coordinator" couples pay planners most for, and a clean reason to upgrade to Luxe. **→ Build first.**

## 2. Find a Wedding Planner  ·  *couple-facing · Free or lead-gen later*
**What it is:** a way to find and shortlist real wedding planners near the couple.

**The shortcut:** Buzz can already do this today via `find_places` — "find wedding planners near ME15" returns real businesses with ratings and contacts. So v1 is a **dedicated entry point** ("Find a planner") that runs that existing search and saves results to the supplier pipeline. Almost no new plumbing.

**Later upside:** this becomes a **referral / lead-gen channel** — planners pay to be featured, or you take a referral fee. That's a real revenue line, but only once you have couple volume. Keep v1 simple; note the monetisation for later.

**Effort:** low (reuses `find_places`). **Value:** medium now, high later. **→ Quick win, build second.**

## 3. Organiser Edition (for wedding planners)  ·  *B2B · new pricing*
**What it is:** a planner manages **many** weddings/clients from one account — a client dashboard, per-wedding access, and a plan they run on the couple's behalf.

**Why it's the big one:** the whole app currently assumes *one user = one wedding* (even the code loads "your wedding" with `limit(1)`, and RLS is couple-membership based). A planner needs **one account → many weddings**, with the couple's consent. That means:
- A **planner** concept and a **planner ↔ client (wedding)** link.
- **RLS changes** so a planner can see their clients' data (invited in, revocable).
- A **multi-client dashboard** (new UI).
- A **B2B Stripe plan** (per-seat or per-active-wedding, priced well above consumer).
- Ties directly to the planned **Phase 2 "invite a co-planner"** — that invite mechanism is the seed of "invite your planner."

**Effort:** high (new audience, data model, pricing, UI). **Value:** potentially your biggest revenue line, but unproven. **→ Validate demand with a few real planners first; build last, as its own project.**

---

## Recommended order
| Phase | Feature | Effort | Why now / later |
|------|---------|--------|-----------------|
| **A (now)** | On-the-Day Running Order (Luxe) | Medium | Highest couple value, reuses your data + Buzz + delegate share, strong upgrade driver |
| **B (next)** | Find a Planner entry point | Low | Reuses `find_places`; tiny build; opens a future referral revenue line |
| **C (later)** | Organiser B2B edition | High | New audience + data model + pricing; validate with real planners before committing |

## Do we need to "review architecture/UI/UX" first?
- **For A and B: no big review needed** — they fit the current model and reuse existing plumbing. We can start A now.
- **For C: yes** — the one-couple-one-wedding assumption in the data model and RLS is the thing that has to change, so C gets its own design pass before any code.

## My recommendation
Ship **A (the running order)** now — it's the missing "coordinator" piece you flagged and the clearest Luxe value. Add **B** as a fast follow. Treat **C** as a separate venture: I'd talk to two or three real wedding planners about what they'd actually pay for before we build it, so we design the right thing.
