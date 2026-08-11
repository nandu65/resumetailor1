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
                <p className="text-sm text-muted-foreground mt-2 text-pretty">hey</p>
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
            <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-md border-b flex items-center justify-between p-4 -mx-4 sm:mx-0 sm:rounded-xl shadow-sm gap-4">
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

            <div className="grid lg:grid-cols-[450px_1fr] gap-8">
              {/* LEFT COLUMN: EDITOR */}
              <div className="space-y-6">
                {/* TOOLBAR */}
                <div className="sticky top-[64px] z-20 bg-background/95 backdrop-blur p-2 border-b flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}><Undo2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}><Redo2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={downloadPdf} disabled={!resume}>PDF</Button>
                    <Button variant="outline" size="sm" onClick={downloadDocx} disabled={!resume}>DOCX</Button>
                  </div>
                </div>
                
                {/* NAVIGATION */}
                <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {["Basics", "Summary", "Experience", "Skills", "Design"].map((s) => (
                    <a key={s} href={`#section-${s.toLowerCase()}`} className="px-3 py-1 bg-muted rounded-full text-xs font-medium hover:bg-primary/20">{s}</a>
                  ))}
                </nav>

                <div id="section-basics" className="bg-card border rounded-2xl p-6">
                  <h3 className="font-bold mb-4">Basics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input value={basics.name} onChange={e => setBasics({ ...basics, name: e.target.value })} placeholder="Full Name" />
                    <Input value={basics.title} onChange={e => setBasics({ ...basics, title: e.target.value })} placeholder="Title" />
                    <Input value={basics.email} onChange={e => setBasics({ ...basics, email: e.target.value })} placeholder="Email" />
                    <Input value={basics.phone} onChange={e => setBasics({ ...basics, phone: e.target.value })} placeholder="Phone" />
                  </div>
                </div>

                <div id="section-summary" className="bg-card border rounded-2xl p-6">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="font-bold">Summary</h3>
                     <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs">Formatting</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80"><SectionStyleControls value={sectionStyles} onChange={setSectionStyles} baseSize={globalFontSize} sectionKey="summary" hideHeader /></PopoverContent>
                     </Popover>
                   </div>
                   <Textarea value={summary} onChange={e => setSummary(e.target.value)} className="min-h-[100px]" />
                </div>

                <div id="section-experience" className="bg-card border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="font-bold">Experience</h3>
                     <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs">Formatting</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80"><SectionStyleControls value={sectionStyles} onChange={setSectionStyles} baseSize={globalFontSize} sectionKey="experience" hideHeader /></PopoverContent>
                        </Popover>
                        <Button variant="outline" size="sm" onClick={addExp} className="h-8"><Plus className="h-4 w-4" /></Button>
                     </div>
                   </div>
                   {experience.map((exp, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg mb-3 relative">
                        <Input value={exp.company} onChange={e => { const n = [...experience]; n[i].company = e.target.value; setExperience(n); }} placeholder="Company" className="mb-1 h-8" />
                        <Textarea value={exp.description} onChange={e => { const n = [...experience]; n[i].description = e.target.value; setExperience(n); }} className="min-h-[60px]" />
                      </div>
                   ))}
                </div>
              </div>

              {/* RIGHT COLUMN: STICKY PREVIEW */}
              <div className="lg:sticky lg:top-[64px] h-[calc(100vh-64px)] overflow-hidden">
                <div className="h-full flex flex-col bg-muted/30 rounded-2xl border p-4">
                   <div className="flex-1 overflow-y-auto">
                     {resume ? (
                        <ResumePreview template={template} data={resume} onChange={setResume} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">Preview pending...</div>
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
