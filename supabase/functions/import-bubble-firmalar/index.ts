import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUBBLE_API_URL =
  "https://manufixo.bubbleapps.io/version-92jva/api/1.1/obj/firma";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Accept cursor and limit from request body for pagination
  let startCursor = 0;
  let pageLimit = 100;
  try {
    const body = await req.json();
    if (body.cursor !== undefined) startCursor = body.cursor;
    if (body.limit !== undefined) pageLimit = body.limit;
  } catch {}

  const successList: string[] = [];
  const failList: { firma: string; error: string }[] = [];

  try {
    // 1. Load lookup tables
    const [turleriRes, tipleriRes, seceneklerRes] = await Promise.all([
      supabase.from("firma_turleri").select("id, name"),
      supabase.from("firma_tipleri").select("id, name, firma_turu_id"),
      supabase.from("firma_bilgi_secenekleri").select("id, name, kategori_id"),
    ]);

    const turleriMap: Record<string, string> = {};
    turleriRes.data?.forEach((t) => (turleriMap[t.name] = t.id));

    const tipleriMap: Record<string, { id: string; firma_turu_id: string }[]> = {};
    tipleriRes.data?.forEach((t) => {
      if (!tipleriMap[t.name]) tipleriMap[t.name] = [];
      tipleriMap[t.name].push({ id: t.id, firma_turu_id: t.firma_turu_id });
    });

    const seceneklerByName: Record<string, string> = {};
    seceneklerRes.data?.forEach((s) => {
      seceneklerByName[s.name] = s.id;
    });

    // 2. Single batch from Bubble API
    const url = `${BUBBLE_API_URL}?limit=${pageLimit}&cursor=${startCursor}`;
    console.log(`Fetching: cursor=${startCursor}, limit=${pageLimit}`);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Bubble API error: ${res.status} ${await res.text()}`);
    }

    const json = await res.json();
    const results = json.response.results || [];
    const remaining = json.response.remaining || 0;

    for (const item of results) {
      const firmaUnvani = item["Firma Unvanı"];
      if (!firmaUnvani) {
        failList.push({ firma: "(boş ünvan)", error: "Firma Unvanı yok" });
        continue;
      }

      try {
        // Lookup firma_turu_id
        const firmaTuruName = item["Firma Türü op"];
        const firmaTuruId = turleriMap[firmaTuruName];
        if (!firmaTuruId) {
          failList.push({ firma: firmaUnvani, error: `Firma türü bulunamadı: ${firmaTuruName}` });
          continue;
        }

        // Lookup firma_tipi_id
        const firmaTipiName = item["Firma Tipi op"];
        const tipiCandidates = tipleriMap[firmaTipiName] || [];
        const firmaTipiId = tipiCandidates.find(
          (t) => t.firma_turu_id === firmaTuruId
        )?.id || tipiCandidates[0]?.id;
        if (!firmaTipiId) {
          failList.push({ firma: firmaUnvani, error: `Firma tipi bulunamadı: ${firmaTipiName}` });
          continue;
        }

        // Vergi (nullable)
        const vergiNo = (item[" Vergi Numarası"] || "").trim() || null;
        const vergiDairesi = (item[" Vergi Dairesi"] || "").trim() || null;

        // Email for auth user
        const email = (item["iletişim E-Posta Adresi"] || "").trim();
        if (!email) {
          failList.push({ firma: firmaUnvani, error: "E-posta adresi yok" });
          continue;
        }

        // Create or find auth user
        let userId: string;
        const randomPass = crypto.randomUUID() + "Ax1!";
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email,
            password: randomPass,
            email_confirm: true,
          });

        if (authError) {
          if (authError.message?.includes("already been registered")) {
            // Find existing user by email
            const { data: listData } = await supabase.auth.admin.listUsers();
            const existingUser = listData?.users?.find(u => u.email === email);
            if (!existingUser) {
              failList.push({ firma: firmaUnvani, error: `Kullanıcı bulunamadı: ${email}` });
              continue;
            }
            userId = existingUser.id;

            // Check if firma already exists for this user
            const { data: existingFirma } = await supabase
              .from("firmalar")
              .select("id")
              .eq("user_id", userId)
              .maybeSingle();
            if (existingFirma) {
              failList.push({ firma: firmaUnvani, error: `Firma zaten mevcut: ${email}` });
              continue;
            }
          } else {
            failList.push({ firma: firmaUnvani, error: `Auth hatası: ${authError.message}` });
            continue;
          }
        } else {
          userId = authData.user.id;
        }

        // Lookup optional IDs
        const ilName = item["il"];
        const ilceAdi = item["ilçe"];
        const firmaOlcegi = item["Firma Ölçeği"];
        const ilId = ilName ? seceneklerByName[ilName] || null : null;
        const ilceId = ilceAdi ? seceneklerByName[ilceAdi] || null : null;
        const olcegiId = firmaOlcegi ? seceneklerByName[firmaOlcegi] || null : null;

        const fixUrl = (url: string | null) => {
          if (!url) return null;
          if (url.startsWith("//")) return "https:" + url;
          return url;
        };

        const kurulusTarihi = item["Kuruluş Tarihi"]
          ? item["Kuruluş Tarihi"].split("T")[0]
          : null;

        // Insert profile (upsert - skip if exists)
        const telefon = (item["telefon"] || "").trim();
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              user_id: userId,
              ad: firmaUnvani.split(" ")[0] || "İthal",
              soyad: firmaUnvani.split(" ").slice(1).join(" ") || "Firma",
              iletisim_email: email,
              iletisim_numarasi: telefon || null,
            });

          if (profileError) {
            failList.push({ firma: firmaUnvani, error: `Profil hatası: ${profileError.message}` });
            continue;
          }
        }

        // Insert firma
        const { data: firmaData, error: firmaError } = await supabase
          .from("firmalar")
          .insert({
            user_id: userId,
            firma_unvani: firmaUnvani,
            firma_turu_id: firmaTuruId,
            firma_tipi_id: firmaTipiId,
            vergi_numarasi: vergiNo,
            vergi_dairesi: vergiDairesi,
            firma_hakkinda: item["Firma Hakkında"] || null,
            firma_olcegi_id: olcegiId,
            kurulus_tarihi: kurulusTarihi,
            kurulus_il_id: ilId,
            kurulus_ilce_id: ilceId,
            logo_url: fixUrl(item["logo"]),
            kapak_fotografi_url: fixUrl(item["Kapak Fotoğrafı"]),
            web_sitesi: item["Web Sitesi"] || null,
            instagram: item["instagram adresi"] || null,
            firma_iletisim_email: email,
            firma_iletisim_numarasi: telefon || null,
            aylik_uretim_kapasitesi: item["Aylık Üretim Kapasitesi"] || null,
            moq: item["Minimum Sipariş Miktarı (MOQ)"] || null,
            uretim_satis_rolu: item["Cinsi"] || null,
          })
          .select("id")
          .single();

        if (firmaError) {
          failList.push({ firma: firmaUnvani, error: `Firma hatası: ${firmaError.message}` });
          continue;
        }

        // Insert galeri
        const galeriUrls: string[] = item["galeri"] || [];
        if (galeriUrls.length > 0 && firmaData) {
          const galeriRows = galeriUrls.map((url: string) => ({
            firma_id: firmaData.id,
            foto_url: fixUrl(url)!,
            foto_adi: null,
          }));
          await supabase.from("firma_galeri").insert(galeriRows);
        }

        successList.push(firmaUnvani);
      } catch (err) {
        failList.push({
          firma: firmaUnvani,
          error: `Beklenmeyen hata: ${err.message}`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        basarili_sayisi: successList.length,
        basarisiz_sayisi: failList.length,
        basarili_firmalar: successList,
        basarisiz_firmalar: failList,
        next_cursor: startCursor + results.length,
        remaining,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(
      JSON.stringify({
        error: err.message,
        basarili_sayisi: successList.length,
        basarili_firmalar: successList,
        basarisiz_firmalar: failList,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
