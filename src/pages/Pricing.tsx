import { Check, Zap, Sparkles, ArrowLeft, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { subscribeWithRazorpay } from "@/lib/razorpay";
import { useAuth } from "@/hooks/useAuth";

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
      "1 resume scan total",
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

  const handleSubscribe = async (tier: "basic" | "pro") => {
    if (!user) {
      toast({
        title: "Please sign in first",
        description: "You need an account to subscribe.",
      });
      navigate("/auth?redirect=/pricing");
      return;
    }

    setLoadingTier(tier);
    try {
      const result = await subscribeWithRazorpay({
        tier,
        prefill: { email: user.email ?? undefined },
      });

      if (result.success) {
        toast({
          title: "Subscription started 🎉",
          description:
            "Your plan will activate within a few seconds once payment confirms.",
        });
        // Give the webhook a moment to land before reloading the dashboard.
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-12 max-w-6xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Cancel anytime
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Pick the plan that fits your job hunt
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Monthly autopay via Razorpay UPI/Card. One job offer pays for this{" "}
            <span className="font-semibold text-foreground">1000x over.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isPaid = plan.tier !== "free";
            const isLoading = loadingTier === plan.tier;
            return (
              <div
                key={plan.tier}
                className={`rounded-3xl border p-7 flex flex-col relative overflow-hidden transition-shadow ${
                  plan.highlight
                    ? "border-primary/50 bg-gradient-card shadow-glow"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute top-0 right-0 bg-gradient-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-2xl tracking-wider">
                    MOST POPULAR
                  </div>
                )}

                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  {plan.tagline}
                </div>
                <div className="font-display text-2xl font-bold mb-1">
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1.5 mb-5">
                  <span className="font-display text-4xl font-extrabold">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.cadence}
                  </span>
                </div>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm leading-relaxed"
                    >
                      <span className="h-5 w-5 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center mt-0.5">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.tier === "free" ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate(user ? "/dashboard" : "/auth")}
                    className="w-full"
                  >
                    {user ? "Go to dashboard" : "Get started"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(plan.tier as "basic" | "pro")}
                    disabled={isLoading || authLoading}
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
                    {isLoading
                      ? "Opening checkout…"
                      : user
                        ? `Subscribe for ${plan.price}/mo`
                        : "Sign in to subscribe"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          Secure UPI / Card autopay via Razorpay · Cancel anytime from your
          dashboard · GST included
        </p>
      </div>
    </div>
  );
}
