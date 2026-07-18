import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, X, Sparkles, PartyPopper, FileSearch, Wand2 } from "lucide-react";

export type TourStep = {
  target?: string; // CSS selector (data-tour="..."). Omit for a centered welcome/finale card.
  title: string;
  body: string;
  emoji?: string;
  placement?: "top" | "bottom" | "auto";
};

const STORAGE_KEY = "resumetailor.tour.v1";

const DEFAULT_STEPS: TourStep[] = [
  {
    title: "Welcome aboard!",
    body: "In 45 seconds I'll show you the fastest way to land more interviews. Ready?",
    emoji: "👋",
  },
  {
    target: '[data-tour="hero"]',
    title: "Your launchpad",
    body: "Everything starts here. Drop a job description and watch your resume level-up in seconds.",
    emoji: "🚀",
    placement: "bottom",
  },
  {
    target: '[data-tour="try-now"]',
    title: "Try before you sign up",
    body: "Paste any JD + your resume right here. You'll see a live ATS score — no login needed.",
    emoji: "⚡",
    placement: "top",
  },
  {
    target: '[data-tour="resume-builder"]',
    title: "Build one from scratch",
    body: "No resume yet? Answer a few prompts and AI writes a recruiter-ready one in 3 templates.",
    emoji: "🪄",
    placement: "top",
  },
  {
    target: '[data-tour="pricing"]',
    title: "Fair, tiny pricing",
    body: "Free forever for basics. Pro unlocks unlimited scans, cover letters, and skill-gap plans.",
    emoji: "💎",
    placement: "top",
  },
  {
    title: "You're all set!",
    body: "Tap the ? button in the navbar anytime to replay this tour. Now go get that interview 🎯",
    emoji: "🎉",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function useTargetRect(selector?: string) {
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    if (!selector) { setRect(null); return; }
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    // scroll into view then measure a couple of times as layout settles
    const el = document.querySelector(selector) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    measure();
    const t1 = window.setTimeout(measure, 250);
    const t2 = window.setTimeout(measure, 600);
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [selector]);
  return rect;
}

export function OnboardingTour({
  steps = DEFAULT_STEPS,
  open,
  onClose,
}: {
  steps?: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const [showChoice, setShowChoice] = useState(false);
  const navigate = useNavigate();
  const step = steps[i];
  const rect = useTargetRect(open && !showChoice ? step?.target : undefined);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) { setI(0); setShowChoice(false); } }, [open]);

  const closeAll = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setShowChoice(false);
    onClose();
  }, [onClose]);

  const finish = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowChoice(true);
  }, []);


  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" || e.key === "Enter") setI(v => Math.min(v + 1, steps.length - 1));
      else if (e.key === "ArrowLeft") setI(v => Math.max(v - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, steps.length, finish]);

  const cardPos = useMemo(() => {
    if (!rect) return { style: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" as const }, centered: true };
    const cardW = 360;
    const cardH = 200;
    const margin = 20;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    let placement = step?.placement || "auto";
    if (placement === "auto") {
      placement = rect.top + rect.height + margin + cardH < vh ? "bottom" : "top";
    }
    let top = placement === "bottom" ? rect.top + rect.height + margin : rect.top - cardH - margin;
    if (top < margin) top = margin;
    if (top + cardH > vh - margin) top = vh - cardH - margin;
    let left = rect.left + rect.width / 2 - cardW / 2;
    if (left < margin) left = margin;
    if (left + cardW > vw - margin) left = vw - cardW - margin;
    return { style: { top, left, width: cardW }, centered: false, placement };
  }, [rect, step?.placement]);

  if (!open) return null;

  if (showChoice) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={closeAll}>
        <div
          className="relative w-full max-w-lg rounded-2xl bg-background border border-primary/30 shadow-2xl overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary" />
          <button
            onClick={closeAll}
            aria-label="Close"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="px-6 pt-6 pb-6 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="font-display font-bold text-2xl leading-tight">What would you like to do first?</h3>
            <p className="text-sm text-muted-foreground mt-2">Pick a path — you can always come back for the other.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 pb-6">
            <button
              onClick={() => { closeAll(); navigate("/try-now"); }}
              className="group text-left rounded-xl border-2 border-border hover:border-primary bg-card hover:bg-primary/5 p-5 transition-all hover:shadow-glow"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <FileSearch className="h-5 w-5" />
              </div>
              <div className="mt-3 font-display font-bold">Check ATS score</div>
              <div className="text-xs text-muted-foreground mt-1">Scan an existing resume against a job description.</div>
            </button>
            <button
              onClick={() => { closeAll(); navigate("/tools/resume-builder"); }}
              className="group text-left rounded-xl border-2 border-primary bg-gradient-primary/5 hover:bg-primary/10 p-5 transition-all hover:shadow-glow"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-gradient-primary text-primary-foreground">
                <Wand2 className="h-5 w-5" />
              </div>
              <div className="mt-3 font-display font-bold">Build my resume</div>
              <div className="text-xs text-muted-foreground mt-1">AI-generated resume in 3 recruiter-ready templates.</div>
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (!step) return null;

  const pad = 10;
  const spotlight = rect
    ? { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none" aria-live="polite">
      {/* Dim + spotlight via SVG mask */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={() => setI(v => Math.min(v + 1, steps.length - 1))}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.x} y={spotlight.y} width={spotlight.w} height={spotlight.h}
                rx={16} ry={16} fill="black"
                style={{ transition: "all 400ms cubic-bezier(0.4,0,0.2,1)" }}
              />
            )}
          </mask>
          <linearGradient id="tour-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="rgba(4, 12, 20, 0.72)" mask="url(#tour-mask)" />
        {/* Animated glowing ring around target */}
        {spotlight && (
          <>
            <rect
              x={spotlight.x} y={spotlight.y} width={spotlight.w} height={spotlight.h}
              rx={16} ry={16}
              fill="none" stroke="url(#tour-ring)" strokeWidth={2}
              style={{ transition: "all 400ms cubic-bezier(0.4,0,0.2,1)", filter: "drop-shadow(0 0 12px hsl(var(--primary)/0.6))" }}
            />
            <rect
              x={spotlight.x - 4} y={spotlight.y - 4} width={spotlight.w + 8} height={spotlight.h + 8}
              rx={20} ry={20}
              fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeOpacity={0.35}
              className="tour-pulse"
              style={{ transition: "all 400ms cubic-bezier(0.4,0,0.2,1)", transformOrigin: "center" }}
            />
          </>
        )}
      </svg>

      {/* Tooltip card */}
      <div
        ref={cardRef}
        key={i}
        className="pointer-events-auto absolute animate-scale-in"
        style={cardPos.style as any}
      >
        <div className="relative rounded-2xl bg-background border border-primary/30 shadow-2xl overflow-hidden">
          {/* Gradient top bar */}
          <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary" />
          {/* Progress dots */}
          <div className="flex items-center justify-between px-5 pt-4">
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === i ? "w-6 bg-primary" : idx < i ? "w-3 bg-primary/50" : "w-3 bg-muted"}`}
                />
              ))}
            </div>
            <button onClick={finish} aria-label="Close tour" className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 pb-5 pt-3">
            <div className="flex items-start gap-3">
              <div className="text-3xl leading-none animate-bounce-slow" aria-hidden>
                {step.emoji ?? "✨"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  <Sparkles className="h-3 w-3" /> Step {i + 1} of {steps.length}
                </div>
                <h3 className="font-display font-bold text-lg leading-tight mt-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{step.body}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={finish}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {i > 0 && (
                  <button
                    onClick={() => setI(v => Math.max(v - 1, 0))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-3 py-1.5 text-xs font-semibold transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                )}
                {i < steps.length - 1 ? (
                  <button
                    onClick={() => setI(v => Math.min(v + 1, steps.length - 1))}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary text-primary-foreground shadow-glow px-4 py-1.5 text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    Next <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    onClick={finish}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary text-primary-foreground shadow-glow px-4 py-1.5 text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    <PartyPopper className="h-3.5 w-3.5" /> Let's go!
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tour-pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.02); opacity: 0.15; }
        }
        .tour-pulse { animation: tour-pulse-ring 2s ease-in-out infinite; transform-box: fill-box; }
        @keyframes tour-bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-slow { animation: tour-bounce-slow 1.8s ease-in-out infinite; }
      `}</style>
    </div>,
    document.body
  );
}

export function shouldAutoStartTour() {
  try { return !localStorage.getItem(STORAGE_KEY); } catch { return false; }
}

export function resetTour() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
