import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

interface Share {
  ats_score: number | null;
  recruiter_score: number | null;
  job_match_score: number | null;
  score_label: string | null;
  title: string | null;
  company: string | null;
  role: string | null;
  created_at: string;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<Share | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    document.title = "Resume Score — ResumeShot";
    (async () => {
      const { data } = await supabase.rpc("get_shared_score", { _token: token });
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) setNotFound(true);
      else setShare(row as Share);
      setLoading(false);
      // fire-and-forget view bump
      supabase.functions.invoke("share-view", { body: { token } }).catch(() => {});
    })();
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (notFound || !share) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
        <div className="max-w-md">
          <h1 className="font-display text-2xl font-bold">This score card is unavailable</h1>
          <p className="text-muted-foreground mt-2">The link may have expired or been removed.</p>
          <Button asChild className="mt-6 bg-gradient-primary text-primary-foreground"><Link to="/">Analyze your resume</Link></Button>
        </div>
      </div>
    );
  }

  const score = share.ats_score ?? 0;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * 283;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="container max-w-3xl py-10 sm:py-16">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg mb-8">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span>ResumeShot <span className="text-primary">AI</span></span>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 sm:p-10 shadow-2xl">
          <div className="text-xs uppercase tracking-widest text-indigo-300 font-semibold">Resume Score</div>
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-8">
            <div className="relative h-44 w-44 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="8"
                  strokeDasharray={`${dash} 283`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-display font-bold">{score}</div>
                <div className="text-xs text-slate-400">/ 100 ATS</div>
              </div>
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="inline-block rounded-full bg-emerald-500/20 text-emerald-300 px-3 py-1 text-xs font-semibold">
                {share.score_label || "Analyzed"}
              </div>
              {(share.company || share.role) && (
                <div className="mt-3 text-slate-300 text-sm">
                  {[share.role, share.company].filter(Boolean).join(" @ ")}
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {share.recruiter_score != null && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-[11px] uppercase text-slate-400">Recruiter Appeal</div>
                    <div className="text-2xl font-display font-bold">{share.recruiter_score}</div>
                  </div>
                )}
                {share.job_match_score != null && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="text-[11px] uppercase text-slate-400">Job Match</div>
                    <div className="text-2xl font-display font-bold">{share.job_match_score}</div>
                  </div>
                )}
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="text-[11px] uppercase text-slate-400">ATS Compatibility</div>
                  <div className="text-2xl font-display font-bold">{score}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">Analyzed with ResumeShot · {new Date(share.created_at).toLocaleDateString()}</div>
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              <Link to="/">Check your resume <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
            </Button>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Tailor your resume to any job in 30 seconds — <Link to="/" className="text-indigo-300 underline">ResumeShot.in</Link>
        </p>
      </div>
    </div>
  );
}
