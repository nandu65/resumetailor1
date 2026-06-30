/**
 * Decorative 3D rotating resume that sits behind the hero text.
 * Pure CSS animation — no deps.
 */
export const FloatingResume = () => {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ perspective: "1400px" }}
    >
      <div
        className="relative"
        style={{
          width: "320px",
          height: "420px",
          transformStyle: "preserve-3d",
          animation: "resume-spin 14s linear infinite",
          opacity: 0.18,
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-card border border-primary/30 shadow-2xl p-6"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="h-3 w-1/2 rounded-full bg-primary/70 mb-2" />
          <div className="h-2 w-1/3 rounded-full bg-muted-foreground/40 mb-5" />
          <div className="space-y-2">
            {[100, 90, 75, 95, 60, 85, 70, 88, 55, 80, 92, 65].map((w, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full bg-foreground/30"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
          <div className="mt-5 h-3 w-1/3 rounded-full bg-primary/60 mb-2" />
          <div className="space-y-2">
            {[95, 70, 85, 60].map((w, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full bg-foreground/25"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-primary border border-primary/40 shadow-2xl p-6"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="h-3 w-2/3 rounded-full bg-primary-foreground/80 mb-2" />
          <div className="h-2 w-1/3 rounded-full bg-primary-foreground/50 mb-5" />
          <div className="space-y-2">
            {[90, 70, 80, 60, 85, 95, 65, 78, 88, 55, 70, 90].map((w, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full bg-primary-foreground/60"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes resume-spin {
          0% { transform: rotateY(0deg) rotateX(6deg); }
          100% { transform: rotateY(360deg) rotateX(6deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="resume-spin"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
};
