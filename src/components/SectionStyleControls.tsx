import { RESUME_SECTIONS, ResumeSectionKey, SectionStyle } from "@/lib/resumeTemplates";
import { Button } from "@/components/ui/button";
import { Type, RotateCcw } from "lucide-react";

export type SectionStyles = Partial<Record<ResumeSectionKey, SectionStyle>>;

const FONTS = [
  { label: "Inherit", value: "" },
  { label: "Modern Sans", value: "Inter, sans-serif" },
  { label: "Classic Serif", value: "'Libre Baskerville', serif" },
  { label: "Clean Mono", value: "'JetBrains Mono', monospace" },
  { label: "Professional", value: "system-ui, sans-serif" },
];

export function SectionStyleControls({
  value, onChange, baseSize,
}: { value: SectionStyles; onChange: (v: SectionStyles) => void; baseSize: number }) {
  const set = (key: ResumeSectionKey, patch: Partial<SectionStyle>) =>
    onChange({ ...value, [key]: { ...(value[key] || {}), ...patch } });

  return (
    <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-card">
      <div className="flex items-center justify-between mb-5 border-b pb-4">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Per-section typography</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset all
        </Button>
      </div>
      <div className="space-y-3">
        {RESUME_SECTIONS.map(({ key, label }) => {
          const s = value[key] || {};
          const size = s.fontSize ?? (key === "headings" ? Math.round(baseSize) : baseSize);
          return (
            <div key={key} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
              <span className="text-sm font-medium min-w-[9rem]">{label}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => set(key, { fontSize: Math.max(6, size - 1) })}>-</Button>
                <span className="text-xs font-bold w-8 text-center">{s.fontSize ? `${s.fontSize}` : "auto"}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => set(key, { fontSize: Math.min(28, size + 1) })}>+</Button>
              </div>
              <select
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none"
                value={s.fontFamily || ""}
                onChange={e => set(key, { fontFamily: e.target.value || undefined })}
              >
                {FONTS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
              </select>
              <Button
                variant={s.bold ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs font-bold"
                onClick={() => set(key, { bold: s.bold ? undefined : true })}
              >B</Button>
              <Button
                variant={s.italic ? "default" : "outline"} size="sm" className="h-7 px-2 text-xs italic"
                onClick={() => set(key, { italic: s.italic ? undefined : true })}
              >I</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground ml-auto"
                onClick={() => { const n = { ...value }; delete n[key]; onChange(n); }}>
                Reset
              </Button>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        These override the global font settings for that section only — in the preview and in PDF exports.
      </p>
    </div>
  );
}
