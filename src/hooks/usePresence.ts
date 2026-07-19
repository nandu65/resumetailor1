import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Sends a lightweight "I'm online" heartbeat every 60s while a user is authed.
// Powers the admin dashboard's live "online now" counter.
export function usePresence() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const beat = async () => {
      if (cancelled) return;
      try {
        await (supabase as any).from("user_presence").upsert({
          user_id: user.id,
          last_seen: new Date().toISOString(),
          path: location.pathname.slice(0, 200),
        });
      } catch {}
    };
    beat();
    const iv = setInterval(beat, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user, location.pathname]);
}
