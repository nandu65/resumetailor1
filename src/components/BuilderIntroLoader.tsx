import { useEffect, useState } from "react";
import { FileText, Check, Loader2 } from "lucide-react";

const FEATURES = [
  "6+ Professional Resume Designs",
  "AI-Written Bullet Points",
  "ATS-Friendly Formatting",
  "Instant PDF & DOCX Export",
];

export function BuilderIntroLoader({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    FEATURES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i + 1), 400 + i * 450));
    });
    timers.push(window.setTimeout(onDone, 400 + FEATURES.length * 450 + 500));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background animate-fade-in">
      <div className="w-full max-w-lg px-6 flex flex-col items-center">
        {/* Logo mark */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-2xl bg-gradient-primary blur-2xl opacity-40 animate-pulse" />
          <div className="relative w-20 h-24 rounded-xl border-2 border-primary/40 bg-gradient-card shadow-elegant flex items-center justify-center overflow-hidden">
            <FileText className="h-9 w-9 text-primary" strokeWidth={1.8} />
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-[shimmer_1.4s_linear_infinite]"
                 style={{ top: `${(step / FEATURES.length) * 100}%`, transition: "top 0.4s ease" }} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="font-display text-2xl font-bold tracking-tight">Preparing your builder</div>
        </div>
        <div className="text-sm text-muted-foreground mb-8">Loading templates and AI models…</div>

        <ul className="w-full space-y-3">
          {FEATURES.map((f, i) => {
            const done = i < step;
            return (
              <li
                key={f}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-500 ${
                  done ? "border-primary/30 bg-accent/40 opacity-100 translate-y-0" : "border-border/50 opacity-40 translate-y-1"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                    done ? "bg-gradient-primary text-primary-foreground scale-100 shadow-glow" : "bg-muted text-muted-foreground scale-90"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="h-2 w-2 rounded-full bg-current" />}
                </div>
                <span className={`text-sm font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>{f}</span>
              </li>
            );
          })}
        </ul>

        {/* Progress bar */}
        <div className="mt-8 w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${(step / FEATURES.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
