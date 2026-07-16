// Buzz — Confetti's AI wedding planner.
// Edge function: authenticates the user, loads their wedding context,
// enforces the monthly message quota, calls Claude, logs both sides.
//
// Secrets required (Dashboard -> Edge Functions -> Secrets):
//   ANTHROPIC_API_KEY = sk-ant-...

import { createClient } from "npm:@supabase/supabase-js@2";

const TIER_QUOTA: Record<string, number> = { free: 10, sparkle: 200, luxe: 100000 };
const MODEL = "claude-haiku-4-5-20251001";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // Client with the caller's JWT: all queries run under THEIR RLS.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401, cors);

    const { message } = await req.json();
    if (!message || message.length > 2000) return json({ error: "Message missing or too long" }, 400, cors);

    // ---- context: wedding, tier, quota ----
    const { data: wedding } = await supabase.from("weddings").select("*").maybeSingle();
    if (!wedding) return json({ error: "No wedding found" }, 404, cors);

    const { data: sub } = await supabase.from("subscriptions").select("tier")
      .eq("couple_id", wedding.couple_id).maybeSingle();
    const tier = sub?.tier ?? "free";
    const quota = TIER_QUOTA[tier];

    const monthStart = new Date();
    monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
    const { count: used } = await supabase.from("ai_messages")
      .select("*", { count: "exact", head: true })
      .eq("wedding_id", wedding.id).eq("role", "user")
      .gte("created_at", monthStart.toISOString());
    if ((used ?? 0) >= quota) {
      return json({ error: "quota", detail: `You've used all ${quota} Buzz messages this month.` }, 429, cors);
    }

    // ---- context: task status summary ----
    const { data: tasks } = await supabase.from("tasks")
      .select("title,status,computed_date,pinned_date").eq("wedding_id", wedding.id);
    const today = new Date().toISOString().slice(0, 10);
    const due = (t: any) => t.pinned_date || t.computed_date || "";
    const open = (tasks ?? []).filter(t => t.status === "todo" || t.status === "in_progress");
    const overdue = open.filter(t => due(t) && due(t) < today);
    const next = open.filter(t => due(t) >= today).sort((a, b) => due(a) < due(b) ? -1 : 1).slice(0, 10);

    // ---- context: suppliers, guests, budget (grows as the couple adds data) ----
    const { data: suppliers } = await supabase.from("suppliers")
      .select("category,name,stage,quote_amount").eq("wedding_id", wedding.id).limit(30);
    const { count: guestTotal } = await supabase.from("guests")
      .select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id);
    const { count: guestYes } = await supabase.from("guests")
      .select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id).eq("rsvp_status", "yes");
    const { data: budgetItems } = await supabase.from("budget_items")
      .select("category,estimated,quoted,paid").eq("wedding_id", wedding.id).limit(50);

    const supplierLines = (suppliers ?? []).map(s =>
      `${s.category}: ${s.name} (${s.stage}${s.quote_amount ? `, quoted £${s.quote_amount}` : ""})`).join("; ");
    const budgetSpent = (budgetItems ?? []).reduce((a, b) => a + Number(b.paid ?? 0), 0);
    const budgetCommitted = (budgetItems ?? []).reduce((a, b) => a + Number(b.quoted ?? b.estimated ?? 0), 0);

    // ---- recent conversation (short memory) ----
    const { data: history } = await supabase.from("ai_messages")
      .select("role,content").eq("wedding_id", wedding.id)
      .order("created_at", { ascending: false }).limit(10);

    const system = `You are Buzz, the friendly AI wedding planner inside the Wedding Planner Pro app (UK).
You are warm, practical and concise — like the best human wedding planner. Use British English and £.

THE COUPLE'S WEDDING:
- Date: ${wedding.wedding_date ?? "not set yet"}
- Type: ${wedding.wedding_type === "destination" ? "abroad (destination wedding)" : "in the UK"}
- Budget: ${wedding.budget_total ? "£" + wedding.budget_total : "not set"}
- Guests: ${wedding.guest_estimate ?? "not set"}
- Style: ${wedding.style ?? "not set"}

PLAN STATUS: ${open.length} tasks open, ${overdue.length} overdue.
${overdue.length ? "Overdue: " + overdue.slice(0, 5).map(t => t.title).join("; ") : ""}
Next up: ${next.map(t => `${t.title} (due ${due(t)})`).join("; ") || "nothing scheduled"}

SUPPLIERS: ${supplierLines || "none saved yet"}
GUESTS: ${guestTotal ? `${guestTotal} on the list, ${guestYes ?? 0} confirmed yes` : "no guest list yet"}
BUDGET TRACKING: ${budgetItems?.length ? `£${budgetSpent} paid, ~£${budgetCommitted} committed across ${budgetItems.length} items` : "no budget items logged yet"}

Use everything above to personalise your answers — reference their actual venue, suppliers,
numbers and progress by name when relevant. If key facts are missing (no date, no budget,
no area), gently gather them in conversation: one natural question at a time, never a form.
The more they tell you, the better you plan — act like it.

RULES:
- Ground advice in their actual plan above. Nudge gently on overdue items when relevant.
- UK costs/customs unless it's a destination wedding.
- Never present legal or contractual advice as authoritative — suggest they verify (GOV.UK, solicitor).
- RESEARCH: when asked to find venues or suppliers near a location, use find_places first
  (true radius search with Google ratings, distance, phone and website), then web_search to
  add wedding-specific reviews, pricing and context for your shortlist. Only recommend places
  you actually found via these tools, include name + website + distance where known, and
  remind them to check availability and prices directly. If they haven't given an area, ask.
- QUALITY BAR: when researching, check customer ratings where available (Google reviews,
  Hitched, Bridebook, TripAdvisor). Your first-round shortlist (3-5 options) should favour
  places rated 4/5 (or 8/10) and above — state the rating and where it's from next to each
  suggestion. If a strong candidate has no findable rating, you may include it but say so.
  Only offer lower-rated options if the couple asks for cheaper alternatives, and be honest
  about the trade-off. Never state a rating you didn't actually find.
- TAKING ACTION: when the couple shows real interest in a specific venue or supplier
  ("we love the look of X"), offer two things: to save it to their supplier list (use the
  save_supplier tool) and to draft an availability enquiry email they can send themselves.
- CONTACT DETAILS: before saving a supplier or drafting an enquiry, use web search to find
  their official contact details — email and phone from their OWN website (contact page),
  not from directories. Include what you find in save_supplier and in the draft's To: line.
  Never guess or construct an email address: if you can't find one, leave it blank, give the
  couple the website's contact-page link and say that's the way in.
- EMAIL DRAFTS: write enquiry drafts inside a fenced code block starting \`\`\`email with
  "To:" (the supplier's email if you found one, otherwise leave blank) and "Subject:" lines,
  then the body. Include: their wedding date (or target season), guest numbers, and 2-3 sharp
  questions (availability, package pricing, what's included). Sign off with the couple's
  names if known, otherwise leave a placeholder. Ask before drafting if key facts are missing.
  The couple sends it from their own email — never claim you have sent anything.
- Never invent suppliers, prices or availability from memory. Typical price ranges are fine.
- Keep replies under 200 words unless asked for detail; venue research replies may run longer.`;

    const messages: any[] = (history ?? []).reverse().map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: "user", content: message });

    const tools = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3,
        user_location: { type: "approximate", country: "GB" },
      },
      {
        name: "find_places",
        description: "Search real venues/suppliers near a UK location using Google Places. Returns names, addresses, Google ratings with review counts, phone, website, and distance. Use for any 'near X' or 'within N miles' request; combine with web_search for wedding-specific reviews and pricing context.",
        input_schema: {
          type: "object",
          properties: {
            query: { type: "string", description: "what to find, e.g. 'barn wedding venue', 'wedding photographer'" },
            near: { type: "string", description: "UK postcode or place name, e.g. 'ME15 6XX' or 'Canterbury'" },
            radius_miles: { type: "number", description: "search radius in miles (default 25, max 50)" },
          },
          required: ["query", "near"],
        },
      },
      {
        name: "save_supplier",
        description: "Save a venue or supplier the couple is interested in to their supplier pipeline. Use when they express real interest in a specific place, after confirming with them.",
        input_schema: {
          type: "object",
          properties: {
            category: { type: "string", description: "e.g. venue, photography, catering, flowers, music" },
            name: { type: "string" },
            contact_email: { type: "string" },
            phone: { type: "string" },
            notes: { type: "string", description: "website, rating, rough price, why they liked it" },
          },
          required: ["category", "name"],
        },
      },
    ];

    // ---- call Claude, executing tools until she's done (max 4 rounds) ----
    let data: any;
    for (let round = 0; round < 4; round++) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: MODEL, max_tokens: 1200, system, messages, tools }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Anthropic error", resp.status, errText);
        // TEMP DIAGNOSTIC: surface the real reason in the chat bubble
        return json({ error: `Buzz API error ${resp.status}: ${errText.slice(0, 200)}` }, 502, cors);
      }
      data = await resp.json();
      if (data.stop_reason !== "tool_use") break;

      // execute each client tool call, feed results back
      messages.push({ role: "assistant", content: data.content });
      const results: any[] = [];
      for (const block of data.content) {
        if (block.type !== "tool_use") continue;
        let result = "ok";
        if (block.name === "find_places") {
          result = await findPlaces(block.input.query, block.input.near, block.input.radius_miles);
        } else if (block.name === "save_supplier") {
          const { error: insErr } = await supabase.from("suppliers").insert({
            wedding_id: wedding.id,
            category: block.input.category ?? "venue",
            name: block.input.name,
            contact_email: block.input.contact_email ?? null,
            phone: block.input.phone ?? null,
            notes: block.input.notes ?? null,
            stage: "researching",
          });
          result = insErr ? `failed: ${insErr.message}` : `saved ${block.input.name} to their supplier list`;
        } else {
          result = "unknown tool";
        }
        results.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
      messages.push({ role: "user", content: results });
    }
    // With web search the response is a sequence of blocks; gather all text
    // and collect any cited URLs so couples can click through.
    const textBlocks = (data.content ?? []).filter((b: any) => b.type === "text");
    let reply = textBlocks.map((b: any) => b.text).join("") ||
      "Sorry, I lost my train of thought — ask me again?";
    const sources = new Map<string, string>();
    for (const b of textBlocks) {
      for (const c of b.citations ?? []) {
        if (c.url && !sources.has(c.url)) sources.set(c.url, c.title || c.url);
      }
    }
    if (sources.size) {
      reply += "\n\nSources:\n" +
        [...sources].slice(0, 5).map(([url, title]) => `• ${title} — ${url}`).join("\n");
    }
    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    // ---- log both sides (user's RLS allows inserts to their own wedding) ----
    await supabase.from("ai_messages").insert([
      { wedding_id: wedding.id, user_id: user.id, role: "user", content: message },
      { wedding_id: wedding.id, user_id: user.id, role: "assistant", content: reply, tokens },
    ]);

    return json({ reply, used: (used ?? 0) + 1, quota }, 200, cors);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong" }, 500, cors);
  }
});

