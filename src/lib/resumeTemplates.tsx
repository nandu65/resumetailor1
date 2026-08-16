import React, { useEffect, useRef } from "react";
import jsPDF from "jspdf";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  BorderStyle, LevelFormat, PageBreak,
} from "docx";
import { saveAs } from "file-saver";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { MousePointer2 } from "lucide-react";



export interface ResumeData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: { label: string; url: string }[];
  summary: string;
  experience: { company: string; role: string; location: string; start: string; end: string; bullets: string[] }[];
  education: { school: string; degree: string; location: string; start: string; end: string; details: string }[];
  projects: { name: string; tech: string; bullets: string[] }[];
  skills: { category: string; items: string[] }[];
  certifications: string[];
  settings?: {
    fontSize?: number;
    fontFamily?: string;
    sections?: Partial<Record<ResumeSectionKey, SectionStyle>>;
    sectionOrder?: string[];
  };

  _isPolished?: boolean;
}

export type ResumeSectionKey =
  | "headings" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications";


export interface SectionStyle {
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  letterSpacing?: number;
}

export const RESUME_SECTIONS: { key: ResumeSectionKey; label: string }[] = [
  { key: "headings", label: "Section headings" },
  { key: "summary", label: "Summary" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "projects", label: "Projects" },
  { key: "certifications", label: "Certifications" },
];



export type TemplateId =
  | "modern" | "classic" | "compact" | "executive" | "creative" | "minimal"
  | "timeline" | "elegant" | "sidebar-dark" | "photo-header"
  | "centered-serif" | "banner-photo" | "teal-left" | "photo-grid" | "logo-boxed";

export const TEMPLATES: { id: TemplateId; name: string; desc: string; previewUrl?: string }[] = [
  { 
    id: "modern", 
    name: "Modern Professional", 
    desc: "Clean sidebar layout with emerald accents, ideal for technology and design roles.",
    previewUrl: "/__l5e/assets-v1/270ae0f4-90a9-4cce-8613-5f0c2759fea3/resume-modern.png" 
  },
  { 
    id: "executive", 
    name: "Executive Serif", 
    desc: "Distinguished typography with amber-toned headers for senior leadership positions.",
    previewUrl: "/__l5e/assets-v1/799a2e4f-96fe-40f9-bdc9-fb2c1276ba9d/resume-executive.png" 
  },
  { 
    id: "creative", 
    name: "Creative Indigo", 
    desc: "Bold gradient header and two-column structure for marketing and creative professionals.",
    previewUrl: "/__l5e/assets-v1/3af83925-7929-49ab-ba75-a80ffe563299/resume-creative.png" 
  },
  { 
    id: "minimal", 
    name: "Ultra Minimal", 
    desc: "Sophisticated use of whitespace and light weights for a modern, airy aesthetic.",
    previewUrl: "/__l5e/assets-v1/4a23c33e-0f60-4bca-8abc-f50a3631fdce/resume-minimal.png" 
  },
  { 
    id: "classic", 
    name: "Classic ATS-Optimized", 
    desc: "Single-column format designed for maximum compatibility with tracking systems.",
    previewUrl: "/__l5e/assets-v1/bce36fa0-e17a-4422-a3b1-2201bb09f002/resume-classic.png" 
  }
];


/* ---------- Inline editable primitive ---------- */
export const Editable = React.memo(function Editable({
  value, onChange, className, as = "span", multiline = false, style
}: {
  value: string;
  onChange?: (v: string) => void;
  className?: string;
  as?: any;
  multiline?: boolean;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      const isHtml = value?.includes("<") && value?.includes(">");
      if (isHtml) {
        if (ref.current.innerHTML !== value) ref.current.innerHTML = value;
      } else {
        if (ref.current.innerText !== value) ref.current.innerText = value;
      }
    }
  }, [value]);

  const editable = !!onChange;
  const Tag: any = as;

  return (
    <Tag
      ref={ref}
      contentEditable={editable}
      suppressContentEditableWarning
      className={
        (className || "") +
        (editable
          ? " outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/40 rounded px-0.5"
          : "")
      }
      style={{ ...style, cursor: editable ? "text" : "default" }}
      onPointerDown={(e: React.PointerEvent) => {
        if (editable) e.stopPropagation();
      }}
      onBlur={
        editable
          ? (e: any) => {
              const html = e.currentTarget.innerHTML as string;
              const hasMarkup = /<(b|i|u|strong|em|span|font)\b/i.test(html);
              const txt = multiline || hasMarkup
                ? html.replace(/<div>/gi, multiline ? "<div>" : " ").replace(/<\/div>/gi, "").trim()
                : (e.currentTarget.innerText as string).replace(/\s+/g, " ").trim();
              if (txt !== value) onChange!(txt);
            }
          : undefined
      }
      dangerouslySetInnerHTML={value?.includes("<") ? { __html: value } : undefined}
    >
      {!value?.includes("<") ? value : null}
    </Tag>

  );
});


