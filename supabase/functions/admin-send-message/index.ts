import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "nandunaidu656565@gmail.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MESSAGE_TYPES = [
  "subscription_activated",
  "subscription_expiring",
  "subscription_expired",
  "payment_issue",
  "warning",
  "account_notice",
  "feature_update",
  "general",
  "custom",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Admin check: hardcoded owner OR user_roles admin
    let isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (!isAdmin) {
      const { data: role } = await admin
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      isAdmin = !!role;
    }
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "search_users") {
      const q = String(body?.query ?? "").trim();
      let query = admin
        .from("profiles")
        .select("user_id,email,display_name,plan,subscription_status,current_period_end,status,banned_at,scans_used_month,bonus_scans,created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (q) {
        const isUuid = /^[0-9a-f-]{8,}$/i.test(q) && q.includes("-");
        query = isUuid
          ? query.eq("user_id", q)
          : query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return json({ users: data ?? [] });
    }

    if (action === "history") {
      const q = String(body?.query ?? "").trim();
      const typeFilter = String(body?.type ?? "").trim();
      let query = admin
        .from("admin_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (q) query = query.or(`recipient_email.ilike.%${q}%,recipient_name.ilike.%${q}%,title.ilike.%${q}%`);
      if (typeFilter && typeFilter !== "all") query = query.eq("message_type", typeFilter);
      const { data, error } = await query;
      if (error) throw error;

      const ids = (data ?? []).map((m: any) => m.notification_id).filter(Boolean);
      const readMap: Record<string, string | null> = {};
      if (ids.length) {
        const { data: notes } = await admin
          .from("user_notifications").select("id,read_at").in("id", ids);
        (notes ?? []).forEach((n: any) => { readMap[n.id] = n.read_at; });
      }
      return json({
        messages: (data ?? []).map((m: any) => ({ ...m, read_at: m.notification_id ? readMap[m.notification_id] ?? null : null })),
      });
    }

    if (action === "send") {
      const recipient = String(body?.user_id ?? "").trim();
      const title = String(body?.title ?? "").trim();
      const messageBody = String(body?.body ?? "").trim();
      const messageType = MESSAGE_TYPES.includes(String(body?.message_type)) ? String(body.message_type) : "general";
      const severity = ["info", "success", "warn"].includes(String(body?.severity)) ? String(body.severity) : "info";
      const ctaLabel = body?.cta_label ? String(body.cta_label).slice(0, 60) : null;
      const ctaUrl = body?.cta_url ? String(body.cta_url).slice(0, 300) : null;

      if (!recipient) return json({ error: "Recipient is required" }, 400);
      if (!title || title.length > 150) return json({ error: "Title is required (max 150 chars)" }, 400);
      if (!messageBody || messageBody.length > 4000) return json({ error: "Message body is required (max 4000 chars)" }, 400);

      const { data: profile } = await admin
        .from("profiles").select("user_id,email,display_name").eq("user_id", recipient).maybeSingle();
      if (!profile) return json({ error: "User not found" }, 404);

      const { data: note, error: noteErr } = await admin
        .from("user_notifications")
        .insert({
          user_id: recipient,
          type: `admin_${messageType}`,
          title,
          body: messageBody,
          severity,
          cta_label: ctaLabel,
          cta_url: ctaUrl,
          metadata: { source: "admin_message", message_type: messageType },
        })
        .select("id")
        .single();
      if (noteErr) throw noteErr;

      const { data: logged, error: logErr } = await admin
        .from("admin_messages")
        .insert({
          recipient_user_id: recipient,
          recipient_email: profile.email,
          recipient_name: profile.display_name,
          message_type: messageType,
          title,
          body: messageBody,
          severity,
          cta_label: ctaLabel,
          cta_url: ctaUrl,
          notification_id: note.id,
          sent_by: user.email ?? user.id,
        })
        .select("*")
        .single();
      if (logErr) throw logErr;

      return json({ ok: true, message: logged });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
