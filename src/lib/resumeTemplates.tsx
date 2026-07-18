import React, { useEffect, useRef } from "react";
import jsPDF from "jspdf";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  BorderStyle, LevelFormat, PageBreak,
} from "docx";
import { saveAs } from "file-saver";

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
}

export type TemplateId = "modern" | "classic" | "compact" | "executive" | "creative" | "minimal";

export const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: "modern", name: "Modern", desc: "Sidebar accent, great for tech & design" },
  { id: "classic", name: "Classic ATS", desc: "Clean single column, safest for ATS" },
  { id: "compact", name: "Compact", desc: "One-page dense, ideal for grads" },
  { id: "executive", name: "Executive", desc: "Elegant serif with strong header — senior roles" },
  { id: "creative", name: "Creative", desc: "Bold indigo banner, two-column — design & marketing" },
  { id: "minimal", name: "Minimal", desc: "Ultra-clean typography, generous whitespace" },
];

/* ---------- Inline editable primitive ---------- */
const Editable = React.memo(function Editable({
  value, onChange, className, as = "span", multiline = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  className?: string;
  as?: any;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
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
      onBlur={
        editable
          ? (e: any) => {
              const txt = multiline
                ? (e.currentTarget.innerText as string).replace(/\r/g, "")
                : (e.currentTarget.innerText as string).replace(/\s+/g, " ").trim();
              onChange!(txt);
            }
          : undefined
      }
    />
  );
});

