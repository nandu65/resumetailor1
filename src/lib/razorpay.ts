import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(
      `script[src="${SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface PayOptions {
  /** Amount in rupees (will be converted to paise). */
  amountInRupees: number;
  currency?: string;
  receipt?: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
}

export interface PayResult {
  success: boolean;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  error?: string;
}

export async function payWithRazorpay(opts: PayOptions): Promise<PayResult> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    return { success: false, error: "Failed to load Razorpay checkout" };
  }

  const amount = Math.round(opts.amountInRupees * 100);
  if (amount < 100) {
    return { success: false, error: "Amount must be at least ₹1" };
  }

  // 1) Create order
  const { data: orderData, error: orderErr } = await supabase.functions.invoke(
    "razorpay-create-order",
    {
      body: {
        amount,
        currency: opts.currency ?? "INR",
        receipt: opts.receipt,
        notes: opts.notes,
      },
    },
  );

  if (orderErr || !orderData?.order_id) {
    return {
      success: false,
      error: orderErr?.message || orderData?.error || "Could not create order",
    };
  }

  // 2) Open Razorpay modal & verify on success
  return new Promise<PayResult>((resolve) => {
    const rzp = new window.Razorpay({
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.order_id,
      name: opts.name ?? "ResumeTailor",
      description: opts.description ?? "Pro · Lifetime",
      prefill: opts.prefill ?? {},
      notes: opts.notes ?? {},
      theme: opts.theme ?? { color: "#6366f1" },
      modal: {
        ondismiss: () =>
          resolve({ success: false, error: "Payment cancelled" }),
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        const { data: verifyData, error: verifyErr } =
          await supabase.functions.invoke("razorpay-verify-payment", {
            body: response,
          });

        if (verifyErr || !verifyData?.success) {
          resolve({
            success: false,
            error:
              verifyErr?.message ||
              verifyData?.error ||
              "Signature verification failed",
          });
          return;
        }

        resolve({
          success: true,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
        });
      },
    });

    rzp.on("payment.failed", (resp: any) => {
      resolve({
        success: false,
        error: resp?.error?.description || "Payment failed",
      });
    });

    rzp.open();
  });
}

// ---------- Subscriptions (autopay) ----------

export interface SubscribeOptions {
  tier: "basic" | "pro";
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
}

export interface SubscribeResult {
  success: boolean;
  razorpay_payment_id?: string;
  razorpay_subscription_id?: string;
  error?: string;
}

export async function subscribeWithRazorpay(
  opts: SubscribeOptions,
): Promise<SubscribeResult> {
  const loaded = await loadRazorpayScript();
  if (!loaded) return { success: false, error: "Failed to load Razorpay" };

  const { data, error } = await supabase.functions.invoke(
    "razorpay-create-subscription",
    { body: { tier: opts.tier } },
  );

  if (error || !data?.subscription_id) {
    return {
      success: false,
      error: error?.message || data?.error || "Could not start subscription",
    };
  }

  return new Promise<SubscribeResult>((resolve) => {
    const rzp = new window.Razorpay({
      key: data.key_id,
      subscription_id: data.subscription_id,
      name: opts.name ?? "ResumeTailor",
      description:
        opts.description ??
        (opts.tier === "pro"
          ? "Pro · ₹99/month (autopay)"
          : "Basic · ₹49/month (autopay)"),
      prefill: opts.prefill ?? { email: data.email },
      theme: opts.theme ?? { color: "#6366f1" },
      modal: {
        ondismiss: () =>
          resolve({ success: false, error: "Checkout cancelled" }),
      },
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_subscription_id: string;
        razorpay_signature: string;
      }) => {
        // For subscriptions, plan activation is confirmed by the webhook
        // (subscription.activated / subscription.charged). The handler just
        // confirms the auth/charge succeeded client-side.
        resolve({
          success: true,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_subscription_id: response.razorpay_subscription_id,
        });
      },
    });

    rzp.on("payment.failed", (resp: any) => {
      resolve({
        success: false,
        error: resp?.error?.description || "Payment failed",
      });
    });

    rzp.open();
  });
}

