import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Target, Sparkles, ListChecks, Lightbulb, Tag, FileText, Mail, Building2, GraduationCap, BarChart3, Eye, Code2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Navbar } from "@/components/Navbar";
import { DiffView } from "@/components/DiffView";
import { supabase } from "@/integrations/supabase/client";
import { downloadResumePdf, downloadResumeDocx, downloadResumeTxt, downloadResumeMarkdown, downloadCoverLetterPdf } from "@/lib/pdfExport";
import { toast } from "sonner";

interface KeywordDensity { keyword: string; jd_count: number; resume_count: number; importance: "high" | "medium" | "low"; }
interface SkillGap { skill: string; priority: "critical" | "important" | "nice-to-have"; why: string; time_to_learn?: string; resources: { name: string; type: string; provider: string; cost?: string }[]; }
interface CompanyBrief { company_name: string; what_they_do: string; industry?: string; size?: string; values: string[]; recent_news?: string[]; role_focus?: string; interview_talking_points: string[]; questions_to_ask: string[]; }
interface Optimization {
  id: string;
  title: string | null;
  company: string | null;
  role: string | null;
  rewrite_level: string | null;
  ats_score: number | null;
  missing_keywords: string[] | null;
  keyword_density: KeywordDensity[] | null;
  professional_summary: string | null;
  improved_bullets: { original: string; improved: string }[] | null;
  skills_to_add: string[] | null;
  cover_letter: string | null;
  company_brief: CompanyBrief | null;
  skill_gaps: SkillGap[] | null;
  created_at: string;
}

export default function Results() {
  const { id } = useParams();
  const [opt, setOpt] = useState<Optimization | null>(null);
  const [loading, setLoading] = useState(true);
  const [diffMode, setDiffMode] = useState(true);
  const [coverLoading, setCoverLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [briefUrl, setBriefUrl] = useState("");

  const load = () => {
    if (!id) return;
    supabase.from("optimizations").select("*").eq("id", id).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setOpt(data as any);
        setLoading(false);
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
  const scoreColor = score >= 75 ? "text-primary" : score >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back</Link>
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{opt.title || "Your tailored resume"}</h1>
            <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground mt-1.5">
              {opt.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{opt.company}</span>}
              {opt.role && <span>· {opt.role}</span>}
              <span>· {new Date(opt.created_at).toLocaleString()}</span>
              {opt.rewrite_level && <span className="rounded-full bg-accent px-2 py-0.5 text-xs capitalize">{opt.rewrite_level} rewrite</span>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => downloadResumePdf(opt)}><FileText className="h-4 w-4 mr-2" /> PDF (formatted)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadResumeDocx(opt)}><FileText className="h-4 w-4 mr-2" /> DOCX (Word)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadResumeTxt(opt)}><FileText className="h-4 w-4 mr-2" /> Plain text (ATS-safe)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadResumeMarkdown(opt)}><Code2 className="h-4 w-4 mr-2" /> Markdown</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Score */}
        <div className="rounded-2xl border border-border bg-gradient-card p-8 shadow-card mb-6 flex flex-col md:flex-row items-center gap-8">
          <div className="relative h-36 w-36 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
              <circle cx="50" cy="50" r="42" stroke="hsl(var(--primary))" strokeWidth="8" fill="none"
                strokeLinecap="round" strokeDasharray={`${(score / 100) * 264} 264`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`font-display text-4xl font-extrabold ${scoreColor}`}>{score}</div>
              <div className="text-xs text-muted-foreground">/ 100</div>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Target className="h-3.5 w-3.5" /> ATS Match Score
            </div>
            <h2 className="font-display text-2xl font-bold mt-2">
              {score >= 75 ? "Strong match!" : score >= 50 ? "Good start — room to improve" : "Needs significant tailoring"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Apply the recommendations below to maximise your chances of passing automated screens and reaching a recruiter.
            </p>
          </div>
        </div>

        <Tabs defaultValue="resume" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto bg-card border border-border">
            <TabsTrigger value="resume"><Sparkles className="h-4 w-4 mr-1.5" /> Tailored Resume</TabsTrigger>
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
                  {(opt.missing_keywords ?? []).map((k) => (
                    <span key={k} className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-foreground">{k}</span>
                  ))}
                  {!opt.missing_keywords?.length && <p className="text-sm text-muted-foreground">No major keywords missing — nice work!</p>}
                </div>
              </Card>
              <Card icon={ListChecks} title="Skills to add">
                <div className="flex flex-wrap gap-2">
                  {(opt.skills_to_add ?? []).map((s) => (
                    <span key={s} className="inline-flex items-center rounded-full bg-gradient-primary text-primary-foreground px-3 py-1 text-xs font-medium">{s}</span>
                  ))}
                  {!opt.skills_to_add?.length && <p className="text-sm text-muted-foreground">All key skills already present.</p>}
                </div>
              </Card>
            </div>

            <Card icon={Sparkles} title="Suggested professional summary">
              <p className="text-sm leading-relaxed text-foreground/90">{opt.professional_summary || "—"}</p>
            </Card>

            <Card icon={Lightbulb} title="Improved work experience bullets" right={
              <Button variant="ghost" size="sm" onClick={() => setDiffMode(!diffMode)}>
                <Eye className="h-3.5 w-3.5 mr-1" /> {diffMode ? "Side-by-side" : "Diff view"}
              </Button>
            }>
              <div className="space-y-5">
                {(opt.improved_bullets ?? []).map((b, i) => (
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
                {!opt.improved_bullets?.length && <p className="text-sm text-muted-foreground">No bullet improvements suggested.</p>}
              </div>
            </Card>
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
          </TabsContent>

          {/* COMPANY BRIEF */}
          <TabsContent value="company" className="mt-6">
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
          </TabsContent>

          {/* SKILL GAPS */}
          <TabsContent value="gaps" className="mt-6">
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
          </TabsContent>
        </Tabs>
      </div>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}
