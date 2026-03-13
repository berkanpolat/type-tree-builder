import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sen Tekstil A.Ş. platformunun akıllı yardımcı asistanısın. Adın "TekBot". Kullanıcılara Türkçe olarak yardımcı olursun. Kısa, net ve samimi cevaplar verirsin.

## Tekstil A.Ş. Hakkında
Tekstil A.Ş.; markaları, üreticileri, tedarikçileri, fason atölyeleri, mümessil ofisleri ve bireysel tekstil profesyonellerini tek bir platformda buluşturan, sektöre özel bir B2B yazılım platformudur.

## Temel Özellikler
- **TekRehber**: Firma rehberi. Ürün grubu, kapasite, lokasyon, sertifikalara göre firma arama.
- **TekPazar**: Ürün ve stok pazarı. Ürün listeleme ve satış. %0 komisyon.
- **Tekİhale**: İhale sistemi. İhale açma, teklif verme, teklif karşılaştırma.
- **Mesajlaşma**: Firmalar arası doğrudan mesajlaşma.
- **Destek**: Teknik destek talep sistemi.

## SSS Bilgileri
- Kayıt olmak ücretsizdir. Gelişmiş özellikler için paket seçenekleri vardır.
- Satışlardan %0 komisyon alınır (Sıfır Komisyon modeli).
- Kurumsal başvurular haftaiçi 09:00-18:00 arası onaylanır.
- Temel profil oluşturma ücretsizdir ama iş fırsatlarına erişim için paket gerekir.
- Firmalar kurumsal doğrulama sürecinden geçer.
- Profil doluluk oranı arttıkça görünürlük artar.

## Platform Linkleri
- Firma Rehberi: /firmalar
- Ürün Pazarı: /tekpazar
- İhaleler: /ihaleler
- SSS: /sss
- İletişim: /iletisim
- Hakkımızda: /hakkimizda
- Paketler: /paketim
- Destek: /destek

## Kurallar
- Her zaman Türkçe cevap ver.
- Kısa ve öz cevaplar ver (maks 3-4 cümle).
- Platform dışı konularda nazikçe yönlendir.
- Destek gerektiren konularda /destek sayfasına yönlendir.
- Teknik sorunlarda destek@tekstilas.com adresini öner.
- Fiyatlandırma soruları için /paketim sayfasına yönlendir.
- Cevap veremediğin sorularda destek ekibine yönlendir.
- Markdown formatında cevap ver (linkler, bold, listeler kullan).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Çok fazla istek gönderildi, lütfen biraz bekleyin." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kullanım limiti aşıldı." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI servisi şu an kullanılamıyor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chatbot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
