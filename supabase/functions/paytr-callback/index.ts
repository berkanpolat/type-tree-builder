import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PAYTR-CALLBACK] ${step}${d}`);
};

Deno.serve(async (req) => {
  // PayTR sends POST with form data
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  try {
    const formData = await req.formData();
    const merchantOid = formData.get("merchant_oid") as string;
    const status = formData.get("status") as string;
    const totalAmount = formData.get("total_amount") as string;
    const hash = formData.get("hash") as string;

    logStep("Callback received", { merchantOid, status, totalAmount });

    if (!merchantOid || !status || !totalAmount || !hash) {
      logStep("Missing required fields");
      return new Response("OK", { status: 200 });
    }

    // Verify hash
    const merchantKey = Deno.env.get("PAYTR_MERCHANT_KEY")!;
    const merchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT")!;

    const hashStr = merchantOid + merchantSalt + status + totalAmount;
    const encoder = new TextEncoder();
    const key = encoder.encode(merchantKey);
    const dataToSign = encoder.encode(hashStr);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataToSign);
    const expectedHash = base64Encode(new Uint8Array(signature));

    if (hash !== expectedHash) {
      logStep("Hash verification failed", { expected: expectedHash, received: hash });
      return new Response("OK", { status: 200 });
    }

    logStep("Hash verified successfully");

    // Parse merchant_oid: {user_id}_{periyot}_{timestamp}
    const parts = merchantOid.split("_");
    if (parts.length < 3) {
      logStep("Invalid merchant_oid format");
      return new Response("OK", { status: 200 });
    }

    const userId = parts[0];
    const periyot = parts[1]; // "aylik" or "yillik"

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    if (status === "success") {
      logStep("Payment successful, assigning PRO package", { userId, periyot });

      // Get PRO package ID
      const { data: proPaket } = await supabase
        .from("paketler")
        .select("id")
        .eq("slug", "pro")
        .single();

      if (!proPaket) {
        logStep("PRO package not found in DB!");
        return new Response("OK", { status: 200 });
      }

      const now = new Date();
      const donemBitis = new Date(now);
      if (periyot === "yillik") {
        donemBitis.setFullYear(donemBitis.getFullYear() + 1);
      } else {
        donemBitis.setMonth(donemBitis.getMonth() + 1);
      }

      // Upsert subscription
      const { data: existing } = await supabase
        .from("kullanici_abonelikler")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("kullanici_abonelikler")
          .update({
            paket_id: proPaket.id,
            periyot,
            donem_baslangic: now.toISOString(),
            donem_bitis: donemBitis.toISOString(),
            durum: "aktif",
            stripe_subscription_id: null,
            stripe_customer_id: null,
            updated_at: now.toISOString(),
          })
          .eq("user_id", userId);

        if (error) logStep("Update error", { error });
        else logStep("Subscription updated to PRO");
      } else {
        const { error } = await supabase.from("kullanici_abonelikler").insert({
          user_id: userId,
          paket_id: proPaket.id,
          periyot,
          donem_baslangic: now.toISOString(),
          donem_bitis: donemBitis.toISOString(),
          durum: "aktif",
        });

        if (error) logStep("Insert error", { error });
        else logStep("Subscription inserted as PRO");
      }

      // Send payment success SMS
      try {
        const smsUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-sms`;
        await fetch(smsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "odeme_basarili", userId }),
        });
        logStep("Payment success SMS sent");
      } catch (smsErr) {
        logStep("SMS send failed", { error: smsErr });
      }
    } else {
      logStep("Payment failed", { userId, status });
    }

    // PayTR expects "OK" response
    return new Response("OK", { status: 200 });
  } catch (error) {
    logStep("Error processing callback", { error: error.message });
    return new Response("OK", { status: 200 });
  }
});
