import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gauge, Target, Wand2, Sparkles, Loader2, TrendingUp, TrendingDown, Minus, Lock, Zap, Wand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AtsResult {
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  improvements: string[];
}

// Stable key for "same JD" tracking so we can show improvement vs the original.
function jdKey(jd: string) {
  return jd.trim().replace(/\s+/g, " ").slice(0, 400).toLowerCase();
}

// Per-JD baseline persisted across reloads.
function loadBaseline(jd: string): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(`ats-baseline:${jdKey(jd)}`);
  return v ? Number(v) : null;
}
function saveBaseline(jd: string, score: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`ats-baseline:${jdKey(jd)}`, String(score));
}

const SAMPLE_RESUME = `Alex Morgan — Senior Software Engineer
San Francisco, CA · alex.morgan@example.com · linkedin.com/in/alexmorgan

SUMMARY
Full-stack engineer with 6+ years building scalable React + Node platforms used by millions. Deep AWS + PostgreSQL experience.

EXPERIENCE
Acme Corp — Senior Software Engineer (Jan 2022 – Present)
- Led migration from monolith to microservices, cut deploy time by 70%.
- Built real-time analytics pipeline processing 5M events/day on AWS.
- Mentored 6 engineers; introduced code-review standards adopted org-wide.

Northwind Labs — Software Engineer (Jun 2019 – Dec 2021)
- Built customer dashboard in React + TypeScript, boosted retention by 18%.
- Owned CI/CD in GitHub Actions, reduced flaky failures from 12% to 1%.

EDUCATION
UC Berkeley — B.S. Computer Science, 2019

SKILLS
React, TypeScript, Node.js, PostgreSQL, Redis, AWS, Docker, GraphQL`;

const SAMPLE_JD = `We are hiring a Senior Software Engineer to build and scale our React + Node platform (used by 2M+ users).
Responsibilities: architect microservices, own CI/CD, mentor engineers, drive code quality.
Must have: 5+ years JS/TS, React, Node.js, PostgreSQL, AWS, Docker. Nice to have: Kubernetes, GraphQL, event-driven systems.`;

