import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telefon, kod } = await req.json();
    if (!telefon || !kod) {
      return new Response(JSON.stringify({ error: "Telefon ve kod gereklidir" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find the latest unexpired, unverified code for this phone
    const { data: otpRecord, error: fetchError } = await supabase
      .from("sms_otp_codes")
      .select("id, kod, expires_at")
      .eq("telefon", telefon)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(JSON.stringify({ verified: false, error: "Doğrulama kodu bulunamadı veya süresi dolmuş. Yeni kod talep edin." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (otpRecord.kod !== kod) {
      return new Response(JSON.stringify({ verified: false, error: "Doğrulama kodu hatalı" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Mark as verified
    await supabase
      .from("sms_otp_codes")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    console.log(`[VERIFY-SMS-OTP] Phone verified: ${telefon.slice(0, 4)}****`);

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("verify-sms-otp error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
