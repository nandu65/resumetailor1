import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Target, Sparkles, ListChecks, Lightbulb, Tag, FileText, Mail, Building2, GraduationCap, BarChart3, Eye, Code2, ExternalLink, TrendingUp, TrendingDown, Minus, Award, Wand2, Lock, MapPin, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Navbar } from "@/components/Navbar";
import { DiffView } from "@/components/DiffView";
import { KeywordHighlight } from "@/components/KeywordHighlight";
import { ShareScoreDialog } from "@/components/ShareScoreDialog";
import { supabase } from "@/integrations/supabase/client";
import { 
  downloadResumePdf, 
  downloadResumeDocx, 
  downloadResumeTxt, 
  downloadResumeMarkdown, 
  downloadCoverLetterPdf 
} from "@/lib/pdfExport";
import { downloadResumePdfFromData, downloadResumeDocxFromData, TemplateId, ResumePreview, normalizeResumeSkills } from "@/lib/resumeTemplates";
import { toast } from "sonner";

interface KeywordDensity { keyword: string; jd_count: number; resume_count: number; importance: "high" | "medium" | "low"; }
interface SkillGap { skill: string; priority: "critical" | "important" | "nice-to-have"; why: string; time_to_learn?: string; resources: { name: string; type: string; provider: string; cost?: string }[]; }
interface CompanyBrief { company_name: string; what_they_do: string; industry?: string; size?: string; values: string[]; recent_news?: string[]; role_focus?: string; interview_talking_points: string[]; questions_to_ask: string[]; }
interface ScoreCategory { key: string; label: string; score: number; max: number; detail: string; }
interface Optimization {
  id: string;
  title: string | null;
  company: string | null;
  role: string | null;
  rewrite_level: string | null;
  ats_score: number | null;
  previous_ats_score: number | null;
  recruiter_score: number | null;
  score_breakdown: ScoreCategory[] | null;
  recommendations: string[] | null;
  missing_keywords: string[] | null;
  keyword_density: KeywordDensity[] | null;
  professional_summary: string | null;
  improved_bullets: { original: string; improved: string }[] | null;
  skills_to_add: string[] | null;
  cover_letter: string | null;
  company_brief: CompanyBrief | null;
  skill_gaps: SkillGap[] | null;
  resume_text: string | null;
  job_description: string | null;
  created_at: string;
}

