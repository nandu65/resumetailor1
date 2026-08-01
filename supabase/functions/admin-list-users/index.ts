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
      .select("user_id,email,display_name,plan,subscription_status,scans_used_month,current_period_end,created_at,payment_failed,status,tags,bonus_scans")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: plans } = await admin.from("razorpay_plans").select("tier,amount_paise");
    const priceMap: Record<string, number> = {};
    (plans || []).forEach((p: any) => { priceMap[p.tier] = p.amount_paise; });

    let revenuePaise = 0;
    let cancelled = 0;
    let failed = 0;
    const counts = { free: 0, basic: 0, pro: 0 };
    (profiles || []).forEach((p: any) => {
      if (counts[p.plan as keyof typeof counts] !== undefined) counts[p.plan as keyof typeof counts]++;
      if (p.subscription_status === "active" && priceMap[p.plan]) revenuePaise += priceMap[p.plan];
      if (p.subscription_status === "cancelled") cancelled++;
      if (p.payment_failed) failed++;
    });

    // Time series: signups per day (last 30d)
    const now = new Date();
    const days: { date: string; signups: number; scans: number }[] = [];
    const dayIndex: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayIndex[key] = days.length;
      days.push({ date: key, signups: 0, scans: 0 });
    }
    (profiles || []).forEach((p: any) => {
      const k = new Date(p.created_at).toISOString().slice(0, 10);
      if (dayIndex[k] !== undefined) days[dayIndex[k]].signups++;
    });

    // Scan volume from optimizations
    const since = new Date(now); since.setUTCDate(since.getUTCDate() - 29);
    const { data: opts } = await admin
      .from("optimizations")
      .select("created_at,ats_score")
      .gte("created_at", since.toISOString());
    let totalScans = 0;
    let scoreSum = 0, scoreCount = 0;
    (opts || []).forEach((o: any) => {
      totalScans++;
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      if (dayIndex[k] !== undefined) days[dayIndex[k]].scans++;
      if (typeof o.ats_score === "number") { scoreSum += o.ats_score; scoreCount++; }
    });

    // Funnel + A/B test results
    const { data: events } = await admin
      .from("pricing_experiments")
      .select("variant,event,created_at")
      .gte("created_at", since.toISOString());
    const funnel: Record<string, { view: number; click: number; success: number }> = {
      a49: { view: 0, click: 0, success: 0 },
      b99: { view: 0, click: 0, success: 0 },
      c149: { view: 0, click: 0, success: 0 },
    };
    (events || []).forEach((e: any) => {
      if (funnel[e.variant] && funnel[e.variant][e.event as keyof typeof funnel["a49"]] !== undefined) {
        funnel[e.variant][e.event as "view" | "click" | "success"]++;
      }
    });

    // AI usage aggregation (last 30d)
    const { data: aiLogs } = await admin
      .from("ai_usage_logs")
      .select("feature,plan,model,input_tokens,output_tokens,cost_inr,created_at,status,token_source")
      .gte("created_at", since.toISOString());

    const aiByFeature: Record<string, { calls: number; input: number; output: number; cost: number; errors: number }> = {};
    const aiByPlan: Record<string, { calls: number; input: number; output: number; cost: number }> = {
      free: { calls: 0, input: 0, output: 0, cost: 0 },
      basic: { calls: 0, input: 0, output: 0, cost: 0 },
      pro: { calls: 0, input: 0, output: 0, cost: 0 },
      anonymous: { calls: 0, input: 0, output: 0, cost: 0 },
    };
    const aiByDay: Record<string, number> = {};
    let aiTotalCost = 0, aiTotalInput = 0, aiTotalOutput = 0, aiTotalCalls = 0, aiErrors = 0, aiExactCalls = 0;
    (aiLogs || []).forEach((l: any) => {
      const cost = Number(l.cost_inr) || 0;
      const inp = l.input_tokens || 0;
      const outp = l.output_tokens || 0;
      aiTotalCost += cost; aiTotalInput += inp; aiTotalOutput += outp; aiTotalCalls++;
      if (l.status === "error") aiErrors++;
      if (l.token_source === "exact") aiExactCalls++;
      const f = l.feature || "unknown";
      if (!aiByFeature[f]) aiByFeature[f] = { calls: 0, input: 0, output: 0, cost: 0, errors: 0 };
      aiByFeature[f].calls++; aiByFeature[f].input += inp; aiByFeature[f].output += outp; aiByFeature[f].cost += cost;
      if (l.status === "error") aiByFeature[f].errors++;
      const planKey = l.plan || "anonymous";
      if (!aiByPlan[planKey]) aiByPlan[planKey] = { calls: 0, input: 0, output: 0, cost: 0 };
      aiByPlan[planKey].calls++; aiByPlan[planKey].input += inp; aiByPlan[planKey].output += outp; aiByPlan[planKey].cost += cost;
      const k = new Date(l.created_at).toISOString().slice(0, 10);
      aiByDay[k] = (aiByDay[k] || 0) + cost;
    });
    const aiCostSeries = days.map((d) => ({ date: d.date, cost: +(aiByDay[d.date] || 0).toFixed(4) }));
    const aiFeatureRows = Object.entries(aiByFeature)
      .map(([feature, v]) => ({ feature, ...v, cost: +v.cost.toFixed(4), avgCost: +(v.cost / Math.max(1, v.calls)).toFixed(4) }))
      .sort((a, b) => b.cost - a.cost);
    const aiPlanRows = Object.entries(aiByPlan)
      .map(([plan, v]) => ({ plan, ...v, cost: +v.cost.toFixed(4), avgCost: +(v.cost / Math.max(1, v.calls)).toFixed(4) }));

    // ---- Per-user AI usage (lifetime, exact token counts) ----
    type UserAgg = {
      user_id: string; calls: number; input: number; output: number; cost: number;
      exactCalls: number; errors: number; last: string | null;
      calls30d: number; input30d: number; output30d: number; cost30d: number;
    };
    const byUser: Record<string, UserAgg> = {};
    const since30 = since.toISOString();
    const PAGE = 1000;
    for (let page = 0; page < 100; page++) {
      const { data: rows, error: rowsErr } = await admin
        .from("ai_usage_logs")
        .select("user_id,input_tokens,output_tokens,cost_inr,token_source,status,created_at")
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (rowsErr) break;
      (rows || []).forEach((l: any) => {
        const uid = l.user_id || "anonymous";
        if (!byUser[uid]) byUser[uid] = { user_id: uid, calls: 0, input: 0, output: 0, cost: 0, exactCalls: 0, errors: 0, last: null, calls30d: 0, input30d: 0, output30d: 0, cost30d: 0 };
        const u = byUser[uid];
        const inp = l.input_tokens || 0, outp = l.output_tokens || 0, cost = Number(l.cost_inr) || 0;
        u.calls++; u.input += inp; u.output += outp; u.cost += cost;
        if (l.token_source === "exact") u.exactCalls++;
        if (l.status === "error") u.errors++;
        if (!u.last || l.created_at > u.last) u.last = l.created_at;
        if (l.created_at >= since30) { u.calls30d++; u.input30d += inp; u.output30d += outp; u.cost30d += cost; }
      });
      if (!rows || rows.length < PAGE) break;
    }
    const emailMap: Record<string, { email: string | null; plan: string | null }> = {};
    (profiles || []).forEach((p: any) => { emailMap[p.user_id] = { email: p.email ?? null, plan: p.plan ?? null }; });
    const aiUserRows = Object.values(byUser)
      .map((u) => ({
        ...u,
        email: emailMap[u.user_id]?.email ?? (u.user_id === "anonymous" ? "(anonymous)" : null),
        plan: emailMap[u.user_id]?.plan ?? null,
        cost: +u.cost.toFixed(4),
        cost30d: +u.cost30d.toFixed(4),
        avgCost: +(u.cost / Math.max(1, u.calls)).toFixed(4),
        exactPct: +((u.exactCalls / Math.max(1, u.calls)) * 100).toFixed(1),
      }))
      .sort((a, b) => b.cost - a.cost);

    const activeSubs = counts.basic + counts.pro;
    const churnRate = activeSubs + cancelled > 0 ? (cancelled / (activeSubs + cancelled)) * 100 : 0;
    const conversionRate = (profiles?.length || 0) > 0 ? (activeSubs / (profiles?.length || 1)) * 100 : 0;

    return new Response(JSON.stringify({
      users: profiles,
      total: profiles?.length || 0,
      counts,
      monthlyRevenueINR: revenuePaise / 100,
      metrics: {
        mrrINR: revenuePaise / 100,
        activeSubs,
        cancelled,
        churnRate: +churnRate.toFixed(1),
        conversionRate: +conversionRate.toFixed(1),
        totalScans30d: totalScans,
        avgScore: scoreCount ? Math.round(scoreSum / scoreCount) : 0,
        paymentFailed: failed,
        aiCostInr30d: +aiTotalCost.toFixed(2),
        aiCalls30d: aiTotalCalls,
        aiInputTokens30d: aiTotalInput,
        aiOutputTokens30d: aiTotalOutput,
        aiErrors30d: aiErrors,
      },
      timeseries: days,
      abTest: funnel,
      aiCost: {
        exactTokenPct: aiTotalCalls ? +((aiExactCalls / aiTotalCalls) * 100).toFixed(1) : 0,
        usdToInr: Number(Deno.env.get("USD_TO_INR") ?? 83),
        byFeature: aiFeatureRows,
        byPlan: aiPlanRows,
        series: aiCostSeries,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
