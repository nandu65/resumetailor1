import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, FileText, Target, Zap, CheckCircle2, BarChart3, ShieldCheck, Mail, Layers, GitCompare, Gauge, SlidersHorizontal, Download, Building2, GraduationCap, Star, Quote, Lock, RefreshCw, Clock, Users, TrendingUp, ShieldOff, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { FloatingResume } from "@/components/FloatingResume";
import { TryNow } from "@/components/TryNow";
import razorpayLogo from "@/assets/razorpay.png.asset.json";
import swiggyLogo from "@/assets/swiggy.png.asset.json";
import flipkartLogo from "@/assets/flipkart.png.asset.json";
import zomatoLogo from "@/assets/zomato.png.asset.json";
import credLogo from "@/assets/cred.png.asset.json";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />




      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <FloatingResume />
        <div className="container relative pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground mb-8 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered resume optimization for every role
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight text-balance max-w-4xl mx-auto animate-fade-in-up">
            Land more interviews with a{" "}
            <span className="text-foreground">resume that fits</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance animate-fade-in-up">
            Paste any job description and we'll tailor your resume to beat ATS filters and impress recruiters — in seconds.
          </p>

          {/* Social proof counter */}
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent/60 px-4 py-2 text-sm font-semibold animate-fade-in">
            <TrendingUp className="h-4 w-4 text-primary" />
            <AnimatedCounter to={2000} suffix="+" /> <span className="text-muted-foreground font-medium">resumes optimized</span>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-in-up">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-7 text-base">
              <Link to="/auth">Upload Resume <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
              <Link to="/dashboard">See dashboard</Link>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: "🔒", text: "Your resume data is never shared" },
              { icon: "⚡", text: "Results in 30 seconds" },
              { icon: "🇮🇳", text: "Built for Indian job seekers" },
            ].map((b) => (
              <div key={b.text} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 backdrop-blur px-3.5 py-1.5 text-xs font-medium shadow-sm">
                <span className="text-sm">{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> 1 free optimization</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> ATS-tested format</span>
          </div>
        </div>
      </section>

      {/* Try before signup */}
      <TryNow />

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

      {/* Indian testimonials */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="container py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground mb-4">
              <Star className="h-3.5 w-3.5 fill-current" /> Real results from real users
            </div>
            <h2 className="font-display text-4xl font-bold tracking-tight">From rejected to recruited</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Priya S", city: "Bangalore", role: "Software Engineer", quote: "My ATS score went from 41 to 86 in minutes. Got 3 interview calls the same week!", initials: "PS" },
              { name: "Rahul M", city: "Delhi", role: "MBA Graduate", quote: "Finally understood why my resume was getting rejected. ResumeShot fixed it instantly.", initials: "RM" },
              { name: "Sneha K", city: "Mumbai", role: "Marketing Professional", quote: "Worth every rupee. Landed my dream job within 2 weeks of using ResumeShot.", initials: "SK" },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-background p-7 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition-all">
                <Quote className="h-6 w-6 text-primary/40 mb-3" />
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}
                </div>
                <p className="text-sm leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3 pt-4 border-t border-border">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-glow">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}, {t.city}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By logos */}
      <section className="border-b border-border bg-background">
        <div className="container py-12">
          <div className="text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-8">
            Our users have been hired at
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 md:gap-x-12 max-w-4xl mx-auto">
            {[
              { name: "Razorpay", color: "#0C2451", accent: "#3395FF" },
              { name: "Swiggy",   color: "#FC8019", accent: "#FFB37A" },
              { name: "Flipkart", color: "#2874F0", accent: "#FFE500" },
              { name: "Zomato",   color: "#E23744", accent: "#FF7E82" },
              { name: "CRED",     color: "#0F0F0F", accent: "#7A7A7A" },
            ].map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-2.5 opacity-90 hover:opacity-100 hover:-translate-y-0.5 transition-all duration-300"
                style={{ color: c.color }}
                title={c.name}
              >
                {/* Inline SVG brand chip — no network, always colored, retina-crisp */}
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 40 40"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 md:h-9 md:w-9 shrink-0"
                  aria-hidden="true"
                >
                  <rect width="40" height="40" rx="9" fill={c.color} />
                  <rect x="4" y="4" width="32" height="32" rx="6" fill={c.accent} fillOpacity="0.18" />
                  <text
                    x="50%"
                    y="54%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
                    fontWeight="900"
                    fontSize="20"
                    fill="#ffffff"
                  >
                    {c.name.charAt(0)}
                  </text>
                </svg>
                <span
                  className="font-display font-extrabold text-2xl md:text-3xl tracking-tight leading-none"
                  style={{ color: c.color }}
                >
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy / security trust section */}
      <section className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground mb-4">
            <ShieldCheck className="h-3.5 w-3.5" /> Privacy-first by design
          </div>
          <h2 className="font-display text-4xl font-bold tracking-tight">Your privacy is our priority</h2>
          <p className="mt-4 text-muted-foreground">We treat your resume like our own — locked down, encrypted, and never sold.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {[
            { icon: Trash2, t: "Never stored permanently", d: "Your resume is processed in memory and removed from active use after your session." },
            { icon: Clock, t: "Auto-deleted after 24 hours", d: "Raw uploads and intermediate AI inputs are purged within 24 hours, automatically." },
            { icon: KeyRound, t: "256-bit AES encryption", d: "TLS 1.3 in transit, AES-256 at rest. The same encryption banks use." },
            { icon: ShieldOff, t: "Never sold to third parties", d: "No ads, no data brokers, no AI training on your content. Ever." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card hover:shadow-elegant transition-all">
              <div className="h-11 w-11 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold">{t}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{d}</p>
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
              { icon: Mail, title: "Cover Letter Generator", desc: "Tailored cover letter from your resume + JD in one click.", tag: "AI", to: "/tools/cover-letter" },
              { icon: Layers, title: "Multiple Resume Versions", desc: "Save & revisit a tailored copy for every job you apply to.", tag: "Saved", to: "/dashboard" },
              { icon: GitCompare, title: "Before / After Diff", desc: "See exactly what changed with word-level highlighting.", tag: "Visual", to: "/tools/diff" },
              { icon: Gauge, title: "Keyword Density Meter", desc: "Visual score per keyword so you hit ATS thresholds.", tag: "ATS", to: "/tools/keyword-density" },
              { icon: SlidersHorizontal, title: "Rewrite Intensity", desc: "Choose Light polish, Balanced, or Aggressive rewrite.", tag: "Control", to: "/dashboard" },
              { icon: Download, title: "Multi-Format Export", desc: "Download as PDF, DOCX, plain text, or Markdown.", tag: "4 formats", to: "/dashboard" },
              { icon: Building2, title: "Company Research Brief", desc: "AI summary of the company + interview talking points.", tag: "Research", to: "/tools/company-brief" },
              { icon: GraduationCap, title: "Skill Gap Analysis", desc: "Targeted courses & certs to close the gaps fast.", tag: "Growth", to: "/tools/skill-gap" },
            ].map(({ icon: Icon, title, desc, tag, to }) => (
              <Link to={to} key={title} className="group relative rounded-2xl border border-border bg-background p-6 shadow-card hover:shadow-elegant hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-300 block">
                <div className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5">{tag}</div>
                <div className="h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center mb-4 shadow-glow">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold group-hover:text-primary transition-colors">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
                <div className="mt-3 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">Open tool →</div>
              </Link>
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
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-4xl font-bold tracking-tight">Three steps to a tailored resume</h2>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Connecting line — desktop */}
            <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-1 rounded-full bg-gradient-to-r from-primary via-primary to-primary" />
            {/* Connecting line — mobile */}
            <div className="md:hidden absolute top-10 left-1/2 -translate-x-1/2 w-1 h-[calc(100%-5rem)] rounded-full bg-gradient-to-b from-primary to-primary" />

            <div className="grid md:grid-cols-3 gap-10 md:gap-8">
              {[
                { t: "Upload", d: "Drop your resume as PDF, DOCX, or paste the text." },
                { t: "Paste JD", d: "Add the job description you're applying for." },
                { t: "Download", d: "Get your tailored resume and ATS report instantly." },
              ].map((s, i) => (
                <div key={i} className="relative flex flex-col items-center text-center">
                  {/* Numbered green circle */}
                  <div className="relative z-10 h-16 w-16 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-display text-2xl font-extrabold shadow-glow ring-4 ring-background">
                    {i + 1}
                  </div>
                  <div className="mt-6 rounded-2xl bg-background border border-border p-7 shadow-card w-full">
                    <h3 className="font-display font-semibold text-xl">{s.t}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
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
            <div className="absolute -top-3 right-6 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1">Lifetime · 90% off</div>
            <div className="text-sm font-semibold text-primary">Pro</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold">₹99</span>
              <span className="text-base text-muted-foreground line-through">₹999</span>
              <span className="text-xs text-muted-foreground font-normal">one-time</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">One job offer pays for this <span className="font-semibold text-foreground">1000x over.</span></p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Unlimited optimizations</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> History & version tracking</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Cover letter generator</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Priority AI</li>
            </ul>
            <Button asChild className="w-full mt-8 bg-gradient-primary text-primary-foreground hover:opacity-90"><Link to="/pricing">Unlock Pro for ₹99</Link></Button>
          </div>
        </div>
      </section>

      {/* Trust strip / Stats */}
      <section className="border-y border-border bg-gradient-to-r from-accent/30 via-background to-accent/30">
        <div className="container py-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Users, n: "12,400+", l: "Resumes tailored" },
            { icon: TrendingUp, n: "3.2x", l: "More interview calls" },
            { icon: Clock, n: "<30s", l: "Average turnaround" },
            { icon: ShieldCheck, n: "100%", l: "Private & encrypted" },
          ].map(({ icon: Icon, n, l }) => (
            <div key={l} className="flex flex-col items-center">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-display text-2xl md:text-3xl font-extrabold">{n}</div>
              <div className="text-xs text-muted-foreground mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground mb-4">
            <Star className="h-3.5 w-3.5 fill-current" /> Loved by job seekers across India
          </div>
          <h2 className="font-display text-4xl font-bold tracking-tight">From "no replies" to "offer accepted"</h2>
          <p className="mt-4 text-muted-foreground">Real stories from people who landed roles after tailoring with us.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Aditya Sharma", role: "SDE-2 @ Razorpay", quote: "Went from 2 callbacks in 3 months to 7 in two weeks. The keyword gap report was a game-changer.", initials: "AS" },
            { name: "Priya Iyer", role: "Product Manager @ Swiggy", quote: "I tailored 14 resumes for 14 different PM roles in one weekend. Got 5 first-round interviews.", initials: "PI" },
            { name: "Rohan Mehta", role: "Data Analyst @ Flipkart", quote: "The ATS score jumped from 42 to 89 after one rewrite. Recruiters started reaching out within days.", initials: "RM" },
            { name: "Sneha Kapoor", role: "UX Designer @ Zomato", quote: "Worth ₹99 a hundred times over. The cover letter generator alone saved me 6+ hours per week.", initials: "SK" },
            { name: "Vikram Singh", role: "Marketing Lead @ CRED", quote: "Finally a tool that doesn't make my resume sound robotic. The bullets read like I actually wrote them.", initials: "VS" },
            { name: "Ananya Reddy", role: "New Grad → Microsoft", quote: "As a fresher I had no clue what recruiters wanted. The skill-gap analysis told me exactly what to learn.", initials: "AR" },
          ].map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-gradient-card p-7 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition-all">
              <Quote className="h-6 w-6 text-primary/40 mb-3" />
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}
              </div>
              <p className="text-sm leading-relaxed">"{t.quote}"</p>
              <div className="mt-5 flex items-center gap-3 pt-4 border-t border-border">
                <div className="h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-glow">
                  {t.initials}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust badges row */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="container py-12">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Lock, t: "Bank-grade security", d: "256-bit encryption. Your resume is never shared, sold, or used to train AI models." },
              { icon: RefreshCw, t: "Cancel anytime", d: "No lock-ins. Cancel your plan in one click — keep access till the end of the billing cycle." },
              { icon: ShieldCheck, t: "7-day refund window", d: "Not happy? Email us within 7 days for a full no-questions-asked refund." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex gap-4 rounded-2xl bg-background border border-border p-6 shadow-card">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-accent text-primary flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">{t}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-4xl font-bold tracking-tight">Frequently asked questions</h2>
          <p className="mt-4 text-muted-foreground">Everything about pricing, refunds, privacy, and how it works.</p>
        </div>
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-gradient-card p-2 md:p-6 shadow-card">
          <Accordion type="single" collapsible className="w-full">
            {[
              { q: "How does the free plan work?", a: "Sign up and you get 1 free resume optimization — no credit card required. You'll see your full ATS score, keyword gaps, and a tailored rewrite. Upgrade only if you want more scans." },
              { q: "What's included in Basic (₹49) and Pro (₹99)?", a: "Basic gives you 10 scans/month. Pro gives you 50 scans/month plus priority AI processing, the cover letter generator, company research briefs, and skill-gap analysis. Both renew monthly." },
              { q: "Can I cancel my subscription anytime?", a: "Yes — 100%. Go to Pricing → Manage subscription → Cancel. You keep access till the end of your current billing cycle. No cancellation fees, no lock-in, no email-us-to-cancel nonsense." },
              { q: "What's your refund policy?", a: "If you're unhappy within 7 days of purchase, email us and we'll refund you in full — no questions asked. Refunds reach your account in 5–7 business days. Read full policy on the Refund page." },
              { q: "Is my resume data safe? Do you train AI on it?", a: "Your resume is encrypted in transit (TLS 1.3) and at rest (AES-256). We never sell your data, never share it with third parties, and never use it to train AI models. You can delete your account and all data anytime from the dashboard." },
              { q: "Which payment methods do you accept?", a: "All major UPI apps (GPay, PhonePe, Paytm), credit/debit cards (Visa, Mastercard, RuPay, Amex), net banking, and wallets — securely processed by Razorpay." },
              { q: "Will my resume actually pass ATS systems?", a: "Yes. We test against the same parsers used by Workday, Greenhouse, Lever, and Taleo. Our PDF exports use selectable text (no images) and a clean single-column layout that ATS bots love." },
              { q: "Do you support resumes for non-tech roles?", a: "Absolutely. Marketing, design, sales, finance, operations, healthcare, education — the AI adapts to the role and industry in your job description." },
              { q: "What file formats can I upload and download?", a: "Upload: PDF, DOCX, or paste plain text. Download: PDF, DOCX, plain text, or Markdown." },
              { q: "I need help — how do I contact support?", a: "Email us at Support.resumeshot@gmail.com and we typically reply within 24 hours (usually much faster on weekdays)." },
            ].map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left font-display font-semibold hover:no-underline px-3">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed px-3">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 md:p-16 text-center shadow-glow">
          <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-primary-foreground tracking-tight">
              Your next interview is one tailor away.
            </h2>
            <p className="mt-4 text-primary-foreground/90 max-w-xl mx-auto">
              Join 12,000+ job seekers who stopped sending the same resume to every job.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="h-12 px-7 text-base font-semibold">
                <Link to="/auth">Start free — 1 scan on us <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-sm text-muted-foreground">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} ResumeShot. Crafted to help you get hired.</div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
            <a href="mailto:support.resumeshot@gmail.com" className="hover:text-primary transition-colors">Support</a>
          </nav>
        </div>
      </footer>

      <ExitIntentPopup />
    </div>
  );
};

export default Index;
