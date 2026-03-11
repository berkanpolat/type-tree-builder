import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      return jsonResponse({ user: data });
    }

    // ─── UPDATE ADMIN USER ───
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
      return jsonResponse({ user: data });
    }

    // ─── DELETE ADMIN USER ───
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
      return jsonResponse({ success: true });
    }

    // ─── LIST FIRMALAR (for admin panel) ───
    if (action === "list-firmalar") {
      const payload = verifyToken(body.token);

      // Get all firmalar with profiles, firma_turleri, firma_tipleri
      const { data: firmalar, error } = await supabase
        .from("firmalar")
        .select(`
          id, firma_unvani, logo_url, created_at, updated_at, onay_durumu, user_id,
          firma_turu_id, firma_tipi_id, kurulus_il_id, kurulus_ilce_id,
          firma_olcegi_id, vergi_numarasi, vergi_dairesi,
          firma_iletisim_email, firma_iletisim_numarasi, web_sitesi,
          instagram, facebook, linkedin, x_twitter, tiktok,
          kapak_fotografi_url, firma_hakkinda, kurulus_tarihi,
          kurulus_il_id, kurulus_ilce_id, moq, aylik_uretim_kapasitesi,
          firma_turleri:firma_turu_id(id, name),
          firma_tipleri:firma_tipi_id(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) return jsonResponse({ error: error.message }, 400);

      // Get profiles for all users
      const userIds = (firmalar || []).map((f: any) => f.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, ad, soyad, iletisim_email, iletisim_numarasi")
        .in("user_id", userIds);

      // Get counts per firma
      const { data: ihaleCounts } = await supabase
        .from("ihaleler")
        .select("user_id")
        .in("user_id", userIds);

      const { data: teklifCounts } = await supabase
        .from("ihale_teklifler")
        .select("teklif_veren_user_id")
        .in("teklif_veren_user_id", userIds);

      const { data: urunCounts } = await supabase
        .from("urunler")
        .select("user_id")
        .in("user_id", userIds);

      const { data: sikayetCounts } = await supabase
        .from("sikayetler")
        .select("bildiren_user_id")
        .in("bildiren_user_id", userIds);

      // Get il/ilce names
      const ilIds = (firmalar || []).map((f: any) => f.kurulus_il_id).filter(Boolean);
      const ilceIds = (firmalar || []).map((f: any) => f.kurulus_ilce_id).filter(Boolean);
      const allLocationIds = [...new Set([...ilIds, ...ilceIds])];
      
      let locationMap: Record<string, string> = {};
      if (allLocationIds.length > 0) {
        const { data: locations } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name")
          .in("id", allLocationIds);
        if (locations) {
          locationMap = Object.fromEntries(locations.map((l: any) => [l.id, l.name]));
        }
      }

      // Calculate profile completion
      const FIRMA_FIELDS = [
        "firma_unvani", "firma_turu_id", "firma_tipi_id", "vergi_numarasi", "vergi_dairesi",
        "firma_olcegi_id", "kurulus_tarihi", "kurulus_il_id", "kurulus_ilce_id", "web_sitesi",
        "firma_iletisim_numarasi", "firma_iletisim_email", "instagram", "facebook", "linkedin",
        "x_twitter", "tiktok", "logo_url", "kapak_fotografi_url", "firma_hakkinda",
      ];

      const enriched = (firmalar || []).map((f: any) => {
        const profile = (profiles || []).find((p: any) => p.user_id === f.user_id);
        const ihaleCount = (ihaleCounts || []).filter((i: any) => i.user_id === f.user_id).length;
        const teklifCount = (teklifCounts || []).filter((t: any) => t.teklif_veren_user_id === f.user_id).length;
        const urunCount = (urunCounts || []).filter((u: any) => u.user_id === f.user_id).length;
        const sikayetCount = (sikayetCounts || []).filter((s: any) => s.bildiren_user_id === f.user_id).length;

        let filled = 0;
        for (const field of FIRMA_FIELDS) {
          const val = f[field];
          if (val !== null && val !== undefined && val !== "") filled++;
        }
        const profilDoluluk = Math.round((filled / FIRMA_FIELDS.length) * 100);

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

      // Get user email from auth
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(firma.user_id);
      
      if (authUser?.email) {
        // Send notification email via Supabase Auth admin
        // For now, create a notification in the notifications table
        const message = action === "approve-firma"
          ? `${firma.firma_unvani} firmanızın başvurusu onaylanmıştır. Artık hesabınızı kullanmaya başlayabilirsiniz.`
          : `${firma.firma_unvani} firmanızın başvurusu reddedilmiştir. Detaylı bilgi için bizimle iletişime geçebilirsiniz.`;

        await supabase.from("notifications").insert({
          user_id: firma.user_id,
          type: action === "approve-firma" ? "firma_onaylandi" : "firma_reddedildi",
          message,
          link: "/dashboard",
        });
      }

      return jsonResponse({ success: true, status: newStatus });
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
      const { data: firmalar } = await supabase
        .from("firmalar")
        .select("firma_turu_id");

      const { data: turler } = await supabase
        .from("firma_turleri")
        .select("id, name");

      const turDagilimi = (turler || []).map((t: any) => ({
        name: t.name,
        count: (firmalar || []).filter((f: any) => f.firma_turu_id === t.id).length,
      }));

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

      return jsonResponse({
        total: totalCount || 0,
        turDagilimi,
        recent: recentCount || 0,
        pending: pendingCount || 0,
      });
    }

    // ─── LIST ALL IHALELER (for admin panel) ───
    if (action === "list-ihaleler") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary && !payload.permissions?.ihale_goruntule) {
        return jsonResponse({ error: "Yetkisiz" }, 401);
      }

      const { data: ihaleler, error } = await supabase
        .from("ihaleler")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return jsonResponse({ error: error.message }, 400);

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
      const draft = allItems.filter((i: any) => i.durum === "duzenleniyor" || i.durum === "taslak").length;

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

      // Get firma names for all user_ids
      const userIds = [...new Set((urunler || []).map((u: any) => u.user_id))];
      const { data: firmalar } = await supabase
        .from("firmalar")
        .select("user_id, firma_unvani")
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
          kategori_label: kategoriLabel || "—",
        };
      });

      return jsonResponse({ urunler: enriched });
    }

    return jsonResponse({ error: "Geçersiz istek" }, 400);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
