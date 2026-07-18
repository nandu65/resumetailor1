// ATS scoring via Google Gemini 2.5 Flash (uses user's own GEMINI_API_KEY).
// Deterministic: temperature=0, topP=0, fixed prompt -> same input always returns same score.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logAiUsage, estimateTokens } from "../_shared/aiUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a strict, deterministic ATS (Applicant Tracking System) and senior technical recruiter.

Your job: score a resume against a job description from 0-100.

DETERMINISM RULES (critical):
- The SAME resume + SAME job description MUST always produce the SAME score.
- Score is a function of measurable signals only — do not vary by mood, phrasing, or randomness.
- Use the rubric below precisely.

SCORING RUBRIC (total 100):
1. Keyword & skill match (40 pts) — count required hard skills, tools, technologies, certifications named in the JD that appear (case-insensitive, stem-matched) in the resume. Score = (matched / total_required) * 40.
2. Experience relevance (20 pts) — does the resume show experience in the same role family, domain, and seniority the JD asks for? Years of experience match.
3. Quantified impact (15 pts) — bullets contain numbers, %, $, scale, time saved, users impacted.
4. Action verbs & clarity (10 pts) — bullets start with strong verbs (Led, Built, Launched, Reduced, Drove, Shipped).
5. Structure & ATS-readability (10 pts) — clear sections (Summary, Experience, Skills, Education), no tables/images implied, scannable bullets.
6. Education / certification fit (5 pts) — meets stated education or cert requirements.

Round the final score to the nearest integer.

Return ONLY valid JSON (no markdown fences, no commentary) in this exact shape:
{
  "score": <integer 0-100>,
  "matched_keywords": [<string>, ...],   // 6-15 important JD terms found in the resume
  "missing_keywords": [<string>, ...],   // 6-15 important JD terms NOT in the resume
  "improvements": [<string>, ...]        // exactly 5 specific, actionable improvements ranked by impact
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { resume, jobDescription } = await req.json();
    if (!resume || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Both 'resume' and 'jobDescription' are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userPrompt = `=== JOB DESCRIPTION ===
${jobDescription}

=== RESUME ===
${resume}

Apply the rubric strictly and return the JSON.`;

    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      GEMINI_API_KEY;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0,
          topP: 0,
          topK: 1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              score: { type: "integer" },
              matched_keywords: { type: "array", items: { type: "string" } },
              missing_keywords: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } },
            },
            required: ["score", "matched_keywords", "missing_keywords", "improvements"],
          },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error", geminiRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Gemini API error (${geminiRes.status})`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await geminiRes.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ??
      "";

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }

    if (!parsed || typeof parsed.score !== "number") {
      console.error("Failed to parse Gemini response:", text);
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini response", raw: text }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      matched_keywords: Array.isArray(parsed.matched_keywords) ? parsed.matched_keywords.slice(0, 15) : [],
      missing_keywords: Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords.slice(0, 15) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 5) : [],
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ats-score error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
