import { useState } from "react";

/**
 * Decorative 3D rotating resume card behind the hero text.
 * Realistic resume content on the front, ATS score dashboard on the back.
 * Users can pause the auto-spin on hover and click to flip manually.
 */
export const FloatingResume = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isManual, setIsManual] = useState(false);

  return (
    <div
      aria-hidden
      className="floating-resume-root pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ perspective: "1600px" }}
    >
      {/* Glow halo — hidden on mobile to avoid blur repaint cost */}
      <div
        className="halo absolute h-[460px] w-[460px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.25), transparent 70%)",
          animation: "halo-pulse 6s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />

      <div
        className="resume-card relative pointer-events-auto cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          setIsFlipped((f) => !f);
          setIsManual(true);
        }}
        style={{
          transformStyle: "preserve-3d",
          opacity: 0.85,
          willChange: "transform",
          ...(isManual
            ? {
                transform: `rotateY(${isFlipped ? 180 : 0}deg) rotateX(8deg)`,
                transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                animation: "none",
              }
            : {
                animation: "resume-spin 18s linear infinite",
                animationPlayState: isHovered ? "paused" : "running",
              }),
        }}
      >
        {/* ============ FRONT: Resume ============ */}
        <div
          className="absolute inset-0 rounded-2xl border border-primary/20 shadow-2xl overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
            background:
              "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
          }}
        >
          {/* Top header strip */}
          <div className="px-5 pt-5 pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                AS
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-foreground leading-tight">
                  Arjun Sharma
                </div>
                <div className="text-[9px] text-muted-foreground">
                  Senior Product Designer · Bangalore
                </div>
              </div>
              <div className="text-[8px] text-primary font-semibold border border-primary/40 rounded px-1.5 py-0.5">
                PDF
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-3 space-y-3">
            <div>
              <div className="text-[9px] font-bold text-primary tracking-widest mb-1">
                EXPERIENCE
              </div>
              <div className="flex justify-between items-baseline">
                <div className="text-[10px] font-semibold text-foreground">
                  Lead Designer · Razorpay
                </div>
                <div className="text-[8px] text-muted-foreground">2022 — Now</div>
              </div>
              <div className="space-y-1 mt-1">
                <div className="h-1 w-[95%] rounded-full bg-foreground/20" />
                <div className="h-1 w-[88%] rounded-full bg-foreground/20" />
                <div className="h-1 w-[72%] rounded-full bg-foreground/20" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline">
                <div className="text-[10px] font-semibold text-foreground">
                  Product Designer · Swiggy
                </div>
                <div className="text-[8px] text-muted-foreground">2019 — 22</div>
              </div>
              <div className="space-y-1 mt-1">
                <div className="h-1 w-[90%] rounded-full bg-foreground/20" />
                <div className="h-1 w-[65%] rounded-full bg-foreground/20" />
              </div>
            </div>

            <div>
              <div className="text-[9px] font-bold text-primary tracking-widest mb-1.5">
                SKILLS
              </div>
              <div className="flex flex-wrap gap-1">
                {["Figma", "Design Systems", "UX Research", "Prototyping", "React", "A/B Testing"].map(
                  (s) => (
                    <span
                      key={s}
                      className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {s}
                    </span>
                  )
                )}
              </div>
            </div>

            <div>
              <div className="text-[9px] font-bold text-primary tracking-widest mb-1">
                EDUCATION
              </div>
              <div className="text-[10px] font-semibold text-foreground">
                B.Des — NID Ahmedabad
              </div>
              <div className="text-[8px] text-muted-foreground">
                Gold Medalist, 2019
              </div>
            </div>
          </div>

          {/* Scanning line */}
          <div
            className="absolute left-0 right-0 top-0 h-[2px] pointer-events-none block"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)",
              boxShadow: "0 0 12px hsl(var(--primary))",
              animation: "scan-line 3s ease-in-out infinite",
              willChange: "transform, opacity",
            }}
          />
        </div>

        {/* ============ BACK: ATS Score Dashboard ============ */}
        <div
          className="absolute inset-0 rounded-2xl border border-primary/30 shadow-2xl overflow-hidden p-5"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background:
              "linear-gradient(160deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--card)) 60%)",
          }}
        >
          <div className="text-[9px] font-bold text-primary tracking-widest mb-3">
            ATS COMPATIBILITY REPORT
          </div>

          {/* Big score */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${0.94 * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-extrabold text-foreground">94</div>
                <div className="text-[7px] text-muted-foreground -mt-0.5">/ 100</div>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-bold text-foreground">
                Excellent Match
              </div>
              <div className="text-[9px] text-muted-foreground leading-snug mt-0.5">
                Beats 92% of resumes for this role at top-tier companies.
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2">
            {[
              { label: "Keyword Match", val: 96, color: "hsl(var(--primary))" },
              { label: "Formatting", val: 100, color: "hsl(142 76% 45%)" },
              { label: "Recruiter Appeal", val: 88, color: "hsl(var(--primary))" },
              { label: "Impact Verbs", val: 91, color: "hsl(142 76% 45%)" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-bold text-foreground">{row.val}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.val}%`, background: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[9px] text-primary font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Optimized for: Senior Product Designer
          </div>
        </div>
      </div>

      <style>{`
        .resume-card {
          width: 260px;
          height: 360px;
        }
        @media (min-width: 640px) {
          .resume-card { width: 320px; height: 420px; }
        }
        @media (min-width: 1024px) {
          .resume-card { width: 360px; height: 470px; }
        }
        @keyframes resume-spin {
          0%   { transform: rotateY(0deg)   rotateX(8deg); }
          100% { transform: rotateY(360deg) rotateX(8deg); }
        }
        @keyframes scan-line {
          0%   { transform: translateY(0);     opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(420px); opacity: 0; }
        }
        @keyframes halo-pulse {
          0%, 100% { transform: scale(1);   opacity: 0.6; }
          50%      { transform: scale(1.1); opacity: 1;   }
        }
        @media (prefers-reduced-motion: reduce) {
          .resume-card, .halo, .floating-resume-root * {
            animation: none !important;
          }
        }
        /* Lighter load on small touch screens to keep scrolling smooth */
        @media (max-width: 639px) {
          .resume-card {
            width: 200px; height: 280px;
            animation-duration: 30s;
            opacity: 0.4 !important;
            pointer-events: none !important;
          }
          .halo { width: 300px !important; height: 300px !important; }
        }
      `}</style>
    </div>
  );
};
