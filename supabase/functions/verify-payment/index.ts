import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-PAYMENT] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header yok");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) throw new Error("Kullanıcı doğrulanamadı");

    const userId = user.id;
    logStep("User authenticated", { userId });

    // Kullanıcının mevcut aboneliğini kontrol et
    const { data: currentSub } = await supabaseAdmin
      .from("kullanici_abonelikler")
      .select("*, paketler(slug)")
      .eq("user_id", userId)
      .single();

    // Zaten PRO ise bir şey yapmaya gerek yok
    if (currentSub?.paketler?.slug === "pro" && currentSub?.durum === "aktif") {
      logStep("Already PRO, skipping");
      return jsonResponse({ success: true, already_pro: true });
    }

    // Son 30 dakika içindeki bekleyen ödeme kaydını bul
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: pendingPayment } = await supabaseAdmin
      .from("odeme_kayitlari")
      .select("*")
      .eq("user_id", userId)
      .in("durum", ["bekliyor", "basarili"])
      .gte("created_at", thirtyMinAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pendingPayment) {
      logStep("No recent pending payment found");
      return jsonResponse({ success: false, reason: "no_pending_payment" });
    }

    logStep("Found pending payment", { 
      merchant_oid: pendingPayment.merchant_oid, 
      durum: pendingPayment.durum,
      periyot: pendingPayment.periyot 
    });

    // Callback zaten işlediyse (durum=basarili) ve abonelik hala güncellenmemişse, aktive et
    // Callback gelmemişse (durum=bekliyor) ve PayTR başarılı sayfasına yönlendirdiyse, aktive et
    // (PayTR sadece ödeme başarılı olduğunda merchant_ok_url'e yönlendirir)

    // PRO paket ID'sini al
    const { data: proPaket } = await supabaseAdmin
      .from("paketler")
      .select("id")
      .eq("slug", "pro")
      .single();

    if (!proPaket) {
      logStep("PRO package not found!");
      return jsonResponse({ success: false, reason: "pro_package_not_found" });
    }

    const periyot = pendingPayment.periyot;
    const now = new Date();
    const donemBitis = new Date(now);
    if (periyot === "yillik") {
      donemBitis.setFullYear(donemBitis.getFullYear() + 1);
    } else {
      donemBitis.setMonth(donemBitis.getMonth() + 1);
    }

    // Aboneliği güncelle veya oluştur
    if (currentSub) {
      const { error } = await supabaseAdmin
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

      if (error) {
        logStep("Update error", { error });
        throw new Error("Abonelik güncellenemedi");
      }
      logStep("Subscription updated to PRO");
    } else {
      const { error } = await supabaseAdmin
        .from("kullanici_abonelikler")
        .insert({
          user_id: userId,
          paket_id: proPaket.id,
          periyot,
          donem_baslangic: now.toISOString(),
          donem_bitis: donemBitis.toISOString(),
          durum: "aktif",
        });

      if (error) {
        logStep("Insert error", { error });
        throw new Error("Abonelik oluşturulamadı");
      }
      logStep("Subscription inserted as PRO");
    }

    // Ödeme kaydını güncelle
    await supabaseAdmin
      .from("odeme_kayitlari")
      .update({ durum: "basarili", updated_at: now.toISOString() })
      .eq("id", pendingPayment.id);

    // Auto-approve PRO firma
    try {
      await supabaseAdmin
        .from("firmalar")
        .update({ onay_durumu: "onaylandi", updated_at: now.toISOString() })
        .eq("user_id", userId);
      logStep("Firma auto-approved for PRO");
    } catch (e) {
      logStep("Firma approve failed", { error: e });
    }

    // Ödeme başarılı SMS gönder
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

    return jsonResponse({ success: true, periyot, donem_bitis: donemBitis.toISOString() });
  } catch (error) {
    logStep("ERROR", { message: error?.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
