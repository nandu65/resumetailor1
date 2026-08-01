// Razorpay - Verify Payment Signature
// HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET) and compare to razorpay_signature.
// On success updates payments row and records coupon redemption.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function eq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!KEY_SECRET) return new Response(JSON.stringify({ error: "Razorpay secret not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(KEY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${razorpay_order_id}|${razorpay_payment_id}`));
    if (!eq(toHex(sig), String(razorpay_signature))) {
      // mark payment failed
      try {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await admin.from("payments").update({ status: "signature_failed", payment_id: razorpay_payment_id, error_desc: "signature mismatch" }).eq("order_id", razorpay_order_id);
      } catch { /* noop */ }
      return new Response(JSON.stringify({ success: false, error: "Signature mismatch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark paid + redeem coupon
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: pay } = await admin.from("payments").select("*").eq("order_id", razorpay_order_id).maybeSingle();
      if (pay) {
        await admin.from("payments").update({ status: "paid", payment_id: razorpay_payment_id, updated_at: new Date().toISOString() }).eq("order_id", razorpay_order_id);
        if (pay.coupon_code) {
          const { data: c } = await admin.from("coupons").select("id,used_count").eq("code", pay.coupon_code).maybeSingle();
          if (c) {
            await admin.from("coupons").update({ used_count: (c.used_count ?? 0) + 1 }).eq("id", c.id);
            await admin.from("coupon_redemptions").insert({
              coupon_id: c.id, code: pay.coupon_code, user_id: pay.user_id,
              order_id: razorpay_order_id, payment_id: razorpay_payment_id,
              discount_paise: pay.discount_paise ?? 0,
            });
          }
        }

        // ---- Custom offer fulfilment: grant the extra scans it was sold for ----
        const offerId = (pay.notes as any)?.offer_id;
        if (offerId) {
          const { data: offer } = await admin.from("custom_offers").select("*").eq("id", offerId).maybeSingle();
          if (offer && offer.status === "pending") {
            await admin.from("custom_offers").update({
              status: "paid",
              payment_id: razorpay_payment_id,
              order_id: razorpay_order_id,
              paid_at: new Date().toISOString(),
            }).eq("id", offer.id);

            const grant = Number(offer.scans ?? 0);
            if (grant > 0) {
              const { data: prof } = await admin.from("profiles")
                .select("scans_used_month,bonus_scans").eq("user_id", offer.user_id).maybeSingle();
              if (prof) {
                await admin.from("profiles").update({
                  scans_used_month: Math.max(0, (prof.scans_used_month ?? 0) - grant),
                  bonus_scans: (prof.bonus_scans ?? 0) + grant,
                }).eq("user_id", offer.user_id);
              }
            }
          }
        }
      }

    } catch (e) { console.error("verify update failed", e); }

    return new Response(JSON.stringify({ success: true, razorpay_order_id, razorpay_payment_id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("verify-payment error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
