import { useState } from "react";
import { Loader2, GraduationCap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SkillGapTool() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [gaps, setGaps] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!resume.trim() || !jd.trim()) return toast.error("Add resume and job description");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("skill-gap", {
        body: { resume, jobDescription: jd },
      });
      if (error || data?.error) { toast.error(data?.error || error?.message || "Failed"); return; }
      setGaps(data.gaps || []);
      toast.success("Analysis complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Skill Gap Analysis</h1>
            <p className="text-muted-foreground text-sm mt-1">Targeted courses & certs to close the gaps.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <Label className="text-xs">Your resume</Label>
            <Textarea value={resume} onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume text..." className="mt-1.5 min-h-[240px] font-mono text-xs" />
          </div>
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <Label className="text-xs">Target job description</Label>
            <Textarea value={jd} onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description..." className="mt-1.5 min-h-[240px]" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={analyze} disabled={loading} size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-8">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : <>Find skill gaps</>}
          </Button>
        </div>

        {gaps && gaps.length > 0 && (
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {gaps.map((g: any, i: number) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">{g.skill}</h3>
                  {g.priority && <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">{g.priority}</span>}
                </div>
                {g.why && <p className="text-xs text-muted-foreground mt-2">{g.why}</p>}
                {g.resources?.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {g.resources.map((r: any, j: number) => (
                      <li key={j} className="text-sm">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                            {r.name} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : <span>{r.name}</span>}
                        {r.provider && <span className="text-muted-foreground"> · {r.provider}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
