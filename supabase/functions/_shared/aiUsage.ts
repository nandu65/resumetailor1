// Shared helper to log AI usage (tokens + INR cost) for admin monitoring.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Prices in USD per 1M tokens -> INR per token
const USD_TO_INR = 83;
const PRICES: Record<string, { in: number; out: number }> = {
  // Gemini via Lovable Gateway / Google
  "google/gemini-2.5-flash":       { in: 0.30, out: 2.50 },
  "google/gemini-2.5-flash-lite":  { in: 0.10, out: 0.40 },
  "google/gemini-3-flash-preview": { in: 0.30, out: 2.50 },
  "gemini-2.5-flash":              { in: 0.30, out: 2.50 },
  "gemini-2.5-flash-lite":         { in: 0.10, out: 0.40 },
};

function priceFor(model: string) {
  return PRICES[model] ?? PRICES["gemini-2.5-flash"];
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function computeCostInr(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceFor(model);
  const usd = (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
  return +(usd * USD_TO_INR).toFixed(6);
}

export interface LogArgs {
  userId?: string | null;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  status?: "success" | "error";
  durationMs?: number;
}

export async function logAiUsage(args: LogArgs) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return;
    const admin = createClient(supabaseUrl, serviceKey);

    let plan: string | null = null;
    if (args.userId) {
      const { data } = await admin
        .from("profiles")
        .select("plan")
        .eq("user_id", args.userId)
        .maybeSingle();
      plan = (data?.plan as string) ?? null;
    }

    const cost = computeCostInr(args.model, args.inputTokens, args.outputTokens);

    await admin.from("ai_usage_logs").insert({
      user_id: args.userId ?? null,
      plan,
      feature: args.feature,
      model: args.model,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      cost_inr: cost,
      status: args.status ?? "success",
      duration_ms: args.durationMs ?? null,
    });
  } catch (e) {
    console.error("logAiUsage failed", e);
  }
}
