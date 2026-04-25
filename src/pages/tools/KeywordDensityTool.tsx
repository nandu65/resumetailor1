import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gauge, Target, Wand2, Sparkles, Loader2, TrendingUp, TrendingDown, Minus, Lock, Zap } from "lucide-react";
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

export default function KeywordDensityTool() {
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
                  {result.missing_keywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex rounded-full border border-destructive/30 bg-destructive/5 text-foreground/80 px-2.5 py-0.5 text-xs font-medium"
                    >
                      {k}
                    </span>
                  ))}
                  {result.missing_keywords.length === 0 && (
                    <span className="text-xs text-muted-foreground">None — great coverage!</span>
                  )}
                </div>
              </div>
            </div>

            {result.improvements.length > 0 && (
              <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-card p-6 shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
                    <Wand2 className="h-4 w-4" />
                  </div>
                  <h3 className="font-display font-semibold">Top ways to improve</h3>
                </div>
                <ol className="space-y-2.5">
                  {result.improvements.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
