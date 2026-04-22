import { useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";

const STOP = new Set(["the","a","an","and","or","of","to","in","for","on","with","by","at","as","is","are","be","this","that","from","it","you","we","our","your","their","they","i","but","not","will","can","have","has","had","was","were","into","more","than","such","also","any","all","each","other","its","these","those","may","most","using","use","used","based"]);

function tokens(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").split(/\s+/).filter(t => t.length > 2 && !STOP.has(t));
}

export default function KeywordDensityTool() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [computed, setComputed] = useState(false);

  const stats = useMemo(() => {
    if (!computed) return null;
    const jdTokens = tokens(jd);
    const resumeTokens = new Set(tokens(resume));
    const freq = new Map<string, number>();
    jdTokens.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
    const ranked = [...freq.entries()]
      .map(([word, count]) => ({ word, count, present: resumeTokens.has(word) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
    const matched = ranked.filter(r => r.present).length;
    const score = ranked.length ? Math.round((matched / ranked.length) * 100) : 0;
    return { ranked, score, matched, total: ranked.length };
  }, [computed, resume, jd]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
            <Gauge className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Keyword Density Meter</h1>
            <p className="text-muted-foreground text-sm mt-1">See which JD keywords appear in your resume.</p>
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
          <Button onClick={() => setComputed(true)} size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-8">
            Analyze keywords
          </Button>
        </div>

        {stats && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Match Score</div>
                <div className="font-display text-5xl font-extrabold text-primary">{stats.score}<span className="text-2xl text-muted-foreground">/100</span></div>
                <div className="text-sm text-muted-foreground mt-1">{stats.matched} of {stats.total} top keywords found</div>
              </div>
            </div>
            <div className="space-y-2">
              {stats.ranked.map((r) => (
                <div key={r.word} className="flex items-center gap-3">
                  <div className={`text-sm font-medium w-32 truncate ${r.present ? "text-foreground" : "text-muted-foreground line-through"}`}>{r.word}</div>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${r.present ? "bg-gradient-primary" : "bg-destructive/40"}`} style={{ width: `${Math.min(100, r.count * 20)}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground w-10 text-right">×{r.count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
