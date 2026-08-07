import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCheck, CheckCircle2, Info, Loader2 } from "lucide-react";

interface Notification {
  id: string; type: string; title: string; body: string; severity: string;
  cta_label: string | null; cta_url: string | null; read_at: string | null; created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_notifications")
      .select("id,type,title,body,severity,cta_label,cta_url,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as Notification[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel("notifications-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        (p) => setItems((prev) => [p.new as Notification, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const unread = items.filter((i) => !i.read_at).length;

  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: i.read_at ?? now } : i)));
    await supabase.from("user_notifications").update({ read_at: now }).eq("id", id);
  };

  const markAllRead = async () => {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.read_at ? i : { ...i, read_at: now })));
    await supabase.from("user_notifications").update({ read_at: now }).in("id", ids);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unread > 0 ? `${unread} unread message${unread > 1 ? "s" : ""}` : "You're all caught up."}
            </p>
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4 mr-2" /> Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-14 text-center text-sm text-muted-foreground">No notifications yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {items.map((n) => {
              if (!n) return null;
              const Icon = n.severity === "warn" ? AlertTriangle : n.severity === "success" ? CheckCircle2 : Info;
              const tone = n.severity === "warn" ? "text-amber-600 dark:text-amber-400"
                : n.severity === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-primary";
              return (
                <Card key={n.id} className={n.read_at ? "" : "border-primary/40 bg-primary/5"}>
                  <CardContent className="p-4 flex gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${tone}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold">{n.title}</h2>
                        {!n.read_at && <Badge className="text-[0.6rem]">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{n.body}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                        {n.cta_url && (
                          <Link to={n.cta_url} className="text-xs font-medium text-primary hover:underline">
                            {n.cta_label || "Open"} →
                          </Link>
                        )}
                        {!n.read_at && (
                          <button onClick={() => markRead(n.id)} className="text-xs text-muted-foreground hover:underline">
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
