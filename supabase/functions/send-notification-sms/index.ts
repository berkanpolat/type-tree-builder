import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SMS_API_URL = "http://194.62.55.240:3000/api/send-sms";
const SITE_URL = "https://type-tree-builder.lovable.app";

interface SmsRequest {
  type:
    | "kayit_alindi"
    | "basvuru_onaylandi"
    | "basvuru_reddedildi"
    | "odeme_basarili"
    | "kota_uyari"
    | "kisitlama";
  telefon?: string;
  userId?: string;
  firmaUnvani?: string;
  // kota_uyari specific
  paketAd?: string;
  ozellikAd?: string;
  kalanSayi?: number;
  // kisitlama specific
  kisitlamaId?: string;
  kisitlamaAlanlari?: string;
  kisitlamaTarihi?: string;
  kisitlamaBitis?: string;
}

async function sendSms(telefon: string, msg: string): Promise<boolean> {
  try {
    const res = await fetch(SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ msg, dest: telefon, id: "1" }],
      }),
    });
    if (!res.ok) {
      console.error("[NOTIFICATION-SMS] API error:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[NOTIFICATION-SMS] Send error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SmsRequest = await req.json();
    const { type } = body;

    if (!type) {
      return new Response(JSON.stringify({ error: "type gerekli" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve userId from auth header if not provided
    let userId = body.userId;
    if (!userId) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        try {
          const token = authHeader.replace("Bearer ", "");
          const { data: claimsData } = await supabase.auth.getClaims(token);
          userId = claimsData?.claims?.sub as string;
        } catch {}
      }
    }

    // Resolve phone number
    let telefon = body.telefon;
    let firmaUnvani = body.firmaUnvani;

    if (!telefon && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("iletisim_numarasi")
        .eq("user_id", userId)
        .single();
      telefon = profile?.iletisim_numarasi || null;
    }

    if (!firmaUnvani && userId) {
      const { data: firma } = await supabase
        .from("firmalar")
        .select("firma_unvani")
        .eq("user_id", userId)
        .single();
      firmaUnvani = firma?.firma_unvani || null;
    }

    if (!telefon) {
      console.log(`[NOTIFICATION-SMS] No phone for type=${type}, userId=${body.userId}`);
      return new Response(JSON.stringify({ success: false, reason: "telefon_bulunamadi" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let message = "";

    switch (type) {
      case "kayit_alindi":
        message = `${firmaUnvani || "Firma"}, Tekstil A.Ş. başvurunuz alındı. Ekiplerimiz en kısa süre içerisinde sizlere dönüş sağlayacaktır.`;
        break;

      case "basvuru_onaylandi":
        message = `${firmaUnvani || "Firma"}, Tekstil A.Ş. başvurunuz onaylandı! E-postanıza gönderilen bağlantı üzerinden şifrenizi oluşturarak dijital dünyaya ilk adımınızı atabilirsiniz. Aramıza hoş geldiniz!`;
        break;

      case "basvuru_reddedildi":
        message = `${firmaUnvani || "Firma"}, Tekstil A.Ş. başvurunuz ne yazık ki red ile sonuçlandı. Detayları öğrenmek için mailinizi kontrol ediniz. Gerekli düzeltmelerden sonra yeniden başvuru yapabilirsiniz.`;
        break;

      case "odeme_basarili":
        message = `${firmaUnvani || "Firma"}, ödemeniz onaylandı. Tekstil A.Ş. ayrıcalıklarından faydalanmaya hazırsınız.`;
        break;

      case "kota_uyari":
        message = `${body.paketAd || "Paket"} paketinizin ${body.ozellikAd || "özellik"} özelliğinden kalan hakkınız ${body.kalanSayi ?? 0}. Paketinizi yükseltmek için tıklayın: ${SITE_URL}/paketim`;
        break;

      case "kisitlama": {
        const tarih = body.kisitlamaTarihi || new Date().toLocaleDateString("tr-TR");
        const bitis = body.kisitlamaBitis || "-";
        const alanlar = body.kisitlamaAlanlari || "-";
        const kid = body.kisitlamaId || "-";
        message = `${tarih} tarihinde ${kid} ID numaralı kısıtlama gereğince ${alanlar} haklarınız ${bitis} tarihine kadar askıya alınmıştır. Detayları öğrenmek ve itirazda bulunmak için destek@tekstilas.com adresinden veya 0850 242 5700 numarasından iletişim kurabilirsiniz.`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Bilinmeyen type" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }

    const sent = await sendSms(telefon, message);
    console.log(`[NOTIFICATION-SMS] type=${type}, phone=${telefon.slice(0, 4)}****, sent=${sent}`);

    return new Response(JSON.stringify({ success: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[NOTIFICATION-SMS] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
