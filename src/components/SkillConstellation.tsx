import { useEffect, useRef } from "react";

/**
 * Skill Constellation background
 * - Desktop (hover: hover): cursor-reactive glow + gentle parallax
 * - Mobile / touch: static twinkle only (no pointer tracking, preserves battery + scroll)
 */

type Node = {
  x: number; // base position (0..1 of canvas)
  y: number;
  r: number; // radius
  phase: number; // twinkle phase
  speed: number; // twinkle speed
  label?: string;
};

const LABELS = [
  "₹18 LPA",
  "Selected ✓",
  "Hired at Google",
  "Offer received",
  "₹24 LPA",
  "Interview cleared",
  "Promoted",
  "Dream job ✨",
  "₹12 LPA",
  "Joined Razorpay",
];

export function SkillConstellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -9999, y: -9999, active: false });
  const nodesRef = useRef<Node[]>([]);
  const isDesktopRef = useRef(false);
  const ripplesRef = useRef<{ x: number; y: number; start: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    isDesktopRef.current = isDesktop;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const parent = canvas.parentElement!;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes(w, h);
    };

    const buildNodes = (w: number, h: number) => {
      // fewer nodes on mobile
      const density = isDesktop ? 0.00012 : 0.00007;
      const count = Math.max(28, Math.floor(w * h * density));
      const nodes: Node[] = [];
      // labelled skill nodes (spread out)
      const labelCount = Math.min(LABELS.length, isDesktop ? 8 : 5);
      for (let i = 0; i < labelCount; i++) {
        nodes.push({
          x: (0.1 + Math.random() * 0.8),
          y: (0.15 + Math.random() * 0.7),
          r: 2.6,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.4,
          label: LABELS[i],
        });
      }
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random(),
          y: Math.random(),
          r: 0.8 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.7,
        });
      }
      nodesRef.current = nodes;
    };

    resize();
    window.addEventListener("resize", resize);

    let mouseHandler: ((e: PointerEvent) => void) | null = null;
    let leaveHandler: (() => void) | null = null;
    if (isDesktop) {
      mouseHandler = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current.x = e.clientX - rect.left;
        mouseRef.current.y = e.clientY - rect.top;
        mouseRef.current.active = true;
      };
      leaveHandler = () => {
        mouseRef.current.active = false;
        mouseRef.current.x = -9999;
        mouseRef.current.y = -9999;
      };
      canvas.parentElement!.addEventListener("pointermove", mouseHandler);
      canvas.parentElement!.addEventListener("pointerleave", leaveHandler);
    }

    // Mobile / touch: tap anywhere over the hero to make the constellation blink
    let tapHandler: ((e: PointerEvent) => void) | null = null;
    if (!isDesktop) {
      tapHandler = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
        ripplesRef.current.push({ x, y, start: performance.now() });
        if (ripplesRef.current.length > 4) ripplesRef.current.shift();
      };
      canvas.parentElement!.addEventListener("pointerdown", tapHandler, { passive: true, capture: true });
    }

    const start = performance.now();
    const REACH = 160; // px cursor influence radius
    const RIPPLE_MS = 1600; // tap highlight duration
    const LINK = isDesktop ? 130 : 100; // link distance px

    const render = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;
      // compute positions with parallax
      const positions: { x: number; y: number; glow: number; n: Node }[] = nodes.map((n) => {
        let px = n.x * w;
        let py = n.y * h;
        let glow = 0;
        if (isDesktopRef.current && mouseRef.current.active) {
          const dx = px - mouseRef.current.x;
          const dy = py - mouseRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < REACH) {
            const f = 1 - dist / REACH;
            // gentle pull toward cursor
            px -= dx * 0.08 * f;
            py -= dy * 0.08 * f;
            glow = f;
          }
        }
        // touch ripples: expanding highlight wave from the tap point
        if (!isDesktopRef.current && ripplesRef.current.length) {
          for (const rp of ripplesRef.current) {
            const age = (now - rp.start) / RIPPLE_MS;
            if (age < 0 || age > 1) continue;
            const dist = Math.hypot(px - rp.x, py - rp.y);
            const waveR = age * Math.max(w, h) * 0.9;
            const band = 1 - Math.min(1, Math.abs(dist - waveR) / 110);
            const fade = 1 - age;
            const g = band * fade;
            if (g > glow) glow = g;
          }
        }
        return { x: px, y: py, glow, n };
      });

      // draw links
      ctx.lineWidth = 1;
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            const base = (1 - d / LINK) * 0.12;
            const boost = Math.max(a.glow, b.glow) * 0.35;
            ctx.strokeStyle = `hsla(152, 76%, 45%, ${base + boost})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // draw nodes
      for (const p of positions) {
        const twinkle = 0.55 + Math.sin(t * p.n.speed + p.n.phase) * 0.35;
        const alpha = Math.min(1, twinkle + p.glow * 0.6);
        const r = p.n.r + p.glow * 2.5;

        if (p.glow > 0.05 || p.n.label) {
          // outer glow
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
          grad.addColorStop(0, `hsla(152, 80%, 55%, ${0.35 * (p.glow + (p.n.label ? 0.25 : 0))})`);
          grad.addColorStop(1, "hsla(152, 80%, 55%, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `hsla(152, 76%, 50%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        if (p.n.label) {
          ctx.font = "600 11px ui-sans-serif, system-ui, -apple-system";
          ctx.fillStyle = `hsla(152, 55%, 40%, ${0.7 + p.glow * 0.3})`;
          ctx.fillText(p.n.label, p.x + r + 7, p.y + 4);
        }
      }

      if (ripplesRef.current.length) {
        ripplesRef.current = ripplesRef.current.filter((rp) => now - rp.start < RIPPLE_MS);
      }

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      if (mouseHandler) canvas.parentElement?.removeEventListener("pointermove", mouseHandler);
      if (leaveHandler) canvas.parentElement?.removeEventListener("pointerleave", leaveHandler);
      if (tapHandler) canvas.parentElement?.removeEventListener("pointerdown", tapHandler, { capture: true } as EventListenerOptions);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none opacity-70 dark:opacity-50"
      aria-hidden="true"
    />
  );
}
