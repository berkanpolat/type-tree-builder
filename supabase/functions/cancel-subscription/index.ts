import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY tanımlı değil");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header yok");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("Kullanıcı doğrulanamadı");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // First check if user has a stripe_subscription_id in our DB
    const { data: abone } = await supabaseClient
      .from("kullanici_abonelikler")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    let subscriptionId = abone?.stripe_subscription_id;

    // If no subscription ID in DB, try to find via Stripe customer
    if (!subscriptionId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) throw new Error("Stripe müşteri kaydı bulunamadı");

      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) throw new Error("Aktif abonelik bulunamadı");
      subscriptionId = subscriptions.data[0].id;
    }

    console.log("Cancelling subscription:", subscriptionId);

    // Cancel at period end
    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    const cancelAt = new Date(updated.current_period_end * 1000).toISOString();

    // Update DB status to iptal_bekliyor
    await supabaseClient
      .from("kullanici_abonelikler")
      .update({ durum: "iptal_bekliyor" })
      .eq("user_id", user.id);

    console.log("Subscription cancelled successfully, cancel_at:", cancelAt);

    return new Response(JSON.stringify({
      success: true,
      cancel_at: cancelAt,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
