import { useState } from "react";
import { X, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export type ResumePrefs = {
  style: "modern" | "classic" | "creative" | "executive" | "minimal" | "any";
  color: string; // hex
  photo: "with" | "without";
  columns: 1 | 2 | 0; // 0 = any
};

export const DEFAULT_PREFS: ResumePrefs = {
  style: "any",
  color: "#4f46e5",
  photo: "without",
  columns: 0,
};

export const COLOR_SWATCHES = [
  { hex: "#ffffff", label: "White" },
  { hex: "#1f2937", label: "Charcoal" },
  { hex: "#a89689", label: "Taupe" },
  { hex: "#0f2340", label: "Navy" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#0ea5b7", label: "Teal" },
  { hex: "#0f766e", label: "Emerald" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#dc2626", label: "Crimson" },
];

const STYLES = [
  { id: "modern", label: "Modern", desc: "Clean, tech-forward" },
  { id: "classic", label: "Classic", desc: "Safe, ATS-friendly" },
  { id: "creative", label: "Creative", desc: "Bold, design roles" },
  { id: "executive", label: "Executive", desc: "Serif, senior roles" },
  { id: "minimal", label: "Minimal", desc: "Airy whitespace" },
] as const;

export function TemplatePreferencesWizard({
  open, onOpenChange, onDone, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: (prefs: ResumePrefs) => void;
  initial?: ResumePrefs;
}) {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<ResumePrefs>(initial ?? DEFAULT_PREFS);
  const total = 4;

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else { onDone(prefs); onOpenChange(false); setStep(0); }
  };
  const back = () => step > 0 && setStep(step - 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="relative p-8">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-2 bg-muted"}`} />
            ))}
          </div>

          {step > 0 && (
            <button onClick={back} className="absolute top-6 left-6 p-1 rounded hover:bg-accent" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <button onClick={() => onOpenChange(false)} className="absolute top-6 right-6 p-1 rounded hover:bg-accent" aria-label="Close">
            <X className="h-5 w-5" />
          </button>

          {/* STEP 0: STYLE */}
          {step === 0 && (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-bold text-center">Pick a style</h2>
              <p className="text-sm text-muted-foreground text-center mt-1">We'll recommend templates that match your vibe.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                {STYLES.map(s => {
                  const sel = prefs.style === s.id;
                  return (
                    <button key={s.id} type="button" onClick={() => setPrefs({ ...prefs, style: s.id })}
                      className={`rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 ${sel ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/50"}`}>
                      <div className="font-display font-semibold text-sm flex items-center gap-1.5">
                        {s.label} {sel && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">{s.desc}</div>
                    </button>
                  );
                })}
                <button type="button" onClick={() => setPrefs({ ...prefs, style: "any" })}
                  className={`rounded-xl border-2 border-dashed p-4 text-left transition-all ${prefs.style === "any" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <div className="font-display font-semibold text-sm">Show all</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Don't filter — surprise me.</div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: COLOR */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-bold text-center">Pick a color</h2>
              <p className="text-sm text-muted-foreground text-center mt-1">We'll use this to accent your resume — change anytime.</p>
              <div className="grid grid-cols-3 gap-6 mt-8 max-w-sm mx-auto">
                {COLOR_SWATCHES.map(c => {
                  const sel = prefs.color === c.hex;
                  return (
                    <button key={c.hex} type="button" onClick={() => setPrefs({ ...prefs, color: c.hex })}
                      className={`aspect-square rounded-full shadow-md transition-all hover:scale-110 flex items-center justify-center ${sel ? "ring-4 ring-primary ring-offset-2 ring-offset-background scale-110" : "ring-1 ring-border"}`}
                      style={{ background: c.hex }}
                      aria-label={c.label}
                    >
                      {sel && <Check className="h-6 w-6" style={{ color: c.hex === "#ffffff" ? "#000" : "#fff" }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: PHOTO */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-bold text-center">Include your photo?</h2>
              <p className="text-sm text-muted-foreground text-center mt-1">Standard practice in some regions & industries.</p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {(["without", "with"] as const).map(p => {
                  const sel = prefs.photo === p;
                  return (
                    <button key={p} type="button" onClick={() => setPrefs({ ...prefs, photo: p })}
                      className={`rounded-xl border-2 p-4 transition-all ${sel ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/50"}`}>
                      <div className="font-display font-bold text-center mb-3">{p === "without" ? "No photo" : "Photo"}</div>
                      <div className="aspect-[3/4] rounded-lg bg-background border border-border p-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          {p === "with" && <div className="h-8 w-8 rounded-full bg-primary/30 flex-shrink-0" />}
                          <div className="h-2 flex-1 rounded bg-muted" />
                        </div>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="h-1.5 rounded bg-muted" style={{ width: `${50 + ((i * 17) % 45)}%` }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: LAYOUT */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="font-display text-2xl font-bold text-center">Which layout do you prefer?</h2>
              <p className="text-sm text-muted-foreground text-center mt-1">One column saves space; two columns look modern and organized.</p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {[
                  { id: 1 as const, label: "One column" },
                  { id: 2 as const, label: "Two columns" },
                ].map(l => {
                  const sel = prefs.columns === l.id;
                  return (
                    <button key={l.id} type="button" onClick={() => setPrefs({ ...prefs, columns: l.id })}
                      className={`rounded-xl border-2 p-4 transition-all ${sel ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/50"}`}>
                      <div className="font-display font-bold text-center mb-3">{l.label}</div>
                      <div className="aspect-[3/4] rounded-lg bg-background border border-border p-3">
                        {l.id === 1 ? (
                          <div className="flex flex-col gap-1.5 h-full">
                            <div className="h-3 rounded bg-muted mb-1" />
                            {Array.from({ length: 9 }).map((_, i) => (
                              <div key={i} className="h-1.5 rounded bg-muted" style={{ width: `${55 + ((i * 13) % 40)}%` }} />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-[35%_1fr] gap-2 h-full">
                            <div className="rounded flex flex-col gap-1.5 p-1.5" style={{ background: prefs.color, opacity: 0.85 }}>
                              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-1 rounded bg-white/60" />)}
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <div className="h-2 rounded bg-muted" />
                              {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-1.5 rounded bg-muted" style={{ width: `${60 + ((i * 11) % 35)}%` }} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setPrefs({ ...prefs, columns: 0 })}
                className={`mt-3 mx-auto block text-xs underline ${prefs.columns === 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                No preference — show both
              </button>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Button onClick={next} size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow px-8">
              {step === total - 1 ? "See my templates" : "Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