/** Bullets editor: one <li> per bullet, editable, splits on Enter via onBlur parse. */
function BulletsEditor({
  bullets, onChange, className,
}: { bullets: string[]; onChange?: (v: string[]) => void; className?: string }) {
  const editable = !!onChange;
  const ref = useRef<HTMLUListElement>(null);
  const text = bullets.join("\n");
  useEffect(() => {
    if (!ref.current) return;
    const current = Array.from(ref.current.querySelectorAll("li"))
      .map((li) => (li.textContent || "").trim())
      .join("\n");
    if (current !== text) {
      ref.current.innerHTML = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
    }
  }, [text, bullets]);
  return (
    <ul
      ref={ref}
      contentEditable={editable}
      suppressContentEditableWarning
      className={
        (className || "") +
        (editable ? " outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/40 rounded" : "")
      }
      onBlur={
        editable
          ? (e) => {
              const items = Array.from(e.currentTarget.querySelectorAll("li"))
                .map((li) => (li.textContent || "").trim())
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

/* ---------- HTML Preview components ---------- */
function ModernPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg overflow-hidden font-sans text-[11px] leading-snug" style={{ aspectRatio: "8.5 / 11" }}>
      <div className="grid grid-cols-[35%_65%] h-full">
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
              {r.skills.map((s, i) => {
                const upd = makeSkillUpdater(update, r, i);
                return (
                  <div key={i} className="mb-2">
                    <Editable as="div" value={s.category} onChange={update && (v => upd({ category: v }))} className="font-semibold text-[10px]" />
                    <Editable as="div" value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} className="text-[10px] text-emerald-50" />
                  </div>
                );
              })}
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
          {(r.summary || update) && (
            <section className="mb-4">
              <h3 className="uppercase tracking-wider text-[10px] font-bold text-emerald-800 border-b-2 border-emerald-800 pb-0.5 mb-1.5">Summary</h3>
              <Editable as="p" multiline value={r.summary} onChange={update && (v => on({ summary: v }))} className="text-[10px] whitespace-pre-wrap" />
            </section>
          )}
          {r.experience?.length > 0 && (
            <section className="mb-4">
              <h3 className="uppercase tracking-wider text-[10px] font-bold text-emerald-800 border-b-2 border-emerald-800 pb-0.5 mb-1.5">Experience</h3>
              {r.experience.map((e, i) => {
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
              })}
            </section>
          )}
          {r.projects?.length > 0 && (
            <section className="mb-4">
              <h3 className="uppercase tracking-wider text-[10px] font-bold text-emerald-800 border-b-2 border-emerald-800 pb-0.5 mb-1.5">Projects</h3>
              {r.projects.map((p, i) => {
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
              })}
            </section>
          )}
          {r.education?.length > 0 && (
            <section>
              <h3 className="uppercase tracking-wider text-[10px] font-bold text-emerald-800 border-b-2 border-emerald-800 pb-0.5 mb-1.5">Education</h3>
              {r.education.map((e, i) => {
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
              })}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassicPreview({ r, update }: { r: ResumeData; update?: UpdateFn }) {
  const on = (patch: Partial<ResumeData>) => update?.(patch);
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-8 font-serif text-[11px] leading-snug" style={{ aspectRatio: "8.5 / 11" }}>
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
          {r.skills.map((s, i) => {
            const upd = makeSkillUpdater(update, r, i);
            return (
              <div key={i}><span className="font-bold"><Editable value={s.category} onChange={update && (v => upd({ category: v }))} />:</span> <Editable value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} /></div>
            );
          })}
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
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-6 font-sans text-[10px] leading-tight" style={{ aspectRatio: "8.5 / 11" }}>
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
                  <div key={i}><span className="font-semibold"><Editable value={s.category} onChange={update && (v => upd({ category: v }))} />:</span> <Editable value={s.items.join(", ")} onChange={update && (v => upd({ items: v.split(",").map(x => x.trim()).filter(Boolean) }))} /></div>
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
                    <BulletsEditor bullets={(p.bullets || []).slice(0, 2)} onChange={update && (v => upd({ bullets: v }))} className="list-disc pl-3.5" />
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

export function ResumePreview({
  template, data, onChange,
}: { template: TemplateId; data: ResumeData; onChange?: (data: ResumeData) => void }) {
  const update: UpdateFn = onChange ? (patch) => onChange({ ...data, ...patch }) : undefined;
  if (template === "modern") return <ModernPreview r={data} update={update} />;
  if (template === "compact") return <CompactPreview r={data} update={update} />;
  return <ClassicPreview r={data} update={update} />;
}

/* ---------- PDF export ---------- */
export function downloadResumePdfFromData(data: ResumeData, template: TemplateId) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const accent: [number, number, number] = template === "modern" ? [6, 95, 70] : template === "classic" ? [20, 20, 20] : [40, 40, 40];
  const font = template === "classic" ? "times" : "helvetica";
  let y = margin;

  const ensure = (h = 14) => { if (y + h > pageH - margin) { doc.addPage(); y = margin; } };
  const H1 = (t: string) => { doc.setFont(font, "bold"); doc.setFontSize(22); doc.setTextColor(...accent); doc.text(t, margin, y); y += 20; };
  const meta = (t: string) => { doc.setFont(font, "normal"); doc.setFontSize(9); doc.setTextColor(100); doc.text(t, margin, y); y += 14; };
  const H2 = (t: string) => {
    ensure(24); y += 6;
    doc.setFont(font, "bold"); doc.setFontSize(11); doc.setTextColor(...accent);
    doc.text(t.toUpperCase(), margin, y); y += 4;
    doc.setDrawColor(...accent); doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y); y += 12;
    doc.setTextColor(30, 30, 30);
  };
  const line = (t: string, opts: { bold?: boolean; size?: number; italic?: boolean } = {}) => {
    doc.setFont(font, opts.bold ? "bold" : opts.italic ? "italic" : "normal");
    doc.setFontSize(opts.size ?? 10);
    const lines = doc.splitTextToSize(t, pageW - margin * 2);
    lines.forEach((l: string) => { ensure(13); doc.text(l, margin, y); y += 13; });
  };
  const bullet = (t: string) => {
    doc.setFont(font, "normal"); doc.setFontSize(10);
    const lines = doc.splitTextToSize(t, pageW - margin * 2 - 14);
    lines.forEach((l: string, i: number) => {
      ensure(13);
      if (i === 0) doc.text("•", margin + 4, y);
      doc.text(l, margin + 14, y); y += 13;
    });
  };

  H1(data.name || "Your Name");
  if (data.title) meta(data.title);
  meta([data.email, data.phone, data.location, ...(data.links?.map(l => `${l.label}: ${l.url}`) ?? [])].filter(Boolean).join("  |  "));

  if (data.summary) { H2("Summary"); line(data.summary); }
  if (data.experience?.length) {
    H2("Experience");
    data.experience.forEach(e => {
      line(`${e.role} — ${e.company}${e.location ? `, ${e.location}` : ""}`, { bold: true });
      if (e.start || e.end) line(`${e.start} – ${e.end}`, { italic: true, size: 9 });
      e.bullets?.forEach(b => bullet(b));
      y += 4;
    });
  }
  if (data.projects?.length) {
    H2("Projects");
    data.projects.forEach(p => {
      line(`${p.name}${p.tech ? ` — ${p.tech}` : ""}`, { bold: true });
      p.bullets?.forEach(b => bullet(b));
      y += 4;
    });
  }
  if (data.education?.length) {
    H2("Education");
    data.education.forEach(e => {
      line(`${e.degree} — ${e.school}${e.location ? `, ${e.location}` : ""}`, { bold: true });
      if (e.start || e.end) line(`${e.start} – ${e.end}`, { italic: true, size: 9 });
      if (e.details) line(e.details);
      y += 4;
    });
  }
  if (data.skills?.length) { H2("Skills"); data.skills.forEach(s => line(`${s.category}: ${s.items.join(", ")}`)); }
  if (data.certifications?.length) { H2("Certifications"); data.certifications.forEach(c => bullet(c)); }

  const safe = safeName(data.name);
  doc.save(`${safe}-${template}.pdf`);
}

/* ---------- DOCX export (editable in Word / Google Docs) ---------- */
export async function downloadResumeDocxFromData(data: ResumeData, template: TemplateId) {
  const isClassic = template === "classic";
  const font = isClassic ? "Times New Roman" : "Calibri";
  const accent = template === "modern" ? "065F46" : "111111";

  const P = (text: string, opts: { bold?: boolean; italic?: boolean; size?: number; color?: string; align?: any } = {}) =>
    new Paragraph({
      alignment: opts.align,
      children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, size: opts.size ?? 22, color: opts.color, font })],
    });

  const H = (text: string) =>
    new Paragraph({
      spacing: { before: 200, after: 80 },
      border: { bottom: { color: accent, size: 8, style: BorderStyle.SINGLE, space: 2 } },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: accent, font })],
    });

  const bullet = (text: string) =>
    new Paragraph({
      numbering: { reference: "bullets", level: 0 },
      children: [new TextRun({ text, size: 22, font })],
    });

  const children: Paragraph[] = [];

  children.push(P(data.name || "Your Name", { bold: true, size: 44, align: AlignmentType.CENTER, color: accent }));
  if (data.title) children.push(P(data.title, { size: 24, align: AlignmentType.CENTER }));
  const contact = [data.email, data.phone, data.location, ...(data.links?.map(l => `${l.label}: ${l.url}`) ?? [])].filter(Boolean).join("  •  ");
  if (contact) children.push(P(contact, { size: 20, align: AlignmentType.CENTER, color: "555555" }));

  if (data.summary) { children.push(H("Summary")); children.push(P(data.summary)); }

  if (data.experience?.length) {
    children.push(H("Experience"));
    data.experience.forEach(e => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${e.role}`, bold: true, size: 22, font }),
          new TextRun({ text: ` — ${e.company}${e.location ? `, ${e.location}` : ""}`, size: 22, font }),
          new TextRun({ text: `   ${e.start} – ${e.end}`, italics: true, size: 20, color: "666666", font }),
        ],
      }));
      e.bullets?.forEach(b => children.push(bullet(b)));
    });
  }

  if (data.projects?.length) {
    children.push(H("Projects"));
    data.projects.forEach(p => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: p.name, bold: true, size: 22, font }),
          p.tech ? new TextRun({ text: ` — ${p.tech}`, italics: true, size: 20, color: "666666", font }) : new TextRun(""),
        ],
      }));
      p.bullets?.forEach(b => children.push(bullet(b)));
    });
  }

  if (data.education?.length) {
    children.push(H("Education"));
    data.education.forEach(e => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: e.degree, bold: true, size: 22, font }),
          new TextRun({ text: ` — ${e.school}${e.location ? `, ${e.location}` : ""}`, size: 22, font }),
          new TextRun({ text: `   ${e.start} – ${e.end}`, italics: true, size: 20, color: "666666", font }),
        ],
      }));
      if (e.details) children.push(P(e.details, { size: 20 }));
    });
  }

  if (data.skills?.length) {
    children.push(H("Skills"));
    data.skills.forEach(s => children.push(new Paragraph({
      children: [
        new TextRun({ text: `${s.category}: `, bold: true, size: 22, font }),
        new TextRun({ text: s.items.join(", "), size: 22, font }),
      ],
    })));
  }

  if (data.certifications?.length) {
    children.push(H("Certifications"));
    data.certifications.forEach(c => children.push(bullet(c)));
  }

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
}

export function buildResumeDataVerbatim(input: RawProfileInput): ResumeData {
  const toBullets = (text: string) =>
    text
      .split(/\r?\n/)
      .map(l => l.replace(/^\s*[-*•]\s?/, "").trim())
      .filter(Boolean);

  const parseSkills = (raw: string): ResumeData["skills"] => {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const grouped: ResumeData["skills"] = [];
    const flat: string[] = [];
    for (const l of lines) {
      const m = l.match(/^([^:]+):\s*(.+)$/);
      if (m) grouped.push({ category: m[1].trim(), items: m[2].split(",").map(s => s.trim()).filter(Boolean) });
      else flat.push(l);
    }
    if (flat.length) grouped.push({ category: "Skills", items: flat });
    return grouped;
  };

  return {
    name: input.name, title: input.title,
    email: input.email, phone: input.phone, location: input.location,
    links: [
      input.linkedin && { label: "LinkedIn", url: input.linkedin },
      input.github && { label: "GitHub", url: input.github },
      input.portfolio && { label: "Portfolio", url: input.portfolio },
    ].filter(Boolean) as { label: string; url: string }[],
    summary: input.summary || "",
    experience: input.experience.map(e => ({
      company: e.company, role: e.role, location: e.location, start: e.start, end: e.end,
      bullets: toBullets(e.description),
    })),
    education: input.education.map(e => ({ ...e })),
    projects: input.projects.map(p => ({ name: p.name, tech: p.tech, bullets: toBullets(p.description) })),
    skills: parseSkills(input.skills),
    certifications: input.certifications.split(/\r?\n/).map(s => s.trim()).filter(Boolean),
  };
}
