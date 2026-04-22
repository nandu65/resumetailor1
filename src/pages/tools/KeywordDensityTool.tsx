import { useMemo, useState } from "react";
import { Gauge, TrendingUp, Award, Target, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { computeAtsScore } from "@/lib/atsScore";

export default function KeywordDensityTool() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [submission, setSubmission] = useState<{ resume: string; jd: string } | null>(null);

  const result = useMemo(() => {
    if (!submission) return null;
    return computeAtsScore(submission.resume, submission.jd);
  }, [submission]);

  const score = result?.ats_score ?? 0;
  const recruiter = result?.recruiter_score ?? 0;
  const scoreColor = score >= 75 ? "text-primary" : score >= 50 ? "text-warning" : "text-destructive";

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
            <p className="text-muted-foreground text-sm mt-1">Weighted scoring across 6 categories — recomputed every run.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <Label className="text-xs">Resume</Label>
            <Textarea value={resume} onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume..." className="mt-1.5 min-h-[240px] font-mono text-xs" />
          </div>
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <Label className="text-xs">Job description</Label>
            <Textarea value={jd} onChange={(e) => setJd(e.target.value)}
              placeholder="Paste JD..." className="mt-1.5 min-h-[240px]" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => setSubmission({ resume, jd })} size="lg"
            disabled={!resume.trim() || !jd.trim()}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-8">
            Analyze score
          </Button>
        </div>

        {result && (
          <>
            <div className="mt-8 grid lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3 rounded-2xl border border-border bg-gradient-card p-7 shadow-card flex items-center gap-7">
                <div className="relative h-32 w-32 shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                    <circle cx="50" cy="50" r="42" stroke="hsl(var(--primary))" strokeWidth="8" fill="none"
                      strokeLinecap="round" strokeDasharray={`${(score / 100) * 264} 264`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`font-display text-4xl font-extrabold ${scoreColor}`}>{score}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">/ 100</div>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Target className="h-3.5 w-3.5" /> ATS Match Score
                  </div>
                  <h2 className="font-display text-2xl font-bold mt-2">
                    {score >= 80 ? "Strong match" : score >= 65 ? "Good — push it higher" : score >= 45 ? "Needs more tailoring" : "Significant gaps"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Edit your resume and re-run — the score updates based on real changes.
                  </p>
                </div>
              </div>
              <div className="lg:col-span-2 rounded-2xl border border-border bg-gradient-card p-7 shadow-card">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Award className="h-3.5 w-3.5" /> Recruiter Appeal
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <div className="font-display text-4xl font-extrabold text-foreground">{recruiter}</div>
                  <div className="text-sm text-muted-foreground">/ 100</div>
                </div>
                <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: `${recruiter}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-3">Verbs, metrics, clarity — recruiter-readable signals.</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-display font-semibold">Score breakdown</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {result.breakdown.map((c) => {
                  const pct = c.max ? (c.score / c.max) * 100 : 0;
                  const tone = pct >= 75 ? "bg-primary" : pct >= 45 ? "bg-warning" : "bg-destructive";
                  return (
                    <div key={c.key} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <div className="text-sm font-semibold">{c.label}</div>
                        <div className="text-sm tabular-nums"><span className="font-bold">{c.score}</span><span className="text-muted-foreground">/{c.max}</span></div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{c.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {result.recommendations.length > 0 && (
              <div className="mt-6 rounded-2xl border border-primary/30 bg-gradient-card p-6 shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow"><Wand2 className="h-4 w-4" /></div>
                  <h3 className="font-display font-semibold">Top ways to improve</h3>
                </div>
                <ol className="space-y-2.5">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="font-display font-semibold mb-3">Keyword coverage</h3>
              <div className="flex flex-wrap gap-2">
                {result.matched_keywords.map(k => (
                  <span key={k} className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">{k}</span>
                ))}
                {result.missing_top_keywords.map(k => (
                  <span key={k} className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/5 text-foreground/80 px-3 py-1 text-xs font-medium line-through decoration-destructive/60">{k}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Solid = present in resume · Struck-through = missing JD term</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
