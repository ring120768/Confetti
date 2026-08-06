# Wedding Planner Pro — SEO & AI-Visibility Forensic Report

**Site:** https://www.weddingplannerpro.co.uk
**Date:** 30 July 2026
**Audited:** live homepage HTML, `app/index.html`, `robots.txt`, `sitemap.xml`, site architecture
**Overall score: 52 / 100** — *Needs significant work, but the problem is concentrated (mostly one root cause + thin content), so the fixes are high-leverage.*

---

## The headline finding (read this first)

**Your website is a client-rendered single-page app, so crawlers that don't run JavaScript see a blank page.**

The live homepage HTML body is literally just:
```html
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
```
(`app/index.html:36–39`)

When I fetched the live site, I got your `<head>` (title, meta, OG, JSON-LD — all good) and **zero body content**: no headings, no feature copy, no pricing, nothing. That's exactly what a crawler sees before your React app boots.

Why it matters, split by audience:
- **Google** *can* render JavaScript on a second pass, so it will eventually index some rendered content — but it's slower, flaky, and it means every ranking signal depends on that render succeeding.
- **AI answer engines** — ChatGPT (GPTBot / OAI-SearchBot), Claude (ClaudeBot), Perplexity (PerplexityBot), Google's AI Overviews — mostly **do NOT execute JavaScript**. To them your site is a blank page with a nice title. **They cannot read what your app does, so they cannot recommend it.** For a brand called "AI wedding planner," being invisible to AI is the irony to fix first.

**Everything else in this report is secondary to getting real, readable HTML content on the page.**

---

## Scored audit

### 🔴 Critical (fix first)
- [ ] **Client-only rendering — empty HTML body.** Landing page content isn't in the served HTML. → Pre-render / statically generate the marketing pages so the full copy (headline, features, pricing, FAQ) ships in the HTML. `app/index.html:37`
- [ ] **No AI-readable content surface.** Because of the above, there is no text for LLMs to learn from or quote. No FAQ, no "how it works," no plain-English feature descriptions in the HTML.
- [ ] **Thin site — 4 URLs total** (home + privacy + terms + delete-account). Nothing targeting how couples actually search ("wedding checklist UK", "how much does a wedding cost", "wedding planner in Kent"). No content = no organic entry points.

### 🟠 Warnings (should fix)
- [ ] **Meta description too long (~230 chars).** Truncates in results at ~155–160. Tighten. `index.html:14`
- [ ] **Title 64 chars** — may truncate; front-load the keyword. `index.html:13`
- [ ] **Incomplete Twitter Card** — only `twitter:card` is set; add `twitter:title`, `twitter:description`, `twitter:image`. `index.html:22`
- [ ] **Only one schema type.** You have `SoftwareApplication` (good) but no `Organization`, no `FAQPage`, no `HowTo` — the schema types AI and rich results love.
- [ ] **No `llms.txt` / explicit AI-crawler welcome.** robots.txt allows all (good), but there's no `llms.txt` and no confirmation the AI bots are welcomed and fed clean content.
- [ ] **Sitemap is static & tiny** and won't grow as you add content pages.

### 🟡 Opportunities (growth)
- [ ] **Programmatic location/service pages** — "AI wedding planner in [town]", "wedding checklist for a [Kent] wedding". You literally have a playbook skill for this (`programmatic-seo`). Biggest scalable win.
- [ ] **Answer-style content** couples search: cost guides, timelines, "29-day notice" explainer (you already reference it — own that keyword), supplier-question lists. This is what AI cites.
- [ ] **Reviews → `aggregateRating` schema** once you have App Store / Play ratings — huge for both rich results and AI trust.
- [ ] **Authority/backlinks** — new domain with ~no authority. Get listed on wedding directories (Hitched, Bridebook, Guides for Brides) and app directories.

