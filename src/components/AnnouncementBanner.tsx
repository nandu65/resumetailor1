import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Megaphone, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Broadcast {
  id: string;
  subject: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  severity: string;
}

interface Recipient { id: string; broadcast_id: string; dismissed_at: string | null }

export function AnnouncementBanner() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ b: Broadcast; r: Recipient }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: recs } = await supabase
        .from("broadcast_recipients")
        .select("id,broadcast_id,dismissed_at")
        .eq("user_id", user.id)
        .is("dismissed_at", null);
      if (!recs?.length) return;
      const ids = recs.map((r) => r.broadcast_id);
      const { data: bs } = await supabase
        .from("broadcasts")
        .select("id,subject,body,cta_label,cta_url,severity,ends_at,status")
        .in("id", ids)
        .eq("status", "sent");
      const active = (bs ?? []).filter((b: any) => !b.ends_at || new Date(b.ends_at).getTime() > Date.now());
      setItems(active.map((b: any) => ({ b, r: recs.find((r) => r.broadcast_id === b.id)! })));
    })();
  }, [user]);

  const dismiss = async (recId: string, broadcastId: string) => {
    await supabase.from("broadcast_recipients").update({ dismissed_at: new Date().toISOString() }).eq("id", recId);
    setItems((prev) => prev.filter((i) => i.b.id !== broadcastId));
  };

  if (!items.length) return null;

  return (
    <div className="space-y-1.5">
      {items.map(({ b, r }) => {
        const cls =
          b.severity === "warn" ? "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200"
          : b.severity === "success" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
          : "bg-primary/10 border-primary/40 text-foreground";
        const Icon = b.severity === "warn" ? AlertTriangle : b.severity === "success" ? CheckCircle2 : Megaphone;
        return (
          <div key={b.id} className={`relative border rounded-lg px-4 py-2.5 flex items-start gap-3 ${cls}`}>
            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">{b.subject}</div>
              <div className="text-xs opacity-90 whitespace-pre-wrap">{b.body}</div>
              {b.cta_url && (
                <a href={b.cta_url} className="inline-block mt-1 text-xs font-medium underline">{b.cta_label || "Learn more"} →</a>
              )}
            </div>
            <button onClick={() => dismiss(r.id, b.id)} className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
