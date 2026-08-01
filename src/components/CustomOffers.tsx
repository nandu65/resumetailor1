import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { payWithRazorpay } from "@/lib/razorpay";
import { toast } from "sonner";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  amount_paise: number;
  scans: number;
  status: string;
  expires_at: string | null;
  created_at: string;
}

interface Props {
  /** Called after a successful payment so the parent can refresh the scan counter. */
  onPaid?: () => void;
}

export function CustomOffers({ onPaid }: Props) {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("custom_offers")
      .select("id,title,description,amount_paise,scans,status,expires_at,created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const live = (data ?? []).filter(
      (o: Offer) => !o.expires_at || new Date(o.expires_at).getTime() > Date.now(),
    );
    setOffers(live as Offer[]);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const pay = async (offer: Offer) => {
    setPaying(offer.id);
    try {
      const res = await payWithRazorpay({
        amountInRupees: offer.amount_paise / 100,
        name: "ResumeShot",
        description: offer.title,
        receipt: `offer_${offer.id.slice(0, 8)}_${Date.now()}`,
        notes: { offer_id: offer.id },
        prefill: { email: user?.email ?? undefined },
      });
      if (!res.success) {
        if (res.error !== "Payment cancelled") toast.error(res.error || "Payment failed");
        return;
      }
      toast.success(
        offer.scans > 0
          ? `Payment successful — ${offer.scans} extra scan${offer.scans === 1 ? "" : "s"} added`
          : "Payment successful",
      );
      await load();
      onPaid?.();
    } finally {
      setPaying(null);
    }
  };

  if (offers.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {offers.map((o) => (
        <div
          key={o.id}
          className="rounded-2xl border border-primary/40 bg-primary/5 p-5 shadow-card flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-[220px] flex-1">
            <div className="rounded-lg bg-primary/15 p-2 shrink-0">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-semibold">{o.title}</h3>
                <Badge variant="secondary" className="text-[10px]">Personal offer</Badge>
              </div>
              {o.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{o.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {o.scans > 0 && <>Adds {o.scans} extra scan{o.scans === 1 ? "" : "s"} · </>}
                {o.expires_at
                  ? `Valid until ${new Date(o.expires_at).toLocaleDateString()}`
                  : "No expiry"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-display text-2xl font-bold">
                ₹{(o.amount_paise / 100).toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-muted-foreground">one-time</div>
            </div>
            <Button onClick={() => pay(o)} disabled={paying === o.id}>
              {paying === o.id
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Sparkles className="h-4 w-4 mr-2" />}
              Pay now
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
