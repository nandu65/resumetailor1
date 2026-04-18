import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, FileText, Target, Zap, CheckCircle2, BarChart3, ShieldCheck, Mail, Layers, GitCompare, Gauge, SlidersHorizontal, Download, Building2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="container relative pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground mb-8 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered resume optimization for every role
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight text-balance max-w-4xl mx-auto animate-fade-in-up">
            Land more interviews with a{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">resume that fits</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance animate-fade-in-up">
            Paste any job description and we'll tailor your resume to beat ATS filters and impress recruiters — in seconds.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-in-up">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-7 text-base">
              <Link to="/auth">Upload Resume <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
              <Link to="/dashboard">See dashboard</Link>
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> 1 free optimization</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> ATS-tested format</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl font-bold tracking-tight">Everything you need to get hired</h2>
          <p className="mt-4 text-muted-foreground">A complete toolkit to position your experience for any opportunity.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: "ATS Match Score", desc: "Get an instant 0–100 score showing how well your resume aligns with any job description." },
            { icon: Zap, title: "AI-Rewritten Bullets", desc: "Tighter, metric-driven experience lines that mirror the language recruiters search for." },
            { icon: BarChart3, title: "Missing Keywords", desc: "See exactly which skills and phrases you're lacking — and where to add them." },
            { icon: FileText, title: "Polished Summary", desc: "A tailored 3-4 sentence professional summary positioned for the role." },
            { icon: ShieldCheck, title: "Recruiter-Ready PDF", desc: "Export a clean, ATS-friendly PDF you can send the same day." },
            { icon: Sparkles, title: "Works for any role", desc: "From engineering to design to marketing — tailored for the role you actually want." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-border bg-gradient-card p-7 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition-all duration-300">
              <div className="h-11 w-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center mb-5 group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold text-lg">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pro toolkit showcase */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="container py-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground mb-4">
              <Sparkles className="h-3.5 w-3.5" /> All included, free for everyone
            </div>
            <h2 className="font-display text-4xl font-bold tracking-tight">A complete job-search toolkit</h2>
            <p className="mt-4 text-muted-foreground">Eight powerful tools working together — from tailoring to interview-ready in minutes.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Mail, title: "Cover Letter Generator", desc: "Tailored cover letter from your resume + JD in one click.", tag: "AI" },
              { icon: Layers, title: "Multiple Resume Versions", desc: "Save & revisit a tailored copy for every job you apply to.", tag: "Saved" },
              { icon: GitCompare, title: "Before / After Diff", desc: "See exactly what changed with word-level highlighting.", tag: "Visual" },
              { icon: Gauge, title: "Keyword Density Meter", desc: "Visual score per keyword so you hit ATS thresholds.", tag: "ATS" },
              { icon: SlidersHorizontal, title: "Rewrite Intensity", desc: "Choose Light polish, Balanced, or Aggressive rewrite.", tag: "Control" },
              { icon: Download, title: "Multi-Format Export", desc: "Download as PDF, DOCX, plain text, or Markdown.", tag: "4 formats" },
              { icon: Building2, title: "Company Research Brief", desc: "AI summary of the company + interview talking points.", tag: "Research" },
              { icon: GraduationCap, title: "Skill Gap Analysis", desc: "Targeted courses & certs to close the gaps fast.", tag: "Growth" },
            ].map(({ icon: Icon, title, desc, tag }) => (
              <div key={title} className="group relative rounded-2xl border border-border bg-background p-6 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition-all duration-300">
                <div className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5">{tag}</div>
                <div className="h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center mb-4 shadow-glow">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-7">
              <Link to="/auth">Try the full toolkit free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="container py-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-4xl font-bold tracking-tight">Three steps to a tailored resume</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { n: "01", t: "Upload", d: "Drop your resume as PDF, DOCX, or paste the text." },
              { n: "02", t: "Paste JD", d: "Add the job description you're applying for." },
              { n: "03", t: "Download", d: "Get your tailored resume and ATS report instantly." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl bg-background border border-border p-8 shadow-card">
                <div className="font-display text-5xl font-extrabold bg-gradient-primary bg-clip-text text-transparent">{s.n}</div>
                <h3 className="mt-3 font-display font-semibold text-xl">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-4xl font-bold tracking-tight">Simple, fair pricing</h2>
          <p className="mt-4 text-muted-foreground">Try it free. Upgrade when you need more.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-gradient-card p-8 shadow-card">
            <div className="text-sm font-semibold text-muted-foreground">Free</div>
            <div className="mt-2 font-display text-4xl font-bold">$0</div>
            <p className="mt-1 text-sm text-muted-foreground">Get started in seconds</p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> 1 resume optimization</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> ATS match score</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> PDF download</li>
            </ul>
            <Button asChild variant="outline" className="w-full mt-8"><Link to="/auth">Start free</Link></Button>
          </div>
          <div className="relative rounded-2xl border-2 border-primary bg-gradient-card p-8 shadow-glow">
            <div className="absolute -top-3 right-6 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1">Coming soon</div>
            <div className="text-sm font-semibold text-primary">Pro</div>
            <div className="mt-2 font-display text-4xl font-bold">$19<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
            <p className="mt-1 text-sm text-muted-foreground">For active job seekers</p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Unlimited optimizations</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> History & version tracking</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Cover letter generator</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Priority AI</li>
            </ul>
            <Button disabled className="w-full mt-8 bg-gradient-primary text-primary-foreground">Notify me</Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <div className="container">© {new Date().getFullYear()} Resume Tailor AI. Crafted to help you get hired.</div>
      </footer>
    </div>
  );
};

export default Index;
