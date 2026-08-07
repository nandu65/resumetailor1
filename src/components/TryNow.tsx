import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, FileText, Sparkles, Loader2, Lock, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { extractTextFromFile } from "@/lib/extractText";
import { validateResumeFile } from "@/lib/fileValidation";
import { AnalyzeProgress } from "@/components/AnalyzeProgress";
import { supabase } from "@/integrations/supabase/client";

type Result = {
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  improvements: string[];
};

export function TryNow() {
  const [jd, setJd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    const v = validateResumeFile(f);
    if (v.ok === false) {
      toast.error(v.error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(f);
    setResumeText("");
    try {
      const text = await extractTextFromFile(f);
      if (!text || text.length < 30) {
        toast.error("We couldn't read enough text from that file. Try another PDF, DOCX, or TXT.");
        setFile(null);
        return;
      }
      setResumeText(text);
    } catch (e: any) {
      toast.error(e?.message || "Failed to read file");
      setFile(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const analyze = async () => {
    if (!jd.trim() || jd.trim().length < 40) {
      toast.error("Paste a job description (at least 40 characters).");
      return;
    }
    if (!resumeText) {
      toast.error("Upload your resume (PDF, DOCX, or TXT).");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ats-score", {
        body: { resume: resumeText, jobDescription: jd },
      });
      if (error) throw error;
      setResult(data as Result);
      setOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full relative z-10">
      <div className="w-full rounded-3xl border-2 border-primary/30 bg-gradient-card p-2.5 max-[360px]:p-2 sm:p-6 md:p-10 shadow-elegant">
        <div className="text-center mb-3 sm:mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent px-2 py-0.5 sm:px-4 sm:py-1.5 text-[8px] max-[360px]:text-[7px] sm:text-xs font-semibold text-accent-foreground mb-1.5 sm:mb-3">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> '''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''\n                                            \n                                            its happening only after login , before login its goos
          </div>
          <h2 className="font-display text-[11px] max-[360px]:text-[10px] leading-tight sm:text-2xl md:text-3xl font-bold tracking-tight">
            Instant ATS score in 30 seconds
          </h2>
          <p className="mt-1 sm:mt-2 text-[9px] max-[360px]:text-[8px] leading-tight sm:text-sm text-muted-foreground">
            Free preview. See how your resume scores before you sign up.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-3 sm:gap-5">
          {/* JD */}
          <div>
            <label className="text-[10px] max-[360px]:text-[9px] sm:text-sm font-semibold flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> Job Description
            </label>
            <Textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here — responsibilities, required skills, qualifications..."
              className="min-h-[92px] sm:min-h-[180px] text-[11px] leading-tight sm:text-sm resize-none bg-background/70"
            />
            <div className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground text-right">{jd.length} characters</div>
          </div>

          {/* Upload */}
          <div>
            <label className="text-[10px] max-[360px]:text-[9px] sm:text-sm font-semibold flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
              <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> Upload Resume
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`min-h-[92px] sm:min-h-[180px] rounded-md border-2 border-dashed flex flex-col items-center justify-center text-center p-3 sm:p-6 cursor-pointer transition-all ${
                dragOver ? "border-primary bg-primary/5" : "border-border bg-background/70 hover:border-primary/60 hover:bg-accent/30"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                hidden
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  <div className="font-semibold text-[11px] sm:text-sm break-all">{file.name}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Click to replace</div>
                </div>
              ) : (
                <>
                  <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-1.5 sm:mb-2" />
                  <div className="font-semibold text-[10px] leading-tight sm:text-sm">Drop resume or browse</div>
                  <div className="text-[9px] leading-tight sm:text-xs text-muted-foreground mt-1">PDF, DOCX, TXT · 5MB</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <Button
            size="lg"
            onClick={analyze}
            disabled={loading}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-8 sm:h-12 px-2 sm:px-8 text-[10px] sm:text-base w-full sm:w-auto"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> Analyzing...</>
            ) : (
              <>Get ATS Score <ArrowRight className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" /></>
            )}
          </Button>
          <div className="text-[9px] leading-tight sm:text-xs text-muted-foreground text-center">🔒 We don't store your data</div>
        </div>
      </div>

      {/* Preview modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Your ATS Preview</DialogTitle>
            <DialogDescription>Here's a preview of your resume score against this JD.</DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-gradient-primary text-primary-foreground p-6 text-center shadow-glow">
                <div className="text-xs uppercase tracking-wider opacity-90 font-semibold">ATS Match Score</div>
                <div className="font-display text-6xl font-extrabold mt-1">{result.score}<span className="text-2xl opacity-80">/100</span></div>
                <div className="text-sm mt-2 opacity-95">
                  {result.score >= 80 ? "Excellent match! 🎉" : result.score >= 60 ? "Decent — big room to grow." : "Needs optimization to pass ATS."}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Top missing keywords</div>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords.slice(0, 3).map((k) => (
                    <span key={k} className="text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 rounded-full px-3 py-1">
                      {k}
                    </span>
                  ))}
                  {result.missing_keywords.length > 3 && (
                    <span className="text-xs font-medium bg-muted text-muted-foreground border border-border rounded-full px-3 py-1 flex items-center gap-1 blur-[2px] select-none">
                      <Lock className="h-3 w-3" /> +{result.missing_keywords.length - 3} more locked
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border-2 border-primary/40 bg-accent/40 p-4 text-center">
                <div className="font-display font-bold text-base">Sign up to see your full report</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unlock all missing keywords, AI-rewritten bullets, cover letter and improvement plan.
                </p>
                <Button asChild size="lg" className="mt-3 w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                  <Link to="/auth">Sign up free & unlock full report <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
                <div className="mt-2 text-[11px] text-muted-foreground">No credit card required · 1 free full scan</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AnalyzeProgress open={loading} title="Analyzing your resume" />
    </section>
  );
}
