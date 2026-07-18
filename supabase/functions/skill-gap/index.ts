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

    const { optimizationId } = await req.json();
    if (!optimizationId) return new Response(JSON.stringify({ error: "optimizationId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: opt } = await supabase.from("optimizations").select("*").eq("id", optimizationId).maybeSingle();
    if (!opt) throw new Error("Optimization not found");

    const startedAt = Date.now();
    const model = "google/gemini-2.5-flash";
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a career coach. Identify skill gaps between a resume and a target role, and recommend SPECIFIC, real, well-known courses, certifications, or learning resources. Prefer concrete names (e.g. 'AWS Certified Solutions Architect', 'Coursera: Deep Learning Specialization by Andrew Ng', 'freeCodeCamp Responsive Web Design')." },
          { role: "user", content: `RESUME:\n${opt.resume_text}\n\nJOB DESCRIPTION:\n${opt.job_description}\n\nMissing keywords from prior analysis: ${(opt.missing_keywords || []).join(", ")}\n\nIdentify skill gaps and recommend learning paths.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_skill_gaps",
            description: "Submit skill gap analysis",
            parameters: {
              type: "object",
              properties: {
                gaps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      skill: { type: "string" },
                      priority: { type: "string", enum: ["critical", "important", "nice-to-have"] },
                      why: { type: "string", description: "Why this matters for the role" },
                      time_to_learn: { type: "string", description: "Realistic estimate, e.g. '2 weeks', '3 months'" },
                      resources: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            type: { type: "string", enum: ["course", "certification", "book", "tutorial", "project"] },
                            provider: { type: "string", description: "e.g. Coursera, Udemy, AWS, freeCodeCamp" },
                            cost: { type: "string", description: "e.g. 'Free', '$49', '$300'" },
                          },
                          required: ["name", "type", "provider"],
                        },
                      },
                    },
                    required: ["skill", "priority", "why", "resources"],
                  },
                  description: "5-8 prioritized skill gaps with resources",
                },
              },
              required: ["gaps"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_skill_gaps" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI failed");
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned");
    const result = JSON.parse(toolCall.function.arguments);
    const usage = aiData?.usage ?? {};
    logAiUsage({
      userId: userData.user.id,
      feature: "skill-gap",
      model,
      inputTokens: usage.prompt_tokens ?? estimateTokens((opt.resume_text || "") + (opt.job_description || "")),
      outputTokens: usage.completion_tokens ?? estimateTokens(toolCall.function.arguments),
      durationMs: Date.now() - startedAt,
    });

    await supabase.from("optimizations").update({ skill_gaps: result.gaps }).eq("id", optimizationId);

    return new Response(JSON.stringify({ gaps: result.gaps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("skill-gap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
