import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Plus, Trash2, Download, FileText, Wand2, FileEdit, Upload, FilePlus2, MousePointer2, ArrowDown, Link2, Wand, CheckCircle2, ArrowLeft, Type, TypeIcon, SpellCheck, Undo2, Redo2, Settings2, Palette, ChevronRight, Share2, Printer, Eye, Target } from "lucide-react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { SectionStyleControls, SectionStyles } from "@/components/SectionStyleControls";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

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
  const [sectionStyles, setSectionStyles] = useState<SectionStyles>({});
  const restoring = useRef(false);


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
    if (!resume || restoring.current) return;
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
        settings: { fontSize: globalFontSize, fontFamily: globalFontFamily, sections: sectionStyles }
      };
    });
  };

  useEffect(() => { syncSettingsToResume(); }, [globalFontSize, globalFontFamily, sectionStyles]);

  /* ---- Undo / Redo over the whole editing state ---- */
  const snapshot = useMemo(() => ({
    basics, links, summary, experience, education, projects, skills, certifications,
    template, resume, globalFontSize, globalFontFamily, sectionStyles,
  }), [basics, links, summary, experience, education, projects, skills, certifications,
       template, resume, globalFontSize, globalFontFamily, sectionStyles]);

  const applySnapshot = useCallback((s: typeof snapshot) => {
    restoring.current = true;
    setBasics(s.basics); setLinks(s.links); setSummary(s.summary);
    setExperience(s.experience); setEducation(s.education); setProjects(s.projects);
    setSkills(s.skills); setCertifications(s.certifications);
    setTemplate(s.template); setResume(s.resume);
    setGlobalFontSize(s.globalFontSize); setGlobalFontFamily(s.globalFontFamily);
    setSectionStyles(s.sectionStyles);
    setTimeout(() => { restoring.current = false; }, 0);
  }, []);

  const { undo, redo, canUndo, canRedo } = useUndoRedo(snapshot, applySnapshot, { delay: 450 });


  const addExp = () => setExperience([...experience, { company: "", role: "", location: "", start: "", end: "", description: "" }]);
  const addEdu = () => setEducation([...education, { school: "", degree: "", location: "", start: "", end: "", details: "" }]);
  const addProj = () => setProjects([...projects, { name: "", tech: "", description: "" }]);

  const generate = async () => {
    if (!basics.name.trim()) return toast.error("Add your name at minimum");
    if (mode === "verbatim") {
      setResume(buildResumeDataVerbatim({ 
        ...basics, summary, experience, education, projects, skills, certifications,
        settings: { fontSize: globalFontSize, fontFamily: globalFontFamily, sections: sectionStyles }
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
      setResume({ ...EMPTY_RESUME, ...(data as any).resume, settings: { fontSize: globalFontSize, fontFamily: globalFontFamily, sections: sectionStyles } });
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
      settings: { fontSize: globalFontSize, fontFamily: globalFontFamily, sections: sectionStyles }
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
        onOpenChange={(v) => {
          if (!v) setStarter("choose");
        }}
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
              <button type="button" onClick={() => setStarter("wizard")} className="group relative text-left rounded-2xl border-2 border-border bg-background p-6 transition-all duration-300 hover:border-primary/60 hover:-translate-y-1 hover:shadow-glow">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"><FilePlus2 className="h-6 w-6" /></div>
                <h3 className="font-display text-lg font-bold">Build from scratch</h3>
                <p className="text-sm text-muted-foreground mt-2 text-pretty">Step-by-step guidance for a perfect professional resume.</p>
              </button>
              <button onClick={() => fileRef.current?.click()} className="group relative text-left rounded-2xl border-2 border-border bg-background p-6 transition-all duration-300 hover:border-primary/60 hover:-translate-y-1 hover:shadow-glow">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"><Upload className="h-6 w-6" /></div>
                <h3 className="font-display text-lg font-bold">Upload my resume</h3>
                <p className="text-sm text-muted-foreground mt-2">Import your existing PDF/DOCX and let AI fill everything.</p>
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            {uploading && (
              <div className="mt-8 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                </div>
                <p className="mt-4 text-sm font-medium text-primary">Analyzing your resume...</p>
                <p className="text-xs text-muted-foreground mt-1 italic">Extracting details with AI magic</p>
              </div>
            )}
          </div>
        )}

        {(starter === "scratch" || starter === "uploaded") && (
          <div className="space-y-6">
            <div className="sticky top-[80px] z-30 bg-background/95 backdrop-blur-md border-b flex items-center justify-between p-4 -mx-4 sm:mx-0 sm:rounded-xl shadow-lg gap-4 ring-1 ring-border">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStarter("choose")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Button>
                <div className="hidden sm:block">
                  <h2 className="text-sm font-bold leading-none">ResumeShot AI</h2>
                  <p className="text-[10px] text-muted-foreground">Editor</p>
                </div>
                <Separator orientation="vertical" className="h-6 mx-2 hidden sm:block" />
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo} className="h-8 w-8"><Undo2 className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo} className="h-8 w-8"><Redo2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 rounded-full gap-2 border-primary/20 hover:bg-primary/5">
                      <Palette className="h-4 w-4 text-primary" />
                      <span className="hidden sm:inline">Design & Layout</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                    <SheetHeader><SheetTitle>Design & Layout</SheetTitle></SheetHeader>
                    <div className="py-6 space-y-8 overflow-y-auto max-h-[calc(100vh-100px)] px-1">
                      <div>
                        <Label className="text-base font-bold mb-4 block">Templates</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {TEMPLATES.map(t => (
                            <button key={t.id} onClick={() => setTemplate(t.id)} className={`group relative aspect-[3/4] rounded-xl border-2 transition-all p-1 ${template === t.id ? "border-primary shadow-glow" : "border-border hover:border-primary/40"}`}>
                              <div className="w-full h-full bg-muted rounded-lg flex flex-col items-center justify-center p-2 text-center">
                                <FileText className={`h-12 w-12 mb-2 ${template === t.id ? "text-primary" : "opacity-20"}`} />
                                <span className="text-[10px] font-bold block">{t.name}</span>
                              </div>
                              {template === t.id && <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5"><CheckCircle2 className="h-3 w-3" /></div>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <PreferenceFilterBar prefs={prefs} onChange={setPrefs} onOpenWizard={() => setStarter("wizard")} />
                      <Separator />
                      <div className="space-y-4">
                        <Label className="text-base font-bold block">Global Typography</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Font Family</Label>
                            <select className="w-full bg-background border border-border rounded-lg px-2 py-2 text-sm outline-none" value={globalFontFamily} onChange={e => setGlobalFontFamily(e.target.value)}>
                              {fontFamilies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Base Size ({globalFontSize}px)</Label>
                            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setGlobalFontSize(Math.max(8, globalFontSize - 1))}>-</Button>
                              <span className="flex-1 text-center font-bold">{globalFontSize}</span>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setGlobalFontSize(Math.min(16, globalFontSize + 1))}>+</Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
                           <div className="flex items-center gap-2">
                              <SpellCheck className={`h-4 w-4 ${spellCheckEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                              <Label className="text-sm">Spell Check</Label>
                           </div>
                           <input type="checkbox" checked={spellCheckEnabled} onChange={e => setSpellCheckEnabled(e.target.checked)} className="h-4 w-4 accent-primary" />
                        </div>
                      </div>
                      <Separator />
                      <SectionStyleControls value={sectionStyles} onChange={setSectionStyles} baseSize={globalFontSize} />
                    </div>
                  </SheetContent>
                </Sheet>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button className="h-9 rounded-full bg-gradient-primary shadow-glow gap-2">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="end">
                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={downloadPdf} disabled={!resume}><FileText className="h-4 w-4" /> PDF Document</Button>
                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={downloadDocx} disabled={!resume}><FileEdit className="h-4 w-4" /> Word (DOCX)</Button>
                  </PopoverContent>
                </Popover>

                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full"><Eye className="h-4 w-4" /></Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[90vh] p-0">
                            <div className="p-4 border-b flex items-center justify-between">
                                <h3 className="font-bold">Preview</h3>
                                <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /></Button>
                            </div>
                            <ScrollArea className="h-full p-6">
                                {resume ? (
                                    <ResumePreview template={template} data={resume} onChange={setResume} />
                                ) : (
                                    <div className="text-center py-20 text-muted-foreground italic">Preview pending...</div>
                                )}
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_55%] gap-8 items-start">
              {/* LEFT COLUMN: EDITOR */}
              <div className="space-y-6">
                {/* NAVIGATION */}
                <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide sticky top-[158px] z-20 bg-background/90 backdrop-blur-md py-3 px-1 -mx-1">
                  {[
                    { id: "basics", label: "Basics", icon: CheckCircle2 },
                    { id: "summary", label: "Summary", icon: Sparkles },
                    { id: "experience", label: "Experience", icon: FileText },
                    { id: "education", label: "Education", icon: ArrowDown },
                    { id: "skills", label: "Skills", icon: Wand },
                    { id: "projects", label: "Projects", icon: Link2 },
                    { id: "certs", label: "Certs", icon: CheckCircle2 },
                  ].map((s) => (
                    <button 
                      key={s.id} 
                      onClick={() => {
                        const el = document.getElementById(`section-${s.id}`);
                        if (el) {
                          const yOffset = -220; 
                          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-muted/50 border border-transparent rounded-xl text-[11px] font-bold hover:bg-primary hover:text-primary-foreground hover:border-primary/20 transition-all shrink-0 shadow-sm"
                    >
                      <s.icon className="h-3 w-3" />
                      {s.label}
                    </button>
                  ))}
                </nav>


                {/* BASICS */}
                <div id="section-basics" className="bg-card border-2 border-border rounded-2xl p-6 shadow-card transition-all hover:border-primary/20">
                  <div className="flex items-center gap-2 mb-6 border-b pb-4">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <h3 className="font-display text-lg font-bold">1. Personal Information</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Full Name</Label>
                      <Input value={basics.name} onChange={e => setBasics({ ...basics, name: e.target.value })} placeholder="John Doe" className="rounded-xl border-border/60" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Job Title</Label>
                      <Input value={basics.title} onChange={e => setBasics({ ...basics, title: e.target.value })} placeholder="Software Engineer" className="rounded-xl border-border/60" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Email</Label>
                      <Input value={basics.email} onChange={e => setBasics({ ...basics, email: e.target.value })} placeholder="john@example.com" className="rounded-xl border-border/60" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Phone</Label>
                      <Input value={basics.phone} onChange={e => setBasics({ ...basics, phone: e.target.value })} placeholder="+1 (555) 000-0000" className="rounded-xl border-border/60" />
                    </div>
                  </div>
                </div>

                {/* SUMMARY */}
                <div id="section-summary" className="bg-card border-2 border-border rounded-2xl p-6 shadow-card transition-all hover:border-primary/20">
                   <div className="flex items-center justify-between mb-6 border-b pb-4">
                     <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h3 className="font-display text-lg font-bold">2. Professional Summary</h3>
                     </div>
                     <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5 text-primary" title="Typography">
                                <Settings2 className="h-4 w-4" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <SectionStyleControls value={sectionStyles} onChange={setSectionStyles} baseSize={globalFontSize} sectionKey="summary" hideHeader />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="sm" className="h-8 rounded-full text-[10px] font-bold gap-1 border-primary/20 hover:bg-primary/5 text-primary">
                            <Wand2 className="h-3 w-3" />
                            AI POLISH
                        </Button>
                     </div>
                   </div>
                   <Textarea 
                     value={summary} 
                     onChange={e => setSummary(e.target.value)} 
                     placeholder="A brief overview of your professional background..." 
                     className="min-h-[120px] rounded-xl border-border/60 resize-none" 
                     spellCheck={spellCheckEnabled} 
                   />
                </div>

                {/* EXPERIENCE */}
                <div id="section-experience" className="bg-card border-2 border-border rounded-2xl p-6 shadow-card transition-all hover:border-primary/20">
                  <div className="flex items-center justify-between mb-6 border-b pb-4">
                     <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="font-display text-lg font-bold">3. Work Experience</h3>
                     </div>
                     <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5 text-primary" title="Typography">
                                <Settings2 className="h-4 w-4" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <SectionStyleControls value={sectionStyles} onChange={setSectionStyles} baseSize={globalFontSize} sectionKey="experience" hideHeader />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="sm" onClick={addExp} className="h-8 rounded-full gap-1 border-primary/20 hover:bg-primary/5 text-primary">
                            <Plus className="h-3 w-3" />
                            <span className="text-[10px] font-bold">ADD ROLE</span>
                        </Button>
                     </div>
                   </div>
                   <div className="space-y-6">
                      {experience.map((exp, i) => (
                        <div key={i} className="group p-5 rounded-2xl border bg-muted/20 relative animate-in fade-in slide-in-from-left-2 duration-300">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background border shadow-sm text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                             onClick={() => setExperience(experience.filter((_, j) => i !== j))}
                           >
                             <Trash2 className="h-3 w-3" />
                           </Button>
                           <div className="grid sm:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Company</Label>
                                <Input value={exp.company} onChange={e => { const n = [...experience]; n[i].company = e.target.value; setExperience(n); }} placeholder="Company" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Role</Label>
                                <Input value={exp.role} onChange={e => { const n = [...experience]; n[i].role = e.target.value; setExperience(n); }} placeholder="Role" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                           </div>
                           <div className="grid sm:grid-cols-3 gap-4 mb-4">
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Location</Label>
                                <Input value={exp.location} onChange={e => { const n = [...experience]; n[i].location = e.target.value; setExperience(n); }} placeholder="Remote / City" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Start Date</Label>
                                <Input value={exp.start} onChange={e => { const n = [...experience]; n[i].start = e.target.value; setExperience(n); }} placeholder="Jan 2022" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">End Date</Label>
                                <Input value={exp.end} onChange={e => { const n = [...experience]; n[i].end = e.target.value; setExperience(n); }} placeholder="Present" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                           </div>
                           <div className="relative space-y-1">
                               <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Description</Label>
                               <Textarea 
                                 value={exp.description} 
                                 onChange={e => { const n = [...experience]; n[i].description = e.target.value; setExperience(n); }} 
                                 placeholder="Bullet points describing your achievements..." 
                                 className="min-h-[100px] rounded-lg border-border/60 bg-background resize-none pb-10" 
                                 spellCheck={spellCheckEnabled} 
                               />
                               <div className="absolute bottom-2 right-2 flex gap-1">
                                  <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold text-primary hover:bg-primary/10">
                                     <Sparkles className="h-3 w-3 mr-1" />
                                     IMPROVE
                                  </Button>
                               </div>
                           </div>

                        </div>
                      ))}
                      {experience.length === 0 && (
                        <div className="text-center py-10 border-2 border-dashed rounded-2xl text-muted-foreground italic">No experience added.</div>
                      )}
                   </div>
                </div>

                {/* EDUCATION */}
                <div id="section-education" className="bg-card border-2 border-border rounded-2xl p-6 shadow-card transition-all hover:border-primary/20">
                  <div className="flex items-center justify-between mb-6 border-b pb-4">
                     <div className="flex items-center gap-2">
                        <ArrowDown className="h-5 w-5 text-primary" />
                        <h3 className="font-display text-lg font-bold">4. Education</h3>
                     </div>
                     <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5 text-primary" title="Typography">
                                <Settings2 className="h-4 w-4" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <SectionStyleControls value={sectionStyles} onChange={setSectionStyles} baseSize={globalFontSize} sectionKey="education" hideHeader />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="sm" onClick={addEdu} className="h-8 rounded-full gap-1 border-primary/20 hover:bg-primary/5 text-primary">
                            <Plus className="h-3 w-3" />
                            <span className="text-[10px] font-bold">ADD SCHOOL</span>
                        </Button>
                     </div>
                   </div>
                   <div className="space-y-6">
                      {education.map((edu, i) => (
                        <div key={i} className="group p-5 rounded-2xl border bg-muted/20 relative animate-in fade-in slide-in-from-left-2 duration-300">
                           <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background border shadow-sm text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEducation(education.filter((_, j) => i !== j))}>
                             <Trash2 className="h-3 w-3" />
                           </Button>
                           <div className="grid sm:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">School</Label>
                                <Input value={edu.school} onChange={e => { const n = [...education]; n[i].school = e.target.value; setEducation(n); }} placeholder="University Name" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Degree</Label>
                                <Input value={edu.degree} onChange={e => { const n = [...education]; n[i].degree = e.target.value; setEducation(n); }} placeholder="B.S. in Computer Science" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                           </div>
                           <div className="grid sm:grid-cols-3 gap-4 mb-4">
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Location</Label>
                                <Input value={edu.location} onChange={e => { const n = [...education]; n[i].location = e.target.value; setEducation(n); }} placeholder="City, State" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Start Date</Label>
                                <Input value={edu.start} onChange={e => { const n = [...education]; n[i].start = e.target.value; setEducation(n); }} placeholder="2018" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">End Date</Label>
                                <Input value={edu.end} onChange={e => { const n = [...education]; n[i].end = e.target.value; setEducation(n); }} placeholder="2022" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                           </div>
                           <div className="space-y-1">
                               <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Details / Honors</Label>
                               <Input value={edu.details} onChange={e => { const n = [...education]; n[i].details = e.target.value; setEducation(n); }} placeholder="GPA: 3.9, Dean's List..." className="h-9 rounded-lg border-border/60 bg-background" />
                           </div>
                        </div>
                      ))}
                      {education.length === 0 && (
                        <div className="text-center py-10 border-2 border-dashed rounded-2xl text-muted-foreground italic">No education added.</div>
                      )}
                   </div>
                </div>

                {/* PROJECTS */}
                <div id="section-projects" className="bg-card border-2 border-border rounded-2xl p-6 shadow-card transition-all hover:border-primary/20">
                  <div className="flex items-center justify-between mb-6 border-b pb-4">
                     <div className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-primary" />
                        <h3 className="font-display text-lg font-bold">5. Projects</h3>
                     </div>
                     <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5 text-primary" title="Typography">
                                <Settings2 className="h-4 w-4" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <SectionStyleControls value={sectionStyles} onChange={setSectionStyles} baseSize={globalFontSize} sectionKey="projects" hideHeader />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="sm" onClick={addProj} className="h-8 rounded-full gap-1 border-primary/20 hover:bg-primary/5 text-primary">
                            <Plus className="h-3 w-3" />
                            <span className="text-[10px] font-bold">ADD PROJECT</span>
                        </Button>
                     </div>
                   </div>
                   <div className="space-y-6">
                      {projects.map((proj, i) => (
                        <div key={i} className="group p-5 rounded-2xl border bg-muted/20 relative animate-in fade-in slide-in-from-left-2 duration-300">
                           <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background border shadow-sm text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setProjects(projects.filter((_, j) => i !== j))}>
                             <Trash2 className="h-3 w-3" />
                           </Button>
                           <div className="grid sm:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Project Name</Label>
                                <Input value={proj.name} onChange={e => { const n = [...projects]; n[i].name = e.target.value; setProjects(n); }} placeholder="Project Alpha" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Technologies</Label>
                                <Input value={proj.tech} onChange={e => { const n = [...projects]; n[i].tech = e.target.value; setProjects(n); }} placeholder="React, Node.js, AWS" className="h-9 rounded-lg border-border/60 bg-background" />
                              </div>
                           </div>
                           <div className="space-y-1">
                               <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Project Description</Label>
                               <Textarea value={proj.description} onChange={e => { const n = [...projects]; n[i].description = e.target.value; setProjects(n); }} placeholder="Describe the impact and technical challenges..." className="min-h-[80px] rounded-lg border-border/60 bg-background resize-none" />
                           </div>
                        </div>
                      ))}
                      {projects.length === 0 && (
                        <div className="text-center py-10 border-2 border-dashed rounded-2xl text-muted-foreground italic">No projects added.</div>
                      )}
                   </div>
                </div>

                {/* SKILLS & GENERATE */}
                <div id="section-skills" className="bg-card border-2 border-border rounded-2xl p-6 shadow-card transition-all hover:border-primary/20">
                  <div className="flex items-center justify-between mb-6 border-b pb-4">
                     <div className="flex items-center gap-2">
                        <Wand className="h-5 w-5 text-primary" />
                        <h3 className="font-display text-lg font-bold">6. Skills & Optimization</h3>
                     </div>
                     <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5 text-primary" title="Typography">
                                    <Settings2 className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <SectionStyleControls value={sectionStyles} onChange={setSectionStyles} baseSize={globalFontSize} sectionKey="skills" hideHeader />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="sm" className="h-8 rounded-full text-[10px] font-bold gap-1 border-primary/20 hover:bg-primary/5 text-primary">
                            <Sparkles className="h-3 w-3" />
                            ATS OPTIMIZE
                        </Button>
                     </div>
                   </div>
                   <div className="space-y-6">

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground ml-1">Core Skills</Label>
                        <Textarea 
                          value={skills} 
                          onChange={e => setSkills(e.target.value)} 
                          placeholder="JavaScript, React, Project Management, Agile..." 
                          className="min-h-[80px] rounded-xl border-border/60" 
                        />
                        <p className="text-[10px] text-muted-foreground ml-1">Tip: Separate skills with commas or new lines.</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-muted-foreground ml-1">Certifications</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" title="Typography">
                                        <Settings2 className="h-3 w-3" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80" align="end">
                                    <SectionStyleControls value={sectionStyles} onChange={setSectionStyles} baseSize={globalFontSize} sectionKey="certifications" hideHeader />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Textarea 
                          value={certifications} 
                          onChange={e => setCertifications(e.target.value)} 
                          placeholder="AWS Certified Developer, PMP..." 
                          className="min-h-[60px] rounded-xl border-border/60" 
                        />
                      </div>
                      
                      <Separator />


                      
                      <div className="p-5 rounded-2xl bg-primary/[0.03] border border-primary/10 space-y-4">
                        <div className="flex items-center gap-2">
                           <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center"><Target className="h-3 w-3 text-primary" /></div>
                           <Label className="font-bold text-primary text-sm">Target Job Description</Label>
                        </div>
                        <Textarea 
                          value={targetJd} 
                          onChange={e => setTargetJd(e.target.value)} 
                          placeholder="Paste the job description you're applying for to optimize your resume bullets and skills..." 
                          className="min-h-[120px] bg-background rounded-xl border-primary/10 focus:border-primary/30" 
                        />
                      </div>
                      
                      <Button onClick={generate} disabled={loading} className="w-full h-14 text-lg font-bold bg-gradient-primary shadow-glow rounded-2xl group overflow-hidden relative">
                        {loading ? (
                          <div className="flex items-center gap-2">
                             <Loader2 className="h-5 w-5 animate-spin" />
                             <span>Syncing AI content...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                             <Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12" />
                             <span>GENERATE POLISHED RESUME</span>
                          </div>
                        )}
                      </Button>
                   </div>
                </div>
              </div>

              {/* RIGHT COLUMN: STICKY PREVIEW */}
              <div className="hidden lg:block lg:sticky lg:top-[158px] h-[calc(100vh-180px)] animate-in fade-in zoom-in-95 duration-500 delay-200">
                <div className="h-full flex flex-col bg-muted/20 rounded-[2.5rem] border-4 border-muted/50 p-2 shadow-card overflow-hidden">
                   <div className="flex-1 overflow-y-auto rounded-[2rem] bg-background scrollbar-hide">
                     {resume ? (
                        <div className="p-8 origin-top scale-[0.9] transform-gpu transition-transform">
                           <ResumePreview template={template} data={resume} onChange={setResume} />
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
                           <div className="h-20 w-20 rounded-3xl bg-muted/30 flex items-center justify-center mb-6"><Eye className="h-10 w-10 opacity-20" /></div>
                           <h4 className="font-bold text-foreground mb-2">Live Preview</h4>
                           <p className="text-xs max-w-[200px]">Fill in your details and click Generate to see your polished resume here.</p>
                        </div>
                      )}
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
