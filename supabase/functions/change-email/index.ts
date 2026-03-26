import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentPassword, newEmail } = await req.json();

    if (!currentPassword || !newEmail) {
      return new Response(
        JSON.stringify({ error: "Mevcut şifre ve yeni e-posta adresi gereklidir." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      return new Response(
        JSON.stringify({ error: "Geçerli bir e-posta adresi giriniz." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the calling user from the JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Yetkilendirme gerekli." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Oturum doğrulanamadı." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify current password by attempting sign-in
    const verifyClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Mevcut şifre yanlış." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use admin API to directly update email (no confirmation needed)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      email: newEmail.trim(),
      email_confirm: true,
    });

    if (updateError) {
      console.error("Email update error:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message || "E-posta güncellenemedi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also update profiles table if iletisim_email matches old email
    const adminDb = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminDb
      .from("profiles")
      .select("iletisim_email")
      .eq("user_id", user.id)
      .single();

    if (profile?.iletisim_email?.toLowerCase() === user.email?.toLowerCase()) {
      await adminDb
        .from("profiles")
        .update({ iletisim_email: newEmail.trim() })
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("change-email error:", err);
    return new Response(
      JSON.stringify({ error: "Beklenmeyen bir hata oluştu." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
