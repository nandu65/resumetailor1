import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "exit_intent_shown_v1";

export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const armed = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Arm after 5s to avoid instant triggers
    const t = setTimeout(() => { armed.current = true; }, 5000);

    const onMouseLeave = (e: MouseEvent) => {
      if (!armed.current) return;
      if (e.clientY <= 0 && !open) {
        setOpen(true);
        localStorage.setItem(STORAGE_KEY, "1");
        document.removeEventListener("mouseleave", onMouseLeave);
      }
    };
    document.addEventListener("mouseleave", onMouseLeave);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("leads").insert({ email: trimmed, source: "exit_intent", granted: false });
    setLoading(false);
    if (error && !String(error.message).toLowerCase().includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    toast.success("Locked in! Your bonus scan is waiting — just sign up with this email.");
    setOpen(false);
    // Redirect to auth so they convert
    setTimeout(() => { window.location.href = `/auth?email=${encodeURIComponent(trimmed)}`; }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
            <Gift className="h-6 w-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center font-display text-2xl">Wait! Don't leave yet</DialogTitle>
          <DialogDescription className="text-center">
            Get <span className="font-semibold text-foreground">1 extra free scan</span> on us when you sign up with this email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Sparkles className="h-4 w-4 mr-1.5" />
            {loading ? "Claiming…" : "Claim My Free Scan"}
          </Button>
          <button type="button" onClick={() => setOpen(false)} className="block mx-auto text-xs text-muted-foreground hover:text-foreground">
            No thanks, I'll pass
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
