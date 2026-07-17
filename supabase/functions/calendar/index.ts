// Live calendar feed: serves a wedding's dated tasks as an ICS subscription.
// Authenticated by the secret ics_token in the URL — no login, calendar apps
// poll it periodically so the feed stays in sync with the plan.
// Deploy with: supabase functions deploy calendar --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const esc = (s: string) =>
  (s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const dstamp = (iso: string) => iso.slice(0, 10).replace(/-/g, "");

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return new Response("Not found", { status: 404 });

  const { data: wedding } = await admin.from("weddings")
    .select("id, wedding_date").eq("ics_token", token).maybeSingle();
  if (!wedding) return new Response("Not found", { status: 404 });

  const { data: tasks } = await admin.from("tasks")
    .select("id,title,status,pinned_date,computed_date,notes")
    .eq("wedding_id", wedding.id);

  const events: string[] = [];

  if (wedding.wedding_date) {
    events.push([
      "BEGIN:VEVENT",
      `UID:wedding-${wedding.id}@weddingplannerpro.co.uk`,
      `DTSTART;VALUE=DATE:${dstamp(wedding.wedding_date)}`,
      "SUMMARY:💍 THE BIG DAY!",
      "END:VEVENT",
    ].join("\r\n"));
  }

  for (const t of tasks ?? []) {
    if (t.status === "done" || t.status === "skipped") continue;
    const due = t.pinned_date || t.computed_date;
    if (!due) continue;
    events.push([
      "BEGIN:VEVENT",
      `UID:task-${t.id}@weddingplannerpro.co.uk`,
      `DTSTART;VALUE=DATE:${dstamp(due)}`,
      `SUMMARY:💐 ${esc(t.title)}`,
      t.notes ? `DESCRIPTION:${esc(t.notes)}` : "",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n"));
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding Planner Pro//Plan Feed//EN",
    "X-WR-CALNAME:Our Wedding Plan 💍",
    "X-PUBLISHED-TTL:PT6H",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "max-age=600",
    },
  });
});
