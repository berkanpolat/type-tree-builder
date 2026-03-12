import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header yok");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error(`Auth error: ${userError?.message || "Invalid token"}`);

    const userId = user.id;
    if (!userId) throw new Error("Kullanıcı doğrulanamadı");

    logStep("User authenticated", { userId });

    // Get current subscription from DB
    const { data: abone, error: aboneError } = await supabaseAdmin
      .from("kullanici_abonelikler")
      .select("*, paketler(slug, ad)")
      .eq("user_id", userId)
      .maybeSingle();

    if (aboneError) {
      logStep("DB query error", { error: aboneError });
      throw new Error("Abonelik bilgisi alınamadı");
    }

    if (!abone) {
      logStep("No subscription found, ensuring free package");
      await ensureFreePackage(supabaseAdmin, userId);
      return jsonResponse({ subscribed: false, paket: "ucretsiz" });
    }

    const paketSlug = abone.paketler?.slug || "ucretsiz";
    const donemBitis = abone.donem_bitis ? new Date(abone.donem_bitis) : null;
    const now = new Date();

    // Check if PRO subscription has expired
    if (paketSlug !== "ucretsiz" && donemBitis && donemBitis < now) {
      if (abone.durum === "iptal_bekliyor" || abone.durum === "aktif") {
        logStep("PRO subscription expired, downgrading to free", {
          donemBitis: donemBitis.toISOString(),
        });
        await downgradeToFree(supabaseAdmin, userId);
        return jsonResponse({ subscribed: false, paket: "ucretsiz", reason: "suresi_doldu" });
      }
    }

    const isSubscribed = paketSlug !== "ucretsiz" && abone.durum !== "iptal_edildi";

    return jsonResponse({
      subscribed: isSubscribed,
      paket: paketSlug,
      periyot: abone.periyot,
      subscription_end: abone.donem_bitis,
      cancel_at_period_end: abone.durum === "iptal_bekliyor",
    });
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

async function ensureFreePackage(supabase: any, userId: string) {
  const { data: freePaket } = await supabase
    .from("paketler")
    .select("id, aktif_urun_limiti")
    .eq("slug", "ucretsiz")
    .single();

  if (!freePaket) return;

  const { data: existing } = await supabase
    .from("kullanici_abonelikler")
    .select("id, paket_id")
    .eq("user_id", userId)
    .single();

  const wasDowngraded = existing && existing.paket_id !== freePaket.id;

  if (existing) {
    await supabase
      .from("kullanici_abonelikler")
      .update({
        paket_id: freePaket.id,
        periyot: "aylik",
        donem_baslangic: new Date().toISOString(),
        donem_bitis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        durum: "aktif",
        stripe_subscription_id: null,
        stripe_customer_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } else {
    await supabase.from("kullanici_abonelikler").insert({
      user_id: userId,
      paket_id: freePaket.id,
      periyot: "aylik",
      donem_baslangic: new Date().toISOString(),
      donem_bitis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      durum: "aktif",
    });
  }

  if (wasDowngraded) {
    await deactivateExcessProducts(supabase, userId, freePaket.aktif_urun_limiti);
  }
}

async function downgradeToFree(supabase: any, userId: string) {
  const { data: freePaket } = await supabase
    .from("paketler")
    .select("id, aktif_urun_limiti")
    .eq("slug", "ucretsiz")
    .single();

  if (freePaket) {
    await supabase
      .from("kullanici_abonelikler")
      .update({
        paket_id: freePaket.id,
        periyot: "aylik",
        donem_baslangic: new Date().toISOString(),
        donem_bitis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        durum: "aktif",
        stripe_subscription_id: null,
        stripe_customer_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await deactivateExcessProducts(supabase, userId, freePaket.aktif_urun_limiti);
  }
}

async function deactivateExcessProducts(supabase: any, userId: string, limit: number) {
  const { data: activeProducts } = await supabase
    .from("urunler")
    .select("id")
    .eq("user_id", userId)
    .eq("durum", "aktif")
    .order("created_at", { ascending: true });

  if (!activeProducts || activeProducts.length <= limit) return;

  const toDeactivate = activeProducts.slice(limit).map((p: any) => p.id);
  await supabase
    .from("urunler")
    .update({ durum: "pasif", updated_at: new Date().toISOString() })
    .in("id", toDeactivate);
}
