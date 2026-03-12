import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYTR_API_URL = "https://www.paytr.com/odeme/api/get-token";

// PRO paket fiyatları (kuruş cinsinden)
const PRO_PRICES = {
  aylik: 19900, // 199.00 TL
  yillik: 129900, // 1299.00 TL
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Kullanıcı doğrulanamadı");

    const { periyot } = await req.json();
    if (!periyot || !["aylik", "yillik"].includes(periyot)) {
      throw new Error("Geçersiz periyot");
    }

    // Get firma info for user name
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

    const userIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "127.0.0.1";

    const merchantOid = `${user.id}_${periyot}_${Date.now()}`;
    const email = user.email;
    const paymentAmount = PRO_PRICES[periyot as keyof typeof PRO_PRICES].toString();
    const userName = `${profile?.ad || ""} ${profile?.soyad || ""}`.trim() || "Kullanıcı";
    const userPhone = profile?.iletisim_numarasi || "05000000000";
    const userAddress = firma?.firma_unvani || "Türkiye";

    // Basket: base64 encoded JSON array
    const basketLabel = periyot === "yillik" ? "PRO Paket (Yillik)" : "PRO Paket (Aylik)";
    const basketPrice = (PRO_PRICES[periyot as keyof typeof PRO_PRICES] / 100).toFixed(2);
    const userBasket = btoa(
      JSON.stringify([[basketLabel, basketPrice, 1]])
    );

    const noInstallment = "1"; // Taksit yok
    const maxInstallment = "0";
    const currency = "TL";
    const testMode = "0"; // Production
    const debugOn = "0";
    const paymentType = "card";
    const lang = "tr";

    const origin = req.headers.get("origin") || "https://type-tree-builder.lovable.app";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const merchantOkUrl = `${supabaseUrl}/functions/v1/paytr-callback`;
    const merchantFailUrl = `${supabaseUrl}/functions/v1/paytr-callback`;
    const timeoutLimit = "30";

    // Generate PayTR token
    // hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount + payment_type + user_basket + no_installment + max_installment + currency + test_mode
    const hashStr =
      merchantId +
      userIp +
      merchantOid +
      email +
      paymentAmount +
      payment_type_value() +
      userBasket +
      noInstallment +
      maxInstallment +
      currency +
      testMode;

    const encoder = new TextEncoder();
    const key = encoder.encode(merchantKey);
    const data_to_sign = encoder.encode(hashStr + merchantSalt);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data_to_sign);
    const paytrToken = base64Encode(new Uint8Array(signature));

    // POST to PayTR
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
    });

    const paytrRes = await fetch(PAYTR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const paytrResult = await paytrRes.json();
    console.log("[CREATE-PAYTR-TOKEN] PayTR response:", JSON.stringify(paytrResult));

    if (paytrResult.status !== "success") {
      throw new Error(
        `PayTR token alınamadı: ${paytrResult.reason || JSON.stringify(paytrResult)}`
      );
    }

    const iframeUrl = `https://www.paytr.com/odeme/guvenli/${paytrResult.token}`;

    return new Response(
      JSON.stringify({ url: iframeUrl, token: paytrResult.token }),
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

function payment_type_value() {
  return "card";
}
