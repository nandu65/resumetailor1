import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Plus, Trash2, Download, FileText, Wand2, FileEdit, Upload, FilePlus2, MousePointer2, ArrowDown, Link2, Wand, CheckCircle2, ArrowLeft, Type, TypeIcon, SpellCheck } from "lucide-react";
import { extractTextFromFile } from "@/lib/extractText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
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

export default function ResumeBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const requireAuth = (intent: string) => {
    toast.info(`Sign in to ${intent}`);
    navigate("/auth", { state: { from: "/tools/resume-builder" } });
  };
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
  const [starter, setStarter] = useState<"choose" | "scratch" | "uploaded" | "wizard">("choose");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [showEditHint, setShowEditHint] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [prefs, setPrefs] = useState<ResumePrefs>(DEFAULT_PREFS);
  const [prefsSet, setPrefsSet] = useState(false);
  const [globalFontSize, setGlobalFontSize] = useState(11);
  const [globalFontFamily, setGlobalFontFamily] = useState("Inter");
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);

  const fontFamilies = [
    { label: "Modern Sans", value: "Inter, sans-serif" },
    { label: "Classic Serif", value: "'Libre Baskerville', serif" },
    { label: "Clean Mono", value: "'JetBrains Mono', monospace" },
    { label: "Professional", value: "system-ui, sans-serif" },
  ];

  const onUpload = async (file: File) => {
    if (!user) return requireAuth("upload and parse your resume");
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

  useEffect(() => {
    if (!resume) return;
    setBasics(b => ({
      ...b,
      name: resume.name || b.name,
      title: resume.title || b.title,
      email: resume.email || b.email,
      phone: resume.phone || b.phone,
      location: resume.location || b.location,
    }));
    if (resume.links && resume.links.length) {
      setLinks(resume.links.map(l => ({ label: l.label || "Link", url: l.url || "" })));
    }
    setSummary(resume.summary || "");
    setExperience((resume.experience || []).map(e => ({
      company: e.company || "", role: e.role || "", location: e.location || "",
      start: e.start || "", end: e.end || "",
      description: Array.isArray(e.bullets) ? e.bullets.join("\n") : (e as any).description || "",
    })));
    setEducation((resume.education || []).map((e: any) => ({
      school: e.school || "", degree: e.degree || "", location: e.location || "",
      start: e.start || "", end: e.end || "", details: e.details || "",
    })));
    setProjects((resume.projects || []).map(p => ({
      name: p.name || "", tech: p.tech || "",
      description: Array.isArray(p.bullets) ? p.bullets.join("\n") : (p as any).description || "",
    })));
    setSkills((resume.skills || []).map(s => {
      if (typeof s === "string") return s;
      return s.category ? `${s.category}: ${s.items.join(", ")}` : s.items.join(", ");
    }).join("\n"));
    setCertifications((resume.certifications || []).join("\n"));
  }, [resume]);

  const syncSettingsToResume = () => {
    if (!resume) return;
    setResume(prev => {
      if (!prev) return null;
      return {
        ...prev,
        settings: { fontSize: globalFontSize, fontFamily: globalFontFamily }
      };
    });
  };

  useEffect(() => { syncSettingsToResume(); }, [globalFontSize, globalFontFamily]);

  const addExp = () => setExperience([...experience, { company: "", role: "", location: "", start: "", end: "", description: "" }]);
  const addEdu = () => setEducation([...education, { school: "", degree: "", location: "", start: "", end: "", details: "" }]);
  const addProj = () => setProjects([...projects, { name: "", tech: "", description: "" }]);

  const generate = async () => {
    if (!basics.name.trim()) return toast.error("Add your name at minimum");
    if (mode === "verbatim") {
      setResume(buildResumeDataVerbatim({ 
        ...basics, summary, experience, education, projects, skills, certifications,
        settings: { fontSize: globalFontSize, fontFamily: globalFontFamily }
      }));
      setShowEditHint(true);
      return;
    }
    if (!user) return requireAuth("use AI polish");
    setLoading(true);
    try {
      const profile = {
        ...basics,
        links: links.filter(l => l.url.trim()).map(l => ({ label: l.label.trim() || "Link", url: l.url.trim() })),
        summary, experience, education, projects,
        skills: skills.split("\n").map(s => s.trim()).filter(Boolean),
        certifications: certifications.split("\n").map(s => s.trim()).filter(Boolean),
      };
      const { data, error } = await supabase.functions.invoke("generate-resume", { body: { profile, targetJd } });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Failed");
        return;
      }
      setResume({ ...EMPTY_RESUME, ...(data as any).resume, settings: { fontSize: globalFontSize, fontFamily: globalFontFamily } });
      setShowEditHint(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isResumeSync = () => {
    if (!resume) return false;
    const currentData = buildResumeDataVerbatim({ 
      ...basics, summary, experience, education, projects, skills, certifications,
      settings: { fontSize: globalFontSize, fontFamily: globalFontFamily }
    });
    const compare = (d: any) => { const { settings, ...rest } = d; return JSON.stringify(rest); };
    return compare(currentData) === compare(resume);
  };

  const downloadPdf = () => {
    if (!resume) return;
    if (!isResumeSync()) {
      toast.error("Form data has changed. Please click 'Generate' again to update the preview before downloading.", {
        action: { label: "Sync Now", onClick: () => generate() }
      });
      return;
    }
    downloadResumePdfFromData(resume, template);
  };
  
  const downloadDocx = () => {
    if (!resume) return;
    if (!isResumeSync()) {
      toast.error("Form data has changed. Please click 'Generate' again to update the preview before downloading.");
      return;
    }
    downloadResumeDocxFromData(resume, template);
  };

  return (
    <div className="min-h-screen bg-background">
      {showIntro && <BuilderIntroLoader onDone={() => { setShowIntro(false); setStarter("choose"); }} />}
      <TemplatePreferencesWizard
        open={starter === "wizard"}
        onOpenChange={(v) => !v && setStarter("choose")}
        initial={prefs}
        onDone={(p) => {
          setPrefs(p); setPrefsSet(true); setStarter("scratch");
          const ranked = [...TEMPLATES].sort((a, b) => scoreTemplate(b.id, p) - scoreTemplate(a.id, p));
          if (ranked[0]) setTemplate(ranked[0].id);
        }}
      />
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

        {starter === "choose" && (
          <div className="mb-6 rounded-2xl border-2 border-border bg-gradient-card p-6 shadow-card animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold">How would you like to start?</h2>
              <p className="text-muted-foreground mt-2 max-w-lg mx-auto">Choose to build a fresh resume from scratch or import your existing one.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <button onClick={() => setStarter("wizard")} className="group relative text-left rounded-2xl border-2 border-border bg-background p-6 transition-all duration-300 hover:border-primary/60 hover:-translate-y-1 hover:shadow-glow">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"><FilePlus2 className="h-6 w-6" /></div>
                <h3 className="font-display text-lg font-bold">Build from scratch</h3>
                <p className="text-sm text-muted-foreground mt-2">Follow our 4-step wizard to find the perfect template.</p>
              </button>
              <button onClick={() => fileRef.current?.click()} className="group relative text-left rounded-2xl border-2 border-border bg-background p-6 transition-all duration-300 hover:border-primary/60 hover:-translate-y-1 hover:shadow-glow">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"><Upload className="h-6 w-6" /></div>
                <h3 className="font-display text-lg font-bold">Upload my resume</h3>
                <p className="text-sm text-muted-foreground mt-2">Import your existing PDF/DOCX and let AI fill everything.</p>
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
          </div>
        )}

        {(starter === "scratch" || starter === "uploaded") && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-card border-2 border-border rounded-xl p-4 mb-6 shadow-sm gap-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setStarter("choose")} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <span className="text-sm font-medium text-muted-foreground">{starter === "uploaded" ? "Imported" : "Scratch"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-lg border border-border">
                  <SpellCheck className={`h-4 w-4 ${spellCheckEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium mr-1">Spell Check</span>
                  <input type="checkbox" checked={spellCheckEnabled} onChange={e => setSpellCheckEnabled(e.target.checked)} className="h-4 w-4 accent-primary" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-lg border border-border">
                  <Type className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-medium">Size</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setGlobalFontSize(Math.max(8, globalFontSize - 1))}>-</Button>
                    <span className="text-xs font-bold">{globalFontSize}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setGlobalFontSize(Math.min(16, globalFontSize + 1))}>+</Button>
                  </div>
                </div>
                <select className="bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none" value={globalFontFamily} onChange={e => setGlobalFontFamily(e.target.value)}>
                  {fontFamilies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-10">
              <div className="lg:sticky lg:top-[64px] z-30 space-y-6 h-fit" ref={previewRef}>
                <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-card">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl font-bold">Resume Preview</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={downloadPdf} disabled={!resume}><Download className="h-4 w-4 mr-1" /> PDF</Button>
                      <Button variant="outline" size="sm" onClick={downloadDocx} disabled={!resume}><Download className="h-4 w-4 mr-1" /> DOCX</Button>
                    </div>
                  </div>
                  <div className="mb-6 overflow-x-auto pb-2">
                    <div className="flex gap-3 mb-6 p-1">
                      {TEMPLATES.map(t => (
                        <button key={t.id} onClick={() => setTemplate(t.id)} className={`group relative aspect-[3/4] min-w-[80px] rounded-lg border-2 transition-all ${template === t.id ? "border-primary shadow-glow" : "border-border hover:border-primary/40"}`}>
                          <div className="w-full h-full bg-muted flex items-center justify-center"><FileText className="h-8 w-8 opacity-20" /></div>
                          <div className={`absolute inset-x-0 bottom-0 py-1 px-2 text-[10px] font-bold truncate ${template === t.id ? "bg-primary text-primary-foreground" : "bg-background/90"}`}>{t.name}</div>
                        </button>
                      ))}
                    </div>
                    <PreferenceFilterBar prefs={prefs} onChange={setPrefs} onOpenWizard={() => setStarter("wizard")} />
                  </div>
                  {resume ? (
                    <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-muted/20 p-4 sm:p-8">
                      <ResumePreview template={template} data={resume} onChange={setResume} />
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">Preview appears here after generation.</div>
                  )}
                </div>
              </div>

              <div id="builder-form" className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center gap-2 mb-6 border-b pb-4"><CheckCircle2 className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-bold">1. Basics</h2></div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input value={basics.name} onChange={e => setBasics({ ...basics, name: e.target.value })} placeholder="Full Name" />
                      <Input value={basics.title} onChange={e => setBasics({ ...basics, title: e.target.value })} placeholder="Title" />
                      <Input value={basics.email} onChange={e => setBasics({ ...basics, email: e.target.value })} placeholder="Email" />
                      <Input value={basics.phone} onChange={e => setBasics({ ...basics, phone: e.target.value })} placeholder="Phone" />
                    </div>
                  </div>
                  <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center gap-2 mb-6 border-b pb-4"><Sparkles className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-bold">2. Summary</h2></div>
                    <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Summary..." className="min-h-[120px]" spellCheck={spellCheckEnabled} />
                  </div>
                  <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center justify-between mb-6 border-b pb-4"><h2 className="font-display text-xl font-bold">3. Experience</h2><Button variant="outline" size="sm" onClick={addExp}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
                    <div className="space-y-6">
                      {experience.map((exp, i) => (
                        <div key={i} className="p-4 rounded-xl border relative group">
                          <Input value={exp.company} onChange={e => { const n = [...experience]; n[i].company = e.target.value; setExperience(n); }} placeholder="Company" className="mb-2" />
                          <Input value={exp.role} onChange={e => { const n = [...experience]; n[i].role = e.target.value; setExperience(n); }} placeholder="Role" className="mb-2" />
                          <Textarea value={exp.description} onChange={e => { const n = [...experience]; n[i].description = e.target.value; setExperience(n); }} placeholder="Bullets..." spellCheck={spellCheckEnabled} />
                          <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 text-destructive" onClick={() => setExperience(experience.filter((_, j) => i !== j))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center gap-2 mb-6 border-b pb-4"><Link2 className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-bold">4. Generate</h2></div>
                    <div className="space-y-4">
                      <Textarea value={skills} onChange={e => setSkills(e.target.value)} placeholder="Skills (one per line)" />
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <Label className="text-primary mb-2 block">Target Job (AI Polish)</Label>
                        <Textarea value={targetJd} onChange={e => setTargetJd(e.target.value)} placeholder="Job Description..." className="bg-background" />
                      </div>
                      <Button onClick={generate} disabled={loading} className="w-full h-12 text-lg font-bold bg-gradient-primary shadow-glow">
                        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Dialog open={showEditHint} onOpenChange={setShowEditHint}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Your resume is ready!</DialogTitle><DialogDescription>Click any text in the preview to edit.</DialogDescription></DialogHeader>
          <DialogFooter><Button onClick={() => setShowEditHint(false)}>Got it</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
