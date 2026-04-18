import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Loader2, Sparkles, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { extractTextFromFile } from "@/lib/extractText";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [profile, setProfile] = useState<{ plan: string; optimizations_used: number } | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, optimizations_used").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
    supabase.from("optimizations").select("id, ats_score, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => setHistory(data ?? []));
  }, [user]);

  const handleFile = async (file: File) => {
    setExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      setResumeText(text);
      setFilename(file.name);
      toast.success(`Loaded ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read file");
    } finally {
      setExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return toast.error("Add your resume first");
    if (!jobDescription.trim()) return toast.error("Paste the job description");

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: { resume: resumeText, jobDescription },
      });
      if (error) {
        // supabase invoke wraps non-2xx; try parsing context
        const msg = (error as any).context?.error || error.message || "Analysis failed";
        toast.error(msg);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success("Resume tailored!");
      navigate(`/results/${data.optimization.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAnalyzing(false);
    }
  };

  const remaining: number | string = "∞";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-6xl">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Tailor your resume</h1>
            <p className="text-muted-foreground mt-1">Upload your resume and paste a job description to get a tailored version.</p>
          </div>
          <div className="rounded-xl border border-border bg-gradient-card px-4 py-3 text-sm shadow-card">
            <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Plan · {profile?.plan ?? "free"}</div>
            <div className="font-display font-semibold">{remaining} optimizations left</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Resume card */}
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-accent-foreground"><FileText className="h-4 w-4" /></div>
              <div>
                <h2 className="font-display font-semibold">Your Resume</h2>
                <p className="text-xs text-muted-foreground">Upload PDF / DOCX / TXT or paste text</p>
              </div>
            </div>

            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <button
              onClick={() => fileRef.current?.click()}
              disabled={extracting}
              className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-accent/40 transition-colors p-8 text-center group"
            >
              {extracting ? (
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
              ) : (
                <>
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="mt-2 text-sm font-medium">{filename ?? "Click to upload"}</div>
                  <div className="text-xs text-muted-foreground">PDF, DOCX, or TXT</div>
                </>
              )}
            </button>

            <div className="mt-4">
              <Label htmlFor="resume" className="text-xs">Or paste resume text</Label>
              <Textarea id="resume" value={resumeText} onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume contents here..." className="mt-1.5 min-h-[200px] font-mono text-xs" />
            </div>
          </div>

          {/* JD card */}
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-accent-foreground"><Sparkles className="h-4 w-4" /></div>
              <div>
                <h2 className="font-display font-semibold">Job Description</h2>
                <p className="text-xs text-muted-foreground">Paste the role you're applying for</p>
              </div>
            </div>
            <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here — the more detail, the better the tailoring..."
              className="min-h-[340px]" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleAnalyze} disabled={analyzing} size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-8 text-base">
            {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Tailoring...</> : <><Sparkles className="h-4 w-4 mr-2" /> Analyze & Tailor</>}
          </Button>
        </div>

        {history.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-display font-semibold">Recent optimizations</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.map((h) => (
                <button key={h.id} onClick={() => navigate(`/results/${h.id}`)}
                  className="text-left rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition-all">
                  <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                  <div className="mt-1 font-display font-semibold">Score: <span className="text-primary">{h.ats_score ?? "—"}</span>/100</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
