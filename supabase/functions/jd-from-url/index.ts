// Fetch a job posting URL and extract a clean job description using Gemini.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logAiUsage, estimateTokens } from "../_shared/aiUsage.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "Provide a valid http(s) URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ResumeShotBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Could not fetch page (HTTP ${resp.status}). LinkedIn/Naukri may block scraping — paste the JD instead.` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const html = await resp.text();
    let text = stripHtml(html);
    if (text.length < 200) {
      return new Response(JSON.stringify({ error: "Page had no readable content. Paste the JD manually." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Cap to keep costs low
    if (text.length > 20000) text = text.slice(0, 20000);

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      // Fallback: return raw stripped text
      return new Response(JSON.stringify({ jobDescription: text, title: null, company: null, source: "raw" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `From the raw web page text below, extract ONLY the job description. Remove navigation, cookie banners, ads, "similar jobs", footers, and application forms. Preserve responsibilities, requirements, skills, tech stack, benefits. Return strict JSON: {"title": string|null, "company": string|null, "jobDescription": string}. Keep jobDescription as plain text with newlines between sections.\n\nPAGE TEXT:\n${text}`;

    const startedAt = Date.now();
    const gr = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + geminiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    });
    if (!gr.ok) {
      const errText = await gr.text();
      console.error("Gemini error", gr.status, errText);
      return new Response(JSON.stringify({ jobDescription: text, title: null, company: null, source: "raw" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const gj = await gr.json();
    const raw = gj?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { jobDescription: text }; }

    // Log usage
    let callerId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
        const { data: u } = await sb.auth.getUser();
        callerId = u?.user?.id ?? null;
      } catch { /* ignore */ }
    }
    const usage = gj?.usageMetadata ?? {};
    logAiUsage({
      userId: callerId,
      feature: "jd-from-url",
      model: "gemini-flash-latest",
      inputTokens: usage.promptTokenCount ?? estimateTokens(prompt),
      outputTokens: usage.candidatesTokenCount ?? estimateTokens(raw),
      durationMs: Date.now() - startedAt,
    });

    return new Response(JSON.stringify({
      title: parsed.title ?? null,
      company: parsed.company ?? null,
      jobDescription: parsed.jobDescription ?? text,
      source: "gemini",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("jd-from-url error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