### 🟢 Passing (already good)
- Solid `<head>`: unique title with keyword, canonical, viewport, `lang="en-GB"`, theme-color.
- Open Graph complete (title, description, image, url, site_name, type).
- Valid `SoftwareApplication` JSON-LD with a free `offers` price.
- `robots.txt` allows crawling and points to the sitemap; sitemap valid.
- HTTPS, www canonicalisation, fast static hosting (Vercel).
- Legal pages (privacy/terms/delete) are real static HTML — ironically your *most* crawlable pages.

---

## AI visibility (GEO / AEO) — the part you specifically asked about

Getting recommended by AI assistants is a different game from ranking on Google. Priorities:

1. **Be readable without JS** (the critical fix above). Non-negotiable — nothing else in this section matters until an AI crawler can read a real sentence on your page.
2. **Answer questions in plain HTML.** LLMs surface brands that *directly answer* what a user asked. Add an FAQ ("How much does an AI wedding planner cost?", "Is Wedding Planner Pro free?", "What does Buzz do?") as real text + `FAQPage` schema.
3. **Add `Organization` schema** (name, logo, url, sameAs → your App Store, Play, social) so AI can build an entity for your brand and cite it confidently.
4. **Ship an `llms.txt`** at the domain root — a concise, plain-text summary of what the app is, who it's for, pricing, and key features. It's becoming the "robots.txt for AI."
5. **Explicitly welcome AI crawlers** in robots.txt (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended) — confirm none are blocked.
6. **Consistency across surfaces.** AI triangulates from your site + App Store + Play + directories. Keep the description, features and name identical everywhere so the model gets one clear story.
7. **Get mentioned elsewhere.** AI leans on third-party sources — a few wedding-blog features / directory listings do more for AI recommendation than on-site tweaks.

---

## Prioritised action plan

### NOW (this week) — unblock discoverability
1. **Pre-render the marketing page(s)** so full content ships in HTML. Options, simplest first:
   - Quickest: add a **static, content-rich landing** (real headings, feature copy, FAQ) served as HTML — even a hand-built `index`-style page separate from the React app.
   - Cleaner: add a prerender step (e.g. `vite-plugin-ssr`/prerender, or move the marketing site to Next.js) so the SPA app stays but the public pages are static HTML.
2. **Tighten meta description** to ~155 chars; front-load the title.
3. **Add `Organization` + `FAQPage` JSON-LD** and complete the Twitter Card tags.
4. **Add `llms.txt`** and confirm AI crawlers are allowed.
5. **Verify Google Search Console + Bing Webmaster Tools**, submit the sitemap. (You can't improve what you can't see — this is how you'll measure everything below.)

### NEXT (2–4 weeks) — build entry points
6. **Publish 5–10 answer articles** couples actually search: UK wedding cost guide, 12-month checklist, the 29-day legal notice explainer, "questions to ask your venue", "day-of running order template". Each = real HTML + `Article`/`HowTo`/`FAQ` schema + internal links to the app.
7. **Stand up programmatic location pages** using your `programmatic-seo` playbook ("wedding planning in [town/county]"), with a thin-content guard so they're genuinely useful.
8. **List on wedding + app directories** for early backlinks and referral traffic.

### LATER (ongoing) — authority & monitoring
9. **Add `aggregateRating`** once you have store reviews.
10. **Content cadence** — one useful article a week beats a big one-off.
11. **Track AI visibility** — periodically ask ChatGPT/Claude/Perplexity "best AI wedding planner app UK" and log whether you're mentioned; watch Search Console for impressions/queries.

---

## Bottom line
Your **head/metadata is genuinely good** — you're not starting from zero. But the site currently **shows crawlers an empty page**, which caps both Google and (especially) AI visibility. Fix the rendering so real content is in the HTML, add a little answer-style content + `Organization`/`FAQ` schema, and you'll go from "invisible to AI" to "citable" fast. The programmatic location pages are then your scalable growth engine.

*Monitoring note: everything here can be tracked over time — Google Search Console (free) for search, and a periodic manual AI-mention check for GEO. Tools like SearchFit.ai automate both if you want it hands-off later.*
