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
          admin.from("ai_usage_logs").select("feature,model,input_tokens,output_tokens,cost_inr,status,created_at").eq("user_id", target).order("created_at", { ascending: false }).limit(50),
          admin.from("pricing_experiments").select("variant,event,tier,created_at").eq("user_id", target).order("created_at", { ascending: false }).limit(30),
        ]);
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
          ai_logs: aiLogs ?? [],
          pricing_events: payments ?? [],
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

      default:
        return json({ error: `unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
