import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Play, RotateCcw, Timer, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";

// Simulates a recruiter's 6-second F-pattern skim: top-left dwells heavily,
// second line moderately, then a vertical scan down the left rail.
// We score each line by (position weight) × (density of scannable signals).

const SIGNAL_RE =
  /(\b\d[\d,.]*\s*(%|\+|k|m|x|years?|yrs?|months?|hours?)\b|\b(led|built|shipped|launched|grew|reduced|saved|increased|scaled|managed|owned|drove)\b|@|linkedin|github|\.com|senior|principal|staff|lead|manager|engineer|designer|analyst|director)/gi;

interface LineScore {
  text: string;
  weight: number;   // eye-time weight 0..1
  signals: number;  // signal hits
  heat: number;     // 0..1
}

function fPatternWeight(idx: number, total: number): number {
  const rel = idx / Math.max(1, total - 1);
  // Steep top emphasis, mild mid, drops fast at bottom.
  if (rel < 0.08) return 1.0;
  if (rel < 0.2) return 0.85;
  if (rel < 0.4) return 0.6;
  if (rel < 0.6) return 0.35;
  if (rel < 0.85) return 0.2;
  return 0.1;
}

const SAMPLE = `Alex Morgan
Senior Software Engineer · San Francisco · alex@example.com · linkedin.com/in/alex

SUMMARY
6+ years shipping React + Node platforms used by 2M+ users.

EXPERIENCE
Acme Corp — Senior Software Engineer (2022 – Present)
- Led migration to microservices; cut deploys 70%.
- Built analytics pipeline processing 5M events/day on AWS.

Northwind Labs — Software Engineer (2019 – 2021)
- Grew retention 18% with a redesigned dashboard.

EDUCATION
UC Berkeley — B.S. Computer Science

SKILLS
React, TypeScript, Node, PostgreSQL, AWS, Docker`;

