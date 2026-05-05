import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "nandunaidu656565@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("user_id,email,display_name,plan,subscription_status,scans_used_month,current_period_end,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: plans } = await admin.from("razorpay_plans").select("tier,amount_paise");
    const priceMap: Record<string, number> = {};
    (plans || []).forEach((p: any) => { priceMap[p.tier] = p.amount_paise; });

    let revenuePaise = 0;
    const counts = { free: 0, basic: 0, pro: 0 };
    (profiles || []).forEach((p: any) => {
      if (counts[p.plan as keyof typeof counts] !== undefined) counts[p.plan as keyof typeof counts]++;
      if (p.subscription_status === "active" && priceMap[p.plan]) revenuePaise += priceMap[p.plan];
    });

    return new Response(JSON.stringify({
      users: profiles,
      total: profiles?.length || 0,
      counts,
      monthlyRevenueINR: revenuePaise / 100,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
