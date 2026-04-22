import { useState } from "react";
import { Loader2, Mail, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CoverLetterTool() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!resume.trim() || !jd.trim()) return toast.error("Add your resume and job description");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", {
        body: { resume, jobDescription: jd },
      });
      if (error || data?.error) { toast.error(data?.error || error?.message || "Failed"); return; }
      setLetter(data.coverLetter || "");
      toast.success("Cover letter generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(letter);
    toast.success("Copied to clipboard");
  };

  const downloadTxt = () => {
    const blob = new Blob([letter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cover-letter.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Cover Letter Generator</h1>
            <p className="text-muted-foreground text-sm mt-1">Tailored letter from your resume + job description.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <Label className="text-xs">Your resume</Label>
            <Textarea value={resume} onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume text..." className="mt-1.5 min-h-[260px] font-mono text-xs" />
          </div>
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
            <Label className="text-xs">Job description</Label>
            <Textarea value={jd} onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description..." className="mt-1.5 min-h-[260px]" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={generate} disabled={loading} size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-8">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Mail className="h-4 w-4 mr-2" /> Generate Cover Letter</>}
          </Button>
        </div>

        {letter && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Your cover letter</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyText}><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy</Button>
                <Button variant="outline" size="sm" onClick={downloadTxt}><Download className="h-3.5 w-3.5 mr-1.5" /> .txt</Button>
              </div>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{letter}</div>
          </div>
        )}
      </div>
    </div>
  );
}
