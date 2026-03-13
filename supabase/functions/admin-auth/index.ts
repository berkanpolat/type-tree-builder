import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const POSTMARK_API_URL = "https://api.postmarkapp.com/email/withTemplate";
const FROM_EMAIL = "info@tekstilas.com";
const SITE_URL = "https://type-tree-builder.lovable.app";

const EMAIL_TEMPLATES: Record<string, number> = {
  basvuru_onay: 43897478,
  basvuru_red: 43897477,
  ihale_onaylandi: 43898542,
  ihale_reddedildi: 43898543,
  urun_yayinlandi: 43898721,
  urun_reddedildi: 43898843,
};

async function sendPostmarkEmail(templateKey: string, to: string, model: Record<string, string>) {
  const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
  if (!POSTMARK_SERVER_TOKEN) { console.error("[EMAIL] No POSTMARK_SERVER_TOKEN"); return; }
  const templateId = EMAIL_TEMPLATES[templateKey];
  if (!templateId) { console.error(`[EMAIL] Unknown template: ${templateKey}`); return; }
  try {
    const res = await fetch(POSTMARK_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        To: to,
        TemplateId: templateId,
        TemplateModel: {
          ...model,
          platform_adi: "Tekstil A.Ş.",
          destek_email: "info@manufixo.com",
          yil: new Date().getFullYear().toString(),
          site_url: SITE_URL,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) console.error(`[EMAIL] Postmark error ${templateKey}:`, data.Message);
    else console.log(`[EMAIL] Sent ${templateKey} to ${to}, ID: ${data.MessageID}`);
  } catch (e) {
    console.error(`[EMAIL] Failed ${templateKey}:`, e);
  }
}

function generateRandomPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function verifyToken(token: string) {
  const payload = JSON.parse(atob(token));
  if (payload.exp < Date.now()) throw new Error("Token süresi dolmuş");
  return payload;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logActivity(supabase: any, payload: any, action: string, opts: { target_type?: string; target_id?: string; target_label?: string; details?: Record<string, any> } = {}) {
  try {
    const { data: adminUser } = await supabase.from("admin_users").select("ad, soyad, pozisyon").eq("id", payload.id).single();
    await supabase.from("admin_activity_log").insert({
      admin_id: payload.id,
      admin_username: payload.username,
      admin_ad: adminUser?.ad || "—",
      admin_soyad: adminUser?.soyad || "—",
      admin_pozisyon: adminUser?.pozisyon || "—",
      action,
      target_type: opts.target_type || null,
      target_id: opts.target_id || null,
      target_label: opts.target_label || null,
      details: opts.details || {},
    });
  } catch {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();

    // ─── LOGIN ───
    if (action === "login") {
      const { username, password } = body;
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !data) {
        return jsonResponse({ error: "Geçersiz kullanıcı adı veya şifre" }, 401);
      }

      const { data: match } = await supabase.rpc("admin_verify_password", {
        p_username: username,
        p_password: password,
      });

      if (!match) {
        return jsonResponse({ error: "Geçersiz kullanıcı adı veya şifre" }, 401);
      }

      const tokenPayload = {
        id: data.id,
        username: data.username,
        is_primary: data.is_primary,
        permissions: data.permissions,
        exp: Date.now() + 24 * 60 * 60 * 1000,
      };
      const token = btoa(JSON.stringify(tokenPayload));
      const { password_hash, ...user } = data;

      await logActivity(supabase, tokenPayload, "login", { target_type: "admin_user", target_label: data.ad + " " + data.soyad });

      return jsonResponse({ user, token });
    }

    // ─── VERIFY ───
    if (action === "verify") {
      const { token } = body;
      try {
        const payload = verifyToken(token);
        const { data } = await supabase
          .from("admin_users")
          .select("id, username, ad, soyad, email, telefon, pozisyon, is_primary, permissions, created_at")
          .eq("id", payload.id)
          .single();
        if (!data) return jsonResponse({ error: "Kullanıcı bulunamadı" }, 401);
        return jsonResponse({ user: data });
      } catch {
        return jsonResponse({ error: "Geçersiz token" }, 401);
      }
    }

    // ─── LIST ADMIN USERS ───
    if (action === "list-users") {
      const payload = verifyToken(body.token);
      const { data } = await supabase
        .from("admin_users")
        .select("id, username, ad, soyad, email, telefon, pozisyon, is_primary, permissions, created_at")
        .order("created_at", { ascending: true });
      return jsonResponse({ users: data });
    }

    // ─── CREATE ADMIN USER ───
    if (action === "create-user") {
      const { token, user: newUser } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.kullanici_ekle) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const { data: hashResult } = await supabase.rpc("admin_hash_password", {
        p_password: newUser.password,
      });

      const { data, error } = await supabase
        .from("admin_users")
        .insert({
          username: newUser.username,
          password_hash: hashResult,
          ad: newUser.ad,
          soyad: newUser.soyad,
          email: newUser.email || null,
          telefon: newUser.telefon || null,
          pozisyon: newUser.pozisyon,
          permissions: newUser.permissions,
          created_by: payload.id,
        })
        .select("id, username, ad, soyad, email, telefon, pozisyon, is_primary, permissions, created_at")
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(supabase, payload, "create-user", { target_type: "admin_user", target_id: data.id, target_label: `${data.ad} ${data.soyad}`, details: { username: data.username, pozisyon: data.pozisyon } });
      return jsonResponse({ user: data });
    }
    if (action === "update-user") {
      const { token, userId, updates } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.kullanici_yonet) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const updateData: Record<string, unknown> = {
        ad: updates.ad,
        soyad: updates.soyad,
        email: updates.email || null,
        telefon: updates.telefon || null,
        pozisyon: updates.pozisyon,
        permissions: updates.permissions,
        updated_at: new Date().toISOString(),
      };

      if (updates.password) {
        const { data: hashResult } = await supabase.rpc("admin_hash_password", {
          p_password: updates.password,
        });
        updateData.password_hash = hashResult;
      }

      const { data, error } = await supabase
        .from("admin_users")
        .update(updateData)
        .eq("id", userId)
        .select("id, username, ad, soyad, email, telefon, pozisyon, is_primary, permissions, created_at")
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(supabase, payload, "update-user", { target_type: "admin_user", target_id: userId, target_label: `${data.ad} ${data.soyad}`, details: { pozisyon: data.pozisyon } });
      return jsonResponse({ user: data });
    }
    if (action === "delete-user") {
      const { token, userId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary) return jsonResponse({ error: "Yetkisiz" }, 401);

      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", userId)
        .eq("is_primary", false);

      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(supabase, payload, "delete-user", { target_type: "admin_user", target_id: userId });
      return jsonResponse({ success: true });
    }
    if (action === "list-firmalar") {
      const payload = verifyToken(body.token);

      // Helper: fetch all rows bypassing 1000-row default limit
      async function fetchAll(table: string, select: string, opts?: { order?: string; filter?: [string, string, any] }) {
        const PAGE_SIZE = 1000;
        let allRows: any[] = [];
        let from = 0;
        while (true) {
          let q = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
          if (opts?.order) q = q.order(opts.order, { ascending: false });
          if (opts?.filter) q = q.eq(opts.filter[1], opts.filter[2]);
          const { data, error } = await q;
          if (error || !data || data.length === 0) break;
          allRows = allRows.concat(data);
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return allRows;
      }

      // Helper: .in() with batching for arrays > 1000
      async function fetchIn(table: string, select: string, column: string, ids: string[]) {
        if (ids.length === 0) return [];
        const BATCH = 1000;
        let allRows: any[] = [];
        for (let i = 0; i < ids.length; i += BATCH) {
          const batch = ids.slice(i, i + BATCH);
          const { data } = await supabase.from(table).select(select).in(column, batch);
          if (data) allRows = allRows.concat(data);
        }
        return allRows;
      }

      // Get all firmalar with profiles, firma_turleri, firma_tipleri
      const firmalar = await fetchAll("firmalar", `
          id, firma_unvani, logo_url, created_at, updated_at, onay_durumu, user_id,
          firma_turu_id, firma_tipi_id, kurulus_il_id, kurulus_ilce_id,
          firma_olcegi_id, vergi_numarasi, vergi_dairesi,
          firma_iletisim_email, firma_iletisim_numarasi, web_sitesi,
          instagram, facebook, linkedin, x_twitter, tiktok,
          kapak_fotografi_url, firma_hakkinda, kurulus_tarihi,
          kurulus_il_id, kurulus_ilce_id, moq, aylik_uretim_kapasitesi,
          firma_turleri:firma_turu_id(id, name),
          firma_tipleri:firma_tipi_id(id, name)
        `, { order: "created_at" });

      // Get profiles for all users
      const userIds = firmalar.map((f: any) => f.user_id);
      const profiles = await fetchIn("profiles", "user_id, ad, soyad, iletisim_email, iletisim_numarasi, last_seen", "user_id", userIds);

      // Get counts per firma
      const ihaleCounts = await fetchIn("ihaleler", "user_id", "user_id", userIds);
      const teklifCounts = await fetchIn("ihale_teklifler", "teklif_veren_user_id", "teklif_veren_user_id", userIds);
      const urunCounts = await fetchIn("urunler", "user_id", "user_id", userIds);
      const sikayetCounts = await fetchIn("sikayetler", "bildiren_user_id", "bildiren_user_id", userIds);

      // Get il/ilce names
      const ilIds = firmalar.map((f: any) => f.kurulus_il_id).filter(Boolean);
      const ilceIds = firmalar.map((f: any) => f.kurulus_ilce_id).filter(Boolean);
      const allLocationIds = [...new Set([...ilIds, ...ilceIds])];
      
      let locationMap: Record<string, string> = {};
      if (allLocationIds.length > 0) {
        const locations = await fetchIn("firma_bilgi_secenekleri", "id, name", "id", allLocationIds as string[]);
        locationMap = Object.fromEntries(locations.map((l: any) => [l.id, l.name]));
      }

      // Calculate profile completion
      const FIRMA_FIELDS = [
        "firma_unvani", "firma_turu_id", "firma_tipi_id", "vergi_numarasi", "vergi_dairesi",
        "firma_olcegi_id", "kurulus_tarihi", "kurulus_il_id", "kurulus_ilce_id", "web_sitesi",
        "firma_iletisim_numarasi", "firma_iletisim_email", "instagram", "facebook", "linkedin",
        "x_twitter", "tiktok", "logo_url", "kapak_fotografi_url", "firma_hakkinda",
      ];

      // Get subscription/package info for each user
      const abonelikler = await fetchIn("kullanici_abonelikler", "user_id, paket_id, periyot, donem_baslangic, donem_bitis, durum, stripe_subscription_id", "user_id", userIds);

      const { data: paketler } = await supabase
        .from("paketler")
        .select("id, ad, slug, profil_goruntuleme_limiti, ihale_acma_limiti, teklif_verme_limiti, aktif_urun_limiti, mesaj_limiti");

      const paketMap: Record<string, any> = {};
      for (const p of (paketler || [])) paketMap[p.id] = p;

      const enriched = firmalar.map((f: any) => {
        const profile = profiles.find((p: any) => p.user_id === f.user_id);
        const ihaleCount = ihaleCounts.filter((i: any) => i.user_id === f.user_id).length;
        const teklifCount = teklifCounts.filter((t: any) => t.teklif_veren_user_id === f.user_id).length;
        const urunCount = urunCounts.filter((u: any) => u.user_id === f.user_id).length;
        const sikayetCount = sikayetCounts.filter((s: any) => s.bildiren_user_id === f.user_id).length;

        let filled = 0;
        for (const field of FIRMA_FIELDS) {
          const val = f[field];
          if (val !== null && val !== undefined && val !== "") filled++;
        }
        const profilDoluluk = Math.round((filled / FIRMA_FIELDS.length) * 100);

        const abonelik = abonelikler.find((a: any) => a.user_id === f.user_id);
        const paket = abonelik ? paketMap[abonelik.paket_id] || null : null;

        return {
          ...f,
          profile,
          firma_turu_name: f.firma_turleri?.name || null,
          firma_tipi_name: f.firma_tipleri?.name || null,
          il_name: f.kurulus_il_id ? locationMap[f.kurulus_il_id] || null : null,
          ilce_name: f.kurulus_ilce_id ? locationMap[f.kurulus_ilce_id] || null : null,
          ihale_sayisi: ihaleCount,
          teklif_sayisi: teklifCount,
          urun_sayisi: urunCount,
          sikayet_sayisi: sikayetCount,
          profil_doluluk: profilDoluluk,
          abonelik: abonelik ? {
            paket_id: abonelik.paket_id,
            paket_ad: paket?.ad || "—",
            paket_slug: paket?.slug || "",
            periyot: abonelik.periyot,
            donem_baslangic: abonelik.donem_baslangic,
            donem_bitis: abonelik.donem_bitis,
            durum: abonelik.durum,
            limits: paket ? {
              profil_goruntuleme_limiti: paket.profil_goruntuleme_limiti,
              ihale_acma_limiti: paket.ihale_acma_limiti,
              teklif_verme_limiti: paket.teklif_verme_limiti,
              aktif_urun_limiti: paket.aktif_urun_limiti,
              mesaj_limiti: paket.mesaj_limiti,
            } : null,
          } : null,
        };
      });

      return jsonResponse({ firmalar: enriched });
    }

    // ─── APPROVE/REJECT FIRMA ───
    if (action === "approve-firma" || action === "reject-firma") {
      const { token, firmaId } = body;
      const payload = verifyToken(token);

      const newStatus = action === "approve-firma" ? "onaylandi" : "onaysiz";

      const { data: firma, error: firmaError } = await supabase
        .from("firmalar")
        .update({ onay_durumu: newStatus })
        .eq("id", firmaId)
        .select("user_id, firma_unvani")
        .single();

      if (firmaError) return jsonResponse({ error: firmaError.message }, 400);

      // Get user phone for SMS
      const { data: profile } = await supabase
        .from("profiles")
        .select("iletisim_numarasi")
        .eq("user_id", firma.user_id)
        .single();
      const userPhone = profile?.iletisim_numarasi;

      // Get user email from auth
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(firma.user_id);
      
      if (authUser?.email) {
        if (action === "approve-firma") {
          // 1) Set random password so old password is invalidated
          const randomPassword = generateRandomPassword(12);
          try {
            await supabase.auth.admin.updateUserById(firma.user_id, {
              password: randomPassword,
              user_metadata: {
                ...(authUser.user_metadata ?? {}),
                must_set_password: true,
              },
            });
          } catch (e) {
            console.error("Failed to set random password:", e);
          }

          // 2) Send recovery email via existing email system (Lovable hook)
          const siteUrl = req.headers.get("origin") || Deno.env.get("SITE_URL") || SITE_URL;
          const recoveryLink = `${siteUrl}/sifre-sifirla`;
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
            await fetch(`${supabaseUrl}/auth/v1/recover`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
              },
              body: JSON.stringify({
                email: authUser.email,
                redirect_to: recoveryLink,
              }),
            });
            console.log("Recovery email sent to:", authUser.email);
          } catch (e) {
            console.error("Recovery email failed:", e);
          }

          // 3) Send Postmark approval email
          await sendPostmarkEmail("basvuru_onay", authUser.email, {
            firma_unvani: firma.firma_unvani,
            sifre_olusturma_linki: recoveryLink,
          });

          const message = `${firma.firma_unvani} firmanızın başvurusu onaylanmıştır. Şifre belirleme bağlantısı e-posta adresinize gönderilmiştir.`;
          await supabase.from("notifications").insert({
            user_id: firma.user_id,
            type: "firma_onaylandi",
            message,
            link: null,
          });

          // Send approval SMS
          if (userPhone) {
            try {
              await fetch("http://194.62.55.240:3000/api/send-sms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  messages: [{
                    msg: `${firma.firma_unvani}, Tekstil A.S. basvurunuz onaylandi! E-postaniza gonderilen baglanti uzerinden sifrenizi belirleyerek giris yapabilirsiniz. Aramiza hos geldiniz!`,
                    dest: userPhone,
                    id: "1",
                  }],
                }),
              });
            } catch (smsErr) {
              console.error("Approval SMS failed:", smsErr);
            }
          }
        } else {
          // Send Postmark rejection email
          await sendPostmarkEmail("basvuru_red", authUser.email, {
            firma_unvani: firma.firma_unvani,
          });

          const message = `${firma.firma_unvani} firmanızın başvurusu reddedilmiştir. Detaylı bilgi için bizimle iletişime geçebilirsiniz.`;
          await supabase.from("notifications").insert({
            user_id: firma.user_id,
            type: "firma_reddedildi",
            message,
            link: null,
          });

          // Send rejection SMS
          if (userPhone) {
            try {
              await fetch("http://194.62.55.240:3000/api/send-sms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  messages: [{
                    msg: `${firma.firma_unvani}, Tekstil A.S. basvurunuz ne yazik ki red ile sonuclandi. Detaylari ogrenmek icin mailinizi kontrol ediniz. Gerekli duzeltmelerden sonra yeniden basvuru yapabilirsiniz.`,
                    dest: userPhone,
                    id: "1",
                  }],
                }),
              });
            } catch (smsErr) {
              console.error("Rejection SMS failed:", smsErr);
            }
          }
        }
      }

      await logActivity(supabase, payload, action, { target_type: "firma", target_id: firmaId, target_label: firma.firma_unvani, details: { new_status: newStatus } });
      return jsonResponse({ success: true, status: newStatus });
    }

    // ─── DELETE FIRMA ───
    if (action === "delete-firma") {
      const { token, firmaId } = body;
      const payload = verifyToken(token);

      // Get firma info before deleting
      const { data: firma, error: firmaError } = await supabase
        .from("firmalar")
        .select("user_id, firma_unvani")
        .eq("id", firmaId)
        .single();

      if (firmaError || !firma) return jsonResponse({ error: "Firma bulunamadı" }, 404);

      const userId = firma.user_id;

      // Delete related data in order (foreign key dependencies)
      await supabase.from("firma_makineler").delete().eq("firma_id", firmaId);
      await supabase.from("firma_tesisler").delete().eq("firma_id", firmaId);
      await supabase.from("firma_sertifikalar").delete().eq("firma_id", firmaId);
      await supabase.from("firma_teknolojiler").delete().eq("firma_id", firmaId);
      await supabase.from("firma_uretim_satis").delete().eq("firma_id", firmaId);
      await supabase.from("firma_urun_hizmet_secimler").delete().eq("firma_id", firmaId);
      await supabase.from("firma_referanslar").delete().eq("firma_id", firmaId);
      await supabase.from("firma_galeri").delete().eq("firma_id", firmaId);
      await supabase.from("firma_favoriler").delete().eq("firma_id", firmaId);
      await supabase.from("profil_goruntulemeler").delete().eq("firma_id", firmaId);

      // Delete user-related data
      await supabase.from("ihale_teklifler").delete().eq("teklif_veren_user_id", userId);
      await supabase.from("urun_favoriler").delete().eq("user_id", userId);
      await supabase.from("notifications").delete().eq("user_id", userId);
      await supabase.from("kullanici_abonelikler").delete().eq("user_id", userId);

      // Delete urun varyasyonlar for user's products
      const { data: userUrunler } = await supabase.from("urunler").select("id").eq("user_id", userId);
      if (userUrunler?.length) {
        const urunIds = userUrunler.map(u => u.id);
        await supabase.from("urun_varyasyonlar").delete().in("id", urunIds);
        await supabase.from("urun_favoriler").delete().in("urun_id", urunIds);
      }
      await supabase.from("urunler").delete().eq("user_id", userId);

      // Delete ihale related
      const { data: userIhaleler } = await supabase.from("ihaleler").select("id").eq("user_id", userId);
      if (userIhaleler?.length) {
        const ihaleIds = userIhaleler.map(i => i.id);
        await supabase.from("ihale_teklifler").delete().in("ihale_id", ihaleIds);
        await supabase.from("ihale_stok").delete().in("ihale_id", ihaleIds);
        await supabase.from("ihale_filtreler").delete().in("ihale_id", ihaleIds);
      }
      await supabase.from("ihaleler").delete().eq("user_id", userId);

      // Delete conversations & messages
      const { data: convs } = await supabase.from("conversations").select("id").or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      if (convs?.length) {
        const convIds = convs.map(c => c.id);
        await supabase.from("messages").delete().in("conversation_id", convIds);
        await supabase.from("conversations").delete().in("id", convIds);
      }

      // Delete destek
      const { data: destekler } = await supabase.from("destek_talepleri").select("id").eq("user_id", userId);
      if (destekler?.length) {
        const destekIds = destekler.map(d => d.id);
        await supabase.from("destek_mesajlar").delete().in("destek_id", destekIds);
      }
      await supabase.from("destek_talepleri").delete().eq("user_id", userId);

      // Delete sikayetler
      await supabase.from("sikayetler").delete().eq("bildiren_user_id", userId);
      await supabase.from("firma_kisitlamalar").delete().eq("user_id", userId);
      await supabase.from("firma_uzaklastirmalar").delete().eq("user_id", userId);

      // Delete firma and profile
      await supabase.from("firmalar").delete().eq("id", firmaId);
      await supabase.from("profiles").delete().eq("user_id", userId);

      // Delete auth user
      await supabase.auth.admin.deleteUser(userId);

      await logActivity(supabase, payload, "delete-firma", { target_type: "firma", target_id: firmaId, target_label: firma.firma_unvani });
      return jsonResponse({ success: true });
    }

    // ─── GET FIRMA DETAIL (for review popup) ───
    if (action === "get-firma-detail") {
      const { token, firmaId } = body;
      const payload = verifyToken(token);

      const { data: firma } = await supabase
        .from("firmalar")
        .select("*")
        .eq("id", firmaId)
        .single();

      if (!firma) return jsonResponse({ error: "Firma bulunamadı" }, 404);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", firma.user_id)
        .single();

      // Get firma türü and tipi names
      const { data: firmaType } = await supabase
        .from("firma_turleri")
        .select("name")
        .eq("id", firma.firma_turu_id)
        .single();

      const { data: firmaTip } = await supabase
        .from("firma_tipleri")
        .select("name")
        .eq("id", firma.firma_tipi_id)
        .single();

      // Get user email
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(firma.user_id);

      return jsonResponse({
        firma: {
          ...firma,
          firma_turu_name: firmaType?.name,
          firma_tipi_name: firmaTip?.name,
        },
        profile,
        email: authUser?.email,
      });
    }

    // ─── IMPERSONATE (login as firma user) ───
    if (action === "impersonate") {
      const { token, userId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary) return jsonResponse({ error: "Yetkisiz" }, 401);

      const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(userId);
      if (!targetUser || !targetUser.email) return jsonResponse({ error: "Kullanıcı bulunamadı" }, 404);

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: targetUser.email,
      });

      if (linkError || !linkData) return jsonResponse({ error: linkError?.message || "Link oluşturulamadı" }, 400);

      // Extract the hashed_token from action_link and build a verify URL
      const actionLink = linkData.properties?.action_link;
      if (!actionLink) return jsonResponse({ error: "Action link bulunamadı" }, 500);

      // We need to verify this token server-side to get session tokens
      const url = new URL(actionLink);
      const tokenHash = url.searchParams.get("token") || url.hash?.split("token=")[1];
      const type = url.searchParams.get("type") || "magiclink";
      
      // Verify the OTP to get actual session tokens
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: type as any,
      });

      if (verifyError || !verifyData.session) {
        return jsonResponse({ error: verifyError?.message || "Token doğrulanamadı" }, 400);
      }

      await logActivity(supabase, payload, "impersonate", { target_type: "firma", target_id: userId, target_label: targetUser.email });

      return jsonResponse({
        success: true,
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
      });
    }

    // ─── FIRMA STATS (for summary cards) ───
    if (action === "firma-stats") {
      const { token, days } = body;
      const payload = verifyToken(token);

      const { count: totalCount } = await supabase
        .from("firmalar")
        .select("*", { count: "exact", head: true });

      // Count by firma_turu
      // Fetch all firmalar (bypass 1000-row limit)
      let allFirmalar: any[] = [];
      let firmaFrom = 0;
      while (true) {
        const { data: batch } = await supabase.from("firmalar").select("firma_turu_id, firma_tipi_id").range(firmaFrom, firmaFrom + 999);
        if (!batch || batch.length === 0) break;
        allFirmalar = allFirmalar.concat(batch);
        if (batch.length < 1000) break;
        firmaFrom += 1000;
      }
      const firmalar = allFirmalar;

      const { data: turler } = await supabase
        .from("firma_turleri")
        .select("id, name");

      const { data: tipler } = await supabase
        .from("firma_tipleri")
        .select("id, name, firma_turu_id");

      const turDagilimi = (turler || []).map((t: any) => ({
        name: t.name,
        id: t.id,
        count: (firmalar || []).filter((f: any) => f.firma_turu_id === t.id).length,
      }));

      // Firma tipi breakdown
      const tipDagilimi = (tipler || []).map((tp: any) => ({
        name: tp.name,
        id: tp.id,
        firma_turu_id: tp.firma_turu_id,
        count: (firmalar || []).filter((f: any) => f.firma_tipi_id === tp.id).length,
      })).filter((tp: any) => tp.count > 0);

      // Recent registrations
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - (days || 7));
      const { count: recentCount } = await supabase
        .from("firmalar")
        .select("*", { count: "exact", head: true })
        .gte("created_at", daysAgo.toISOString());

      const { count: pendingCount } = await supabase
        .from("firmalar")
        .select("*", { count: "exact", head: true })
        .eq("onay_durumu", "onay_bekliyor");

      // Package subscriber counts (bypass 1000-row limit)
      let allAbonelikler: any[] = [];
      let aboneFrom = 0;
      while (true) {
        const { data: batch } = await supabase.from("kullanici_abonelikler").select("paket_id, user_id, donem_baslangic, durum").range(aboneFrom, aboneFrom + 999);
        if (!batch || batch.length === 0) break;
        allAbonelikler = allAbonelikler.concat(batch);
        if (batch.length < 1000) break;
        aboneFrom += 1000;
      }
      const abonelikler = allAbonelikler;

      const { data: paketler } = await supabase
        .from("paketler")
        .select("id, ad, slug");

      const paketDagilimi = (paketler || []).map((p: any) => ({
        id: p.id,
        ad: p.ad,
        slug: p.slug,
        count: (abonelikler || []).filter((a: any) => a.paket_id === p.id && a.durum === "aktif").length,
      }));

      // New subscribers by period (24h, 1w, 1m)
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const w1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const m1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const yeniAboneler = {
        son24saat: (abonelikler || []).filter((a: any) => a.durum === "aktif" && new Date(a.donem_baslangic) >= h24).length,
        sonBirHafta: (abonelikler || []).filter((a: any) => a.durum === "aktif" && new Date(a.donem_baslangic) >= w1).length,
        sonBirAy: (abonelikler || []).filter((a: any) => a.durum === "aktif" && new Date(a.donem_baslangic) >= m1).length,
      };

      // Online user count (active in last 15 minutes via last_seen)
      const onlineThreshold = new Date(now.getTime() - 15 * 60 * 1000);
      const { count: onlineCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_seen", onlineThreshold.toISOString());

      return jsonResponse({
        total: totalCount || 0,
        turDagilimi,
        tipDagilimi,
        recent: recentCount || 0,
        pending: pendingCount || 0,
        paketDagilimi,
        yeniAboneler,
        onlineCount: onlineCount || 0,
      });
    }

    // ─── LIST ALL IHALELER (for admin panel) ───
    if (action === "list-ihaleler") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      // Fetch all ihaleler (bypass 1000-row limit)
      let allIhaleler: any[] = [];
      let ihaleFrom = 0;
      while (true) {
        const { data: batch, error: batchError } = await supabase.from("ihaleler").select("*").order("created_at", { ascending: false }).range(ihaleFrom, ihaleFrom + 999);
        if (batchError || !batch || batch.length === 0) break;
        allIhaleler = allIhaleler.concat(batch);
        if (batch.length < 1000) break;
        ihaleFrom += 1000;
      }
      const ihaleler = allIhaleler;

      // Get firma names for all user_ids
      const userIds = [...new Set((ihaleler || []).map((i: any) => i.user_id))];
      const { data: firmalar } = await supabase
        .from("firmalar")
        .select("user_id, firma_unvani")
        .in("user_id", userIds);

      // Get teklif counts per ihale
      const ihaleIds = (ihaleler || []).map((i: any) => i.id);
      const { data: teklifler } = await supabase
        .from("ihale_teklifler")
        .select("ihale_id, id")
        .in("ihale_id", ihaleIds);

      // Get category names
      const catIds = [
        ...(ihaleler || []).map((i: any) => i.urun_kategori_id).filter(Boolean),
        ...(ihaleler || []).map((i: any) => i.urun_grup_id).filter(Boolean),
        ...(ihaleler || []).map((i: any) => i.urun_tur_id).filter(Boolean),
        ...(ihaleler || []).map((i: any) => i.hizmet_kategori_id).filter(Boolean),
        ...(ihaleler || []).map((i: any) => i.hizmet_tur_id).filter(Boolean),
      ];
      const uniqueCatIds = [...new Set(catIds)];
      let catMap: Record<string, string> = {};
      if (uniqueCatIds.length > 0) {
        const { data: cats } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name")
          .in("id", uniqueCatIds);
        if (cats) catMap = Object.fromEntries(cats.map((c: any) => [c.id, c.name]));
      }

      const enriched = (ihaleler || []).map((i: any) => {
        const firma = (firmalar || []).find((f: any) => f.user_id === i.user_id);
        const teklifCount = (teklifler || []).filter((t: any) => t.ihale_id === i.id).length;

        // Determine category label
        let kategoriLabel = "";
        if (i.ihale_turu === "hizmet") {
          const hk = i.hizmet_kategori_id ? catMap[i.hizmet_kategori_id] : "";
          const ht = i.hizmet_tur_id ? catMap[i.hizmet_tur_id] : "";
          kategoriLabel = [hk, ht].filter(Boolean).join(" > ");
        } else {
          const uk = i.urun_kategori_id ? catMap[i.urun_kategori_id] : "";
          const ug = i.urun_grup_id ? catMap[i.urun_grup_id] : "";
          const ut = i.urun_tur_id ? catMap[i.urun_tur_id] : "";
          kategoriLabel = [uk, ug, ut].filter(Boolean).join(" > ");
        }

        return {
          ...i,
          firma_unvani: firma?.firma_unvani || "—",
          teklif_sayisi: teklifCount,
          kategori_label: kategoriLabel || "—",
        };
      });

      return jsonResponse({ ihaleler: enriched });
    }

    // ─── IHALE STATS ───
    if (action === "ihale-stats") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const { data: ihaleler } = await supabase
        .from("ihaleler")
        .select("ihale_turu, urun_kategori_id, hizmet_kategori_id, durum");

      const allItems = ihaleler || [];
      const total = allItems.length;
      const active = allItems.filter((i: any) => i.durum === "devam_ediyor").length;
      const completed = allItems.filter((i: any) => i.durum === "tamamlandi").length;
      const cancelled = allItems.filter((i: any) => i.durum === "iptal").length;
      const pendingApproval = allItems.filter((i: any) => i.durum === "onay_bekliyor").length;
      const draft = allItems.filter((i: any) => i.durum === "duzenleniyor").length;

      // Total teklifler count
      const { count: totalTeklifler } = await supabase
        .from("ihale_teklifler")
        .select("*", { count: "exact", head: true });

      // Get ALL categories (including those with 0 ihaleler)
      const { data: kategoriler } = await supabase
        .from("firma_bilgi_kategorileri")
        .select("id, name");

      const urunKatKat = (kategoriler || []).find((k: any) => k.name === "Ana Ürün Kategorileri");
      const hizmetKatKat = (kategoriler || []).find((k: any) => k.name === "Ana Hizmet Kategorileri");

      let allUrunCats: any[] = [];
      let allHizmetCats: any[] = [];

      if (urunKatKat) {
        const { data } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name, parent_id")
          .eq("kategori_id", urunKatKat.id);
        allUrunCats = (data || []).filter((d: any) => !d.parent_id);
      }
      if (hizmetKatKat) {
        const { data } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name, parent_id")
          .eq("kategori_id", hizmetKatKat.id);
        allHizmetCats = (data || []).filter((d: any) => !d.parent_id);
      }

      // Count per category
      const urunCatIds = allItems
        .filter((i: any) => i.ihale_turu !== "hizmet" && i.urun_kategori_id)
        .map((i: any) => i.urun_kategori_id);
      const hizmetCatIds = allItems
        .filter((i: any) => i.ihale_turu === "hizmet" && i.hizmet_kategori_id)
        .map((i: any) => i.hizmet_kategori_id);

      const urunKategoriDagilimi = allUrunCats.map((c: any) => ({
        id: c.id,
        name: c.name,
        count: urunCatIds.filter((id: string) => id === c.id).length,
      })).sort((a: any, b: any) => b.count - a.count);

      const hizmetKategoriDagilimi = allHizmetCats.map((c: any) => ({
        id: c.id,
        name: c.name,
        count: hizmetCatIds.filter((id: string) => id === c.id).length,
      })).sort((a: any, b: any) => b.count - a.count);

      return jsonResponse({
        total,
        active,
        completed,
        cancelled,
        pendingApproval,
        draft,
        totalTeklifler: totalTeklifler || 0,
        urunKategoriDagilimi,
        hizmetKategoriDagilimi,
      });
    }

    // ─── UPDATE IHALE (admin can edit without restrictions + notify owner) ───
    if (action === "update-ihale") {
      const { token, ihaleId, updates } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const { data, error } = await supabase
        .from("ihaleler")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", ihaleId)
        .select("*, user_id, baslik, ihale_no")
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);

      // Notify ihale owner
      if (data) {
        const msg = `${data.ihale_no} numaralı "${data.baslik}" başlıklı ihaleniz yönetim tarafından düzenlenmiştir.`;
        await supabase.from("notifications").insert({
          user_id: data.user_id,
          type: "ihale_admin_duzenlendi",
          message: msg,
          link: "/manuihale",
        });
      }

      return jsonResponse({ ihale: data });
    }

    // ─── APPROVE/REJECT IHALE ───
    if (action === "approve-ihale" || action === "reject-ihale") {
      const { token, ihaleId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const newStatus = action === "approve-ihale" ? "devam_ediyor" : "reddedildi";

      const { data, error } = await supabase
        .from("ihaleler")
        .update({ durum: newStatus, updated_at: new Date().toISOString() })
        .eq("id", ihaleId)
        .select("id, baslik, ihale_no, user_id")
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true, ihale: data });
    }

    // ─── REMOVE IHALE (set to iptal + notify owner) ───
    if (action === "remove-ihale") {
      const { token, ihaleId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      // Get ihale info before updating
      const { data: ihaleInfo } = await supabase
        .from("ihaleler")
        .select("user_id, baslik, ihale_no")
        .eq("id", ihaleId)
        .single();

      const { data, error } = await supabase
        .from("ihaleler")
        .update({ durum: "iptal", updated_at: new Date().toISOString() })
        .eq("id", ihaleId)
        .select("id")
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);

      // Notify ihale owner
      if (ihaleInfo) {
        const msg = `${ihaleInfo.ihale_no} numaralı "${ihaleInfo.baslik}" başlıklı ihaleniz yönetim tarafından kaldırılmıştır.`;
        await supabase.from("notifications").insert({
          user_id: ihaleInfo.user_id,
          type: "ihale_admin_kaldirildi",
          message: msg,
          link: "/manuihale",
        });
      }

      return jsonResponse({ success: true });
    }

    // ─── GET IHALE DETAIL (for admin preview) ───
    if (action === "get-ihale-detail") {
      const { token, ihaleId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const { data: ihaleData, error } = await supabase
        .from("ihaleler")
        .select("*")
        .eq("id", ihaleId)
        .single();

      if (error || !ihaleData) return jsonResponse({ error: "İhale bulunamadı" }, 404);
      return jsonResponse({ ihale: ihaleData });
    }

    // ─── GET IHALE EDIT DATA (ihale + filtreler + stok for admin editing) ───
    if (action === "get-ihale-edit-data") {
      const { token, ihaleId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const [ihaleRes, filtreRes, stokRes] = await Promise.all([
        supabase.from("ihaleler").select("*").eq("id", ihaleId).single(),
        supabase.from("ihale_filtreler").select("filtre_tipi, secenek_id").eq("ihale_id", ihaleId),
        supabase.from("ihale_stok").select("varyant_1_label, varyant_1_value, varyant_2_label, varyant_2_value, miktar_tipi, stok_sayisi").eq("ihale_id", ihaleId),
      ]);

      if (ihaleRes.error || !ihaleRes.data) return jsonResponse({ error: "İhale bulunamadı" }, 404);
      return jsonResponse({ ihale: ihaleRes.data, filtreler: filtreRes.data || [], stoklar: stokRes.data || [] });
    }

    // ─── ADMIN SAVE IHALE (full save bypassing RLS + notify owner) ───
    if (action === "admin-save-ihale") {
      const { token, ihaleId, ihaleData, filtreler, stoklar } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      // Get ihale info before updating for notification
      const { data: ihaleInfo } = await supabase
        .from("ihaleler")
        .select("user_id, baslik, ihale_no")
        .eq("id", ihaleId)
        .single();

      // Update ihale
      const { error: updateError } = await supabase
        .from("ihaleler")
        .update({ ...ihaleData, updated_at: new Date().toISOString() })
        .eq("id", ihaleId);

      if (updateError) return jsonResponse({ error: updateError.message }, 400);

      // Save filtreler
      await supabase.from("ihale_filtreler").delete().eq("ihale_id", ihaleId);
      if (filtreler && filtreler.length > 0) {
        await supabase.from("ihale_filtreler").insert(
          filtreler.map((f: any) => ({ ihale_id: ihaleId, ...f }))
        );
      }

      // Save stoklar
      await supabase.from("ihale_stok").delete().eq("ihale_id", ihaleId);
      if (stoklar && stoklar.length > 0) {
        await supabase.from("ihale_stok").insert(
          stoklar.map((s: any) => ({ ihale_id: ihaleId, ...s }))
        );
      }

      // Notify ihale owner about edit
      if (ihaleInfo) {
        const msg = `${ihaleInfo.ihale_no} numaralı "${ihaleInfo.baslik}" başlıklı ihaleniz yönetim tarafından düzenlenmiştir.`;
        await supabase.from("notifications").insert({
          user_id: ihaleInfo.user_id,
          type: "ihale_admin_duzenlendi",
          message: msg,
          link: "/manuihale",
        });
      }

      return jsonResponse({ success: true });
    }

    // ─── GET IHALE TEKLIFLER (for admin ihale takip) ───
    if (action === "get-ihale-teklifler") {
      const { token, ihaleId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const { data: teklifler } = await supabase
        .from("ihale_teklifler")
        .select("id, tutar, created_at, teklif_veren_user_id, durum, odeme_secenekleri, kargo_masrafi, odeme_vadesi, ek_dosya_url, ek_dosya_adi")
        .eq("ihale_id", ihaleId)
        .order("created_at", { ascending: false });

      return jsonResponse({ teklifler: teklifler || [] });
    }

    // ─── URUN STATS (for admin ürünler summary) ───
    if (action === "urun-stats") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary && !payload.permissions?.urun_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      // Get all urunler with tur info
      const { data: urunler } = await supabase
        .from("urunler")
        .select("id, durum, user_id, urun_kategori_id, urun_grup_id, urun_tur_id");

      const allItems = urunler || [];
      const total = allItems.length;
      const aktif = allItems.filter((u: any) => u.durum === "aktif").length;
      const pasif = allItems.filter((u: any) => u.durum === "pasif").length;
      const onayBekleyen = allItems.filter((u: any) => u.durum === "onay_bekliyor").length;
      const reddedilen = allItems.filter((u: any) => u.durum === "reddedildi").length;
      const taslak = allItems.filter((u: any) => u.durum === "taslak").length;

      // Total users count
      const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 10000 });
      const totalUsers = allUsers?.length || 0;

      // Users with products
      const uniqueProductUsers = new Set(allItems.map((u: any) => u.user_id));
      const usersWithProducts = uniqueProductUsers.size;

      // Category distribution - Ana Ürün Kategorileri
      const { data: kategoriler } = await supabase
        .from("firma_bilgi_kategorileri")
        .select("id, name");

      const urunKatKat = (kategoriler || []).find((k: any) => k.name === "Ana Ürün Kategorileri");
      let kategoriDagilimi: any[] = [];
      let urunTurDagilimi: any[] = [];

      if (urunKatKat) {
        const { data: urunKats } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name, parent_id")
          .eq("kategori_id", urunKatKat.id);

        const allOpts = urunKats || [];
        const roots = allOpts.filter((o: any) => !o.parent_id);
        kategoriDagilimi = roots.map((c: any) => ({
          id: c.id,
          name: c.name,
          count: allItems.filter((u: any) => u.urun_kategori_id === c.id).length,
        })).sort((a: any, b: any) => b.count - a.count);

        // Ürün Türü dağılımı - 3rd level items (parent is a group, grandparent is a category)
        const groups = allOpts.filter((o: any) => o.parent_id && roots.some((r: any) => r.id === o.parent_id));
        const groupIds = new Set(groups.map((o: any) => o.id));
        const turItems = allOpts.filter((o: any) => o.parent_id && groupIds.has(o.parent_id));
        
        const turCountMap: Record<string, number> = {};
        for (const item of allItems) {
          if (item.urun_tur_id) {
            turCountMap[item.urun_tur_id] = (turCountMap[item.urun_tur_id] || 0) + 1;
          }
        }
        // Include ALL types (even 0 count) + add parent info for filtering
        urunTurDagilimi = turItems.map((t: any) => {
          const parentGroup = groups.find((g: any) => g.id === t.parent_id);
          const parentCategory = parentGroup ? roots.find((r: any) => r.id === parentGroup.parent_id) : null;
          return {
            id: t.id,
            name: t.name,
            count: turCountMap[t.id] || 0,
            grup_id: t.parent_id,
            kategori_id: parentCategory?.id || null,
          };
        }).sort((a: any, b: any) => b.count - a.count);
      }

      // Firma Türü distribution
      const { data: firmalar } = await supabase
        .from("firmalar")
        .select("user_id, firma_turu_id, firma_tipi_id");

      const { data: turler } = await supabase
        .from("firma_turleri")
        .select("id, name");

      const { data: tipler } = await supabase
        .from("firma_tipleri")
        .select("id, name");

      const firmaMap = Object.fromEntries((firmalar || []).map((f: any) => [f.user_id, f]));

      // Firma Türü dağılımı
      const turCounts: Record<string, number> = {};
      for (const item of allItems) {
        const firma = firmaMap[item.user_id];
        if (firma?.firma_turu_id) {
          turCounts[firma.firma_turu_id] = (turCounts[firma.firma_turu_id] || 0) + 1;
        }
      }
      const firmaTuruDagilimi = (turler || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        count: turCounts[t.id] || 0,
      })).sort((a: any, b: any) => b.count - a.count);

      // Firma Tipi dağılımı - always show all
      const tipCounts: Record<string, number> = {};
      for (const item of allItems) {
        const firma = firmaMap[item.user_id];
        if (firma?.firma_tipi_id) {
          tipCounts[firma.firma_tipi_id] = (tipCounts[firma.firma_tipi_id] || 0) + 1;
        }
      }
      const firmaTipiDagilimi = (tipler || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        count: tipCounts[t.id] || 0,
      })).sort((a: any, b: any) => b.count - a.count);

      return jsonResponse({
        total,
        aktif,
        pasif,
        onayBekleyen,
        reddedilen,
        taslak,
        totalUsers,
        usersWithProducts,
        kategoriDagilimi,
        urunTurDagilimi,
        firmaTuruDagilimi,
        firmaTipiDagilimi,
      });
    }

    // ─── LIST ALL URUNLER (for admin panel) ───
    if (action === "list-urunler") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary && !payload.permissions?.urun_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const { data: urunler, error } = await supabase
        .from("urunler")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return jsonResponse({ error: error.message }, 400);

      // Get firma names + logos for all user_ids
      const userIds = [...new Set((urunler || []).map((u: any) => u.user_id))];
      const { data: firmalar } = await supabase
        .from("firmalar")
        .select("user_id, firma_unvani, logo_url")
        .in("user_id", userIds);

      // Get category names
      const catIds = [
        ...(urunler || []).map((u: any) => u.urun_kategori_id).filter(Boolean),
        ...(urunler || []).map((u: any) => u.urun_grup_id).filter(Boolean),
        ...(urunler || []).map((u: any) => u.urun_tur_id).filter(Boolean),
      ];
      const uniqueCatIds = [...new Set(catIds)];
      let catMap: Record<string, string> = {};
      if (uniqueCatIds.length > 0) {
        const { data: cats } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name")
          .in("id", uniqueCatIds);
        if (cats) catMap = Object.fromEntries(cats.map((c: any) => [c.id, c.name]));
      }

      const enriched = (urunler || []).map((u: any) => {
        const firma = (firmalar || []).find((f: any) => f.user_id === u.user_id);
        const uk = u.urun_kategori_id ? catMap[u.urun_kategori_id] : "";
        const ug = u.urun_grup_id ? catMap[u.urun_grup_id] : "";
        const ut = u.urun_tur_id ? catMap[u.urun_tur_id] : "";
        const kategoriLabel = [uk, ug, ut].filter(Boolean).join(" > ");

        return {
          ...u,
          firma_unvani: firma?.firma_unvani || "—",
          firma_logo_url: firma?.logo_url || null,
          kategori_label: kategoriLabel || "—",
        };
      });

      return jsonResponse({ urunler: enriched });
    }

    // ─── GET URUN DETAIL (for admin preview - bypasses RLS) ───
    if (action === "get-urun-detail") {
      const { token, urunId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.urun_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }
      const { data: urunData, error } = await supabase
        .from("urunler")
        .select("*")
        .eq("id", urunId)
        .single();
      if (error || !urunData) return jsonResponse({ error: "Ürün bulunamadı" }, 404);
      return jsonResponse({ urun: urunData });
    }

    // ─── APPROVE IHALE ───
    if (action === "approve-ihale") {
      const { token, ihaleId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      // Get admin info
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("ad, soyad, pozisyon")
        .eq("id", payload.id)
        .single();
      const adminLabel = adminUser ? `${adminUser.ad} ${adminUser.soyad} (${adminUser.pozisyon})` : "Yönetici";

      const { data, error } = await supabase
        .from("ihaleler")
        .update({
          durum: "devam_ediyor",
          admin_karar_veren: adminLabel,
          admin_karar_sebebi: null,
          admin_karar_tarihi: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ihaleId)
        .select("id, baslik, ihale_no, user_id")
        .single();
      if (error) return jsonResponse({ error: error.message }, 400);

      // Notify owner + send email
      if (data) {
        // Get user email for Postmark
        const { data: { user: ihaleAuthUser } } = await supabase.auth.admin.getUserById(data.user_id);
        const { data: ihaleFirma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", data.user_id).single();

        if (ihaleAuthUser?.email) {
          await sendPostmarkEmail("ihale_onaylandi", ihaleAuthUser.email, {
            firma_unvani: ihaleFirma?.firma_unvani || "",
            ihale_basligi: data.baslik,
            ihale_linki: `${SITE_URL}/tekihale/${data.id}`,
          });
        }

        const msg = `${data.ihale_no} numaralı "${data.baslik}" başlıklı ihaleniz onaylanmış ve yayına alınmıştır. İşlemi yapan: ${adminLabel}`;
        await supabase.from("notifications").insert({
          user_id: data.user_id,
          type: "ihale_yayinlandi",
          message: msg,
          link: "/manuihale/takip/" + data.id,
        });
      }

      return jsonResponse({ success: true, ihale: data });
    }

    // ─── REJECT IHALE ───
    if (action === "reject-ihale") {
      const { token, ihaleId, redSebebi } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      // Get admin info
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("ad, soyad, pozisyon")
        .eq("id", payload.id)
        .single();
      const adminLabel = adminUser ? `${adminUser.ad} ${adminUser.soyad} (${adminUser.pozisyon})` : "Yönetici";

      // Get ihale info before updating
      const { data: ihaleInfo } = await supabase
        .from("ihaleler")
        .select("user_id, baslik, ihale_no")
        .eq("id", ihaleId)
        .single();

      const { error } = await supabase
        .from("ihaleler")
        .update({
          durum: "reddedildi",
          admin_karar_sebebi: redSebebi,
          admin_karar_veren: adminLabel,
          admin_karar_tarihi: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ihaleId);
      if (error) return jsonResponse({ error: error.message }, 400);

      // Notify user with rejection reason + send email
      if (ihaleInfo) {
        const { data: { user: ihaleRejAuthUser } } = await supabase.auth.admin.getUserById(ihaleInfo.user_id);
        const { data: ihaleRejFirma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", ihaleInfo.user_id).single();

        if (ihaleRejAuthUser?.email) {
          await sendPostmarkEmail("ihale_reddedildi", ihaleRejAuthUser.email, {
            firma_unvani: ihaleRejFirma?.firma_unvani || "",
            ihale_basligi: ihaleInfo.baslik,
            reddedilme_sebebi: redSebebi,
          });
        }

        const msg = `${ihaleInfo.ihale_no} numaralı "${ihaleInfo.baslik}" başlıklı ihaleniz reddedilmiştir. Sebep: ${redSebebi}. İşlemi yapan: ${adminLabel}`;
        await supabase.from("notifications").insert({
          user_id: ihaleInfo.user_id,
          type: "ihale_reddedildi",
          message: msg,
          link: "/ihale/" + ihaleId,
        });
      }

      return jsonResponse({ success: true });
    }

    if (action === "approve-urun") {
      const { token, urunId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.urun_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      // Get admin info
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("ad, soyad, pozisyon")
        .eq("id", payload.id)
        .single();
      const adminLabel = adminUser ? `${adminUser.ad} ${adminUser.soyad} (${adminUser.pozisyon})` : "Yönetici";

      const { data, error } = await supabase
        .from("urunler")
        .update({
          durum: "aktif",
          admin_karar_veren: adminLabel,
          admin_karar_sebebi: null,
          admin_karar_tarihi: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", urunId)
        .select("id, baslik, urun_no, user_id")
        .single();
      if (error) return jsonResponse({ error: error.message }, 400);

      // Notify owner + send email
      if (data) {
        const { data: { user: urunAuthUser } } = await supabase.auth.admin.getUserById(data.user_id);
        const { data: urunFirma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", data.user_id).single();

        if (urunAuthUser?.email) {
          await sendPostmarkEmail("urun_yayinlandi", urunAuthUser.email, {
            firma_unvani: urunFirma?.firma_unvani || "",
            urun_basligi: data.baslik,
            urun_linki: `${SITE_URL}/urun/${data.id}`,
          });
        }

        const msg = `${data.urun_no} numaralı "${data.baslik}" başlıklı ürününüz onaylanmış ve yayına alınmıştır. İşlemi yapan: ${adminLabel}`;
        await supabase.from("notifications").insert({
          user_id: data.user_id,
          type: "urun_yayinlandi",
          message: msg,
          link: "/manupazar",
        });
      }

      return jsonResponse({ success: true, urun: data });
    }

    // ─── REJECT URUN ───
    if (action === "reject-urun") {
      const { token, urunId, redSebebi } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.urun_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      // Get admin info
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("ad, soyad, pozisyon")
        .eq("id", payload.id)
        .single();
      const adminLabel = adminUser ? `${adminUser.ad} ${adminUser.soyad} (${adminUser.pozisyon})` : "Yönetici";
      
      // Get urun info before updating
      const { data: urunInfo } = await supabase
        .from("urunler")
        .select("user_id, baslik, urun_no")
        .eq("id", urunId)
        .single();

      const { error } = await supabase
        .from("urunler")
        .update({
          durum: "reddedildi",
          admin_karar_sebebi: redSebebi,
          admin_karar_veren: adminLabel,
          admin_karar_tarihi: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", urunId);
      if (error) return jsonResponse({ error: error.message }, 400);

      // Notify user with rejection reason + send email
      if (urunInfo) {
        const { data: { user: urunRejAuthUser } } = await supabase.auth.admin.getUserById(urunInfo.user_id);
        const { data: urunRejFirma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", urunInfo.user_id).single();

        if (urunRejAuthUser?.email) {
          await sendPostmarkEmail("urun_reddedildi", urunRejAuthUser.email, {
            firma_unvani: urunRejFirma?.firma_unvani || "",
            urun_basligi: urunInfo.baslik,
            reddedilme_sebebi: redSebebi,
          });
        }

        const msg = `${urunInfo.urun_no} numaralı "${urunInfo.baslik}" başlıklı ürününüz reddedilmiştir. Sebep: ${redSebebi}. İşlemi yapan: ${adminLabel}`;
        await supabase.from("notifications").insert({
          user_id: urunInfo.user_id,
          type: "urun_reddedildi",
          message: msg,
          link: "/urun/" + urunId,
        });
      }

      return jsonResponse({ success: true });
    }

    // ─── TOGGLE URUN (aktif/pasif) ───
    if (action === "toggle-urun") {
      const { token, urunId, newDurum } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.urun_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }
      if (newDurum !== "aktif" && newDurum !== "pasif") {
        return jsonResponse({ error: "Geçersiz durum" }, 400);
      }
      const { error } = await supabase
        .from("urunler")
        .update({ durum: newDurum, updated_at: new Date().toISOString() })
        .eq("id", urunId);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    // ─── REMOVE URUN (delete + notify owner) ───
    if (action === "remove-urun") {
      const { token, urunId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.urun_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      // Get urun info before deleting
      const { data: urunInfo } = await supabase
        .from("urunler")
        .select("user_id, baslik, urun_no")
        .eq("id", urunId)
        .single();

      // Delete varyasyonlar first
      await supabase.from("urun_varyasyonlar").delete().eq("urun_id", urunId);
      // Delete favoriler
      await supabase.from("urun_favoriler").delete().eq("urun_id", urunId);
      // Delete the urun
      const { error } = await supabase
        .from("urunler")
        .delete()
        .eq("id", urunId);
      if (error) return jsonResponse({ error: error.message }, 400);

      // Notify owner
      if (urunInfo) {
        const msg = `${urunInfo.urun_no} numaralı "${urunInfo.baslik}" başlıklı ürününüz yönetim tarafından kaldırılmıştır.`;
        await supabase.from("notifications").insert({
          user_id: urunInfo.user_id,
          type: "urun_admin_kaldirildi",
          message: msg,
          link: "/manupazar",
        });
      }

      return jsonResponse({ success: true });
    }

    // ─── GET URUN EDIT DATA (for admin editing) ───
    if (action === "get-urun-edit-data") {
      const { token, urunId } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.urun_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const [urunRes, varyRes] = await Promise.all([
        supabase.from("urunler").select("*").eq("id", urunId).single(),
        supabase.from("urun_varyasyonlar").select("*").eq("urun_id", urunId).order("created_at"),
      ]);

      if (urunRes.error || !urunRes.data) return jsonResponse({ error: "Ürün bulunamadı" }, 404);
      return jsonResponse({ urun: urunRes.data, varyasyonlar: varyRes.data || [] });
    }

    // ─── ADMIN SAVE URUN (full save bypassing RLS + notify owner) ───
    if (action === "admin-save-urun") {
      const { token, urunId, urunData, varyasyonlar } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary && !payload.permissions?.urun_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      // Get urun info before updating for notification
      const { data: urunInfo } = await supabase
        .from("urunler")
        .select("user_id, baslik, urun_no")
        .eq("id", urunId)
        .single();

      // Update urun
      const { error: updateError } = await supabase
        .from("urunler")
        .update({ ...urunData, updated_at: new Date().toISOString() })
        .eq("id", urunId);

      if (updateError) return jsonResponse({ error: updateError.message }, 400);

      // Save varyasyonlar
      if (varyasyonlar !== undefined) {
        await supabase.from("urun_varyasyonlar").delete().eq("urun_id", urunId);
        if (varyasyonlar && varyasyonlar.length > 0) {
          await supabase.from("urun_varyasyonlar").insert(
            varyasyonlar.map((v: any) => ({ urun_id: urunId, ...v }))
          );
        }
      }

      // Notify urun owner about edit
      if (urunInfo) {
        const msg = `${urunInfo.urun_no} numaralı "${urunInfo.baslik}" başlıklı ürününüz yönetim tarafından düzenlenmiştir.`;
        await supabase.from("notifications").insert({
          user_id: urunInfo.user_id,
          type: "urun_admin_duzenlendi",
          message: msg,
          link: "/manupazar",
        });
      }

      return jsonResponse({ success: true });
    }

    // ─── LIST SIKAYETLER ───
    if (action === "list-sikayetler") {
      verifyToken(body.token);

      const { data: sikayetler, error: sErr } = await supabase
        .from("sikayetler")
        .select("*")
        .order("created_at", { ascending: false });

      if (sErr) return jsonResponse({ error: sErr.message }, 500);

      // Get unique user ids from bildiren_user_id
      const userIds = [...new Set((sikayetler || []).map((s: any) => s.bildiren_user_id))];

      // Get firma info for bildiren users
      let firmaMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: firmalar } = await supabase
          .from("firmalar")
          .select("user_id, firma_unvani")
          .in("user_id", userIds);
        if (firmalar) {
          firmalar.forEach((f: any) => { firmaMap[f.user_id] = f.firma_unvani; });
        }
      }

      // For each sikayet, try to resolve the referenced entity's owner firma and user_id
      const enriched = await Promise.all((sikayetler || []).map(async (s: any) => {
        let sikayet_edilen_firma = "-";
        let sikayet_edilen_user_id: string | null = null;
        try {
          if (s.tur === "profil") {
            const { data: f } = await supabase.from("firmalar").select("firma_unvani, user_id").eq("id", s.referans_id).single();
            if (f) { sikayet_edilen_firma = f.firma_unvani; sikayet_edilen_user_id = f.user_id; }
          } else if (s.tur === "ihale") {
            const { data: i } = await supabase.from("ihaleler").select("user_id").eq("id", s.referans_id).single();
            if (i) {
              sikayet_edilen_user_id = i.user_id;
              const { data: f } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", i.user_id).single();
              if (f) sikayet_edilen_firma = f.firma_unvani;
            }
          } else if (s.tur === "urun") {
            const { data: u } = await supabase.from("urunler").select("user_id").eq("id", s.referans_id).single();
            if (u) {
              sikayet_edilen_user_id = u.user_id;
              const { data: f } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", u.user_id).single();
              if (f) sikayet_edilen_firma = f.firma_unvani;
            }
          } else if (s.tur === "mesaj") {
            const { data: m } = await supabase.from("messages").select("conversation_id, sender_id").eq("id", s.referans_id).single();
            if (m) {
              sikayet_edilen_user_id = m.sender_id;
              const { data: f } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", m.sender_id).single();
              if (f) sikayet_edilen_firma = f.firma_unvani;
            }
          }
        } catch {}

        return {
          ...s,
          bildiren_firma: firmaMap[s.bildiren_user_id] || "-",
          sikayet_edilen_firma,
          sikayet_edilen_user_id,
        };
      }));

      return jsonResponse({ sikayetler: enriched });
    }

    // ─── KISITLA (Restrict user) ───
    if (action === "kisitla") {
      const { token, userId, sikayetId, sebep, kisitlamaAlanlari, bitisTarihi, sikayetNo } = body;
      const payload = verifyToken(token);
      
      // Get admin info
      const { data: adminUser } = await supabase.from("admin_users").select("ad, soyad, pozisyon").eq("id", payload.id).single();
      const createdBy = adminUser ? `${adminUser.ad} ${adminUser.soyad} (${adminUser.pozisyon})` : payload.username;

      const { data: kisitlamaData, error } = await supabase.from("firma_kisitlamalar").insert({
        user_id: userId,
        sikayet_id: sikayetId || null,
        sebep,
        kisitlama_alanlari: kisitlamaAlanlari,
        bitis_tarihi: bitisTarihi,
        created_by: createdBy,
      }).select("id").single();

      if (error) return jsonResponse({ error: error.message }, 400);

      // Build restriction labels
      const alanLabels: Record<string, string> = {
        ihale_acamaz: "ihale açma",
        teklif_veremez: "teklif verme",
        urun_aktif_edemez: "ürün aktif etme",
        mesaj_gonderemez: "mesaj gönderme",
        mesaj_alamaz: "mesaj alma",
        profil_goruntuleyemez: "firma profili görüntüleme",
        ihale_goruntuleyemez: "ihale görüntüleme",
        urun_goruntuleyemez: "ürün görüntüleme",
      };
      const activeAreas = Object.entries(kisitlamaAlanlari)
        .filter(([_, v]) => v === true)
        .map(([k]) => alanLabels[k] || k)
        .join(", ");

      const bitisStr = new Date(bitisTarihi).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const kisitlamaTarihStr = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

      const msg = sikayetNo
        ? `${sikayetNo} numaralı şikayet kapsamında ${bitisStr} tarihine kadar ${activeAreas} işlemleriniz kısıtlanmıştır.`
        : `${bitisStr} tarihine kadar ${activeAreas} işlemleriniz kısıtlanmıştır.`;

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "kisitlama",
        message: msg,
        link: null,
      });

      // Send restriction SMS
      const { data: kisitProfile } = await supabase
        .from("profiles")
        .select("iletisim_numarasi")
        .eq("user_id", userId)
        .single();

      if (kisitProfile?.iletisim_numarasi) {
        const smsAlanlar = Object.entries(kisitlamaAlanlari)
          .filter(([_, v]) => v === true)
          .map(([k]) => {
            const smsLabels: Record<string, string> = {
              ihale_acamaz: "ihale acma",
              teklif_veremez: "teklif verme",
              urun_aktif_edemez: "urun aktif etme",
              mesaj_gonderemez: "mesaj gonderme",
              mesaj_alamaz: "mesaj alma",
              profil_goruntuleyemez: "profil goruntuleme",
              ihale_goruntuleyemez: "ihale goruntuleme",
              urun_goruntuleyemez: "urun goruntuleme",
            };
            return smsLabels[k] || k;
          })
          .join(", ");

        const smsBitis = new Date(bitisTarihi).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
        const smsTarih = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
        const kisitId = kisitlamaData?.id?.slice(0, 8)?.toUpperCase() || "-";

        try {
          await fetch("http://194.62.55.240:3000/api/send-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{
                msg: `${smsTarih} tarihinde ${kisitId} ID numarali kisitlama geregince ${smsAlanlar} haklariniz ${smsBitis} tarihine kadar askiya alinmistir. Detaylari ogrenmek ve itirazda bulunmak icin destek@tekstilas.com adresinden veya 0850 242 5700 numarasindan iletisim kurabilirsiniz.`,
                dest: kisitProfile.iletisim_numarasi,
                id: "1",
              }],
            }),
          });
        } catch (smsErr) {
          console.error("Restriction SMS failed:", smsErr);
        }
      }

      // Update sikayet status and log action details
      if (sikayetId) {
        await supabase.from("sikayetler").update({
          durum: "cozuldu",
          islem_tipi: "kisitlama",
          islem_yapan: createdBy,
          islem_tarihi: new Date().toISOString(),
          islem_detay: `Kısıtlama Alanları: ${activeAreas}. Süre: ${bitisStr}. Sebep: ${sebep}`,
        }).eq("id", sikayetId);
      }

      return jsonResponse({ success: true });
    }

    // ─── UZAKLASTIR (Suspend user) ───
    if (action === "uzaklastir") {
      const { token, userId, sikayetId, sebep, bitisTarihi, sikayetNo } = body;
      const payload = verifyToken(token);

      const { data: adminUser } = await supabase.from("admin_users").select("ad, soyad, pozisyon").eq("id", payload.id).single();
      const createdBy = adminUser ? `${adminUser.ad} ${adminUser.soyad} (${adminUser.pozisyon})` : payload.username;

      const { error } = await supabase.from("firma_uzaklastirmalar").insert({
        user_id: userId,
        sikayet_id: sikayetId || null,
        sebep: sebep || null,
        bitis_tarihi: bitisTarihi,
        created_by: createdBy,
      });

      if (error) return jsonResponse({ error: error.message }, 400);

      // Deactivate all user's products and ihaleler
      await supabase.from("urunler").update({ durum: "pasif" }).eq("user_id", userId).eq("durum", "aktif");
      await supabase.from("ihaleler").update({ durum: "iptal" }).eq("user_id", userId).in("durum", ["devam_ediyor", "onay_bekliyor"]);

      // Update firma onay_durumu
      await supabase.from("firmalar").update({ onay_durumu: "uzaklastirildi" }).eq("user_id", userId);

      const bitisStr = new Date(bitisTarihi).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const msg = sikayetNo
        ? `${sikayetNo} numaralı şikayet kapsamında hesabınız ${bitisStr} tarihine kadar uzaklaştırılmıştır.`
        : `Hesabınız ${bitisStr} tarihine kadar uzaklaştırılmıştır.`;

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "uzaklastirma",
        message: msg,
        link: null,
      });

      if (sikayetId) {
        await supabase.from("sikayetler").update({
          durum: "cozuldu",
          islem_tipi: "uzaklastirma",
          islem_yapan: createdBy,
          islem_tarihi: new Date().toISOString(),
          islem_detay: `Uzaklaştırma süresi: ${bitisStr}. ${sebep ? 'Sebep: ' + sebep : ''}`,
        }).eq("id", sikayetId);
      }

      return jsonResponse({ success: true });
    }

    // ─── YASAKLA (Ban user permanently) ───
    if (action === "yasakla") {
      const { token, userId, sikayetId, sebep } = body;
      const payload = verifyToken(token);
      if (!payload.is_primary) return jsonResponse({ error: "Yasaklama yetkisi yalnızca ana yöneticidedir" }, 401);

      const { data: adminUser } = await supabase.from("admin_users").select("ad, soyad, pozisyon").eq("id", payload.id).single();
      const createdBy = adminUser ? `${adminUser.ad} ${adminUser.soyad} (${adminUser.pozisyon})` : payload.username;

      // Get firma info before deletion
      const { data: firma } = await supabase.from("firmalar").select("firma_unvani, vergi_numarasi, user_id").eq("user_id", userId).single();
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);

      // Add to blacklist
      await supabase.from("firma_yasaklar").insert({
        user_id: userId,
        email: authUser?.email || null,
        vergi_numarasi: firma?.vergi_numarasi || null,
        firma_unvani: firma?.firma_unvani || null,
        sebep: sebep || null,
        sikayet_id: sikayetId || null,
        created_by: createdBy,
      });

      // Delete all user data
      await supabase.from("urunler").delete().eq("user_id", userId);
      await supabase.from("ihaleler").delete().eq("user_id", userId);
      await supabase.from("firmalar").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("user_id", userId);

      // Delete auth user
      await supabase.auth.admin.deleteUser(userId);

      if (sikayetId) {
        await supabase.from("sikayetler").update({
          durum: "cozuldu",
          islem_tipi: "yasaklama",
          islem_yapan: createdBy,
          islem_tarihi: new Date().toISOString(),
          islem_detay: `Kalıcı yasaklama. ${sebep ? 'Sebep: ' + sebep : ''}. Firma: ${firma?.firma_unvani || '-'}`,
        }).eq("id", sikayetId);
      }

      return jsonResponse({ success: true });
    }

    // ─── LIST DESTEK TALEPLERI (admin) ───
    if (action === "list-destek") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary && !payload.permissions?.destek_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const { data: talepler, error } = await supabase
        .from("destek_talepleri")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return jsonResponse({ error: error.message }, 400);

      // Get profiles and firmalar for all user_ids
      const userIds = [...new Set((talepler || []).map((t: any) => t.user_id))];
      const [profilesRes, firmalarRes] = await Promise.all([
        supabase.from("profiles").select("user_id, ad, soyad, iletisim_email, iletisim_numarasi").in("user_id", userIds),
        supabase.from("firmalar").select("user_id, firma_unvani").in("user_id", userIds),
      ]);

      const enriched = (talepler || []).map((t: any) => {
        const profile = (profilesRes.data || []).find((p: any) => p.user_id === t.user_id);
        const firma = (firmalarRes.data || []).find((f: any) => f.user_id === t.user_id);
        return { ...t, profile, firma_unvani: firma?.firma_unvani || null };
      });

      return jsonResponse({ talepler: enriched });
    }

    // ─── GET DESTEK MESSAGES (admin) ───
    if (action === "destek-mesajlar") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary && !payload.permissions?.destek_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const { data, error } = await supabase
        .from("destek_mesajlar")
        .select("*")
        .eq("destek_id", body.destekId)
        .order("created_at", { ascending: true });

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ mesajlar: data });
    }

    // ─── SEND DESTEK MESSAGE (admin) ───
    if (action === "destek-mesaj-gonder") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary && !payload.permissions?.destek_cevap) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const adminName = `${payload.username}`;
      // Get admin full name
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("ad, soyad, pozisyon")
        .eq("id", payload.id)
        .single();

      const senderName = adminUser ? `${adminUser.ad} ${adminUser.soyad}` : adminName;

      const { error: msgErr } = await supabase.from("destek_mesajlar").insert({
        destek_id: body.destekId,
        sender_type: "admin",
        sender_id: payload.id,
        content: body.content,
        ek_dosya_url: body.ek_dosya_url || null,
        ek_dosya_adi: body.ek_dosya_adi || null,
      });

      if (msgErr) return jsonResponse({ error: msgErr.message }, 400);

      // Update talep status to cevap_bekliyor (admin replied, waiting for user)
      // Also set ilgili_personel if not set
      await supabase
        .from("destek_talepleri")
        .update({
          durum: "cevap_bekliyor",
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.destekId);

      // Send notification to user
      const { data: talep } = await supabase
        .from("destek_talepleri")
        .select("user_id, talep_no, konu")
        .eq("id", body.destekId)
        .single();

      if (talep) {
        await supabase.from("notifications").insert({
          user_id: talep.user_id,
          type: "destek_yanit",
          message: `${talep.talep_no} numaralı "${talep.konu}" konulu destek talebinize yanıt verilmiştir.`,
          link: `/destek/${body.destekId}`,
        });
      }

      return jsonResponse({ success: true });
    }

    // ─── UPDATE DESTEK STATUS (admin) ───
    if (action === "destek-durum-guncelle") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary && !payload.permissions?.destek_cevap) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const { error } = await supabase
        .from("destek_talepleri")
        .update({
          durum: body.durum,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.destekId);

      if (error) return jsonResponse({ error: error.message }, 400);

      // If resolved, send notification
      if (body.durum === "cozuldu") {
        const { data: talep } = await supabase
          .from("destek_talepleri")
          .select("user_id, talep_no, konu")
          .eq("id", body.destekId)
          .single();

        if (talep) {
          await supabase.from("notifications").insert({
            user_id: talep.user_id,
            type: "destek_cozuldu",
            message: `${talep.talep_no} numaralı "${talep.konu}" konulu destek talebiniz çözüldü olarak işaretlenmiştir.`,
            link: `/destek/${body.destekId}`,
          });
        }
      }

      return jsonResponse({ success: true });
    }

    // ─── PAKETLER: LIST ───
    if (action === "paketler-list") {
      const { data, error } = await supabase
        .from("paketler")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ paketler: data });
    }

    // ─── PAKETLER: CREATE ───
    if (action === "paketler-create") {
      const { token, paket } = body;
      verifyToken(token);
      const { data, error } = await supabase
        .from("paketler")
        .insert(paket)
        .select()
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ paket: data });
    }

    // ─── PAKETLER: UPDATE ───
    if (action === "paketler-update") {
      const { token, id, updates } = body;
      verifyToken(token);
      const { data, error } = await supabase
        .from("paketler")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ paket: data });
    }

    // ─── PAKETLER: DELETE ───
    if (action === "paketler-delete") {
      const { token, id } = body;
      verifyToken(token);
      // Check if any user has this package
      const { count } = await supabase
        .from("kullanici_abonelikler")
        .select("id", { count: "exact", head: true })
        .eq("paket_id", id);
      if (count && count > 0) {
        return jsonResponse({ error: "Bu pakete abone olan kullanıcılar var. Önce abonelikleri değiştirin." }, 400);
      }
      const { error } = await supabase.from("paketler").delete().eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ success: true });
    }

    // ─── PAKETLER: STATS ───
    if (action === "paketler-stats") {
      const { token } = body;
      verifyToken(token);
      const { data, error } = await supabase
        .from("kullanici_abonelikler")
        .select("paket_id, durum");
      if (error) return jsonResponse({ error: error.message }, 500);
      // Count per paket_id
      const stats: Record<string, number> = {};
      for (const row of (data || [])) {
        if (row.durum === "aktif") {
          stats[row.paket_id] = (stats[row.paket_id] || 0) + 1;
        }
      }
      return jsonResponse({ stats });
    }

    // ─── UPDATE FIRMA PACKAGE ───
    if (action === "update-firma-paket") {
      const { token, userId, paketId, ekstraHaklar } = body;
      const payload = verifyToken(token);

      console.log("[UPDATE-FIRMA-PAKET] Starting", { userId, paketId });

      // When admin assigns a package, set unlimited duration (100 years)
      const unlimitedDate = new Date();
      unlimitedDate.setFullYear(unlimitedDate.getFullYear() + 100);

      const updatePayload: any = {
        paket_id: paketId,
        donem_baslangic: new Date().toISOString(),
        donem_bitis: unlimitedDate.toISOString(),
        durum: "aktif",
        periyot: "sinursiz",
        stripe_subscription_id: null,
        stripe_customer_id: null,
        updated_at: new Date().toISOString(),
      };
      if (ekstraHaklar !== undefined) {
        updatePayload.ekstra_haklar = ekstraHaklar;
      }

      // Use maybeSingle to avoid error when no row exists
      const { data: existing, error: existingError } = await supabase
        .from("kullanici_abonelikler")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      console.log("[UPDATE-FIRMA-PAKET] Existing check", { existing: !!existing, existingError: existingError?.message });

      if (existing) {
        const { error } = await supabase
          .from("kullanici_abonelikler")
          .update(updatePayload)
          .eq("user_id", userId);
        if (error) {
          console.error("[UPDATE-FIRMA-PAKET] Update error", error.message);
          return jsonResponse({ error: error.message }, 500);
        }
        console.log("[UPDATE-FIRMA-PAKET] Updated successfully");
      } else {
        const { error } = await supabase
          .from("kullanici_abonelikler")
          .insert({ user_id: userId, ...updatePayload });
        if (error) {
          console.error("[UPDATE-FIRMA-PAKET] Insert error", error.message);
          return jsonResponse({ error: error.message }, 500);
        }
        console.log("[UPDATE-FIRMA-PAKET] Inserted successfully");
      }

      // Notify user
      const { data: paket } = await supabase.from("paketler").select("ad").eq("id", paketId).single();
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "paket_degisikligi",
        message: `Paketiniz ${paket?.ad || ""} olarak güncellenmiştir.`,
        link: "/dashboard",
      });

      // Log activity
      await logActivity(supabase, payload, "update-firma-paket", {
        target_type: "kullanici",
        target_id: userId,
        target_label: paket?.ad || paketId,
        details: { paketId, periyot: "sinursiz" },
      });

      return jsonResponse({ success: true });
    }

    // ─── UPDATE EXTRA QUOTAS ONLY ───
    if (action === "update-ekstra-haklar") {
      const { token, userId, ekstraHaklar } = body;
      verifyToken(token);

      const { error } = await supabase
        .from("kullanici_abonelikler")
        .update({ ekstra_haklar: ekstraHaklar || {} })
        .eq("user_id", userId);
      if (error) return jsonResponse({ error: error.message }, 500);

      // Build detailed notification message
      const detailParts: string[] = [];
      const labels: Record<string, string> = {
        profil_goruntuleme: "Profil Görüntüleme",
        teklif_verme: "Teklif Verme",
        aktif_urun: "Aktif Ürün",
        mesaj: "Mesaj",
        ihale_acma: "İhale Açma",
      };
      const hak = ekstraHaklar || {};
      for (const [key, val] of Object.entries(hak)) {
        if (typeof val === "number" && val > 0) {
          detailParts.push(`${labels[key] || key}: +${val}`);
        }
      }
      const detailStr = detailParts.length > 0 ? ` (${detailParts.join(", ")})` : "";

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "ekstra_hak",
        message: `Hesabınıza ekstra hak tanımlanmıştır.${detailStr}`,
        link: "/dashboard",
      });

      return jsonResponse({ success: true });
    }

    // ─── GET FIRMA QUOTA USAGE ───
    if (action === "get-firma-quota") {
      const { token, userId } = body;
      verifyToken(token);

      const { data: abonelik } = await supabase
        .from("kullanici_abonelikler")
        .select("*, paketler(*)")
        .eq("user_id", userId)
        .single();

      if (!abonelik) return jsonResponse({ usage: null, abonelik: null });

      const donemBaslangic = abonelik.donem_baslangic;

      const [profilRes, teklifRes, urunRes, mesajRes] = await Promise.all([
        supabase.from("profil_goruntulemeler").select("id", { count: "exact", head: true })
          .eq("user_id", userId).gte("created_at", donemBaslangic),
        supabase.from("ihale_teklifler").select("ihale_id")
          .eq("teklif_veren_user_id", userId).gte("created_at", donemBaslangic),
        supabase.from("urunler").select("id", { count: "exact", head: true })
          .eq("user_id", userId).eq("durum", "aktif"),
        supabase.from("conversations").select("id, user1_id, user2_id, created_at")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .gte("created_at", donemBaslangic),
      ]);

      const uniqueIhaleIds = new Set((teklifRes.data || []).map((t: any) => t.ihale_id));

      // Count initiated conversations
      let initiatedConversations = 0;
      if (mesajRes.data) {
        for (const conv of mesajRes.data) {
          const { data: firstMsg } = await supabase
            .from("messages")
            .select("sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .single();
          if (firstMsg && firstMsg.sender_id === userId) {
            initiatedConversations++;
          }
        }
      }

      const ekstra = abonelik.ekstra_haklar || {};

      return jsonResponse({
        abonelik: {
          paket_ad: abonelik.paketler?.ad,
          paket_slug: abonelik.paketler?.slug,
          donem_baslangic: abonelik.donem_baslangic,
          donem_bitis: abonelik.donem_bitis,
          ekstra_haklar: ekstra,
          limits: {
            profil_goruntuleme_limiti: abonelik.paketler?.profil_goruntuleme_limiti != null
              ? abonelik.paketler.profil_goruntuleme_limiti + (ekstra.profil_goruntuleme || 0)
              : null,
            ihale_acma_limiti: abonelik.paketler?.ihale_acma_limiti != null
              ? abonelik.paketler.ihale_acma_limiti + (ekstra.ihale_acma || 0)
              : null,
            teklif_verme_limiti: abonelik.paketler?.teklif_verme_limiti != null
              ? abonelik.paketler.teklif_verme_limiti + (ekstra.teklif_verme || 0)
              : null,
            aktif_urun_limiti: abonelik.paketler?.aktif_urun_limiti != null
              ? abonelik.paketler.aktif_urun_limiti + (ekstra.aktif_urun || 0)
              : abonelik.paketler?.aktif_urun_limiti,
            mesaj_limiti: abonelik.paketler?.mesaj_limiti != null
              ? abonelik.paketler.mesaj_limiti + (ekstra.mesaj || 0)
              : null,
          },
        },
        usage: {
          profil_goruntuleme: profilRes.count || 0,
          teklif_verme: uniqueIhaleIds.size,
          aktif_urun: urunRes.count || 0,
          mesaj: initiatedConversations,
        },
      });
    }

    // ─── PANEL STATS (dashboard overview) ───
    if (action === "panel-stats") {
      const { token } = body;
      const payload = verifyToken(token);
      const now = new Date();
      const onlineThreshold = new Date(now.getTime() - 15 * 60 * 1000);

      // ── Firma Stats ──
      const { data: allFirmalar } = await supabase.from("firmalar").select("id, firma_turu_id, firma_tipi_id, onay_durumu, created_at");
      const { data: turler } = await supabase.from("firma_turleri").select("id, name");
      const { data: tipler } = await supabase.from("firma_tipleri").select("id, name, firma_turu_id");
      const { count: onlineCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen", onlineThreshold.toISOString());

      const firmaStats = {
        toplam: (allFirmalar || []).length,
        onay_bekleyen: (allFirmalar || []).filter((f: any) => f.onay_durumu === "onay_bekliyor").length,
        online: onlineCount || 0,
        items: allFirmalar || [],
        turler: turler || [],
        tipler: tipler || [],
      };

      // ── İhale Stats ──
      const { data: allIhaleler } = await supabase.from("ihaleler").select("id, durum, ihale_turu, urun_kategori_id, hizmet_kategori_id, user_id, created_at");
      const ihaleStats = { items: allIhaleler || [] };

      // ── Ürün Stats ──
      const { data: allUrunler } = await supabase.from("urunler").select("id, durum, urun_kategori_id, urun_tur_id, created_at");
      const urunStats = { items: allUrunler || [] };

      // ── Paket Stats ──
      const { data: allAbonelikler } = await supabase.from("kullanici_abonelikler").select("id, paket_id, user_id, durum, created_at");
      const { data: allPaketler } = await supabase.from("paketler").select("id, ad, slug");
      // Get firma info for subscribers
      const subUserIds = [...new Set((allAbonelikler || []).map((a: any) => a.user_id))];
      let subFirmalar: any[] = [];
      if (subUserIds.length > 0) {
        const { data } = await supabase.from("firmalar").select("user_id, firma_turu_id, firma_tipi_id").in("user_id", subUserIds);
        subFirmalar = data || [];
      }
      const paketStats = { abonelikler: allAbonelikler || [], paketler: allPaketler || [], subFirmalar };

      // ── Destek Stats ──
      const { data: allDestek } = await supabase.from("destek_talepleri").select("id, durum, created_at");
      const destekStats = { items: allDestek || [] };

      // ── Şikayet Stats ──
      const { data: allSikayetler } = await supabase.from("sikayetler").select("id, tur, durum, created_at");
      const sikayetStats = { items: allSikayetler || [] };

      // ── Kategori names for ihale/ürün ──
      const katIds = new Set<string>();
      for (const i of (allIhaleler || [])) { if (i.urun_kategori_id) katIds.add(i.urun_kategori_id); if (i.hizmet_kategori_id) katIds.add(i.hizmet_kategori_id); }
      for (const u of (allUrunler || [])) { if (u.urun_kategori_id) katIds.add(u.urun_kategori_id); if (u.urun_tur_id) katIds.add(u.urun_tur_id); }
      let kategoriMap: Record<string, string> = {};
      if (katIds.size > 0) {
        const { data: kats } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", [...katIds]);
        if (kats) kategoriMap = Object.fromEntries(kats.map((k: any) => [k.id, k.name]));
      }

      return jsonResponse({
        firma: firmaStats,
        ihale: ihaleStats,
        urun: urunStats,
        paket: paketStats,
        destek: destekStats,
        sikayet: sikayetStats,
        kategoriMap,
      });
    }

    // ─── LIST ACTIVITY LOG ───
    if (action === "list-activity-log") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary) return jsonResponse({ error: "Yetkisiz" }, 403);

      const { data, error } = await supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ logs: data || [] });
    }

    // ─── GET DROPDOWN OPTIONS (firma türleri, tipleri) ───
    if (action === "get-dropdown-options") {
      verifyToken(body.token);
      const [{ data: turler }, { data: tipler }] = await Promise.all([
        supabase.from("firma_turleri").select("id, name").order("name"),
        supabase.from("firma_tipleri").select("id, name, firma_turu_id").order("name"),
      ]);
      return jsonResponse({ turler: turler || [], tipler: tipler || [] });
    }

    // ─── CREATE FIRMA (admin creates user+firma without email confirmation) ───
    if (action === "create-firma") {
      const { token, email, password, ad, soyad, iletisim_email, iletisim_numarasi, firma_unvani, vergi_numarasi, vergi_dairesi, firma_turu_id, firma_tipi_id } = body;
      const payload = verifyToken(token);

      // Create auth user with auto-confirm
      console.log("Creating auth user for email:", email);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        console.error("Auth user creation error:", authError.message);
        return jsonResponse({ error: authError.message }, 400);
      }
      const userId = authData.user.id;

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        ad,
        soyad,
        iletisim_email: iletisim_email || email,
        iletisim_numarasi: iletisim_numarasi || null,
      });

      if (profileError) {
        // Rollback: delete auth user
        await supabase.auth.admin.deleteUser(userId);
        return jsonResponse({ error: profileError.message }, 400);
      }

      // Create firma
      const { error: firmaError } = await supabase.from("firmalar").insert({
        user_id: userId,
        firma_turu_id,
        firma_tipi_id,
        firma_unvani,
        vergi_numarasi,
        vergi_dairesi,
        onay_durumu: "onaylandi",
      });

      if (firmaError) {
        await supabase.from("profiles").delete().eq("user_id", userId);
        await supabase.auth.admin.deleteUser(userId);
        return jsonResponse({ error: firmaError.message }, 400);
      }

      // Auto-assign free package
      const { data: freePaket } = await supabase.from("paketler").select("id").eq("slug", "ucretsiz").single();
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

      await logActivity(supabase, payload, "create-firma", {
        target_type: "firma",
        target_label: firma_unvani,
        details: { email, ad, soyad, firma_unvani, vergi_numarasi },
      });

      return jsonResponse({ success: true });
    }

    // ─── GET FIRMA BELGELER ───
    if (action === "get-firma-belgeler") {
      const payload = verifyToken(body.token);
      const { firmaId } = body;

      const { data, error } = await supabase
        .from("firma_belgeler")
        .select("*")
        .eq("firma_id", firmaId);

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ belgeler: data || [] });
    }

    // ─── UPDATE BELGE STATUS ───
    if (action === "update-belge-status") {
      const payload = verifyToken(body.token);
      const { belgeId, durum, karar_sebebi } = body;

      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("ad, soyad, pozisyon")
        .eq("id", payload.id)
        .single();

      const karar_veren = adminUser ? `${adminUser.ad} ${adminUser.soyad} (${adminUser.pozisyon})` : payload.username;

      const { error } = await supabase
        .from("firma_belgeler")
        .update({
          durum,
          karar_sebebi: karar_sebebi || null,
          karar_veren,
          karar_tarihi: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", belgeId);

      if (error) return jsonResponse({ error: error.message }, 500);

      // Check if all belgeler for this firma are now approved
      const { data: belge } = await supabase.from("firma_belgeler").select("firma_id").eq("id", belgeId).single();
      if (belge) {
        const { data: allBelgeler } = await supabase.from("firma_belgeler").select("durum").eq("firma_id", belge.firma_id);
        const allApproved = allBelgeler && allBelgeler.length >= 3 && allBelgeler.every(b => b.durum === "onaylandi");
        
        // Update belge_onayli flag on firmalar
        if (allApproved) {
          await supabase.from("firmalar").update({ belge_onayli: true }).eq("id", belge.firma_id);
          // Get user_id for notification
          const { data: firma } = await supabase.from("firmalar").select("user_id, firma_unvani").eq("id", belge.firma_id).single();
          if (firma) {
            await supabase.from("notifications").insert({
              user_id: firma.user_id,
              type: "belge_dogrulama_tamamlandi",
              message: "Tebrikler! Tüm belgeleriniz onaylanmıştır. Artık 'Onaylı Kullanıcı' rozetine sahipsiniz.",
              link: "/firma-bilgilerim",
            });
          }
        } else {
          // If not all approved anymore (e.g. a doc was rejected), remove the flag
          await supabase.from("firmalar").update({ belge_onayli: false }).eq("id", belge.firma_id);
        }
      }

      await logActivity(supabase, payload, `belge-${durum}`, {
        target_type: "belge",
        target_id: belgeId,
        details: { durum, karar_sebebi },
      });

      return jsonResponse({ success: true });
    }

    // ─── GET SIGNED URL FOR BELGE ───
    if (action === "get-belge-url") {
      const payload = verifyToken(body.token);
      const { dosyaUrl } = body;

      const { data, error } = await supabase.storage
        .from("firma-belgeler")
        .createSignedUrl(dosyaUrl, 300); // 5 min expiry

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ url: data.signedUrl });
    }

    // ─── LIST KISITLAMALAR ───
    if (action === "list-kisitlamalar") {
      const payload = verifyToken(body.token);

      const { data, error } = await supabase
        .from("firma_kisitlamalar")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return jsonResponse({ error: error.message }, 500);

      // Enrich with firma & profile info
      const enriched = [];
      for (const k of (data || [])) {
        const { data: firma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", k.user_id).single();
        const { data: profile } = await supabase.from("profiles").select("ad, soyad, iletisim_email").eq("user_id", k.user_id).single();
        enriched.push({
          ...k,
          firma_unvani: firma?.firma_unvani || "—",
          kullanici_ad: profile ? `${profile.ad} ${profile.soyad}` : "—",
          kullanici_email: profile?.iletisim_email || "—",
        });
      }

      return jsonResponse({ kisitlamalar: enriched });
    }

    // ─── UPDATE KISITLAMA ───
    if (action === "update-kisitlama") {
      const { token, kisitlamaId, sebep, kisitlamaAlanlari, bitisTarihi, aktif } = body;
      const payload = verifyToken(token);

      const updateData: any = {};
      if (sebep !== undefined) updateData.sebep = sebep;
      if (kisitlamaAlanlari !== undefined) updateData.kisitlama_alanlari = kisitlamaAlanlari;
      if (bitisTarihi !== undefined) updateData.bitis_tarihi = bitisTarihi;
      if (aktif !== undefined) updateData.aktif = aktif;

      const { error } = await supabase.from("firma_kisitlamalar").update(updateData).eq("id", kisitlamaId);
      if (error) return jsonResponse({ error: error.message }, 400);

      await logActivity(supabase, payload, "Kısıtlama güncellendi", { target_type: "kisitlama", target_id: kisitlamaId });
      return jsonResponse({ success: true });
    }

    // ─── DELETE KISITLAMA ───
    if (action === "delete-kisitlama") {
      const { token, kisitlamaId } = body;
      const payload = verifyToken(token);

      const { error } = await supabase.from("firma_kisitlamalar").delete().eq("id", kisitlamaId);
      if (error) return jsonResponse({ error: error.message }, 400);

      await logActivity(supabase, payload, "Kısıtlama kaldırıldı", { target_type: "kisitlama", target_id: kisitlamaId });
      return jsonResponse({ success: true });
    }

    // ─── SEARCH USERS FOR KISITLAMA ───
    if (action === "search-users-for-kisitlama") {
      const payload = verifyToken(body.token);
      const { query } = body;

      const { data: firmalar } = await supabase
        .from("firmalar")
        .select("user_id, firma_unvani")
        .ilike("firma_unvani", `%${query}%`)
        .limit(10);

      const results = [];
      for (const f of (firmalar || [])) {
        const { data: profile } = await supabase.from("profiles").select("ad, soyad, iletisim_email").eq("user_id", f.user_id).single();
        results.push({
          user_id: f.user_id,
          firma_unvani: f.firma_unvani,
          kullanici_ad: profile ? `${profile.ad} ${profile.soyad}` : "—",
          kullanici_email: profile?.iletisim_email || "—",
        });
      }

      return jsonResponse({ users: results });
    }

    // ─── LIST UZAKLASTIRMALAR ───
    if (action === "list-uzaklastirmalar") {
      const payload = verifyToken(body.token);
      const { data, error } = await supabase.from("firma_uzaklastirmalar").select("*").order("created_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);

      const enriched = [];
      for (const u of (data || [])) {
        const { data: firma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", u.user_id).single();
        const { data: profile } = await supabase.from("profiles").select("ad, soyad, iletisim_email").eq("user_id", u.user_id).single();
        enriched.push({
          ...u,
          firma_unvani: firma?.firma_unvani || "—",
          kullanici_ad: profile ? `${profile.ad} ${profile.soyad}` : "—",
          kullanici_email: profile?.iletisim_email || "—",
        });
      }
      return jsonResponse({ uzaklastirmalar: enriched });
    }

    // ─── UPDATE UZAKLASTIRMA ───
    if (action === "update-uzaklastirma") {
      const { token: t, uzaklastirmaId, sebep, bitisTarihi, aktif } = body;
      const payload = verifyToken(t);
      const updateData: any = {};
      if (sebep !== undefined) updateData.sebep = sebep;
      if (bitisTarihi !== undefined) updateData.bitis_tarihi = bitisTarihi;
      if (aktif !== undefined) updateData.aktif = aktif;

      const { error } = await supabase.from("firma_uzaklastirmalar").update(updateData).eq("id", uzaklastirmaId);
      if (error) return jsonResponse({ error: error.message }, 400);

      // If deactivated, restore firma status
      if (aktif === false) {
        const { data: uzak } = await supabase.from("firma_uzaklastirmalar").select("user_id").eq("id", uzaklastirmaId).single();
        if (uzak) {
          await supabase.from("firmalar").update({ onay_durumu: "onaylandi" }).eq("user_id", uzak.user_id);
        }
      }

      await logActivity(supabase, payload, "Uzaklaştırma güncellendi", { target_type: "uzaklastirma", target_id: String(uzaklastirmaId) });
      return jsonResponse({ success: true });
    }

    // ─── DELETE UZAKLASTIRMA ───
    if (action === "delete-uzaklastirma") {
      const { token: t, uzaklastirmaId } = body;
      const payload = verifyToken(t);

      const { data: uzak } = await supabase.from("firma_uzaklastirmalar").select("user_id").eq("id", uzaklastirmaId).single();
      const { error } = await supabase.from("firma_uzaklastirmalar").delete().eq("id", uzaklastirmaId);
      if (error) return jsonResponse({ error: error.message }, 400);

      // Restore firma status
      if (uzak) {
        await supabase.from("firmalar").update({ onay_durumu: "onaylandi" }).eq("user_id", uzak.user_id);
      }

      await logActivity(supabase, payload, "Uzaklaştırma kaldırıldı", { target_type: "uzaklastirma", target_id: String(uzaklastirmaId) });
      return jsonResponse({ success: true });
    }

    // ─── LIST YASAKLAR ───
    if (action === "list-yasaklar") {
      const payload = verifyToken(body.token);
      const { data, error } = await supabase.from("firma_yasaklar").select("*").order("created_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ yasaklar: data || [] });
    }

    // ─── DELETE YASAK ───
    if (action === "delete-yasak") {
      const { token: t, yasakId } = body;
      const payload = verifyToken(t);
      if (!payload.is_primary) return jsonResponse({ error: "Yasak kaldırma yetkisi yalnızca ana yöneticidedir" }, 401);

      const { error } = await supabase.from("firma_yasaklar").delete().eq("id", yasakId);
      if (error) return jsonResponse({ error: error.message }, 400);

      await logActivity(supabase, payload, "Yasak kaldırıldı", { target_type: "yasak", target_id: String(yasakId) });
      return jsonResponse({ success: true });
    }

    // ─── BANNER UPDATE (gorsel_url, link_url, aktif) ───
    if (action === "update-banner") {
      const payload = verifyToken(body.token);
      const { bannerId, gorsel_url, link_url, aktif } = body;
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (gorsel_url !== undefined) updateData.gorsel_url = gorsel_url;
      if (link_url !== undefined) updateData.link_url = link_url;
      if (aktif !== undefined) updateData.aktif = aktif;

      const { error } = await supabase.from("banners").update(updateData).eq("id", bannerId);
      if (error) return jsonResponse({ error: error.message }, 400);

      await logActivity(supabase, payload, "Banner güncellendi", { target_type: "banner", target_id: String(bannerId) });
      return jsonResponse({ success: true });
    }

    // ─── BANNER UPLOAD (returns signed upload URL or direct upload) ───
    if (action === "upload-banner") {
      const payload = verifyToken(body.token);
      const { bannerId, slug, fileName, fileBase64, contentType } = body;

      const fileData = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
      const ext = fileName.split(".").pop();
      const filePath = `${slug}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(filePath, fileData, { upsert: true, contentType });

      if (uploadError) return jsonResponse({ error: uploadError.message }, 400);

      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();

      const { error: updateError } = await supabase
        .from("banners")
        .update({ gorsel_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", bannerId);

      if (updateError) return jsonResponse({ error: updateError.message }, 400);

      await logActivity(supabase, payload, "Banner görseli yüklendi", { target_type: "banner", target_id: String(bannerId), target_label: slug });
      return jsonResponse({ success: true, publicUrl });
    }

    return jsonResponse({ error: "Geçersiz istek" }, 400);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