/** Bullets editor: one <li> per bullet, editable, splits on Enter via onBlur parse. */
export function BulletsEditor({
  bullets, onChange, className,
}: { bullets: string[]; onChange?: (v: string[]) => void; className?: string }) {
  const editable = !!onChange;
  const ref = useRef<HTMLUListElement>(null);
  const text = bullets.join("\n");
  
  useEffect(() => {
    if (!ref.current) return;
    const current = Array.from(ref.current.querySelectorAll("li"))
      .map((li) => (li.innerHTML || "").trim())
      .join("\n");
    if (current !== text) {
      ref.current.innerHTML = bullets.map((b) => `<li>${b}</li>`).join("");
    }
  }, [text, bullets]);

  return (
    <ul
      ref={ref}
      contentEditable={editable}
      suppressContentEditableWarning
      className={
        (className || "") +
        (editable ? " outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/40 rounded px-1 min-h-[1em]" : "")
      }
      onBlur={
        editable
          ? (e) => {
              const items = Array.from(e.currentTarget.querySelectorAll("li"))
                .map((li) => (li.innerHTML || "").trim())
                .filter(Boolean);
              onChange!(items);
            }
          : undefined
      }

    />
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function cloneResumeData(r: ResumeData): ResumeData {
  return JSON.parse(JSON.stringify(r));
}



/* ---------- Update helpers passed down to previews ---------- */
type UpdateFn = ((patch: Partial<ResumeData>) => void) | undefined;

function makeExpUpdater(update: UpdateFn, r: ResumeData, i: number) {
  return (patch: Partial<ResumeData["experience"][number]>) =>
    update?.({ experience: r.experience.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
}
function makeEduUpdater(update: UpdateFn, r: ResumeData, i: number) {
  return (patch: Partial<ResumeData["education"][number]>) =>
    update?.({ education: r.education.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
}
function makeProjUpdater(update: UpdateFn, r: ResumeData, i: number) {
  return (patch: Partial<ResumeData["projects"][number]>) =>
    update?.({ projects: r.projects.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
}
function makeSkillUpdater(update: UpdateFn, r: ResumeData, i: number) {
  return (patch: Partial<ResumeData["skills"][number]>) =>
    update?.({ skills: r.skills.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
}


/** A skill group category label. Hidden when the category is generic (e.g. "Skills"),
 *  so the section heading isn't repeated for every single skill row. */
export function isGenericSkillCategory(c?: string) {
  return !c || /^(skills?|general|others?|misc|key skills)$/i.test(c.trim());
}

function SkillCat({ value, onChange, className, as, colon }: {
  value: string;
  onChange?: (v: string) => void;
  className?: string;
  as?: any;
  colon?: boolean;
}) {
  if (isGenericSkillCategory(value)) return null;
  return (
    <span className={className}>
      <Editable as={as} value={value} onChange={onChange} className={as ? className : undefined} />
      {colon ? ":" : null}
    </span>
  );
}

/** Merge all generic-category skill groups into a single group so "Skills" appears once. */
export function normalizeResumeSkills<T extends { skills?: { category: string; items: string[] }[] }>(r: T): T {
  if (!r?.skills?.length) return r;
  const generic: string[] = [];
  const named: { category: string; items: string[] }[] = [];
  for (const g of r.skills) {
    if (isGenericSkillCategory(g.category)) generic.push(...(g.items || []));
    else named.push(g);
  }
  if (generic.length === 0) return r;
  const seen = new Set<string>();
  const items = generic.filter(i => { const k = i.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  return { ...r, skills: [{ category: "Skills", items }, ...named] };
}


export type RichSegment = { text: string; bold: boolean; italic: boolean; underline: boolean; fontSize?: number; fontFamily?: string };

/** Parse inline HTML produced by the editable preview into styled segments used by PDF/DOCX export. */
export function parseRichSegments(html: string): RichSegment[] {
  if (!html) return [{ text: "", bold: false, italic: false, underline: false }];
  if (typeof document === "undefined" || !/[<&]/.test(html)) {
    return [{ text: html, bold: false, italic: false, underline: false }];
  }
  const root = document.createElement("div");
  root.innerHTML = html;
  const out: RichSegment[] = [];
  const walk = (node: Node, inherited: Omit<RichSegment, "text">) => {
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || "";
        if (text) out.push({ ...inherited, text });
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const style = el.style;
      const next: Omit<RichSegment, "text"> = {
        bold: inherited.bold || tag === "b" || tag === "strong" || parseInt(style.fontWeight || "0", 10) >= 600 || style.fontWeight === "bold",
        italic: inherited.italic || tag === "i" || tag === "em" || style.fontStyle === "italic",
        underline: inherited.underline || tag === "u" || (style.textDecoration || "").includes("underline"),
        fontSize: style.fontSize ? parseFloat(style.fontSize) : inherited.fontSize,
        fontFamily: style.fontFamily || inherited.fontFamily,
      };
      walk(el, next);
      if (tag === "br" || tag === "div" || tag === "p" || tag === "li") out.push({ ...next, text: "\n" });
    });
  };
  walk(root, { bold: false, italic: false, underline: false });
  const merged = out.filter(s => s.text !== "");
  return merged.length ? merged : [{ text: "", bold: false, italic: false, underline: false }];
}

/** Plain text of inline HTML (used where styling can't be represented). */
export function richToPlain(html: string) {
  return parseRichSegments(html).map(s => s.text).join("").replace(/\s+/g, " ").trim();
}

/* ---------- HTML Preview components ---------- */
function ModernPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  const sectionOrder = r.settings?.sectionOrder || ["summary", "experience", "projects", "education", "skills", "certifications"];

  const renderSection = (key: string, index: number) => {
    let content = null;
    let title = "";
    
    switch(key) {
      case "summary":
        if (r.summary || update) {
          title = "Summary";
          content = <Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="text-[10px] whitespace-pre-wrap" />;
        }
        break;
      case "experience":
        if (r.experience?.length > 0) {
          title = "Experience";
          content = r.experience.map((e, i) => {
            const upd = makeExpUpdater(update, r, i);
            return (
              <div key={i} className="mb-2">
                <div className="flex justify-between font-semibold text-[11px] gap-2">
                  <span className="flex-1">
                    <Editable value={e.role} onChange={update && (v => upd({ role: v }))} /> · <Editable value={e.company} onChange={update && (v => upd({ company: v }))} />
                  </span>
                  <span className="text-neutral-500 text-[9px] whitespace-nowrap">
                    <Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} />
                  </span>
                </div>
                <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5" />
              </div>
            );
          });
        }
        break;
      case "projects":
        if (r.projects?.length > 0) {
          title = "Projects";
          content = r.projects.map((p, i) => {
            const upd = makeProjUpdater(update, r, i);
            return (
              <div key={i} className="mb-2">
                <div className="font-semibold text-[11px]">
                  <Editable value={p.name} onChange={update && (v => upd({ name: v }))} />{" "}
                  <span className="text-neutral-500 font-normal text-[9px]">· <Editable value={p.tech} onChange={update && (v => upd({ tech: v }))} /></span>
                </div>
                <BulletsEditor bullets={p.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5" />
              </div>
            );
          });
        }
        break;
      case "education":
        if (r.education?.length > 0) {
          title = "Education";
          content = r.education.map((e, i) => {
            const upd = makeEduUpdater(update, r, i);
            return (
              <div key={i} className="mb-1">
                <div className="flex justify-between font-semibold text-[11px] gap-2">
                  <span className="flex-1">
                    <Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} />, <Editable value={e.school} onChange={update && (v => upd({ school: v }))} />
                  </span>
                  <span className="text-neutral-500 text-[9px] whitespace-nowrap">
                    <Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} />
                  </span>
                </div>
                <Editable as="div" value={e.details} onChange={update && (v => upd({ details: v }))} className="text-[10px] text-neutral-600" />
              </div>
            );
          });
        }
        break;
      case "skills":
        // In Modern template, Skills are usually in the sidebar. We'll handle them separately or as part of the main flow if needed.
        // For DND, we only reorder main content sections.
        return null;
      case "certifications":
        // Sidebar usually.
        return null;
    }

    if (!content) return null;

    return (
      <Draggable key={key} draggableId={key} index={index}>
        {(provided, snapshot) => (
          <section
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`mb-4 group relative ${snapshot.isDragging ? "opacity-100 z-50 ring-2 ring-primary ring-offset-4 rounded bg-white shadow-2xl" : ""}`}
          >
            <div {...provided.dragHandleProps} className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1">
              <MousePointer2 className="h-3 w-3 text-primary/40" />
            </div>
            <h3 className="uppercase tracking-wider text-[10px] font-bold text-emerald-800 border-b-2 border-emerald-800 pb-0.5 mb-1.5 group-hover:bg-emerald-50 transition-colors">
              {title}
            </h3>
            {content}
          </section>
        )}
      </Draggable>
    );
  };

  return (
    <div 
      className="bg-white text-neutral-900 shadow-elegant rounded-lg overflow-hidden font-sans text-[11px] leading-snug" 
      style={{ 
        minHeight: "var(--page-h, auto)",
        fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined,
        fontFamily: r.settings?.fontFamily || undefined
      }}
    >
      <div className="grid grid-cols-[35%_65%] h-full min-h-[1056px]">
        <div className="bg-emerald-800 text-white p-5">
          <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-bold text-lg leading-tight" />
          <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-emerald-100 text-[10px] mt-0.5" />
          <div className="mt-4 space-y-1 text-[10px] text-emerald-50 break-words">
            <Editable as="div" value={r.email} onChange={update && (v => on({ email: v }))} />
            <Editable as="div" value={r.phone} onChange={update && (v => on({ phone: v }))} />
            <Editable as="div" value={r.location} onChange={update && (v => on({ location: v }))} />
            {r.links?.map((l, i) => (
              <Editable
                key={i}
                as="div"
                value={`${l.label}: ${l.url}`}
                onChange={update && (v => {
                  const [label, ...rest] = v.split(":");
                  on({ links: r.links.map((x, j) => j === i ? { label: (label || "").trim(), url: rest.join(":").trim() } : x) });
                })}
              />
            ))}
          </div>
          {r.skills?.length > 0 && (
            <div className="mt-5">
              <div className="uppercase tracking-wider text-[9px] font-bold border-b border-emerald-600 pb-1 mb-2">Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {r.skills.flatMap(s => s.items).map((it, k) => (
                  <span key={k} className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-700/50 text-emerald-50 border border-emerald-600/30 whitespace-nowrap">
                    {it}
                  </span>
                ))}
              </div>
              {update && (
                <div className="mt-4 pt-2 border-t border-emerald-700/30 opacity-20 hover:opacity-100 transition-opacity">
                  {r.skills.map((s, i) => {
                    const upd = makeSkillUpdater(update, r, i);
                    return (
                      <div key={i} className="mb-2">
                        <SkillCat as="div" value={s.category} onChange={update && (v => upd({ category: v }))} className="font-semibold text-[10px]" />
                        <Editable as="div" value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} className="text-[10px] text-emerald-50" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {r.certifications?.length > 0 && (
            <div className="mt-4">
              <div className="uppercase tracking-wider text-[9px] font-bold border-b border-emerald-600 pb-1 mb-2">Certs</div>
              <Editable as="div" multiline value={r.certifications.join("\n")} onChange={update && (v => on({ certifications: v.split("\n").map(x => x.trim()).filter(Boolean) }))} className="text-[10px] whitespace-pre-wrap" />
            </div>
          )}
        </div>
        <div className="p-5">
          <Droppable droppableId="main-content">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {sectionOrder.map((key, index) => renderSection(key, index))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    </div>
  );
}


function ClassicPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  return (
    <div 
      className="bg-white text-neutral-900 shadow-elegant rounded-lg p-8 font-serif text-[11px] leading-snug" 
      style={{ 
        minHeight: "var(--page-h, auto)",
        fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined,
        fontFamily: r.settings?.fontFamily || undefined
      }}
    >
      <div className="text-center border-b-2 border-neutral-900 pb-2 mb-3">
        <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-bold text-2xl tracking-tight" />
        <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-[11px] mt-0.5" />
        <div className="text-[10px] mt-1 text-neutral-700">
          <Editable value={[r.email, r.phone, r.location, ...(r.links?.map(l => l.url) ?? [])].filter(Boolean).join("  •  ")}
            onChange={update && (v => {
              const parts = v.split("•").map(s => s.trim()).filter(Boolean);
              const [email, phone, location, ...linkUrls] = parts;
              on({
                email: email || "", phone: phone || "", location: location || "",
                links: linkUrls.map((url, i) => ({ label: r.links?.[i]?.label || "Link", url })),
              });
            })} />
        </div>
      </div>
      {(r.summary || update) && (
        <section className="mb-3">
          <h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Summary</h3>
          <Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap" />
        </section>
      )}
      {r.experience?.length > 0 && (
        <section className="mb-3">
          <h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Experience</h3>
          {r.experience.map((e, i) => {
            const upd = makeExpUpdater(update, r, i);
            return (
              <div key={i} className="mb-2">
                <div className="flex justify-between gap-2">
                  <span className="font-bold flex-1"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} />, <Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></span>
                  <span className="text-[10px] whitespace-nowrap"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span>
                </div>
                <Editable as="div" value={e.location} onChange={update && (v => upd({ location: v }))} className="italic text-[10px]" />
                <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5" />
              </div>
            );
          })}
        </section>
      )}
      {r.education?.length > 0 && (
        <section className="mb-3">
          <h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Education</h3>
          {r.education.map((e, i) => {
            const upd = makeEduUpdater(update, r, i);
            return (
              <div key={i} className="mb-1">
                <div className="flex justify-between gap-2"><span className="font-bold flex-1"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} />, <Editable value={e.school} onChange={update && (v => upd({ school: v }))} /></span><span className="text-[10px] whitespace-nowrap"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span></div>
                <Editable as="div" value={e.details} onChange={update && (v => upd({ details: v }))} className="text-[10px]" />
              </div>
            );
          })}
        </section>
      )}
      {r.projects?.length > 0 && (
        <section className="mb-3">
          <h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Projects</h3>
          {r.projects.map((p, i) => {
            const upd = makeProjUpdater(update, r, i);
            return (
              <div key={i} className="mb-1">
                <div className="font-bold"><Editable value={p.name} onChange={update && (v => upd({ name: v }))} /> <span className="italic font-normal">— <Editable value={p.tech} onChange={update && (v => upd({ tech: v }))} /></span></div>
                <BulletsEditor bullets={p.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4" />
              </div>
            );
          })}
        </section>
      )}
      {r.skills?.length > 0 && (
        <section className="mb-2">
          <h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Skills</h3>
          <div className="flex flex-wrap gap-2 px-1">
            {r.skills.flatMap(s => s.items).map((it, k) => (
              <span key={k} className="text-[10px] px-2 py-0.5 rounded border border-neutral-200 bg-neutral-50">{it}</span>
            ))}
          </div>
          {update && (
            <div className="mt-3 pt-2 border-t border-neutral-100 opacity-20 hover:opacity-100 transition-opacity">
              {r.skills.map((s, i) => {
                const upd = makeSkillUpdater(update, r, i);
                return (
                  <div key={i}><SkillCat value={s.category} onChange={update && (v => upd({ category: v }))} className="font-bold" colon /> <Editable value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} /></div>
                );
              })}
            </div>
          )}
        </section>
      )}
      {r.certifications?.length > 0 && (
        <section>
          <h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Certifications</h3>
          <Editable value={r.certifications.join(" • ")} onChange={update && (v => on({ certifications: v.split("•").map(x => x.trim()).filter(Boolean) }))} />
        </section>
      )}
    </div>
  );
}

function CompactPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-6 font-sans text-[10px] leading-tight" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="flex justify-between items-end border-b-2 border-neutral-900 pb-1.5 mb-2">
        <div>
          <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-extrabold text-xl" />
          <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-[10px] text-neutral-600" />
        </div>
        <div className="text-right text-[9px] text-neutral-700">
          <Editable as="div" value={r.email} onChange={update && (v => on({ email: v }))} />
          <Editable as="div" value={r.phone} onChange={update && (v => on({ phone: v }))} />
          <Editable as="div" value={r.location} onChange={update && (v => on({ location: v }))} />
          {r.links?.map((l, i) => (
            <Editable key={i} as="div" value={l.url}
              onChange={update && (v => on({ links: r.links.map((x, j) => j === i ? { ...x, url: v } : x) }))} />
          ))}
        </div>
      </div>
      {(r.summary || update) && (
        <Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="mb-2 text-[10px] whitespace-pre-wrap" />
      )}
      {r.experience?.length > 0 && (
        <section className="mb-2">
          <h3 className="font-bold text-[10px] uppercase tracking-wide text-neutral-700 mb-0.5">Experience</h3>
          {r.experience.map((e, i) => {
            const upd = makeExpUpdater(update, r, i);
            return (
              <div key={i} className="mb-1.5">
                <div className="flex justify-between text-[10px] gap-2">
                  <span className="font-semibold flex-1"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /> — <Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></span>
                  <span className="text-neutral-500 whitespace-nowrap"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span>
                </div>
                <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-3.5" />
              </div>
            );
          })}
        </section>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          {r.education?.length > 0 && (
            <section className="mb-2">
              <h3 className="font-bold text-[10px] uppercase tracking-wide text-neutral-700 mb-0.5">Education</h3>
              {r.education.map((e, i) => {
                const upd = makeEduUpdater(update, r, i);
                return (
                  <div key={i}>
                    <Editable as="div" value={e.degree} onChange={update && (v => upd({ degree: v }))} className="font-semibold" />
                    <div><Editable value={e.school} onChange={update && (v => upd({ school: v }))} />, <Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div>
                  </div>
                );
              })}
            </section>
          )}
          {r.certifications?.length > 0 && (
            <section>
              <h3 className="font-bold text-[10px] uppercase tracking-wide text-neutral-700 mb-0.5">Certifications</h3>
              <Editable as="div" multiline value={r.certifications.map(c => "• " + c).join("\n")}
                onChange={update && (v => on({ certifications: v.split("\n").map(x => x.replace(/^•\s*/, "").trim()).filter(Boolean) }))}
                className="whitespace-pre-wrap" />
            </section>
          )}
        </div>
        <div>
          {r.skills?.length > 0 && (
            <section className="mb-2">
              <h3 className="font-bold text-[10px] uppercase tracking-wide text-neutral-700 mb-0.5">Skills</h3>
              {r.skills.map((s, i) => {
                const upd = makeSkillUpdater(update, r, i);
                return (
                  <div key={i}><SkillCat value={s.category} onChange={update && (v => upd({ category: v }))} className="font-semibold" colon /> <Editable value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} /></div>
                );
              })}
            </section>
          )}
          {r.projects?.length > 0 && (
            <section>
              <h3 className="font-bold text-[10px] uppercase tracking-wide text-neutral-700 mb-0.5">Projects</h3>
              {r.projects.map((p, i) => {
                const upd = makeProjUpdater(update, r, i);
                return (
                  <div key={i} className="mb-1">
                    <Editable as="div" value={p.name} onChange={update && (v => upd({ name: v }))} className="font-semibold" />
                    <BulletsEditor bullets={p.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-3.5" />
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Executive: elegant serif, right-aligned metadata ---------- */
function ExecutivePreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-8 font-serif text-[11px] leading-snug" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="pb-3 mb-4 border-b-4 border-amber-800">
        <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-bold text-3xl tracking-tight text-amber-900" />
        <div className="flex justify-between items-end mt-1">
          <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="italic text-[12px] text-neutral-700" />
          <div className="text-right text-[9px] text-neutral-600">
            <Editable as="div" value={r.email} onChange={update && (v => on({ email: v }))} />
            <Editable as="div" value={r.phone} onChange={update && (v => on({ phone: v }))} />
            <Editable as="div" value={r.location} onChange={update && (v => on({ location: v }))} />
          </div>
        </div>
      </div>
      {(r.summary || update) && (
        <section className="mb-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800 mb-1">Profile</h3>
          <Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap" />
        </section>
      )}
      {r.experience?.length > 0 && (
        <section className="mb-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800 mb-1">Professional Experience</h3>
          {r.experience.map((e, i) => {
            const upd = makeExpUpdater(update, r, i);
            return (
              <div key={i} className="mb-2">
                <div className="flex justify-between gap-2">
                  <span className="font-bold flex-1"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /></span>
                  <span className="text-[10px] italic text-neutral-600 whitespace-nowrap"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span>
                </div>
                <div className="italic text-[10px] text-neutral-700"><Editable value={e.company} onChange={update && (v => upd({ company: v }))} />{e.location ? ", " : ""}<Editable value={e.location} onChange={update && (v => upd({ location: v }))} /></div>
                <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5" />
              </div>
            );
          })}
        </section>
      )}
      {r.education?.length > 0 && (
        <section className="mb-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800 mb-1">Education</h3>
          {r.education.map((e, i) => {
            const upd = makeEduUpdater(update, r, i);
            return (
              <div key={i} className="mb-1">
                <div className="flex justify-between gap-2">
                  <span className="font-bold flex-1"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} />, <Editable value={e.school} onChange={update && (v => upd({ school: v }))} /></span>
                  <span className="text-[10px] italic text-neutral-600 whitespace-nowrap"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span>
                </div>
                <Editable as="div" value={e.details} onChange={update && (v => upd({ details: v }))} className="text-[10px]" />
              </div>
            );
          })}
        </section>
      )}
      {r.skills?.length > 0 && (
        <section className="mb-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800 mb-1">Core Competencies</h3>
          {r.skills.map((s, i) => {
            const upd = makeSkillUpdater(update, r, i);
            return (
              <div key={i}><SkillCat value={s.category} onChange={update && (v => upd({ category: v }))} className="font-bold" colon /> <Editable value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} /></div>
            );
          })}
        </section>
      )}
      {r.certifications?.length > 0 && (
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800 mb-1">Certifications</h3>
          <Editable value={r.certifications.join(" • ")} onChange={update && (v => on({ certifications: v.split("•").map(x => x.trim()).filter(Boolean) }))} />
        </section>
      )}
    </div>
  );
}

/* ---------- Creative: bold indigo header banner, two-column ---------- */
function CreativePreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg overflow-hidden font-sans text-[11px] leading-snug" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="p-5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-fuchsia-600 text-white">
        <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-extrabold text-2xl tracking-tight" />
        <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-indigo-100 text-[11px]" />
        <div className="flex flex-wrap gap-x-3 mt-2 text-[10px] text-indigo-50">
          <Editable value={r.email} onChange={update && (v => on({ email: v }))} />
          <Editable value={r.phone} onChange={update && (v => on({ phone: v }))} />
          <Editable value={r.location} onChange={update && (v => on({ location: v }))} />
          {r.links?.map((l, i) => (
            <Editable key={i} value={l.url} onChange={update && (v => on({ links: r.links.map((x, j) => j === i ? { ...x, url: v } : x) }))} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[65%_35%] gap-4 p-5">
        <div>
          {(r.summary || update) && (
            <section className="mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">About</h3>
              <Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap text-[10px]" />
            </section>
          )}
          {r.experience?.length > 0 && (
            <section className="mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">Experience</h3>
              {r.experience.map((e, i) => {
                const upd = makeExpUpdater(update, r, i);
                return (
                  <div key={i} className="mb-2 pl-3 border-l-2 border-indigo-200">
                    <div className="font-semibold text-[11px]"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /> · <span className="text-indigo-700"><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></span></div>
                    <div className="text-[9px] text-neutral-500"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div>
                    <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5 text-[10px]" />
                  </div>
                );
              })}
            </section>
          )}
          {r.projects?.length > 0 && (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">Projects</h3>
              {r.projects.map((p, i) => {
                const upd = makeProjUpdater(update, r, i);
                return (
                  <div key={i} className="mb-1.5">
                    <div className="font-semibold text-[11px]"><Editable value={p.name} onChange={update && (v => upd({ name: v }))} /> <span className="text-neutral-500 font-normal text-[9px]">— <Editable value={p.tech} onChange={update && (v => upd({ tech: v }))} /></span></div>
                    <BulletsEditor bullets={p.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 text-[10px]" />
                  </div>
                );
              })}
            </section>
          )}
        </div>
        <div>
          {r.skills?.length > 0 && (
            <section className="mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">Skills</h3>
              {r.skills.map((s, i) => {
                const upd = makeSkillUpdater(update, r, i);
                return (
                  <div key={i} className="mb-1.5">
                    <SkillCat as="div" value={s.category} onChange={update && (v => upd({ category: v }))} className="font-semibold text-[10px]" />
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {s.items.map((it, k) => (
                        <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">{it}</span>
                      ))}
                    </div>
                    <Editable as="div" value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} className="text-[9px] text-neutral-400 mt-0.5" />
                  </div>
                );
              })}
            </section>
          )}
          {r.education?.length > 0 && (
            <section className="mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">Education</h3>
              {r.education.map((e, i) => {
                const upd = makeEduUpdater(update, r, i);
                return (
                  <div key={i} className="mb-1">
                    <Editable as="div" value={e.degree} onChange={update && (v => upd({ degree: v }))} className="font-semibold text-[10px]" />
                    <Editable as="div" value={e.school} onChange={update && (v => upd({ school: v }))} className="text-[10px]" />
                    <div className="text-[9px] text-neutral-500"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div>
                  </div>
                );
              })}
            </section>
          )}
          {r.certifications?.length > 0 && (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">Certs</h3>
              <Editable as="div" multiline value={r.certifications.join("\n")} onChange={update && (v => on({ certifications: v.split("\n").map(x => x.trim()).filter(Boolean) }))} className="text-[10px] whitespace-pre-wrap" />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Minimal: airy, mono-weight, generous whitespace ---------- */
function MinimalPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  const H = (t: string) => <h3 className="text-[9px] font-semibold uppercase tracking-[0.3em] text-neutral-400 mb-2">{t}</h3>;
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-10 font-sans text-[11px] leading-relaxed" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="mb-6">
        <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-light text-3xl tracking-tight text-neutral-900" />
        <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-neutral-500 text-[11px] mt-1" />
        <div className="mt-2 text-[10px] text-neutral-500">
          <Editable value={[r.email, r.phone, r.location, ...(r.links?.map(l => l.url) ?? [])].filter(Boolean).join("   ·   ")}
            onChange={update && (v => {
              const parts = v.split("·").map(s => s.trim()).filter(Boolean);
              const [email, phone, location, ...linkUrls] = parts;
              on({ email: email || "", phone: phone || "", location: location || "",
                links: linkUrls.map((url, i) => ({ label: r.links?.[i]?.label || "Link", url })) });
            })} />
        </div>
      </div>
      {(r.summary || update) && (
        <section className="mb-5">{H("Summary")}<Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap text-[11px]" /></section>
      )}
      {r.experience?.length > 0 && (
        <section className="mb-5">{H("Experience")}
          {r.experience.map((e, i) => {
            const upd = makeExpUpdater(update, r, i);
            return (
              <div key={i} className="mb-3 grid grid-cols-[80px_1fr] gap-4">
                <div className="text-[9px] text-neutral-400 pt-0.5"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /><br /><Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div>
                <div>
                  <div className="font-medium text-[11px]"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /></div>
                  <div className="text-neutral-500 text-[10px]"><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></div>
                  <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-1 text-[10px] space-y-0.5" />
                </div>
              </div>
            );
          })}
        </section>
      )}
      {r.education?.length > 0 && (
        <section className="mb-5">{H("Education")}
          {r.education.map((e, i) => {
            const upd = makeEduUpdater(update, r, i);
            return (
              <div key={i} className="mb-1 grid grid-cols-[80px_1fr] gap-4">
                <div className="text-[9px] text-neutral-400 pt-0.5"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div>
                <div>
                  <div className="font-medium text-[11px]"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} /></div>
                  <div className="text-neutral-500 text-[10px]"><Editable value={e.school} onChange={update && (v => upd({ school: v }))} /></div>
                </div>
              </div>
            );
          })}
        </section>
      )}
      {r.skills?.length > 0 && (
        <section>{H("Skills")}
          {r.skills.map((s, i) => {
            const upd = makeSkillUpdater(update, r, i);
            return (
              <div key={i} className={isGenericSkillCategory(s.category) ? "mb-1" : "grid grid-cols-[80px_1fr] gap-4 mb-1"}>
                <div className="text-[10px] text-neutral-500"><SkillCat value={s.category} onChange={update && (v => upd({ category: v }))} /></div>
                <div className="text-[10px]"><Editable value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} /></div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

/**
 * Wraps a template preview and:
 *  - sets --page-h so the sheet always shows a full US-Letter page even when empty
 *  - overlays dashed "Page 2 / 3 / ..." break lines when content overflows one page
 *    so users can visually confirm content spilling onto additional pages.
 */
function PagedSheet({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pageH, setPageH] = React.useState(0);
  const [totalH, setTotalH] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const ph = w * (11 / 8.5);
      setPageH(ph);
      setTotalH(el.scrollHeight);
      el.style.setProperty("--page-h", `${ph}px`);
    });
    ro.observe(el);
    // observe children growth too
    if (el.firstElementChild) ro.observe(el.firstElementChild as Element);
    return () => ro.disconnect();
  }, []);

  const pageCount = pageH > 0 ? Math.max(1, Math.ceil(totalH / pageH)) : 1;
  const breaks: number[] = [];
  for (let i = 1; i < pageCount; i++) breaks.push(i * pageH);

  return (
    <div ref={wrapRef} className="relative">
      {children}
      {breaks.map((top, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 z-10"
          style={{ top: top - 1 }}
        >
          <div className="border-t-2 border-dashed border-primary/50" />
          <div className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold shadow">
            Page {i + 2}
          </div>
        </div>
      ))}
      {pageCount > 1 && (
        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[9px] font-semibold shadow">
          {pageCount} pages
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  return (name || "You")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "").join("") || "Y";
}

/* ---------- Timeline: left date rail, teal accents ---------- */
function TimelinePreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  const H = (t: string) => <h3 className="text-[11px] font-bold tracking-widest uppercase text-teal-700 border-b border-teal-200 pb-0.5 mb-2">{t}</h3>;
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-8 font-sans text-[11px] leading-snug" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="mb-4">
        <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-bold text-2xl tracking-tight" />
        <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-teal-700 text-[11px] font-medium" />
        <div className="mt-1 text-[10px] text-neutral-600 flex flex-wrap gap-x-3">
          <Editable value={r.email} onChange={update && (v => on({ email: v }))} />
          <Editable value={r.phone} onChange={update && (v => on({ phone: v }))} />
          <Editable value={r.location} onChange={update && (v => on({ location: v }))} />
          {r.links?.map((l, i) => (
            <Editable key={i} value={l.url} onChange={update && (v => on({ links: r.links.map((x, j) => j === i ? { ...x, url: v } : x) }))} />
          ))}
        </div>
      </div>
      {(r.summary || update) && (
        <section className="mb-4">{H("Summary")}<Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap text-[11px]" /></section>
      )}
      {r.experience?.length > 0 && (
        <section className="mb-4">{H("Experience")}
          {r.experience.map((e, i) => {
            const upd = makeExpUpdater(update, r, i);
            return (
              <div key={i} className="grid grid-cols-[90px_1fr] gap-3 mb-3">
                <div className="text-[10px] text-teal-700 font-semibold pt-0.5 border-r-2 border-teal-200 pr-2">
                  <div><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /></div>
                  <div className="text-neutral-500 font-normal"><Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div>
                  <div className="text-neutral-500 font-normal mt-0.5 text-[9px]"><Editable value={e.location} onChange={update && (v => upd({ location: v }))} /></div>
                </div>
                <div>
                  <div className="font-semibold text-[11px]"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /></div>
                  <div className="text-teal-700 text-[10px]"><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></div>
                  <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5" />
                </div>
              </div>
            );
          })}
        </section>
      )}
      {r.education?.length > 0 && (
        <section className="mb-4">{H("Education")}
          {r.education.map((e, i) => {
            const upd = makeEduUpdater(update, r, i);
            return (
              <div key={i} className="grid grid-cols-[90px_1fr] gap-3 mb-2">
                <div className="text-[10px] text-teal-700 font-semibold border-r-2 border-teal-200 pr-2">
                  <Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} />
                </div>
                <div>
                  <div className="font-semibold text-[11px]"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} /></div>
                  <div className="text-neutral-600 text-[10px]"><Editable value={e.school} onChange={update && (v => upd({ school: v }))} /></div>
                </div>
              </div>
            );
          })}
        </section>
      )}
      {r.skills?.length > 0 && (
        <section className="mb-4">{H("Skills")}
          <div className="flex flex-wrap gap-1.5">
            {r.skills.flatMap(s => s.items).map((it, k) => (
              <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-100">{it}</span>
            ))}
          </div>
          {update && r.skills.map((s, i) => {
            const upd = makeSkillUpdater(update, r, i);
            return (
              <div key={i} className="mt-1 text-[9px] text-neutral-400">
                <SkillCat value={s.category} onChange={v => upd({ category: v })} colon /> <Editable value={s.items.join(", ")} onChange={v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) })} />
              </div>
            );
          })}
        </section>
      )}
      {r.certifications?.length > 0 && (
        <section>{H("Certifications")}
          <Editable value={r.certifications.join(" • ")} onChange={update && (v => on({ certifications: v.split("•").map(x => x.trim()).filter(Boolean) }))} className="text-[10px]" />
        </section>
      )}
    </div>
  );
}

/* ---------- Elegant: cream bg, centered serif with italic summary ---------- */
function ElegantPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  const H = (t: string) => <h3 className="text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-stone-600 my-3">{t}</h3>;
  return (
    <div className="bg-stone-50 text-stone-900 shadow-elegant rounded-lg p-10 font-serif text-[11px] leading-relaxed" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="text-center">
        <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-normal text-[36px] italic tracking-tight" />
        <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-stone-600">
          <Editable value={r.title} onChange={update && (v => on({ title: v }))} />
        </div>
        <div className="mt-2 text-[10px] text-stone-600 flex justify-center flex-wrap gap-x-3">
          <Editable value={r.phone} onChange={update && (v => on({ phone: v }))} />
          <Editable value={r.email} onChange={update && (v => on({ email: v }))} />
          <Editable value={r.location} onChange={update && (v => on({ location: v }))} />
        </div>
      </div>
      <div className="my-4 flex justify-center gap-2 text-stone-400">
        <span>•</span><span>•</span><span>•</span>
      </div>
      {(r.summary || update) && (
        <section className="max-w-[85%] mx-auto text-center">
          <Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="italic text-[11px] whitespace-pre-wrap" />
        </section>
      )}
      {r.experience?.length > 0 && (
        <section>{H("Experience")}
          {r.experience.map((e, i) => {
            const upd = makeExpUpdater(update, r, i);
            return (
              <div key={i} className="mb-3">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-[12px]"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /> — <span className="italic font-normal"><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></span></span>
                  <span className="text-[10px] italic text-stone-500 whitespace-nowrap"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span>
                </div>
                <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-[square] pl-4 mt-1 text-[10.5px] space-y-0.5" />
              </div>
            );
          })}
        </section>
      )}
      {r.education?.length > 0 && (
        <section>{H("Education")}
          {r.education.map((e, i) => {
            const upd = makeEduUpdater(update, r, i);
            return (
              <div key={i} className="text-center mb-1">
                <div className="font-semibold"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} /></div>
                <div className="italic text-[10px] text-stone-600"><Editable value={e.school} onChange={update && (v => upd({ school: v }))} /> · <Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div>
              </div>
            );
          })}
        </section>
      )}
      {r.skills?.length > 0 && (
        <section>{H("Skills")}
          <div className="flex flex-wrap justify-center gap-2 px-4">
            {r.skills.flatMap(s => s.items).map((it, k) => (
              <span key={k} className="text-[10px] px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200">{it}</span>
            ))}
          </div>
          {update && (
            <div className="mt-4 pt-2 border-t border-stone-100 opacity-20 hover:opacity-100 transition-opacity">
              {r.skills.map((s, i) => {
                const upd = makeSkillUpdater(update, r, i);
                return (
                  <div key={i} className="text-[9px] text-stone-400 text-center mt-1">
                    <SkillCat value={s.category} onChange={v => upd({ category: v })} colon /> <Editable value={s.items.join(", ")} onChange={v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) })} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
      {r.certifications?.length > 0 && (
        <section>{H("Certifications")}
          <div className="text-center"><Editable value={r.certifications.join(" • ")} onChange={update && (v => on({ certifications: v.split("•").map(x => x.trim()).filter(Boolean) }))} /></div>
        </section>
      )}
    </div>
  );
}

/* ---------- Sidebar Dark: main content left, dark teal right rail with avatar ---------- */
function SidebarDarkPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg overflow-hidden font-sans text-[11px] leading-snug" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="grid grid-cols-[65%_35%] h-full">
        <div className="p-6">
          <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-bold text-2xl tracking-tight" />
          <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-teal-700 text-[11px] font-medium mt-0.5" />
          <div className="mt-1 text-[10px] text-neutral-600 flex flex-wrap gap-x-3">
            <Editable value={r.phone} onChange={update && (v => on({ phone: v }))} />
            <Editable value={r.email} onChange={update && (v => on({ email: v }))} />
            <Editable value={r.location} onChange={update && (v => on({ location: v }))} />
          </div>
          {(r.summary || update) && (
            <section className="mt-4">
              <h3 className="uppercase text-[10px] font-bold tracking-widest text-teal-800 mb-1">Summary</h3>
              <Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap text-[10.5px]" />
            </section>
          )}
          {r.experience?.length > 0 && (
            <section className="mt-4">
              <h3 className="uppercase text-[10px] font-bold tracking-widest text-teal-800 mb-1">Experience</h3>
              {r.experience.map((e, i) => {
                const upd = makeExpUpdater(update, r, i);
                return (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold text-[11px]"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /></span>
                      <span className="text-[9px] text-neutral-500 whitespace-nowrap"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span>
                    </div>
                    <div className="text-[10px] text-teal-700"><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></div>
                    <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5" />
                  </div>
                );
              })}
            </section>
          )}
          {r.education?.length > 0 && (
            <section className="mt-3">
              <h3 className="uppercase text-[10px] font-bold tracking-widest text-teal-800 mb-1">Education</h3>
              {r.education.map((e, i) => {
                const upd = makeEduUpdater(update, r, i);
                return (
                  <div key={i} className="mb-1">
                    <div className="font-semibold text-[10.5px]"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} /></div>
                    <div className="text-[10px] text-neutral-600"><Editable value={e.school} onChange={update && (v => upd({ school: v }))} /> · <Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
        <div className="bg-teal-800 text-teal-50 p-5">
          <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-teal-600 flex items-center justify-center text-xl font-bold text-white ring-2 ring-teal-300/40">
            {initials(r.name)}
          </div>
          {r.links?.length > 0 && (
            <div className="text-[10px] space-y-1 break-words mb-4">
              {r.links.map((l, i) => (
                <Editable key={i} as="div" value={`${l.label}: ${l.url}`} onChange={update && (v => {
                  const [label, ...rest] = v.split(":");
                  on({ links: r.links.map((x, j) => j === i ? { label: (label || "").trim(), url: rest.join(":").trim() } : x) });
                })} />
              ))}
            </div>
          )}
          {r.skills?.length > 0 && (
            <div className="mb-4">
              <div className="uppercase tracking-widest text-[9px] font-bold border-b border-teal-500 pb-1 mb-2">Skills</div>
              {r.skills.map((s, i) => {
                const upd = makeSkillUpdater(update, r, i);
                return (
                  <div key={i} className="mb-2">
                    <SkillCat as="div" value={s.category} onChange={update && (v => upd({ category: v }))} className="font-semibold text-[10px]" />
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {s.items.map((it, k) => (
                        <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-600 text-teal-50 border border-teal-500/30">{it}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {r.certifications?.length > 0 && (
            <div>
              <div className="uppercase tracking-widest text-[9px] font-bold border-b border-teal-500 pb-1 mb-2">Certifications</div>
              <Editable as="div" multiline value={r.certifications.join("\n")} onChange={update && (v => on({ certifications: v.split("\n").map(x => x.trim()).filter(Boolean) }))} className="text-[10px] whitespace-pre-wrap" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Photo Header: dark banner with avatar circle on the right ---------- */
function PhotoHeaderPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg overflow-hidden font-sans text-[11px] leading-snug" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="bg-slate-800 text-white px-6 py-5 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-extrabold text-2xl tracking-tight" />
          <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-sky-300 text-[11px] font-medium mt-0.5" />
          <div className="flex flex-wrap gap-x-3 mt-2 text-[10px] text-slate-200">
            <Editable value={r.phone} onChange={update && (v => on({ phone: v }))} />
            <Editable value={r.email} onChange={update && (v => on({ email: v }))} />
            <Editable value={r.location} onChange={update && (v => on({ location: v }))} />
            {r.links?.map((l, i) => (
              <Editable key={i} value={l.url} onChange={update && (v => on({ links: r.links.map((x, j) => j === i ? { ...x, url: v } : x) }))} />
            ))}
          </div>
        </div>
        <div className="h-16 w-16 rounded-full bg-slate-600 ring-2 ring-white/30 flex items-center justify-center text-lg font-bold shrink-0">
          {initials(r.name)}
        </div>
      </div>
      <div className="grid grid-cols-[60%_40%] gap-5 p-6">
        <div>
          {(r.summary || update) && (
            <section className="mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-0.5 mb-1.5">Summary</h3>
              <Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap text-[10.5px]" />
            </section>
          )}
          {r.experience?.length > 0 && (
            <section className="mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-0.5 mb-1.5">Experience</h3>
              {r.experience.map((e, i) => {
                const upd = makeExpUpdater(update, r, i);
                return (
                  <div key={i} className="mb-2">
                    <div className="font-semibold text-[11px]"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /></div>
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></span>
                      <span><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span>
                    </div>
                    <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5" />
                  </div>
                );
              })}
            </section>
          )}
          {r.education?.length > 0 && (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-0.5 mb-1.5">Education</h3>
              {r.education.map((e, i) => {
                const upd = makeEduUpdater(update, r, i);
                return (
                  <div key={i} className="mb-1">
                    <div className="font-semibold text-[10.5px]"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} /></div>
                    <div className="text-[10px] text-slate-600"><Editable value={e.school} onChange={update && (v => upd({ school: v }))} /> · <Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
        <div>
          {r.skills?.length > 0 && (
            <section className="mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-sky-700 border-b border-sky-200 pb-0.5 mb-1.5">Skills</h3>
              {r.skills.map((s, i) => {
                const upd = makeSkillUpdater(update, r, i);
                return (
                  <div key={i} className="mb-1.5">
                    <SkillCat as="div" value={s.category} onChange={update && (v => upd({ category: v }))} className="font-semibold text-[10px]" />
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {s.items.map((it, k) => (
                        <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-100">{it}</span>
                      ))}
                    </div>
                    <Editable as="div" value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} className="text-[9px] text-neutral-400 mt-0.5" />
                  </div>
                );
              })}
            </section>
          )}
          {r.certifications?.length > 0 && (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-sky-700 border-b border-sky-200 pb-0.5 mb-1.5">Certifications</h3>
              <Editable as="div" multiline value={r.certifications.join("\n")} onChange={update && (v => on({ certifications: v.split("\n").map(x => x.trim()).filter(Boolean) }))} className="text-[10px] whitespace-pre-wrap" />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Centered Serif (Alexander Taylor): centered header, rule-lined sections ---------- */
function CenteredSerifPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  const Rule = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-neutral-300" />
      <div className="text-[12px] font-semibold tracking-wide text-neutral-800">{label}</div>
      <div className="flex-1 h-px bg-neutral-300" />
    </div>
  );
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-8 font-serif text-[11px] leading-snug" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="text-center">
        <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-bold text-[26px] tracking-tight" />
        <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-neutral-700 text-[11px] mt-0.5" />
        <div className="text-[10px] text-neutral-600 mt-1 flex flex-wrap gap-x-3 justify-center">
          <Editable value={r.phone} onChange={update && (v => on({ phone: v }))} />
          <Editable value={r.email} onChange={update && (v => on({ email: v }))} />
          {r.links?.map((l, i) => (<Editable key={i} value={l.label} onChange={update && (v => on({ links: r.links.map((x, j) => j === i ? { ...x, label: v } : x) }))} />))}
          <Editable value={r.location} onChange={update && (v => on({ location: v }))} />
        </div>
      </div>
      {(r.summary || update) && (<><Rule label="Summary" /><Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="text-center text-[10.5px] whitespace-pre-wrap px-4" /></>)}
      {r.experience?.length > 0 && (<><Rule label="Experience" />{r.experience.map((e, i) => {
        const upd = makeExpUpdater(update, r, i);
        return (
          <div key={i} className="mb-2">
            <div className="flex justify-between"><span className="font-semibold text-neutral-700"><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></span><span className="text-[10px] text-neutral-600"><Editable value={e.location} onChange={update && (v => upd({ location: v }))} /></span></div>
            <div className="flex justify-between italic"><span><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /></span><span className="text-[10px]"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span></div>
            <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-5 mt-0.5 text-[10.5px] space-y-0.5" />
          </div>
        );
      })}</>)}
      {r.skills?.length > 0 && (
        <>
          <Rule label="Skills" />
          <div className="flex flex-wrap justify-center gap-2 px-6">
            {r.skills.flatMap(s => s.items).map((it, k) => (
              <span key={k} className="text-[10px] border border-neutral-300 px-2 py-0.5 rounded-sm bg-neutral-50">{it}</span>
            ))}
          </div>
          {update && (
            <div className="mt-4 pt-2 border-t border-neutral-100 opacity-20 hover:opacity-100 transition-opacity">
              {r.skills.map((s, i) => {
                const upd = makeSkillUpdater(update, r, i);
                return (
                  <div key={i} className="text-[9px] text-neutral-400 text-center mt-0.5">
                    <SkillCat value={s.category} onChange={v => upd({ category: v })} colon /> <Editable value={s.items.join(", ")} onChange={v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) })} />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {r.education?.length > 0 && (<><Rule label="Education" />{r.education.map((e, i) => { const upd = makeEduUpdater(update, r, i); return (
        <div key={i} className="flex justify-between mb-1"><span><Editable value={e.school} onChange={update && (v => upd({ school: v }))} /> — <span className="italic"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} /></span></span><span className="text-[10px]"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span></div>
      ); })}</>)}
      {r.certifications?.length > 0 && (<><Rule label="Certifications" /><div className="text-center text-[10.5px]"><Editable value={r.certifications.join(" • ")} onChange={update && (v => on({ certifications: v.split("•").map(x => x.trim()).filter(Boolean) }))} /></div></>)}
    </div>
  );
}

/* ---------- Banner Photo (Harper Garcia): navy top banner + photo, two-col body ---------- */
function BannerPhotoPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg overflow-hidden font-sans text-[11px] leading-snug" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="bg-[#0f2340] text-white px-6 py-6 flex items-center gap-5">
        <div className="flex-1 min-w-0">
          <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-bold text-2xl tracking-tight uppercase" />
          <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-sky-200 text-[11px] mt-1" />
          <div className="flex flex-wrap gap-x-4 mt-3 text-[10px] text-slate-100">
            <Editable value={r.phone} onChange={update && (v => on({ phone: v }))} />
            <Editable value={r.email} onChange={update && (v => on({ email: v }))} />
            <Editable value={r.location} onChange={update && (v => on({ location: v }))} />
          </div>
        </div>
        <div className="h-20 w-20 rounded-full bg-white/10 ring-4 ring-white/30 flex items-center justify-center text-xl font-bold shrink-0">{initials(r.name)}</div>
      </div>
      <div className="grid grid-cols-[62%_38%] gap-5 p-6">
        <div>
          {(r.summary || update) && (<section className="mb-3"><h3 className="text-[10px] font-bold uppercase tracking-widest text-[#0f2340] mb-1">Summary</h3><Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap text-[10.5px]" /></section>)}
          {r.experience?.length > 0 && (<section className="mb-3"><h3 className="text-[10px] font-bold uppercase tracking-widest text-[#0f2340] border-b border-slate-300 pb-0.5 mb-1.5">Experience</h3>{r.experience.map((e, i) => { const upd = makeExpUpdater(update, r, i); return (
            <div key={i} className="mb-2">
              <div className="font-semibold text-[11px]"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /></div>
              <div className="flex justify-between text-[10px] text-slate-600"><span><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /> · <Editable value={e.location} onChange={update && (v => upd({ location: v }))} /></span><span><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span></div>
              <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5" />
            </div>
          ); })}</section>)}
          {r.education?.length > 0 && (<section><h3 className="text-[10px] font-bold uppercase tracking-widest text-[#0f2340] border-b border-slate-300 pb-0.5 mb-1.5">Education</h3>{r.education.map((e, i) => { const upd = makeEduUpdater(update, r, i); return (<div key={i} className="mb-1"><div className="font-semibold text-[10.5px]"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} /></div><div className="text-[10px] text-slate-600"><Editable value={e.school} onChange={update && (v => upd({ school: v }))} /> · <Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div></div>); })}</section>)}
        </div>
        <div>
          {r.skills?.length > 0 && (<section className="mb-3 bg-emerald-50 rounded-lg p-3 border border-emerald-100"><h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 mb-1.5">Key Achievements</h3>{r.skills.map((s, i) => { const upd = makeSkillUpdater(update, r, i); return (<div key={i} className="mb-2"><SkillCat as="div" value={s.category} onChange={update && (v => upd({ category: v }))} className="font-semibold text-[10.5px] text-emerald-900" /><Editable as="div" value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} className="text-[10px] text-emerald-800" /></div>); })}</section>)}
          {r.certifications?.length > 0 && (<section><h3 className="text-[10px] font-bold uppercase tracking-widest text-[#0f2340] mb-1">Training / Courses</h3><Editable as="div" multiline value={r.certifications.join("\n")} onChange={update && (v => on({ certifications: v.split("\n").map(x => x.trim()).filter(Boolean) }))} className="text-[10px] whitespace-pre-wrap" /></section>)}
        </div>
      </div>
    </div>
  );
}

/* ---------- Teal Left (Emma Smith): solid teal left rail ---------- */
function TealLeftPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg overflow-hidden font-sans text-[11px] leading-snug" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="grid grid-cols-[35%_65%] h-full">
        <div className="bg-teal-700 text-teal-50 p-5">
          <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-bold text-lg leading-tight uppercase" />
          <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-teal-100 text-[10px] mt-1" />
          <div className="mt-3 text-[10px] space-y-1 break-words">
            <Editable as="div" value={r.phone} onChange={update && (v => on({ phone: v }))} />
            <Editable as="div" value={r.email} onChange={update && (v => on({ email: v }))} />
            <Editable as="div" value={r.location} onChange={update && (v => on({ location: v }))} />
            {r.links?.map((l, i) => (<Editable key={i} as="div" value={l.label + ": " + l.url} onChange={update && (v => { const [label, ...rest] = v.split(":"); on({ links: r.links.map((x, j) => j === i ? { label: (label || "").trim(), url: rest.join(":").trim() } : x) }); })} />))}
          </div>
          {r.skills?.length > 0 && (<div className="mt-5"><div className="uppercase tracking-widest text-[9px] font-bold border-b border-teal-400 pb-1 mb-2">Key Skills & Achievements</div>{r.skills.map((s, i) => { const upd = makeSkillUpdater(update, r, i); return (<div key={i} className="mb-3 flex gap-2"><div className="h-6 w-6 rounded-full bg-teal-500/30 border border-teal-300 flex items-center justify-center text-[10px] font-bold shrink-0">★</div><div className="flex-1"><SkillCat as="div" value={s.category} onChange={update && (v => upd({ category: v }))} className="font-semibold text-[10px]" /><Editable as="div" value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} className="text-[9.5px] text-teal-100 leading-snug" /></div></div>); })}</div>)}
          {r.certifications?.length > 0 && (<div className="mt-4"><div className="uppercase tracking-widest text-[9px] font-bold border-b border-teal-400 pb-1 mb-2">Certifications</div><Editable as="div" multiline value={r.certifications.join("\n")} onChange={update && (v => on({ certifications: v.split("\n").map(x => x.trim()).filter(Boolean) }))} className="text-[10px] whitespace-pre-wrap" /></div>)}
        </div>
        <div className="p-5">
          {(r.summary || update) && (<section className="mb-3"><h3 className="uppercase text-[10px] font-bold tracking-widest text-teal-800 border-b-2 border-teal-800 pb-0.5 mb-1.5">Summary</h3><Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap text-[10.5px]" /></section>)}
          {r.experience?.length > 0 && (<section className="mb-3"><h3 className="uppercase text-[10px] font-bold tracking-widest text-teal-800 border-b-2 border-teal-800 pb-0.5 mb-1.5">Experience</h3>{r.experience.map((e, i) => { const upd = makeExpUpdater(update, r, i); return (
            <div key={i} className="mb-2">
              <div className="flex justify-between"><span className="font-semibold text-[11px]"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /></span><span className="text-[10px] text-neutral-600"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span></div>
              <div className="text-[10px] text-teal-700"><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></div>
              <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5" />
            </div>
          ); })}</section>)}
          {r.education?.length > 0 && (<section><h3 className="uppercase text-[10px] font-bold tracking-widest text-teal-800 border-b-2 border-teal-800 pb-0.5 mb-1.5">Education</h3>{r.education.map((e, i) => { const upd = makeEduUpdater(update, r, i); return (<div key={i} className="mb-1"><div className="font-semibold text-[10.5px]"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} /></div><div className="text-[10px] text-neutral-600"><Editable value={e.school} onChange={update && (v => upd({ school: v }))} /> · <Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></div></div>); })}</section>)}
        </div>
      </div>
    </div>
  );
}

/* ---------- Photo Grid (Jackson Miller): centered photo header + 3-col achievement boxes ---------- */
function PhotoGridPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  const achievements = r.skills?.slice(0, 3) ?? [];
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-8 font-sans text-[11px] leading-snug" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="flex flex-col items-center text-center pb-4 border-b border-neutral-300">
        <div className="h-16 w-16 rounded-full bg-neutral-200 ring-2 ring-neutral-300 flex items-center justify-center text-lg font-bold text-neutral-700 mb-2">{initials(r.name)}</div>
        <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-bold text-[22px] tracking-tight" />
        <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-sky-700 text-[11px] mt-0.5" />
        <div className="text-[10px] text-neutral-600 mt-1 flex flex-wrap gap-x-3 justify-center">
          <Editable value={r.phone} onChange={update && (v => on({ phone: v }))} />
          <Editable value={r.email} onChange={update && (v => on({ email: v }))} />
          <Editable value={r.location} onChange={update && (v => on({ location: v }))} />
        </div>
      </div>
      {(r.summary || update) && (<section className="mt-3"><h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-800 mb-1">Summary</h3><Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap text-[10.5px]" /></section>)}
      {achievements.length > 0 && (
        <section className="mt-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-800 mb-2 text-center">Key Achievements</h3>
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((s, i) => { const upd = makeSkillUpdater(update, r, i); return (
              <div key={i} className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
                <SkillCat as="div" value={s.category} onChange={update && (v => upd({ category: v }))} className="font-semibold text-[10.5px] text-sky-800 mb-1" />
                <Editable as="div" value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} className="text-[9.5px] text-neutral-700 leading-snug" />
              </div>
            ); })}
          </div>
        </section>
      )}
      {r.experience?.length > 0 && (<section className="mt-3"><h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-800 mb-1">Experience</h3>{r.experience.map((e, i) => { const upd = makeExpUpdater(update, r, i); return (
        <div key={i} className="mb-2">
          <div className="flex justify-between"><span className="font-semibold text-[11px]"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /></span><span className="text-[10px] text-neutral-600"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span></div>
          <div className="text-[10px] text-sky-700"><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /> · <Editable value={e.location} onChange={update && (v => upd({ location: v }))} /></div>
          <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5" />
        </div>
      ); })}</section>)}
      {r.education?.length > 0 && (<section className="mt-2"><h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-800 mb-1">Education</h3>{r.education.map((e, i) => { const upd = makeEduUpdater(update, r, i); return (<div key={i} className="flex justify-between mb-1"><span><span className="font-semibold"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} /></span> · <Editable value={e.school} onChange={update && (v => upd({ school: v }))} /></span><span className="text-[10px] text-neutral-600"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span></div>); })}</section>)}
    </div>
  );
}

/* ---------- Logo Boxed (Olivia Davis): centered header, initials-tile per company ---------- */
function LogoBoxedPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  const H = (t: string) => <div className="text-center text-[12px] font-semibold tracking-wide text-neutral-800 border-b border-neutral-300 pb-1 mb-2 mt-3">{t}</div>;
  const logoTile = (name: string) => {
    const c = (name || "?").trim().charAt(0).toUpperCase();
    const palette = ["bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-indigo-100 text-indigo-700"];
    const cls = palette[(c.charCodeAt(0) || 0) % palette.length];
    return <div className={`h-7 w-7 rounded ${cls} flex items-center justify-center text-[12px] font-bold shrink-0`}>{c}</div>;
  };
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-8 font-sans text-[11px] leading-snug" style={{ minHeight: "var(--page-h, auto)", fontSize: r.settings?.fontSize ? `${r.settings.fontSize}px` : undefined, fontFamily: r.settings?.fontFamily || undefined }}>
      <div className="text-center pb-2">
        <Editable as="div" value={r.name || "Your Name"} onChange={update && (v => on({ name: v }))} className="font-bold text-[22px] text-sky-800 tracking-tight" />
        <Editable as="div" value={r.title} onChange={update && (v => on({ title: v }))} className="text-neutral-700 text-[11px] mt-0.5" />
        <div className="text-[10px] text-neutral-600 mt-1 flex flex-wrap gap-x-3 justify-center">
          <Editable value={r.phone} onChange={update && (v => on({ phone: v }))} />
          <Editable value={r.email} onChange={update && (v => on({ email: v }))} />
          <Editable value={r.location} onChange={update && (v => on({ location: v }))} />
        </div>
      </div>
      {(r.summary || update) && (<><div>{H("Summary")}</div><Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="whitespace-pre-wrap text-[10.5px]" /></>)}
      {r.experience?.length > 0 && (<>{H("Experience")}{r.experience.map((e, i) => { const upd = makeExpUpdater(update, r, i); return (
        <div key={i} className="mb-3 flex gap-3">
          {logoTile(e.company)}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2"><span className="font-semibold text-sky-800"><Editable value={e.company} onChange={update && (v => upd({ company: v }))} /></span><span className="text-[10px] text-neutral-600 whitespace-nowrap"><Editable value={e.location} onChange={update && (v => upd({ location: v }))} /></span></div>
            <div className="flex justify-between text-[10px]"><span className="italic"><Editable value={e.role} onChange={update && (v => upd({ role: v }))} /></span><span><Editable value={e.start} onChange={update && (v => upd({ start: v }))} /> – <Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span></div>
            <BulletsEditor bullets={e.bullets || []} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5" />
          </div>
        </div>
      ); })}</>)}
      {r.education?.length > 0 && (<>{H("Education")}{r.education.map((e, i) => { const upd = makeEduUpdater(update, r, i); return (
        <div key={i} className="mb-2 flex gap-3">
          {logoTile(e.school)}
          <div className="flex-1"><div className="flex justify-between"><span className="font-semibold text-sky-800"><Editable value={e.school} onChange={update && (v => upd({ school: v }))} /></span><span className="text-[10px] text-neutral-600"><Editable value={e.start} onChange={update && (v => upd({ start: v }))} />–<Editable value={e.end} onChange={update && (v => upd({ end: v }))} /></span></div><div className="italic text-[10.5px]"><Editable value={e.degree} onChange={update && (v => upd({ degree: v }))} /></div></div>
        </div>
      ); })}</>)}
      {r.skills?.length > 0 && (<>{H("Skills")}<div className="flex flex-wrap gap-1.5">{r.skills.flatMap(s => s.items).map((it, i) => (<span key={i} className="text-[10px] px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-100">{it}</span>))}</div>{update && r.skills.map((s, i) => { const upd = makeSkillUpdater(update, r, i); return (<div key={i} className="text-[9px] text-neutral-400 mt-0.5"><SkillCat value={s.category} onChange={v => upd({ category: v })} colon /> <Editable value={s.items.join(", ")} onChange={v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) })} /></div>); })}</>)}
      {r.certifications?.length > 0 && (<>{H("Certifications")}<Editable as="div" multiline value={r.certifications.join("\n")} onChange={update && (v => on({ certifications: v.split("\n").map(x => x.trim()).filter(Boolean) }))} className="text-[10.5px] whitespace-pre-wrap" /></>)}
    </div>
  );
}

/* ---------- Per-section styling (works across every template) ---------- */
const SECTION_MATCHERS: { key: ResumeSectionKey; re: RegExp }[] = [
  { key: "summary", re: /^(summary|profile|about|professional summary)$/i },
  { key: "experience", re: /^(experience|work experience|professional experience|employment)$/i },
  { key: "education", re: /^(education|academics)$/i },
  { key: "skills", re: /^(skills|key skills.*|core skills|technical skills)$/i },
  { key: "projects", re: /^(projects|selected projects)$/i },
];

function tagSections(root: HTMLElement | null) {
  if (!root) return;
  root.querySelectorAll("[data-rs-sec],[data-rs-head]").forEach(el => {
    el.removeAttribute("data-rs-sec");
    el.removeAttribute("data-rs-head");
  });
  const els = Array.from(root.querySelectorAll<HTMLElement>("*"));
  for (const el of els) {
    const txt = (el.textContent || "").trim();
    if (!txt || txt.length > 40 || el.children.length > 0) continue;
    const match = SECTION_MATCHERS.find(m => m.re.test(txt));
    if (!match) continue;
    el.setAttribute("data-rs-head", "1");
    const container = el.closest("section");
    if (container && container !== root) {
      container.setAttribute("data-rs-sec", match.key);
    } else {
      let n = el.parentElement?.nextElementSibling ?? el.nextElementSibling;
      let guard = 0;
      while (n && guard++ < 12) {
        if (n.querySelector("[data-rs-head]") || n.hasAttribute("data-rs-head")) break;
        n.setAttribute("data-rs-sec", match.key);
        n = n.nextElementSibling;
      }
    }
  }
}

function sectionCss(scope: string, sections?: Partial<Record<ResumeSectionKey, SectionStyle>>) {
  if (!sections) return "";
  const rule = (sel: string, s?: SectionStyle) => {
    if (!s) return "";
    const decls = [
      s.fontSize ? `font-size:${s.fontSize}px !important` : "",
      s.fontFamily ? `font-family:${s.fontFamily} !important` : "",
      s.bold === true ? "font-weight:700 !important" : s.bold === false ? "font-weight:400 !important" : "",
      s.italic ? "font-style:italic !important" : "",
      s.letterSpacing != null ? `letter-spacing:${s.letterSpacing}px !important` : "",
    ].filter(Boolean).join(";");
    return decls ? `${sel},${sel} * {${decls}}` : "";
  };
  const body = (["summary", "experience", "education", "skills", "projects"] as ResumeSectionKey[])
    .map(k => rule(`${scope} [data-rs-sec="${k}"]`, sections[k]))
    .join("\n");
  // headings last so they win over section body rules
  return `${body}\n${rule(`${scope} [data-rs-head]`, sections.headings)}`;
}

export function ResumePreview({
  template, data, onChange,
}: { template: TemplateId; data: ResumeData; onChange?: (data: ResumeData) => void }) {
  const update: UpdateFn = onChange ? (patch) => onChange({ ...data, ...patch }) : undefined;
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeId = React.useId().replace(/[:]/g, "");
  const inner =
    template === "modern" ? <ModernPreview r={data} update={update} /> :
    template === "compact" ? <CompactPreview r={data} update={update} /> :
    template === "executive" ? <ExecutivePreview r={data} update={update} /> :
    template === "creative" ? <CreativePreview r={data} update={update} /> :
    template === "minimal" ? <MinimalPreview r={data} update={update} /> :
    template === "timeline" ? <TimelinePreview r={data} update={update} /> :
    template === "elegant" ? <ElegantPreview r={data} update={update} /> :
    template === "sidebar-dark" ? <SidebarDarkPreview r={data} update={update} /> :
    template === "photo-header" ? <PhotoHeaderPreview r={data} update={update} /> :
    template === "centered-serif" ? <CenteredSerifPreview r={data} update={update} /> :
    template === "banner-photo" ? <BannerPhotoPreview r={data} update={update} /> :
    template === "teal-left" ? <TealLeftPreview r={data} update={update} /> :
    template === "photo-grid" ? <PhotoGridPreview r={data} update={update} /> :
    template === "logo-boxed" ? <LogoBoxedPreview r={data} update={update} /> :
    <ClassicPreview r={data} update={update} />;

  useEffect(() => {
    // Add small delay to ensure DOM is ready for tagging
    const timer = setTimeout(() => tagSections(rootRef.current), 50);
    return () => clearTimeout(timer);
  }, [template, data.settings?.sectionOrder, data.experience.length, data.education.length, data.projects.length, data.skills.length]);

  return (
    <div ref={rootRef} data-rs-root={scopeId}>
      <style dangerouslySetInnerHTML={{ __html: sectionCss(`[data-rs-root="${scopeId}"]`, data.settings?.sections) }} />
      <PagedSheet>{inner}</PagedSheet>
    </div>
  );
}



/* ---------- PDF export ---------- */
export function downloadResumePdfFromData(rawData: ResumeData, template: TemplateId) {
  const data = normalizeResumeSkills(rawData);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const accentMap: Record<TemplateId, [number, number, number]> = {
    modern: [6, 95, 70], classic: [20, 20, 20], compact: [40, 40, 40],
    executive: [146, 64, 14], creative: [79, 70, 229], minimal: [64, 64, 64],
    timeline: [15, 118, 110], elegant: [120, 53, 15],
    "sidebar-dark": [17, 94, 89], "photo-header": [30, 41, 59],
    "centered-serif": [30, 30, 30], "banner-photo": [15, 35, 64],
    "teal-left": [15, 118, 110], "photo-grid": [3, 105, 161], "logo-boxed": [3, 105, 161],
  };
  const accent: [number, number, number] = accentMap[template] ?? [40, 40, 40];
  const font = data.settings?.fontFamily || (template === "classic" || template === "executive" || template === "centered-serif" || template === "elegant" ? "times" : "helvetica");
  const baseSize = data.settings?.fontSize || (template === "compact" ? 9 : 10);
  
  // Apply template-specific layout adjustments to PDF
  const isTwoColumn = template === "modern" || template === "creative" || template === "sidebar-dark" || template === "banner-photo" || template === "teal-left";
  const headerCenter = template === "classic" || template === "centered-serif" || template === "photo-grid";
  let y = margin;

  const ensure = (h = 14) => { if (y + h > pageH - margin) { doc.addPage(); y = margin; } };
  const H1 = (t: string) => { 
    const size = secStyles?.headings?.fontSize || 22;
    doc.setFont(font, "bold"); 
    doc.setFontSize(size); 
    doc.setTextColor(...accent); 
    const x = headerCenter ? pageW / 2 : margin;
    const align = headerCenter ? "center" : "left";
    doc.text(t, x, y, { align }); 
    y += (size * 0.9); 
  };
  const meta = (t: string) => { 
    doc.setFont(font, "normal"); 
    doc.setFontSize(baseSize * 0.9); 
    doc.setTextColor(100); 
    const x = headerCenter ? pageW / 2 : margin;
    const align = headerCenter ? "center" : "left";
    doc.text(t, x, y, { align }); 
    y += (baseSize * 1.4); 
  };
  const secStyles = data.settings?.sections;
  let curSec: ResumeSectionKey | null = null;
  const secOf = (t: string): ResumeSectionKey | null =>
    (SECTION_MATCHERS.find(m => m.re.test(t.trim()))?.key ?? null);
  const secSize = () => (curSec ? secStyles?.[curSec]?.fontSize : undefined) ?? baseSize;
  const secBold = () => (curSec ? secStyles?.[curSec]?.bold : undefined);
  const secItalic = () => (curSec ? secStyles?.[curSec]?.italic : undefined);

  const parseRichText = (text: string) => parseRichSegments(text);

  const H2 = (t: string) => {
    curSec = secOf(t);
    ensure(24); y += 6;
    doc.setFont(font, "bold"); doc.setFontSize(secStyles?.headings?.fontSize ?? (baseSize + 1)); doc.setTextColor(...accent);
    doc.text(t.toUpperCase(), margin, y); y += (baseSize * 0.4);
    doc.setDrawColor(...accent); doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y); y += 12;
    doc.setTextColor(30, 30, 30);
  };

  const line = (t: string, opts: { bold?: boolean; size?: number; italic?: boolean } = {}) => {
    const defaultBold = opts.bold || secBold() === true;
    const defaultItalic = opts.italic || secItalic() === true;
    const size = opts.size ?? secSize();
    
    // Check if rich text
    if (/<(b|i|u|strong|em|span|font)\b/i.test(t)) {
      const parts = parseRichText(t);
      ensure(13);
      let curX = margin;
      parts.forEach(p => {
        const isBold = p.bold || defaultBold;
        const isItalic = p.italic || defaultItalic;
        doc.setFont(font, isBold && isItalic ? "bolditalic" : isBold ? "bold" : isItalic ? "italic" : "normal");
        doc.setFontSize(p.fontSize ?? size);
        doc.text(p.text, curX, y);
        const w = doc.getTextWidth(p.text);
        if (p.underline) { doc.setLineWidth(0.5); doc.line(curX, y + 1.5, curX + w, y + 1.5); }
        curX += w;
      });
      y += 13;
    } else {
      doc.setFont(font, defaultBold ? "bold" : defaultItalic ? "italic" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(/[<&]/.test(t) ? richToPlain(t) : t, pageW - margin * 2);
      lines.forEach((l: string) => { ensure(size * 1.3); doc.text(l, margin, y); y += (size * 1.3); });
    }
  };

  const bullet = (t: string) => {
    const size = secSize();
    const defaultBold = secBold() === true;
    const defaultItalic = secItalic() === true;
    
    if (/<(b|i|u|strong|em|span|font)\b/i.test(t)) {
      const parts = parseRichText(t);
      ensure(size * 1.3);
      doc.setFont(font, "normal"); doc.setFontSize(size);
      doc.text("•", margin + 4, y);
      let curX = margin + size * 1.4;
      parts.forEach(p => {
        const isBold = p.bold || defaultBold;
        const isItalic = p.italic || defaultItalic;
        doc.setFont(font, isBold && isItalic ? "bolditalic" : isBold ? "bold" : isItalic ? "italic" : "normal");
        doc.setFontSize(p.fontSize ?? size);
        doc.text(p.text, curX, y);
        const w = doc.getTextWidth(p.text);
        if (p.underline) { doc.setLineWidth(0.5); doc.line(curX, y + 1.5, curX + w, y + 1.5); }
        curX += w;
      });
      y += (size * 1.3);
    } else {
      doc.setFont(font, defaultBold ? "bold" : defaultItalic ? "italic" : "normal"); doc.setFontSize(size);
      const lines = doc.splitTextToSize(/[<&]/.test(t) ? richToPlain(t) : t, pageW - margin * 2 - size * 1.4);
      lines.forEach((l: string, i: number) => {
        ensure(size * 1.3);
        if (i === 0) doc.text("•", margin + 4, y);
        doc.text(l, margin + size * 1.4, y); y += (size * 1.3);
      });
    }
  };

  H1(data.name || "Your Name");
  if (data.title) meta(data.title);
  meta([data.email, data.phone, data.location, ...(data.links?.map(l => `${l.label}: ${l.url}`) ?? [])].filter(Boolean).join("  |  "));

  const order = data.settings?.sectionOrder || ["summary", "experience", "projects", "education", "skills", "certifications"];
  
  order.forEach(key => {
    switch (key) {
      case "summary":
        if (data.summary) { H2("Summary"); line(data.summary); }
        break;
      case "experience":
        if (data.experience?.length) {
          H2("Experience");
          data.experience.forEach(e => {
            line(`${e.role} — ${e.company}${e.location ? `, ${e.location}` : ""}`, { bold: true });
            if (e.start || e.end) line(`${e.start} – ${e.end}`, { italic: true, size: 9 });
            e.bullets?.forEach(b => bullet(b));
            y += (secSize() * 0.4);
          });
        }
        break;
      case "projects":
        if (data.projects?.length) {
          H2("Projects");
          data.projects.forEach(p => {
            line(`${p.name}${p.tech ? ` — ${p.tech}` : ""}`, { bold: true });
            p.bullets?.forEach(b => bullet(b));
            y += (secSize() * 0.4);
          });
        }
        break;
      case "education":
        if (data.education?.length) {
          H2("Education");
          data.education.forEach(e => {
            line(`${e.degree} — ${e.school}${e.location ? `, ${e.location}` : ""}`, { bold: true });
            if (e.start || e.end) line(`${e.start} – ${e.end}`, { italic: true, size: 9 });
            if (e.details) line(e.details);
            y += (secSize() * 0.4);
          });
        }
        break;
      case "skills":
        if (data.skills?.length) { 
          H2("Skills"); 
          data.skills.forEach(s => line(isGenericSkillCategory(s.category) ? s.items.join(", ") : `${s.category}: ${s.items.join(", ")}`)); 
        }
        break;
      case "certifications":
        if (data.certifications?.length) { 
          H2("Certifications"); 
          data.certifications.forEach(c => bullet(c)); 
        }
        break;
    }
  });

  const safe = safeName(data.name);
  doc.save(`${safe}-${template}.pdf`);
}

/* ---------- DOCX export (editable in Word / Google Docs) ---------- */
export async function downloadResumeDocxFromData(rawData: ResumeData, template: TemplateId) {
  const data = normalizeResumeSkills(rawData);
  const serifTpls: TemplateId[] = ["classic", "executive", "elegant", "centered-serif"];
  const font = serifTpls.includes(template) ? "Times New Roman" : "Calibri";
  const accentMap: Record<TemplateId, string> = {
    modern: "065F46", classic: "111111", compact: "1F1F1F",
    executive: "92400E", creative: "4F46E5", minimal: "404040",
    timeline: "0F766E", elegant: "78350F",
    "sidebar-dark": "115E59", "photo-header": "1E293B",
    "centered-serif": "1E1E1E", "banner-photo": "0F2340",
    "teal-left": "0F766E", "photo-grid": "0369A1", "logo-boxed": "0369A1",
  };
  const accent = accentMap[template] ?? "111111";

  const baseSize = (data.settings?.fontSize || 11) * 2; // docx uses half-points
  const secStyles = data.settings?.sections;

  const parseDocxRichText = (text: string) => parseRichSegments(text);

  const P = (text: string, opts: { bold?: boolean; italic?: boolean; size?: number; color?: string; align?: any; sectionKey?: ResumeSectionKey } = {}) => {
    const parts = parseDocxRichText(text);
    const secStyle = opts.sectionKey ? secStyles?.[opts.sectionKey] : undefined;
    const defaultBold = opts.bold || secStyle?.bold === true;
    const defaultItalic = opts.italic || secStyle?.italic === true;
    const fontSize = opts.size ?? (secStyle?.fontSize ? secStyle.fontSize * 2 : baseSize);

    return new Paragraph({
      alignment: opts.align,
      children: parts.map(p => new TextRun({
        text: p.text,
        bold: p.bold || defaultBold,
        italics: p.italic || defaultItalic,
        underline: p.underline ? {} : undefined,
        size: p.fontSize ? Math.round(p.fontSize * 2) : fontSize,
        color: opts.color,
        font: p.fontFamily ? p.fontFamily.split(",")[0].replace(/['"]/g, "").trim() : font,
      })),
    });
  };

  const H = (text: string) => {
    const headSize = secStyles?.headings?.fontSize ? secStyles.headings.fontSize * 2 : (baseSize + 2);
    return new Paragraph({
      spacing: { before: 200, after: 80 },
      border: { bottom: { color: accent, size: 8, style: BorderStyle.SINGLE, space: 2 } },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: headSize, color: accent, font })],
    });
  };

  const bullet = (text: string, sectionKey?: ResumeSectionKey) => {
    const parts = parseDocxRichText(text);
    const secStyle = sectionKey ? secStyles?.[sectionKey] : undefined;
    const defaultBold = secStyle?.bold === true;
    const defaultItalic = secStyle?.italic === true;
    const fontSize = secStyle?.fontSize ? secStyle.fontSize * 2 : baseSize;

    return new Paragraph({
      numbering: { reference: "bullets", level: 0 },
      children: parts.map(p => new TextRun({
        text: p.text,
        bold: p.bold || defaultBold,
        italics: p.italic || defaultItalic,
        underline: p.underline ? {} : undefined,
        size: p.fontSize ? Math.round(p.fontSize * 2) : fontSize,
        font: p.fontFamily ? p.fontFamily.split(",")[0].replace(/['"]/g, "").trim() : font,
      })),
    });
  };

  const children: Paragraph[] = [];

  children.push(P(data.name || "Your Name", { bold: true, size: (secStyles?.headings?.fontSize || 22) * 2, align: AlignmentType.CENTER, color: accent }));
  if (data.title) children.push(P(data.title, { size: baseSize + 2, align: AlignmentType.CENTER }));
  const contact = [data.email, data.phone, data.location, ...(data.links?.map(l => `${l.label}: ${l.url}`) ?? [])].filter(Boolean).join("  •  ");
  if (contact) children.push(P(contact, { size: baseSize - 2, align: AlignmentType.CENTER, color: "555555" }));

  const order = data.settings?.sectionOrder || ["summary", "experience", "projects", "education", "skills", "certifications"];

  order.forEach(key => {
    switch (key) {
      case "summary":
        if (data.summary) { children.push(H("Summary")); children.push(P(data.summary, { sectionKey: "summary" })); }
        break;
      case "experience":
        if (data.experience?.length) {
          children.push(H("Experience"));
          const secStyle = secStyles?.experience;
          const fontSize = secStyle?.fontSize ? secStyle.fontSize * 2 : baseSize;
          data.experience.forEach(e => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${e.role}`, bold: true, size: fontSize, font }),
                new TextRun({ text: ` — ${e.company}${e.location ? `, ${e.location}` : ""}`, size: fontSize, font }),
                new TextRun({ text: `   ${e.start} – ${e.end}`, italics: true, size: fontSize - 2, color: "666666", font }),
              ],
            }));
            e.bullets?.forEach(b => children.push(bullet(b, "experience")));
          });
        }
        break;
      case "projects":
        if (data.projects?.length) {
          children.push(H("Projects"));
          const secStyle = secStyles?.projects;
          const fontSize = secStyle?.fontSize ? secStyle.fontSize * 2 : baseSize;
          data.projects.forEach(p => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: p.name, bold: true, size: fontSize, font }),
                p.tech ? new TextRun({ text: ` — ${p.tech}`, italics: true, size: fontSize - 2, color: "666666", font }) : new TextRun(""),
              ],
            }));
            p.bullets?.forEach(b => children.push(bullet(b, "projects")));
          });
        }
        break;
      case "education":
        if (data.education?.length) {
          children.push(H("Education"));
          const secStyle = secStyles?.education;
          const fontSize = secStyle?.fontSize ? secStyle.fontSize * 2 : baseSize;
          data.education.forEach(e => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: e.degree, bold: true, size: fontSize, font }),
                new TextRun({ text: ` — ${e.school}${e.location ? `, ${e.location}` : ""}`, size: fontSize, font }),
                new TextRun({ text: `   ${e.start} – ${e.end}`, italics: true, size: fontSize - 2, color: "666666", font }),
              ],
            }));
            if (e.details) children.push(P(e.details, { size: fontSize - 2, sectionKey: "education" }));
          });
        }
        break;
      case "skills":
        if (data.skills?.length) {
          children.push(H("Skills"));
          const secStyle = secStyles?.skills;
          const fontSize = secStyle?.fontSize ? secStyle.fontSize * 2 : baseSize;
          data.skills.forEach(s => children.push(new Paragraph({
            children: [
              new TextRun({ text: isGenericSkillCategory(s.category) ? "" : `${s.category}: `, bold: true, size: fontSize, font }),
              new TextRun({ text: s.items.join(", "), size: fontSize, font }),
            ],
          })));
        }
        break;
      case "certifications":
        if (data.certifications?.length) {
          children.push(H("Certifications"));
          data.certifications.forEach(c => children.push(bullet(c, "certifications")));
        }
        break;
    }
  });

  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 260 } } } }],
      }],
    },
    sections: [{
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${safeName(data.name)}-${template}.docx`);
}

function safeName(name: string) {
  const safe = (name || "resume").replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-").toLowerCase();
  return safe || "resume";
}

/* ---------- Build ResumeData verbatim from raw user input (no AI) ---------- */
export interface RawProfileInput {
  name: string; title: string; email: string; phone: string; location: string;
  linkedin?: string; github?: string; portfolio?: string;
  summary: string;
  experience: { company: string; role: string; location: string; start: string; end: string; description: string }[];
  education: { school: string; degree: string; location: string; start: string; end: string; details: string }[];
  projects: { name: string; tech: string; description: string }[];
  skills: string;         // raw textarea
  certifications: string; // raw textarea
  settings?: ResumeData["settings"];

}

export function buildResumeDataVerbatim(input: RawProfileInput): ResumeData {
  const toBullets = (text: string) => {
    if (!text) return [];
    return text
      .split(/\r?\n/)
      .map(l => l.replace(/^\s*[-*•]\s?/, "").trim())
      .filter(Boolean);
  };

  const parseSkills = (raw: string): ResumeData["skills"] => {
    if (!raw) return [];
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const grouped: ResumeData["skills"] = [];
    const flat: string[] = [];
    for (const l of lines) {
      const m = l.match(/^([^:]+):\s*(.+)$/);
      if (m) {
        grouped.push({ category: m[1].trim(), items: m[2].split(",").map(s => s.trim()).filter(Boolean) });
      } else {
        flat.push(l);
      }
    }
    if (flat.length) {
      grouped.push({ category: "Skills", items: flat });
    }
    return grouped;
  };

  return {
    name: input.name || "",
    title: input.title || "",
    email: input.email || "",
    phone: input.phone || "",
    location: input.location || "",
    links: (input as any).links || [
      input.linkedin && { label: "LinkedIn", url: input.linkedin },
      input.github && { label: "GitHub", url: input.github },
      input.portfolio && { label: "Portfolio", url: input.portfolio },
    ].filter(Boolean),
    summary: input.summary || "",
    experience: (input.experience || []).map(e => ({
      company: e.company || "",
      role: e.role || "",
      location: e.location || "",
      start: e.start || "",
      end: e.end || "",
      bullets: toBullets(e.description),
    })),
    education: (input.education || []).map(e => ({
      school: e.school || "",
      degree: e.degree || "",
      location: e.location || "",
      start: e.start || "",
      end: e.end || "",
      details: e.details || "",
    })),
    projects: (input.projects || []).map(p => ({
      name: p.name || "",
      tech: p.tech || "",
      bullets: toBullets(p.description),
    })),
    skills: parseSkills(input.skills),
    certifications: input.certifications ? input.certifications.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
    settings: input.settings,
  };
}

