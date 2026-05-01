// Razorpay webhook - handles subscription lifecycle events.
// Verifies the webhook signature using RAZORPAY_WEBHOOK_SECRET and updates
// the user's plan in profiles.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-razorpay-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function tierFromNotes(notes: any, planAmount?: number): "basic" | "pro" | null {
  if (notes?.tier === "basic" || notes?.tier === "pro") return notes.tier;
  // Fallback by amount
  if (planAmount === 4900) return "basic";
  if (planAmount === 9900) return "pro";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!SECRET) {
      return new Response(JSON.stringify({ error: "Webhook secret not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signature = req.headers.get("x-razorpay-signature");
    const rawBody = await req.text();
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const expected = await hmacSha256Hex(SECRET, rawBody);
    if (expected !== signature) {
      console.warn("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const eventType: string = event?.event ?? "";
    const sub = event?.payload?.subscription?.entity;
    const payment = event?.payload?.payment?.entity;
    const subscriptionId: string | undefined = sub?.id ?? payment?.subscription_id;

    console.log("Webhook event:", eventType, "subscription:", subscriptionId);

    if (!subscriptionId) {
      // Event without a subscription context (e.g., one-off payment) - acknowledge.
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Find the user by subscription id, or by notes.user_id as fallback.
    let userId: string | null = null;
    {
      const { data } = await admin
        .from("profiles")
        .select("user_id")
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      userId = data?.user_id ?? null;
    }
    if (!userId && sub?.notes?.user_id) userId = sub.notes.user_id;

    if (!userId) {
      console.warn("No user found for subscription", subscriptionId);
      return new Response(JSON.stringify({ ok: true, no_user: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tier = tierFromNotes(sub?.notes, sub?.plan?.item?.amount);

    const updates: Record<string, unknown> = {
      razorpay_subscription_id: subscriptionId,
    };

    switch (eventType) {
      case "subscription.activated":
      case "subscription.charged":
      case "subscription.resumed": {
        if (tier) updates.plan = tier;
        updates.subscription_status = "active";
        if (sub?.current_end) {
          updates.current_period_end = new Date(sub.current_end * 1000).toISOString();
        }
        // Reset monthly scan counter on each renewal/charge
        updates.scans_used_month = 0;
        updates.scan_period_start = new Date().toISOString();
        break;
      }
      case "subscription.authenticated":
      case "subscription.pending": {
        updates.subscription_status = "pending";
        break;
      }
      case "subscription.halted":
      case "subscription.paused": {
        updates.subscription_status = "halted";
        break;
      }
      case "subscription.cancelled":
      case "subscription.completed": {
        updates.subscription_status = "cancelled";
        updates.plan = "free";
        break;
      }
      default:
        console.log("Unhandled event:", eventType);
        return new Response(JSON.stringify({ ok: true, unhandled: eventType }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const { error: updErr } = await admin
      .from("profiles")
      .update(updates)
      .eq("user_id", userId);
    if (updErr) {
      console.error("Profile update failed", updErr);
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webhook error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
