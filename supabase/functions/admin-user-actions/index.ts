// Consolidated admin action endpoint. All privileged per-user operations go through here.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "nandunaidu656565@gmail.com";
const ALLOWED_PLANS = ["free", "basic", "pro"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return json({ error: "Forbidden" }, 403);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const target: string | undefined = body.user_id;
    const ip = req.headers.get("x-forwarded-for") || null;

    const audit = async (details: Record<string, unknown> = {}) => {
      await admin.from("admin_audit_log").insert({
        admin_email: user.email,
        action,
        target_user_id: target ?? null,
        details,
        ip,
      });
    };

    switch (action) {
      // -------- READ --------
      case "get_user_detail": {
        if (!target) return json({ error: "user_id required" }, 400);
        const [{ data: profile }, { data: authUser }, { data: opts }, { data: aiLogs }, { data: payments }] = await Promise.all([
          admin.from("profiles").select("*").eq("user_id", target).maybeSingle(),
          admin.auth.admin.getUserById(target),
          admin.from("optimizations").select("id,title,company,role,ats_score,created_at").eq("user_id", target).order("created_at", { ascending: false }).limit(50),
          admin.from("ai_usage_logs").select("feature,model,input_tokens,output_tokens,cost_inr,status,created_at,token_source").eq("user_id", target).order("created_at", { ascending: false }).limit(200),
          admin.from("pricing_experiments").select("variant,event,tier,created_at").eq("user_id", target).order("created_at", { ascending: false }).limit(30),
        ]);
        const { data: customOffers } = await admin
          .from("custom_offers").select("*").eq("user_id", target).order("created_at", { ascending: false }).limit(50);

        // Lifetime + date-range AI totals for this user (paginated, all rows)
        const parseDate = (v: unknown) => {
          const t = Date.parse(String(v ?? ""));
          return Number.isFinite(t) ? new Date(t) : null;
        };
        const rFrom = parseDate(body.ai_from);
        const rToRaw = parseDate(body.ai_to);
        const rFromIso = rFrom ? rFrom.toISOString() : null;
        const rToIso = rToRaw
          ? new Date(rToRaw.getTime() + (String(body.ai_to).length <= 10 ? 86399999 : 0)).toISOString()
          : new Date().toISOString();

        const fFeature = String(body.ai_feature || "").trim();
        const fModel = String(body.ai_model || "").trim();

        const blank = () => ({ calls: 0, input: 0, output: 0, cost: 0, exactCalls: 0, errors: 0 });
        const totals = blank();
        const rangeTotals = blank();
        type Bucket = { feature: string; calls: number; input: number; output: number; cost: number };
        const byFeature: Record<string, Bucket> = {};
        const byFeatureRange: Record<string, Bucket> = {};
        const byModelRange: Record<string, Bucket> = {};
        const featureSet = new Set<string>();
        const modelSet = new Set<string>();
        const PAGE = 1000;
        for (let page = 0; page < 100; page++) {
          const { data: rows, error: rowsErr } = await admin
            .from("ai_usage_logs")
            .select("feature,model,input_tokens,output_tokens,cost_inr,status,token_source,created_at")
            .eq("user_id", target)
            .range(page * PAGE, page * PAGE + PAGE - 1);
          if (rowsErr) break;
          (rows || []).forEach((l: any) => {
            const f = l.feature || "unknown";
            const m = l.model || "unknown";
            featureSet.add(f);
            modelSet.add(m);
            if (fFeature && f !== fFeature) return;
            if (fModel && m !== fModel) return;
            const inp = l.input_tokens || 0, outp = l.output_tokens || 0, cost = Number(l.cost_inr) || 0;
            totals.calls++; totals.input += inp; totals.output += outp; totals.cost += cost;
            if (l.token_source === "exact") totals.exactCalls++;
            if (l.status === "error") totals.errors++;
            if (!byFeature[f]) byFeature[f] = { feature: f, calls: 0, input: 0, output: 0, cost: 0 };
            byFeature[f].calls++; byFeature[f].input += inp; byFeature[f].output += outp; byFeature[f].cost += cost;

            const inRange = (!rFromIso || l.created_at >= rFromIso) && l.created_at <= rToIso;
            if (inRange) {
              rangeTotals.calls++; rangeTotals.input += inp; rangeTotals.output += outp; rangeTotals.cost += cost;
              if (l.token_source === "exact") rangeTotals.exactCalls++;
              if (l.status === "error") rangeTotals.errors++;
              if (!byFeatureRange[f]) byFeatureRange[f] = { feature: f, calls: 0, input: 0, output: 0, cost: 0 };
              byFeatureRange[f].calls++; byFeatureRange[f].input += inp; byFeatureRange[f].output += outp; byFeatureRange[f].cost += cost;
              if (!byModelRange[m]) byModelRange[m] = { feature: m, calls: 0, input: 0, output: 0, cost: 0 };
              byModelRange[m].calls++; byModelRange[m].input += inp; byModelRange[m].output += outp; byModelRange[m].cost += cost;
            }
          });
          if (!rows || rows.length < PAGE) break;
        }



        const au = authUser?.user;
        return json({
          profile,
          auth: au ? {
            id: au.id,
            email: au.email,
            email_confirmed_at: au.email_confirmed_at,
            phone: au.phone,
            last_sign_in_at: au.last_sign_in_at,
            created_at: au.created_at,
            providers: au.app_metadata?.providers ?? [],
            banned_until: (au as any).banned_until ?? null,
          } : null,
          optimizations: opts ?? [],
          ai_logs: (aiLogs ?? []).filter((l: any) =>
            (!fFeature || (l.feature || "unknown") === fFeature) &&
            (!fModel || (l.model || "unknown") === fModel)
          ),
          ai_filters: {
            feature: fFeature || null,
            model: fModel || null,
            features: Array.from(featureSet).sort(),
            models: Array.from(modelSet).sort(),
          },
          ai_totals: {
            ...totals,
            cost: +totals.cost.toFixed(4),
            avgCost: +(totals.cost / Math.max(1, totals.calls)).toFixed(4),
            exactPct: +((totals.exactCalls / Math.max(1, totals.calls)) * 100).toFixed(1),
            usdToInr: Number(Deno.env.get("USD_TO_INR") ?? 83),
            byFeature: Object.values(byFeature)
              .map((f) => ({ ...f, cost: +f.cost.toFixed(4) }))
              .sort((a, b) => b.cost - a.cost),
          },
          ai_range: {
            from: rFromIso,
            to: rToIso,
            ...rangeTotals,
            cost: +rangeTotals.cost.toFixed(4),
            avgCost: +(rangeTotals.cost / Math.max(1, rangeTotals.calls)).toFixed(4),
            exactPct: +((rangeTotals.exactCalls / Math.max(1, rangeTotals.calls)) * 100).toFixed(1),
            byFeature: Object.values(byFeatureRange)
              .map((f) => ({ ...f, cost: +f.cost.toFixed(4) }))
              .sort((a, b) => b.cost - a.cost),
            byModel: Object.values(byModelRange)
              .map((f) => ({ ...f, cost: +f.cost.toFixed(4) }))
              .sort((a, b) => b.cost - a.cost),
          },
          pricing_events: payments ?? [],
          custom_offers: customOffers ?? [],
        });
      }

      // -------- PLAN / SCANS --------
      case "update_plan": {
        const plan = String(body.plan || "");
        if (!ALLOWED_PLANS.includes(plan)) return json({ error: "Invalid plan" }, 400);
        const updates: any = {
          plan,
          subscription_status: plan === "free" ? "inactive" : "active",
          updated_at: new Date().toISOString(),
        };
        const { error } = await admin.from("profiles").update(updates).eq("user_id", target);
        if (error) throw error;
        await audit({ plan });
        return json({ ok: true });
      }

      case "grant_scans": {
        const delta = Number(body.delta || 0);
        if (!Number.isFinite(delta) || delta === 0) return json({ error: "delta required" }, 400);
        // grant = negative scans_used (effectively increases quota)
        const { data: prof } = await admin.from("profiles").select("scans_used_month,bonus_scans").eq("user_id", target).maybeSingle();
        if (!prof) return json({ error: "profile not found" }, 404);
        const newUsed = Math.max(0, (prof.scans_used_month ?? 0) - delta);
        const newBonus = (prof.bonus_scans ?? 0) + delta;
        const { error } = await admin.from("profiles").update({ scans_used_month: newUsed, bonus_scans: newBonus }).eq("user_id", target);
        if (error) throw error;
        await audit({ delta });
        return json({ ok: true });
      }

      case "reset_scans": {
        const { error } = await admin.from("profiles").update({ scans_used_month: 0, scan_period_start: new Date().toISOString() }).eq("user_id", target);
        if (error) throw error;
        await audit({});
        return json({ ok: true });
      }

      // -------- BAN / SUSPEND / DELETE --------
      case "set_status": {
        const status = String(body.status || "");
        if (!["active", "suspended", "banned"].includes(status)) return json({ error: "Invalid status" }, 400);
        const reason = body.reason ? String(body.reason) : null;
        const patch: any = { status };
        if (status === "banned" || status === "suspended") {
          patch.banned_at = new Date().toISOString();
          patch.banned_reason = reason;
        } else {
          patch.banned_at = null;
          patch.banned_reason = null;
        }
        const { error } = await admin.from("profiles").update(patch).eq("user_id", target);
        if (error) throw error;
        // Ban in auth: set very long ban duration for banned, moderate for suspended
        if (status === "banned") {
          await admin.auth.admin.updateUserById(target!, { ban_duration: "876000h" }); // 100y
        } else if (status === "suspended") {
          await admin.auth.admin.updateUserById(target!, { ban_duration: "8760h" }); // 1y
        } else {
          await admin.auth.admin.updateUserById(target!, { ban_duration: "none" });
        }
        await audit({ status, reason });
        return json({ ok: true });
      }

      case "delete_user": {
        if (!target) return json({ error: "user_id required" }, 400);
        // hard delete: auth + cascade via profile+optimizations
        await admin.from("optimizations").delete().eq("user_id", target);
        await admin.from("ai_usage_logs").delete().eq("user_id", target);
        await admin.from("profiles").delete().eq("user_id", target);
        const { error } = await admin.auth.admin.deleteUser(target);
        if (error) throw error;
        await audit({ hard: true });
        return json({ ok: true });
      }

      // -------- CREDENTIALS --------
      case "force_password_reset": {
        const { data: prof } = await admin.from("profiles").select("email").eq("user_id", target).maybeSingle();
        const email = prof?.email;
        if (!email) return json({ error: "email not found" }, 404);
        const { error } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
        });
        // The link is generated & email sent by Supabase. We just need to trigger it.
        if (error) throw error;
        await audit({ email });
        return json({ ok: true });
      }

      case "send_magic_link": {
        const { data: prof } = await admin.from("profiles").select("email").eq("user_id", target).maybeSingle();
        const email = prof?.email;
        if (!email) return json({ error: "email not found" }, 404);
        const { error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
        if (error) throw error;
        await audit({ email });
        return json({ ok: true });
      }

      case "verify_email": {
        const { error } = await admin.auth.admin.updateUserById(target!, { email_confirm: true });
        if (error) throw error;
        await audit({});
        return json({ ok: true });
      }

      case "update_profile": {
        const patch: any = {};
        if (typeof body.email === "string") patch.email = body.email;
        if (typeof body.display_name === "string") patch.display_name = body.display_name;
        if (Object.keys(patch).length === 0) return json({ error: "nothing to update" }, 400);
        // Update profiles + auth email
        if (patch.email) {
          const { error } = await admin.auth.admin.updateUserById(target!, { email: patch.email, email_confirm: true });
          if (error) throw error;
        }
        const { error } = await admin.from("profiles").update(patch).eq("user_id", target);
        if (error) throw error;
        await audit(patch);
        return json({ ok: true });
      }

      // -------- NOTES / TAGS --------
      case "update_notes": {
        const notes = typeof body.notes === "string" ? body.notes : null;
        const { error } = await admin.from("profiles").update({ notes }).eq("user_id", target);
        if (error) throw error;
        await audit({ notes });
        return json({ ok: true });
      }

      case "update_tags": {
        const tags = Array.isArray(body.tags) ? body.tags.map((t: any) => String(t)).slice(0, 20) : [];
        const { error } = await admin.from("profiles").update({ tags }).eq("user_id", target);
        if (error) throw error;
        await audit({ tags });
        return json({ ok: true });
      }

      // -------- SUBSCRIPTION / REFUND --------
      case "cancel_subscription": {
        const { data: prof } = await admin.from("profiles").select("razorpay_subscription_id").eq("user_id", target).maybeSingle();
        const subId = prof?.razorpay_subscription_id;
        if (subId) {
          const keyId = Deno.env.get("RAZORPAY_KEY_ID");
          const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
          const auth = "Basic " + btoa(`${keyId}:${keySecret}`);
          const rz = await fetch(`https://api.razorpay.com/v1/subscriptions/${subId}/cancel`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ cancel_at_cycle_end: 0 }),
          });
          if (!rz.ok) {
            const text = await rz.text();
            await audit({ subId, razorpay_error: text });
          }
        }
        const { error } = await admin.from("profiles").update({
          subscription_status: "cancelled",
          plan: "free",
          razorpay_subscription_id: null,
        }).eq("user_id", target);
        if (error) throw error;
        await audit({ subId });
        return json({ ok: true });
      }

      case "refund_payment": {
        const payment_id = String(body.payment_id || "");
        const amount_paise = body.amount_paise ? Number(body.amount_paise) : undefined;
        if (!payment_id) return json({ error: "payment_id required" }, 400);
        const keyId = Deno.env.get("RAZORPAY_KEY_ID");
        const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
        const auth = "Basic " + btoa(`${keyId}:${keySecret}`);
        const rz = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}/refund`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify(amount_paise ? { amount: amount_paise } : {}),
        });
        const rzJson = await rz.json();
        if (!rz.ok) {
          await audit({ payment_id, error: rzJson });
          return json({ error: rzJson?.error?.description || "refund failed" }, 400);
        }
        // Auto-downgrade
        if (body.downgrade !== false) {
          await admin.from("profiles").update({
            plan: "free",
            subscription_status: "refunded",
          }).eq("user_id", target);
        }
        await audit({ payment_id, refund: rzJson });
        return json({ ok: true, refund: rzJson });
      }

      // -------- IMPERSONATE --------
      case "impersonate": {
        const { data: prof } = await admin.from("profiles").select("email").eq("user_id", target).maybeSingle();
        const email = prof?.email;
        if (!email) return json({ error: "email not found" }, 404);
        const { data, error } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
        if (error) throw error;
        await audit({ email });
        // Return the action_link — admin opens it in an incognito window to sign in as user.
        return json({ ok: true, link: data?.properties?.action_link ?? null });
      }

      // -------- AUDIT LOG --------
      case "list_audit": {
        const q = admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
        const { data, error } = target ? await q.eq("target_user_id", target) : await q;
        if (error) throw error;
        return json({ log: data ?? [] });
      }

      case "list_all_audit": {
        const limit = Math.min(Number(body.limit) || 200, 500);
        const { data, error } = await admin
          .from("admin_audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return json({ log: data ?? [] });
      }

      // -------- ACTIVITY TIMELINE (per user) --------
      case "list_activity": {
        if (!target) return json({ error: "user_id required" }, 400);
        const [{ data: prof }, { data: authUser }, { data: opts }, { data: aiLogs }, { data: pricing }, { data: adminLog }, { data: attempts }] =
          await Promise.all([
            admin.from("profiles").select("created_at,plan,subscription_status,updated_at,email,current_period_end").eq("user_id", target).maybeSingle(),
            admin.auth.admin.getUserById(target),
            admin.from("optimizations").select("id,title,role,company,ats_score,created_at").eq("user_id", target).order("created_at", { ascending: false }).limit(100),
            admin.from("ai_usage_logs").select("feature,model,cost_inr,status,created_at").eq("user_id", target).order("created_at", { ascending: false }).limit(100),
            admin.from("pricing_experiments").select("variant,event,tier,created_at").eq("user_id", target).order("created_at", { ascending: false }).limit(50),
            admin.from("admin_audit_log").select("action,admin_email,details,created_at").eq("target_user_id", target).order("created_at", { ascending: false }).limit(50),
            (async () => {
              const em = prof?.email || authUser?.user?.email;
              if (!em) return { data: [] };
              return await admin.from("login_attempts").select("success,ip,user_agent,error,created_at").ilike("email", em).order("created_at", { ascending: false }).limit(50);
            })(),
          ]);
        type Ev = { ts: string; kind: string; label: string; meta?: any };
        const events: Ev[] = [];
        if (prof?.created_at) events.push({ ts: prof.created_at, kind: "signup", label: "Account created" });
        const au = authUser?.user;
        if (au?.last_sign_in_at) events.push({ ts: au.last_sign_in_at, kind: "login", label: "Signed in", meta: { providers: au.app_metadata?.providers } });
        (opts ?? []).forEach((o: any) => events.push({ ts: o.created_at, kind: "scan", label: `Scanned "${o.title || o.role || "Untitled"}"${o.company ? " · " + o.company : ""}`, meta: { id: o.id, score: o.ats_score } }));
        (aiLogs ?? []).forEach((l: any) => events.push({ ts: l.created_at, kind: "ai", label: `AI: ${l.feature} (${l.model})`, meta: { cost: l.cost_inr, status: l.status } }));
        (pricing ?? []).forEach((p: any) => events.push({ ts: p.created_at, kind: p.event === "success" ? "payment" : "pricing", label: `Pricing ${p.event} · ${p.variant} · ${p.tier || ""}` }));
        (adminLog ?? []).forEach((a: any) => events.push({ ts: a.created_at, kind: "admin", label: `Admin: ${a.action}`, meta: { by: a.admin_email, details: a.details } }));
        (attempts ?? []).forEach((a: any) => events.push({ ts: a.created_at, kind: a.success ? "login" : "login_failed", label: a.success ? "Sign in" : `Failed sign-in${a.error ? ": " + a.error : ""}`, meta: { ip: a.ip } }));
        events.sort((a, b) => b.ts.localeCompare(a.ts));
        return json({ timeline: events.slice(0, 300) });
      }

      // -------- ONLINE NOW / SESSIONS --------
      case "list_online": {
        const windowMin = Math.min(Math.max(Number(body.window_min) || 15, 1), 120);
        const since = new Date(Date.now() - windowMin * 60000).toISOString();
        const { data: presence } = await admin
          .from("user_presence")
          .select("user_id,last_seen,path")
          .gte("last_seen", since)
          .order("last_seen", { ascending: false })
          .limit(200);
        const ids = (presence ?? []).map((p: any) => p.user_id);
        let profileMap: Record<string, any> = {};
        if (ids.length) {
          const { data: profs } = await admin.from("profiles").select("user_id,email,display_name,plan").in("user_id", ids);
          (profs ?? []).forEach((p: any) => { profileMap[p.user_id] = p; });
        }
        const online = (presence ?? []).map((p: any) => ({
          ...p,
          email: profileMap[p.user_id]?.email,
          display_name: profileMap[p.user_id]?.display_name,
          plan: profileMap[p.user_id]?.plan,
        }));
        return json({ online, count: online.length, window_min: windowMin });
      }

      // -------- FAILED LOGINS --------
      case "list_failed_logins": {
        const limit = Math.min(Number(body.limit) || 100, 500);
        const { data, error } = await admin
          .from("login_attempts")
          .select("*")
          .eq("success", false)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        // Group by IP for brute-force detection
        const byIp: Record<string, number> = {};
        (data ?? []).forEach((r: any) => { if (r.ip) byIp[r.ip] = (byIp[r.ip] || 0) + 1; });
        const suspiciousIps = Object.entries(byIp).filter(([, n]) => n >= 5).map(([ip, count]) => ({ ip, count })).sort((a, b) => b.count - a.count);
        return json({ attempts: data ?? [], suspicious_ips: suspiciousIps });
      }

      // -------- CONTENT MODERATION --------
      case "view_content": {
        const opt_id = String(body.optimization_id || "");
        const reason = String(body.reason || "").trim();
        if (!opt_id || !reason || reason.length < 5) return json({ error: "optimization_id and reason (min 5 chars) required" }, 400);
        const { data, error } = await admin.from("optimizations").select("*").eq("id", opt_id).maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: "not found" }, 404);
        await admin.from("admin_audit_log").insert({
          admin_email: user.email,
          action: "view_content",
          target_user_id: data.user_id,
          details: { optimization_id: opt_id, reason, title: data.title, company: data.company },
          ip,
        });
        return json({ optimization: data });
      }

      case "delete_optimization": {
        const opt_id = String(body.optimization_id || "");
        const reason = String(body.reason || "").trim();
        if (!opt_id || !reason) return json({ error: "optimization_id and reason required" }, 400);
        const { data: existing } = await admin.from("optimizations").select("user_id,title,company").eq("id", opt_id).maybeSingle();
        const { error } = await admin.from("optimizations").delete().eq("id", opt_id);
        if (error) throw error;
        await admin.from("admin_audit_log").insert({
          admin_email: user.email,
          action: "delete_optimization",
          target_user_id: existing?.user_id ?? null,
          details: { optimization_id: opt_id, reason, title: existing?.title, company: existing?.company },
          ip,
        });
        return json({ ok: true });
      }

      case "flag_optimization": {
        const opt_id = String(body.optimization_id || "");
        const reason = String(body.reason || "").trim();
        const flagged = body.flagged !== false;
        if (!opt_id) return json({ error: "optimization_id required" }, 400);
        const patch: any = { flagged, flag_reason: flagged ? reason || null : null };
        if (flagged) { patch.moderated_at = new Date().toISOString(); patch.moderated_by = user.email; }
        const { error } = await admin.from("optimizations").update(patch).eq("id", opt_id);
        if (error) throw error;
        await audit({ optimization_id: opt_id, flagged, reason });
        return json({ ok: true });
      }

      case "list_flagged_jds": {
        // Scan last 500 recent optimizations for prompt-injection signals + already-flagged ones
        const limit = Math.min(Number(body.limit) || 500, 1000);
        const { data: opts, error } = await admin
          .from("optimizations")
          .select("id,user_id,title,company,role,job_description,ats_score,flagged,flag_reason,created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;

        const patterns: { re: RegExp; label: string }[] = [
          { re: /ignore (all |the |any )?(previous|prior|above) (instructions|rules|prompts)/i, label: "ignore-previous" },
          { re: /disregard (all |the |any )?(previous|prior|above)/i, label: "disregard" },
          { re: /you are (now |actually )?(an?|the) [a-z ]{2,40}(assistant|ai|model|bot|agent)/i, label: "role-hijack" },
          { re: /system\s*(prompt|message|instruction)/i, label: "system-prompt" },
          { re: /reveal (your|the) (prompt|instructions|system)/i, label: "reveal-prompt" },
          { re: /jailbreak|DAN mode|developer mode/i, label: "jailbreak" },
          { re: /print (all|the) (env|api key|secret|password)/i, label: "exfil-secret" },
          { re: /```[\s\S]*?ignore[\s\S]*?```/i, label: "injection-fence" },
          { re: /<\s*script\b/i, label: "script-tag" },
          { re: /(bomb|kill|slur|nsfw|porn|racist|nazi)/i, label: "abuse-keyword" },
        ];
        const grabIds = new Set<string>();
        (opts ?? []).forEach((o: any) => { if (o.flagged) grabIds.add(o.id); });
        const detected = (opts ?? []).map((o: any) => {
          const hits: string[] = [];
          const jd = (o.job_description || "").slice(0, 20000);
          patterns.forEach((p) => { if (p.re.test(jd)) hits.push(p.label); });
          const excerpt = jd.length > 600 ? jd.slice(0, 600) + "…" : jd;
          return { ...o, hits, excerpt, suspicious: hits.length > 0 || o.flagged };
        }).filter((o: any) => o.suspicious);
        return json({ items: detected.slice(0, 200) });
      }

      // -------- CUSTOM PRICING OFFERS --------
      case "create_custom_offer": {
        if (!target) return json({ error: "user_id required" }, 400);
        const title = String(body.title || "").trim();
        const description = String(body.description || "").trim() || null;
        const amountRupees = Number(body.amount_rupees);
        const scans = Number(body.scans ?? 0);
        const expiresInDays = Number(body.expires_in_days ?? 0);
        if (!title) return json({ error: "title required" }, 400);
        if (!Number.isFinite(amountRupees) || amountRupees < 1) return json({ error: "amount must be at least ₹1" }, 400);
        if (!Number.isFinite(scans) || scans < 0) return json({ error: "invalid scans" }, 400);

        const { data: offer, error } = await admin.from("custom_offers").insert({
          user_id: target,
          title,
          description,
          amount_paise: Math.round(amountRupees * 100),
          scans: Math.round(scans),
          created_by: user.email,
          expires_at: expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null,
        }).select().maybeSingle();
        if (error) throw error;
        await audit({ offer_id: offer?.id, amountRupees, scans });
        return json({ ok: true, offer });
      }

      case "cancel_custom_offer": {
        const offerId = String(body.offer_id || "");
        if (!offerId) return json({ error: "offer_id required" }, 400);
        const { data: offer } = await admin.from("custom_offers").select("*").eq("id", offerId).maybeSingle();
        if (!offer) return json({ error: "offer not found" }, 404);
        if (offer.status === "paid") {
          return json({ error: "Offer is already paid — use refund instead so the payment and scans are reversed." }, 400);
        }
        const { error } = await admin.from("custom_offers")
          .update({ status: "cancelled" }).eq("id", offerId).neq("status", "paid");
        if (error) throw error;
        await audit({ offer_id: offerId });
        return json({ ok: true });
      }

      case "refund_custom_offer": {
        const offerId = String(body.offer_id || "");
        if (!offerId) return json({ error: "offer_id required" }, 400);
        const { data: offer } = await admin.from("custom_offers").select("*").eq("id", offerId).maybeSingle();
        if (!offer) return json({ error: "offer not found" }, 404);
        if (offer.status !== "paid") return json({ error: "only paid offers can be refunded" }, 400);
        if (!offer.payment_id) return json({ error: "offer has no payment id" }, 400);

        const paid = Number(offer.amount_paise) || 0;
        const reqRupees = body.amount_rupees === undefined || body.amount_rupees === null || body.amount_rupees === ""
          ? null
          : Number(body.amount_rupees);
        if (reqRupees !== null && (!Number.isFinite(reqRupees) || reqRupees <= 0)) {
          return json({ error: "invalid refund amount" }, 400);
        }
        const refundPaise = reqRupees === null ? paid : Math.round(reqRupees * 100);
        if (refundPaise > paid) return json({ error: "refund exceeds amount paid" }, 400);
        const isPartial = refundPaise < paid;

        const keyId = Deno.env.get("RAZORPAY_KEY_ID");
        const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
        const rzAuth = "Basic " + btoa(`${keyId}:${keySecret}`);
        const rz = await fetch(`https://api.razorpay.com/v1/payments/${offer.payment_id}/refund`, {
          method: "POST",
          headers: { Authorization: rzAuth, "Content-Type": "application/json" },
          body: JSON.stringify({ amount: refundPaise, notes: { offer_id: offerId } }),
        });
        const rzJson = await rz.json();
        if (!rz.ok) {
          await audit({ offer_id: offerId, error: rzJson });
          return json({ error: rzJson?.error?.description || "refund failed" }, 400);
        }

        // Revoke the credited scans (proportional for partial refunds unless overridden)
        const granted = Number(offer.scans) || 0;
        const requestedRevoke = body.revoke_scans === undefined || body.revoke_scans === null || body.revoke_scans === ""
          ? (isPartial ? Math.floor((granted * refundPaise) / Math.max(1, paid)) : granted)
          : Number(body.revoke_scans);
        const revoke = Math.max(0, Math.min(granted, Math.round(Number.isFinite(requestedRevoke) ? requestedRevoke : 0)));

        let bonusAfter: number | null = null;
        if (revoke > 0) {
          const { data: prof } = await admin.from("profiles").select("bonus_scans").eq("user_id", offer.user_id).maybeSingle();
          const current = Number(prof?.bonus_scans) || 0;
          bonusAfter = Math.max(0, current - revoke);
          await admin.from("profiles").update({ bonus_scans: bonusAfter }).eq("user_id", offer.user_id);
        }

        await admin.from("custom_offers").update({
          status: isPartial ? "partially_refunded" : "refunded",
        }).eq("id", offerId);

        // Reflect the refund on the matching payment row when present
        if (offer.payment_id) {
          const { data: pay } = await admin.from("payments").select("id,refunded_paise").eq("payment_id", offer.payment_id).maybeSingle();
          if (pay) {
            await admin.from("payments").update({
              refunded_paise: (Number(pay.refunded_paise) || 0) + refundPaise,
              refund_id: rzJson?.id ?? null,
              status: isPartial ? "partially_refunded" : "refunded",
            }).eq("id", pay.id);
          }
        }

        await audit({ offer_id: offerId, refund_paise: refundPaise, revoked_scans: revoke, refund_id: rzJson?.id });
        return json({ ok: true, refund: rzJson, refunded_paise: refundPaise, revoked_scans: revoke, bonus_scans: bonusAfter });
      }

      case "list_custom_offers": {
        const { data: offers, error } = await admin
          .from("custom_offers").select("*").order("created_at", { ascending: false }).limit(200);
        if (error) throw error;
        const ids = Array.from(new Set((offers ?? []).map((o: any) => o.user_id)));
        const { data: profs } = await admin.from("profiles").select("user_id,email,plan").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
        const map: Record<string, any> = {};
        (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
        return json({ items: (offers ?? []).map((o: any) => ({ ...o, email: map[o.user_id]?.email ?? null, plan: map[o.user_id]?.plan ?? null })) });
      }

      // -------- HEALTH / STATS --------

      case "quick_stats": {
        const [{ count: onlineCount }, { count: failedCount }, { count: flaggedCount }] = await Promise.all([
          admin.from("user_presence").select("*", { count: "exact", head: true }).gte("last_seen", new Date(Date.now() - 15 * 60000).toISOString()),
          admin.from("login_attempts").select("*", { count: "exact", head: true }).eq("success", false).gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString()),
          admin.from("optimizations").select("*", { count: "exact", head: true }).eq("flagged", true),
        ]);
        return json({ online_15m: onlineCount ?? 0, failed_logins_24h: failedCount ?? 0, flagged_content: flaggedCount ?? 0 });
      }

      default:
        return json({ error: `unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
