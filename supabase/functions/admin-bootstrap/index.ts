import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "nandunaidu656565@gmail.com";
const ADMIN_PASSWORD = "Lagupudi@65";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find existing user by listing (paginated search)
    let existingId: string | null = null;
    let page = 1;
    while (page <= 20) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const found = data.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
      if (found) { existingId = found.id; break; }
      if (data.users.length < 200) break;
      page++;
    }

    if (existingId) {
      const { error } = await admin.auth.admin.updateUserById(existingId, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ status: "updated", user_id: existingId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (createErr) throw createErr;
    return new Response(JSON.stringify({ status: "created", user_id: created.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
