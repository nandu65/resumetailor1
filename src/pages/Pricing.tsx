import { Check, Zap, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { payWithRazorpay } from "@/lib/razorpay";

const features = [
  "Unlimited ATS scans with Gemini 2.5",
  "All missing keywords unlocked",
  "Full AI rewrite suggestions (no blur)",
  "Recruiter Appeal score & deep insights",
  "Tailored cover letters for every JD",
  "Skill-gap analysis & company briefs",
  "PDF export with ATS-safe formatting",
  "Priority support",
];

export default function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const result = await payWithRazorpay({
        amountInRupees: 99,
        description: "ResumeTailor Pro · Lifetime",
        notes: { plan: "pro_lifetime" },
      });

      if (result.success) {
        toast({
          title: "Payment successful 🎉",
          description: `Pro unlocked. Payment ID: ${result.razorpay_payment_id}`,
        });
      } else {
        toast({
          title: "Payment not completed",
          description: result.error ?? "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-12 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Limited launch pricing
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Land your next role for less than a coffee
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            One small payment unlocks every tool, every keyword, every rewrite.
            One job offer pays for this <span className="font-semibold text-foreground">1000x over.</span>
          </p>
        </div>

        <div className="rounded-3xl border-2 border-primary/40 bg-gradient-card p-8 md:p-10 shadow-glow relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-bl-2xl">
            BEST VALUE
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-10">
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                Pro · Lifetime
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-6xl font-extrabold">₹99</span>
                <span className="text-muted-foreground line-through">₹999</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  90% off
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                One-time payment. No subscription. Yours forever.
              </p>
            </div>

            <Button
              onClick={handleUpgrade}
              size="lg"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-14 px-8 text-base font-semibold"
            >
              <Zap className="h-5 w-5 mr-2" />
              Unlock Pro for ₹99
            </Button>
          </div>

          <div className="border-t border-border mt-8 pt-8">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              What you get
            </div>
            <ul className="grid sm:grid-cols-2 gap-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <span className="h-5 w-5 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Secure checkout · Instant access · 7-day money-back guarantee
        </p>
      </div>
    </div>
  );
}
