import { diffWords } from "diff";

export function DiffView({ original, improved }: { original: string; improved: string }) {
  const parts = diffWords(original, improved);
  return (
    <div className="text-sm leading-relaxed">
      {parts.map((p, i) => {
        if (p.added) return <span key={i} className="bg-primary/15 text-primary font-semibold rounded px-0.5">{p.value}</span>;
        if (p.removed) return <span key={i} className="bg-destructive/15 text-destructive line-through decoration-1 rounded px-0.5">{p.value}</span>;
        return <span key={i} className="text-foreground/80">{p.value}</span>;
      })}
    </div>
  );
}
