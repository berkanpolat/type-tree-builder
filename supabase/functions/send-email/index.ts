import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POSTMARK_API_URL = "https://api.postmarkapp.com/email/withTemplate";
const FROM_EMAIL = "info@tekstilas.com";
const SITE_URL = "https://type-tree-builder.lovable.app";

// Template ID mapping
const TEMPLATES: Record<string, number> = {
  hosgeldiniz: 43889443,
  basvuru_alindi: 43896400,
  basvuru_onay: 43897478,
  basvuru_red: 43897477,
  ihale_inceleniyor: 43898501,
  ihale_onaylandi: 43898542,
  ihale_reddedildi: 43898543,
  ihale_suresi_doldu: 43898544,
  ihale_tamamlandi: 43898714,
  sifre_degistirildi: 43898480,
  sifre_sifirlama: 43920203,
  teklif_kabul: 43898675,
  teklif_red: 43898681,
  urun_inceleniyor: 43898683,
  urun_reddedildi: 43898843,
  urun_yayinlandi: 43898721,
  yeni_mesaj: 43898845,
  yeni_teklif: 43898667,
};

interface EmailRequest {
  type: string;
  to?: string;          // email address (optional, resolved from userId)
  userId?: string;      // resolve email from auth
  templateModel: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
  if (!POSTMARK_SERVER_TOKEN) {
    console.error("POSTMARK_SERVER_TOKEN not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { type, to, userId, templateModel }: EmailRequest = await req.json();

    if (!type || !TEMPLATES[type]) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown email type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve email address
    let recipientEmail = to;

    if (!recipientEmail && userId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      recipientEmail = user?.email;
    }

    if (!recipientEmail) {
      console.log(`[SEND-EMAIL] No email for type=${type}, userId=${userId}`);
      return new Response(
        JSON.stringify({ success: false, error: "No recipient email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateId = TEMPLATES[type];

    // Add common model fields
    const model = {
      ...templateModel,
      platform_adi: "Tekstil A.Ş.",
      destek_email: "info@manufixo.com",
      yil: new Date().getFullYear().toString(),
      site_url: SITE_URL,
    };

    const response = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        To: recipientEmail,
        TemplateId: templateId,
        TemplateModel: model,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[SEND-EMAIL] Postmark error for type=${type}:`, JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: data.Message || "Postmark error" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SEND-EMAIL] Sent type=${type} to=${recipientEmail} messageId=${data.MessageID}`);
    return new Response(
      JSON.stringify({ success: true, messageId: data.MessageID }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[SEND-EMAIL] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
