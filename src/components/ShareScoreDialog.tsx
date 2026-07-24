import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, Linkedin, Twitter, Link2, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  score: number;
  previousScore?: number | null;
  recruiterScore?: number | null;
  jobMatchScore?: number | null;
  optimizationId?: string | null;
  company?: string | null;
  role?: string | null;
  title?: string | null;
}

const SITE = "ResumeShot.in";
const SHARE_URL = "https://resumetailor1.lovable.app";

function scoreLabel(s: number) {
  if (s >= 90) return "Excellent";
  if (s >= 75) return "Strong";
  if (s >= 60) return "Good";
  return "Needs Improvement";
}

function randomToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
}

export function ShareScoreDialog({ score, previousScore, recruiterScore, jobMatchScore, optimizationId, company, role, title }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string>("");

  const label = scoreLabel(score);
  const shareText = previousScore != null
    ? `I improved my resume ATS score from ${previousScore} to ${score} using ${SITE} 🚀`
    : `My resume scored ${score}/100 (${label}) on ${SITE} — tailor yours in 30 seconds 🚀`;

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = 1200, H = 630;
    c.width = W; c.height = H;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0b1220");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(W - 220, H / 2, 180, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(W - 220, H / 2, 180, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 120px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(score), W - 220, H / 2 + 30);
    ctx.font = "600 24px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("/ 100 ATS", W - 220, H / 2 + 70);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px sans-serif";
    if (previousScore != null) {
      ctx.fillText("I leveled up my resume", 80, 200);
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "bold 72px sans-serif";
      ctx.fillText(`${previousScore}  →  ${score}`, 80, 300);
    } else {
      ctx.fillText("My resume just scored", 80, 220);
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "bold 96px sans-serif";
      ctx.fillText(`${score}/100`, 80, 330);
    }

    ctx.fillStyle = "#22c55e";
    ctx.font = "700 30px sans-serif";
    ctx.fillText(label, 80, 370);

    // Optional breakdown chips
    let cy = 420;
    ctx.font = "500 22px sans-serif";
    ctx.fillStyle = "#cbd5e1";
    if (recruiterScore != null) { ctx.fillText(`Recruiter appeal: ${recruiterScore}/100`, 80, cy); cy += 30; }
    if (jobMatchScore != null) { ctx.fillText(`Job match: ${jobMatchScore}/100`, 80, cy); cy += 30; }

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 22px sans-serif";
    ctx.fillText("Analyzed with ResumeShot", 80, H - 80);
    ctx.fillStyle = "#6366f1";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("Check your resume at ResumeShot.in", 80, H - 40);

    setDataUrl(c.toDataURL("image/png"));
  }, [open, score, previousScore, recruiterScore, jobMatchScore, label]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `resumeshot-score-${score}.png`;
    a.click();
  };

  const createPublicLink = async () => {
    if (!user) { toast.error("Sign in to create a public share link"); return; }
    setCreating(true);
    try {
      const token = randomToken();
      const { error } = await supabase.from("resume_score_shares").insert({
        user_id: user.id,
        optimization_id: optimizationId ?? null,
        share_token: token,
        ats_score: score,
        recruiter_score: recruiterScore ?? null,
        job_match_score: jobMatchScore ?? null,
        score_label: label,
        title: title ?? null,
        company: company ?? null,
        role: role ?? null,
      });
      if (error) throw error;
      const url = `${window.location.origin}/share/${token}`;
      setPublicUrl(url);
      try { await navigator.clipboard.writeText(url); toast.success("Score card link copied!"); }
      catch { toast.success("Your score card is ready to share!"); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create share link");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try { await navigator.clipboard.writeText(publicUrl); toast.success("Score card link copied!"); }
    catch { toast.error("Couldn't copy"); }
  };

  const nativeShare = async () => {
    const url = publicUrl || SHARE_URL;
    if (navigator.share) {
      try { await navigator.share({ title: `${SITE} — ${score}/100`, text: shareText, url }); }
      catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  };

  const target = publicUrl || SHARE_URL;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(target)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(target)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${target}`)}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="border-primary/40 hover:bg-accent">
          <Share2 className="h-4 w-4 mr-2" /> Share My Score
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Share your progress</DialogTitle>
          <DialogDescription>Download the card, or create a public share link anyone can view.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl overflow-hidden border border-border bg-muted">
          <canvas ref={canvasRef} className="w-full h-auto block" />
        </div>

        {user && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            {publicUrl ? (
              <>
                <div className="text-xs text-muted-foreground">Public share link</div>
                <div className="flex gap-2">
                  <input readOnly value={publicUrl} className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-xs" />
                  <Button size="sm" variant="outline" onClick={copyLink}><Link2 className="h-3.5 w-3.5 mr-1" /> Copy</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Only your score is shown publicly — resume text, JD, and personal info are private.</p>
              </>
            ) : (
              <Button onClick={createPublicLink} disabled={creating} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</> : <><Globe className="h-4 w-4 mr-2" /> Create public share link</>}
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={download} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Download className="h-4 w-4 mr-1.5" /> Download PNG
          </Button>
          <Button onClick={nativeShare} variant="outline"><Share2 className="h-4 w-4 mr-1.5" /> Share…</Button>
          <Button asChild variant="outline"><a href={linkedin} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4 mr-1.5" /> LinkedIn</a></Button>
          <Button asChild variant="outline"><a href={twitter} target="_blank" rel="noreferrer"><Twitter className="h-4 w-4 mr-1.5" /> Twitter</a></Button>
          <Button asChild variant="outline"><a href={whatsapp} target="_blank" rel="noreferrer">💬 WhatsApp</a></Button>
        </div>
        <p className="text-xs text-muted-foreground">Tip: The image looks great on LinkedIn — download and attach it with the link.</p>
      </DialogContent>
    </Dialog>
  );
}
