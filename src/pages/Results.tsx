import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Target, Sparkles, ListChecks, Lightbulb, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { downloadResumePdf } from "@/lib/pdfExport";
import { toast } from "sonner";

interface Optimization {
  id: string;
  ats_score: number | null;
  missing_keywords: string[] | null;
  professional_summary: string | null;
  improved_bullets: { original: string; improved: string }[] | null;
  skills_to_add: string[] | null;
  created_at: string;
}

export default function Results() {
  const { id } = useParams();
  const [opt, setOpt] = useState<Optimization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from("optimizations").select("*").eq("id", id).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setOpt(data as any);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!opt) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Result not found.</p>
          <Button asChild className="mt-4"><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const score = opt.ats_score ?? 0;
  const scoreColor = score >= 75 ? "text-primary" : score >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back</Link>
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Your tailored resume</h1>
            <p className="text-muted-foreground mt-1">Generated {new Date(opt.created_at).toLocaleString()}</p>
          </div>
          <Button onClick={() => downloadResumePdf(opt)} size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>

        {/* Score */}
        <div className="rounded-2xl border border-border bg-gradient-card p-8 shadow-card mb-6 flex flex-col md:flex-row items-center gap-8">
          <div className="relative h-36 w-36 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
              <circle cx="50" cy="50" r="42" stroke="hsl(var(--primary))" strokeWidth="8" fill="none"
                strokeLinecap="round" strokeDasharray={`${(score / 100) * 264} 264`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`font-display text-4xl font-extrabold ${scoreColor}`}>{score}</div>
              <div className="text-xs text-muted-foreground">/ 100</div>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Target className="h-3.5 w-3.5" /> ATS Match Score
            </div>
            <h2 className="font-display text-2xl font-bold mt-2">
              {score >= 75 ? "Strong match!" : score >= 50 ? "Good start — room to improve" : "Needs significant tailoring"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Apply the recommendations below to maximise your chances of passing automated screens and reaching a recruiter.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Missing keywords */}
          <Card icon={Tag} title="Missing keywords">
            <div className="flex flex-wrap gap-2">
              {(opt.missing_keywords ?? []).map((k) => (
                <span key={k} className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-foreground">
                  {k}
                </span>
              ))}
              {!opt.missing_keywords?.length && <p className="text-sm text-muted-foreground">No major keywords missing — nice work!</p>}
            </div>
          </Card>

          {/* Skills to add */}
          <Card icon={ListChecks} title="Skills to add">
            <div className="flex flex-wrap gap-2">
              {(opt.skills_to_add ?? []).map((s) => (
                <span key={s} className="inline-flex items-center rounded-full bg-gradient-primary text-primary-foreground px-3 py-1 text-xs font-medium">
                  {s}
                </span>
              ))}
              {!opt.skills_to_add?.length && <p className="text-sm text-muted-foreground">All key skills already present.</p>}
            </div>
          </Card>
        </div>

        {/* Summary */}
        <Card icon={Sparkles} title="Suggested professional summary" className="mb-6">
          <p className="text-sm leading-relaxed text-foreground/90">{opt.professional_summary || "—"}</p>
        </Card>

        {/* Bullets */}
        <Card icon={Lightbulb} title="Improved work experience bullets">
          <div className="space-y-5">
            {(opt.improved_bullets ?? []).map((b, i) => (
              <div key={i} className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Original</div>
                <p className="text-sm text-muted-foreground line-through decoration-1">{b.original}</p>
                <div className="text-xs uppercase tracking-wide text-primary font-semibold mt-3 mb-1">Improved</div>
                <p className="text-sm font-medium">{b.improved}</p>
              </div>
            ))}
            {!opt.improved_bullets?.length && <p className="text-sm text-muted-foreground">No bullet improvements suggested.</p>}
          </div>
        </Card>

        <div className="mt-8 flex justify-end">
          <Button onClick={() => downloadResumePdf(opt)} size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Download className="h-4 w-4 mr-2" /> Download tailored resume
          </Button>
        </div>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, children, className = "" }: { icon: any; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-gradient-card p-6 shadow-card ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground"><Icon className="h-4 w-4" /></div>
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