// Google Places search: postcode -> coordinates (postcodes.io, free) -> Places Text Search.
// Returns a compact JSON string for Buzz, or a fallback notice if not configured.
async function findPlaces(query: string, near: string, radiusMiles = 25): Promise<string> {
  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) return "find_places is not configured — use web_search instead.";
  try {
    // geocode: UK postcode via postcodes.io, otherwise let Places bias by text
    let lat: number | null = null, lng: number | null = null;
    const postcode = near.trim().match(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i);
    if (postcode) {
      const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(near.trim())}`);
      if (r.ok) {
        const g = await r.json();
        lat = g.result?.latitude; lng = g.result?.longitude;
      }
    }
    const radiusM = Math.min(Math.max(radiusMiles, 1), 50) * 1609;

    const body: any = { textQuery: lat ? query : `${query} near ${near}`, maxResultCount: 10 };
    if (lat && lng) body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: Math.min(radiusM, 50000) } };

    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.location",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.error("Places error", resp.status, await resp.text());
      return "Places search failed — use web_search instead.";
    }
    const data = await resp.json();
    const places = (data.places ?? []).map((p: any) => {
      const distMiles = (lat && lng && p.location)
        ? Math.round(haversineMiles(lat, lng, p.location.latitude, p.location.longitude) * 10) / 10
        : null;
      return {
        name: p.displayName?.text,
        address: p.formattedAddress,
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? 0,
        phone: p.nationalPhoneNumber ?? null,
        website: p.websiteUri ?? null,
        maps_link: p.googleMapsUri ?? null,
        distance_miles: distMiles,
      };
    }).filter((p: any) => p.distance_miles === null || p.distance_miles <= radiusMiles);
    return JSON.stringify({ results: places, note: "Ratings are Google ratings. Cross-check wedding-specific reviews via web_search before recommending." });
  } catch (e) {
    console.error("findPlaces failed", e);
    return "Places search failed — use web_search instead.";
  }
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8, toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