const EMPTY_RESUME: any = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  links: [],
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  settings: { fontSize: 11, fontFamily: "Inter, sans-serif", sections: {} }
};

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opt, setOpt] = useState<Optimization | null>(null);
  const [plan, setPlan] = useState<"free" | "basic" | "pro">("free");
  const [loading, setLoading] = useState(true);
  const [diffMode, setDiffMode] = useState(true);
  const [coverLoading, setCoverLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [briefUrl, setBriefUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<any>(null);

  const load = () => {
    if (!id) return;
    supabase.from("optimizations").select("*").eq("id", id).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setOpt(data as any);
        setLoading(false);
      });
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("profiles").select("plan, subscription_status")
        .eq("user_id", data.user.id).maybeSingle()
        .then(({ data: p }) => {
          if (p && (p as any).subscription_status === "active") {
            setPlan(((p as any).plan as any) || "free");
          } else {
            setPlan("free");
          }
        });
    });
  };

  useEffect(load, [id]);

  const generateCoverLetter = async () => {
    if (!id) return;
    setCoverLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-letter", { body: { optimizationId: id } });
      if (error) { toast.error((error as any).context?.error || error.message); return; }
      if (data?.error) { toast.error(data.error); return; }
      toast.success("Cover letter ready!");
      load();
    } finally { setCoverLoading(false); }
  };

  const generateBrief = async () => {
    if (!id) return;
    setBriefLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("company-brief", {
        body: { optimizationId: id, url: briefUrl || undefined, company: opt?.company, role: opt?.role },
      });
      if (error) { toast.error((error as any).context?.error || error.message); return; }
      if (data?.error) { toast.error(data.error); return; }
      toast.success("Company brief ready!");
      load();
    } finally { setBriefLoading(false); }
  };

  const generateGaps = async () => {
    if (!id) return;
    setGapsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("skill-gap", { body: { optimizationId: id } });
      if (error) { toast.error((error as any).context?.error || error.message); return; }
      if (data?.error) { toast.error(data.error); return; }
      toast.success("Skill gap analysis ready!");
      load();
    } finally { setGapsLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!opt) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Result not found.</p>
          <Button asChild className="mt-4"><Link to="/dashboard">Back to dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const score = opt.ats_score ?? 0;
  const prevScore = opt.previous_ats_score;
  const delta = prevScore != null ? score - prevScore : null;
  const recruiter = opt.recruiter_score ?? 0;
  const breakdown = opt.score_breakdown ?? [];
  const recs = opt.recommendations ?? [];
  const scoreColor = score >= 75 ? "text-primary" : score >= 50 ? "text-warning" : "text-destructive";
  const recruiterColor = recruiter >= 75 ? "text-primary" : recruiter >= 50 ? "text-warning" : "text-destructive";

  // Plan-based feature gates
  const isFree = plan === "free";
  const isBasic = plan === "basic";
  const canDownload = plan === "basic" || plan === "pro"; // PDF for basic; all formats for pro
  const proOnly = plan === "pro";
  const visibleMissingKeywords = isFree ? (opt.missing_keywords ?? []).slice(0, 2) : (opt.missing_keywords ?? []);
  const hiddenMissingCount = isFree ? Math.max(0, (opt.missing_keywords?.length ?? 0) - 2) : 0;

  const UpgradeOverlay = ({ label = "Upgrade to unlock", to = "/pricing" }: { label?: string; to?: string }) => (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm rounded-2xl">
      <div className="h-12 w-12 rounded-full bg-background border border-border flex items-center justify-center mb-3 shadow-md">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-semibold mb-2">{label}</div>
      <Button size="sm" onClick={() => navigate(to)} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
        Upgrade plan
      </Button>
    </div>
  );

  // Inline upgrade strip shown beneath a partially-blurred preview (Basic users)
  const TeaserCTA = ({ hiddenLabel, target = "Pro" }: { hiddenLabel: string; target?: string }) => (
    <div className="mt-4 rounded-xl border border-primary/40 bg-gradient-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow shrink-0">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">{hiddenLabel}</div>
          <div className="text-xs text-muted-foreground">Upgrade to {target} to unlock the full output.</div>
        </div>
      </div>
      <Button size="sm" onClick={() => navigate("/pricing")} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow shrink-0">
        Upgrade to {target}
      </Button>
    </div>
  );

  const buildResumeDataFromOptimization = (o: Optimization): any => {
    // Maps flat optimization record back to structured ResumeData for template engine
    let originalData: any = {};
    try {
      if (o.resume_text && o.resume_text.trim().startsWith('{')) {
        originalData = JSON.parse(o.resume_text);
      }
    } catch (e) {
      console.warn("Could not parse original resume_text, falling back to defaults");
    }

    // Merge AI optimizations into the authoritative structured data
    const improved = {
      ...EMPTY_RESUME,
      ...originalData,
      name: o.title?.split("'s")[0] || originalData.name || "Resume Candidate",
      title: o.role || originalData.title || "",
      summary: o.professional_summary || originalData.summary || "",
      // If we have improved bullets, we need to map them back to the experience entries
      experience: o.improved_bullets?.length && originalData.experience?.length
        ? originalData.experience.map((exp: any) => {
            // This is a simple heuristic: if a bullet matches an original one, replace it
            const newBullets = exp.bullets.map((b: string) => {
              const match = o.improved_bullets?.find(ib => ib.original.trim() === b.trim());
              return match ? match.improved : b;
            });
            return { ...exp, bullets: newBullets };
          })
        : originalData.experience || [],
      // Handle skills similarly
      skills: o.skills_to_add?.length || o.missing_keywords?.length
        ? normalizeResumeSkills({
            skills: [
              ...(originalData.skills || []),
              { category: "Additional Skills", items: [...(o.skills_to_add || []), ...(o.missing_keywords || [])] }
            ]
          }).skills
        : originalData.skills || [],
      settings: { 
        ...originalData.settings,
        fontSize: originalData.settings?.fontSize || 11, 
        fontFamily: originalData.settings?.fontFamily || "Inter, sans-serif",
      }
    };

    return improved;
  };

  const deltaCopy = (() => {
    if (delta == null) return null;
    if (delta >= 5) return { tone: "up" as const, text: `+${delta} improvement vs your last version`, sub: "Your tailoring made a measurable difference." };
    if (delta <= -5) return { tone: "down" as const, text: `${delta} from last version`, sub: "Some changes hurt the match — review the recommendations." };
    return { tone: "flat" as const, text: `${delta >= 0 ? "+" : ""}${delta} vs last version`, sub: score >= 75
      ? "ATS score was already strong. Improvements focused on recruiter appeal, wording quality, and impact."
      : "Score moved slightly. Apply the recommendations below to push it higher." };
  })();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6 sm:py-10 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back</Link>
        </Button>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">{opt.title || "Your tailored resume"}</h1>
            <div className="flex flex-wrap gap-x-2 gap-y-1 items-center text-sm text-muted-foreground mt-1.5">
              {opt.company && <span className="inline-flex items-center gap-1 min-w-0"><Building2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{opt.company}</span></span>}
              {opt.role && <span>· {opt.role}</span>}
              <span>· {new Date(opt.created_at).toLocaleString()}</span>
              {opt.rewrite_level && <span className="rounded-full bg-accent px-2 py-0.5 text-xs capitalize">{opt.rewrite_level} rewrite</span>}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto md:shrink-0">
            <ShareScoreDialog
              score={score}
              previousScore={prevScore}
              recruiterScore={recruiter || null}
              optimizationId={opt.id}
              company={opt.company}
              role={opt.role}
              title={opt.title}
            />
            <Button size="lg" variant="outline" onClick={() => {
              try {
                localStorage.setItem("app:prefill", JSON.stringify({
                  company_name: opt.company || "",
                  job_title: opt.role || opt.title || "",
                  job_description: (opt as any).job_description || "",
                  optimization_id: opt.id,
                  ats_score: score,
                  recruiter_score: recruiter || null,
                  status: "applied",
                }));
              } catch {}
              navigate("/applications?new=1");
            }} className="w-full sm:w-auto"><Briefcase className="h-4 w-4 mr-2" /> Track This Application</Button>
            {!canDownload ? (
              <Button size="lg" onClick={() => navigate("/pricing")} className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                <Lock className="h-4 w-4 mr-2" /> Upgrade to download
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={async () => {
                    const data = buildResumeDataFromOptimization(opt);
                    setExportData(data);
                    setIsExporting(true);
                    // Long delay to ensure the hidden portal is fully rendered and styles applied
                    setTimeout(async () => {
                      try {
                        await downloadResumePdfFromData(data, (opt.rewrite_level as any) || "modern");
                      } finally {
                        setIsExporting(false);
                      }
                    }, 800);
                  }}><FileText className="h-4 w-4 mr-2" /> PDF (Template Match)</DropdownMenuItem>
                  {proOnly && <DropdownMenuItem onClick={async () => {
                    const data = buildResumeDataFromOptimization(opt);
                    await downloadResumeDocxFromData(data, (opt.rewrite_level as any) || "modern");
                  }}><FileText className="h-4 w-4 mr-2" /> Word (Template Match)</DropdownMenuItem>}
                  {proOnly && <DropdownMenuItem onClick={() => downloadResumeTxt(opt)}><FileText className="h-4 w-4 mr-2" /> Plain text (ATS-safe)</DropdownMenuItem>}
                  {proOnly && <DropdownMenuItem onClick={() => downloadResumeMarkdown(opt)}><Code2 className="h-4 w-4 mr-2" /> Markdown</DropdownMenuItem>}
                  {!proOnly && (
                    <DropdownMenuItem onClick={() => navigate("/pricing")} className="text-muted-foreground">
                      <Lock className="h-4 w-4 mr-2" /> DOCX / TXT / Markdown — Pro
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Score panel */}
        <div className="grid lg:grid-cols-5 gap-5 mb-6">
          {/* ATS score */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-gradient-card p-7 shadow-card">
            <div className="flex flex-col sm:flex-row items-center gap-7">
              <div className="relative h-36 w-36 shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="42" stroke="hsl(var(--primary))" strokeWidth="8" fill="none"
                    strokeLinecap="round" strokeDasharray={`${(score / 100) * 264} 264`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`font-display text-4xl font-extrabold ${scoreColor}`}>{score}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">/ 100 ATS</div>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Target className="h-3.5 w-3.5" /> ATS Match Score
                </div>
                <h2 className="font-display text-2xl font-bold mt-2">
                  {score >= 80 ? "Strong match" : score >= 65 ? "Good match — push it higher" : score >= 45 ? "Needs more tailoring" : "Significant gaps"}
                </h2>
                {deltaCopy && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    {deltaCopy.tone === "up" && <TrendingUp className="h-4 w-4 text-primary" />}
                    {deltaCopy.tone === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
                    {deltaCopy.tone === "flat" && <Minus className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-semibold">{prevScore} → {score}</span>
                    <span className={deltaCopy.tone === "up" ? "text-primary" : deltaCopy.tone === "down" ? "text-destructive" : "text-muted-foreground"}>
                      {deltaCopy.text}
                    </span>
                  </div>
                )}
                {deltaCopy && <p className="mt-2 text-xs text-muted-foreground">{deltaCopy.sub}</p>}
                {!deltaCopy && <p className="mt-2 text-sm text-muted-foreground">First version for this job — re-run after edits to track improvements.</p>}
              </div>
            </div>
          </div>

          {/* Recruiter Appeal */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-gradient-card p-7 shadow-card flex flex-col">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Award className="h-3.5 w-3.5" /> Recruiter Appeal
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className={`font-display text-5xl font-extrabold ${recruiterColor}`}>{recruiter}</div>
              <div className="text-sm text-muted-foreground">/ 100</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {recruiter >= 75 ? "Strong verbs, metrics, and clarity." : recruiter >= 50 ? "Decent — sharpen verbs and add metrics." : "Reads weak to a recruiter — rewrite for impact."}
            </p>
            <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-primary transition-all" style={{ width: `${recruiter}%` }} />
            </div>
            <div className="mt-auto pt-4 text-xs text-muted-foreground leading-relaxed">
              Measures clarity, action verbs, quantified impact, and persuasive tone — not just keyword matching.
            </div>
          </div>
        </div>

        {/* Score breakdown */}
        {breakdown.length > 0 && (
          <div className="relative rounded-2xl border border-border bg-card p-6 shadow-card mb-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground"><BarChart3 className="h-4 w-4" /></div>
              <h3 className="font-display font-semibold">Score breakdown</h3>
              <span className="ml-auto text-xs text-muted-foreground">Weighted out of 100</span>
            </div>
            <div className={`grid sm:grid-cols-2 gap-4 ${isFree ? "blur-md pointer-events-none select-none" : ""}`}>
              {breakdown.map((c) => {
                const pct = c.max ? (c.score / c.max) * 100 : 0;
                const tone = pct >= 75 ? "bg-primary" : pct >= 45 ? "bg-warning" : "bg-destructive";
                return (
                  <div key={c.key} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="text-sm font-semibold">{c.label}</div>
                      <div className="text-sm tabular-nums"><span className="font-bold">{c.score}</span><span className="text-muted-foreground">/{c.max}</span></div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{c.detail}</p>
                  </div>
                );
              })}
            </div>
            {isFree && <UpgradeOverlay label="Score breakdown is a Basic feature" />}
          </div>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <div className="rounded-2xl border border-primary/30 bg-gradient-card p-6 shadow-card mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow"><Wand2 className="h-4 w-4" /></div>
              <h3 className="font-display font-semibold">Top ways to improve your score</h3>
            </div>
            <ol className="space-y-2.5">
              {recs.map((r, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="leading-relaxed">{r}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <Tabs defaultValue="resume" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto bg-card border border-border">
            <TabsTrigger value="resume"><Sparkles className="h-4 w-4 mr-1.5" /> Tailored Resume</TabsTrigger>
            <TabsTrigger value="map"><MapPin className="h-4 w-4 mr-1.5" /> Keyword Map</TabsTrigger>
            <TabsTrigger value="keywords"><BarChart3 className="h-4 w-4 mr-1.5" /> Keyword Density</TabsTrigger>
            <TabsTrigger value="cover"><Mail className="h-4 w-4 mr-1.5" /> Cover Letter</TabsTrigger>
            <TabsTrigger value="company"><Building2 className="h-4 w-4 mr-1.5" /> Company Brief</TabsTrigger>
            <TabsTrigger value="gaps"><GraduationCap className="h-4 w-4 mr-1.5" /> Skill Gaps</TabsTrigger>
          </TabsList>

          {/* RESUME TAB */}
          <TabsContent value="resume" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card icon={Tag} title="Missing keywords">
                <div className="flex flex-wrap gap-2">
                  {visibleMissingKeywords.map((k) => (
                    <span key={k} className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-foreground">{k}</span>
                  ))}
                  {!opt.missing_keywords?.length && <p className="text-sm text-muted-foreground">No major keywords missing — nice work!</p>}
                </div>
                {hiddenMissingCount > 0 && (
                  <div className="mt-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      <Lock className="h-3 w-3 inline mr-1" /> +{hiddenMissingCount} more keywords hidden on Free.
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate("/pricing")}>Upgrade</Button>
                  </div>
                )}
              </Card>
              <div className="relative">
                <Card icon={ListChecks} title="Skills to add">
                  {(() => {
                    const skills = opt.skills_to_add ?? [];
                    if (proOnly) {
                      return (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((s) => (
                            <span key={s} className="inline-flex items-center rounded-full bg-gradient-primary text-primary-foreground px-3 py-1 text-xs font-medium">{s}</span>
                          ))}
                          {!skills.length && <p className="text-sm text-muted-foreground">All key skills already present.</p>}
                        </div>
                      );
                    }
                    if (isBasic) {
                      const sample = skills.length ? skills : ["System Design", "Kubernetes", "GraphQL", "TypeScript", "AWS", "CI/CD"];
                      const visible = sample.slice(0, 2);
                      const hidden = sample.slice(2);
                      return (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {visible.map((s) => (
                              <span key={s} className="inline-flex items-center rounded-full bg-gradient-primary text-primary-foreground px-3 py-1 text-xs font-medium">{s}</span>
                            ))}
                            {hidden.map((s, i) => (
                              <span key={`b-${i}`} className="inline-flex items-center rounded-full bg-gradient-primary text-primary-foreground px-3 py-1 text-xs font-medium blur-sm select-none">{s}</span>
                            ))}
                          </div>
                          {hidden.length > 0 && <TeaserCTA hiddenLabel={`+${hidden.length} more skill suggestions hidden`} />}
                        </>
                      );
                    }
                    return (
                      <div className="blur-sm pointer-events-none select-none flex flex-wrap gap-2">
                        {["System Design", "Kubernetes", "GraphQL", "TypeScript"].map((s) => (
                          <span key={s} className="inline-flex items-center rounded-full bg-gradient-primary text-primary-foreground px-3 py-1 text-xs font-medium">{s}</span>
                        ))}
                      </div>
                    );
                  })()}
                </Card>
                {isFree && <UpgradeOverlay label="Skills suggestions are a Pro feature" />}
              </div>
            </div>

            <div className="relative">
              <Card icon={Sparkles} title="Suggested professional summary">
                {(() => {
                  const summary = opt.professional_summary || "Results-driven engineer with 5+ years building scalable systems. Led cross-functional teams to ship features used by millions, reduced infra costs by 30%, and mentored junior developers across distributed teams.";
                  if (proOnly) {
                    return <p className="text-sm leading-relaxed text-foreground/90">{opt.professional_summary || "—"}</p>;
                  }
                  if (isBasic) {
                    const words = summary.split(" ");
                    const cut = Math.ceil(words.length / 3);
                    const visible = words.slice(0, cut).join(" ");
                    const hidden = words.slice(cut).join(" ");
                    return (
                      <>
                        <p className="text-sm leading-relaxed text-foreground/90">
                          {visible} <span className="blur-sm select-none">{hidden}</span>
                        </p>
                        <TeaserCTA hiddenLabel="Full AI-rewritten summary hidden" />
                      </>
                    );
                  }
                  return <p className="text-sm leading-relaxed text-foreground/90 blur-sm pointer-events-none select-none">{summary}</p>;
                })()}
              </Card>
              {isFree && <UpgradeOverlay label="Profile summary rewrite is a Pro feature" />}
            </div>

            <div className="relative">
              <Card icon={Lightbulb} title="Improved work experience bullets" right={proOnly ? (
                <Button variant="ghost" size="sm" onClick={() => setDiffMode(!diffMode)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> {diffMode ? "Side-by-side" : "Diff view"}
                </Button>
              ) : null}>
                {(() => {
                  const bullets = opt.improved_bullets ?? [];
                  if (proOnly) {
                    return (
                      <div className="space-y-5">
                        {bullets.map((b, i) => (
                          <div key={i} className="rounded-xl border border-border bg-background p-4">
                            {diffMode ? (
                              <>
                                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Changes</div>
                                <DiffView original={b.original} improved={b.improved} />
                              </>
                            ) : (
                              <>
                                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Original</div>
                                <p className="text-sm text-muted-foreground line-through decoration-1">{b.original}</p>
                                <div className="text-xs uppercase tracking-wide text-primary font-semibold mt-3 mb-1">Improved</div>
                                <p className="text-sm font-medium">{b.improved}</p>
                              </>
                            )}
                          </div>
                        ))}
                        {!bullets.length && <p className="text-sm text-muted-foreground">No bullet improvements suggested.</p>}
                      </div>
                    );
                  }
                  if (isBasic) {
                    const sample = bullets.length ? bullets : [
                      { original: "Worked on backend services for the platform.", improved: "Architected and shipped 4 microservices handling 2M+ daily requests, reducing p95 latency by 40%." },
                      { original: "Helped improve performance.", improved: "Optimized PostgreSQL queries and Redis caching, cutting API response time from 800ms to 120ms." },
                      { original: "Collaborated with team on features.", improved: "Led 6-engineer pod through 3 quarterly releases, shipping 12 features used by 500K MAU." },
                    ];
                    const visible = sample.slice(0, 1);
                    const hidden = sample.slice(1);
                    return (
                      <div className="space-y-5">
                        {visible.map((b, i) => (
                          <div key={i} className="rounded-xl border border-border bg-background p-4">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Original</div>
                            <p className="text-sm text-muted-foreground line-through decoration-1">{b.original}</p>
                            <div className="text-xs uppercase tracking-wide text-primary font-semibold mt-3 mb-1">Improved</div>
                            <p className="text-sm font-medium">{b.improved}</p>
                          </div>
                        ))}
                        {hidden.map((b, i) => (
                          <div key={`h-${i}`} className="rounded-xl border border-border bg-background p-4 blur-sm select-none pointer-events-none">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Original</div>
                            <p className="text-sm text-muted-foreground line-through decoration-1">{b.original}</p>
                            <div className="text-xs uppercase tracking-wide text-primary font-semibold mt-3 mb-1">Improved</div>
                            <p className="text-sm font-medium">{b.improved}</p>
                          </div>
                        ))}
                        {hidden.length > 0 && <TeaserCTA hiddenLabel={`+${hidden.length} more AI-rewritten bullets hidden`} />}
                      </div>
                    );
                  }
                  return (
                    <div className="blur-sm pointer-events-none select-none rounded-xl border border-border bg-background p-4">
                      <p className="text-sm font-medium">Architected and shipped 4 microservices handling 2M+ daily requests, reducing p95 latency by 40%.</p>
                    </div>
                  );
                })()}
              </Card>
              {isFree && <UpgradeOverlay label="AI bullet rewrites are a Pro feature" />}
            </div>
          </TabsContent>

          {/* KEYWORD MAP — inline highlighting */}
          <TabsContent value="map" className="mt-6 space-y-6">
            {(() => {
              const missing = opt.missing_keywords ?? [];
              const present = (opt.keyword_density ?? [])
                .filter((k) => k.resume_count > 0)
                .map((k) => k.keyword);
              const allJdKeywords = Array.from(new Set([...missing, ...present]));
              const resumeText = opt.resume_text || "";
              const jdText = opt.job_description || "";
              return (
                <>
                  <div className="rounded-2xl border border-primary/20 bg-gradient-card p-5 shadow-card">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h3 className="font-display font-semibold">Where the gaps live</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Missing keywords are highlighted <span className="bg-warning/25 border-b-2 border-warning font-semibold rounded-sm px-1">amber in the job description</span> — that's what the recruiter is looking for.
                      Matched keywords already in your resume show as <span className="bg-primary/15 text-primary border-b-2 border-primary/60 font-semibold rounded-sm px-1">primary green</span>.
                    </p>
                    {missing.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {missing.map((k) => (
                          <span key={k} className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-medium">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-5">
                    <Card icon={FileText} title="Your resume">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                        Green highlights = keywords you already cover
                      </div>
                      <div className="max-h-[520px] overflow-auto rounded-lg border border-border bg-background p-4">
                        <KeywordHighlight
                          text={resumeText}
                          keywords={present}
                          tone="present"
                          emptyLabel="Original resume text isn't stored for this run."
                        />
                      </div>
                    </Card>
                    <Card icon={Building2} title="Job description">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
                        Amber highlights = missing from your resume · Green = present
                      </div>
                      <div className="max-h-[520px] overflow-auto rounded-lg border border-border bg-background p-4 space-y-0">
                        {jdText ? (
                          <JdMap text={jdText} missing={missing} present={present} />
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Job description isn't stored for this run.</p>
                        )}
                      </div>
                      {allJdKeywords.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">No keyword data available yet.</p>
                      )}
                    </Card>
                  </div>
                </>
              );
            })()}
          </TabsContent>


          {/* KEYWORD DENSITY */}
          <TabsContent value="keywords" className="mt-6">
            <Card icon={BarChart3} title="ATS keyword density">
              <p className="text-sm text-muted-foreground mb-4">How often each important keyword appears in the JD vs. your resume.</p>
              <div className="space-y-3">
                {(opt.keyword_density ?? []).map((k) => {
                  const ratio = k.jd_count > 0 ? Math.min(1, k.resume_count / k.jd_count) : (k.resume_count > 0 ? 1 : 0);
                  const pct = Math.round(ratio * 100);
                  const color = pct >= 75 ? "bg-primary" : pct >= 40 ? "bg-warning" : "bg-destructive";
                  const importanceLabel = k.importance === "high" ? "High" : k.importance === "medium" ? "Med" : "Low";
                  return (
                    <div key={k.keyword} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">{k.keyword}</span>
                          <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${k.importance === "high" ? "bg-primary/15 text-primary" : k.importance === "medium" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>{importanceLabel}</span>
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                          Resume: <span className="font-semibold text-foreground">{k.resume_count}</span> · JD: <span className="font-semibold text-foreground">{k.jd_count}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {!opt.keyword_density?.length && <p className="text-sm text-muted-foreground">No keyword density data available.</p>}
              </div>
            </Card>
          </TabsContent>

          {/* COVER LETTER */}
          <TabsContent value="cover" className="mt-6">
            {isFree ? (
              <ProGate title="Cover Letter Generator" desc="Generate tailored cover letters for every application." onUpgrade={() => navigate("/pricing")} />
            ) : isBasic ? (
              <Card icon={Mail} title="Cover letter — preview">
                <div className="text-sm leading-relaxed text-foreground/90 space-y-3">
                  <p>Dear Hiring Manager,</p>
                  <p>
                    I'm excited to apply for the <span className="font-semibold">{opt.role || "role"}</span>
                    {opt.company ? <> at <span className="font-semibold">{opt.company}</span></> : null}.
                    With over five years of experience shipping production systems at scale, I'm confident I can…
                  </p>
                  <p className="blur-sm select-none">
                    contribute meaningfully from day one. In my last role I led a team of six engineers to deliver a real-time analytics platform processing 2M+ events per minute, reducing infrastructure costs by 30% while improving p95 latency by 40%. I'm particularly drawn to your work on…
                  </p>
                  <p className="blur-sm select-none">
                    …and would love to bring my background in distributed systems, technical leadership, and customer-obsessed product thinking to your team. I'd welcome the opportunity to discuss how my experience aligns with your roadmap.
                  </p>
                  <p className="blur-sm select-none">Sincerely,<br />[Your name]</p>
                </div>
                <TeaserCTA hiddenLabel="Full personalized cover letter is a Pro feature" />
              </Card>
            ) : (
            <Card icon={Mail} title="Cover letter" right={opt.cover_letter ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadCoverLetterPdf(opt, opt.cover_letter!)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={generateCoverLetter} disabled={coverLoading}>
                  {coverLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Regenerate"}
                </Button>
              </div>
            ) : null}>
              {opt.cover_letter ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {opt.cover_letter}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">Generate a tailored cover letter using your resume + this job description.</p>
                  <Button onClick={generateCoverLetter} disabled={coverLoading} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                    {coverLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Writing...</> : <><Mail className="h-4 w-4 mr-2" /> Generate cover letter</>}
                  </Button>
                </div>
              )}
            </Card>
            )}
          </TabsContent>

          {/* COMPANY BRIEF */}
          <TabsContent value="company" className="mt-6">
            {isFree ? (
              <ProGate title="Company Research Brief" desc="Get an AI dossier on the company, role, and smart questions to ask." onUpgrade={() => navigate("/pricing")} />
            ) : isBasic ? (
              <Card icon={Building2} title="Company research brief — preview">
                <div className="space-y-5">
                  <div>
                    <h4 className="font-display font-bold text-lg">{opt.company || "Acme Corp"}</h4>
                    <p className="text-sm text-muted-foreground">SaaS · 500–1000 employees</p>
                    <p className="text-sm mt-2 leading-relaxed">
                      A fast-growing platform helping mid-market teams automate operations across sales, finance, and customer success.
                    </p>
                  </div>
                  <Section title="Values & culture">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-medium">Customer obsession</span>
                      <span className="rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-medium">Bias for action</span>
                      <span className="rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-medium blur-sm select-none">Ownership</span>
                      <span className="rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-medium blur-sm select-none">High standards</span>
                    </div>
                  </Section>
                  <Section title="Interview talking points">
                    <ul className="text-sm space-y-1.5 list-disc pl-5">
                      <li>Recent product launch in the AI workflow space — discuss how your background aligns.</li>
                      <li className="blur-sm select-none">Their Series C raise and expansion into APAC — connect to your scaling experience.</li>
                      <li className="blur-sm select-none">Engineering blog post on platform reliability — reference relevant work.</li>
                    </ul>
                  </Section>
                  <Section title="Smart questions to ask them">
                    <ul className="text-sm space-y-1.5 list-disc pl-5 blur-sm select-none">
                      <li>How does the team measure success in the first 90 days?</li>
                      <li>What's the biggest technical challenge facing the team this quarter?</li>
                      <li>How do engineering and product collaborate on roadmap decisions?</li>
                    </ul>
                  </Section>
                </div>
                <TeaserCTA hiddenLabel="Full company research brief is a Pro feature" />
              </Card>
            ) : (
            <Card icon={Building2} title="Company research brief">
              {opt.company_brief ? (
                <div className="space-y-5">
                  <div>
                    <h4 className="font-display font-bold text-lg">{opt.company_brief.company_name}</h4>
                    <p className="text-sm text-muted-foreground">{[opt.company_brief.industry, opt.company_brief.size].filter(Boolean).join(" · ")}</p>
                    <p className="text-sm mt-2 leading-relaxed">{opt.company_brief.what_they_do}</p>
                  </div>
                  {opt.company_brief.role_focus && (
                    <Section title="Role focus"><p className="text-sm">{opt.company_brief.role_focus}</p></Section>
                  )}
                  <Section title="Values & culture">
                    <div className="flex flex-wrap gap-2">
                      {opt.company_brief.values.map(v => (
                        <span key={v} className="rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-medium">{v}</span>
                      ))}
                    </div>
                  </Section>
                  {opt.company_brief.recent_news?.length ? (
                    <Section title="Recent / notable">
                      <ul className="text-sm space-y-1 list-disc pl-5">
                        {opt.company_brief.recent_news.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </Section>
                  ) : null}
                  <Section title="Interview talking points">
                    <ul className="text-sm space-y-1.5 list-disc pl-5">
                      {opt.company_brief.interview_talking_points.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </Section>
                  <Section title="Smart questions to ask them">
                    <ul className="text-sm space-y-1.5 list-disc pl-5">
                      {opt.company_brief.questions_to_ask.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </Section>
                  <Button variant="ghost" size="sm" onClick={generateBrief} disabled={briefLoading}>
                    {briefLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Regenerate
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Get an AI-generated brief on the company and role. Optionally paste a careers page or about page URL for more accuracy.</p>
                  <div>
                    <Label htmlFor="brief-url" className="text-xs">Company URL (optional)</Label>
                    <Input id="brief-url" value={briefUrl} onChange={e => setBriefUrl(e.target.value)} placeholder="https://company.com/about" className="mt-1" />
                  </div>
                  <Button onClick={generateBrief} disabled={briefLoading} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                    {briefLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Researching...</> : <><Building2 className="h-4 w-4 mr-2" /> Generate brief</>}
                  </Button>
                </div>
              )}
            </Card>
            )}
          </TabsContent>

          {/* SKILL GAPS */}
          <TabsContent value="gaps" className="mt-6">
            {isFree ? (
              <ProGate title="Skill Gap Analysis" desc="See exactly which skills to learn — and where — to close the gap to your target role." onUpgrade={() => navigate("/pricing")} />
            ) : isBasic ? (
              <Card icon={GraduationCap} title="Skill gap analysis — preview">
                <div className="space-y-4">
                  {[
                    { skill: "System Design at scale", priority: "critical", why: "JD emphasizes architecting distributed systems handling 10M+ requests/day.", time: "6–8 weeks", resources: [{ name: "Designing Data-Intensive Applications", provider: "O'Reilly", type: "book", cost: "₹1,500" }, { name: "System Design Primer", provider: "GitHub", type: "guide", cost: "Free" }], visible: true },
                    { skill: "Kubernetes & service mesh", priority: "important", why: "Required for managing the microservices fleet they describe.", time: "4–6 weeks", resources: [{ name: "CKA Certification", provider: "Linux Foundation", type: "cert", cost: "$395" }, { name: "Istio Up & Running", provider: "O'Reilly", type: "book", cost: "₹1,800" }], visible: false },
                    { skill: "Event-driven architecture", priority: "important", why: "Core to their async processing pipeline.", time: "3–4 weeks", resources: [{ name: "Kafka: The Definitive Guide", provider: "Confluent", type: "book", cost: "Free" }], visible: false },
                  ].map((g, i) => {
                    const priColor = g.priority === "critical" ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5";
                    const priBadge = g.priority === "critical" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground";
                    return (
                      <div key={i} className={`rounded-xl border ${priColor} p-4 ${!g.visible ? "blur-sm select-none pointer-events-none" : ""}`}>
                        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                          <div>
                            <h4 className="font-display font-semibold">{g.skill}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{g.why}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded ${priBadge}`}>{g.priority}</span>
                            <span className="text-xs text-muted-foreground">~{g.time}</span>
                          </div>
                        </div>
                        <div className="mt-3 grid sm:grid-cols-2 gap-2">
                          {g.resources.map((r, ri) => (
                            <div key={ri} className="rounded-lg border border-border bg-background p-2.5 text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{r.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0">{r.cost}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 capitalize">{r.type} · {r.provider}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <TeaserCTA hiddenLabel="+2 more skill gaps and curated resources hidden" />
              </Card>
            ) : (
            <Card icon={GraduationCap} title="Skill gap analysis">
              {opt.skill_gaps?.length ? (
                <div className="space-y-4">
                  {opt.skill_gaps.map((g, i) => {
                    const priColor = g.priority === "critical" ? "border-destructive/40 bg-destructive/5" : g.priority === "important" ? "border-warning/40 bg-warning/5" : "border-border bg-background";
                    const priBadge = g.priority === "critical" ? "bg-destructive text-destructive-foreground" : g.priority === "important" ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground";
                    return (
                      <div key={i} className={`rounded-xl border ${priColor} p-4`}>
                        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                          <div>
                            <h4 className="font-display font-semibold">{g.skill}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{g.why}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded ${priBadge}`}>{g.priority}</span>
                            {g.time_to_learn && <span className="text-xs text-muted-foreground">~{g.time_to_learn}</span>}
                          </div>
                        </div>
                        <div className="mt-3 grid sm:grid-cols-2 gap-2">
                          {g.resources.map((r, ri) => (
                            <div key={ri} className="rounded-lg border border-border bg-background p-2.5 text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{r.name}</span>
                                {r.cost && <span className="text-xs text-muted-foreground shrink-0">{r.cost}</span>}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 capitalize">{r.type} · {r.provider}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="ghost" size="sm" onClick={generateGaps} disabled={gapsLoading}>
                    {gapsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Regenerate
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">Find what skills to learn (and where) to close the gap to your target role.</p>
                  <Button onClick={generateGaps} disabled={gapsLoading} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                    {gapsLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : <><GraduationCap className="h-4 w-4 mr-2" /> Analyze skill gaps</>}
                  </Button>
                </div>
              )}
            </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Hidden export portal to ensure DOM capture works with canonical renderer */}
      {isExporting && exportData && (
        <div className="fixed left-0 top-0 opacity-0 pointer-events-none z-[-1]" style={{ width: '794px', height: '1123px', overflow: 'hidden' }}>
          <div className="bg-white">
            <ResumePreview 
              template={(opt?.rewrite_level as any) || "modern"} 
              data={exportData} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ icon: Icon, title, children, right, className = "" }: { icon: any; title: string; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-gradient-card p-6 shadow-card ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground"><Icon className="h-4 w-4" /></div>
          <h3 className="font-display font-semibold">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function ProGate({ title, desc, onUpgrade }: { title: string; desc: string; onUpgrade: () => void }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-card p-10 shadow-card text-center">
      <div className="h-14 w-14 mx-auto rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow mb-4">
        <Lock className="h-6 w-6" />
      </div>
      <h3 className="font-display text-xl font-bold">{title} — Pro feature</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{desc}</p>
      <Button onClick={onUpgrade} className="mt-5 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
        Upgrade to Pro · ₹99/mo
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** JD map: highlights missing (amber) and present (primary) keywords in one pass. */
function JdMap({ text, missing, present }: { text: string; missing: string[]; present: string[] }) {
  const missSet = new Set(missing.map((k) => k.toLowerCase()));
  const presSet = new Set(present.map((k) => k.toLowerCase()));
  const all = Array.from(new Set([...missing, ...present]))
    .filter((k) => k && k.trim().length > 1)
    .sort((a, b) => b.length - a.length);
  if (all.length === 0) {
    return <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-sans">{text}</pre>;
  }
  const pattern = new RegExp(`(${all.map(escapeRegex).join("|")})`, "gi");
  const parts: { value: string; kind: "none" | "miss" | "pres" }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push({ value: text.slice(last, m.index), kind: "none" });
    const lower = m[0].toLowerCase();
    const kind: "miss" | "pres" = missSet.has(lower) ? "miss" : presSet.has(lower) ? "pres" : "none" as any;
    parts.push({ value: m[0], kind });
    last = m.index + m[0].length;
    if (m[0].length === 0) pattern.lastIndex++;
  }
  if (last < text.length) parts.push({ value: text.slice(last), kind: "none" });
  return (
    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-sans">
      {parts.map((p, i) => {
        if (p.kind === "miss")
          return <mark key={i} className="bg-warning/25 text-foreground border-b-2 border-warning font-semibold rounded-sm px-0.5">{p.value}</mark>;
        if (p.kind === "pres")
          return <mark key={i} className="bg-primary/15 text-primary border-b-2 border-primary/60 font-semibold rounded-sm px-0.5">{p.value}</mark>;
        return <span key={i}>{p.value}</span>;
      })}
    </pre>
  );
}

