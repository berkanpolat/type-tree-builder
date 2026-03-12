import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header yok");

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Kullanıcı doğrulanamadı");

    const userId = claimsData.claims.sub as string;

    // Get current subscription
    const { data: abone } = await supabaseAdmin
      .from("kullanici_abonelikler")
      .select("*, paketler(slug)")
      .eq("user_id", userId)
      .single();

    if (!abone || abone.paketler?.slug === "ucretsiz") {
      throw new Error("Aktif PRO abonelik bulunamadı");
    }

    if (abone.durum === "iptal_bekliyor") {
      throw new Error("Abonelik zaten iptal edilmiş");
    }

    // Set status to iptal_bekliyor - package stays active until donem_bitis
    const { error: updateError } = await supabaseAdmin
      .from("kullanici_abonelikler")
      .update({
        durum: "iptal_bekliyor",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) throw new Error("Abonelik güncellenemedi");

    console.log("[CANCEL-SUBSCRIPTION] Cancelled for user:", userId, "until:", abone.donem_bitis);

    return new Response(
      JSON.stringify({
        success: true,
        cancel_at: abone.donem_bitis,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CANCEL-SUBSCRIPTION] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
