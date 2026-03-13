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
    const body = await req.json();
    const { action } = body;

    // Get a single template
    if (action === "get_template") {
      const { templateId } = body;
      const getRes = await fetch(`https://api.postmarkapp.com/templates/${templateId}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
        },
      });
      const template = await getRes.json();
      return new Response(JSON.stringify(template), {
        status: getRes.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a new template
    if (action === "create_template") {
      const { name, subject, htmlBody, textBody } = body;
      const createRes = await fetch("https://api.postmarkapp.com/templates", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
        },
        body: JSON.stringify({
          Name: name,
          Subject: subject,
          HtmlBody: htmlBody,
          TextBody: textBody,
          TemplateType: "Standard",
        }),
      });
      const createData = await createRes.json();
      return new Response(JSON.stringify(createData), {
        status: createRes.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update logo in all templates
    if (action === "update_logo") {
      const { logoUrl, templateIds } = body;
      const results: Array<{ templateId: number; name: string; status: string }> = [];
      for (const templateId of templateIds) {
        const getRes = await fetch(`https://api.postmarkapp.com/templates/${templateId}`, {
          method: "GET",
          headers: { "Accept": "application/json", "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN },
        });
        const template = await getRes.json();
        let htmlBody = template.HtmlBody || "";
        htmlBody = htmlBody.replace(/LOGO_URL_BURAYA/g, logoUrl);
        const putRes = await fetch(`https://api.postmarkapp.com/templates/${templateId}`, {
          method: "PUT",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
          },
          body: JSON.stringify({ Name: template.Name, Subject: template.Subject, HtmlBody: htmlBody, TextBody: template.TextBody }),
        });
        const putData = await putRes.json();
        results.push({ templateId, name: template.Name, status: putRes.ok ? "updated" : `error: ${putData.Message}` });
      }
      return new Response(JSON.stringify({ success: true, results }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_all") {
      // Template ID -> placeholder mapping
      const templateMappings: Record<number, Record<string, string>> = {
        43889443: { // Hoşgeldiniz
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
        },
        43896400: { // Başvurunuzu Aldık
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
        },
        43897478: { // Başvuru Onay
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[Şifre Oluşturma Linki]": "{{sifre_olusturma_linki}}",
          "[sifre_olusturma_linki]": "{{sifre_olusturma_linki}}",
        },
        43897477: { // Başvuru Red
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
        },
        43898501: { // İhaleniz İnceleniyor
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[İhale Başlığı]": "{{ihale_basligi}}",
          "[ihale_basligi]": "{{ihale_basligi}}",
        },
        43898542: { // İhale Onaylandı
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[İhale Başlığı]": "{{ihale_basligi}}",
          "[ihale_basligi]": "{{ihale_basligi}}",
          "[İhale Linki]": "{{ihale_linki}}",
          "[ihale_linki]": "{{ihale_linki}}",
        },
        43898543: { // İhale Reddedildi
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[İhale Başlığı]": "{{ihale_basligi}}",
          "[ihale_basligi]": "{{ihale_basligi}}",
          "[Reddedilme Sebebi]": "{{reddedilme_sebebi}}",
          "[reddedilme_sebebi]": "{{reddedilme_sebebi}}",
        },
        43898544: { // İhale Süresi Doldu
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[İhale Başlığı]": "{{ihale_basligi}}",
          "[ihale_basligi]": "{{ihale_basligi}}",
          "[İhale Takip Linki]": "{{ihale_takip_linki}}",
          "[ihale_takip_linki]": "{{ihale_takip_linki}}",
        },
        43898714: { // İhale Tamamlandı
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[İhale Başlığı]": "{{ihale_basligi}}",
          "[ihale_basligi]": "{{ihale_basligi}}",
        },
        43898480: { // Şifre Değiştirildi
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
        },
        43898675: { // Teklif Kabul Edildi
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[İhale Başlığı]": "{{ihale_basligi}}",
          "[ihale_basligi]": "{{ihale_basligi}}",
          "[İhale Linki]": "{{ihale_linki}}",
          "[ihale_linki]": "{{ihale_linki}}",
        },
        43898681: { // Teklif Reddedildi
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[İhale Başlığı]": "{{ihale_basligi}}",
          "[ihale_basligi]": "{{ihale_basligi}}",
          "[İhale Linki]": "{{ihale_linki}}",
          "[ihale_linki]": "{{ihale_linki}}",
        },
        43898683: { // Ürün Değerlendiriliyor
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[Ürün Başlığı]": "{{urun_basligi}}",
          "[urun_basligi]": "{{urun_basligi}}",
        },
        43898843: { // Ürün Reddedildi
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[Ürün Başlığı]": "{{urun_basligi}}",
          "[urun_basligi]": "{{urun_basligi}}",
          "[Reddedilme Sebebi]": "{{reddedilme_sebebi}}",
          "[reddedilme_sebebi]": "{{reddedilme_sebebi}}",
        },
        43898721: { // Ürün Yayınlandı
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[Ürün Başlığı]": "{{urun_basligi}}",
          "[urun_basligi]": "{{urun_basligi}}",
          "[Ürün Linki]": "{{urun_linki}}",
          "[urun_linki]": "{{urun_linki}}",
        },
        43898845: { // Yeni Mesajınız Var
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[Gönderen Firma Ünvanı]": "{{gonderen_firma_unvani}}",
          "[gonderen_firma_unvani]": "{{gonderen_firma_unvani}}",
          "[Mesaj Linki]": "{{mesaj_linki}}",
          "[mesaj_linki]": "{{mesaj_linki}}",
        },
        43898667: { // Yeni Teklif Geldi
          "[Firma Ünvanı]": "{{firma_unvani}}",
          "[firma_unvani]": "{{firma_unvani}}",
          "[İhale Başlığı]": "{{ihale_basligi}}",
          "[ihale_basligi]": "{{ihale_basligi}}",
          "[Teklif Veren Firma Ünvanı]": "{{teklif_veren_firma_unvani}}",
          "[teklif_veren_firma_unvani]": "{{teklif_veren_firma_unvani}}",
          "[Teklif Linki]": "{{teklif_linki}}",
          "[teklif_linki]": "{{teklif_linki}}",
        },
      };

      const results: Array<{ templateId: number; name: string; status: string; replacements: number }> = [];

      for (const [idStr, replacements] of Object.entries(templateMappings)) {
        const templateId = parseInt(idStr);
        
        // Fetch template
        const getRes = await fetch(`https://api.postmarkapp.com/templates/${templateId}`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
          },
        });
        const template = await getRes.json();

        let htmlBody = template.HtmlBody || "";
        let textBody = template.TextBody || "";
        let subject = template.Subject || "";
        let replacementCount = 0;

        // Apply replacements
        for (const [search, replace] of Object.entries(replacements)) {
          const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          
          const hBefore = htmlBody;
          const tBefore = textBody;
          const sBefore = subject;
          
          htmlBody = htmlBody.replace(regex, replace);
          textBody = textBody.replace(regex, replace);
          subject = subject.replace(regex, replace);
          
          if (hBefore !== htmlBody) replacementCount++;
          if (tBefore !== textBody) replacementCount++;
          if (sBefore !== subject) replacementCount++;
        }

        // Update template
        const putRes = await fetch(`https://api.postmarkapp.com/templates/${templateId}`, {
          method: "PUT",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
          },
          body: JSON.stringify({
            Name: template.Name,
            Subject: subject,
            HtmlBody: htmlBody,
            TextBody: textBody,
          }),
        });

        const putData = await putRes.json();

        results.push({
          templateId,
          name: template.Name,
          status: putRes.ok ? "updated" : `error: ${putData.Message}`,
          replacements: replacementCount,
        });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
