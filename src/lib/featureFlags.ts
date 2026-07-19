import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface FeatureFlag {
  key: string;
  description: string | null;
  enabled: boolean;
  plans: string[];
  rollout_percent: number;
}

let cache: FeatureFlag[] | null = null;
let cacheTs = 0;
const TTL = 60_000;

async function fetchFlags(): Promise<FeatureFlag[]> {
  if (cache && Date.now() - cacheTs < TTL) return cache;
  const { data } = await supabase.from("feature_flags").select("*");
  cache = (data ?? []) as FeatureFlag[];
  cacheTs = Date.now();
  return cache;
}

export function bustFlagCache() { cache = null; cacheTs = 0; }

/** deterministic 0-99 bucket from a string. */
function bucket(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

export function useFeatureFlag(key: string): boolean {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    (async () => {
      const flags = await fetchFlags();
      const f = flags.find((x) => x.key === key);
      if (!f || !f.enabled) return setEnabled(false);
      // Fetch plan
      let plan = "free";
      if (user?.id) {
        const { data } = await supabase.from("profiles").select("plan").eq("user_id", user.id).maybeSingle();
        plan = (data?.plan as string) || "free";
      }
      if (!f.plans.includes(plan)) return setEnabled(false);
      const key2 = `${user?.id ?? "anon"}:${f.key}`;
      setEnabled(bucket(key2) < (f.rollout_percent ?? 100));
    })();
  }, [key, user?.id]);
  return enabled;
}

export function useAllFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  useEffect(() => { fetchFlags().then(setFlags); }, []);
  return flags;
}
