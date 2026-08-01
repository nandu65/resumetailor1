// Razorpay - Create Order
// Creates an order via Razorpay API, optionally applies a coupon,
// and logs the order into public.payments for admin analytics.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!KEY_ID || !KEY_SECRET) return j({ error: "Razorpay credentials not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    let amount = Number(body?.amount); // paise
    const currency = (body?.currency as string) || "INR";
    const receipt = (body?.receipt as string) || `rcpt_${Date.now()}`;
    const notes = { ...(body?.notes as Record<string, string> || {}) };
    const couponCode = String(body?.coupon || "").trim().toUpperCase();
    const tier = notes?.tier || null;
    const variant = notes?.variant || null;

    if (!Number.isFinite(amount) || amount < 100) return j({ error: "Amount must be >= 100 paise" }, 400);

    // Best-effort user resolution
    let userId: string | null = null;
    let email: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const uc = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await uc.auth.getUser();
      userId = user?.id ?? null;
      email = user?.email ?? null;
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // ---- COUPON ----
    let discount = 0;
    let couponRow: any = null;
    if (couponCode) {
      const { data: c } = await admin.from("coupons").select("*").eq("code", couponCode).maybeSingle();
      if (!c) return j({ error: "Invalid coupon" }, 400);
      if (!c.active) return j({ error: "Coupon is disabled" }, 400);
      if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) return j({ error: "Coupon expired" }, 400);
      if (c.max_uses && c.used_count >= c.max_uses) return j({ error: "Coupon usage limit reached" }, 400);
      if (c.applies_to !== "all" && tier && c.applies_to !== tier) return j({ error: `Coupon only valid for ${c.applies_to}` }, 400);
      discount = c.discount_type === "percent"
        ? Math.floor(amount * Math.min(100, c.discount_value) / 100)
        : Math.min(amount - 100, c.discount_value * 100); // discount_value in rupees
      if (discount < 0) discount = 0;
      amount = Math.max(100, amount - discount);
      couponRow = c;
      notes.coupon = couponCode;
      notes.discount_paise = String(discount);
    }

    // ---- CUSTOM OFFER (admin-issued personal price) ----
    let offerRow: any = null;
    const offerId = String(body?.offer_id || notes?.offer_id || "").trim();
    if (offerId) {
      if (!userId) return j({ error: "Sign in to pay this offer" }, 401);
      const { data: offer } = await admin.from("custom_offers").select("*").eq("id", offerId).maybeSingle();
      if (!offer) return j({ error: "Offer not found" }, 404);
      if (offer.user_id !== userId) return j({ error: "This offer belongs to another account" }, 403);
      if (offer.status !== "pending") return j({ error: `Offer is already ${offer.status}` }, 400);
      if (offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()) {
        await admin.from("custom_offers").update({ status: "expired" }).eq("id", offer.id);
        return j({ error: "Offer has expired" }, 400);
      }
      // Server is the source of truth for the price — ignore anything the client sent.
      amount = Number(offer.amount_paise);
      discount = 0;
      couponRow = null;
      offerRow = offer;
      notes.offer_id = offer.id;
      notes.offer_scans = String(offer.scans ?? 0);
    }

    const auth = btoa(`${KEY_ID}:${KEY_SECRET}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency, receipt, notes }),
    });
    const data = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("Razorpay create order failed:", data);
      return j({ error: data?.error?.description || "Failed to create order" }, rzpRes.status === 401 ? 401 : 500);
    }

    // Log payment row (best effort)
    try {
      await admin.from("payments").insert({
        user_id: userId,
        order_id: data.id,
        amount_paise: data.amount,
        currency: data.currency,
        status: "created",
        email,
        tier,
        variant,
        coupon_code: couponCode || null,
        discount_paise: discount,
        notes,
      });
    } catch (e) { console.error("payments insert failed", e); }

    return j({
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id: KEY_ID,
      discount_paise: discount,
      coupon: couponRow ? { code: couponRow.code, discount_type: couponRow.discount_type, discount_value: couponRow.discount_value } : null,
    });
  } catch (err) {
    console.error("create-order error:", err);
    return j({ error: (err as Error).message }, 500);
  }
});
