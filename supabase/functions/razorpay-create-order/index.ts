// Razorpay - Create Order
// Creates an order via Razorpay API and returns order details + public key id.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!KEY_ID || !KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: "Razorpay credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount); // amount in paise
    const currency = (body?.currency as string) || "INR";
    const receipt =
      (body?.receipt as string) || `rcpt_${Date.now()}`;
    const notes = (body?.notes as Record<string, string>) || {};

    if (!Number.isFinite(amount) || amount < 100) {
      return new Response(
        JSON.stringify({ error: "Amount must be >= 100 paise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const auth = btoa(`${KEY_ID}:${KEY_SECRET}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency, receipt, notes }),
    });

    const data = await rzpRes.json();

    if (!rzpRes.ok) {
      console.error("Razorpay create order failed:", data);
      const status = rzpRes.status === 401 ? 401 : 500;
      return new Response(
        JSON.stringify({ error: data?.error?.description || "Failed to create order" }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        order_id: data.id,
        amount: data.amount,
        currency: data.currency,
        key_id: KEY_ID, // public, safe to send
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-order error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
