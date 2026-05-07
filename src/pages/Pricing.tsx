import { Check, Zap, Sparkles, ArrowLeft, Loader2, Lock, ShieldCheck, X, ArrowDown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { subscribeWithRazorpay } from "@/lib/razorpay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Tier = "free" | "basic" | "pro";

const PLANS: Array<{
  tier: Tier;
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  highlight?: boolean;
  features: string[];
}> = [
  {
    tier: "free",
    name: "Free",
    price: "₹0",
    cadence: "forever",
    tagline: "Try it out",
    features: [
      "1 resume scan only",
      "ATS score (blurred breakdown)",
      "First 2 missing keywords only",
      "No downloads",
    ],
  },
  {
    tier: "basic",
    name: "Basic",
    price: "₹49",
    cadence: "/month · autopay",
    tagline: "Land more interviews",
    features: [
      "10 scans / month",
      "Full ATS score breakdown",
      "All missing keywords",
      "PDF download",
      "No AI writing features",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "₹99",
    cadence: "/month · autopay",
    tagline: "Land your next role",
    highlight: true,
    features: [
      "50 scans / month",
      "Everything in Basic",
      "AI bullet rewrites",
      "Suggested profile summary",
      "Cover letter generator",
      "Company research brief",
      "Skill gap analysis",
      "Word / TXT / PDF download",
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);
  const [profile, setProfile] = useState<{
    plan: Tier;
    subscription_status: string;
    current_period_end: string | null;
    scans_used_month: number;
    pending_plan: string | null;
    payment_failed: boolean;
  } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [downgrading, setDowngrading] = useState(false);

  const loadProfile = () => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("plan, subscription_status, current_period_end, scans_used_month, pending_plan, payment_failed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => data && setProfile(data as any));
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const currentPlan: Tier = (profile?.plan as Tier) ?? "free";
  const isActive = profile?.subscription_status === "active";

  const handleSubscribe = async (tier: "basic" | "pro") => {
    if (!user) {
      toast({ title: "Please sign in first", description: "You need an account to subscribe." });
      navigate("/auth?redirect=/pricing");
      return;
    }
    setLoadingTier(tier);
    try {
      const result = await subscribeWithRazorpay({ tier, prefill: { email: user.email ?? undefined } });
      if (result.success) {
        toast({
          title: "Subscription started 🎉",
          description: "Your plan will activate within a few seconds once payment confirms.",
        });
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        toast({
          title: "Checkout not completed",
          description: result.error ?? "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingTier(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? You'll keep access until the end of your current billing cycle.")) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-cancel-subscription");
      if (error || (data as any)?.error) {
        toast({
          title: "Could not cancel",
          description: (error as any)?.message || (data as any)?.error || "Try again",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Subscription cancelled",
        description: "You'll retain access until the end of the current billing period.",
      });
      loadProfile();
    } finally {
      setCancelling(false);
    }
  };

  const handleDowngrade = async (tier: "basic") => {
    const cycleEnd = profile?.current_period_end ? new Date(profile.current_period_end).toLocaleDateString() : "the end of your current cycle";
    if (!confirm(`Downgrade to Basic? You'll keep Pro access until ${cycleEnd}. Basic plan starts from next billing cycle.`)) return;
    setDowngrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-change-plan", { body: { tier } });
      if (error || (data as any)?.error) {
        toast({ title: "Could not schedule downgrade", description: (error as any)?.message || (data as any)?.error || "Try again", variant: "destructive" });
        return;
      }
      toast({ title: "Downgrade scheduled", description: `You'll keep Pro access until ${cycleEnd}. Basic plan starts from next billing cycle.` });
      loadProfile();
    } finally {
      setDowngrading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-12 max-w-6xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Cancel anytime · Secure UPI/Card autopay
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Pick the plan that fits your job hunt
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Monthly autopay via Razorpay. One job offer pays for this{" "}
            <span className="font-semibold text-foreground">1000x over.</span>
          </p>
        </div>

        {/* Current subscription banner */}
        {user && isActive && currentPlan !== "free" && (
          <div className="mb-8 rounded-2xl border border-primary/40 bg-gradient-card p-5 shadow-card flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display font-semibold text-base">
                  You're on the <span className="capitalize text-primary">{currentPlan}</span> plan
                </div>
                <div className="text-xs text-muted-foreground">
                  {profile?.scans_used_month ?? 0} scans used this month
                  {profile?.current_period_end && ` · renews ${new Date(profile.current_period_end).toLocaleDateString()}`}
                </div>
              </div>
            </div>
            <Button onClick={handleCancel} variant="outline" size="sm" disabled={cancelling}>
              {cancelling ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1.5" />}
              Cancel subscription
            </Button>
          </div>
        )}

        {profile?.payment_failed && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <span className="font-semibold text-destructive">Payment failed.</span> Please update your payment method, or email{" "}
            <a className="underline text-primary" href="mailto:support.resumeshot@gmail.com">support.resumeshot@gmail.com</a>.
          </div>
        )}

        {profile?.pending_plan && profile.pending_plan !== currentPlan && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            You'll keep <span className="capitalize font-semibold">{currentPlan}</span> access until{" "}
            <span className="font-semibold">{profile.current_period_end ? new Date(profile.current_period_end).toLocaleDateString() : "the end of this cycle"}</span>.{" "}
            <span className="capitalize font-semibold">{profile.pending_plan}</span> plan starts from next billing cycle.
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isLoading = loadingTier === plan.tier;
            const isCurrent = user && plan.tier === currentPlan && (plan.tier === "free" || isActive);
            const isBlurred = false;

            return (
              <div key={plan.tier} className="relative">
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-gradient-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 shadow-glow">
                    Your plan
                  </div>
                )}
                <div
                  className={`rounded-3xl border p-7 flex flex-col relative overflow-hidden transition-all h-full ${
                    isCurrent
                      ? "border-primary bg-gradient-card shadow-glow ring-2 ring-primary/30"
                      : plan.highlight
                        ? "border-primary/50 bg-gradient-card shadow-glow"
                        : "border-border bg-card"
                  } ${isBlurred ? "opacity-60" : ""}`}
                >
                  <div className={isBlurred ? "blur-[2px] pointer-events-none select-none" : ""}>
                    {plan.highlight && !isCurrent && (
                      <div className="absolute top-0 right-0 bg-gradient-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-2xl tracking-wider">
                        MOST POPULAR
                      </div>
                    )}

                    <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                      {plan.tagline}
                    </div>
                    <div className="font-display text-2xl font-bold mb-1">{plan.name}</div>
                    <div className="flex items-baseline gap-1.5 mb-5">
                      <span className="font-display text-4xl font-extrabold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                    </div>

                    <ul className="space-y-2.5 mb-7 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm leading-relaxed">
                          <span className="h-5 w-5 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center mt-0.5">
                            <Check className="h-3 w-3" />
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Lock overlay for blurred plans */}
                  {isBlurred && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10">
                      <div className="h-12 w-12 rounded-full bg-background/90 border border-border flex items-center justify-center mb-3 shadow-md">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-semibold">Not your current plan</div>
                      <div className="text-xs text-muted-foreground mt-1">Cancel your active plan to switch</div>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="mt-auto pt-2">
                    {isCurrent ? (
                      <Button variant="outline" disabled className="w-full">
                        <Check className="h-4 w-4 mr-2" /> Current plan
                      </Button>
                    ) : plan.tier === "free" ? (
                      <Button variant="outline" onClick={() => navigate(user ? "/dashboard" : "/auth")} className="w-full" disabled={isBlurred}>
                        {user ? "Go to dashboard" : "Get started"}
                      </Button>
                    ) : currentPlan === "pro" && plan.tier === "basic" && isActive ? (
                      <Button
                        onClick={() => handleDowngrade("basic")}
                        disabled={downgrading || profile?.pending_plan === "basic"}
                        variant="outline"
                        className="w-full h-12 text-base font-semibold"
                      >
                        {downgrading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowDown className="h-4 w-4 mr-2" />
                        )}
                        {profile?.pending_plan === "basic" ? "Downgrade scheduled" : "Downgrade to Basic"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe(plan.tier as "basic" | "pro")}
                        disabled={isLoading || authLoading || isBlurred}
                        className={
                          plan.highlight
                            ? "w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 text-base font-semibold"
                            : "w-full h-12 text-base font-semibold"
                        }
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : user ? (
                          <Zap className="h-4 w-4 mr-2" />
                        ) : (
                          <Lock className="h-4 w-4 mr-2" />
                        )}
                        {isLoading ? "Opening checkout…" : user ? (currentPlan === "basic" && plan.tier === "pro" ? `Upgrade to Pro – ${plan.price}/mo` : `Subscribe for ${plan.price}/mo`) : "Sign in to subscribe"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <section className="mt-20 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-center">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card divide-y">
            <AccordionItem value="ats" className="px-5">
              <AccordionTrigger className="text-left">What is an ATS score?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                ATS (Applicant Tracking System) score reflects how well your resume matches a job description on the keywords, skills,
                and signals recruiters' software looks for. We benchmark against the JD and surface what's missing so you can fix it.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="data-use" className="px-5">
              <AccordionTrigger className="text-left">How is my resume data used?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Only to generate your tailored resume, ATS analysis, and AI outputs. We never sell your data and AI providers are
                contractually blocked from training on it. See our <Link className="text-primary underline" to="/privacy-policy">Privacy Policy</Link>.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cancel" className="px-5">
              <AccordionTrigger className="text-left">Can I cancel anytime?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes. Cancel from your dashboard or the Pricing page. Autopay stops immediately and you keep paid features
                until the end of the current billing cycle.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="limit" className="px-5">
              <AccordionTrigger className="text-left">What happens when I hit my scan limit?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Your scans reset on the first day of each billing cycle. If you run out, upgrade to a higher tier or wait for the next renewal.
                Free users get 1 scan; Basic 10/month; Pro 50/month.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="storage" className="px-5">
              <AccordionTrigger className="text-left">Is my resume data stored?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes — securely, only so you can revisit your past tailored versions. You can delete any version anytime, or close your
                account to wipe everything within 30 days.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="basic-vs-pro" className="px-5">
              <AccordionTrigger className="text-left">How is Basic different from Pro?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Basic (₹49/mo) gives 10 scans, full ATS breakdown, all missing keywords and PDF download — no AI writing.
                Pro (₹99/mo) gives 50 scans plus AI bullet rewrites, profile summary, cover letter, company brief,
                skill gap analysis and Word/TXT/PDF downloads.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Secure UPI / Card autopay via Razorpay · Cancel anytime · GST included ·{" "}
          <Link to="/terms-of-service" className="underline hover:text-primary">Terms</Link> ·{" "}
          <Link to="/privacy-policy" className="underline hover:text-primary">Privacy</Link> ·{" "}
          <Link to="/refund-policy" className="underline hover:text-primary">Refund Policy</Link>
        </p>
      </div>
    </div>
  );
}
