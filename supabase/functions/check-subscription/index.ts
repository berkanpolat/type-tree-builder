import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRO_PRICES = {
  aylik: "price_1T9kVU16sgu1Ou2XJkpzKddd",
  yillik: "price_1T9kVs16sgu1Ou2X9S0sStli",
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
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("Kullanıcı doğrulanamadı");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY tanımlı değil");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const existingDbSubscription = await getCurrentDbSubscription(supabaseAdmin, user.id);
    if (isManualActivePaidSubscription(existingDbSubscription)) {
      const paketSlug = existingDbSubscription?.paketler?.slug || "pro";
      logStep("Manual paid subscription detected, skipping Stripe downgrade", {
        paket: paketSlug,
        periyot: existingDbSubscription?.periyot,
        donem_bitis: existingDbSubscription?.donem_bitis,
      });

      return jsonResponse({
        subscribed: paketSlug !== "ucretsiz",
        paket: paketSlug,
        periyot: existingDbSubscription?.periyot || "sinirsiz",
        subscription_end: existingDbSubscription?.donem_bitis,
        cancel_at_period_end: false,
        manual_assignment: true,
      });
    }

    // Check Stripe for customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found, ensuring free package");
      await ensureFreePackage(supabaseAdmin, user.id);
      return jsonResponse({ subscribed: false, paket: "ucretsiz" });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription, checking past_due");

      // Check for past_due (10 gün tolerans)
      const pastDueSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "past_due",
        limit: 1,
      });

      if (pastDueSubs.data.length > 0) {
        const sub = pastDueSubs.data[0];
        const periodEndTs = sub.current_period_end;
        if (periodEndTs && typeof periodEndTs === "number") {
          const periodEnd = new Date(periodEndTs * 1000);
          const daysPastDue = Math.floor((Date.now() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));
          logStep("Past due subscription", { daysPastDue, periodEnd: periodEnd.toISOString() });

          if (daysPastDue >= 10) {
            await downgradeToFree(supabaseAdmin, user.id);
            return jsonResponse({ subscribed: false, paket: "ucretsiz", reason: "odeme_gecikme" });
          }

          return jsonResponse({
            subscribed: true,
            paket: "pro",
            warning: "odeme_bekliyor",
            days_past_due: daysPastDue,
            subscription_end: periodEnd.toISOString(),
          });
        }
      }

      // Also check for canceled subs that are still in their period
      const canceledSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "canceled",
        limit: 1,
      });

      // No active or past_due → free
      logStep("No active or past_due subs, downgrading to free");
      await ensureFreePackage(supabaseAdmin, user.id);
      return jsonResponse({ subscribed: false, paket: "ucretsiz" });
    }

    // Active subscription found
    const subscription = subscriptions.data[0];
    logStep("Active subscription found", {
      subId: subscription.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });

    const priceId = subscription.items.data[0]?.price?.id;
    const periyot = priceId === PRO_PRICES.yillik ? "yillik" : "aylik";

    // Safe date conversion
    const startTs = subscription.current_period_start;
    const endTs = subscription.current_period_end;
    const periodStart = (startTs && typeof startTs === "number") ? new Date(startTs * 1000) : new Date();
    const periodEnd = (endTs && typeof endTs === "number") ? new Date(endTs * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    logStep("Period dates", {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      periyot,
    });

    // Get PRO package ID
    const { data: proPaket } = await supabaseAdmin
      .from("paketler")
      .select("id")
      .eq("slug", "pro")
      .single();

    if (proPaket) {
      const upsertData = {
        user_id: user.id,
        paket_id: proPaket.id,
        periyot,
        donem_baslangic: periodStart.toISOString(),
        donem_bitis: periodEnd.toISOString(),
        durum: "aktif",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      };

      logStep("Upserting subscription", upsertData);

      const { error: upsertError } = await supabaseAdmin
        .from("kullanici_abonelikler")
        .upsert(upsertData, { onConflict: "user_id" });

      if (upsertError) {
        logStep("Upsert error", { error: upsertError });
        // Try update instead
        const { error: updateError } = await supabaseAdmin
          .from("kullanici_abonelikler")
          .update({
            paket_id: proPaket.id,
            periyot,
            donem_baslangic: periodStart.toISOString(),
            donem_bitis: periodEnd.toISOString(),
            durum: "aktif",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) {
          logStep("Update also failed", { error: updateError });
        } else {
          logStep("Update succeeded (fallback)");
        }
      } else {
        logStep("Upsert succeeded");
      }
    }

    return jsonResponse({
      subscribed: true,
      paket: "pro",
      periyot,
      subscription_end: periodEnd.toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
    });
  } catch (error) {
    logStep("ERROR", { message: error?.message, stack: error?.stack });
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

  if (!freePaket) {
    logStep("Free package not found in DB!");
    return;
  }

  // Check if user already has a subscription record
  const { data: existing } = await supabase
    .from("kullanici_abonelikler")
    .select("id, paket_id")
    .eq("user_id", userId)
    .single();

  const wasDowngraded = existing && existing.paket_id !== freePaket.id;

  if (existing) {
    const { error } = await supabase
      .from("kullanici_abonelikler")
      .update({
        paket_id: freePaket.id,
        periyot: "aylik",
        donem_baslangic: new Date().toISOString(),
        donem_bitis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        durum: "aktif",
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) logStep("ensureFreePackage update error", { error });
    else logStep("ensureFreePackage: updated to free");
  } else {
    const { error } = await supabase.from("kullanici_abonelikler").insert({
      user_id: userId,
      paket_id: freePaket.id,
      periyot: "aylik",
      donem_baslangic: new Date().toISOString(),
      donem_bitis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      durum: "aktif",
    });

    if (error) logStep("ensureFreePackage insert error", { error });
    else logStep("ensureFreePackage: inserted free");
  }

  // Deactivate excess products if downgraded from a higher package
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
    const { error } = await supabase
      .from("kullanici_abonelikler")
      .update({
        paket_id: freePaket.id,
        periyot: "aylik",
        donem_baslangic: new Date().toISOString(),
        donem_bitis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        durum: "aktif",
        stripe_customer_id: null,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) logStep("downgradeToFree error", { error });
    else logStep("downgradeToFree: success");

    // Deactivate excess active products beyond free limit
    await deactivateExcessProducts(supabase, userId, freePaket.aktif_urun_limiti);
  }
}

async function deactivateExcessProducts(supabase: any, userId: string, limit: number) {
  const { data: activeProducts, error: fetchError } = await supabase
    .from("urunler")
    .select("id")
    .eq("user_id", userId)
    .eq("durum", "aktif")
    .order("created_at", { ascending: true });

  if (fetchError || !activeProducts) {
    logStep("deactivateExcessProducts fetch error", { error: fetchError });
    return;
  }

  if (activeProducts.length <= limit) {
    logStep("deactivateExcessProducts: no excess", { active: activeProducts.length, limit });
    return;
  }

  // Keep the oldest products, deactivate the rest
  const toDeactivate = activeProducts.slice(limit).map((p: any) => p.id);
  logStep("deactivateExcessProducts: deactivating", { count: toDeactivate.length, limit });

  const { error: updateError } = await supabase
    .from("urunler")
    .update({ durum: "pasif", updated_at: new Date().toISOString() })
    .in("id", toDeactivate);

  if (updateError) logStep("deactivateExcessProducts update error", { error: updateError });
  else logStep("deactivateExcessProducts: success", { deactivated: toDeactivate.length });
}
