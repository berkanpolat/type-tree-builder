import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache for 15 minutes
let cache: { rate: number; timestamp: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify({ usd_try: cache.rate, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TCMB XML API
    const res = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      throw new Error(`TCMB API error: ${res.status}`);
    }

    const xml = await res.text();

    // Parse USD/TRY from XML - look for CurrencyCode="USD" then ForexBuying
    const usdBlock = xml.match(/<Currency[^>]*CurrencyCode="USD"[^>]*>[\s\S]*?<\/Currency>/);
    if (!usdBlock) throw new Error("USD not found in TCMB data");

    const forexSelling = usdBlock[0].match(/<ForexSelling>([\d.]+)<\/ForexSelling>/);
    if (!forexSelling) throw new Error("ForexSelling not found");

    const rate = parseFloat(forexSelling[1]);
    cache = { rate, timestamp: now };

    return new Response(JSON.stringify({ usd_try: rate, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Exchange rate error:", error);
    // Fallback rate
    return new Response(JSON.stringify({ usd_try: 38.50, fallback: true, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
