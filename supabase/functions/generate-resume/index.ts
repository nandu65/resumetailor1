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

    const { profile, targetJd = "" } = await req.json();
    if (!profile || typeof profile !== "object") {
      return new Response(JSON.stringify({ error: "profile required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const startedAt = Date.now();
    const model = "google/gemini-2.5-flash";
    const sysMsg = `You are an expert resume writer. Take the user's raw profile data and produce a polished, ATS-friendly resume as strict JSON.
Rules:
- Rewrite experience/project descriptions as strong bullet points (action verb + task + quantified result when possible).
- 3-5 bullets per role. Concise, no fluff, no first-person.
- Summary: 2-3 sentences, tailored to the target JD if provided.
- Skills: dedupe, group logically, keep concise.
- If a field is empty, return an empty string or empty array — never invent employers, dates, degrees, or metrics that weren't provided.
- Return ONLY valid JSON matching this shape:
{
 "name": string, "title": string, "email": string, "phone": string, "location": string, "links": [{"label": string, "url": string}],
 "summary": string,
 "experience": [{"company": string, "role": string, "location": string, "start": string, "end": string, "bullets": string[]}],
 "education": [{"school": string, "degree": string, "location": string, "start": string, "end": string, "details": string}],
 "projects": [{"name": string, "tech": string, "bullets": string[]}],
 "skills": [{"category": string, "items": string[]}],
 "certifications": string[]
}`;
    const userMsg = `RAW PROFILE INPUT:\n${JSON.stringify(profile, null, 2)}\n\nTARGET JOB DESCRIPTION (optional, tailor tone/keywords if present):\n${targetJd || "(none)"}\n\nReturn the JSON now.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: sysMsg },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI request failed");
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("No content returned");

    let resume: any;
    try { resume = JSON.parse(content); } catch { throw new Error("AI returned invalid JSON"); }

    const usage = aiData?.usage ?? {};
    logAiUsage({
      userId: userData.user.id,
      feature: "resume-builder",
      model,
      inputTokens: usage.prompt_tokens ?? estimateTokens(sysMsg + userMsg),
      outputTokens: usage.completion_tokens ?? estimateTokens(content),
      durationMs: Date.now() - startedAt,
    });

    return new Response(JSON.stringify({ resume }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
