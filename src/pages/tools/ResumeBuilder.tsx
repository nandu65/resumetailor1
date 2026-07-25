import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Plus, Trash2, Download, FileText, Wand2, FileEdit, Upload, FilePlus2, MousePointer2, ArrowDown, Link2, Wand, CheckCircle2 } from "lucide-react";
import { extractTextFromFile } from "@/lib/extractText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  TEMPLATES, TemplateId, ResumeData, ResumePreview,
  downloadResumePdfFromData, downloadResumeDocxFromData, buildResumeDataVerbatim,
} from "@/lib/resumeTemplates";
import { BuilderIntroLoader } from "@/components/BuilderIntroLoader";
import { TemplatePreferencesWizard, DEFAULT_PREFS, ResumePrefs } from "@/components/TemplatePreferencesWizard";
import { PreferenceFilterBar, scoreTemplate } from "@/components/PreferenceFilterBar";

type Exp = { company: string; role: string; location: string; start: string; end: string; description: string };
type Edu = { school: string; degree: string; location: string; start: string; end: string; details: string };
type Proj = { name: string; tech: string; description: string };

const EMPTY_RESUME: ResumeData = {
  name: "", title: "", email: "", phone: "", location: "", links: [],
  summary: "", experience: [], education: [], projects: [], skills: [], certifications: [],
};

const SAMPLE_RESUME: ResumeData = {
  name: "Alex Morgan",
  title: "Senior Software Engineer",
  email: "alex@example.com",
  phone: "+1 555 010 2244",
  location: "San Francisco, CA",
  links: [
    { label: "LinkedIn", url: "linkedin.com/in/alex" },
    { label: "GitHub", url: "github.com/alex" },
  ],
  summary: "Full-stack engineer with 6+ years building scalable web platforms in React, Node, and cloud-native services. Shipped products used by millions.",
  experience: [
    {
      company: "Acme Corp", role: "Senior Software Engineer", location: "Remote",
      start: "Jan 2022", end: "Present",
      bullets: [
        "Led migration of monolith to microservices, cutting deploy time by 70%.",
        "Architected real-time analytics pipeline processing 5M events/day.",
        "Mentored 6 engineers; introduced code-review standards adopted org-wide.",
      ],
    },
    {
      company: "Northwind Labs", role: "Software Engineer", location: "New York, NY",
      start: "Jun 2019", end: "Dec 2021",
      bullets: [
        "Built customer dashboard in React + TypeScript, boosting retention 18%.",
        "Owned CI/CD in GitHub Actions; reduced flaky failures from 12% to 1%.",
      ],
    },
  ],
  education: [
    { school: "UC Berkeley", degree: "B.S. Computer Science", location: "Berkeley, CA", start: "2015", end: "2019", details: "GPA 3.8 · Dean's List" },
  ],
  projects: [
    { name: "OpenChart", tech: "React, D3", bullets: ["OSS charting lib with 3k+ GitHub stars."] },
  ],
  skills: [
    { category: "Frontend", items: ["React", "TypeScript", "Tailwind"] },
    { category: "Backend", items: ["Node.js", "PostgreSQL", "Redis"] },
    { category: "Cloud", items: ["AWS", "Docker", "Kubernetes"] },
  ],
  certifications: ["AWS Solutions Architect Associate"],
};

const SAMPLE_JD = `We are hiring a Senior Software Engineer to build and scale our React + Node platform (used by 2M+ users).
Responsibilities: architect microservices, own CI/CD, mentor engineers, drive code quality.
Must have: 5+ years JS/TS, React, Node.js, PostgreSQL, AWS, Docker. Nice to have: Kubernetes, GraphQL, event-driven systems.`;

