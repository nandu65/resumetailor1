import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { optimizationId, tone = "professional" } = await req.json();
    if (!optimizationId) {
      return new Response(JSON.stringify({ error: "optimizationId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: opt, error: optErr } = await supabase
      .from("optimizations").select("*").eq("id", optimizationId).maybeSingle();
    if (optErr || !opt) throw new Error("Optimization not found");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You write tailored cover letters that hiring managers love. Tone: ${tone}. Use 3-4 short paragraphs. Open with hook, body shows fit using specific resume points + JD keywords, close with confident call to action. Plain prose, no markdown, no placeholders like [Company].` },
          { role: "user", content: `RESUME:\n${opt.resume_text}\n\nJOB DESCRIPTION:\n${opt.job_description}\n\nCompany: ${opt.company || "the company"}\nRole: ${opt.role || "this role"}\n\nWrite the cover letter.` },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI request failed");
    }

    const aiData = await aiResp.json();
    const coverLetter = aiData.choices?.[0]?.message?.content?.trim();
    if (!coverLetter) throw new Error("No cover letter returned");

    await supabase.from("optimizations").update({ cover_letter: coverLetter }).eq("id", optimizationId);

    return new Response(JSON.stringify({ cover_letter: coverLetter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cover-letter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
