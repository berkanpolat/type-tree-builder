import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYTR_API_URL = "https://www.paytr.com/odeme/api/get-token";

// PRO paket fiyatları (USD bazlı, KDV hariç)
const PRO_PRICES_USD = {
  aylik: 199,
  yillik: 1299,
};

const KDV_ORANI = 0.20;

function isValidIpv4(ip: string): boolean {
  const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  return ipv4Regex.test(ip);
}

async function getUsdTryRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    if (data?.result === "success" && data?.rates?.TRY) {
      return data.rates.TRY;
    }
    throw new Error("Döviz kuru alınamadı");
  } catch (e) {
    console.error("[CREATE-PAYTR-TOKEN] Exchange rate fetch failed:", e.message);
    // Fallback kur (güncel olmayabilir)
    throw new Error("Anlık döviz kuru alınamadı. Lütfen tekrar deneyin.");
  }
}

async function hmacSha256Base64(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return base64Encode(new Uint8Array(signature));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Kullanıcı doğrulanamadı");

    const { periyot, clientIp: rawClientIp } = await req.json();
    if (!periyot || !["aylik", "yillik"].includes(periyot)) {
      throw new Error("Geçersiz periyot");
    }

    const clientProvidedIp = typeof rawClientIp === "string" ? rawClientIp.trim() : "";

    // Anlık döviz kuru al
    const usdTryRate = await getUsdTryRate();
    const usdPrice = PRO_PRICES_USD[periyot as keyof typeof PRO_PRICES_USD];
    const tlPrice = usdPrice * usdTryRate;
    const kdvTutar = tlPrice * KDV_ORANI;
    const toplamTl = tlPrice + kdvTutar;
    // PayTR kuruş cinsinden (yuvarlama)
    const paymentAmountKurus = Math.round(toplamTl * 100);

    console.log("[CREATE-PAYTR-TOKEN] Fiyat hesaplama:", {
      periyot,
      usdPrice,
      usdTryRate: usdTryRate.toFixed(4),
      tlPrice: tlPrice.toFixed(2),
      kdvTutar: kdvTutar.toFixed(2),
      toplamTl: toplamTl.toFixed(2),
      paymentAmountKurus,
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ad, soyad, iletisim_numarasi")
      .eq("user_id", user.id)
      .single();

    const { data: firma } = await supabaseAdmin
      .from("firmalar")
      .select("firma_unvani")
      .eq("user_id", user.id)
      .single();

    const merchantId = Deno.env.get("PAYTR_MERCHANT_ID")!;
    const merchantKey = Deno.env.get("PAYTR_MERCHANT_KEY")!;
    const merchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT")!;

    if (!merchantId || !merchantKey || !merchantSalt) {
      throw new Error("PayTR yapılandırması eksik");
    }

    // Öncelik: client'tan gelen geçerli IPv4 > header IP > fallback
    const headerForwardedIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const headerCfIp = req.headers.get("cf-connecting-ip")?.trim() || "";

    const userIp = isValidIpv4(clientProvidedIp)
      ? clientProvidedIp
      : isValidIpv4(headerForwardedIp)
      ? headerForwardedIp
      : isValidIpv4(headerCfIp)
      ? headerCfIp
      : "127.0.0.1";

    const merchantOid = `${user.id.replace(/-/g, "")}${periyot === "yillik" ? "Y" : "A"}${Date.now()}`;
    const email = user.email;
    const paymentAmount = paymentAmountKurus.toString();
    const userName = `${profile?.ad || ""} ${profile?.soyad || ""}`.trim() || "Kullanıcı";
    const userPhone = profile?.iletisim_numarasi || "05000000000";
    const userAddress = firma?.firma_unvani || "Türkiye";

    // Basket: base64 encoded JSON array [[name, price, quantity]]
    const basketLabel = periyot === "yillik"
      ? `PRO Paket (Yillik) $${usdPrice} x ${usdTryRate.toFixed(2)} + %20 KDV`
      : `PRO Paket (Aylik) $${usdPrice} x ${usdTryRate.toFixed(2)} + %20 KDV`;
    const basketPrice = (paymentAmountKurus / 100).toFixed(2);
    const userBasket = btoa(JSON.stringify([[basketLabel, basketPrice, 1]]));

    const noInstallment = "1";
    const maxInstallment = "0";
    const currency = "TL";

    const origin = req.headers.get("origin") || "";

    // Live varsayılan: 0 (isteğe bağlı PAYTR_TEST_MODE secret ile override edilebilir)
    const testMode = Deno.env.get("PAYTR_TEST_MODE") === "1" ? "1" : "0";
    const debugOn = Deno.env.get("PAYTR_DEBUG_ON") === "1" ? "1" : "0";
    const lang = "tr";

    // merchant_ok_url ve merchant_fail_url kullanıcının yönlendirileceği sayfalardır
    // PayTR callback (bildirim) URL'i merchant panelinden ayarlanır
    const siteUrl = origin || Deno.env.get("PAYTR_SITE_URL") || "https://tekstilas.com";
    const merchantOkUrl = `${siteUrl}/paketim?odeme=basarili`;
    const merchantFailUrl = `${siteUrl}/paketim?odeme=basarisiz`;
    const timeoutLimit = "30";

    // PayTR iFrame API hash formula:
    const hashStr =
      merchantId + userIp + merchantOid + email + paymentAmount +
      userBasket + noInstallment + maxInstallment + currency + testMode;

    const paytrToken = await hmacSha256Base64(merchantKey, hashStr + merchantSalt);

    const formData = new URLSearchParams();
    formData.append("merchant_id", merchantId);
    formData.append("user_ip", userIp);
    formData.append("merchant_oid", merchantOid);
    formData.append("email", email);
    formData.append("payment_amount", paymentAmount);
    formData.append("paytr_token", paytrToken);
    formData.append("user_basket", userBasket);
    formData.append("debug_on", debugOn);
    formData.append("no_installment", noInstallment);
    formData.append("max_installment", maxInstallment);
    formData.append("user_name", userName);
    formData.append("user_address", userAddress);
    formData.append("user_phone", userPhone);
    formData.append("merchant_ok_url", merchantOkUrl);
    formData.append("merchant_fail_url", merchantFailUrl);
    formData.append("timeout_limit", timeoutLimit);
    formData.append("currency", currency);
    formData.append("test_mode", testMode);
    formData.append("lang", lang);

    console.log("[CREATE-PAYTR-TOKEN] Requesting token for:", {
      merchantOid,
      email,
      paymentAmount,
      periyot,
      userIp,
      clientProvidedIp: clientProvidedIp || null,
      origin: origin || null,
      testMode,
      usdTryRate: usdTryRate.toFixed(4),
    });

    const paytrRes = await fetch(PAYTR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const paytrResult = await paytrRes.json();
    console.log("[CREATE-PAYTR-TOKEN] PayTR response status:", paytrResult.status);

    if (paytrResult.status !== "success") {
      throw new Error(`PayTR token alınamadı: ${paytrResult.reason || JSON.stringify(paytrResult)}`);
    }

    const iframeUrl = `https://www.paytr.com/odeme/guvenli/${paytrResult.token}`;

    return new Response(
      JSON.stringify({
        url: iframeUrl,
        token: paytrResult.token,
        fiyat_detay: {
          usd_fiyat: usdPrice,
          kur: parseFloat(usdTryRate.toFixed(4)),
          tl_fiyat: parseFloat(tlPrice.toFixed(2)),
          kdv_tutar: parseFloat(kdvTutar.toFixed(2)),
          toplam_tl: parseFloat(toplamTl.toFixed(2)),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CREATE-PAYTR-TOKEN] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
