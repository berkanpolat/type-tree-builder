import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRO_PRICES_USD = { aylik: 199, yillik: 1299 };
const KDV_ORANI = 0.20;
const PAYTR_POST_URL = "https://www.paytr.com/odeme";

function isValidIpv4(ip: string): boolean {
  return /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(ip);
}

async function getUsdTryRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    if (data?.result === "success" && data?.rates?.TRY) return data.rates.TRY;
    throw new Error("Döviz kuru alınamadı");
  } catch (e) {
    console.error("[PAYTR-DIRECT] Exchange rate fetch failed:", e.message);
    throw new Error("Anlık döviz kuru alınamadı. Lütfen tekrar deneyin.");
  }
}

async function hmacSha256Base64(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
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

    const {
      periyot,
      clientIp: rawClientIp,
      forceTestMode = false,
      cc_owner,
      card_number,
      expiry_month,
      expiry_year,
      cvv,
      firma_unvani,
    } = await req.json();

    // Validate inputs
    if (!periyot || !["aylik", "yillik"].includes(periyot)) throw new Error("Geçersiz periyot");
    if (!cc_owner || !card_number || !expiry_month || !expiry_year || !cvv) {
      throw new Error("Kart bilgileri eksik");
    }

    const clientProvidedIp = typeof rawClientIp === "string" ? rawClientIp.trim() : "";

    // Exchange rate
    const usdTryRate = await getUsdTryRate();
    const usdPrice = PRO_PRICES_USD[periyot as keyof typeof PRO_PRICES_USD];
    const tlPrice = usdPrice * usdTryRate;
    const kdvTutar = tlPrice * KDV_ORANI;
    const toplamTl = tlPrice + kdvTutar;
    const paymentAmountKurus = Math.round(toplamTl * 100);

    console.log("[PAYTR-DIRECT] Price calc:", { periyot, usdPrice, usdTryRate: usdTryRate.toFixed(4), toplamTl: toplamTl.toFixed(2), paymentAmountKurus });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabaseAdmin.from("profiles").select("ad, soyad, iletisim_numarasi").eq("user_id", user.id).single();
    // Use firma_unvani from request body (firma not yet created for PRO)
    const userFirmaUnvani = firma_unvani || "Türkiye";

    const merchantId = Deno.env.get("PAYTR_MERCHANT_ID")!;
    const merchantKey = Deno.env.get("PAYTR_MERCHANT_KEY")!;
    const merchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT")!;
    if (!merchantId || !merchantKey || !merchantSalt) throw new Error("PayTR yapılandırması eksik");

    // IP resolution
    const headerForwardedIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const headerCfIp = req.headers.get("cf-connecting-ip")?.trim() || "";
    const userIp = isValidIpv4(clientProvidedIp) ? clientProvidedIp
      : isValidIpv4(headerForwardedIp) ? headerForwardedIp
      : isValidIpv4(headerCfIp) ? headerCfIp
      : "127.0.0.1";

    const merchantOid = `${user.id.replace(/-/g, "")}${periyot === "yillik" ? "Y" : "A"}${Date.now()}`;
    const email = user.email;
    const paymentAmount = paymentAmountKurus.toString();
    const userName = `${profile?.ad || ""} ${profile?.soyad || ""}`.trim() || "Kullanıcı";
    const userPhone = profile?.iletisim_numarasi || "05000000000";
    const userAddress = userFirmaUnvani;

    const basketLabel = periyot === "yillik"
      ? `PRO Paket (Yillik) $${usdPrice} x ${usdTryRate.toFixed(2)} + %20 KDV`
      : `PRO Paket (Aylik) $${usdPrice} x ${usdTryRate.toFixed(2)} + %20 KDV`;
    const basketPrice = (paymentAmountKurus / 100).toFixed(2);
    const userBasket = btoa(JSON.stringify([[basketLabel, basketPrice, 1]]));

    const installmentCount = "0";
    const currency = "TL";
    const paymentType = "card";
    const non3d = "0"; // Always use 3D Secure

    const origin = req.headers.get("origin") || "";
    const referer = req.headers.get("referer") || "";
    const isPreview = Boolean(forceTestMode) || origin.includes("lovable.app") || origin.includes("localhost") || referer.includes("lovable.app");
    const testMode = isPreview ? "1" : "0";

    const siteUrl = origin || Deno.env.get("PAYTR_SITE_URL") || "https://tekstilas.com";
    const merchantOkUrl = `${siteUrl}/odeme-sonuc?odeme=basarili`;
    const merchantFailUrl = `${siteUrl}/odeme-sonuc?odeme=basarisiz`;

    // Direct API hash: merchant_id + user_ip + merchant_oid + email + payment_amount + payment_type + installment_count + currency + test_mode + non_3d
    const hashStr = merchantId + userIp + merchantOid + email + paymentAmount + paymentType + installmentCount + currency + testMode + non3d;
    const paytrToken = await hmacSha256Base64(merchantKey, hashStr + merchantSalt);

    // POST to PayTR Direct API
    const formData = new URLSearchParams();
    formData.append("merchant_id", merchantId);
    formData.append("user_ip", userIp);
    formData.append("merchant_oid", merchantOid);
    formData.append("email", email);
    formData.append("payment_amount", paymentAmount);
    formData.append("paytr_token", paytrToken);
    formData.append("user_basket", userBasket);
    formData.append("no_installment", "1");
    formData.append("max_installment", "0");
    formData.append("user_name", userName);
    formData.append("user_address", userAddress);
    formData.append("user_phone", userPhone);
    formData.append("merchant_ok_url", merchantOkUrl);
    formData.append("merchant_fail_url", merchantFailUrl);
    formData.append("currency", currency);
    formData.append("test_mode", testMode);
    formData.append("lang", "tr");
    formData.append("payment_type", paymentType);
    formData.append("non_3d", non3d);
    formData.append("installment_count", installmentCount);
    // Card details
    formData.append("cc_owner", cc_owner);
    formData.append("card_number", card_number.replace(/\s/g, ""));
    formData.append("expiry_month", expiry_month);
    formData.append("expiry_year", expiry_year);
    formData.append("cvv", cvv);

    console.log("[PAYTR-DIRECT] Sending to PayTR:", { merchantOid, email, paymentAmount, userIp, testMode });

    const paytrRes = await fetch(PAYTR_POST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const responseText = await paytrRes.text();
    console.log("[PAYTR-DIRECT] PayTR response status:", paytrRes.status, "length:", responseText.length);

    // Save payment record
    await supabaseAdmin.from("odeme_kayitlari").insert({
      user_id: user.id,
      merchant_oid: merchantOid,
      periyot,
      tutar_kurus: paymentAmountKurus,
      durum: "bekliyor",
      meta: { firma_unvani: firma_unvani || "" },
    });

    // PayTR Direct API returns HTML (3D Secure page) that needs to be rendered
    // Check if it's an error response (JSON)
    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.status === "error" || jsonResponse.status === "failed") {
        throw new Error(jsonResponse.err_msg || jsonResponse.reason || "Ödeme başlatılamadı");
      }
    } catch (e) {
      // Not JSON = it's HTML (3D Secure page) which is what we want
      if (e instanceof SyntaxError) {
        // Good - it's HTML
      } else {
        throw e;
      }
    }

    return new Response(
      JSON.stringify({
        html_content: responseText,
        merchant_oid: merchantOid,
        fiyat_detay: {
          usd_fiyat: usdPrice,
          kur: parseFloat(usdTryRate.toFixed(4)),
          tl_fiyat: parseFloat(tlPrice.toFixed(2)),
          kdv_tutar: parseFloat(kdvTutar.toFixed(2)),
          toplam_tl: parseFloat(toplamTl.toFixed(2)),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[PAYTR-DIRECT] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
