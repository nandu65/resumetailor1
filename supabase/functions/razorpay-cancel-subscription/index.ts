// Cancels the authenticated user's active Razorpay subscription.
// `cancel_at_cycle_end: 1` lets them keep access until the period ends.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ") || !KEY_ID || !KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: profile } = await admin
      .from("profiles")
      .select("razorpay_subscription_id, subscription_status")
      .eq("user_id", userId)
      .maybeSingle();

    const subId = profile?.razorpay_subscription_id;
    if (!subId) {
      return new Response(JSON.stringify({ error: "No active subscription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${KEY_ID}:${KEY_SECRET}`);
    const res = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cancel_at_cycle_end: 1 }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("Cancel failed", data);
      return new Response(
        JSON.stringify({ error: data?.error?.description || "Cancel failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true, subscription: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cancel-subscription error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
