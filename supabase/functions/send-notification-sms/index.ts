import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SMS_API_URL = "http://194.62.55.240:3000/api/send-sms";
const SITE_URL = "https://tekstilas.com";

interface SmsRequest {
  type:
    | "kayit_alindi"
    | "basvuru_onaylandi"
    | "basvuru_reddedildi"
    | "odeme_basarili"
    | "kota_uyari"
    | "kisitlama"
    | "sifre_degistirildi"
    | "ihale_onaylandi"
    | "ihale_reddedildi"
    | "yeni_teklif"
    | "teklif_kabul"
    | "urun_yayinlandi"
    | "urun_reddedildi"
    | "yeni_mesaj";
  telefon?: string;
  userId?: string;
  firmaUnvani?: string;
  sifreLink?: string;
  paketAd?: string;
  ozellikAd?: string;
  kalanSayi?: number;
  kisitlamaAlanlari?: string;
  kisitlamaBitis?: string;
  ihaleBasligi?: string;
  ihaleDetayLinki?: string;
  ihaleTakipLinki?: string;
  reddedilmeSebebi?: string;
  teklifVerenFirma?: string;
  urunBasligi?: string;
  urunLinki?: string;
  gonderenAdi?: string;
  mesajLinki?: string;
}

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body: SmsRequest = await req.json();
    const { type } = body;

    if (!type) {
      return new Response(JSON.stringify({ error: "type gerekli" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Resolve userId from auth header if not provided
    let userId = body.userId;
    if (!userId) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        try {
          const token = authHeader.replace("Bearer ", "");
          const { data: { user } } = await supabase.auth.getUser(token);
          userId = user?.id;
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
      await logSystem(supabase, "sms", type, `Telefon bulunamadı - type=${type}`, false, {
        user_id: userId,
        hata_mesaji: "Telefon numarası bulunamadı",
        detaylar: { type, userId },
      });
      return new Response(JSON.stringify({ success: false, reason: "telefon_bulunamadi" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const firma = firmaUnvani || "Firma";
    let message = "";

    switch (type) {
      case "kayit_alindi":
        message = `${firma}, Tekstil A.S. basvurunuz alindi. Ekiplerimiz en kisa sure icerisinde sizlere donus saglayacaktir. B038`;
        break;
      case "basvuru_onaylandi":
        message = `${firma}, Tekstil A.S. basvurunuz onaylandi! ${body.sifreLink || SITE_URL + "/sifre-sifirla"} adresinden sifrenizi olusturarak tekstil sektorune ozel is platformuna katilabilirsiniz. Aramiza hos geldiniz! B038`;
        break;
      case "basvuru_reddedildi":
        message = `${firma}, Tekstil A.S. basvurunuz onaylanmamistir. Detaylari e-postanizdan inceleyerek tekrar basvurabilirsiniz. B038`;
        break;
      case "odeme_basarili":
        message = `${firma}, Tekstil A.S. odemeniz basariyla gerceklesmistir. Paketiniz aktiftir, faturaniz e-postaniza iletilecektir. B038`;
        break;
      case "kota_uyari":
        message = `${firma}, Tekstil A.S. ${body.paketAd || "Paket"} paketinizdeki ${body.ozellikAd || "ozellik"} hakkiniz dolmustur. Bir ust pakete gecmek icin: ${SITE_URL}/giris-kayit?redirect=/paketim B038`;
        break;
      case "kisitlama": {
        const bitis = body.kisitlamaBitis || "-";
        const alanlar = body.kisitlamaAlanlari || "-";
        message = `${firma}, Tekstil A.S. ${alanlar} haklariniz ${bitis} tarihine dek kisitlanmistir. Bilgi icin: 08502425700 B038`;
        break;
      }
      case "sifre_degistirildi":
        message = `${firma}, Tekstil A.S. sifreniz guncellenmistir. Islem size ait degilse: 08502425700 veya destek@tekstilas.com B038`;
        break;
      case "ihale_onaylandi":
        message = `${firma}, Tekstil A.S. ${body.ihaleBasligi || "Ihale"}, ihaleniz yayina alinmistir. Incelemek icin: ${body.ihaleDetayLinki || SITE_URL} B038`;
        break;
      case "ihale_reddedildi":
        message = `${firma}, Tekstil A.S. ihale talebiniz ${body.reddedilmeSebebi || ""} nedeniyle onaylanmamistir. Lutfen panelden duzenleyiniz. B038`;
        break;
      case "yeni_teklif":
        message = `${firma}, Tekstil A.S. ${body.ihaleBasligi || "Ihale"} ihaleniz icin ${body.teklifVerenFirma || "Bir firma"} yeni teklif verdi: ${body.ihaleTakipLinki || SITE_URL} B038`;
        break;
      case "teklif_kabul":
        message = `${firma}, Tekstil A.S. ${body.ihaleBasligi || "Ihale"} ihalesi icin teklifiniz kabul edildi! Detaylar: ${body.ihaleDetayLinki || SITE_URL} B038`;
        break;
      case "urun_yayinlandi":
        message = `${firma}, Tekstil A.S. ${body.urunBasligi || "Urun"} ürününüz yayinda! Inceleyin: ${body.urunLinki || SITE_URL} B038`;
        break;
      case "urun_reddedildi":
        message = `${firma}, Tekstil A.S. ${body.urunBasligi || "Urun"} urununuz onaylanmadi. Neden: ${body.reddedilmeSebebi || "-"}. B038`;
        break;
      case "yeni_mesaj":
        message = `${firma}, Tekstil A.S.'de ${body.gonderenAdi || "Bir kullanici"} size mesaj gonderdi: ${body.mesajLinki || SITE_URL + "/mesajlar"} B038`;
        break;
      default:
        return new Response(JSON.stringify({ error: "Bilinmeyen type" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }

    const sent = await sendSms(telefon, message);
    console.log(`[NOTIFICATION-SMS] type=${type}, phone=${telefon.slice(0, 4)}****, sent=${sent}`);

    // Log to system_logs
    await logSystem(supabase, "sms", type, `SMS ${sent ? "gönderildi" : "gönderilemedi"}: ${type} → ${telefon.slice(0, 4)}****`, sent, {
      user_id: userId,
      detaylar: { type, firma: firmaUnvani, telefon_masked: telefon.slice(0, 4) + "****" },
      hata_mesaji: sent ? null : "SMS API yanıt vermedi",
    });

    return new Response(JSON.stringify({ success: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[NOTIFICATION-SMS] Error:", error);
    await logSystem(supabase, "sms", "hata", `SMS gönderim hatası: ${error.message}`, false, {
      hata_mesaji: error.message,
    });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
