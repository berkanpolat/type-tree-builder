import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PAYTR-CALLBACK] ${step}${d}`);
};

async function logSystem(supabase: any, kaynak: string, islem: string, mesaj: string, basarili: boolean, opts: { detaylar?: Record<string, any>; user_id?: string; hata_mesaji?: string } = {}) {
  try {
    await supabase.from("system_logs").insert({
      kaynak,
      islem,
      mesaj,
      basarili,
      seviye: basarili ? "info" : "error",
      detaylar: opts.detaylar || {},
      user_id: opts.user_id || null,
      hata_mesaji: opts.hata_mesaji || null,
    });
  } catch {}
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const formData = await req.formData();
    const merchantOid = formData.get("merchant_oid") as string;
    const status = formData.get("status") as string;
    const totalAmount = formData.get("total_amount") as string;
    const hash = formData.get("hash") as string;

    logStep("Callback received", { merchantOid, status, totalAmount });

    if (!merchantOid || !status || !totalAmount || !hash) {
      logStep("Missing required fields");
      await logSystem(supabase, "odeme", "callback_eksik_alan", "PayTR callback eksik alan", false, {
        hata_mesaji: "Zorunlu alanlar eksik",
        detaylar: { merchantOid, status, totalAmount },
      });
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
      "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataToSign);
    const expectedHash = base64Encode(new Uint8Array(signature));

    if (hash !== expectedHash) {
      logStep("Hash verification failed", { expected: expectedHash, received: hash });
      await logSystem(supabase, "odeme", "hash_dogrulama_hatasi", "PayTR hash doğrulaması başarısız", false, {
        hata_mesaji: "Hash eşleşmiyor - olası güvenlik ihlali",
        detaylar: { merchantOid },
      });
      return new Response("OK", { status: 200 });
    }

    logStep("Hash verified successfully");

    // Ödeme kaydını güncelle
    await supabase
      .from("odeme_kayitlari")
      .update({ durum: status === "success" ? "basarili" : "basarisiz", updated_at: new Date().toISOString() })
      .eq("merchant_oid", merchantOid);

    // Parse merchant_oid format: {32hexUserId}{A|Y}{timestamp}
    if (merchantOid.length < 34) {
      logStep("Invalid merchant_oid format - too short", { length: merchantOid.length });
      await logSystem(supabase, "odeme", "gecersiz_format", "Geçersiz merchant_oid formatı", false, {
        hata_mesaji: "merchant_oid çok kısa",
        detaylar: { merchantOid, length: merchantOid.length },
      });
      return new Response("OK", { status: 200 });
    }

    const userIdNoDashes = merchantOid.substring(0, 32);
    const periyotIndicator = merchantOid.charAt(32);
    const userId = [
      userIdNoDashes.substring(0, 8),
      userIdNoDashes.substring(8, 12),
      userIdNoDashes.substring(12, 16),
      userIdNoDashes.substring(16, 20),
      userIdNoDashes.substring(20, 32),
    ].join("-");

    const periyot = periyotIndicator === "Y" ? "yillik" : "aylik";

    logStep("Parsed merchant_oid", { userId, periyot, periyotIndicator });

    if (status === "success") {
      logStep("Payment successful, assigning PRO package", { userId, periyot });

      // Create firma if not exists (PRO registration flow creates profile first, firma after payment)
      const { data: existingFirma } = await supabase
        .from("firmalar")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingFirma) {
        // Get firma_unvani from payment record meta
        const { data: paymentRecord } = await supabase
          .from("odeme_kayitlari")
          .select("meta")
          .eq("merchant_oid", merchantOid)
          .single();

        const firmaUnvani = (paymentRecord?.meta as any)?.firma_unvani || "Firma";
        logStep("Creating firma after payment", { userId, firmaUnvani });

        const { error: firmaError } = await supabase
          .from("firmalar")
          .insert({ user_id: userId, firma_unvani: firmaUnvani });

        if (firmaError) {
          logStep("Firma creation error", { error: firmaError });
        } else {
          logStep("Firma created successfully");
        }
      }

      const { data: proPaket } = await supabase
        .from("paketler")
        .select("id")
        .eq("slug", "pro")
        .single();

      if (!proPaket) {
        logStep("PRO package not found in DB!");
        await logSystem(supabase, "odeme", "paket_bulunamadi", "PRO paketi veritabanında bulunamadı", false, {
          user_id: userId,
          hata_mesaji: "PRO paket kaydı eksik",
        });
        return new Response("OK", { status: 200 });
      }

      const now = new Date();
      const donemBitis = new Date(now);
      if (periyot === "yillik") {
        donemBitis.setFullYear(donemBitis.getFullYear() + 1);
      } else {
        donemBitis.setMonth(donemBitis.getMonth() + 1);
      }

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
            ekstra_haklar: {},
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

      // Log successful payment
      await logSystem(supabase, "odeme", "odeme_basarili", `Ödeme başarılı: ${periyot} PRO paket - ${totalAmount} kuruş`, true, {
        user_id: userId,
        detaylar: { periyot, totalAmount, merchantOid },
      });

      // Auto-approve PRO firma (no admin approval needed)
      try {
        await supabase
          .from("firmalar")
          .update({ onay_durumu: "onaylandi", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        logStep("Firma auto-approved for PRO user");
      } catch (approveErr) {
        logStep("Firma auto-approve failed", { error: approveErr });
      }

      // Set must_set_password flag so user is forced to set password on first login
      try {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { must_set_password: true },
        });
        logStep("must_set_password flag set");
      } catch (metaErr) {
        logStep("Failed to set must_set_password", { error: metaErr });
      }

      // Send welcome email with password reset link
      const baseUrl = Deno.env.get("SUPABASE_URL")!;
      try {
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const userEmail = userData?.user?.email;
        if (userEmail) {
          // Generate password reset link
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: userEmail,
            options: { redirectTo: "https://tekstilas.com/sifre-sifirla" },
          });
          const tokenHash = linkData?.properties?.hashed_token;
          const resetUrl = tokenHash
            ? `https://tekstilas.com/sifre-sifirla?token_hash=${tokenHash}&type=recovery`
            : "https://tekstilas.com/giris-kayit";

          // Get firma name
          const { data: firmaData } = await supabase
            .from("firmalar")
            .select("firma_unvani")
            .eq("user_id", userId)
            .single();

          // Send welcome email
          const emailUrl = `${baseUrl}/functions/v1/send-email`;
          await fetch(emailUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "hosgeldiniz",
              to: userEmail,
              templateModel: {
                firma_unvani: firmaData?.firma_unvani || "Firma",
                sifre_link: resetUrl,
              },
            }),
          });
          logStep("Welcome email with password link sent", { email: userEmail });
        }
      } catch (emailErr) {
        logStep("Welcome email send failed", { error: emailErr });
      }

      // Send payment success SMS
      try {
        const smsUrl = `${baseUrl}/functions/v1/send-notification-sms`;
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
      await logSystem(supabase, "odeme", "odeme_basarisiz", `Ödeme başarısız: ${totalAmount} kuruş`, false, {
        user_id: userId,
        hata_mesaji: `Ödeme durumu: ${status}`,
        detaylar: { status, totalAmount, merchantOid },
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    logStep("Error processing callback", { error: error.message });
    await logSystem(supabase, "odeme", "callback_hatasi", `PayTR callback işlem hatası: ${error.message}`, false, {
      hata_mesaji: error.message,
    });
    return new Response("OK", { status: 200 });
  }
});
