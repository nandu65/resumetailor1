import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

const STEPS = [
  { label: "Reading your resume", detail: "Parsing sections, roles, and impact bullets" },
  { label: "Analyzing the job description", detail: "Extracting keywords and priorities" },
  { label: "Scoring against ATS filters", detail: "Checking match, formatting, and coverage" },
  { label: "Rewriting for impact", detail: "Tailoring bullets and tightening language" },
  { label: "Finalizing your report", detail: "Preparing recommendations and download" },
];

/**
 * Fake but honest progress indicator: it advances through named steps on a
 * timer and holds on the last step until `open` flips to false.
 */
export function AnalyzeProgress({ open, title = "Tailoring your resume" }: { open: boolean; title?: string }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setProgress(0);
      return;
    }
    // Advance through steps 0..3 on a schedule; hold on step 4 (last) until closed.
    const stepTimes = [1200, 1400, 1800, 2200];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    stepTimes.forEach((t, i) => {
      elapsed += t;
      timers.push(setTimeout(() => setStep(i + 1), elapsed));
    });
    // Smooth progress bar towards 92% while waiting
    const start = Date.now();
    const total = elapsed + 1000;
    const interval = setInterval(() => {
      const pct = Math.min(92, ((Date.now() - start) / total) * 92);
      setProgress(pct);
    }, 120);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-live="polite"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            {title}
          </DialogTitle>
          <DialogDescription>
            This usually takes 20–40 seconds. Please keep this tab open.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <div
            className="h-2 w-full bg-muted rounded-full overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label="Analysis progress"
          >
            <div
              className="h-full bg-gradient-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 text-right text-[11px] text-muted-foreground tabular-nums">
            {Math.round(progress)}%
          </div>
        </div>

        <ol className="mt-4 space-y-3">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.label} className="flex items-start gap-3">
                <div className="mt-0.5 h-5 w-5 shrink-0 flex items-center justify-center">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" aria-label="Completed" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="In progress" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/30" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-sm font-semibold ${
                      done ? "text-muted-foreground line-through" : active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </div>
                  {active && <div className="text-xs text-muted-foreground mt-0.5">{s.detail}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
