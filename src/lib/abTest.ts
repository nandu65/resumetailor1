import { supabase } from "@/integrations/supabase/client";

export type PricingVariant = "a49" | "b99" | "c149";

const VARIANTS: PricingVariant[] = ["a49", "b99", "c149"];
const KEY = "rs_pricing_variant_v1";
const SESSION_KEY = "rs_session_id_v1";

export function getPricingVariant(): PricingVariant {
  if (typeof window === "undefined") return "b99";
  let v = localStorage.getItem(KEY) as PricingVariant | null;
  if (!v || !VARIANTS.includes(v)) {
    v = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
    localStorage.setItem(KEY, v);
  }
  return v;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

export const PRO_PRICES: Record<PricingVariant, { display: string; amount: number }> = {
  a49: { display: "₹49", amount: 49 },
  b99: { display: "₹99", amount: 99 },
  c149: { display: "₹149", amount: 149 },
};

export async function trackPricingEvent(event: "view" | "click" | "success", tier?: string) {
  try {
    const variant = getPricingVariant();
    const session_id = getSessionId();
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("pricing_experiments").insert({
      variant,
      event,
      tier: tier ?? null,
      user_id: userData?.user?.id ?? null,
      session_id,
    });
  } catch (e) {
    // fail silently
    console.warn("A/B track failed", e);
  }
}
