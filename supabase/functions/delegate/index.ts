// Public delegate page backend — the helper's side of the loop. No login.
// GET  ?t=token          -> load the task (marks it "viewed")
// POST {t, action, note} -> action "done" | "decline"; flips the task, emails the couple
//
// Authenticated only by the secret token in the URL/body, via the service role.
// Secrets: RESEND_API_KEY (to notify the couple on completion).
// Deploy with: supabase functions deploy delegate --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const FROM = "Buzz at Wedding Planner Pro <help@weddingplannerpro.co.uk>";
const SITE = "https://www.weddingplannerpro.co.uk";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const isToken = (t: string) => /^[0-9a-f-]{36}$/i.test(t || "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (req.method === "GET") {
      const token = new URL(req.url).searchParams.get("t") || "";
      if (!isToken(token)) return json({ error: "not_found" }, 404);
      const del = await loadByToken(token);
      if (!del) return json({ error: "not_found" }, 404);

      if (del.status === "sent") {
        await admin.from("task_delegations")
          .update({ status: "viewed", viewed_at: new Date().toISOString() })
          .eq("id", del.id);
        del.status = "viewed";
      }
      return json(await presentable(del), 200);
    }

    if (req.method === "POST") {
      const { t, action, note } = await req.json();
      if (!isToken(t)) return json({ error: "not_found" }, 404);
      const del = await loadByToken(t);
      if (!del) return json({ error: "not_found" }, 404);
      if (del.status === "done" || del.status === "declined") {
        return json({ ok: true, status: del.status, already: true }, 200);
      }
      if (action !== "done" && action !== "decline") return json({ error: "bad_action" }, 400);

      const status = action === "done" ? "done" : "declined";
      await admin.from("task_delegations").update({
        status,
        reply_note: (note || "").trim() || null,
        completed_at: new Date().toISOString(),
      }).eq("id", del.id);

      // Close the loop in the couple's plan.
      if (status === "done") {
        await admin.from("tasks").update({ status: "done", updated_at: new Date().toISOString() })
          .eq("id", del.task_id);
      }

      // Tell the couple.
      await notifyCouple(del, status, (note || "").trim());
      return json({ ok: true, status }, 200);
    }

    return json({ error: "method" }, 405);
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
});

async function loadByToken(token: string) {
  const { data } = await admin.from("task_delegations")
    .select("id,task_id,wedding_id,delegate_name,message,status,created_by")
    .eq("token", token).maybeSingle();
  return data;
}

// Build the safe, public-facing view of a delegation (task title + guidance + date).
async function presentable(del: any) {
  const { data: task } = await admin.from("tasks")
    .select("title,library_id,pinned_date,computed_date").eq("id", del.task_id).maybeSingle();
  let guidance = "";
  if (task?.library_id) {
    const { data: lib } = await admin.from("task_library").select("guidance").eq("id", task.library_id).maybeSingle();
    guidance = lib?.guidance || "";
  }
  const { data: wedding } = await admin.from("weddings").select("wedding_date").eq("id", del.wedding_id).maybeSingle();
  const due = task?.pinned_date || task?.computed_date || null;
  return {
    status: del.status,
    delegate_name: del.delegate_name,
    task_title: task?.title || "A wedding task",
    guidance,
    message: del.message || "",
    due,
    wedding_date: wedding?.wedding_date || null,
  };
}

async function notifyCouple(del: any, status: "done" | "declined", note: string) {
  if (!del.created_by) return;
  const { data: u } = await admin.auth.admin.getUserById(del.created_by);
  const to = u?.user?.email;
  if (!to) return;

  const { data: task } = await admin.from("tasks").select("title").eq("id", del.task_id).maybeSingle();
  const title = task?.title || "a task";
  const done = status === "done";
  const subject = done
    ? `${del.delegate_name} finished “${title}” ✅`
    : `${del.delegate_name} can't take on “${title}”`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#2b2b2b">
    <p style="font-size:18px">${done ? "Good news! 🎉" : "Just so you know…"}</p>
    <p><strong>${esc(del.delegate_name)}</strong> ${done
      ? `has marked <strong>${esc(title)}</strong> as done.`
      : `has passed on <strong>${esc(title)}</strong> for now.`}</p>
    ${note ? `<div style="background:#faf6f0;border-radius:14px;padding:16px 18px;margin:16px 0"><p style="margin:0"><em>“${esc(note)}”</em></p></div>` : ""}
    ${done ? `<p>It's ticked off in your plan. One less thing! 💛</p>` : `<p>No stress — you can delegate it to someone else or pick it back up anytime.</p>`}
    <p style="text-align:center;margin:24px 0">
      <a href="${SITE}" style="background:#c9526a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;display:inline-block">Open your plan</a>
    </p>
    <p style="font-size:13px;color:#aaa">Wedding Planner Pro · weddingplannerpro.co.uk</p>
  </div>`;
  await sendEmail(to, subject, html);
}

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

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}
