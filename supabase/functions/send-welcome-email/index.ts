import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POSTMARK_API_URL = "https://api.postmarkapp.com/email/withTemplate";

interface WelcomeEmailPayload {
  to: string;
  firmaUnvani: string;
  adSoyad: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
  if (!POSTMARK_SERVER_TOKEN) {
    console.error("POSTMARK_SERVER_TOKEN is not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Postmark token not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { to, firmaUnvani, adSoyad }: WelcomeEmailPayload = await req.json();

    if (!to || !adSoyad) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to, adSoyad" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
      },
      body: JSON.stringify({
        From: "Tekstil A.Ş. <info@tekstilas.com>",
        To: to,
        TemplateId: 43889443,
        TemplateModel: {
          ad_soyad: adSoyad,
          firma_unvani: firmaUnvani || "",
          platform_adi: "Tekstil A.Ş.",
          giris_url: "https://type-tree-builder.lovable.app/giris-kayit",
          destek_email: "info@manufixo.com",
          yil: new Date().getFullYear().toString(),
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Postmark API error:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: `Postmark error [${response.status}]: ${data.Message || JSON.stringify(data)}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Welcome email sent successfully to:", to);
    return new Response(
      JSON.stringify({ success: true, messageId: data.MessageID }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending welcome email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
