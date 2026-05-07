// Schedules a plan change (e.g. Pro -> Basic downgrade) on the user's active
// Razorpay subscription, applied at the end of the current billing cycle.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Tier = "basic" | "pro";
const TIER_CONFIG: Record<Tier, { amountPaise: number; name: string }> = {
  basic: { amountPaise: 4900, name: "ResumeShot Basic (Monthly)" },
  pro: { amountPaise: 9900, name: "ResumeShot Pro (Monthly)" },
};

async function rzp(path: string, auth: string, init?: RequestInit) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || "Razorpay request failed");
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userData?.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const tier = body?.tier as Tier;
    if (tier !== "basic" && tier !== "pro") {
      return new Response(JSON.stringify({ error: "Invalid tier" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: profile } = await admin
      .from("profiles")
      .select("razorpay_subscription_id, plan, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    const subId = profile?.razorpay_subscription_id;
    if (!subId) return new Response(JSON.stringify({ error: "No active subscription" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Ensure target plan exists
    let { data: planRow } = await admin.from("razorpay_plans").select("razorpay_plan_id").eq("tier", tier).maybeSingle();
    let planId = planRow?.razorpay_plan_id as string | undefined;
    const auth = btoa(`${KEY_ID}:${KEY_SECRET}`);
    if (!planId) {
      const cfg = TIER_CONFIG[tier];
      const created = await rzp("/plans", auth, {
        method: "POST",
        body: JSON.stringify({ period: "monthly", interval: 1, item: { name: cfg.name, amount: cfg.amountPaise, currency: "INR" } }),
      });
      planId = created.id;
      await admin.from("razorpay_plans").insert({ tier, razorpay_plan_id: planId, amount_paise: cfg.amountPaise, currency: "INR", interval: "monthly" });
    }

    // Schedule plan change at the end of current cycle
    const updated = await rzp(`/subscriptions/${subId}`, auth, {
      method: "PATCH",
      body: JSON.stringify({ plan_id: planId, schedule_change_at: "cycle_end", customer_notify: 1 }),
    });

    await admin.from("profiles").update({ pending_plan: tier }).eq("user_id", userId);

    return new Response(
      JSON.stringify({ ok: true, effective_at: profile?.current_period_end, subscription: updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
