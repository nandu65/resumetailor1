// Admin — Financial ops: payment log, coupons, invoice resend, revenue breakdown.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ADMIN_EMAIL = "nandunaidu656565@gmail.com";
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function rzpAuth() {
  const id = Deno.env.get("RAZORPAY_KEY_ID"); const sec = Deno.env.get("RAZORPAY_KEY_SECRET");
  return "Basic " + btoa(`${id}:${sec}`);
}

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
      // ---------- PAYMENTS LOG ----------
      case "list_payments": {
        const limit = Math.min(Number(body.limit) || 200, 500);
        const status = body.status ? String(body.status) : null;
        let q = admin.from("payments").select("*").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        if (body.q) {
          const s = String(body.q);
          q = q.or(`order_id.ilike.%${s}%,payment_id.ilike.%${s}%,email.ilike.%${s}%,coupon_code.ilike.%${s}%`);
        }
        const { data, error } = await q;
        if (error) throw error;
        return j({ payments: data ?? [] });
      }

      case "retry_payment": {
        // Fetch order from Razorpay so admin can share a fresh payment link.
        const order_id = String(body.order_id || "");
        if (!order_id) return j({ error: "order_id required" }, 400);
        const r = await fetch(`https://api.razorpay.com/v1/orders/${order_id}`, { headers: { Authorization: rzpAuth() } });
        const data = await r.json();
        if (!r.ok) return j({ error: data?.error?.description || "Fetch failed" }, 400);
        await admin.from("payments").update({ retried_at: new Date().toISOString() }).eq("order_id", order_id);
        await audit({ order_id, amount: data.amount });
        // Build a hosted checkout link (public order URL)
        const link = `https://checkout.razorpay.com/v1/checkout.html?order_id=${order_id}&key_id=${Deno.env.get("RAZORPAY_KEY_ID")}`;
        return j({ ok: true, order: data, checkout_link: link });
      }

      case "resend_invoice": {
        const payment_id = String(body.payment_id || "");
        if (!payment_id) return j({ error: "payment_id required" }, 400);
        // Try Razorpay invoice-by-payment; if not present, create a hosted invoice via /invoices.
        const p = await fetch(`https://api.razorpay.com/v1/payments/${payment_id}`, { headers: { Authorization: rzpAuth() } });
        const payment = await p.json();
        if (!p.ok) return j({ error: payment?.error?.description || "Payment not found" }, 400);

        // Create a receipt-style invoice
        const inv = await fetch("https://api.razorpay.com/v1/invoices", {
          method: "POST",
          headers: { Authorization: rzpAuth(), "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "invoice",
            customer: { email: payment.email, contact: payment.contact, name: payment.notes?.name || "Customer" },
            line_items: [{ name: payment.description || "ResumeShot Pro", amount: payment.amount, currency: payment.currency, quantity: 1 }],
            sms_notify: 1, email_notify: 1,
            notes: { original_payment_id: payment_id },
          }),
        });
        const invData = await inv.json();
        if (!inv.ok) return j({ error: invData?.error?.description || "Invoice create failed" }, 400);
        await admin.from("payments").update({ invoice_id: invData.id }).eq("payment_id", payment_id);
        await audit({ payment_id, invoice_id: invData.id });
        return j({ ok: true, invoice: invData, short_url: invData.short_url });
      }

      case "revenue_breakdown": {
        const days = Math.min(Math.max(Number(body.days) || 30, 1), 365);
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const [{ data: pays }, { data: profs }, { data: exps }] = await Promise.all([
          admin.from("payments").select("amount_paise,discount_paise,status,variant,tier,coupon_code,user_id,created_at").gte("created_at", since),
          admin.from("profiles").select("user_id,country,acquisition_source,utm_source,utm_medium,utm_campaign"),
          admin.from("pricing_experiments").select("user_id,variant,event"),
        ]);
        const profMap: Record<string, any> = {};
        (profs ?? []).forEach((p: any) => { profMap[p.user_id] = p; });

        const paid = (pays ?? []).filter((p: any) => p.status === "paid");
        const byVariant: Record<string, { revenue: number; count: number }> = {};
        const byCountry: Record<string, { revenue: number; count: number }> = {};
        const bySource: Record<string, { revenue: number; count: number }> = {};
        const byCampaign: Record<string, { revenue: number; count: number }> = {};
        let gross = 0, disc = 0;
        paid.forEach((p: any) => {
          const rev = (p.amount_paise ?? 0) / 100;
          gross += rev; disc += (p.discount_paise ?? 0) / 100;
          const v = p.variant || "unknown";
          byVariant[v] = { revenue: (byVariant[v]?.revenue || 0) + rev, count: (byVariant[v]?.count || 0) + 1 };
          const pr = profMap[p.user_id] || {};
          const country = pr.country || "Unknown";
          byCountry[country] = { revenue: (byCountry[country]?.revenue || 0) + rev, count: (byCountry[country]?.count || 0) + 1 };
          const src = pr.utm_source || pr.acquisition_source || "direct";
          bySource[src] = { revenue: (bySource[src]?.revenue || 0) + rev, count: (bySource[src]?.count || 0) + 1 };
          const camp = pr.utm_campaign || "—";
          byCampaign[camp] = { revenue: (byCampaign[camp]?.revenue || 0) + rev, count: (byCampaign[camp]?.count || 0) + 1 };
        });
        const asRows = (o: Record<string, any>) =>
          Object.entries(o).map(([k, v]) => ({ key: k, revenue: +v.revenue.toFixed(2), count: v.count })).sort((a, b) => b.revenue - a.revenue);
        return j({
          gross: +gross.toFixed(2), discount: +disc.toFixed(2), paid_count: paid.length,
          byVariant: asRows(byVariant), byCountry: asRows(byCountry), bySource: asRows(bySource), byCampaign: asRows(byCampaign),
        });
      }

      // ---------- COUPONS ----------
      case "list_coupons": {
        const { data, error } = await admin.from("coupons").select("*").order("created_at", { ascending: false }).limit(200);
        if (error) throw error;
        return j({ coupons: data ?? [] });
      }

      case "create_coupon": {
        const code = String(body.code || "").trim().toUpperCase();
        if (!/^[A-Z0-9_-]{4,32}$/.test(code)) return j({ error: "Code must be 4–32 chars, letters/numbers only" }, 400);
        const patch = {
          code,
          discount_type: body.discount_type === "flat" ? "flat" : "percent",
          discount_value: Math.max(1, Math.floor(Number(body.discount_value) || 0)),
          applies_to: ["all", "pro", "basic"].includes(body.applies_to) ? body.applies_to : "all",
          max_uses: body.max_uses ? Math.max(1, Math.floor(Number(body.max_uses))) : null,
          expires_at: body.expires_at ? new Date(body.expires_at).toISOString() : null,
          active: body.active !== false,
          notes: body.notes ? String(body.notes) : null,
          created_by: user.email,
        };
        const { error } = await admin.from("coupons").insert(patch);
        if (error) return j({ error: error.message }, 400);
        await audit({ code });
        return j({ ok: true });
      }

      case "update_coupon": {
        const id = String(body.id || "");
        if (!id) return j({ error: "id required" }, 400);
        const patch: any = {};
        ["active", "notes", "max_uses", "expires_at", "applies_to", "discount_value", "discount_type"].forEach((k) => {
          if (body[k] !== undefined) patch[k] = body[k];
        });
        if (patch.expires_at) patch.expires_at = new Date(patch.expires_at).toISOString();
        const { error } = await admin.from("coupons").update(patch).eq("id", id);
        if (error) return j({ error: error.message }, 400);
        await audit({ id, patch });
        return j({ ok: true });
      }

      case "delete_coupon": {
        const id = String(body.id || "");
        if (!id) return j({ error: "id required" }, 400);
        const { error } = await admin.from("coupons").delete().eq("id", id);
        if (error) return j({ error: error.message }, 400);
        await audit({ id });
        return j({ ok: true });
      }

      case "coupon_stats": {
        const { data, error } = await admin.from("coupon_redemptions").select("code,discount_paise,created_at").order("created_at", { ascending: false }).limit(500);
        if (error) throw error;
        const totals: Record<string, { count: number; discount: number }> = {};
        (data ?? []).forEach((r: any) => {
          const k = r.code;
          totals[k] = { count: (totals[k]?.count || 0) + 1, discount: (totals[k]?.discount || 0) + (r.discount_paise || 0) / 100 };
        });
        return j({ redemptions: data ?? [], totals });
      }

      default: return j({ error: `unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});
