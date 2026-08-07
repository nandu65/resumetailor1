import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, CheckCheck, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: string;
  cta_label: string | null;
  cta_url: string | null;
  read_at: string | null;
  created_at: string;
}

function timeAgo(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 0) return "just now";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_notifications")
      .select("id,type,title,body,severity,cta_label,cta_url,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notification[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    load();
    const channelName = `user-notifications-${user.id}`;
    
    // Cleanup any existing channel with this name before creating a new one
    // This is a defensive measure against React StrictMode or fast re-renders
    supabase.removeChannel(supabase.channel(channelName));

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "user_notifications", 
          filter: `user_id=eq.${user.id}` 
        },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev].slice(0, 20))
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to notifications');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  if (!user) return null;

  const unread = items.filter((i) => !i.read_at).length;

  const markAllRead = async () => {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.read_at ? i : { ...i, read_at: now })));
    await supabase.from("user_notifications").update({ read_at: now }).in("id", ids);
  };

  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: i.read_at ?? now } : i)));
    await supabase.from("user_notifications").update({ read_at: now }).eq("id", id);
  };

  return (
    <DropdownMenu onOpenChange={(o) => o && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative px-2" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.05rem] h-[1.05rem] px-1 rounded-full bg-destructive text-destructive-foreground text-[0.6rem] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[22rem] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">You're all caught up.</div>
          ) : (
            items.map((n) => {
              if (!n) return null;
              const Icon = n.severity === "warn" ? AlertTriangle : n.severity === "success" ? CheckCircle2 : Info;
              const tone =
                n.severity === "warn" ? "text-amber-600 dark:text-amber-400"
                : n.severity === "success" ? "text-emerald-600 dark:text-emerald-400"
                : "text-primary";
              return (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`px-3 py-2.5 border-b last:border-b-0 cursor-default ${n.read_at ? "" : "bg-primary/5"}`}
                >
                  <div className="flex gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${tone}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold">{n.title}</div>
                      <p className="text-[0.7rem] text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[0.65rem] text-muted-foreground">{timeAgo(n.created_at)}</span>
                        {n.cta_url && (
                          <Link to={n.cta_url} className="text-[0.65rem] font-medium text-primary hover:underline">
                            {n.cta_label || "Open"} →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <Link to="/notifications" className="block px-3 py-2 border-t text-center text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