export default function ResumeBuilder() {
  const { user } = useAuth();
  const [basics, setBasics] = useState({ name: "", title: "", email: "", phone: "", location: "" });
  const [links, setLinks] = useState<{ label: string; url: string }[]>([
    { label: "LinkedIn", url: "" },
  ]);
  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState<Exp[]>([{ company: "", role: "", location: "", start: "", end: "", description: "" }]);
  const [education, setEducation] = useState<Edu[]>([{ school: "", degree: "", location: "", start: "", end: "", details: "" }]);
  const [projects, setProjects] = useState<Proj[]>([]);
  const [skills, setSkills] = useState("");
  const [certifications, setCertifications] = useState("");
  const [targetJd, setTargetJd] = useState("");
  const [template, setTemplate] = useState<TemplateId>("modern");
  const [loading, setLoading] = useState(false);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [mode, setMode] = useState<"ai" | "verbatim">("ai");
  const [starter, setStarter] = useState<"choose" | "scratch" | "uploaded">("choose");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [showEditHint, setShowEditHint] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const fillSample = () => {
    setBasics({
      name: "Alex Morgan",
      title: "Senior Software Engineer",
      email: "alex.morgan@example.com",
      phone: "+1 555 010 2244",
      location: "San Francisco, CA",
    });
    setLinks([
      { label: "LinkedIn", url: "linkedin.com/in/alexmorgan" },
      { label: "GitHub", url: "github.com/alexmorgan" },
      { label: "Portfolio", url: "alexmorgan.dev" },
    ]);
    setSummary("Full-stack engineer with 6+ years shipping scalable React + Node platforms used by millions. Passionate about clean architecture and mentoring.");
    setExperience([
      {
        company: "Acme Corp", role: "Senior Software Engineer", location: "Remote",
        start: "Jan 2022", end: "Present",
        description: "Led migration from monolith to microservices, cut deploy time by 70%.\nBuilt real-time analytics pipeline processing 5M events/day on AWS.\nMentored 6 engineers, introduced code-review standards adopted org-wide.",
      },
      {
        company: "Northwind Labs", role: "Software Engineer", location: "New York, NY",
        start: "Jun 2019", end: "Dec 2021",
        description: "Built customer dashboard in React + TypeScript, boosted retention by 18%.\nOwned CI/CD in GitHub Actions, reduced flaky failures from 12% to 1%.",
      },
    ]);
    setEducation([
      { school: "UC Berkeley", degree: "B.S. Computer Science", location: "Berkeley, CA", start: "2015", end: "2019", details: "GPA 3.8 · Dean's List" },
    ]);
    setProjects([
      { name: "OpenChart", tech: "React, D3, TypeScript", description: "Open-source charting library with 3k+ GitHub stars and 40k weekly npm downloads." },
    ]);
    setSkills("Frontend: React, TypeScript, Tailwind\nBackend: Node.js, PostgreSQL, Redis\nCloud: AWS, Docker, Kubernetes");
    setCertifications("AWS Solutions Architect Associate");
    setTargetJd(SAMPLE_JD);
    setStarter("scratch");
    toast.success("Sample data loaded — click Generate to see it in every template.");
  };

  const onUpload = async (file: File) => {
    if (!user) return toast.error("Sign in to upload and parse your resume");
    setUploading(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) throw new Error("Couldn't read text from that file");
      const { data, error } = await supabase.functions.invoke("parse-resume", { body: { text } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "Parse failed");
      const p = (data as any).parsed || {};
      setBasics({
        name: p.name || "", title: p.title || "", email: p.email || "", phone: p.phone || "",
        location: p.location || "",
      });
      const parsedLinks: { label: string; url: string }[] = [];
      if (p.linkedin) parsedLinks.push({ label: "LinkedIn", url: p.linkedin });
      if (p.github) parsedLinks.push({ label: "GitHub", url: p.github });
      if (p.portfolio) parsedLinks.push({ label: "Portfolio", url: p.portfolio });
      if (Array.isArray(p.links)) p.links.forEach((l: any) => l?.url && parsedLinks.push({ label: l.label || "Link", url: l.url }));
      setLinks(parsedLinks.length ? parsedLinks : [{ label: "LinkedIn", url: "" }]);
      setSummary(p.summary || "");
      setExperience((p.experience || []).length ? p.experience.map((e: any) => ({
        company: e.company || "", role: e.role || "", location: e.location || "",
        start: e.start || "", end: e.end || "", description: (e.bullets || []).join("\n"),
      })) : [{ company: "", role: "", location: "", start: "", end: "", description: "" }]);
      setEducation((p.education || []).length ? p.education.map((e: any) => ({
        school: e.school || "", degree: e.degree || "", location: e.location || "",
        start: e.start || "", end: e.end || "", details: e.details || "",
      })) : [{ school: "", degree: "", location: "", start: "", end: "", details: "" }]);
      setProjects((p.projects || []).map((x: any) => ({
        name: x.name || "", tech: x.tech || "", description: (x.bullets || []).join("\n"),
      })));
      setSkills((p.skills || []).join("\n"));
      setCertifications((p.certifications || []).join("\n"));
      setStarter("uploaded");
      toast.success("Resume imported — review the fields below, then generate.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to import resume");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };


  // Sync edits made in the live preview back into the form fields
  useEffect(() => {
    if (!resume) return;
    const linkByLabel = (label: string) =>
      resume.links?.find(l => l.label?.toLowerCase() === label.toLowerCase())?.url || "";
    setBasics(b => ({
      ...b,
      name: resume.name ?? b.name,
      title: resume.title ?? b.title,
      email: resume.email ?? b.email,
      phone: resume.phone ?? b.phone,
      location: resume.location ?? b.location,
    }));
    if (resume.links && resume.links.length) {
      setLinks(resume.links.map(l => ({ label: l.label || "Link", url: l.url || "" })));
    }
    setSummary(resume.summary ?? "");
    setExperience((resume.experience || []).map(e => ({
      company: e.company || "", role: e.role || "", location: e.location || "",
      start: e.start || "", end: e.end || "",
      description: (e.bullets || []).join("\n"),
    })));
    setEducation((resume.education || []).map((e: any) => ({
      school: e.school || "", degree: e.degree || "", location: e.location || "",
      start: e.start || "", end: e.end || "", details: e.details || "",
    })));
    setProjects((resume.projects || []).map(p => ({
      name: p.name || "", tech: p.tech || "",
      description: (p.bullets || []).join("\n"),
    })));
    setSkills((resume.skills || []).join("\n"));
    setCertifications((resume.certifications || []).join("\n"));
  }, [resume]);

  const addExp = () => setExperience([...experience, { company: "", role: "", location: "", start: "", end: "", description: "" }]);
  const addEdu = () => setEducation([...education, { school: "", degree: "", location: "", start: "", end: "", details: "" }]);
  const addProj = () => setProjects([...projects, { name: "", tech: "", description: "" }]);

  const buildRawInput = () => ({
    ...basics,
    summary, experience, education, projects, skills, certifications,
  });

  const generate = async () => {
    if (!basics.name.trim()) return toast.error("Add your name at minimum");

    // Verbatim mode: no AI, no auth required — build directly from user input
    if (mode === "verbatim") {
      setResume(buildResumeDataVerbatim(buildRawInput()));
      setShowEditHint(true);
      return;
    }

    if (!user) return toast.error("Sign in to use AI polish");
    setLoading(true);
    try {
      const profile = {
        ...basics,
        links: links.filter(l => l.url.trim()).map(l => ({ label: l.label.trim() || "Link", url: l.url.trim() })),
        summary,
        experience,
        education,
        projects,
        skills: skills.split("\n").map(s => s.trim()).filter(Boolean),
        certifications: certifications.split("\n").map(s => s.trim()).filter(Boolean),
      };
      const { data, error } = await supabase.functions.invoke("generate-resume", {
        body: { profile, targetJd },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Failed");
        return;
      }
      setResume({ ...EMPTY_RESUME, ...(data as any).resume });
      setShowEditHint(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => resume && downloadResumePdfFromData(resume, template);
  const downloadDocx = () => resume && downloadResumeDocxFromData(resume, template);

  return (
    <div className="min-h-screen bg-background">
      {showIntro && <BuilderIntroLoader onDone={() => setShowIntro(false)} />}
      <Navbar />
      <div className="container py-10 max-w-7xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
            <Wand2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">AI Resume Builder</h1>
            <p className="text-muted-foreground text-sm mt-1">Fill in your info — AI writes polished bullets and formats it into a template.</p>
          </div>
        </div>

        {!user && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <Link to="/auth" className="underline text-primary font-semibold">Sign in</Link> to generate and export your resume.
          </div>
        )}

        {/* Starter chooser */}
        <div className="mb-6 rounded-2xl border-2 border-border bg-gradient-card p-6 shadow-card">
          <div className="text-center mb-5">
            <h2 className="font-display text-xl font-bold">How would you like to start?</h2>
            <p className="text-sm text-muted-foreground mt-1">Import an existing resume, start fresh, or preview with sample data.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {/* Upload */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`group relative text-left rounded-xl border-2 p-5 pt-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow overflow-hidden ${starter === "uploaded" ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-background hover:border-primary/60"}`}
            >
              <div className="absolute -top-px left-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-b bg-primary text-primary-foreground">Recommended</div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 transition-all ${starter === "uploaded" ? "bg-primary text-primary-foreground shadow-glow" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110"}`}>
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              </div>
              <div className="font-display font-semibold flex items-center gap-1.5">
                Upload my resume
                {starter === "uploaded" && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
              <div className="text-xs text-muted-foreground mt-1 leading-snug">PDF, DOCX, or TXT. AI extracts everything so you can review & polish.</div>
            </button>

            {/* Scratch */}
            <button
              type="button"
              onClick={() => setStarter("scratch")}
              className={`group text-left rounded-xl border-2 p-5 pt-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow ${starter === "scratch" ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-background hover:border-primary/60"}`}
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 transition-all ${starter === "scratch" ? "bg-primary text-primary-foreground shadow-glow" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110"}`}>
                <FilePlus2 className="h-5 w-5" />
              </div>
              <div className="font-display font-semibold flex items-center gap-1.5">
                Start from scratch
                {starter === "scratch" && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
              <div className="text-xs text-muted-foreground mt-1 leading-snug">Fill the form below — we guide you section by section.</div>
            </button>

            {/* Sample data */}
            <button
              type="button"
              onClick={fillSample}
              className="group text-left rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 pt-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow hover:border-primary hover:bg-primary/10"
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center mb-3 shadow-glow group-hover:scale-110 transition-transform">
                <Wand className="h-5 w-5" />
              </div>
              <div className="font-display font-semibold">Try with sample data</div>
              <div className="text-xs text-muted-foreground mt-1 leading-snug">Fill everything (incl. JD) so you can see the resume in every template instantly.</div>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
          />
          {!user && (
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              <Link to="/auth" className="underline text-primary">Sign in</Link> to upload and parse an existing resume.
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
          {/* FORM */}
          <div className="space-y-6">
            {/* Basics */}
            <section className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
              <h2 className="font-display font-semibold mb-4">Basics</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Full name *</Label><Input value={basics.name} onChange={e => setBasics({ ...basics, name: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Headline / target role</Label><Input value={basics.title} onChange={e => setBasics({ ...basics, title: e.target.value })} placeholder="e.g. Senior Software Engineer" className="mt-1" /></div>
                <div><Label className="text-xs">Email</Label><Input value={basics.email} onChange={e => setBasics({ ...basics, email: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Phone</Label><Input value={basics.phone} onChange={e => setBasics({ ...basics, phone: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Location</Label><Input value={basics.location} onChange={e => setBasics({ ...basics, location: e.target.value })} placeholder="Bangalore, India" className="mt-1" /></div>
              </div>

              {/* Dynamic links */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Links (add what's relevant for your role — LinkedIn, GitHub, Portfolio, Behance, Google Scholar, etc.)</Label>
                  <Button variant="outline" size="sm" onClick={() => setLinks([...links, { label: "", url: "" }])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add link
                  </Button>
                </div>
                <div className="space-y-2">
                  {links.map((l, i) => (
                    <div key={i} className="grid grid-cols-[130px_1fr_auto] gap-2 items-center">
                      <Input
                        placeholder="Label"
                        value={l.label}
                        onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      />
                      <div className="relative">
                        <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="https://…"
                          value={l.url}
                          onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                          className="pl-8"
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setLinks(links.filter((_, j) => j !== i))} disabled={links.length === 1}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-xs">Short about you (optional — AI polishes this)</Label>
                <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="A few sentences about your experience, focus, and what you're looking for." className="mt-1 min-h-[80px]" />
              </div>
            </section>

            {/* Experience */}
            <section className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold">Experience</h2>
                <Button variant="outline" size="sm" onClick={addExp}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
              </div>
              <div className="space-y-4">
                {experience.map((e, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-4">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <Input placeholder="Company" value={e.company} onChange={ev => setExperience(experience.map((x, j) => j === i ? { ...x, company: ev.target.value } : x))} />
                      <Input placeholder="Role" value={e.role} onChange={ev => setExperience(experience.map((x, j) => j === i ? { ...x, role: ev.target.value } : x))} />
                      <Input placeholder="Location" value={e.location} onChange={ev => setExperience(experience.map((x, j) => j === i ? { ...x, location: ev.target.value } : x))} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Start (Jan 2023)" value={e.start} onChange={ev => setExperience(experience.map((x, j) => j === i ? { ...x, start: ev.target.value } : x))} />
                        <Input placeholder="End (Present)" value={e.end} onChange={ev => setExperience(experience.map((x, j) => j === i ? { ...x, end: ev.target.value } : x))} />
                      </div>
                    </div>
                    <Textarea placeholder="What you did — rough notes are fine. AI turns this into strong bullets with metrics where you provide them." value={e.description} onChange={ev => setExperience(experience.map((x, j) => j === i ? { ...x, description: ev.target.value } : x))} className="mt-2 min-h-[80px]" />
                    {experience.length > 1 && (
                      <div className="mt-2 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setExperience(experience.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Education */}
            <section className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold">Education</h2>
                <Button variant="outline" size="sm" onClick={addEdu}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
              </div>
              <div className="space-y-4">
                {education.map((e, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-4">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <Input placeholder="School" value={e.school} onChange={ev => setEducation(education.map((x, j) => j === i ? { ...x, school: ev.target.value } : x))} />
                      <Input placeholder="Degree" value={e.degree} onChange={ev => setEducation(education.map((x, j) => j === i ? { ...x, degree: ev.target.value } : x))} />
                      <Input placeholder="Location" value={e.location} onChange={ev => setEducation(education.map((x, j) => j === i ? { ...x, location: ev.target.value } : x))} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Start" value={e.start} onChange={ev => setEducation(education.map((x, j) => j === i ? { ...x, start: ev.target.value } : x))} />
                        <Input placeholder="End" value={e.end} onChange={ev => setEducation(education.map((x, j) => j === i ? { ...x, end: ev.target.value } : x))} />
                      </div>
                    </div>
                    <Input placeholder="Details (GPA, honors, coursework)" value={e.details} onChange={ev => setEducation(education.map((x, j) => j === i ? { ...x, details: ev.target.value } : x))} className="mt-2" />
                  </div>
                ))}
              </div>
            </section>

            {/* Projects */}
            <section className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold">Projects (optional)</h2>
                <Button variant="outline" size="sm" onClick={addProj}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
              </div>
              <div className="space-y-4">
                {projects.map((p, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-4">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <Input placeholder="Project name" value={p.name} onChange={ev => setProjects(projects.map((x, j) => j === i ? { ...x, name: ev.target.value } : x))} />
                      <Input placeholder="Tech stack" value={p.tech} onChange={ev => setProjects(projects.map((x, j) => j === i ? { ...x, tech: ev.target.value } : x))} />
                    </div>
                    <Textarea placeholder="What it does and your role." value={p.description} onChange={ev => setProjects(projects.map((x, j) => j === i ? { ...x, description: ev.target.value } : x))} className="mt-2 min-h-[60px]" />
                    <div className="mt-2 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setProjects(projects.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Skills + Certs + JD */}
            <section className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card space-y-4">
              <div>
                <Label className="text-xs">Skills (one per line — group by "Frontend: React, Vue" if you like)</Label>
                <Textarea value={skills} onChange={e => setSkills(e.target.value)} className="mt-1 min-h-[80px] font-mono text-xs" placeholder={"React\nTypeScript\nPostgreSQL"} />
              </div>
              <div>
                <Label className="text-xs">Certifications (one per line)</Label>
                <Textarea value={certifications} onChange={e => setCertifications(e.target.value)} className="mt-1 min-h-[60px] font-mono text-xs" placeholder="AWS Solutions Architect Associate" />
              </div>
              <div>
                <Label className="text-xs">Target job description (optional — tailors phrasing & keywords)</Label>
                <Textarea value={targetJd} onChange={e => setTargetJd(e.target.value)} className="mt-1 min-h-[100px]" placeholder="Paste the JD to have the resume tailored to it." />
              </div>
            </section>

            <div className="rounded-2xl border border-border bg-gradient-card p-4 shadow-card">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How should we build it?</Label>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                <button type="button" onClick={() => setMode("ai")}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${mode === "ai" ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-background hover:border-primary/40"}`}>
                  <div className="flex items-center gap-1.5 font-display font-semibold text-sm"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI polish</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Rewrites your notes into strong action bullets. Requires sign-in.</div>
                </button>
                <button type="button" onClick={() => setMode("verbatim")}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${mode === "verbatim" ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-background hover:border-primary/40"}`}>
                  <div className="flex items-center gap-1.5 font-display font-semibold text-sm"><FileEdit className="h-3.5 w-3.5 text-primary" /> Use my exact text</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Keeps every word you pasted. Splits each new line into a bullet.</div>
                </button>
              </div>
            </div>

            <Button onClick={generate} disabled={loading} size="lg"
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Building your resume...</> :
                mode === "ai" ? <><Sparkles className="h-4 w-4 mr-2" /> Generate with AI</> : <><FileEdit className="h-4 w-4 mr-2" /> Build resume from my text</>}
            </Button>
          </div>

          {/* PREVIEW */}
          <div ref={previewRef} className="lg:sticky lg:top-6 lg:self-start space-y-4">
            <div className="rounded-2xl border border-border bg-gradient-card p-4 shadow-card">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template</div>
                {resume && (
                  <div className="flex items-center gap-2">
                    <Button onClick={downloadDocx} size="sm" variant="outline">
                      <Download className="h-3.5 w-3.5 mr-1.5" /> DOCX
                    </Button>
                    <Button onClick={downloadPdf} size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                      <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map(t => {
                  const selected = template === t.id;
                  return (
                    <button key={t.id} type="button" onClick={() => setTemplate(t.id)}
                      className={`group text-left rounded-xl border-2 overflow-hidden transition-all ${selected ? "border-primary shadow-glow ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}>
                      {/* Thumbnail: render actual template scaled down */}
                      <div className="relative aspect-[3/4] bg-white overflow-hidden border-b border-border">
                        <div
                          className="absolute top-0 left-0 origin-top-left pointer-events-none select-none"
                          style={{ width: "800px", transform: "scale(0.18)" }}
                        >
                          <ResumePreview template={t.id} data={resume ?? SAMPLE_RESUME} />
                        </div>
                        {selected && (
                          <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            SELECTED
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-background">
                        <div className="font-display font-semibold text-xs">{t.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {resume ? (
              <>
                <div className="text-[11px] text-muted-foreground px-1">
                  <FileEdit className="inline h-3 w-3 mr-1 -mt-0.5" />
                  Tip: click any text in the preview below to edit it directly. Changes flow into the PDF & DOCX exports.
                </div>
                <ResumePreview template={template} data={resume} onChange={setResume} />
              </>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-border bg-background/50 p-12 text-center">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <div className="font-display font-semibold">Your resume preview appears here</div>
                <div className="text-xs text-muted-foreground mt-1">Fill the form and click Generate to see it live.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showEditHint} onOpenChange={setShowEditHint}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Sparkles className="h-5 w-5 text-primary" />
              Your resume is ready!
            </DialogTitle>
            <DialogDescription className="pt-1">
              Small tweaks? No need to regenerate — just <span className="font-semibold text-foreground">click any text in the live preview</span> and type. Every edit flows straight into your PDF & DOCX.
            </DialogDescription>
          </DialogHeader>

          {/* Mini animation: cursor taps into an editable line */}
          <div className="relative rounded-xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 to-primary/0 p-5 overflow-hidden">
            <div className="space-y-2">
              <div className="h-2.5 w-2/3 rounded bg-muted" />
              <div className="relative rounded-md bg-background border border-primary/50 px-2 py-1.5 shadow-sm animate-pulse">
                <span className="text-xs font-medium text-foreground">Senior Software Engineer</span>
                <span className="ml-0.5 inline-block h-3 w-[2px] bg-primary align-middle animate-pulse" />
              </div>
              <div className="h-2 w-4/5 rounded bg-muted" />
              <div className="h-2 w-3/5 rounded bg-muted" />
            </div>
            <MousePointer2
              className="absolute h-6 w-6 text-primary drop-shadow-md"
              style={{
                top: "38%",
                left: "58%",
                animation: "cursorTap 2.4s ease-in-out infinite",
              }}
            />
            <style>{`
              @keyframes cursorTap {
                0%   { transform: translate(20px, -18px) scale(1); opacity: 0; }
                20%  { transform: translate(10px, -8px)  scale(1); opacity: 1; }
                55%  { transform: translate(0, 0)        scale(0.85); opacity: 1; }
                70%  { transform: translate(0, 0)        scale(1); opacity: 1; }
                100% { transform: translate(-20px, 18px) scale(1); opacity: 0; }
              }
            `}</style>
          </div>

          <p className="text-[11px] text-muted-foreground text-center -mt-1">
            Regenerating uses credits — inline edits are free and instant.
          </p>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowEditHint(false)}>
              Got it
            </Button>
            <Button
              onClick={() => {
                setShowEditHint(false);
                setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
              }}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              <ArrowDown className="h-4 w-4 mr-1.5" /> Take me to the preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
