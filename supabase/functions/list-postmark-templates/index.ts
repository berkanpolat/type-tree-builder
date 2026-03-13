import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
  if (!POSTMARK_SERVER_TOKEN) {
    return new Response(JSON.stringify({ error: "Token not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { templateIds } = await req.json();
    
    const results = await Promise.all(
      templateIds.map(async (id: number) => {
        const response = await fetch(`https://api.postmarkapp.com/templates/${id}`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
          },
        });
        return response.json();
      })
    );

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
