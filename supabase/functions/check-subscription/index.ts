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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY tanımlı değil");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check Stripe for active subscription
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      // No Stripe customer - ensure free package
      await ensureFreePackage(supabaseAdmin, user.id);
      return jsonResponse({ subscribed: false, paket: "ucretsiz" });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // Check for past_due (10 gün tolerans)
      const pastDueSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "past_due",
        limit: 1,
      });

      if (pastDueSubs.data.length > 0) {
        const sub = pastDueSubs.data[0];
        const periodEnd = new Date(sub.current_period_end * 1000);
        const daysPastDue = Math.floor((Date.now() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));

        if (daysPastDue >= 10) {
          // 10 gün geçti, ücretsiz pakete düşür
          await downgradeToFree(supabaseAdmin, user.id);
          return jsonResponse({ subscribed: false, paket: "ucretsiz", reason: "odeme_gecikme" });
        }

        // Still within grace period
        return jsonResponse({
          subscribed: true,
          paket: "pro",
          warning: "odeme_bekliyor",
          days_past_due: daysPastDue,
          subscription_end: periodEnd.toISOString(),
        });
      }

      await ensureFreePackage(supabaseAdmin, user.id);
      return jsonResponse({ subscribed: false, paket: "ucretsiz" });
    }

    // Active subscription found
    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    const periyot = priceId === PRO_PRICES.yillik ? "yillik" : "aylik";
    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    // Update kullanici_abonelikler with Stripe data
    const { data: proPaket } = await supabaseAdmin
      .from("paketler")
      .select("id")
      .eq("slug", "pro")
      .single();

    if (proPaket) {
      await supabaseAdmin
        .from("kullanici_abonelikler")
        .upsert({
          user_id: user.id,
          paket_id: proPaket.id,
          periyot,
          donem_baslangic: periodStart.toISOString(),
          donem_bitis: periodEnd.toISOString(),
          durum: "aktif",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
        }, { onConflict: "user_id" });
    }

    return jsonResponse({
      subscribed: true,
      paket: "pro",
      periyot,
      subscription_end: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error("[CHECK-SUBSCRIPTION] ERROR:", error);
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
  const { data: existing } = await supabase
    .from("kullanici_abonelikler")
    .select("id, paket_id, paketler(slug)")
    .eq("user_id", userId)
    .single();

  if (!existing) {
    const { data: freePaket } = await supabase
      .from("paketler")
      .select("id")
      .eq("slug", "ucretsiz")
      .single();

    if (freePaket) {
      await supabase.from("kullanici_abonelikler").insert({
        user_id: userId,
        paket_id: freePaket.id,
        periyot: "aylik",
        donem_baslangic: new Date().toISOString(),
        donem_bitis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        durum: "aktif",
      });
    }
  }
}

async function downgradeToFree(supabase: any, userId: string) {
  const { data: freePaket } = await supabase
    .from("paketler")
    .select("id")
    .eq("slug", "ucretsiz")
    .single();

  if (freePaket) {
    await supabase
      .from("kullanici_abonelikler")
      .upsert({
        user_id: userId,
        paket_id: freePaket.id,
        periyot: "aylik",
        donem_baslangic: new Date().toISOString(),
        donem_bitis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        durum: "aktif",
        stripe_customer_id: null,
        stripe_subscription_id: null,
      }, { onConflict: "user_id" });
  }
}
