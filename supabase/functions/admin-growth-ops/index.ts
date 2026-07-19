// Admin — Growth ops: broadcasts, cohort retention, referrals, feature flags, leads manager.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ADMIN_EMAIL = "nandunaidu656565@gmail.com";
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
function startOfWeekUTC(d: Date) { const x = new Date(d); const day = x.getUTCDay(); const diff = (day + 6) % 7; x.setUTCDate(x.getUTCDate() - diff); x.setUTCHours(0, 0, 0, 0); return x; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const uc = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await uc.auth.getUser();
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return j({ error: "Forbidden" }, 403);
    const admin = createClient(url, svc);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const ip = req.headers.get("x-forwarded-for") || null;
    const audit = (details: Record<string, unknown> = {}) =>
      admin.from("admin_audit_log").insert({ admin_email: user.email, action, details, ip });

    switch (action) {
      // ---------- BROADCASTS ----------
      case "list_broadcasts": {
        const { data, error } = await admin.from("broadcasts").select("*").order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return j({ broadcasts: data ?? [] });
      }

      case "audience_preview":
      case "send_broadcast": {
        const segment = body.segment || {};
        // Build segment
        let q = admin.from("profiles").select("user_id,email,plan,scans_used_month,created_at").limit(20000);
        if (segment.plan && ["free", "basic", "pro"].includes(segment.plan)) q = q.eq("plan", segment.plan);
        if (segment.min_scans != null) q = q.gte("scans_used_month", Number(segment.min_scans));
        if (segment.max_scans != null) q = q.lte("scans_used_month", Number(segment.max_scans));
        if (segment.created_after) q = q.gte("created_at", new Date(segment.created_after).toISOString());
        if (segment.active_days) {
          const since = new Date(Date.now() - Number(segment.active_days) * 86400000).toISOString();
          // active = has a scan in the window
          const { data: recent } = await admin.from("optimizations").select("user_id").gte("created_at", since);
          const ids = Array.from(new Set((recent ?? []).map((r: any) => r.user_id)));
          if (ids.length === 0) return action === "audience_preview" ? j({ count: 0 }) : j({ ok: true, sent: 0 });
          q = q.in("user_id", ids);
        }
        const { data: profs, error } = await q;
        if (error) throw error;
        const list = profs ?? [];
        if (action === "audience_preview") return j({ count: list.length, sample: list.slice(0, 10) });

        if (!body.subject || !body.body) return j({ error: "subject and body required" }, 400);
        const { data: bc, error: bcErr } = await admin.from("broadcasts").insert({
          subject: String(body.subject).slice(0, 200),
          body: String(body.body),
          cta_label: body.cta_label ? String(body.cta_label) : null,
          cta_url: body.cta_url ? String(body.cta_url) : null,
          severity: ["info", "warn", "success"].includes(body.severity) ? body.severity : "info",
          segment, audience_count: list.length,
          created_by: user.email,
          ends_at: body.ends_at ? new Date(body.ends_at).toISOString() : null,
          status: "sent",
        }).select("id").single();
        if (bcErr) throw bcErr;
        // fan-out recipients in chunks
        const rows = list.map((p: any) => ({ broadcast_id: bc.id, user_id: p.user_id, email: p.email }));
        for (let i = 0; i < rows.length; i += 500) {
          await admin.from("broadcast_recipients").insert(rows.slice(i, i + 500));
        }
        await audit({ broadcast_id: bc.id, audience: list.length });
        return j({ ok: true, id: bc.id, sent: list.length });
      }

      case "cancel_broadcast": {
        const id = String(body.id || "");
        const { error } = await admin.from("broadcasts").update({ status: "cancelled", ends_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        await audit({ id });
        return j({ ok: true });
      }

      // ---------- COHORT RETENTION ----------
      case "cohort_retention": {
        const weeks = Math.min(Math.max(Number(body.weeks) || 8, 2), 16);
        const now = new Date();
        const firstWeek = startOfWeekUTC(addDays(now, -7 * (weeks - 1)));
        const [{ data: profs }, { data: acts }] = await Promise.all([
          admin.from("profiles").select("user_id,created_at").gte("created_at", firstWeek.toISOString()),
          admin.from("optimizations").select("user_id,created_at").gte("created_at", firstWeek.toISOString()),
        ]);
        // Build cohorts
        const cohortMap: Record<string, string[]> = {}; // weekLabel -> userIds
        (profs ?? []).forEach((p: any) => {
          const w = isoDay(startOfWeekUTC(new Date(p.created_at)));
          (cohortMap[w] ||= []).push(p.user_id);
        });
        const activityByUserWeek = new Map<string, Set<string>>();
        (acts ?? []).forEach((a: any) => {
          const w = isoDay(startOfWeekUTC(new Date(a.created_at)));
          const set = activityByUserWeek.get(w) || new Set<string>();
          set.add(a.user_id);
          activityByUserWeek.set(w, set);
        });
        const weekLabels: string[] = [];
        for (let i = 0; i < weeks; i++) weekLabels.push(isoDay(addDays(firstWeek, i * 7)));
        const cohorts = weekLabels.map((w) => {
          const users = cohortMap[w] || [];
          const size = users.length;
          const row: any = { cohort: w, size };
          weekLabels.forEach((w2, idx) => {
            if (w2 < w) { row[`w${idx}`] = null; return; }
            const offset = weekLabels.indexOf(w2) - weekLabels.indexOf(w);
            if (offset < 0) { row[`w${offset}`] = null; return; }
            const active = users.filter((u) => activityByUserWeek.get(w2)?.has(u)).length;
            row[`w${offset}`] = size ? +(active / size * 100).toFixed(1) : 0;
          });
          return row;
        });
        return j({ cohorts, weeks: weekLabels });
      }

      // ---------- REFERRALS ----------
      case "list_referrals": {
        const { data: refs, error } = await admin.from("referrals").select("*").order("created_at", { ascending: false }).limit(300);
        if (error) throw error;
        const ids = Array.from(new Set((refs ?? []).flatMap((r: any) => [r.referrer_user_id, r.referred_user_id])));
        const map: Record<string, any> = {};
        if (ids.length) {
          const { data: profs } = await admin.from("profiles").select("user_id,email,plan").in("user_id", ids);
          (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
        }
        // leaderboard
        const board: Record<string, { user_id: string; email?: string; invites: number; paid: number }> = {};
        (refs ?? []).forEach((r: any) => {
          const k = r.referrer_user_id;
          const rec = board[k] ||= { user_id: k, email: map[k]?.email, invites: 0, paid: 0 };
          rec.invites += 1;
          if (map[r.referred_user_id]?.plan && map[r.referred_user_id].plan !== "free") rec.paid += 1;
        });
        return j({
          referrals: (refs ?? []).map((r: any) => ({ ...r, referrer_email: map[r.referrer_user_id]?.email, referred_email: map[r.referred_user_id]?.email, referred_plan: map[r.referred_user_id]?.plan })),
          leaderboard: Object.values(board).sort((a, b) => b.invites - a.invites).slice(0, 25),
          total: (refs ?? []).length,
        });
      }

      // ---------- FEATURE FLAGS ----------
      case "list_flags": {
        const { data, error } = await admin.from("feature_flags").select("*").order("key");
        if (error) throw error;
        return j({ flags: data ?? [] });
      }

      case "upsert_flag": {
        const key = String(body.key || "").trim();
        if (!/^[a-z0-9_]{2,64}$/.test(key)) return j({ error: "key must be lowercase snake_case (2–64 chars)" }, 400);
        const patch = {
          key,
          description: body.description ? String(body.description) : null,
          enabled: !!body.enabled,
          plans: Array.isArray(body.plans) && body.plans.length ? body.plans.filter((p: any) => ["free", "basic", "pro"].includes(p)) : ["free", "basic", "pro"],
          rollout_percent: Math.max(0, Math.min(100, Math.floor(Number(body.rollout_percent) ?? 100))),
          updated_by: user.email,
        };
        const { error } = await admin.from("feature_flags").upsert(patch, { onConflict: "key" });
        if (error) return j({ error: error.message }, 400);
        await audit({ key, patch });
        return j({ ok: true });
      }

      case "delete_flag": {
        const key = String(body.key || "");
        const { error } = await admin.from("feature_flags").delete().eq("key", key);
        if (error) return j({ error: error.message }, 400);
        await audit({ key });
        return j({ ok: true });
      }

      // ---------- LEADS ----------
      case "list_leads": {
        const { data, error } = await admin.from("leads").select("*").order("created_at", { ascending: false }).limit(500);
        if (error) throw error;
        return j({ leads: data ?? [] });
      }

      case "update_lead": {
        const id = String(body.id || "");
        if (!id) return j({ error: "id required" }, 400);
        const patch: any = {};
        ["status", "notes", "granted"].forEach((k) => { if (body[k] !== undefined) patch[k] = body[k]; });
        if (Array.isArray(body.tags)) patch.tags = body.tags.slice(0, 20);
        const { error } = await admin.from("leads").update(patch).eq("id", id);
        if (error) return j({ error: error.message }, 400);
        await audit({ id, patch });
        return j({ ok: true });
      }

      case "delete_lead": {
        const id = String(body.id || "");
        const { error } = await admin.from("leads").delete().eq("id", id);
        if (error) return j({ error: error.message }, 400);
        await audit({ id });
        return j({ ok: true });
      }

      case "add_lead": {
        const email = String(body.email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return j({ error: "invalid email" }, 400);
        const { error } = await admin.from("leads").insert({ email, source: body.source || "manual" });
        if (error) return j({ error: error.message }, 400);
        await audit({ email });
        return j({ ok: true });
      }

      default: return j({ error: `unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});
