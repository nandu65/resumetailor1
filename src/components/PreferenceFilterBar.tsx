import { ChevronDown } from "lucide-react";
import { COLOR_SWATCHES, ResumePrefs } from "./TemplatePreferencesWizard";
import { TemplateId } from "@/lib/resumeTemplates";

export const TEMPLATE_META: Record<TemplateId, { style: ResumePrefs["style"]; columns: 1 | 2; photoFriendly: boolean }> = {
  modern:    { style: "modern",    columns: 2, photoFriendly: true  },
  classic:   { style: "classic",   columns: 1, photoFriendly: false },
  compact:   { style: "modern",    columns: 1, photoFriendly: false },
  executive: { style: "executive", columns: 1, photoFriendly: false },
  creative:  { style: "creative",  columns: 2, photoFriendly: true  },
  minimal:   { style: "minimal",   columns: 1, photoFriendly: false },
};

export function scoreTemplate(id: TemplateId, prefs: ResumePrefs): number {
  const m = TEMPLATE_META[id];
  let score = 0;
  if (prefs.style !== "any" && m.style === prefs.style) score += 3;
  if (prefs.columns !== 0 && m.columns === prefs.columns) score += 2;
  if (prefs.photo === "with" && m.photoFriendly) score += 2;
  if (prefs.photo === "without" && !m.photoFriendly) score += 1;
  return score;
}

export function PreferenceFilterBar({
  prefs, onChange, onOpenWizard,
}: {
  prefs: ResumePrefs;
  onChange: (p: ResumePrefs) => void;
  onOpenWizard: () => void;
}) {
  const sel =
    "text-xs bg-background border border-border rounded-lg px-3 py-2 pr-7 appearance-none cursor-pointer hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <div className="rounded-xl border border-border bg-accent/40 p-3 flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold text-muted-foreground">Filter by</span>

      <div className="relative">
        <select value={prefs.photo} onChange={e => onChange({ ...prefs, photo: e.target.value as any })} className={sel}>
          <option value="without">Without photo</option>
          <option value="with">With photo</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-muted-foreground" />
      </div>

      <div className="relative">
        <select value={prefs.style} onChange={e => onChange({ ...prefs, style: e.target.value as any })} className={sel}>
          <option value="any">All styles</option>
          <option value="modern">Modern</option>
          <option value="classic">Classic</option>
          <option value="creative">Creative</option>
          <option value="executive">Executive</option>
          <option value="minimal">Minimal</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-muted-foreground" />
      </div>

      <div className="relative">
        <select value={String(prefs.columns)} onChange={e => onChange({ ...prefs, columns: Number(e.target.value) as any })} className={sel}>
          <option value="0">Any columns</option>
          <option value="1">1 column</option>
          <option value="2">2 columns</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-muted-foreground" />
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Colors</span>
        {COLOR_SWATCHES.map(c => {
          const sel = prefs.color === c.hex;
          return (
            <button key={c.hex} type="button" onClick={() => onChange({ ...prefs, color: c.hex })}
              className={`h-6 w-6 rounded-full transition-all hover:scale-110 ${sel ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "ring-1 ring-border"}`}
              style={{ background: c.hex }} aria-label={c.label}
            />
          );
        })}
        <button type="button" onClick={onOpenWizard} className="ml-2 text-xs font-semibold text-primary underline">
          Redo wizard
        </button>
      </div>
    </div>
  );
}