export default function RecruiterViewTool() {
  const [resume, setResume] = useState("");
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const startedRef = useRef<number | null>(null);

  const lines = useMemo(() => resume.split(/\n/), [resume]);

  const scored: LineScore[] = useMemo(() => {
    const arr = lines.map((text, i) => {
      const weight = fPatternWeight(i, lines.length);
      const signals = (text.match(SIGNAL_RE) || []).length;
      const heat = Math.min(1, weight * (0.4 + signals * 0.35));
      return { text, weight, signals, heat };
    });
    return arr;
  }, [lines]);

  useEffect(() => {
    if (!playing) return;
    startedRef.current = Date.now();
    setElapsed(0);
    setFinished(false);
    const iv = setInterval(() => {
      const e = (Date.now() - (startedRef.current ?? Date.now())) / 1000;
      if (e >= 6) {
        setElapsed(6);
        setPlaying(false);
        setFinished(true);
        clearInterval(iv);
      } else setElapsed(e);
    }, 50);
    return () => clearInterval(iv);
  }, [playing]);

  const visibleUpTo = playing
    ? Math.floor((elapsed / 6) * lines.length)
    : finished ? lines.length : lines.length;

  // Recruiter takeaways: pick top 3 lines by heat that fall in first 40% of resume.
  const takeaways = useMemo(() => {
    return scored
      .map((s, i) => ({ ...s, i }))
      .filter((s) => s.i / Math.max(1, scored.length) < 0.4 && s.text.trim())
      .sort((a, b) => b.heat - a.heat)
      .slice(0, 3);
  }, [scored]);

  const missedGold = useMemo(() => {
    return scored
      .map((s, i) => ({ ...s, i }))
      .filter((s) => s.signals >= 2 && s.weight < 0.35 && s.text.trim())
      .slice(0, 3);
  }, [scored]);

  const overallGrade = useMemo(() => {
    if (!scored.length) return { grade: "—", note: "" };
    const topHalf = scored.slice(0, Math.max(1, Math.floor(scored.length * 0.3)));
    const topSignals = topHalf.reduce((a, b) => a + b.signals, 0);
    if (topSignals >= 6) return { grade: "A", note: "Recruiter will see your strongest signals in the first 6 seconds." };
    if (topSignals >= 3) return { grade: "B", note: "Solid, but move one more metric or role title above the fold." };
    return { grade: "C", note: "Top of resume is too quiet. Pull achievements up." };
  }, [scored]);

  const heatColor = (h: number) => {
    if (h >= 0.7) return "bg-red-500/40 dark:bg-red-500/50";
    if (h >= 0.45) return "bg-orange-400/35 dark:bg-orange-400/45";
    if (h >= 0.25) return "bg-yellow-300/30 dark:bg-yellow-300/40";
    if (h >= 0.1) return "bg-blue-300/20 dark:bg-blue-300/25";
    return "";
  };

  return (
    <div className="min-h-screen bg-hero">
      <Navbar />
      <div className="container py-10 max-w-6xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-sm text-primary font-semibold mb-2">
            <Eye className="h-4 w-4" /> Recruiter view · 6 seconds
          </div>
          <h1 className="font-display text-4xl font-bold mb-2">See your resume like a recruiter does</h1>
          <p className="text-muted-foreground max-w-2xl">
            Recruiters spend ~6 seconds on first pass, following an F-pattern down the page. We simulate that skim and
            show which lines actually land.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Your resume</h2>
              <Button size="sm" variant="ghost" onClick={() => setResume(SAMPLE)}>Use sample</Button>
            </div>
            <Textarea
              value={resume}
              onChange={(e) => { setResume(e.target.value); setFinished(false); }}
              placeholder="Paste your resume text..."
              className="min-h-[420px] text-sm font-mono"
            />
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => setPlaying(true)}
                disabled={!resume.trim() || playing}
                className="bg-gradient-primary text-primary-foreground shadow-md flex-1"
              >
                {playing ? <><Timer className="h-4 w-4 mr-2" /> {(6 - elapsed).toFixed(1)}s left</> : <><Play className="h-4 w-4 mr-2" /> Start 6-second skim</>}
              </Button>
              {finished && (
                <Button variant="outline" onClick={() => { setFinished(false); setElapsed(0); }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Heatmap · what a recruiter fixates on</h2>
              <div className="flex items-center gap-1 text-xs">
                <span className="inline-block w-3 h-3 rounded-sm bg-red-500/40" /> hot
                <span className="inline-block w-3 h-3 rounded-sm bg-orange-400/35 ml-2" /> warm
                <span className="inline-block w-3 h-3 rounded-sm bg-blue-300/20 ml-2" /> cold
              </div>
            </div>
            <div className="relative rounded-lg border border-border bg-background/60 p-4 min-h-[420px] font-mono text-xs leading-relaxed overflow-auto">
              {scored.length === 0 && (
                <p className="text-muted-foreground text-sm">Paste a resume and press start.</p>
              )}
              {scored.map((s, i) => {
                const visible = i < visibleUpTo || (!playing && !finished && resume);
                return (
                  <div
                    key={i}
                    className={`px-2 py-0.5 rounded transition-all duration-300 ${heatColor(s.heat)} ${
                      visible ? "opacity-100" : "opacity-30"
                    }`}
                  >
                    {s.text || <span>&nbsp;</span>}
                  </div>
                );
              })}
              {playing && (
                <div
                  className="pointer-events-none absolute left-0 right-0 h-8 bg-gradient-to-b from-primary/30 via-primary/20 to-transparent transition-all duration-100"
                  style={{ top: `${Math.min(95, (elapsed / 6) * 90 + 2)}%` }}
                />
              )}
            </div>
          </div>
        </div>

        {(finished || (scored.length > 0 && !playing)) && resume.trim() && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-glow">
              <div className="text-xs uppercase font-semibold text-muted-foreground mb-1">Recruiter grade</div>
              <div className="text-5xl font-bold text-primary">{overallGrade.grade}</div>
              <p className="text-sm text-muted-foreground mt-2">{overallGrade.note}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Lines they'll read
              </div>
              <ul className="space-y-2 text-sm">
                {takeaways.length ? takeaways.map((t) => (
                  <li key={t.i} className="text-foreground/90 line-clamp-2">"{t.text.trim().slice(0, 90)}"</li>
                )) : <li className="text-muted-foreground">Nothing pops in the first few lines.</li>}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <AlertTriangle className="h-4 w-4 text-warning" /> Buried achievements
              </div>
              <ul className="space-y-2 text-sm">
                {missedGold.length ? missedGold.map((t) => (
                  <li key={t.i} className="text-muted-foreground line-clamp-2">"{t.text.trim().slice(0, 90)}" — move up</li>
                )) : <li className="text-muted-foreground">Nothing critical is buried. Nice.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