export default function KeywordDensityTool() {
  const navigate = useNavigate();
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<AtsResult | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const score = result?.score ?? 0;
  const scoreColor = score >= 75 ? "text-primary" : score >= 50 ? "text-warning" : "text-destructive";
  const delta = result && previousScore != null ? score - previousScore : null;

  const runScore = async () => {
    if (!resume.trim() || !jd.trim()) return;
    setLoading(true);

    // Capture baseline BEFORE this run so we can show improvement.
    const baseline = loadBaseline(jd);
    setPreviousScore(baseline);

    try {
      const { data, error } = await supabase.functions.invoke("ats-score", {
        body: { resume, jobDescription: jd },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const r = data as AtsResult;
      setResult(r);

      // First scan for this JD becomes the baseline; subsequent scans are compared to it.
      if (baseline == null) saveBaseline(jd, r.score);

      toast({
        title: "ATS score ready",
        description: baseline == null
          ? `Baseline set at ${r.score}/100`
          : `${r.score}/100 (${r.score - baseline >= 0 ? "+" : ""}${r.score - baseline} vs original)`,
      });
    } catch (e: any) {
      toast({ title: "Scoring failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetBaseline = () => {
    if (!jd.trim()) return;
    localStorage.removeItem(`ats-baseline:${jdKey(jd)}`);
    setPreviousScore(null);
    toast({ title: "Baseline cleared", description: "Next scan will set a new original score." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
            <Gauge className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">ATS Score & Keyword Meter</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Powered by Gemini 2.5 Flash · Deterministic scoring · Tracks improvement vs your original
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <Label className="text-xs">Resume</Label>
            <Textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume..."
              className="mt-1.5 min-h-[240px] font-mono text-xs"
            />
          </div>
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <Label className="text-xs">Job description</Label>
            <Textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste JD..."
              className="mt-1.5 min-h-[240px]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 flex-wrap">
          {jd.trim() && loadBaseline(jd) != null && (
            <Button variant="ghost" onClick={resetBaseline} className="h-12">
              Reset baseline
            </Button>
          )}
          <Button
            onClick={runScore}
            size="lg"
            disabled={!resume.trim() || !jd.trim() || loading}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-8"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {loading ? "Scoring with Gemini…" : "Analyze ATS Score"}
          </Button>
        </div>

        {result && (
          <>
            <div className="mt-8 grid lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3 rounded-2xl border border-border bg-gradient-card p-7 shadow-card flex items-center gap-7">
                <div className="relative h-32 w-32 shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 264} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`font-display text-4xl font-extrabold ${scoreColor}`}>{score}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      / 100
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Target className="h-3.5 w-3.5" /> ATS Match Score
                  </div>
                  <h2 className="font-display text-2xl font-bold mt-2">
                    {score >= 80
                      ? "Strong match"
                      : score >= 65
                      ? "Good — push it higher"
                      : score >= 45
                      ? "Needs more tailoring"
                      : "Significant gaps"}
                  </h2>
                  {delta != null ? (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-sm">
                      {delta > 0 ? (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      ) : delta < 0 ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold">
                        {delta > 0 ? `+${delta}` : delta} pts
                      </span>
                      <span className="text-muted-foreground">vs original ({previousScore})</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      First scan — saved as your baseline. Re-scan an optimized version to see improvement.
                    </p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-border bg-gradient-card p-7 shadow-card">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Scored by
                </div>
                <div className="font-display text-xl font-bold mt-2">Google Gemini 2.5 Flash</div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Deterministic settings (temperature 0). Same resume + same JD always returns the same score.
                </p>
              </div>
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary mb-3">
                  Matched keywords ({result.matched_keywords.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.matched_keywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
                    >
                      {k}
                    </span>
                  ))}
                  {result.matched_keywords.length === 0 && (
                    <span className="text-xs text-muted-foreground">None detected</span>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="text-xs font-semibold uppercase tracking-wide text-destructive mb-3">
                  Missing keywords ({result.missing_keywords.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.missing_keywords.slice(0, 3).map((k) => (
                    <span
                      key={k}
                      className="inline-flex rounded-full border border-destructive/30 bg-destructive/5 text-foreground/80 px-2.5 py-0.5 text-xs font-medium"
                    >
                      {k}
                    </span>
                  ))}
                  {result.missing_keywords.slice(3).map((k, i) => (
                    <span
                      key={`locked-${i}`}
                      className="relative inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium select-none"
                    >
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="blur-sm">{k}</span>
                    </span>
                  ))}
                  {result.missing_keywords.length === 0 && (
                    <span className="text-xs text-muted-foreground">None — great coverage!</span>
                  )}
                </div>
              </div>
            </div>

            {(result.improvements.length > 0 || result.missing_keywords.length > 3) && (
              <div className="mt-6 rounded-2xl border border-primary/40 bg-gradient-card p-6 shadow-card relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
                    <Wand2 className="h-4 w-4" />
                  </div>
                  <h3 className="font-display font-semibold">Top ways to improve</h3>
                </div>
                <ol className="space-y-2.5">
                  {result.improvements.slice(0, 1).map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                  {result.improvements.slice(1).map((r, i) => (
                    <li key={`locked-imp-${i}`} className="flex gap-3 text-sm">
                      <span className="h-6 w-6 shrink-0 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center">
                        <Lock className="h-3 w-3" />
                      </span>
                      <span className="leading-relaxed blur-sm select-none">{r}</span>
                    </li>
                  ))}
                </ol>

                {(() => {
                  const hiddenIssues =
                    Math.max(0, result.missing_keywords.length - 3) +
                    Math.max(0, result.improvements.length - 1);
                  if (hiddenIssues === 0) return null;
                  return (
                    <div className="mt-6 rounded-xl border border-primary/40 bg-background/70 backdrop-blur p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-display font-semibold text-base">
                            {hiddenIssues} more critical issues found
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Unlock every missing keyword & rewrite suggestion.
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-stretch sm:items-end gap-1 w-full sm:w-auto">
                        <Button
                          onClick={() => navigate("/pricing")}
                          size="lg"
                          className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-11 px-5"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Fix all issues for ₹99
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center sm:text-right">
                          One job offer pays for this 1000x over.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
