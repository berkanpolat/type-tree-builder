import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SMS_API_URL = "http://194.62.55.240:3000/api/send-sms";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telefon } = await req.json();
    if (!telefon || typeof telefon !== "string" || telefon.length < 10) {
      return new Response(JSON.stringify({ error: "Geçerli bir telefon numarası giriniz" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Rate limit: max 3 codes per phone in last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("sms_otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("telefon", telefon)
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Çok fazla deneme. Lütfen 10 dakika bekleyin." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Generate 6-digit code
    const kod = String(Math.floor(100000 + Math.random() * 900000));

    // Save to DB
    const { error: insertError } = await supabase
      .from("sms_otp_codes")
      .insert({ telefon, kod });

    if (insertError) {
      console.error("OTP insert error:", insertError);
      return new Response(JSON.stringify({ error: "Kod oluşturulamadı" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Send SMS via external API
    const smsResponse = await fetch(SMS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/json",
      },
      body: JSON.stringify({
        messages: [
          {
            msg: `Tekstil A.S. dogrulama kodunuz: ${kod}`,
            dest: telefon,
            id: "1",
          },
        ],
      }),
    });

    if (!smsResponse.ok) {
      const errText = await smsResponse.text();
      console.error("SMS API error:", smsResponse.status, errText);
      return new Response(JSON.stringify({ error: "SMS gönderilemedi" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`[SEND-SMS-OTP] Code sent to ${telefon.slice(0, 4)}****`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("send-sms-otp error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
