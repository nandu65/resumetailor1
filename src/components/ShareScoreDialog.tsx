import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, Linkedin, Twitter } from "lucide-react";
import { toast } from "sonner";

interface Props {
  score: number;
  previousScore?: number | null;
}

const SITE = "ResumeShot.in";
const SHARE_URL = "https://resumetailor1.lovable.app";

export function ShareScoreDialog({ score, previousScore }: Props) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  const shareText = previousScore != null
    ? `I improved my resume ATS score from ${previousScore} to ${score} using ${SITE} 🚀`
    : `My resume scored ${score}/100 on ${SITE} — tailor yours in 30 seconds 🚀`;

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = 1200, H = 630;
    c.width = W; c.height = H;

    // background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0b1220");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // accent ring
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

    // score text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 120px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(score), W - 220, H / 2 + 30);
    ctx.font = "600 24px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("/ 100 ATS", W - 220, H / 2 + 70);

    // headline
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

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 28px sans-serif";
    ctx.fillText("with ResumeShot.in 🚀", 80, 400);

    // footer brand
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 22px sans-serif";
    ctx.fillText("Tailor your resume to any JD in 30 seconds", 80, H - 80);
    ctx.fillStyle = "#6366f1";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("ResumeShot.in", 80, H - 40);

    setDataUrl(c.toDataURL("image/png"));
  }, [open, score, previousScore]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `resumeshot-score-${score}.png`;
    a.click();
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${SHARE_URL}`);
      toast.success("Caption copied — paste it with the image!");
    } catch { toast.error("Couldn't copy"); }
  };

  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(SHARE_URL)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${SHARE_URL}`)}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="border-primary/40 hover:bg-accent">
          <Share2 className="h-4 w-4 mr-2" /> Share My Score
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">Share your progress</DialogTitle>
          <DialogDescription>Download the card and post it on LinkedIn, Twitter, or WhatsApp.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl overflow-hidden border border-border bg-muted">
          <canvas ref={canvasRef} className="w-full h-auto block" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={download} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Download className="h-4 w-4 mr-1.5" /> Download image
          </Button>
          <Button asChild variant="outline"><a href={linkedin} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4 mr-1.5" /> LinkedIn</a></Button>
          <Button asChild variant="outline"><a href={twitter} target="_blank" rel="noreferrer"><Twitter className="h-4 w-4 mr-1.5" /> Twitter / X</a></Button>
          <Button asChild variant="outline"><a href={whatsapp} target="_blank" rel="noreferrer">💬 WhatsApp</a></Button>
          <Button variant="ghost" onClick={copyText}>Copy caption</Button>
        </div>
        <p className="text-xs text-muted-foreground">Tip: Download the image, then attach it when sharing on LinkedIn or WhatsApp for max engagement.</p>
      </DialogContent>
    </Dialog>
  );
}
