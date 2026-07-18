import jsPDF from "jspdf";

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

export type TemplateId = "modern" | "classic" | "compact";

export const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: "modern", name: "Modern", desc: "Sidebar accent, great for tech & design" },
  { id: "classic", name: "Classic ATS", desc: "Clean single column, safest for ATS" },
  { id: "compact", name: "Compact", desc: "One-page dense, ideal for grads" },
];

/* ---------- HTML Preview components ---------- */
function ModernPreview({ r }: { r: ResumeData }) {
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg overflow-hidden font-sans text-[11px] leading-snug" style={{ aspectRatio: "8.5 / 11" }}>
      <div className="grid grid-cols-[35%_65%] h-full">
        <div className="bg-emerald-800 text-white p-5">
          <div className="font-bold text-lg leading-tight">{r.name || "Your Name"}</div>
          <div className="text-emerald-100 text-[10px] mt-0.5">{r.title}</div>
          <div className="mt-4 space-y-1 text-[10px] text-emerald-50 break-words">
            {r.email && <div>{r.email}</div>}
            {r.phone && <div>{r.phone}</div>}
            {r.location && <div>{r.location}</div>}
            {r.links?.map(l => <div key={l.url}>{l.label}: {l.url}</div>)}
          </div>
          {r.skills?.length > 0 && (
            <div className="mt-5">
              <div className="uppercase tracking-wider text-[9px] font-bold border-b border-emerald-600 pb-1 mb-2">Skills</div>
              {r.skills.map(s => (
                <div key={s.category} className="mb-2">
                  <div className="font-semibold text-[10px]">{s.category}</div>
                  <div className="text-[10px] text-emerald-50">{s.items.join(", ")}</div>
                </div>
              ))}
            </div>
          )}
          {r.certifications?.length > 0 && (
            <div className="mt-4">
              <div className="uppercase tracking-wider text-[9px] font-bold border-b border-emerald-600 pb-1 mb-2">Certs</div>
              {r.certifications.map(c => <div key={c} className="text-[10px]">{c}</div>)}
            </div>
          )}
        </div>
        <div className="p-5">
          {r.summary && (
            <section className="mb-4">
              <h3 className="uppercase tracking-wider text-[10px] font-bold text-emerald-800 border-b-2 border-emerald-800 pb-0.5 mb-1.5">Summary</h3>
              <p className="text-[10px]">{r.summary}</p>
            </section>
          )}
          {r.experience?.length > 0 && (
            <section className="mb-4">
              <h3 className="uppercase tracking-wider text-[10px] font-bold text-emerald-800 border-b-2 border-emerald-800 pb-0.5 mb-1.5">Experience</h3>
              {r.experience.map((e, i) => (
                <div key={i} className="mb-2">
                  <div className="flex justify-between font-semibold text-[11px]"><span>{e.role} · {e.company}</span><span className="text-neutral-500 text-[9px]">{e.start} – {e.end}</span></div>
                  <ul className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5">{e.bullets?.map((b, j) => <li key={j}>{b}</li>)}</ul>
                </div>
              ))}
            </section>
          )}
          {r.projects?.length > 0 && (
            <section className="mb-4">
              <h3 className="uppercase tracking-wider text-[10px] font-bold text-emerald-800 border-b-2 border-emerald-800 pb-0.5 mb-1.5">Projects</h3>
              {r.projects.map((p, i) => (
                <div key={i} className="mb-2">
                  <div className="font-semibold text-[11px]">{p.name} <span className="text-neutral-500 font-normal text-[9px]">· {p.tech}</span></div>
                  <ul className="list-disc pl-4 mt-0.5 text-[10px] space-y-0.5">{p.bullets?.map((b, j) => <li key={j}>{b}</li>)}</ul>
                </div>
              ))}
            </section>
          )}
          {r.education?.length > 0 && (
            <section>
              <h3 className="uppercase tracking-wider text-[10px] font-bold text-emerald-800 border-b-2 border-emerald-800 pb-0.5 mb-1.5">Education</h3>
              {r.education.map((e, i) => (
                <div key={i} className="mb-1">
                  <div className="flex justify-between font-semibold text-[11px]"><span>{e.degree}, {e.school}</span><span className="text-neutral-500 text-[9px]">{e.start} – {e.end}</span></div>
                  {e.details && <div className="text-[10px] text-neutral-600">{e.details}</div>}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassicPreview({ r }: { r: ResumeData }) {
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-8 font-serif text-[11px] leading-snug" style={{ aspectRatio: "8.5 / 11" }}>
      <div className="text-center border-b-2 border-neutral-900 pb-2 mb-3">
        <div className="font-bold text-2xl tracking-tight">{r.name || "Your Name"}</div>
        {r.title && <div className="text-[11px] mt-0.5">{r.title}</div>}
        <div className="text-[10px] mt-1 text-neutral-700">
          {[r.email, r.phone, r.location, ...(r.links?.map(l => l.url) ?? [])].filter(Boolean).join("  •  ")}
        </div>
      </div>
      {r.summary && <section className="mb-3"><h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Summary</h3><p>{r.summary}</p></section>}
      {r.experience?.length > 0 && (
        <section className="mb-3">
          <h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Experience</h3>
          {r.experience.map((e, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between"><span className="font-bold">{e.role}, {e.company}</span><span className="text-[10px]">{e.start} – {e.end}</span></div>
              <div className="italic text-[10px]">{e.location}</div>
              <ul className="list-disc pl-4 mt-0.5">{e.bullets?.map((b, j) => <li key={j}>{b}</li>)}</ul>
            </div>
          ))}
        </section>
      )}
      {r.education?.length > 0 && (
        <section className="mb-3">
          <h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Education</h3>
          {r.education.map((e, i) => (
            <div key={i} className="mb-1">
              <div className="flex justify-between"><span className="font-bold">{e.degree}, {e.school}</span><span className="text-[10px]">{e.start} – {e.end}</span></div>
              {e.details && <div className="text-[10px]">{e.details}</div>}
            </div>
          ))}
        </section>
      )}
      {r.projects?.length > 0 && (
        <section className="mb-3">
          <h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Projects</h3>
          {r.projects.map((p, i) => (
            <div key={i} className="mb-1">
              <div className="font-bold">{p.name} <span className="italic font-normal">— {p.tech}</span></div>
              <ul className="list-disc pl-4">{p.bullets?.map((b, j) => <li key={j}>{b}</li>)}</ul>
            </div>
          ))}
        </section>
      )}
      {r.skills?.length > 0 && (
        <section className="mb-2">
          <h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Skills</h3>
          {r.skills.map(s => <div key={s.category}><span className="font-bold">{s.category}:</span> {s.items.join(", ")}</div>)}
        </section>
      )}
      {r.certifications?.length > 0 && (
        <section><h3 className="uppercase text-[11px] font-bold tracking-widest border-b border-neutral-400 mb-1">Certifications</h3>{r.certifications.join(" • ")}</section>
      )}
    </div>
  );
}

function CompactPreview({ r }: { r: ResumeData }) {
  return (
    <div className="bg-white text-neutral-900 shadow-elegant rounded-lg p-6 font-sans text-[10px] leading-tight" style={{ aspectRatio: "8.5 / 11" }}>
      <div className="flex justify-between items-end border-b-2 border-neutral-900 pb-1.5 mb-2">
        <div>
          <div className="font-extrabold text-xl">{r.name || "Your Name"}</div>
          <div className="text-[10px] text-neutral-600">{r.title}</div>
        </div>
        <div className="text-right text-[9px] text-neutral-700">
          {r.email && <div>{r.email}</div>}
          {r.phone && <div>{r.phone}</div>}
          {r.location && <div>{r.location}</div>}
          {r.links?.map(l => <div key={l.url}>{l.url}</div>)}
        </div>
      </div>
      {r.summary && <p className="mb-2 text-[10px]">{r.summary}</p>}
      {r.experience?.length > 0 && (
        <section className="mb-2">
          <h3 className="font-bold text-[10px] uppercase tracking-wide text-neutral-700 mb-0.5">Experience</h3>
          {r.experience.map((e, i) => (
            <div key={i} className="mb-1.5">
              <div className="flex justify-between text-[10px]"><span className="font-semibold">{e.role} — {e.company}</span><span className="text-neutral-500">{e.start} – {e.end}</span></div>
              <ul className="list-disc pl-3.5">{e.bullets?.map((b, j) => <li key={j}>{b}</li>)}</ul>
            </div>
          ))}
        </section>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          {r.education?.length > 0 && (
            <section className="mb-2">
              <h3 className="font-bold text-[10px] uppercase tracking-wide text-neutral-700 mb-0.5">Education</h3>
              {r.education.map((e, i) => (
                <div key={i}><div className="font-semibold">{e.degree}</div><div>{e.school}, {e.start}–{e.end}</div></div>
              ))}
            </section>
          )}
          {r.certifications?.length > 0 && (
            <section><h3 className="font-bold text-[10px] uppercase tracking-wide text-neutral-700 mb-0.5">Certifications</h3>{r.certifications.map(c => <div key={c}>• {c}</div>)}</section>
          )}
        </div>
        <div>
          {r.skills?.length > 0 && (
            <section className="mb-2">
              <h3 className="font-bold text-[10px] uppercase tracking-wide text-neutral-700 mb-0.5">Skills</h3>
              {r.skills.map(s => <div key={s.category}><span className="font-semibold">{s.category}:</span> {s.items.join(", ")}</div>)}
            </section>
          )}
          {r.projects?.length > 0 && (
            <section>
              <h3 className="font-bold text-[10px] uppercase tracking-wide text-neutral-700 mb-0.5">Projects</h3>
              {r.projects.map((p, i) => (
                <div key={i} className="mb-1"><div className="font-semibold">{p.name}</div><ul className="list-disc pl-3.5">{p.bullets?.slice(0,2).map((b, j) => <li key={j}>{b}</li>)}</ul></div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResumePreview({ template, data }: { template: TemplateId; data: ResumeData }) {
  if (template === "modern") return <ModernPreview r={data} />;
  if (template === "compact") return <CompactPreview r={data} />;
  return <ClassicPreview r={data} />;
}

/* ---------- PDF export (single implementation, styled per template) ---------- */
export function downloadResumePdfFromData(data: ResumeData, template: TemplateId) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const accent: [number, number, number] = template === "modern" ? [6, 95, 70] : template === "classic" ? [20, 20, 20] : [40, 40, 40];
  const font = template === "classic" ? "times" : "helvetica";
  let y = margin;

  const ensure = (h = 14) => { if (y + h > pageH - margin) { doc.addPage(); y = margin; } };
  const H1 = (t: string) => {
    doc.setFont(font, "bold"); doc.setFontSize(22); doc.setTextColor(...accent);
    doc.text(t, margin, y); y += 20;
  };
  const meta = (t: string) => {
    doc.setFont(font, "normal"); doc.setFontSize(9); doc.setTextColor(100);
    doc.text(t, margin, y); y += 14;
  };
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
  if (data.skills?.length) {
    H2("Skills");
    data.skills.forEach(s => line(`${s.category}: ${s.items.join(", ")}`));
  }
  if (data.certifications?.length) { H2("Certifications"); data.certifications.forEach(c => bullet(c)); }

  const safe = (data.name || "resume").replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-").toLowerCase();
  doc.save(`${safe || "resume"}-${template}.pdf`);
}
