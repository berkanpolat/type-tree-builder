import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POSTMARK_API_URL = "https://api.postmarkapp.com/email/withTemplate";
const FROM_EMAIL = "Tekstil A.Ş. <info@tekstilas.com>";
const SITE_URL = "https://tekstilas.com";
const TEMPLATE_ID = 43920203; // sifre_sifirlama (new dedicated template)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "E-posta adresi gerekli" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Always use tekstilas.com regardless of where the request came from
    const siteUrl = SITE_URL;
    let recoveryLink = `${siteUrl}/sifre-sifirla`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo: `${siteUrl}/sifre-sifirla` },
    });

    // Do not reveal whether user exists
    if (linkError) {
      const errorMessage = (linkError.message || "").toLowerCase();
      const isUserNotFound =
        errorMessage.includes("user") && errorMessage.includes("not found");

      if (isUserNotFound) {
        console.log("[SEND-PASSWORD-RESET] User not found:", normalizedEmail);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.error("[SEND-PASSWORD-RESET] generateLink error:", linkError);
      throw linkError;
    }

    if (linkData?.properties?.hashed_token) {
      // Use token_hash approach: link goes directly to the app, not verify endpoint
      recoveryLink = `${siteUrl}/sifre-sifirla?token_hash=${linkData.properties.hashed_token}&type=recovery`;
      console.log("[SEND-PASSWORD-RESET] Using token_hash link for:", normalizedEmail);
    } else if (linkData?.properties?.action_link) {
      recoveryLink = linkData.properties.action_link;
    } else {
      console.log("[SEND-PASSWORD-RESET] No recovery link generated for:", normalizedEmail);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Postmark
    const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
    if (!POSTMARK_SERVER_TOKEN) {
      console.error("[SEND-PASSWORD-RESET] No POSTMARK_SERVER_TOKEN");
      return new Response(
        JSON.stringify({ success: false, error: "E-posta servisi yapılandırılmamış" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        To: normalizedEmail,
        TemplateId: TEMPLATE_ID,
        TemplateModel: {
          sifre_sifirlama_baglantisi: recoveryLink,
          platform_adi: "Tekstil A.Ş.",
          logo_url: `${siteUrl}/images/logo-tekstilas-seffaf.png`,
          destek_email: "destek@tekstilas.com",
          yil: new Date().getFullYear().toString(),
          site_url: siteUrl,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[SEND-PASSWORD-RESET] Postmark error:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: data.Message || "E-posta gönderilemedi" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SEND-PASSWORD-RESET] Sent to ${normalizedEmail}, messageId=${data.MessageID}`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[SEND-PASSWORD-RESET] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
