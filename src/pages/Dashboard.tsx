import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Upload, FileText, Loader2, Sparkles, History, Building2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { extractTextFromFile } from "@/lib/extractText";
import { toast } from "sonner";

type RewriteLevel = "light" | "balanced" | "aggressive";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [rewriteLevel, setRewriteLevel] = useState<RewriteLevel>("balanced");
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [profile, setProfile] = useState<{
    plan: string;
    optimizations_used: number;
    scans_used_month: number;
    subscription_status: string;
    current_period_end: string | null;
    payment_failed: boolean;
    pending_plan: string | null;
  } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [cancelling, setCancelling] = useState(false);

  const loadProfile = () => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("plan, optimizations_used, scans_used_month, subscription_status, current_period_end, payment_failed, pending_plan")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as any));
  };

  const loadHistory = () => {
    if (!user) return;
    supabase.from("optimizations").select("id, ats_score, created_at, title, company, role").eq("user_id", user.id).order("created_at", { ascending: false }).limit(9)
      .then(({ data }) => setHistory(data ?? []));
  };

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadHistory();
  }, [user]);

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? You'll keep paid access until the end of the current billing cycle, then drop to Free.")) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-cancel-subscription");
      if (error || (data as any)?.error) {
        toast.error((error as any)?.message || (data as any)?.error || "Could not cancel");
        return;
      }
      toast.success("Subscription cancelled. Access continues until the cycle ends.");
      loadProfile();
    } finally {
      setCancelling(false);
    }
  };

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
        body: { resume: resumeText, jobDescription, rewriteLevel, title: title.trim() || undefined },
      });
      if (error) {
        const msg = (error as any).context?.error || error.message || "Analysis failed";
        toast.error(msg);
        return;
      }
      if (data?.error) { toast.error(data.error); return; }
      toast.success("Resume tailored!");
      navigate(`/results/${data.optimization.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAnalyzing(false);
    }
  };

  const remaining: number | string = "∞";

  const levels: { value: RewriteLevel; label: string; desc: string }[] = [
    { value: "light", label: "Light polish", desc: "Minimal edits, keep voice" },
    { value: "balanced", label: "Balanced", desc: "Strong rewrite + keywords" },
    { value: "aggressive", label: "Aggressive", desc: "Max rewrite for ATS" },
  ];

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
              className="min-h-[280px]" />

            <div className="mt-4">
              <Label htmlFor="title" className="text-xs">Version name (optional)</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Acme – Senior Engineer" className="mt-1.5" />
            </div>
          </div>
        </div>

        {/* Rewrite level selector */}
        <div className="mt-6 rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold">Rewrite intensity</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {levels.map(l => (
              <button key={l.value}
                onClick={() => setRewriteLevel(l.value)}
                type="button"
                className={`text-left rounded-xl border-2 p-4 transition-all ${rewriteLevel === l.value ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-background hover:border-primary/40"}`}>
                <div className="font-display font-semibold text-sm">{l.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{l.desc}</div>
              </button>
            ))}
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
              <h3 className="font-display font-semibold">Your tailored versions</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.map((h) => (
                <button key={h.id} onClick={() => navigate(`/results/${h.id}`)}
                  className="text-left rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition-all">
                  <div className="font-display font-semibold truncate">{h.title || "Untitled"}</div>
                  {(h.company || h.role) && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                      <Building2 className="h-3 w-3 shrink-0" />
                      {[h.company, h.role].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</div>
                    <div className="text-sm font-display font-semibold">Score <span className="text-primary">{h.ats_score ?? "—"}</span></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
