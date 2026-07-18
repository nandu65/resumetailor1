import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logAiUsage, estimateTokens } from "../_shared/aiUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { url, optimizationId, company, role } = await req.json();

    let pageText = "";
    if (url) {
      try {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ResumeShot/1.0" } });
        const html = await r.text();
        pageText = html.replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ").trim().slice(0, 8000);
      } catch (e) {
        console.warn("Fetch failed:", e);
      }
    }

    const startedAt = Date.now();
    const model = "google/gemini-2.5-flash";
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You produce concise, structured company research briefs to help job applicants prepare. Be specific. If information is unknown, infer reasonably or omit." },
          { role: "user", content: `Company: ${company || "(infer from page)"}\nRole: ${role || "(infer)"}\n${url ? `Source URL: ${url}` : ""}\n\nPAGE CONTENT (may be partial):\n${pageText || "(no page content provided — use general knowledge)"}\n\nProduce a research brief.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_brief",
            description: "Submit the company research brief",
            parameters: {
              type: "object",
              properties: {
                company_name: { type: "string" },
                what_they_do: { type: "string", description: "1-2 sentence summary of the company" },
                industry: { type: "string" },
                size: { type: "string", description: "Approximate company size, e.g. '50-200 employees' or 'Public, ~10K employees'" },
                values: { type: "array", items: { type: "string" }, description: "3-5 core values or culture signals" },
                recent_news: { type: "array", items: { type: "string" }, description: "2-4 recent developments or notable facts" },
                role_focus: { type: "string", description: "What the role likely focuses on day-to-day" },
                interview_talking_points: { type: "array", items: { type: "string" }, description: "4-6 specific things to mention in interviews" },
                questions_to_ask: { type: "array", items: { type: "string" }, description: "3-5 thoughtful questions to ask the interviewer" },
              },
              required: ["company_name", "what_they_do", "values", "interview_talking_points", "questions_to_ask"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_brief" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI failed");
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No brief returned");
    const brief = JSON.parse(toolCall.function.arguments);
    const usage = aiData?.usage ?? {};
    logAiUsage({
      userId: userData.user.id,
      feature: "company-brief",
      model,
      inputTokens: usage.prompt_tokens ?? estimateTokens(pageText + (company || "") + (role || "")),
      outputTokens: usage.completion_tokens ?? estimateTokens(toolCall.function.arguments),
      durationMs: Date.now() - startedAt,
    });

    if (optimizationId) {
      await supabase.from("optimizations").update({ company_brief: brief }).eq("id", optimizationId);
    }

    return new Response(JSON.stringify({ brief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("company-brief error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
