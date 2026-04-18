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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { resume, jobDescription, rewriteLevel = "balanced", title } = await req.json();
    if (!resume || !jobDescription) {
      return new Response(JSON.stringify({ error: "Resume and job description are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const levelGuidance: Record<string, string> = {
      light: "LIGHT POLISH: Make minimal edits — fix grammar, add 1-2 missing keywords, slight rephrasing only. Preserve original voice.",
      balanced: "BALANCED REWRITE: Rewrite bullets with strong action verbs and metrics, weave in JD keywords naturally.",
      aggressive: "AGGRESSIVE REWRITE: Heavily restructure bullets for maximum ATS match — assume metrics where reasonable, lead with JD keywords, transform weak bullets dramatically.",
    };
    const level = levelGuidance[rewriteLevel] ?? levelGuidance.balanced;

    const systemPrompt = `You are an expert ATS and resume optimization specialist. Analyze the resume against the job description and return structured tailoring advice. ${level} Be specific, actionable, and concise.`;

    const userPrompt = `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nAnalyze the match and provide tailoring recommendations using the rewrite intensity above.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_resume_analysis",
            description: "Submit the structured resume tailoring analysis",
            parameters: {
              type: "object",
              properties: {
                ats_score: { type: "number", description: "ATS match score from 0-100" },
                company: { type: "string", description: "Company name extracted from JD, or empty if unknown" },
                role: { type: "string", description: "Job title extracted from JD" },
                missing_keywords: { type: "array", items: { type: "string" }, description: "Important keywords from the JD missing in the resume" },
                keyword_density: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      keyword: { type: "string" },
                      jd_count: { type: "number", description: "Times keyword appears in JD" },
                      resume_count: { type: "number", description: "Times keyword appears in resume" },
                      importance: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["keyword", "jd_count", "resume_count", "importance"],
                  },
                  description: "8-15 most important JD keywords with density comparison",
                },
                professional_summary: { type: "string", description: "A tailored 3-4 sentence professional summary" },
                improved_bullets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      original: { type: "string" },
                      improved: { type: "string" },
                    },
                    required: ["original", "improved"],
                  },
                  description: "5-8 improved work experience bullet points",
                },
                skills_to_add: { type: "array", items: { type: "string" }, description: "Skills to add to the resume from the JD" },
              },
              required: ["ats_score", "missing_keywords", "keyword_density", "professional_summary", "improved_bullets", "skills_to_add", "company", "role"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_resume_analysis" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Lovable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await aiResp.text();
      console.error("AI error:", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned");
    const analysis = JSON.parse(toolCall.function.arguments);

    const finalTitle = title?.trim() ||
      [analysis.company, analysis.role].filter(Boolean).join(" – ") ||
      `Tailored ${new Date().toLocaleDateString()}`;

    const { data: opt, error: insertErr } = await supabase
      .from("optimizations")
      .insert({
        user_id: userId,
        resume_text: resume,
        job_description: jobDescription,
        rewrite_level: rewriteLevel,
        title: finalTitle,
        company: analysis.company || null,
        role: analysis.role || null,
        ats_score: analysis.ats_score,
        missing_keywords: analysis.missing_keywords,
        keyword_density: analysis.keyword_density,
        professional_summary: analysis.professional_summary,
        improved_bullets: analysis.improved_bullets,
        skills_to_add: analysis.skills_to_add,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      throw insertErr;
    }

    return new Response(JSON.stringify({ optimization: opt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
