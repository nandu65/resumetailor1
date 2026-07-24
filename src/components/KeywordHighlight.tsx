import { useMemo } from "react";

type Tone = "missing" | "present";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Highlights the given keywords inside a body of text. Case-insensitive,
 * whole-word matching. Missing keywords render in a warning tone (they
 * appear in the JD but not in the resume), present keywords render in a
 * primary/positive tone.
 */
export function KeywordHighlight({
  text,
  keywords,
  tone = "missing",
  emptyLabel = "No text provided.",
}: {
  text: string;
  keywords: string[];
  tone?: Tone;
  emptyLabel?: string;
}) {
  const parts = useMemo(() => {
    if (!text) return [] as { value: string; hit: boolean; kw?: string }[];
    const kws = Array.from(new Set(keywords.filter((k) => k && k.trim().length > 1))).sort(
      (a, b) => b.length - a.length,
    );
    if (kws.length === 0) return [{ value: text, hit: false }];
    const pattern = new RegExp(`(${kws.map(escapeRegex).join("|")})`, "gi");
    const out: { value: string; hit: boolean; kw?: string }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      if (m.index > last) out.push({ value: text.slice(last, m.index), hit: false });
      out.push({ value: m[0], hit: true, kw: m[1] });
      last = m.index + m[0].length;
      if (m[0].length === 0) pattern.lastIndex++;
    }
    if (last < text.length) out.push({ value: text.slice(last), hit: false });
    return out;
  }, [text, keywords]);

  if (!text) return <p className="text-sm text-muted-foreground italic">{emptyLabel}</p>;

  const hitClass =
    tone === "missing"
      ? "bg-warning/25 text-foreground border-b-2 border-warning font-semibold rounded-sm px-0.5"
      : "bg-primary/15 text-primary border-b-2 border-primary/60 font-semibold rounded-sm px-0.5";

  return (
    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-sans">
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className={hitClass} title={p.kw}>
            {p.value}
          </mark>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </pre>
  );
}
