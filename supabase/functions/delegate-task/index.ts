// Delegate a task — creates a delegation and emails the helper a secure link.
// Authenticated: runs under the caller's RLS, so they can only delegate their
// own wedding's tasks.
//
// Secrets required (Dashboard -> Edge Functions -> Secrets):
//   RESEND_API_KEY = re_...   (help@weddingplannerpro.co.uk sending domain)
// Deploy with: supabase functions deploy delegate-task

import { createClient } from "npm:@supabase/supabase-js@2";

const FREE_TASTER = 2;                       // free plan: 2 delegations to try it
const SITE = "https://www.weddingplannerpro.co.uk";
const FROM = "Buzz at Wedding Planner Pro <help@weddingplannerpro.co.uk>";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401, cors);

    const { task_id, delegate_name, delegate_email, message } = await req.json();
    const name = (delegate_name || "").trim();
    const email = (delegate_email || "").trim();
    if (!task_id || !name) return json({ error: "Name and task are required" }, 400, cors);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "That email doesn't look right" }, 400, cors);

    // Wedding + tier (RLS guarantees this is the caller's own wedding).
    const { data: wedding } = await supabase.from("weddings").select("id,couple_id,wedding_date").maybeSingle();
    if (!wedding) return json({ error: "No wedding found" }, 404, cors);

    const { data: sub } = await supabase.from("subscriptions").select("tier")
      .eq("couple_id", wedding.couple_id).maybeSingle();
    const tier = sub?.tier ?? "free";

    // Free taster cap.
    if (tier === "free") {
      const { count } = await supabase.from("task_delegations")
        .select("*", { count: "exact", head: true }).eq("wedding_id", wedding.id);
      if ((count ?? 0) >= FREE_TASTER) {
        return json({
          error: "quota",
          detail: `Your free plan includes ${FREE_TASTER} delegations to try. Sparkle unlocks unlimited helpers — with a 7-day free trial.`,
        }, 429, cors);
      }
    }

    // The task must belong to this wedding.
    const { data: task } = await supabase.from("tasks")
      .select("id,title,library_id,pinned_date,computed_date")
      .eq("id", task_id).eq("wedding_id", wedding.id).maybeSingle();
    if (!task) return json({ error: "Task not found" }, 404, cors);

    const token = crypto.randomUUID();
    const { data: del, error: insErr } = await supabase.from("task_delegations").insert({
      task_id: task.id,
      wedding_id: wedding.id,
      delegate_name: name,
      delegate_email: email,
      message: (message || "").trim() || null,
      token,
      created_by: user.id,
    }).select("id,delegate_name,delegate_email,status,created_at").single();
    if (insErr) { console.error(insErr); return json({ error: "Could not save the delegation" }, 500, cors); }

    // Guidance to help the helper actually do the task.
    let guidance = "";
    if (task.library_id) {
      const { data: lib } = await supabase.from("task_library").select("guidance").eq("id", task.library_id).maybeSingle();
      guidance = lib?.guidance || "";
    }
    const link = `${SITE}/delegate.html?t=${token}`;
    const fromWho = user.email ? user.email.split("@")[0] : "A couple";

    await sendEmail(email, `${name}, can you help with a wedding task? 💍`, helperHtml({
      name, fromWho, taskTitle: task.title, guidance, message: (message || "").trim(), link,
    }));

    return json({ ok: true, delegation: del }, 200, cors);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong" }, 500, cors);
  }
});

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { console.error("RESEND_API_KEY not set — email not sent"); return; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!r.ok) console.error("Resend error", r.status, await r.text());
}

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function helperHtml(o: { name: string; fromWho: string; taskTitle: string; guidance: string; message: string; link: string }) {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#2b2b2b">
    <p style="font-size:18px">Hi ${esc(o.name)},</p>
    <p><strong>${esc(o.fromWho)}</strong> is planning their wedding with Wedding Planner Pro and would love your help with one thing:</p>
    <div style="background:#faf6f0;border-radius:14px;padding:18px 20px;margin:18px 0">
      <p style="margin:0;font-size:17px"><strong>${esc(o.taskTitle)}</strong></p>
      ${o.guidance ? `<p style="margin:10px 0 0;font-size:14px;color:#555">${esc(o.guidance)}</p>` : ""}
      ${o.message ? `<p style="margin:12px 0 0;font-size:14px"><em>“${esc(o.message)}”</em></p>` : ""}
    </div>
    <p style="text-align:center;margin:26px 0">
      <a href="${o.link}" style="background:#c9526a;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:600;display:inline-block">Open the task &amp; mark it done</a>
    </p>
    <p style="font-size:13px;color:#888">No sign-up needed — the link opens a simple page where you can mark it done and leave a note. It's private to you.</p>
    <p style="font-size:13px;color:#aaa">Wedding Planner Pro · weddingplannerpro.co.uk</p>
  </div>`;
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}
