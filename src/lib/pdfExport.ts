import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

export interface ExportData {
  title?: string | null;
  company?: string | null;
  role?: string | null;
  professional_summary: string | null;
  improved_bullets: { original: string; improved: string }[] | null;
  skills_to_add: string[] | null;
  missing_keywords: string[] | null;
  ats_score: number | null;
  cover_letter?: string | null;
}

function safeName(opt: ExportData, ext: string) {
  const base = (opt.title || opt.company || "tailored-resume").replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-").toLowerCase();
  return `${base || "tailored-resume"}.${ext}`;
}

/* ---------- PDF ---------- */
export async function downloadResumePdf(opt: ExportData) {
  // Try to find by data-rs-root first
  let element = document.querySelector(`[data-rs-root]`) as HTMLElement;
  if (!element) {
    element = document.querySelector(".resume-root-container") as HTMLElement;
  }
  
  if (!element) {
    console.error("Resume preview not found for PDF export.");
    return;
  }
  
  const canvas = await html2canvas(element, { 
    scale: 2, 
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false
  });
  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
  doc.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
  doc.save(safeName(opt, "pdf"));
}

/* ---------- DOCX ---------- */
export async function downloadResumeDocx(opt: ExportData) {
  const sections: Paragraph[] = [];
  sections.push(new Paragraph({
    children: [new TextRun({ text: opt.title || "Tailored Resume", bold: true, size: 40 })],
    spacing: { after: 120 },
  }));
  sections.push(new Paragraph({
    children: [new TextRun({ text: `ATS Match Score: ${opt.ats_score ?? "—"}/100`, italics: true, color: "777777", size: 20 })],
    spacing: { after: 240 },
  }));

  const addHeading = (t: string) => sections.push(new Paragraph({
    children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 26, color: "146E50" })],
    spacing: { before: 240, after: 120 },
  }));

  if (opt.professional_summary) {
    addHeading("Professional Summary");
    sections.push(new Paragraph({ children: [new TextRun({ text: opt.professional_summary, size: 22 })] }));
  }
  if (opt.improved_bullets?.length) {
    addHeading("Experience Highlights");
    opt.improved_bullets.forEach(b => {
      sections.push(new Paragraph({
        children: [new TextRun({ text: b.improved, size: 22 })],
        bullet: { level: 0 },
      }));
    });
  }
  if (opt.skills_to_add?.length) {
    addHeading("Key Skills");
    sections.push(new Paragraph({ children: [new TextRun({ text: opt.skills_to_add.join(" · "), size: 22 })] }));
  }
  if (opt.missing_keywords?.length) {
    addHeading("Keywords Incorporated");
    sections.push(new Paragraph({ children: [new TextRun({ text: opt.missing_keywords.join(", "), size: 22 })] }));
  }

  const doc = new Document({ sections: [{ children: sections }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, safeName(opt, "docx"));
}

/* ---------- Plain text (ATS) ---------- */
export function downloadResumeTxt(opt: ExportData) {
  const lines: string[] = [];
  lines.push((opt.title || "TAILORED RESUME").toUpperCase());
  lines.push("=".repeat(60));
  lines.push(`ATS Match Score: ${opt.ats_score ?? "—"}/100`);
  lines.push("");
  if (opt.professional_summary) {
    lines.push("PROFESSIONAL SUMMARY"); lines.push("-".repeat(60));
    lines.push(opt.professional_summary); lines.push("");
  }
  if (opt.improved_bullets?.length) {
    lines.push("EXPERIENCE HIGHLIGHTS"); lines.push("-".repeat(60));
    opt.improved_bullets.forEach(b => lines.push(`* ${b.improved}`));
    lines.push("");
  }
  if (opt.skills_to_add?.length) {
    lines.push("KEY SKILLS"); lines.push("-".repeat(60));
    lines.push(opt.skills_to_add.join(", ")); lines.push("");
  }
  if (opt.missing_keywords?.length) {
    lines.push("KEYWORDS"); lines.push("-".repeat(60));
    lines.push(opt.missing_keywords.join(", "));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  saveAs(blob, safeName(opt, "txt"));
}

/* ---------- Markdown ---------- */
export function downloadResumeMarkdown(opt: ExportData) {
  const md: string[] = [];
  md.push(`# ${opt.title || "Tailored Resume"}`);
  md.push(`*ATS Match Score: **${opt.ats_score ?? "—"}/100***`);
  md.push("");
  if (opt.professional_summary) { md.push("## Professional Summary"); md.push(opt.professional_summary); md.push(""); }
  if (opt.improved_bullets?.length) {
    md.push("## Experience Highlights");
    opt.improved_bullets.forEach(b => md.push(`- ${b.improved}`));
    md.push("");
  }
  if (opt.skills_to_add?.length) { md.push("## Key Skills"); md.push(opt.skills_to_add.map(s => `\`${s}\``).join(" · ")); md.push(""); }
  if (opt.missing_keywords?.length) { md.push("## Keywords Incorporated"); md.push(opt.missing_keywords.join(", ")); }
  const blob = new Blob([md.join("\n")], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, safeName(opt, "md"));
}

/* ---------- Cover letter exports ---------- */
export function downloadCoverLetterPdf(opt: ExportData, text: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 56;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(15, 50, 40);
  doc.text("Cover Letter", margin, y); y += 24;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(30, 30, 30);
  text.split(/\n+/).forEach(para => {
    const lines = doc.splitTextToSize(para, maxWidth);
    lines.forEach((line: string) => {
      if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y); y += 14;
    });
    y += 8;
  });
  doc.save(safeName(opt, "cover.pdf"));
}
