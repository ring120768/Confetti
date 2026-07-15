// Stripe webhook -> subscriptions table.
// Deploy with:  supabase functions deploy stripe-webhook --no-verify-jwt
// (Stripe calls this directly; it authenticates via signature, not JWT.)
// Secrets required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// lookup_key prefix -> tier
const tierFromLookup = (key: string | null | undefined) =>
  key?.startsWith("luxe") ? "luxe" : key?.startsWith("sparkle") ? "sparkle" : "free";

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("Bad signature", err);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const coupleId = sub.metadata?.couple_id;
        if (!coupleId) { console.error("No couple_id on subscription", sub.id); break; }
        const item = sub.items.data[0];
        const tier = sub.status === "active" || sub.status === "trialing"
          ? tierFromLookup(item?.price?.lookup_key)
          : "free";
        await admin.from("subscriptions").upsert({
          couple_id: coupleId,
          tier,
          status: sub.status,
          stripe_customer_id: String(sub.customer),
          stripe_subscription_id: sub.id,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }, { onConflict: "couple_id" });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const coupleId = sub.metadata?.couple_id;
        if (!coupleId) break;
        await admin.from("subscriptions").update({
          tier: "free",
          status: "canceled",
          stripe_subscription_id: null,
          current_period_end: null,
        }).eq("couple_id", coupleId);
        break;
      }
      default:
        // ignore everything else
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response("Handler error", { status: 500 });
  }
});
