// Creates (or fetches) a Razorpay plan for the requested tier, then creates a
// subscription for the authenticated user and returns subscription_id + key_id
// to the frontend so it can open Razorpay Checkout in subscription mode.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Tier = "basic" | "pro";

const TIER_CONFIG: Record<Tier, { amountPaise: number; name: string }> = {
  basic: { amountPaise: 4900, name: "ResumeTailor Basic (Monthly)" },
  pro: { amountPaise: 9900, name: "ResumeTailor Pro (Monthly)" },
};

async function rzpFetch(path: string, auth: string, init?: RequestInit) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Razorpay error", path, res.status, data);
    throw new Error(data?.error?.description || "Razorpay request failed");
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!KEY_ID || !KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Razorpay not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? undefined;

    const body = await req.json().catch(() => ({}));
    const tier = body?.tier as Tier;
    if (tier !== "basic" && tier !== "pro") {
      return new Response(JSON.stringify({ error: "Invalid tier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const auth = btoa(`${KEY_ID}:${KEY_SECRET}`);

    // Ensure plan exists (cached in razorpay_plans)
    let { data: planRow } = await admin
      .from("razorpay_plans")
      .select("razorpay_plan_id")
      .eq("tier", tier)
      .maybeSingle();

    let planId = planRow?.razorpay_plan_id as string | undefined;

    if (!planId) {
      const cfg = TIER_CONFIG[tier];
      const created = await rzpFetch("/plans", auth, {
        method: "POST",
        body: JSON.stringify({
          period: "monthly",
          interval: 1,
          item: {
            name: cfg.name,
            amount: cfg.amountPaise,
            currency: "INR",
            description: `${cfg.name} subscription`,
          },
        }),
      });
      planId = created.id;
      await admin.from("razorpay_plans").insert({
        tier,
        razorpay_plan_id: planId,
        amount_paise: TIER_CONFIG[tier].amountPaise,
        currency: "INR",
        interval: "monthly",
      });
    }

    // Create subscription
    const subscription = await rzpFetch("/subscriptions", auth, {
      method: "POST",
      body: JSON.stringify({
        plan_id: planId,
        total_count: 120, // 10 years; effectively until cancelled
        customer_notify: 1,
        notes: { user_id: userId, tier },
      }),
    });

    // Save pending subscription id on profile so webhook can correlate quickly
    await admin
      .from("profiles")
      .update({
        razorpay_subscription_id: subscription.id,
        subscription_status: "created",
      })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        key_id: KEY_ID,
        tier,
        email: userEmail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-subscription error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
