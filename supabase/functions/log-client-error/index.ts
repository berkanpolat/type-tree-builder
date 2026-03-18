import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      error_message,
      error_stack,
      error_source,
      error_line,
      error_col,
      component_stack,
      url,
      user_agent,
      platform,
      language,
      screen_width,
      screen_height,
      viewport_width,
      viewport_height,
      user_id,
      timestamp,
    } = body;

    // Parse browser info from user agent
    const browserInfo = parseBrowser(user_agent || '');

    await supabase.from("system_logs").insert({
      seviye: "error",
      kaynak: "client_error",
      islem: error_source || "runtime_error",
      mesaj: (error_message || "Bilinmeyen hata").substring(0, 500),
      basarili: false,
      user_id: user_id || null,
      hata_mesaji: error_stack ? error_stack.substring(0, 2000) : null,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      detaylar: {
        url,
        browser: browserInfo.browser,
        browser_version: browserInfo.version,
        os: browserInfo.os,
        platform,
        language,
        screen: screen_width && screen_height ? `${screen_width}x${screen_height}` : null,
        viewport: viewport_width && viewport_height ? `${viewport_width}x${viewport_height}` : null,
        component_stack: component_stack ? component_stack.substring(0, 1000) : null,
        error_location: error_line ? `${error_source || 'unknown'}:${error_line}:${error_col}` : null,
        timestamp,
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[log-client-error]", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseBrowser(ua: string) {
  let browser = "Bilinmeyen";
  let version = "";
  let os = "Bilinmeyen";

  // OS detection
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Browser detection
  if (ua.includes("Edg/")) {
    browser = "Edge";
    version = ua.match(/Edg\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("OPR/") || ua.includes("Opera")) {
    browser = "Opera";
    version = ua.match(/(?:OPR|Opera)\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Chrome/") && !ua.includes("Edg/")) {
    browser = "Chrome";
    version = ua.match(/Chrome\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    browser = "Safari";
    version = ua.match(/Version\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Firefox/")) {
    browser = "Firefox";
    version = ua.match(/Firefox\/([\d.]+)/)?.[1] || "";
  }

  return { browser, version, os };
}
