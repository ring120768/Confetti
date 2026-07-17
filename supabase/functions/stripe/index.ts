// Stripe checkout + billing portal.
// Secrets required: STRIPE_SECRET_KEY
//
// Prices are found by LOOKUP KEY, so create your Stripe prices with these
// lookup keys and no IDs ever need pasting into code:
//   sparkle_monthly  £8.99/mo   sparkle_annual  £59/yr
//   luxe_monthly     £18.99/mo  luxe_annual     £129/yr

import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const PLANS = ["sparkle_monthly", "sparkle_annual", "luxe_monthly", "luxe_annual"];
const SITE = "https://www.weddingplannerpro.co.uk";

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

    const { data: wedding } = await supabase.from("weddings").select("couple_id").maybeSingle();
    if (!wedding) return json({ error: "No wedding found" }, 404, cors);

    // service-role client for reading/writing subscriptions (RLS: users read-only)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: sub } = await admin.from("subscriptions").select("*")
      .eq("couple_id", wedding.couple_id).maybeSingle();

    // find or create the Stripe customer for this couple
    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { couple_id: wedding.couple_id },
      });
      customerId = customer.id;
      await admin.from("subscriptions").upsert(
        { couple_id: wedding.couple_id, stripe_customer_id: customerId, tier: "free" },
        { onConflict: "couple_id" },
      );
    }

    const { action, plan } = await req.json();

    if (action === "portal") {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: SITE,
      });
      return json({ url: session.url }, 200, cors);
    }

    // default: checkout
    if (!PLANS.includes(plan)) return json({ error: "Unknown plan" }, 400, cors);
    const prices = await stripe.prices.list({ lookup_keys: [plan], limit: 1 });
    const price = prices.data[0];
    if (!price) return json({ error: `Price ${plan} not set up in Stripe yet` }, 500, cors);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { couple_id: wedding.couple_id },
        trial_period_days: 7, // card up front, first charge after a week
      },
      metadata: { couple_id: wedding.couple_id },
      success_url: `${SITE}/?checkout=success`,
      cancel_url: `${SITE}/?checkout=cancelled`,
    });
    return json({ url: session.url }, 200, cors);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong" }, 500, cors);
  }
});

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
