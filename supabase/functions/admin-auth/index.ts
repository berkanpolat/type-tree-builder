import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const POSTMARK_API_URL = "https://api.postmarkapp.com/email/withTemplate";
const FROM_EMAIL = "info@tekstilas.com";
const SITE_URL = "https://tekstilas.com";

const EMAIL_TEMPLATES: Record<string, number> = {
  hosgeldiniz: 43889443,
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
    const passwordLink =
      model.sifre_olusturma_baglantisi ||
      model.sifre_olusturma_linki ||
      model.giris_url ||
      model.giris_linki ||
      "";

    const templateModel = {
      ...model,
      ...(passwordLink
        ? {
            sifre_olusturma_baglantisi: passwordLink,
            sifre_olusturma_linki: passwordLink,
            giris_url: passwordLink,
            giris_linki: passwordLink,
          }
        : {}),
      platform_adi: "Tekstil A.Ş.",
      destek_email: "destek@tekstilas.com",
      yil: new Date().getFullYear().toString(),
      site_url: SITE_URL,
    };

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
        TemplateModel: templateModel,
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

/**
 * Returns the acting admin ID for data ownership operations.
 * When a super admin (is_primary) impersonates another admin,
 * the actingAdminId from the request body is used instead.
 * Audit logging should still use payload.id (the real admin).
 */
function getActingId(payload: any, body: any): string {
  if (body.actingAdminId && payload.is_primary) {
    return body.actingAdminId;
  }
  return payload.id;
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
          .select("id, username, ad, soyad, email, telefon, pozisyon, departman, is_primary, permissions, created_at")
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
        .select("id, username, ad, soyad, email, telefon, pozisyon, departman, is_primary, permissions, created_at")
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
          departman: newUser.departman || "Çağrı Merkezi",
          permissions: newUser.permissions,
          created_by: payload.id,
        })
        .select("id, username, ad, soyad, email, telefon, pozisyon, departman, is_primary, permissions, created_at")
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
        departman: updates.departman || "Çağrı Merkezi",
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
        .select("id, username, ad, soyad, email, telefon, pozisyon, departman, is_primary, permissions, created_at")
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
      async function fetchAll(table: string, select: string, opts?: { order?: string }) {
        const PAGE_SIZE = 1000;
        let allRows: any[] = [];
        let from = 0;
        while (true) {
          let q = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
          if (opts?.order) q = q.order(opts.order, { ascending: false });
          const { data, error } = await q;
          if (error) { console.error(`[fetchAll] ${table} error:`, error.message); break; }
          if (!data || data.length === 0) break;
          allRows = allRows.concat(data);
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return allRows;
      }

      async function fetchAllByBuilder(builder: (from: number, to: number) => any, label: string) {
        const PAGE_SIZE = 1000;
        let allRows: any[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await builder(from, from + PAGE_SIZE - 1);
          if (error) {
            console.error(`[fetchAllByBuilder] ${label} error:`, error.message);
            break;
          }
          if (!data || data.length === 0) break;
          allRows = allRows.concat(data);
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return allRows;
      }

      const paginated = body.paginated === true;
      const filterPortfolyo = typeof body.filterPortfolyo === "string" ? body.filterPortfolyo : null;
      const unsupportedSorts = new Set(["ihale_sayisi", "teklif_sayisi", "urun_sayisi", "profil_doluluk", "last_seen"]);

      if (paginated && !unsupportedSorts.has(body.sortField)) {
        const page = Math.max(1, Number(body.page) || 1);
        const perPage = Math.min(500, Math.max(1, Number(body.perPage) || 20));
        const searchTerm = typeof body.searchTerm === "string" ? body.searchTerm.trim() : "";
        const filterTuru = typeof body.filterTuru === "string" ? body.filterTuru : "all";
        const filterTipi = typeof body.filterTipi === "string" ? body.filterTipi : "all";
        const filterIl = typeof body.filterIl === "string" ? body.filterIl : "all";
        const filterIlce = typeof body.filterIlce === "string" ? body.filterIlce : "all";
        const filterDurum = typeof body.filterDurum === "string" ? body.filterDurum : "all";
        const filterPaket = typeof body.filterPaket === "string" ? body.filterPaket : "all";
        const activeStatCard = typeof body.activeStatCard === "string" ? body.activeStatCard : null;
        const abonePeriod = typeof body.abonePeriod === "string" ? body.abonePeriod : "sonBirHafta";
        const statsDays = Math.max(1, Number(body.statsDays) || 7);
        const sortField = body.sortField === "firma_unvani" || body.sortField === "created_at" ? body.sortField : "created_at";
        const sortAscending = body.sortField === sortField ? body.sortDir === "asc" : false;
        const getTs = (value?: string | null) => {
          if (!value) return 0;
          const ts = Date.parse(value);
          return Number.isNaN(ts) ? 0 : ts;
        };
        const getDurumPriority = (durum?: string | null) => {
          if (durum === "aktif") return 3;
          if (durum === "iptal_bekliyor") return 2;
          return 1;
        };

        const includeUserSets: Set<string>[] = [];
        let excludedSubscribedUserIds: string[] = [];

        if (filterPaket !== "all" || activeStatCard === "yeniAbone") {
          const now = new Date();
          const aboneCutoff = new Date(now);
          if (abonePeriod === "son24saat") aboneCutoff.setDate(aboneCutoff.getDate() - 1);
          else if (abonePeriod === "sonBirAy") aboneCutoff.setMonth(aboneCutoff.getMonth() - 1);
          else aboneCutoff.setDate(aboneCutoff.getDate() - 7);

          const abonelikRows = await fetchAllByBuilder((from, to) => {
            let q = supabase
              .from("kullanici_abonelikler")
              .select("user_id, paket_id, donem_baslangic, durum, created_at, updated_at")
              .range(from, to);

            if (activeStatCard === "yeniAbone") {
              q = q.eq("durum", "aktif").gte("donem_baslangic", aboneCutoff.toISOString());
            } else {
              q = q.in("durum", ["aktif", "iptal_bekliyor"]);
            }

            if (filterPaket !== "all" && filterPaket !== "none") {
              q = q.eq("paket_id", filterPaket);
            }

            return q.order("updated_at", { ascending: false });
          }, "kullanici_abonelikler");

          const bestAbonelikByUser = new Map<string, any>();
          const sortedAbonelikler = [...abonelikRows].sort((a: any, b: any) => {
            const durumDiff = getDurumPriority(b.durum) - getDurumPriority(a.durum);
            if (durumDiff !== 0) return durumDiff;
            return getTs(b.updated_at || b.created_at) - getTs(a.updated_at || a.created_at);
          });

          for (const row of sortedAbonelikler) {
            if (!bestAbonelikByUser.has(row.user_id)) bestAbonelikByUser.set(row.user_id, row);
          }

          if (filterPaket === "none") {
            excludedSubscribedUserIds = Array.from(bestAbonelikByUser.keys());
          } else if (filterPaket !== "all") {
            includeUserSets.push(new Set(Array.from(bestAbonelikByUser.values()).map((row: any) => row.user_id)));
          }

          if (activeStatCard === "yeniAbone") {
            includeUserSets.push(new Set(Array.from(bestAbonelikByUser.values()).map((row: any) => row.user_id)));
          }
        }

        if (activeStatCard === "online") {
          const onlineThreshold = new Date(Date.now() - 15 * 60 * 1000);
          const onlineProfiles = await fetchAllByBuilder(
            (from, to) => supabase.from("profiles").select("user_id").gte("last_seen", onlineThreshold.toISOString()).range(from, to),
            "profiles-online",
          );
          includeUserSets.push(new Set(onlineProfiles.map((profile: any) => profile.user_id)));
        }

        let allowedUserIds: string[] | null = null;
        if (includeUserSets.length > 0) {
          const [firstSet, ...otherSets] = includeUserSets;
          allowedUserIds = Array.from(firstSet).filter((userId) => otherSets.every((set) => set.has(userId)));
          if (allowedUserIds.length === 0) {
            return jsonResponse({ firmalar: [], total: 0, page, perPage });
          }
        }

        if (allowedUserIds && excludedSubscribedUserIds.length > 0) {
          const excludedSet = new Set(excludedSubscribedUserIds);
          allowedUserIds = allowedUserIds.filter((userId) => !excludedSet.has(userId));
          if (allowedUserIds.length === 0) {
            return jsonResponse({ firmalar: [], total: 0, page, perPage });
          }
        }

        let firmaQuery = supabase.from("firmalar").select(`
          id, firma_unvani, logo_url, created_at, updated_at, onay_durumu, user_id,
          firma_turu_id, firma_tipi_id, kurulus_il_id, kurulus_ilce_id,
          firma_olcegi_id, vergi_numarasi, vergi_dairesi,
          firma_iletisim_email, firma_iletisim_numarasi, web_sitesi,
          instagram, facebook, linkedin, x_twitter, tiktok,
          kapak_fotografi_url, firma_hakkinda, kurulus_tarihi, moq, aylik_uretim_kapasitesi, belge_onayli,
          firma_turleri:firma_turu_id(id, name),
          firma_tipleri:firma_tipi_id(id, name)
        `, { count: "exact" });

        if (searchTerm) firmaQuery = firmaQuery.ilike("firma_unvani", `%${searchTerm}%`);
        if (filterTuru !== "all") firmaQuery = firmaQuery.eq("firma_turu_id", filterTuru);
        if (filterTipi !== "all") firmaQuery = firmaQuery.eq("firma_tipi_id", filterTipi);
        if (filterIl !== "all") firmaQuery = firmaQuery.eq("kurulus_il_id", filterIl);
        if (filterIlce !== "all") firmaQuery = firmaQuery.eq("kurulus_ilce_id", filterIlce);
        if (filterDurum !== "all") firmaQuery = firmaQuery.eq("onay_durumu", filterDurum);
        if (activeStatCard === "pending") firmaQuery = firmaQuery.eq("onay_durumu", "onay_bekliyor");
        if (activeStatCard === "recent") {
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - statsDays);
          firmaQuery = firmaQuery.gte("created_at", daysAgo.toISOString());
        }
        if (allowedUserIds) firmaQuery = firmaQuery.in("user_id", allowedUserIds);
        if (!allowedUserIds && filterPaket === "none" && excludedSubscribedUserIds.length > 0) {
          firmaQuery = firmaQuery.not("user_id", "in", `(${excludedSubscribedUserIds.join(",")})`);
        }

        // Portfolio filter: only return firms assigned to a specific admin
        if (filterPortfolyo) {
          const { data: portfolyoFirmaRows } = await supabase
            .from("admin_portfolyo")
            .select("firma_id")
            .eq("admin_id", filterPortfolyo);
          const portfolyoFirmaIds = (portfolyoFirmaRows || []).map((r: any) => r.firma_id);
          if (portfolyoFirmaIds.length === 0) {
            return jsonResponse({ firmalar: [], total: 0, page, perPage });
          }
          firmaQuery = firmaQuery.in("id", portfolyoFirmaIds);
        }

        const offset = (page - 1) * perPage;
        const { data: pageFirmalar, error: pageFirmalarError, count: totalCount } = await firmaQuery
          .order(sortField, { ascending: sortAscending })
          .range(offset, offset + perPage - 1);

        if (pageFirmalarError) {
          return jsonResponse({ error: pageFirmalarError.message }, 400);
        }

        const firmalar = pageFirmalar || [];
        if (firmalar.length === 0) {
          return jsonResponse({ firmalar: [], total: totalCount || 0, page, perPage });
        }

        const userIds = [...new Set(firmalar.map((firma: any) => firma.user_id))];
        const firmaIds = firmalar.map((firma: any) => firma.id);
        const ilIds = firmalar.map((firma: any) => firma.kurulus_il_id).filter(Boolean);
        const ilceIds = firmalar.map((firma: any) => firma.kurulus_ilce_id).filter(Boolean);
        const allLocationIds = [...new Set([...ilIds, ...ilceIds])];

        const [profilesRes, countsRes, aboneliklerRes, paketlerData, portfolyoRes, locationsRes] = await Promise.all([
          userIds.length > 0
            ? supabase.from("profiles").select("user_id, ad, soyad, iletisim_email, iletisim_numarasi, last_seen").in("user_id", userIds)
            : Promise.resolve({ data: [] }),
          userIds.length > 0
            ? supabase.rpc("get_firma_user_counts", { p_user_ids: userIds })
            : Promise.resolve({ data: [] }),
          userIds.length > 0
            ? supabase.from("kullanici_abonelikler").select("id, user_id, paket_id, periyot, donem_baslangic, donem_bitis, durum, created_at, updated_at").in("user_id", userIds)
            : Promise.resolve({ data: [] }),
          supabase.from("paketler").select("id, ad, slug, profil_goruntuleme_limiti, ihale_acma_limiti, teklif_verme_limiti, aktif_urun_limiti, mesaj_limiti"),
          firmaIds.length > 0
            ? supabase.from("admin_portfolyo").select("admin_id, firma_id, atayan_admin_id").in("firma_id", firmaIds)
            : Promise.resolve({ data: [] }),
          allLocationIds.length > 0
            ? supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", allLocationIds)
            : Promise.resolve({ data: [] }),
        ]);

        const portfolyoData = portfolyoRes.data || [];
        const adminIds = [...new Set(portfolyoData.map((item: any) => item.admin_id))];
        let adminUsersForPortfolyo: any[] = [];
        if (adminIds.length > 0) {
          const { data: adminRows } = await supabase.from("admin_users").select("id, ad, soyad").in("id", adminIds);
          adminUsersForPortfolyo = adminRows || [];
        }

        const profileMap = new Map<string, any>();
        for (const profile of (profilesRes.data || [])) profileMap.set(profile.user_id, profile);

        const ihaleCountMap = new Map<string, number>();
        const teklifCountMap = new Map<string, number>();
        const urunCountMap = new Map<string, number>();
        const sikayetCountMap = new Map<string, number>();
        for (const row of (countsRes.data || [])) {
          ihaleCountMap.set(row.user_id, Number(row.ihale_count) || 0);
          teklifCountMap.set(row.user_id, Number(row.teklif_count) || 0);
          urunCountMap.set(row.user_id, Number(row.urun_count) || 0);
          sikayetCountMap.set(row.user_id, Number(row.sikayet_count) || 0);
        }

        const abonelikByUser = new Map<string, any>();
        const sortedAbonelikler = [...(aboneliklerRes.data || [])].sort((a: any, b: any) => {
          const durumDiff = getDurumPriority(b.durum) - getDurumPriority(a.durum);
          if (durumDiff !== 0) return durumDiff;
          return getTs(b.updated_at || b.created_at) - getTs(a.updated_at || a.created_at);
        });
        for (const row of sortedAbonelikler) {
          if (!abonelikByUser.has(row.user_id)) abonelikByUser.set(row.user_id, row);
        }

        const paketMap: Record<string, any> = {};
        for (const paket of (paketlerData.data || [])) paketMap[paket.id] = paket;

        const adminNameMap = new Map<string, any>();
        for (const admin of adminUsersForPortfolyo) adminNameMap.set(admin.id, admin);

        const portfolyoMap = new Map<string, { admin_id: string; admin_ad: string; admin_soyad: string; atanmis: boolean }>();
        for (const portfolyo of portfolyoData) {
          const admin = adminNameMap.get(portfolyo.admin_id);
          portfolyoMap.set(portfolyo.firma_id, {
            admin_id: portfolyo.admin_id,
            admin_ad: admin?.ad || "",
            admin_soyad: admin?.soyad || "",
            atanmis: !!portfolyo.atayan_admin_id,
          });
        }

        const locationMap = Object.fromEntries((locationsRes.data || []).map((location: any) => [location.id, location.name]));

        const FIRMA_FIELDS = [
          "firma_unvani", "firma_turu_id", "firma_tipi_id", "vergi_numarasi", "vergi_dairesi",
          "firma_olcegi_id", "kurulus_tarihi", "kurulus_il_id", "kurulus_ilce_id", "web_sitesi",
          "firma_iletisim_numarasi", "firma_iletisim_email", "instagram", "facebook", "linkedin",
          "x_twitter", "tiktok", "logo_url", "kapak_fotografi_url", "firma_hakkinda",
        ];

        const enriched = firmalar.map((firma: any) => {
          let filled = 0;
          for (const field of FIRMA_FIELDS) {
            const value = firma[field];
            if (value !== null && value !== undefined && value !== "") filled++;
          }

          const abonelik = abonelikByUser.get(firma.user_id) || null;
          const paket = abonelik ? paketMap[abonelik.paket_id] || null : null;

          return {
            id: firma.id,
            firma_unvani: firma.firma_unvani,
            logo_url: firma.logo_url,
            created_at: firma.created_at,
            updated_at: firma.updated_at,
            onay_durumu: firma.onay_durumu,
            user_id: firma.user_id,
            firma_turu_id: firma.firma_turu_id,
            firma_tipi_id: firma.firma_tipi_id,
            kurulus_il_id: firma.kurulus_il_id,
            kurulus_ilce_id: firma.kurulus_ilce_id,
            belge_onayli: firma.belge_onayli,
            profile: profileMap.get(firma.user_id) || null,
            firma_turu_name: firma.firma_turleri?.name || null,
            firma_tipi_name: firma.firma_tipleri?.name || null,
            il_name: firma.kurulus_il_id ? locationMap[firma.kurulus_il_id] || null : null,
            ilce_name: firma.kurulus_ilce_id ? locationMap[firma.kurulus_ilce_id] || null : null,
            ihale_sayisi: ihaleCountMap.get(firma.user_id) || 0,
            teklif_sayisi: teklifCountMap.get(firma.user_id) || 0,
            urun_sayisi: urunCountMap.get(firma.user_id) || 0,
            sikayet_sayisi: sikayetCountMap.get(firma.user_id) || 0,
            profil_doluluk: Math.round((filled / FIRMA_FIELDS.length) * 100),
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
            portfolyo: portfolyoMap.get(firma.id) || null,
          };
        });

        return jsonResponse({ firmalar: enriched, total: totalCount || 0, page, perPage });
      }

      // Fetch all data in parallel - no .in() needed, just get everything
      const [firmalar, profiles, ihaleCounts, teklifCounts, urunCounts, sikayetCounts, abonelikler, paketlerData, portfolyoData, adminUsersForPortfolyo] = await Promise.all([
        fetchAll("firmalar", `
          id, firma_unvani, logo_url, created_at, updated_at, onay_durumu, user_id,
          firma_turu_id, firma_tipi_id, kurulus_il_id, kurulus_ilce_id,
          firma_olcegi_id, vergi_numarasi, vergi_dairesi,
          firma_iletisim_email, firma_iletisim_numarasi, web_sitesi,
          instagram, facebook, linkedin, x_twitter, tiktok,
          kapak_fotografi_url, firma_hakkinda, kurulus_tarihi, moq, aylik_uretim_kapasitesi, belge_onayli,
          firma_turleri:firma_turu_id(id, name),
          firma_tipleri:firma_tipi_id(id, name)
        `, { order: "created_at" }),
        fetchAll("profiles", "user_id, ad, soyad, iletisim_email, iletisim_numarasi, last_seen"),
        fetchAll("ihaleler", "user_id"),
        fetchAll("ihale_teklifler", "teklif_veren_user_id"),
        fetchAll("urunler", "user_id"),
        fetchAll("sikayetler", "bildiren_user_id"),
        fetchAll("kullanici_abonelikler", "id, user_id, paket_id, periyot, donem_baslangic, donem_bitis, durum, created_at, updated_at"),
        supabase.from("paketler").select("id, ad, slug, profil_goruntuleme_limiti, ihale_acma_limiti, teklif_verme_limiti, aktif_urun_limiti, mesaj_limiti"),
        fetchAll("admin_portfolyo", "admin_id, firma_id, atayan_admin_id"),
        fetchAll("admin_users", "id, ad, soyad"),
      ]);

      console.log(`[list-firmalar] firmalar: ${firmalar.length}, profiles: ${profiles.length}, abonelikler: ${abonelikler.length}`);

      // Build Maps for O(1) lookups
      const profileMap = new Map<string, any>();
      for (const p of profiles) profileMap.set(p.user_id, p);

      const ihaleCountMap = new Map<string, number>();
      for (const i of ihaleCounts) ihaleCountMap.set(i.user_id, (ihaleCountMap.get(i.user_id) || 0) + 1);

      const teklifCountMap = new Map<string, number>();
      for (const t of teklifCounts) teklifCountMap.set(t.teklif_veren_user_id, (teklifCountMap.get(t.teklif_veren_user_id) || 0) + 1);

      const urunCountMap = new Map<string, number>();
      for (const u of urunCounts) urunCountMap.set(u.user_id, (urunCountMap.get(u.user_id) || 0) + 1);

      // Portfolio map: firma_id -> { admin_id, admin_ad, admin_soyad }
      const adminNameMap = new Map<string, any>();
      for (const a of adminUsersForPortfolyo) adminNameMap.set(a.id, a);
      const portfolyoMap = new Map<string, { admin_id: string; admin_ad: string; admin_soyad: string; atanmis: boolean }>();
      for (const p of portfolyoData) {
        const admin = adminNameMap.get(p.admin_id);
        portfolyoMap.set(p.firma_id, {
          admin_id: p.admin_id,
          admin_ad: admin?.ad || "",
          admin_soyad: admin?.soyad || "",
          atanmis: !!p.atayan_admin_id,
        });
      }

      const sikayetCountMap = new Map<string, number>();
      for (const s of sikayetCounts) sikayetCountMap.set(s.bildiren_user_id, (sikayetCountMap.get(s.bildiren_user_id) || 0) + 1);

      // Get il/ilce names
      const ilIds = firmalar.map((f: any) => f.kurulus_il_id).filter(Boolean);
      const ilceIds = firmalar.map((f: any) => f.kurulus_ilce_id).filter(Boolean);
      const allLocationIds = [...new Set([...ilIds, ...ilceIds])];
      
      let locationMap: Record<string, string> = {};
      if (allLocationIds.length > 0) {
        const { data: locations } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", allLocationIds.slice(0, 500));
        if (locations) locationMap = Object.fromEntries(locations.map((l: any) => [l.id, l.name]));
      }

      const FIRMA_FIELDS = [
        "firma_unvani", "firma_turu_id", "firma_tipi_id", "vergi_numarasi", "vergi_dairesi",
        "firma_olcegi_id", "kurulus_tarihi", "kurulus_il_id", "kurulus_ilce_id", "web_sitesi",
        "firma_iletisim_numarasi", "firma_iletisim_email", "instagram", "facebook", "linkedin",
        "x_twitter", "tiktok", "logo_url", "kapak_fotografi_url", "firma_hakkinda",
      ];

      // Subscription: pick best per user
      const getTs = (value?: string | null) => {
        if (!value) return 0;
        const ts = Date.parse(value);
        return Number.isNaN(ts) ? 0 : ts;
      };
      const getDurumPriority = (durum?: string | null) => {
        if (durum === "aktif") return 3;
        if (durum === "iptal_bekliyor") return 2;
        return 1;
      };

      const abonelikByUser = new Map<string, any>();
      const sortedAbonelikler = [...abonelikler].sort((a: any, b: any) => {
        const durumDiff = getDurumPriority(b.durum) - getDurumPriority(a.durum);
        if (durumDiff !== 0) return durumDiff;
        return getTs(b.updated_at || b.created_at) - getTs(a.updated_at || a.created_at);
      });
      for (const row of sortedAbonelikler) {
        if (!abonelikByUser.has(row.user_id)) abonelikByUser.set(row.user_id, row);
      }

      const paketMap: Record<string, any> = {};
      for (const p of (paketlerData.data || [])) paketMap[p.id] = p;

      const enriched = firmalar.map((f: any) => {
        let filled = 0;
        for (const field of FIRMA_FIELDS) {
          const val = f[field];
          if (val !== null && val !== undefined && val !== "") filled++;
        }

        const abonelik = abonelikByUser.get(f.user_id) || null;
        const paket = abonelik ? paketMap[abonelik.paket_id] || null : null;

        return {
          id: f.id, firma_unvani: f.firma_unvani, logo_url: f.logo_url,
          created_at: f.created_at, updated_at: f.updated_at, onay_durumu: f.onay_durumu,
          user_id: f.user_id, firma_turu_id: f.firma_turu_id, firma_tipi_id: f.firma_tipi_id,
          kurulus_il_id: f.kurulus_il_id, kurulus_ilce_id: f.kurulus_ilce_id, belge_onayli: f.belge_onayli,
          profile: profileMap.get(f.user_id) || null,
          firma_turu_name: f.firma_turleri?.name || null,
          firma_tipi_name: f.firma_tipleri?.name || null,
          il_name: f.kurulus_il_id ? locationMap[f.kurulus_il_id] || null : null,
          ilce_name: f.kurulus_ilce_id ? locationMap[f.kurulus_ilce_id] || null : null,
          ihale_sayisi: ihaleCountMap.get(f.user_id) || 0,
          teklif_sayisi: teklifCountMap.get(f.user_id) || 0,
          urun_sayisi: urunCountMap.get(f.user_id) || 0,
          sikayet_sayisi: sikayetCountMap.get(f.user_id) || 0,
          profil_doluluk: Math.round((filled / FIRMA_FIELDS.length) * 100),
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
          portfolyo: portfolyoMap.get(f.id) || null,
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
        .select("iletisim_numarasi, ad, soyad")
        .eq("user_id", firma.user_id)
        .single();
      const userPhone = profile?.iletisim_numarasi;
      const adSoyad = profile ? `${profile.ad} ${profile.soyad}` : firma.firma_unvani;

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

          // 2) Generate recovery link via admin API — always use tekstilas.com
          const siteUrl = SITE_URL;
          let recoveryLink = `${siteUrl}/sifre-sifirla`;
          try {
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
              type: "recovery",
              email: authUser.email,
              options: {
                redirectTo: `${siteUrl}/sifre-sifirla`,
              },
            });
            if (linkError) {
              console.error("generateLink error:", linkError);
            } else if (linkData?.properties?.hashed_token) {
              recoveryLink = `${siteUrl}/sifre-sifirla?token_hash=${linkData.properties.hashed_token}&type=recovery`;
            } else if (linkData?.properties?.action_link) {
              recoveryLink = linkData.properties.action_link;
            }
            console.log("Recovery link generated for:", authUser.email);
          } catch (e) {
            console.error("Recovery link generation failed:", e);
          }

          // 3) Send Hoşgeldiniz email (welcome + password creation link)
          await sendPostmarkEmail("hosgeldiniz", authUser.email, {
            firma_unvani: firma.firma_unvani,
            sifre_olusturma_baglantisi: recoveryLink,
          });

          // Also send Başvuru Onay email
          await sendPostmarkEmail("basvuru_onay", authUser.email, {
            firma_unvani: firma.firma_unvani,
            sifre_olusturma_baglantisi: recoveryLink,
            giris_linki: `${SITE_URL}/giris-kayit`,
            profil_linki: `${SITE_URL}/firma-bilgilerim`,
          });

          const message = `${firma.firma_unvani} firmanızın başvurusu onaylanmıştır. Şifre belirleme bağlantısı e-posta adresinize gönderilmiştir.`;
          await supabase.from("notifications").insert({
            user_id: firma.user_id,
            type: "firma_onaylandi",
            message,
            link: null,
          });

          // Send approval SMS via send-notification-sms
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-sms`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({
                type: "basvuru_onaylandi",
                telefon: userPhone,
                firmaUnvani: firma.firma_unvani,
                sifreLink: recoveryLink,
              }),
            });
          } catch (smsErr) {
            console.error("Approval SMS failed:", smsErr);
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

          // Send rejection SMS via send-notification-sms
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-sms`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({
                type: "basvuru_reddedildi",
                telefon: userPhone,
                firmaUnvani: firma.firma_unvani,
              }),
            });
          } catch (smsErr) {
            console.error("Rejection SMS failed:", smsErr);
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
      // All authenticated admin users can impersonate

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

    // ─── SEND PASSWORD RESET (manual trigger) ───
    if (action === "send-password-reset") {
      const { token, email } = body;
      const payload = verifyToken(token);

      // Find user by email
      const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) return jsonResponse({ error: listErr.message }, 500);
      const targetUser = users?.find((u: any) => u.email?.toLowerCase() === email?.toLowerCase());
      if (!targetUser) return jsonResponse({ error: "Kullanıcı bulunamadı" }, 404);

      const siteUrl = SITE_URL;
      let recoveryLink = `${siteUrl}/sifre-sifirla`;
      
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: targetUser.email!,
        options: { redirectTo: `${siteUrl}/sifre-sifirla` },
      });

      if (linkError) {
        console.error("generateLink error:", linkError);
      } else if (linkData?.properties?.action_link) {
        recoveryLink = linkData.properties.action_link;
      }

      // Send via send-email edge function (sifre_degistirildi template or direct Postmark)
      const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
      if (POSTMARK_SERVER_TOKEN) {
        try {
          await fetch(POSTMARK_API_URL, {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
            },
            body: JSON.stringify({
              From: FROM_EMAIL,
              To: targetUser.email,
              TemplateId: 43898480, // sifre_degistirildi
              TemplateModel: {
                sifre_olusturma_baglantisi: recoveryLink,
                platform_adi: "Tekstil A.Ş.",
                destek_email: "info@manufixo.com",
                yil: new Date().getFullYear().toString(),
                site_url: siteUrl,
              },
            }),
          });
          console.log("Password reset email sent to:", targetUser.email);
        } catch (e) {
          console.error("Password reset email failed:", e);
          return jsonResponse({ error: "E-posta gönderilemedi" }, 500);
        }
      }

      await logActivity(supabase, payload, "send-password-reset", { target_type: "user", target_id: targetUser.id, target_label: targetUser.email });

      return jsonResponse({ success: true, message: `Şifre sıfırlama linki ${targetUser.email} adresine gönderildi.` });
    }

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

      // Build Maps for O(1) lookups
      const firmaMap2 = new Map<string, string>();
      for (const f of (firmalar || [])) firmaMap2.set(f.user_id, f.firma_unvani);
      
      const teklifCountMap = new Map<string, number>();
      for (const t of (teklifler || [])) teklifCountMap.set(t.ihale_id, (teklifCountMap.get(t.ihale_id) || 0) + 1);

      const enriched = (ihaleler || []).map((i: any) => {
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
          firma_unvani: firmaMap2.get(i.user_id) || "—",
          teklif_sayisi: teklifCountMap.get(i.id) || 0,
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
          link: "/ihalelerim",
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

      // Build Map for O(1) lookups
      const firmaMapU = new Map<string, { firma_unvani: string; logo_url: string | null }>();
      for (const f of (firmalar || [])) firmaMapU.set(f.user_id, { firma_unvani: f.firma_unvani, logo_url: f.logo_url });

      const enriched = (urunler || []).map((u: any) => {
        const firma = firmaMapU.get(u.user_id);
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

        // Send ihale approval SMS
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-sms`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({
              type: "ihale_onaylandi",
              userId: data.user_id,
              firmaUnvani: ihaleFirma?.firma_unvani || "",
              ihaleBasligi: data.baslik,
              ihaleDetayLinki: `${SITE_URL}/tekihale/${data.id}`,
            }),
          });
        } catch (smsErr) { console.error("Ihale approval SMS failed:", smsErr); }
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

        // Send ihale rejection SMS
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-sms`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({
              type: "ihale_reddedildi",
              userId: ihaleInfo.user_id,
              firmaUnvani: ihaleRejFirma?.firma_unvani || "",
              reddedilmeSebebi: redSebebi,
            }),
          });
        } catch (smsErr) { console.error("Ihale rejection SMS failed:", smsErr); }
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
          link: "/urunlerim",
        });

        // Send urun approval SMS
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-sms`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({
              type: "urun_yayinlandi",
              userId: data.user_id,
              firmaUnvani: urunFirma?.firma_unvani || "",
              urunBasligi: data.baslik,
              urunLinki: `${SITE_URL}/urun/${data.id}`,
            }),
          });
        } catch (smsErr) { console.error("Urun approval SMS failed:", smsErr); }
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

        // Send urun rejection SMS
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-sms`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({
              type: "urun_reddedildi",
              userId: urunInfo.user_id,
              firmaUnvani: urunRejFirma?.firma_unvani || "",
              urunBasligi: urunInfo.baslik,
              reddedilmeSebebi: redSebebi,
            }),
          });
        } catch (smsErr) { console.error("Urun rejection SMS failed:", smsErr); }
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
           link: "/urunlerim",
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
          link: "/urunlerim",
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

      // Batch-resolve referenced entities instead of N+1 queries
      const profilRefIds = (sikayetler || []).filter((s: any) => s.tur === "profil").map((s: any) => s.referans_id);
      const ihaleRefIds = (sikayetler || []).filter((s: any) => s.tur === "ihale").map((s: any) => s.referans_id);
      const urunRefIds = (sikayetler || []).filter((s: any) => s.tur === "urun").map((s: any) => s.referans_id);
      const mesajRefIds = (sikayetler || []).filter((s: any) => s.tur === "mesaj").map((s: any) => s.referans_id);

      const [profilFirmalar, ihaleFirmalar, urunFirmalar, mesajSenders] = await Promise.all([
        profilRefIds.length > 0
          ? supabase.from("firmalar").select("id, user_id, firma_unvani").in("id", profilRefIds).then(r => r.data || [])
          : Promise.resolve([]),
        ihaleRefIds.length > 0
          ? supabase.from("ihaleler").select("id, user_id").in("id", ihaleRefIds).then(r => r.data || [])
          : Promise.resolve([]),
        urunRefIds.length > 0
          ? supabase.from("urunler").select("id, user_id").in("id", urunRefIds).then(r => r.data || [])
          : Promise.resolve([]),
        mesajRefIds.length > 0
          ? supabase.from("messages").select("id, sender_id").in("id", mesajRefIds).then(r => r.data || [])
          : Promise.resolve([]),
      ]);

      // Collect all user_ids from resolved entities to batch-fetch firma names
      const resolvedUserIds = new Set<string>();
      const ihaleUserMap = new Map<string, string>();
      for (const i of ihaleFirmalar) { ihaleUserMap.set(i.id, i.user_id); resolvedUserIds.add(i.user_id); }
      const urunUserMap = new Map<string, string>();
      for (const u of urunFirmalar) { urunUserMap.set(u.id, u.user_id); resolvedUserIds.add(u.user_id); }
      const mesajSenderMap = new Map<string, string>();
      for (const m of mesajSenders) { mesajSenderMap.set(m.id, m.sender_id); resolvedUserIds.add(m.sender_id); }
      const profilFirmaMap = new Map<string, { user_id: string; firma_unvani: string }>();
      for (const f of profilFirmalar) { profilFirmaMap.set(f.id, { user_id: f.user_id, firma_unvani: f.firma_unvani }); }

      // Batch-fetch firma names for ihale/urun/mesaj owners
      const resolvedArr = [...resolvedUserIds];
      const resolvedFirmaMap = new Map<string, string>();
      if (resolvedArr.length > 0) {
        const { data: rFirmalar } = await supabase.from("firmalar").select("user_id, firma_unvani").in("user_id", resolvedArr);
        for (const f of (rFirmalar || [])) resolvedFirmaMap.set(f.user_id, f.firma_unvani);
      }

      const enriched = (sikayetler || []).map((s: any) => {
        let sikayet_edilen_firma = "-";
        let sikayet_edilen_user_id: string | null = null;

        if (s.tur === "profil") {
          const pf = profilFirmaMap.get(s.referans_id);
          if (pf) { sikayet_edilen_firma = pf.firma_unvani; sikayet_edilen_user_id = pf.user_id; }
        } else if (s.tur === "ihale") {
          const uid = ihaleUserMap.get(s.referans_id);
          if (uid) { sikayet_edilen_user_id = uid; sikayet_edilen_firma = resolvedFirmaMap.get(uid) || "-"; }
        } else if (s.tur === "urun") {
          const uid = urunUserMap.get(s.referans_id);
          if (uid) { sikayet_edilen_user_id = uid; sikayet_edilen_firma = resolvedFirmaMap.get(uid) || "-"; }
        } else if (s.tur === "mesaj") {
          const uid = mesajSenderMap.get(s.referans_id);
          if (uid) { sikayet_edilen_user_id = uid; sikayet_edilen_firma = resolvedFirmaMap.get(uid) || "-"; }
        }

        return {
          ...s,
          bildiren_firma: firmaMap[s.bildiren_user_id] || "-",
          sikayet_edilen_firma,
          sikayet_edilen_user_id,
        };
      });

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

        // Get firma unvani for SMS
        const { data: kisitFirma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", userId).single();

        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-sms`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({
              type: "kisitlama",
              telefon: kisitProfile.iletisim_numarasi,
              firmaUnvani: kisitFirma?.firma_unvani || "",
              kisitlamaAlanlari: smsAlanlar,
              kisitlamaBitis: smsBitis,
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
      const { token, userId, paketId, ekstraHaklar, periyot } = body;
      const payload = verifyToken(token);

      console.log("[UPDATE-FIRMA-PAKET] Starting", { userId, paketId, periyot });

      // Calculate dates based on selected period
      const now = new Date();
      let donemBitis: Date;
      let periyotValue: string;

      if (periyot === "aylik") {
        donemBitis = new Date(now);
        donemBitis.setMonth(donemBitis.getMonth() + 1);
        periyotValue = "aylik";
      } else if (periyot === "yillik") {
        donemBitis = new Date(now);
        donemBitis.setFullYear(donemBitis.getFullYear() + 1);
        periyotValue = "yillik";
      } else {
        // sinursiz (default for admin assignments)
        donemBitis = new Date(now);
        donemBitis.setFullYear(donemBitis.getFullYear() + 100);
        periyotValue = "sinursiz";
      }

      const updatePayload: any = {
        paket_id: paketId,
        donem_baslangic: now.toISOString(),
        donem_bitis: donemBitis.toISOString(),
        durum: "aktif",
        periyot: periyotValue,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        updated_at: now.toISOString(),
      };
      if (ekstraHaklar !== undefined) {
        updatePayload.ekstra_haklar = ekstraHaklar;
      }

      const { data: existingRows, error: existingError } = await supabase
        .from("kullanici_abonelikler")
        .select("id")
        .eq("user_id", userId);

      if (existingError) {
        console.error("[UPDATE-FIRMA-PAKET] Existing lookup error", existingError.message);
        return jsonResponse({ error: existingError.message }, 500);
      }

      console.log("[UPDATE-FIRMA-PAKET] Existing check", { existingCount: existingRows?.length || 0 });

      if (existingRows && existingRows.length > 0) {
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
      const { data: paket } = await supabase.from("paketler").select("ad, slug").eq("id", paketId).single();
      const periyotLabel = periyotValue === "sinursiz" ? "Sınırsız" : periyotValue === "yillik" ? "Yıllık" : "Aylık";
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "paket_degisikligi",
        message: `Paketiniz ${paket?.ad || ""} (${periyotLabel}) olarak güncellenmiştir.`,
        link: "/dashboard",
      });

      // Send password creation email for PRO paid package assignments
      if (paket?.slug === "pro") {
        try {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
          const userEmail = authUser?.email;
          if (userEmail) {
            const { data: firmaData } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", userId).single();
            const { data: profileData } = await supabase.from("profiles").select("ad, soyad").eq("user_id", userId).single();
            const adSoyad = profileData ? `${profileData.ad} ${profileData.soyad}` : "";

            // Generate recovery link for password creation
            const SITE_URL = "https://tekstilas.com";
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
              type: "recovery",
              email: userEmail,
              options: { redirectTo: `${SITE_URL}/sifre-sifirla` },
            });

            console.log("[UPDATE-FIRMA-PAKET] generateLink result:", JSON.stringify({ linkError, hasProperties: !!linkData?.properties, hashed_token: linkData?.properties?.hashed_token ? "exists" : "missing", action_link: linkData?.properties?.action_link ? "exists" : "missing" }));

            let sifreLink = `${SITE_URL}/sifre-sifirla`;
            if (!linkError && linkData?.properties?.hashed_token) {
              sifreLink = `${SITE_URL}/sifre-sifirla?token_hash=${linkData.properties.hashed_token}&type=recovery`;
            } else if (!linkError && linkData?.properties?.action_link) {
              // Fallback: extract token from action_link
              try {
                const actionUrl = new URL(linkData.properties.action_link);
                const token = actionUrl.searchParams.get("token");
                if (token) {
                  sifreLink = `${SITE_URL}/sifre-sifirla?token_hash=${token}&type=recovery`;
                  console.log("[UPDATE-FIRMA-PAKET] Used fallback token from action_link");
                }
              } catch (e) {
                console.error("[UPDATE-FIRMA-PAKET] Failed to parse action_link:", e);
              }
            }
            console.log("[UPDATE-FIRMA-PAKET] Final sifreLink:", sifreLink);

            // Send hosgeldiniz (password creation) template via send-email
            const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
            if (POSTMARK_SERVER_TOKEN) {
              const emailRes = await fetch("https://api.postmarkapp.com/email/withTemplate", {
                method: "POST",
                headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json",
                  "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
                },
                body: JSON.stringify({
                  From: "Tekstil A.Ş. <info@tekstilas.com>",
                  To: userEmail,
                  TemplateId: 43889443, // hosgeldiniz template
                  TemplateModel: {
                    ad_soyad: adSoyad,
                    firma_unvani: firmaData?.firma_unvani || "",
                    platform_adi: "Tekstil A.Ş.",
                    sifre_olusturma_baglantisi: sifreLink,
                    sifre_olusturma_linki: sifreLink,
                    giris_url: sifreLink,
                    giris_linki: sifreLink,
                    destek_email: "destek@tekstilas.com",
                    yil: new Date().getFullYear().toString(),
                    site_url: SITE_URL,
                  },
                }),
              });
              const emailData = await emailRes.json();
              if (emailRes.ok) {
                console.log(`[UPDATE-FIRMA-PAKET] Password creation email sent to ${userEmail}, messageId=${emailData.MessageID}`);
              } else {
                console.error(`[UPDATE-FIRMA-PAKET] Postmark error:`, JSON.stringify(emailData));
              }
            }
          }
        } catch (emailErr) {
          console.error("[UPDATE-FIRMA-PAKET] Password creation email error:", emailErr);
        }
      }

      // Log activity
      await logActivity(supabase, payload, "update-firma-paket", {
        target_type: "kullanici",
        target_id: userId,
        target_label: paket?.ad || paketId,
        details: { paketId, periyot: periyotValue },
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

      const { data: abonelikRows, error: abonelikError } = await supabase
        .from("kullanici_abonelikler")
        .select("*, paketler(*)")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (abonelikError) return jsonResponse({ error: abonelikError.message }, 500);

      const abonelik = abonelikRows?.[0];

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
      const onlineThreshold = new Date(now.getTime() - 5 * 60 * 1000); // 5 min for active users

      // Helper: fetch all rows bypassing 1000-row default limit
      async function fetchAllPaged(table: string, select: string) {
        const PAGE_SIZE = 1000;
        let allRows: any[] = [];
        let from = 0;
        while (true) {
          const { data } = await supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
          if (!data || data.length === 0) break;
          allRows = allRows.concat(data);
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return allRows;
      }

      // ── Firma Stats ──
      const allFirmalar = await fetchAllPaged("firmalar", "id, firma_turu_id, firma_tipi_id, onay_durumu, created_at, user_id");
      const { data: turler } = await supabase.from("firma_turleri").select("id, name");
      const { data: tipler } = await supabase.from("firma_tipleri").select("id, name, firma_turu_id");
      const { count: onlineCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen", onlineThreshold.toISOString());

      const firmaStats = {
        toplam: allFirmalar.length,
        onay_bekleyen: allFirmalar.filter((f: any) => f.onay_durumu === "onay_bekliyor").length,
        online: onlineCount || 0,
        items: allFirmalar,
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

    // ─── ONLINE COUNT (lightweight polling endpoint) ───
    if (action === "online-count") {
      const { token } = body;
      verifyToken(token);
      const now = new Date();
      const onlineThreshold = new Date(now.getTime() - 5 * 60 * 1000);
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen", onlineThreshold.toISOString());
      return jsonResponse({ online: count || 0 });
    }

    // ─── LIST ACTIVITY LOG ───
    if (action === "list-activity-log") {
      const payload = verifyToken(body.token);

      let query = supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false });

      // Optional filters for report pages
      if (body.action) query = query.eq("action", body.action);
      if (body.from) query = query.gte("created_at", body.from);
      if (body.to) query = query.lte("created_at", body.to);

      query = query.limit(1000);

      const { data, error } = await query;
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

      // Server-side validation
      const trimmedEmail = (email || "").trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        return jsonResponse({ error: "Geçerli bir e-posta adresi girin." }, 400);
      }
      if (!password || password.length < 6) {
        return jsonResponse({ error: "Şifre en az 6 karakter olmalıdır." }, 400);
      }
      if (!ad || !soyad || !firma_unvani || !vergi_numarasi || !vergi_dairesi || !firma_turu_id || !firma_tipi_id) {
        return jsonResponse({ error: "Zorunlu alanlar eksik (Ad, Soyad, Firma Ünvanı, Vergi No, Vergi Dairesi, Firma Türü, Firma Tipi)." }, 400);
      }

      // Create auth user with auto-confirm
      console.log("Creating auth user for email:", trimmedEmail);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
      });

      if (authError) {
        console.error("Auth user creation error:", authError.message);
        // Translate common errors to Turkish
        let userMsg = authError.message;
        if (authError.message.includes("already been registered")) {
          userMsg = "Bu e-posta adresi ile zaten bir hesap bulunmaktadır.";
        } else if (authError.message.includes("invalid format")) {
          userMsg = "Geçersiz e-posta formatı.";
        } else if (authError.message.includes("password")) {
          userMsg = "Şifre gereksinimleri karşılanmıyor.";
        }
        return jsonResponse({ error: userMsg }, 400);
      }
      const userId = authData.user.id;

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        ad: (ad || "").trim(),
        soyad: (soyad || "").trim(),
        iletisim_email: (iletisim_email || trimmedEmail).trim(),
        iletisim_numarasi: iletisim_numarasi || null,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError.message);
        // Rollback: delete auth user
        await supabase.auth.admin.deleteUser(userId);
        let userMsg = profileError.message;
        if (profileError.message.includes("zaten bir üyelik")) {
          userMsg = profileError.message;
        }
        return jsonResponse({ error: userMsg }, 400);
      }

      // Create firma
      const { error: firmaError } = await supabase.from("firmalar").insert({
        user_id: userId,
        firma_turu_id,
        firma_tipi_id,
        firma_unvani: (firma_unvani || "").trim(),
        vergi_numarasi: (vergi_numarasi || "").trim(),
        vergi_dairesi: (vergi_dairesi || "").trim(),
        onay_durumu: "onaylandi",
      });

      if (firmaError) {
        console.error("Firma creation error:", firmaError.message);
        await supabase.from("profiles").delete().eq("user_id", userId);
        await supabase.auth.admin.deleteUser(userId);
        return jsonResponse({ error: firmaError.message }, 400);
      }

      // Admin tarafından eklenen firmalara paket atanmaz (Paket Yok durumu)
      // DB trigger auto_assign_free_package otomatik ücretsiz paket atar, onu silelim
      await supabase.from("kullanici_abonelikler").delete().eq("user_id", userId);

      await logActivity(supabase, payload, "create-firma", {
        target_type: "firma",
        target_label: firma_unvani,
        details: { email: trimmedEmail, ad, soyad, firma_unvani, vergi_numarasi },
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

    // ─── SET BELGE ONAYLI (bulk verify) ───
    if (action === "set-belge-onayli") {
      const payload = verifyToken(body.token);
      const { firmaId, belge_onayli } = body;
      const { error } = await supabase.from("firmalar").update({ belge_onayli: !!belge_onayli }).eq("id", firmaId);
      if (error) return jsonResponse({ error: error.message }, 500);
      await logActivity(supabase, payload, belge_onayli ? "firma-dogrulandi" : "firma-dogrulama-kaldirildi", {
        target_type: "firma", target_id: firmaId,
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

      // Batch-fetch firma & profile info instead of N+1
      const kUserIds = [...new Set((data || []).map((k: any) => k.user_id))];
      const [kFirmalarRes, kProfilesRes] = kUserIds.length > 0
        ? await Promise.all([
            supabase.from("firmalar").select("user_id, firma_unvani").in("user_id", kUserIds),
            supabase.from("profiles").select("user_id, ad, soyad, iletisim_email").in("user_id", kUserIds),
          ])
        : [{ data: [] }, { data: [] }];

      const kFirmaMap = new Map<string, string>();
      for (const f of (kFirmalarRes.data || [])) kFirmaMap.set(f.user_id, f.firma_unvani);
      const kProfileMap = new Map<string, { ad: string; soyad: string; email: string }>();
      for (const p of (kProfilesRes.data || [])) kProfileMap.set(p.user_id, { ad: p.ad, soyad: p.soyad, email: p.iletisim_email });

      const enriched = (data || []).map((k: any) => {
        const profile = kProfileMap.get(k.user_id);
        return {
          ...k,
          firma_unvani: kFirmaMap.get(k.user_id) || "—",
          kullanici_ad: profile ? `${profile.ad} ${profile.soyad}` : "—",
          kullanici_email: profile?.email || "—",
        };
      });

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

      const searchUserIds = (firmalar || []).map((f: any) => f.user_id);
      let searchProfileMap = new Map<string, { ad: string; soyad: string; email: string }>();
      if (searchUserIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, ad, soyad, iletisim_email").in("user_id", searchUserIds);
        for (const p of (profiles || [])) searchProfileMap.set(p.user_id, { ad: p.ad, soyad: p.soyad, email: p.iletisim_email });
      }

      const results = (firmalar || []).map((f: any) => {
        const profile = searchProfileMap.get(f.user_id);
        return {
          user_id: f.user_id,
          firma_unvani: f.firma_unvani,
          kullanici_ad: profile ? `${profile.ad} ${profile.soyad}` : "—",
          kullanici_email: profile?.email || "—",
        };
      });

      return jsonResponse({ users: results });
    }

    // ─── LIST UZAKLASTIRMALAR ───
    if (action === "list-uzaklastirmalar") {
      const payload = verifyToken(body.token);
      const { data, error } = await supabase.from("firma_uzaklastirmalar").select("*").order("created_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);

      // Batch-fetch firma & profile info instead of N+1
      const uzUserIds = [...new Set((data || []).map((u: any) => u.user_id))];
      const [uzFirmalarRes, uzProfilesRes] = uzUserIds.length > 0
        ? await Promise.all([
            supabase.from("firmalar").select("user_id, firma_unvani").in("user_id", uzUserIds),
            supabase.from("profiles").select("user_id, ad, soyad, iletisim_email").in("user_id", uzUserIds),
          ])
        : [{ data: [] }, { data: [] }];

      const uzFirmaMap = new Map<string, string>();
      for (const f of (uzFirmalarRes.data || [])) uzFirmaMap.set(f.user_id, f.firma_unvani);
      const uzProfileMap = new Map<string, { ad: string; soyad: string; email: string }>();
      for (const p of (uzProfilesRes.data || [])) uzProfileMap.set(p.user_id, { ad: p.ad, soyad: p.soyad, email: p.iletisim_email });

      const enriched = (data || []).map((u: any) => {
        const profile = uzProfileMap.get(u.user_id);
        return {
          ...u,
          firma_unvani: uzFirmaMap.get(u.user_id) || "—",
          kullanici_ad: profile ? `${profile.ad} ${profile.soyad}` : "—",
          kullanici_email: profile?.email || "—",
        };
      });
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

      // If deactivated, restore firma status and reactivate ihaleler/urunler
      if (aktif === false) {
        const { data: uzak } = await supabase.from("firma_uzaklastirmalar").select("user_id").eq("id", uzaklastirmaId).single();
        if (uzak) {
          await supabase.from("firmalar").update({ onay_durumu: "onaylandi" }).eq("user_id", uzak.user_id);
          // Restore ihaleler that were iptal'd and still have time remaining
          await supabase.from("ihaleler").update({ durum: "devam_ediyor" }).eq("user_id", uzak.user_id).eq("durum", "iptal").gt("bitis_tarihi", new Date().toISOString());
          // Restore products
          await supabase.from("urunler").update({ durum: "aktif" }).eq("user_id", uzak.user_id).eq("durum", "pasif");
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

      // Restore firma status and reactivate ihaleler/urunler
      if (uzak) {
        await supabase.from("firmalar").update({ onay_durumu: "onaylandi" }).eq("user_id", uzak.user_id);
        // Restore ihaleler that were iptal'd and still have time remaining
        await supabase.from("ihaleler").update({ durum: "devam_ediyor" }).eq("user_id", uzak.user_id).eq("durum", "iptal").gt("bitis_tarihi", new Date().toISOString());
        // Restore products
        await supabase.from("urunler").update({ durum: "aktif" }).eq("user_id", uzak.user_id).eq("durum", "pasif");
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

    // ─── GET URUN DETAIL (for admin viewing product pages) ───
    if (action === "get-urun-detail") {
      const payload = verifyToken(body.token);
      const { urunId } = body;
      if (!urunId) return jsonResponse({ error: "urunId gerekli" }, 400);

      const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urunId);
      const { data: urun, error: urunErr } = await supabase
        .from("urunler")
        .select("*")
        .eq(isId ? "id" : "slug", urunId)
        .single();

      if (urunErr || !urun) return jsonResponse({ error: "Ürün bulunamadı" }, 404);
      return jsonResponse({ urun });
    }

    // ─── LIST USER ACTIVITY ───
    if (action === "list-user-activity") {
      const payload = verifyToken(body.token);
      if (!payload.is_primary) return jsonResponse({ error: "Yetkisiz" }, 403);

      // Helper: fetch all rows bypassing 1000-row default limit
      async function fetchAllRows(table: string, select: string, orderCol = "created_at") {
        const PAGE_SIZE = 1000;
        let allRows: any[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase.from(table).select(select).order(orderCol, { ascending: false }).range(from, from + PAGE_SIZE - 1);
          if (error || !data || data.length === 0) break;
          allRows = allRows.concat(data);
          if (data.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return allRows;
      }

      const [
        ihalelerData,
        tekliflerData,
        urunlerData,
        sikayetlerData,
        destekData,
        firmalarData,
      ] = await Promise.all([
        fetchAllRows("ihaleler", "id, ihale_no, baslik, durum, user_id, created_at, updated_at"),
        fetchAllRows("ihale_teklifler", "id, ihale_id, teklif_veren_user_id, tutar, durum, created_at, ihaleler(ihale_no, baslik)"),
        fetchAllRows("urunler", "id, urun_no, baslik, durum, user_id, created_at"),
        fetchAllRows("sikayetler", "id, sikayet_no, tur, sebep, durum, bildiren_user_id, created_at"),
        fetchAllRows("destek_talepleri", "id, talep_no, konu, departman, durum, user_id, created_at"),
        fetchAllRows("firmalar", "id, firma_unvani, user_id, onay_durumu, created_at, slug"),
      ]);

      // Collect all unique user_ids
      const userIds = new Set<string>();
      ihalelerData.forEach(i => userIds.add(i.user_id));
      tekliflerData.forEach(t => userIds.add(t.teklif_veren_user_id));
      urunlerData.forEach(u => userIds.add(u.user_id));
      sikayetlerData.forEach(s => userIds.add(s.bildiren_user_id));
      destekData.forEach(d => userIds.add(d.user_id));
      firmalarData.forEach(f => userIds.add(f.user_id));

      // Fetch ALL profiles and firmalar in parallel (already fetched firmalar above)
      const profileMap: Record<string, { ad: string; soyad: string; firma_unvani: string }> = {};

      // firmalarData already has user_id + firma_unvani, build map from it
      const firmaNameMap = new Map<string, string>();
      for (const f of firmalarData) firmaNameMap.set(f.user_id, f.firma_unvani);

      // Fetch all profiles in one paginated call
      const PAGE_SZ = 1000;
      let allProfiles: any[] = [];
      let pfFrom = 0;
      while (true) {
        const { data: pBatch } = await supabase.from("profiles").select("user_id, ad, soyad").range(pfFrom, pfFrom + PAGE_SZ - 1);
        if (!pBatch || pBatch.length === 0) break;
        allProfiles = allProfiles.concat(pBatch);
        if (pBatch.length < PAGE_SZ) break;
        pfFrom += PAGE_SZ;
      }
      for (const p of allProfiles) {
        profileMap[p.user_id] = { ad: p.ad, soyad: p.soyad, firma_unvani: firmaNameMap.get(p.user_id) || "" };
      }
      // Also add users who have firma but no profile entry
      for (const f of firmalarData) {
        if (!profileMap[f.user_id]) {
          profileMap[f.user_id] = { ad: "", soyad: "", firma_unvani: f.firma_unvani };
        }
      }

      // Build unified activity list
      const activities: any[] = [];

      ihalelerData.forEach(i => {
        const u = profileMap[i.user_id];
        activities.push({
          id: `ihale-${i.id}`,
          type: "ihale",
          action: "ihale_olusturdu",
          user_id: i.user_id,
          user_name: u ? `${u.ad} ${u.soyad}` : "—",
          firma_unvani: u?.firma_unvani || "—",
          label: `${i.ihale_no} - ${i.baslik}`,
          details: { durum: i.durum, ihale_no: i.ihale_no },
          created_at: i.created_at,
        });
      });

      tekliflerData.forEach(t => {
        const u = profileMap[t.teklif_veren_user_id];
        const ihale = t.ihaleler as any;
        activities.push({
          id: `teklif-${t.id}`,
          type: "teklif",
          action: "teklif_verdi",
          user_id: t.teklif_veren_user_id,
          user_name: u ? `${u.ad} ${u.soyad}` : "—",
          firma_unvani: u?.firma_unvani || "—",
          label: ihale ? `${ihale.ihale_no} - ${ihale.baslik}` : t.ihale_id,
          details: { tutar: t.tutar, durum: t.durum },
          created_at: t.created_at,
        });
      });

      urunlerData.forEach(ur => {
        const u = profileMap[ur.user_id];
        activities.push({
          id: `urun-${ur.id}`,
          type: "urun",
          action: "urun_ekledi",
          user_id: ur.user_id,
          user_name: u ? `${u.ad} ${u.soyad}` : "—",
          firma_unvani: u?.firma_unvani || "—",
          label: `${ur.urun_no} - ${ur.baslik}`,
          details: { durum: ur.durum, urun_no: ur.urun_no },
          created_at: ur.created_at,
        });
      });

      sikayetlerData.forEach(sk => {
        const u = profileMap[sk.bildiren_user_id];
        activities.push({
          id: `sikayet-${sk.id}`,
          type: "sikayet",
          action: "sikayet_bildirdi",
          user_id: sk.bildiren_user_id,
          user_name: u ? `${u.ad} ${u.soyad}` : "—",
          firma_unvani: u?.firma_unvani || "—",
          label: `${sk.sikayet_no} - ${sk.sebep}`,
          details: { tur: sk.tur, durum: sk.durum, sebep: sk.sebep },
          created_at: sk.created_at,
        });
      });

      destekData.forEach(d => {
        const u = profileMap[d.user_id];
        activities.push({
          id: `destek-${d.id}`,
          type: "destek",
          action: "destek_talebi_olusturdu",
          user_id: d.user_id,
          user_name: u ? `${u.ad} ${u.soyad}` : "—",
          firma_unvani: u?.firma_unvani || "—",
          label: `${d.talep_no} - ${d.konu}`,
          details: { departman: d.departman, durum: d.durum },
          created_at: d.created_at,
        });
      });

      firmalarData.forEach(f => {
        const u = profileMap[f.user_id];
        activities.push({
          id: `firma-${f.id}`,
          type: "firma",
          action: "firma_kayit",
          user_id: f.user_id,
          user_name: u ? `${u.ad} ${u.soyad}` : "—",
          firma_unvani: f.firma_unvani,
          label: f.firma_unvani,
          details: { onay_durumu: f.onay_durumu },
          created_at: f.created_at,
        });
      });

      // Sort by date descending
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return jsonResponse({ activities });
    }

    // ─── CHATBOT: ADD BILGI ───
    if (action === "add-chatbot-bilgi") {
      const payload = verifyToken(body.token);
      const { soru, cevap, kategori } = body;
      const { error } = await supabase.from("chatbot_bilgi").insert({ soru, cevap, kategori: kategori || "Genel" });
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(supabase, payload, "chatbot_bilgi_ekledi", { target_type: "chatbot", target_label: soru });
      return jsonResponse({ success: true });
    }

    // ─── CHATBOT: UPDATE BILGI ───
    if (action === "update-chatbot-bilgi") {
      const payload = verifyToken(body.token);
      const { id, soru, cevap, kategori, aktif } = body;
      const { error } = await supabase.from("chatbot_bilgi").update({ soru, cevap, kategori, aktif, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(supabase, payload, "chatbot_bilgi_guncelledi", { target_type: "chatbot", target_id: id, target_label: soru });
      return jsonResponse({ success: true });
    }

    // ─── CHATBOT: DELETE BILGI ───
    if (action === "delete-chatbot-bilgi") {
      const payload = verifyToken(body.token);
      const { id } = body;
      const { error } = await supabase.from("chatbot_bilgi").delete().eq("id", id);
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(supabase, payload, "chatbot_bilgi_sildi", { target_type: "chatbot", target_id: id });
      return jsonResponse({ success: true });
    }

    // ─── CHATBOT: UPDATE CONFIG ───
    if (action === "update-chatbot-config") {
      const payload = verifyToken(body.token);
      const { anahtar, deger } = body;
      const { error } = await supabase.from("chatbot_config").update({ deger, updated_at: new Date().toISOString() }).eq("anahtar", anahtar);
      if (error) return jsonResponse({ error: error.message }, 400);
      await logActivity(supabase, payload, "chatbot_config_guncelledi", { target_type: "chatbot_config", target_label: anahtar });
      return jsonResponse({ success: true });
    }

    // ─── PORTFOLIO: ADD ───
    if (action === "add-portfolyo") {
      const payload = verifyToken(body.token);
      const { firmaId } = body;
      
      // Check if already assigned
      const { data: existing } = await supabase.from("admin_portfolyo").select("admin_id").eq("firma_id", firmaId).single();
      if (existing) {
        const { data: owner } = await supabase.from("admin_users").select("ad, soyad").eq("id", existing.admin_id).single();
        return jsonResponse({ error: `Bu firma zaten ${owner?.ad || ""} ${owner?.soyad || ""} portföyünde` }, 400);
      }
      
      const actingId = getActingId(payload, body);
      const { error } = await supabase.from("admin_portfolyo").insert({ admin_id: actingId, firma_id: firmaId });
      if (error) return jsonResponse({ error: error.message }, 400);
      
      const { data: firma } = await supabase.from("firmalar").select("firma_unvani").eq("id", firmaId).single();
      await logActivity(supabase, payload, "portfolyoye_ekledi", { target_type: "firma", target_id: firmaId, target_label: firma?.firma_unvani || "" });
      return jsonResponse({ success: true });
    }

    // ─── PORTFOLIO: REMOVE ───
    if (action === "remove-portfolyo") {
      const payload = verifyToken(body.token);
      const { firmaId } = body;
      
      const { data: existing } = await supabase.from("admin_portfolyo").select("admin_id, atayan_admin_id").eq("firma_id", firmaId).single();
      if (!existing) return jsonResponse({ error: "Bu firma portföyde değil" }, 400);
      const actingId = getActingId(payload, body);

      // If portfolio was assigned by Yönetim Kurulu, only Yönetim Kurulu or primary can remove
      if (existing.atayan_admin_id && existing.atayan_admin_id !== actingId) {
        if (payload.departman !== "Yönetim Kurulu" && !payload.is_primary) {
          return jsonResponse({ error: "Atanmış portföyler yalnızca Yönetim Kurulu tarafından çıkarılabilir" }, 403);
        }
      } else if (existing.admin_id !== actingId && !payload.is_primary) {
        return jsonResponse({ error: "Bu firmayı sadece portföy sahibi çıkarabilir" }, 403);
      }
      
      const { error } = await supabase.from("admin_portfolyo").delete().eq("firma_id", firmaId).eq("admin_id", existing.admin_id);
      if (error) return jsonResponse({ error: error.message }, 400);
      
      const { data: firma } = await supabase.from("firmalar").select("firma_unvani").eq("id", firmaId).single();
      await logActivity(supabase, payload, "portfolyoden_cikarildi", { target_type: "firma", target_id: firmaId, target_label: firma?.firma_unvani || "" });
      return jsonResponse({ success: true });
    }

    // ─── PORTFOLIO: ASSIGN (Yönetim Kurulu) ───
    if (action === "assign-portfolyo") {
      const payload = verifyToken(body.token);
      const { firmaId, targetAdminId } = body;
      if (!firmaId || !targetAdminId) return jsonResponse({ error: "Firma ve hedef personel zorunlu" }, 400);

      // Only Yönetim Kurulu or primary admin can assign
      if (payload.departman !== "Yönetim Kurulu" && !payload.is_primary) {
        return jsonResponse({ error: "Bu işlem için yetkiniz yok" }, 403);
      }

      // Remove existing assignment if any
      await supabase.from("admin_portfolyo").delete().eq("firma_id", firmaId);

      // Assign to target admin
      const actingId = getActingId(payload, body);
      const { error } = await supabase.from("admin_portfolyo").insert({ admin_id: targetAdminId, firma_id: firmaId, atayan_admin_id: actingId });
      if (error) return jsonResponse({ error: error.message }, 400);

      const { data: firma } = await supabase.from("firmalar").select("firma_unvani").eq("id", firmaId).single();
      const { data: targetAdmin } = await supabase.from("admin_users").select("ad, soyad").eq("id", targetAdminId).single();
      await logActivity(supabase, payload, "portfolyo_atadi", {
        target_type: "firma",
        target_id: firmaId,
        target_label: firma?.firma_unvani || "",
        details: { atanan_admin: `${targetAdmin?.ad || ""} ${targetAdmin?.soyad || ""}`, atanan_admin_id: targetAdminId },
      });
      return jsonResponse({ success: true });
    }

    // ─── PORTFOLIO: TRANSFER (Sevk Et) ───
    if (action === "transfer-portfolyo") {
      const payload = verifyToken(body.token);
      const { firmaIds, targetAdminId } = body;
      if (!firmaIds || !Array.isArray(firmaIds) || firmaIds.length === 0 || !targetAdminId) {
        return jsonResponse({ error: "Firma listesi ve hedef personel zorunlu" }, 400);
      }
      const actingId = getActingId(payload, body);

      // Check each firma belongs to the acting admin's portfolio
      const { data: existing } = await supabase.from("admin_portfolyo").select("firma_id, admin_id, atayan_admin_id").in("firma_id", firmaIds);
      const ownedFirmaIds = (existing || []).filter(e => e.admin_id === actingId).map(e => e.firma_id);
      if (ownedFirmaIds.length === 0) return jsonResponse({ error: "Sevk edilecek firma bulunamadı" }, 400);

      // Check if any are management-assigned and user is not management
      const managementAssigned = (existing || []).filter(e => e.admin_id === actingId && e.atayan_admin_id && e.atayan_admin_id !== actingId);
      if (managementAssigned.length > 0 && payload.departman !== "Yönetim Kurulu" && !payload.is_primary) {
        return jsonResponse({ error: "Yönetim tarafından atanan firmalar sevk edilemez" }, 403);
      }

      // Delete existing assignments for these firms
      await supabase.from("admin_portfolyo").delete().in("firma_id", ownedFirmaIds);

      // Insert new assignments
      const inserts = ownedFirmaIds.map(fId => ({ admin_id: targetAdminId, firma_id: fId, atayan_admin_id: null as string | null }));
      const { error } = await supabase.from("admin_portfolyo").insert(inserts);
      if (error) return jsonResponse({ error: error.message }, 400);

      const { data: targetAdmin } = await supabase.from("admin_users").select("ad, soyad").eq("id", targetAdminId).single();
      await logActivity(supabase, payload, "portfolyo_sevk_etti", {
        target_type: "admin",
        target_id: targetAdminId,
        target_label: `${targetAdmin?.ad || ""} ${targetAdmin?.soyad || ""}`,
        details: { firma_sayisi: ownedFirmaIds.length, firma_ids: ownedFirmaIds },
      });
      return jsonResponse({ success: true, count: ownedFirmaIds.length });
    }

    // ─── AKSIYONLAR: CREATE ───
    if (action === "create-aksiyon") {
      const payload = verifyToken(body.token);
      const { firmaId, baslik, aciklama, tur, tarih, yetkiliId, sonuc, sonucNeden, sonucPaketId, periyot } = body;
      console.log("[CREATE-AKSIYON] Started. sonuc:", sonuc, "sonucPaketId:", sonucPaketId, "periyot:", periyot, "odemeMail:", body.odemeMail);
      if (!firmaId || !baslik) return jsonResponse({ error: "Firma ve başlık zorunlu" }, 400);
      if (!sonuc) return jsonResponse({ error: "Aksiyon sonucu zorunlu" }, 400);
      
      const { data, error } = await supabase.from("admin_aksiyonlar").insert({
        firma_id: firmaId,
        admin_id: getActingId(payload, body),
        baslik,
        aciklama: aciklama || null,
        tur: tur || "diger",
        tarih: tarih || new Date().toISOString(),
        durum: "yapilacak",
        yetkili_id: yetkiliId || null,
        sonuc: sonuc || null,
        sonuc_neden: sonucNeden || null,
        sonuc_paket_id: sonucPaketId || null,
      }).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      
      const { data: firmaData } = await supabase.from("firmalar").select("firma_unvani, user_id, firma_iletisim_email").eq("id", firmaId).single();
      await logActivity(supabase, payload, "aksiyon_ekledi", {
        target_type: "firma",
        target_id: firmaId,
        target_label: firmaData?.firma_unvani || "",
        details: { baslik, tur, sonuc, periyot: periyot || null, sonuc_paket_id: sonucPaketId || null },
      });

      let packageAssigned = false;
      let paymentLinkSent = false;

      // Handle package assignment when "Satış Kapatıldı"
      if (sonuc === "satis_kapatildi" && sonucPaketId && firmaData?.user_id) {
        const { data: paket } = await supabase.from("paketler").select("id, slug, ad").eq("id", sonucPaketId).single();

        if (paket && (paket.slug === "ucretsiz" || paket.slug === "pro-ucretsiz")) {
          // Auto-assign free or pro-free package
          const now = new Date();
          const donemBitis = new Date(now);
          const assignedPeriyot = paket.slug === "pro-ucretsiz" ? "sinursiz" : "aylik";
          if (paket.slug === "pro-ucretsiz") {
            donemBitis.setFullYear(donemBitis.getFullYear() + 100);
          } else {
            donemBitis.setMonth(donemBitis.getMonth() + 1);
          }

          const { data: existingSub } = await supabase.from("kullanici_abonelikler")
            .select("id").eq("user_id", firmaData.user_id).single();

          if (existingSub) {
            await supabase.from("kullanici_abonelikler").update({
              paket_id: sonucPaketId,
              periyot: assignedPeriyot,
              donem_baslangic: now.toISOString(),
              donem_bitis: donemBitis.toISOString(),
              durum: "aktif",
              updated_at: now.toISOString(),
            }).eq("user_id", firmaData.user_id);
          } else {
            await supabase.from("kullanici_abonelikler").insert({
              user_id: firmaData.user_id,
              paket_id: sonucPaketId,
              periyot: assignedPeriyot,
              donem_baslangic: now.toISOString(),
              donem_bitis: donemBitis.toISOString(),
              durum: "aktif",
            });
          }
          packageAssigned = true;
          console.log(`[AKSIYON] Auto-assigned package ${paket.slug} to user ${firmaData.user_id}`);

          // Send password creation email for paid package assignments
          try {
            const { data: { user: authUser } } = await supabase.auth.admin.getUserById(firmaData.user_id);
            const userEmail = authUser?.email;
            if (userEmail) {
              const { data: profileData } = await supabase.from("profiles").select("ad, soyad").eq("user_id", firmaData.user_id).single();
              const adSoyad = profileData ? `${profileData.ad} ${profileData.soyad}` : "";

              const SITE_URL = "https://tekstilas.com";
              const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                type: "recovery",
                email: userEmail,
                options: { redirectTo: `${SITE_URL}/sifre-sifirla` },
              });

              console.log("[AKSIYON] generateLink result:", JSON.stringify({ linkError, hasProperties: !!linkData?.properties, hashed_token: linkData?.properties?.hashed_token ? "exists" : "missing", action_link: linkData?.properties?.action_link ? "exists" : "missing" }));

              let sifreLink = `${SITE_URL}/sifre-sifirla`;
              if (!linkError && linkData?.properties?.hashed_token) {
                sifreLink = `${SITE_URL}/sifre-sifirla?token_hash=${linkData.properties.hashed_token}&type=recovery`;
              } else if (!linkError && linkData?.properties?.action_link) {
                // Fallback: extract token from action_link
                try {
                  const actionUrl = new URL(linkData.properties.action_link);
                  const token = actionUrl.searchParams.get("token");
                  if (token) {
                    sifreLink = `${SITE_URL}/sifre-sifirla?token_hash=${token}&type=recovery`;
                    console.log("[AKSIYON] Used fallback token from action_link");
                  }
                } catch (e) {
                  console.error("[AKSIYON] Failed to parse action_link:", e);
                }
              }
              console.log("[AKSIYON] Final sifreLink:", sifreLink);

              const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
              if (POSTMARK_SERVER_TOKEN) {
                const emailRes = await fetch("https://api.postmarkapp.com/email/withTemplate", {
                  method: "POST",
                  headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
                  },
                  body: JSON.stringify({
                    From: "Tekstil A.Ş. <info@tekstilas.com>",
                    To: userEmail,
                    TemplateId: 43889443,
                    TemplateModel: {
                      ad_soyad: adSoyad,
                      firma_unvani: firmaData?.firma_unvani || "",
                      platform_adi: "Tekstil A.Ş.",
                      sifre_olusturma_baglantisi: sifreLink,
                      sifre_olusturma_linki: sifreLink,
                      giris_url: sifreLink,
                      giris_linki: sifreLink,
                      destek_email: "destek@tekstilas.com",
                      yil: new Date().getFullYear().toString(),
                      site_url: SITE_URL,
                    },
                  }),
                });
                const emailData = await emailRes.json();
                if (emailRes.ok) {
                  console.log(`[AKSIYON] Password creation email sent to ${userEmail}`);
                } else {
                  console.error(`[AKSIYON] Postmark error:`, JSON.stringify(emailData));
                }
              }
            }
          } catch (emailErr) {
            console.error("[AKSIYON] Password creation email error:", emailErr);
          }

        } else if (paket?.slug === "pro") {
          // Create PayTR payment link and send via email
          const { periyot, odemeMail } = body;
          console.log("[AKSIYON-PRO] PRO paket detected. periyot:", periyot, "odemeMail:", odemeMail, "body keys:", Object.keys(body));
          if (periyot && odemeMail) {
            try {
              // Get exchange rate
              const rateRes = await fetch("https://open.er-api.com/v6/latest/USD");
              const rateData = await rateRes.json();
              const usdTryRate = rateData?.rates?.TRY;
              if (!usdTryRate) throw new Error("Döviz kuru alınamadı");

              const PRO_PRICES: Record<string, number> = { aylik: 199, yillik: 1299 };
              const usdPrice = PRO_PRICES[periyot as string];
              if (!usdPrice) throw new Error("Geçersiz periyot");
              const tlPrice = usdPrice * usdTryRate;
              const kdvTutar = tlPrice * 0.20;
              const toplamTl = tlPrice + kdvTutar;
              const paymentAmountKurus = Math.round(toplamTl * 100);

              const merchantId = Deno.env.get("PAYTR_MERCHANT_ID")!;
              const merchantKey = Deno.env.get("PAYTR_MERCHANT_KEY")!;
              const merchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT")!;
              if (!merchantId || !merchantKey || !merchantSalt) throw new Error("PayTR yapılandırması eksik");

              // Get user info for PayTR
              const { data: profile } = await supabase.from("profiles")
                .select("ad, soyad, iletisim_numarasi").eq("user_id", firmaData.user_id).single();
              const { data: authUserData } = await supabase.auth.admin.getUserById(firmaData.user_id);
              const userEmail = authUserData?.user?.email || odemeMail;

              const merchantOid = `${firmaData.user_id.replace(/-/g, "")}${periyot === "yillik" ? "Y" : "A"}${Date.now()}`;
              const paymentAmount = paymentAmountKurus.toString();
              const userName = `${profile?.ad || ""} ${profile?.soyad || ""}`.trim() || "Kullanıcı";
              const userPhone = profile?.iletisim_numarasi || "05000000000";
              const userAddress = firmaData.firma_unvani || "Türkiye";
              const userIp = "127.0.0.1";

              const periyotLabelAscii = periyot === "yillik" ? "Yillik" : "Aylik";
              const periyotLabel = periyot === "yillik" ? "Yıllık" : "Aylık";
              const basketLabel = `PRO Paket (${periyotLabelAscii}) $${usdPrice} x ${usdTryRate.toFixed(2)} + %20 KDV`;
              const basketPrice = (paymentAmountKurus / 100).toFixed(2);
              const userBasket = btoa(JSON.stringify([[basketLabel, basketPrice, 1]]));

              const noInstallment = "1";
              const maxInstallment = "0";
              const currency = "TL";
              const clientOrigin = (body.clientOrigin as string) || "";
              const forceTestMode = Boolean(body.forceTestMode);
              const isPreview = forceTestMode || clientOrigin.includes("lovable.app") || clientOrigin.includes("localhost");
              const testMode = isPreview ? "1" : "0";
              const debugOn = isPreview ? "1" : "0";

              const siteUrl = isPreview && clientOrigin ? clientOrigin : "https://tekstilas.com";
              const merchantOkUrl = `${siteUrl}/paketim?odeme=basarili`;
              const merchantFailUrl = `${siteUrl}/paketim?odeme=basarisiz`;

              // HMAC-SHA256 for PayTR token
              const hashStr = merchantId + userIp + merchantOid + userEmail + paymentAmount + userBasket + noInstallment + maxInstallment + currency + testMode;
              const enc = new TextEncoder();
              const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(merchantKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
              const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(hashStr + merchantSalt));
              const paytrToken = btoa(Array.from(new Uint8Array(sig), b => String.fromCharCode(b)).join(''));

              const formData = new URLSearchParams();
              formData.append("merchant_id", merchantId);
              formData.append("user_ip", userIp);
              formData.append("merchant_oid", merchantOid);
              formData.append("email", userEmail);
              formData.append("payment_amount", paymentAmount);
              formData.append("paytr_token", paytrToken);
              formData.append("user_basket", userBasket);
              formData.append("debug_on", debugOn);
              formData.append("no_installment", noInstallment);
              formData.append("max_installment", maxInstallment);
              formData.append("user_name", userName);
              formData.append("user_address", userAddress);
              formData.append("user_phone", userPhone);
              formData.append("merchant_ok_url", merchantOkUrl);
              formData.append("merchant_fail_url", merchantFailUrl);
              formData.append("timeout_limit", "30");
              formData.append("currency", currency);
              formData.append("test_mode", testMode);
              formData.append("lang", "tr");

              console.log("[AKSIYON-PAYTR] Creating token for:", { merchantOid, userEmail, paymentAmount, periyot });

              const paytrRes = await fetch("https://www.paytr.com/odeme/api/get-token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData.toString(),
              });
              const paytrResult = await paytrRes.json();

              if (paytrResult.status !== "success") {
                throw new Error(`PayTR token alınamadı: ${paytrResult.reason || JSON.stringify(paytrResult)}`);
              }

              const iframeUrl = `https://www.paytr.com/odeme/guvenli/${paytrResult.token}`;

              // Save payment record
              await supabase.from("odeme_kayitlari").insert({
                user_id: firmaData.user_id,
                merchant_oid: merchantOid,
                periyot: periyot as string,
                tutar_kurus: paymentAmountKurus,
                durum: "bekliyor",
              });

              // Send email with payment link
              const POSTMARK_SERVER_TOKEN = Deno.env.get("POSTMARK_SERVER_TOKEN");
              if (POSTMARK_SERVER_TOKEN) {
                const toplamTlFormatted = toplamTl.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#1a1a2e;padding:30px;text-align:center;">
      <img src="https://bctoawgovyyueifnmwhq.supabase.co/storage/v1/object/public/banners/email-logo-beyaz.png" width="180" alt="Tekstil A.Ş." style="display:inline-block;" />
    </div>
    <div style="padding:30px 30px 20px;">
      <h2 style="color:#1a1a2e;margin:0 0 20px;font-size:20px;">PRO Paket Ödeme Bağlantınız</h2>
      <p style="color:#333;font-size:14px;line-height:1.6;">Sayın <strong>${userName}</strong>,</p>
      <p style="color:#333;font-size:14px;line-height:1.6;"><strong>${firmaData.firma_unvani}</strong> firmanız için <strong>${periyotLabel} PRO Paket</strong> ödeme bağlantınız hazırlanmıştır.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr style="background:#f8f9fa;">
          <td style="padding:10px 15px;color:#666;border:1px solid #eee;">Paket</td>
          <td style="padding:10px 15px;color:#333;border:1px solid #eee;font-weight:600;">PRO — ${periyotLabel}</td>
        </tr>
        <tr>
          <td style="padding:10px 15px;color:#666;border:1px solid #eee;">USD Fiyat</td>
          <td style="padding:10px 15px;color:#333;border:1px solid #eee;">$${usdPrice}</td>
        </tr>
        <tr style="background:#f8f9fa;">
          <td style="padding:10px 15px;color:#666;border:1px solid #eee;">Döviz Kuru</td>
          <td style="padding:10px 15px;color:#333;border:1px solid #eee;">1 USD = ${usdTryRate.toFixed(2)} ₺</td>
        </tr>
        <tr>
          <td style="padding:10px 15px;color:#666;border:1px solid #eee;">KDV (%20)</td>
          <td style="padding:10px 15px;color:#333;border:1px solid #eee;">${kdvTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</td>
        </tr>
        <tr style="background:#fff8e1;">
          <td style="padding:10px 15px;color:#333;border:1px solid #eee;font-weight:600;">Toplam (KDV Dahil)</td>
          <td style="padding:10px 15px;color:#1a1a2e;border:1px solid #eee;font-weight:700;font-size:16px;">${toplamTlFormatted} ₺</td>
        </tr>
      </table>
      <div style="text-align:center;margin:30px 0;">
        <a href="${iframeUrl}" style="background:#f59e0b;color:#ffffff;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">Ödemeyi Yap</a>
      </div>
      <p style="color:#999;font-size:11px;text-align:center;">Bu ödeme bağlantısı güvenli PayTR altyapısı üzerinden işlenmektedir.</p>
    </div>
    <div style="background:#f5f5f5;padding:20px 30px;text-align:center;">
      <p style="color:#999;font-size:11px;margin:0;">© ${new Date().getFullYear()} Tekstil A.Ş. — Tüm hakları saklıdır.</p>
      <p style="color:#999;font-size:11px;margin:5px 0 0;">Sorularınız için: <a href="mailto:info@tekstilas.com" style="color:#f59e0b;">info@tekstilas.com</a></p>
    </div>
  </div>
</body>
</html>`;

                await fetch("https://api.postmarkapp.com/email", {
                  method: "POST",
                  headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
                  },
                  body: JSON.stringify({
                    From: "Tekstil A.Ş. <info@tekstilas.com>",
                    To: odemeMail as string,
                    Subject: `${periyotLabel} PRO Paket Ödeme Bağlantınız — Tekstil A.Ş.`,
                    HtmlBody: htmlBody,
                  }),
                });
                console.log(`[AKSIYON-PAYTR] Payment link email sent to ${odemeMail}`);
              }

              paymentLinkSent = true;
              console.log(`[AKSIYON-PAYTR] Payment link created: ${merchantOid}`);
            } catch (payErr: any) {
              console.error("[AKSIYON-PAYTR] Error:", payErr?.message || payErr);
              // Don't fail the aksiyon creation
            }
          } else {
            console.error("[AKSIYON-PRO] Missing periyot or odemeMail, cannot create PayTR link. periyot:", periyot, "odemeMail:", odemeMail);
          }
        }
      }

      return jsonResponse({ success: true, aksiyon: data, packageAssigned, paymentLinkSent });
    }

    // ─── AKSIYONLAR: LIST (by firma or by admin) ───
    if (action === "list-aksiyonlar") {
      const payload = verifyToken(body.token);
      const { firmaId, adminId, durum } = body;
      
      let query = supabase.from("admin_aksiyonlar").select("*").order("tarih", { ascending: false });
      if (firmaId) query = query.eq("firma_id", firmaId);
      if (adminId) query = query.eq("admin_id", adminId);
      if (durum) query = query.eq("durum", durum);
      
      const { data, error } = await query;
      if (error) return jsonResponse({ error: error.message }, 400);
      
      // Enrich with firma and admin names
      const firmaIds = [...new Set((data || []).map((a: any) => a.firma_id))];
      const adminIds = [...new Set((data || []).map((a: any) => a.admin_id))];
      
      const [firmaRes, adminRes] = await Promise.all([
        firmaIds.length > 0 ? supabase.from("firmalar").select("id, firma_unvani, user_id").in("id", firmaIds) : { data: [] },
        adminIds.length > 0 ? supabase.from("admin_users").select("id, ad, soyad").in("id", adminIds) : { data: [] },
      ]);
      
      const firmaMap = new Map((firmaRes.data || []).map((f: any) => [f.id, f.firma_unvani]));
      const firmaUserMap = new Map((firmaRes.data || []).map((f: any) => [f.id, f.user_id]));
      const adminMap = new Map((adminRes.data || []).map((a: any) => [a.id, `${a.ad} ${a.soyad}`]));

      // Enrich paket names and slugs
      const paketIds = [...new Set((data || []).filter((a: any) => a.sonuc_paket_id).map((a: any) => a.sonuc_paket_id))];
      const paketRes = paketIds.length > 0 ? await supabase.from("paketler").select("id, ad, slug").in("id", paketIds) : { data: [] };
      const paketMap = new Map((paketRes.data || []).map((p: any) => [p.id, p.ad]));
      const paketSlugMap = new Map((paketRes.data || []).map((p: any) => [p.id, p.slug]));

      const userIdsForPeriyot = [...new Set((firmaRes.data || []).map((f: any) => f.user_id).filter(Boolean))];
      const [paymentRes, activityLogRes, aksiyonLogRes] = await Promise.all([
        userIdsForPeriyot.length > 0
          ? supabase.from("odeme_kayitlari").select("user_id, created_at, periyot").in("user_id", userIdsForPeriyot).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        userIdsForPeriyot.length > 0
          ? supabase.from("admin_activity_log").select("target_id, created_at, details").eq("action", "update-firma-paket").in("target_id", userIdsForPeriyot).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        firmaIds.length > 0
          ? supabase.from("admin_activity_log").select("target_id, created_at, details").eq("action", "aksiyon_ekledi").in("target_id", firmaIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      type PeriyotEntry = { created_at: string; periyot: string };
      const buildLookup = (entries: any[], keyFn: (e: any) => string | null, periyotFn: (e: any) => string | null) => {
        const map = new Map<string, PeriyotEntry[]>();
        entries.forEach((e) => {
          const key = keyFn(e);
          const p = periyotFn(e);
          if (!key || !p) return;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push({ created_at: e.created_at, periyot: p });
        });
        return map;
      };

      const paymentLookup = buildLookup(paymentRes.data || [], e => e.user_id, e => e.periyot);
      const activityLookup = buildLookup(activityLogRes.data || [], e => e.target_id, e => {
        const d = typeof e.details === "string" ? JSON.parse(e.details) : e.details || {};
        return d.periyot || null;
      });
      const aksiyonLogLookup = buildLookup(aksiyonLogRes.data || [], e => e.target_id, e => {
        const d = typeof e.details === "string" ? JSON.parse(e.details) : e.details || {};
        return d.periyot || null;
      });

      const findClosest = (entries: PeriyotEntry[] | undefined, targetDate: string): string | null => {
        if (!entries || entries.length === 0) return null;
        const targetTime = new Date(targetDate).getTime();
        let closest = entries[0];
        let minDiff = Math.abs(new Date(closest.created_at).getTime() - targetTime);
        for (const entry of entries) {
          const diff = Math.abs(new Date(entry.created_at).getTime() - targetTime);
          if (diff < minDiff) { closest = entry; minDiff = diff; }
        }
        return closest.periyot;
      };

      const enriched = (data || []).map((a: any) => {
        const userId = firmaUserMap.get(a.firma_id);
        const paketSlug = a.sonuc_paket_id ? paketSlugMap.get(a.sonuc_paket_id) || null : null;
        let periyot: string | null = null;

        if (paketSlug === "ucretsiz") periyot = "aylik";
        else if (paketSlug === "pro-ucretsiz") periyot = "sinursiz";
        else if (paketSlug === "pro" && userId) {
          // 1st: odeme_kayitlari (most reliable for PRO)
          periyot = findClosest(paymentLookup.get(userId), a.tarih);
        }
        // 2nd: aksiyon_ekledi log (stores periyot in details since recent update)
        if (!periyot) periyot = findClosest(aksiyonLogLookup.get(a.firma_id), a.tarih);
        // 3rd: update-firma-paket activity log
        if (!periyot && userId) periyot = findClosest(activityLookup.get(userId), a.tarih);

        return {
          ...a,
          firma_unvani: firmaMap.get(a.firma_id) || "—",
          admin_ad: adminMap.get(a.admin_id) || "—",
          sonuc_paket_ad: a.sonuc_paket_id ? paketMap.get(a.sonuc_paket_id) || null : null,
          periyot,
        };
      });
      
      return jsonResponse({ aksiyonlar: enriched });
    }

    // ─── AKSIYONLAR: LIST BY FIRMA (alias) ───
    if (action === "list-firma-aksiyonlar") {
      const payload = verifyToken(body.token);
      const { firmaId } = body;
      if (!firmaId) return jsonResponse({ error: "Firma ID zorunlu" }, 400);
      
      const { data, error } = await supabase.from("admin_aksiyonlar").select("*").eq("firma_id", firmaId).order("tarih", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 400);
      
      const adminIds = [...new Set((data || []).map((a: any) => a.admin_id))];
      const adminRes = adminIds.length > 0 ? await supabase.from("admin_users").select("id, ad, soyad").in("id", adminIds) : { data: [] };
      const adminMap = new Map((adminRes.data || []).map((a: any) => [a.id, `${a.ad} ${a.soyad}`]));

      const paketIds = [...new Set((data || []).filter((a: any) => a.sonuc_paket_id).map((a: any) => a.sonuc_paket_id))];
      const paketRes = paketIds.length > 0 ? await supabase.from("paketler").select("id, ad").in("id", paketIds) : { data: [] };
      const paketMap = new Map((paketRes.data || []).map((p: any) => [p.id, p.ad]));
      
      const enriched = (data || []).map((a: any) => ({ ...a, admin_ad: adminMap.get(a.admin_id) || "—", sonuc_paket_ad: a.sonuc_paket_id ? paketMap.get(a.sonuc_paket_id) || null : null }));
      return jsonResponse({ aksiyonlar: enriched });
    }

    // ─── AKSIYONLAR: UPDATE (durum, baslik, etc.) ───
    if (action === "update-aksiyon") {
      const payload = verifyToken(body.token);
      const actingId = getActingId(payload, body);
      const { aksiyonId, updates } = body;
      if (!aksiyonId) return jsonResponse({ error: "Aksiyon ID zorunlu" }, 400);

      // Permission check: non-primary can only edit own aksiyonlar
      if (!payload.is_primary) {
        const { data: existing } = await supabase.from("admin_aksiyonlar").select("admin_id").eq("id", aksiyonId).single();
        if (!existing) return jsonResponse({ error: "Aksiyon bulunamadı" }, 404);
        if (existing.admin_id !== actingId) {
          return jsonResponse({ error: "Bu aksiyonu düzenleme yetkiniz yok" }, 403);
        }
      }
      
      const allowedFields = ["baslik", "aciklama", "tur", "tarih", "durum", "sonuc", "sonuc_neden", "sonuc_paket_id", "yetkili_id"];
      const safeUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      for (const key of allowedFields) {
        if (updates[key] !== undefined) safeUpdates[key] = updates[key];
      }
      
      const { error } = await supabase.from("admin_aksiyonlar").update(safeUpdates).eq("id", aksiyonId);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    // ─── AKSIYONLAR: DELETE ───
    if (action === "delete-aksiyon") {
      const payload = verifyToken(body.token);
      const { aksiyonId } = body;
      if (!aksiyonId) return jsonResponse({ error: "Aksiyon ID zorunlu" }, 400);
      
      const { error } = await supabase.from("admin_aksiyonlar").delete().eq("id", aksiyonId);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    // ─── YETKİLİ KİŞİ: CREATE ───
    if (action === "create-yetkili") {
      const payload = verifyToken(body.token);
      const { firmaId, ad, soyad, pozisyon, email, telefon, dahili_no, il, ilce, linkedin, aciklama } = body;
      if (!firmaId || !ad || !soyad) return jsonResponse({ error: "Firma, ad ve soyad zorunlu" }, 400);
      
      const { data, error } = await supabase.from("firma_yetkililer").insert({
        firma_id: firmaId,
        admin_id: getActingId(payload, body),
        ad: ad.trim(),
        soyad: soyad.trim(),
        pozisyon: pozisyon?.trim() || null,
        email: email?.trim() || null,
        telefon: telefon?.trim() || null,
        dahili_no: dahili_no?.trim() || null,
        il: il?.trim() || null,
        ilce: ilce?.trim() || null,
        linkedin: linkedin?.trim() || null,
        aciklama: aciklama?.trim() || null,
      }).select().single();
      if (error) return jsonResponse({ error: error.message }, 400);
      
      const { data: firma } = await supabase.from("firmalar").select("firma_unvani").eq("id", firmaId).single();
      await logActivity(supabase, payload, "yetkili_ekledi", { target_type: "firma", target_id: firmaId, target_label: firma?.firma_unvani || "", details: { ad, soyad, pozisyon } });
      return jsonResponse({ success: true, yetkili: data });
    }

    // ─── YETKİLİ KİŞİ: LIST ───
    if (action === "list-yetkililer") {
      verifyToken(body.token);
      const { firmaId } = body;
      const compact = body.compact === true;
      if (!firmaId) return jsonResponse({ error: "Firma ID zorunlu" }, 400);

      const selectFields = compact ? "id, ad, soyad, pozisyon, created_at" : "*";
      const { data, error } = await supabase
        .from("firma_yetkililer")
        .select(selectFields)
        .eq("firma_id", firmaId)
        .order("created_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 400);

      if (compact) {
        return jsonResponse({ yetkililer: data || [] });
      }

      const adminIds = [...new Set((data || []).map((y: any) => y.admin_id))];
      const { data: admins } = adminIds.length > 0
        ? await supabase.from("admin_users").select("id, ad, soyad").in("id", adminIds)
        : { data: [] };
      const adminMap = new Map((admins || []).map((a: any) => [a.id, `${a.ad} ${a.soyad}`]));

      const enriched = (data || []).map((y: any) => ({ ...y, admin_ad: adminMap.get(y.admin_id) || "—" }));
      return jsonResponse({ yetkililer: enriched });
    }

    // ─── YETKİLİ KİŞİ: UPDATE ───
    if (action === "update-yetkili") {
      const payload = verifyToken(body.token);
      const { yetkiliId, updates } = body;
      if (!yetkiliId) return jsonResponse({ error: "Yetkili ID zorunlu" }, 400);
      
      const allowedFields = ["ad", "soyad", "pozisyon", "email", "telefon", "dahili_no", "il", "ilce", "linkedin", "aciklama"];
      const safeUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      for (const key of allowedFields) {
        if (updates[key] !== undefined) safeUpdates[key] = updates[key];
      }
      
      const { error } = await supabase.from("firma_yetkililer").update(safeUpdates).eq("id", yetkiliId);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    // ─── YETKİLİ KİŞİ: DELETE ───
    if (action === "delete-yetkili") {
      const payload = verifyToken(body.token);
      const { yetkiliId } = body;
      if (!yetkiliId) return jsonResponse({ error: "Yetkili ID zorunlu" }, 400);
      
      // Get yetkili info for logging
      const { data: yetkili } = await supabase.from("firma_yetkililer").select("ad, soyad, firma_id").eq("id", yetkiliId).single();
      
      const { error } = await supabase.from("firma_yetkililer").delete().eq("id", yetkiliId);
      if (error) return jsonResponse({ error: error.message }, 400);
      
      if (yetkili) {
        const { data: firma } = await supabase.from("firmalar").select("firma_unvani").eq("id", yetkili.firma_id).single();
        await logActivity(supabase, payload, "yetkili_sildi", { target_type: "firma", target_id: yetkili.firma_id, target_label: firma?.firma_unvani || "", details: { ad: yetkili.ad, soyad: yetkili.soyad } });
      }
      return jsonResponse({ success: true });
    }

    // ─── ZİYARET PLANI: EKLE ───
    if (action === "add-ziyaret-plani") {
      const payload = verifyToken(body.token);
      const { firmaId, planlanenTarih, notlar } = body;
      if (!firmaId || !planlanenTarih) return jsonResponse({ error: "Firma ve tarih zorunlu" }, 400);
      
      const { error } = await supabase.from("admin_ziyaret_planlari").insert({
        admin_id: getActingId(payload, body),
        firma_id: firmaId,
        planlanan_tarih: planlanenTarih,
        notlar: notlar || null,
      });
      if (error) return jsonResponse({ error: error.message }, 400);
      
      const { data: firma } = await supabase.from("firmalar").select("firma_unvani").eq("id", firmaId).single();
      await logActivity(supabase, payload, "ziyaret_plani_ekledi", { target_type: "firma", target_id: firmaId, target_label: firma?.firma_unvani || "" });
      return jsonResponse({ success: true });
    }

    // ─── ZİYARET PLANI: LİSTELE ───
    if (action === "list-ziyaret-planlari") {
      const payload = verifyToken(body.token);
      const { adminId, durum, baslangic, bitis, from, to } = body;
      
      let query = supabase.from("admin_ziyaret_planlari").select("*");
      // If adminId provided, filter by admin; otherwise return all (for reports)
      if (adminId) query = query.eq("admin_id", adminId);
      if (durum) query = query.eq("durum", durum);
      if (baslangic || from) query = query.gte("planlanan_tarih", baslangic || from);
      if (bitis || to) query = query.lte("planlanan_tarih", bitis || to);
      query = query.order("planlanan_tarih", { ascending: true }).order("sira", { ascending: true });
      
      const { data, error } = await query;
      if (error) return jsonResponse({ error: error.message }, 400);
      
      // Enrich with firma info
      const firmaIds = [...new Set((data || []).map((z: any) => z.firma_id))];
      const { data: firmalar } = firmaIds.length > 0
        ? await supabase.from("firmalar").select("id, firma_unvani, logo_url, slug").in("id", firmaIds)
        : { data: [] };
      const firmaMap = new Map((firmalar || []).map((f: any) => [f.id, f]));
      
      const enriched = (data || []).map((z: any) => ({
        ...z,
        firma_unvani: firmaMap.get(z.firma_id)?.firma_unvani || "—",
        firma_logo: firmaMap.get(z.firma_id)?.logo_url || null,
      }));
      return jsonResponse({ planlar: enriched });
    }

    // ─── ZİYARET PLANI: GÜNCELLE ───
    if (action === "update-ziyaret-plani") {
      const payload = verifyToken(body.token);
      const { planId, durum, notlar, planlanenTarih, iptalSebebi } = body;
      if (!planId) return jsonResponse({ error: "Plan ID zorunlu" }, 400);
      
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (durum !== undefined) updates.durum = durum;
      if (notlar !== undefined) updates.notlar = notlar;
      if (planlanenTarih !== undefined) updates.planlanan_tarih = planlanenTarih;
      if (iptalSebebi !== undefined) updates.iptal_sebebi = iptalSebebi;
      
      const { error } = await supabase.from("admin_ziyaret_planlari").update(updates).eq("id", planId);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    // ─── ZİYARET PLANI: SİL ───
    if (action === "delete-ziyaret-plani") {
      const payload = verifyToken(body.token);
      const { planId } = body;
      if (!planId) return jsonResponse({ error: "Plan ID zorunlu" }, 400);
      
      const { error } = await supabase.from("admin_ziyaret_planlari").delete().eq("id", planId);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    // ─── ZİYARET PLANI: SIRALA ───
    if (action === "reorder-ziyaret-planlari") {
      const payload = verifyToken(body.token);
      const { items } = body; // [{id, sira}]
      if (!items || !Array.isArray(items)) return jsonResponse({ error: "items zorunlu" }, 400);
      
      for (const item of items) {
        await supabase.from("admin_ziyaret_planlari").update({ sira: item.sira }).eq("id", item.id);
      }
      return jsonResponse({ success: true });
    }

    // ─── PKL: LİSTELE ───
    if (action === "list-hedefler") {
      const payload = verifyToken(body.token);
      const { adminId, durum } = body;
      
      let query = supabase.from("admin_hedefler").select("*").order("created_at", { ascending: false });
      if (adminId) query = query.eq("hedef_admin_id", adminId);
      if (durum && durum !== "tumu") query = query.eq("durum", durum);
      
      const { data: hedeflerRaw, error } = await query;
      if (error) return jsonResponse({ error: error.message }, 400);
      
      const hedefler = [];
      for (const h of (hedeflerRaw || [])) {
        const { data: adminUser } = await supabase.from("admin_users").select("ad, soyad, departman").eq("id", h.hedef_admin_id).single();
        
        // Auto-calculate gerceklesen_miktar based on hedef_turu
        let gerceklesen = 0;
        const detay = h.hedef_detay || {};

        if (h.hedef_turu === "paket_uyeligi") {
          // Count aksiyonlar with sonuc=satis_kapatildi and sonuc_paket_id in the selected paket_ids
          const paketIds = detay.paket_ids || [];
          if (paketIds.length > 0) {
            const { data: aksiyonlar } = await supabase.from("admin_aksiyonlar")
              .select("id, sonuc_paket_id")
              .eq("admin_id", h.hedef_admin_id)
              .eq("sonuc", "satis_kapatildi")
              .gte("created_at", h.baslangic_tarihi)
              .lte("created_at", h.bitis_tarihi)
              .in("sonuc_paket_id", paketIds);
            gerceklesen = (aksiyonlar || []).length;
          }
        } else if (h.hedef_turu === "ciro") {
          // Sum KDV-siz revenue from PRO package sales where payment was successful
          // Get PRO paket id
          const { data: proPaket } = await supabase.from("paketler").select("id, fiyat_aylik, fiyat_yillik").eq("slug", "pro").single();
          if (proPaket) {
            const { data: aksiyonlar } = await supabase.from("admin_aksiyonlar")
              .select("id, sonuc_paket_id, created_at")
              .eq("admin_id", h.hedef_admin_id)
              .eq("sonuc", "satis_kapatildi")
              .eq("sonuc_paket_id", proPaket.id)
              .gte("created_at", h.baslangic_tarihi)
              .lte("created_at", h.bitis_tarihi);
            // Each PRO sale contributes the KDV-siz price
            // We use the package base price (USD converted prices are in paketler table)
            const count = (aksiyonlar || []).length;
            // Use fiyat_aylik as base KDV-siz revenue per sale
            gerceklesen = count * (proPaket.fiyat_aylik || 0);
          }
        } else if (h.hedef_turu === "dis_arama") {
          // Count dis_arama_ilk + dis_arama_tekrar aksiyonlar
          const { count } = await supabase.from("admin_aksiyonlar")
            .select("*", { count: "exact", head: true })
            .eq("admin_id", h.hedef_admin_id)
            .in("tur", ["dis_arama_ilk", "dis_arama_tekrar"])
            .gte("created_at", h.baslangic_tarihi)
            .lte("created_at", h.bitis_tarihi);
          gerceklesen = count || 0;
        } else if (h.hedef_turu === "ziyaret") {
          // Count ziyaret_ilk + ziyaret_tekrar aksiyonlar
          const { count } = await supabase.from("admin_aksiyonlar")
            .select("*", { count: "exact", head: true })
            .eq("admin_id", h.hedef_admin_id)
            .in("tur", ["ziyaret_ilk", "ziyaret_tekrar"])
            .gte("created_at", h.baslangic_tarihi)
            .lte("created_at", h.bitis_tarihi);
          gerceklesen = count || 0;
        } else if (h.hedef_turu === "aksiyon") {
          // Legacy: count all aksiyonlar
          const { count } = await supabase.from("admin_aksiyonlar")
            .select("*", { count: "exact", head: true })
            .eq("admin_id", h.hedef_admin_id)
            .gte("created_at", h.baslangic_tarihi)
            .lte("created_at", h.bitis_tarihi);
          gerceklesen = count || 0;
        } else if (h.hedef_turu === "paket_satis") {
          // Legacy
          const { count } = await supabase.from("admin_aksiyonlar")
            .select("*", { count: "exact", head: true })
            .eq("admin_id", h.hedef_admin_id)
            .eq("sonuc", "satis_kapatildi")
            .gte("created_at", h.baslangic_tarihi)
            .lte("created_at", h.bitis_tarihi);
          gerceklesen = count || 0;
        } else if (h.hedef_turu === "firma_kaydi") {
          // Legacy
          const { count } = await supabase.from("admin_aksiyonlar")
            .select("*", { count: "exact", head: true })
            .eq("admin_id", h.hedef_admin_id)
            .eq("tur", "kayit")
            .gte("created_at", h.baslangic_tarihi)
            .lte("created_at", h.bitis_tarihi);
          gerceklesen = count || 0;
        }
        
        if (gerceklesen !== h.gerceklesen_miktar) {
          await supabase.from("admin_hedefler").update({ gerceklesen_miktar: gerceklesen }).eq("id", h.id);
        }
        
        // PKL: Calculate earned bonus using tiered system (kademeler)
        const pklAsim = Math.max(0, gerceklesen - h.hedef_miktar);
        const kademeler = detay.kademeler || [];
        let kazanilanPrim = 0;
        let kazanilanPrimBirimi = "tl";
        const kademeDetay: { kademe: number; miktar: number; prim: number }[] = [];

        if (kademeler.length > 0) {
          // Tiered calculation
          for (let ki = 0; ki < kademeler.length; ki++) {
            const k = kademeler[ki];
            if (gerceklesen < k.alt) {
              kademeDetay.push({ kademe: ki + 1, miktar: 0, prim: 0 });
              continue;
            }
            const effectiveEnd = Math.min(gerceklesen, k.ust);
            const unitsInTier = Math.max(0, effectiveEnd - k.alt + 1);
            let tierPrim = 0;
            if (k.birimi === "yuzde") {
              tierPrim = unitsInTier * (k.oran / 100);
              kazanilanPrimBirimi = "usd"; // percentage of dollars yields dollars
            } else if (k.birimi === "usd") {
              tierPrim = unitsInTier * k.oran;
              kazanilanPrimBirimi = "usd";
            } else {
              tierPrim = unitsInTier * k.oran;
              kazanilanPrimBirimi = "tl";
            }
            kazanilanPrim += tierPrim;
            kademeDetay.push({ kademe: ki + 1, miktar: unitsInTier, prim: tierPrim });
          }
        } else if (h.birim_basi_prim > 0) {
          // Legacy single-rate fallback
          const primBirimi = detay.prim_birimi || "tl";
          if (primBirimi === "yuzde") {
            kazanilanPrim = pklAsim * ((h.birim_basi_prim || 0) / 100);
            kazanilanPrimBirimi = "usd";
          } else {
            kazanilanPrim = pklAsim * (h.birim_basi_prim || 0);
            kazanilanPrimBirimi = primBirimi;
          }
        }

        // Round to 2 decimal places
        kazanilanPrim = Math.round(kazanilanPrim * 100) / 100;
        
        hedefler.push({
          ...h,
          gerceklesen_miktar: gerceklesen,
          hedef_admin_ad: adminUser?.ad,
          hedef_admin_soyad: adminUser?.soyad,
          hedef_admin_departman: adminUser?.departman,
          pkl_asim: pklAsim,
          kazanilan_prim: kazanilanPrim,
          kazanilan_prim_birimi: kazanilanPrimBirimi,
          kademe_detay: kademeDetay.length > 0 ? kademeDetay : undefined,
        });
      }
      
      return jsonResponse({ hedefler });
    }

    // ─── PKL: OLUŞTUR ───
    if (action === "create-hedef") {
      const payload = verifyToken(body.token);
      const { hedefAdminId, hedefTuru, baslik, aciklama, hedefMiktar, baslangicTarihi, bitisTarihi, hedefDetay } = body;
      
      if (!hedefAdminId || !baslik || !hedefMiktar || !baslangicTarihi || !bitisTarihi) {
        return jsonResponse({ error: "Zorunlu alanlar eksik" }, 400);
      }

      // Validate paket_uyeligi requires paket_ids
      if (hedefTuru === "paket_uyeligi") {
        const detay = hedefDetay || {};
        if (!detay.paket_ids || !Array.isArray(detay.paket_ids) || detay.paket_ids.length === 0) {
          return jsonResponse({ error: "Paket Üyeliği türünde en az bir paket seçilmelidir" }, 400);
        }
      }
      
      const { data: hedef, error } = await supabase.from("admin_hedefler").insert({
        atayan_admin_id: getActingId(payload, body),
        hedef_admin_id: hedefAdminId,
        hedef_turu: hedefTuru || "paket_uyeligi",
        baslik,
        aciklama: aciklama || null,
        hedef_miktar: hedefMiktar,
        baslangic_tarihi: baslangicTarihi,
        bitis_tarihi: bitisTarihi,
        birim_basi_prim: 0,
        hedef_detay: hedefDetay || {},
      }).select().single();
      
      if (error) return jsonResponse({ error: error.message }, 400);
      
      await logActivity(supabase, payload, "pkl_olusturuldu", {
        target_type: "pkl", target_id: hedef.id, target_label: baslik,
      });
      
      return jsonResponse({ success: true, hedef });
    }

    // ─── PKL: PRİM GÜNCELLE (KADEMELER) ───
    if (action === "update-pkl-prim") {
      const payload = verifyToken(body.token);
      const { hedefId, kademeler, birimBasiPrim, primBirimi } = body;
      if (!hedefId) return jsonResponse({ error: "PKL ID zorunlu" }, 400);
      
      // Get existing hedef_detay to merge
      const { data: existingHedef } = await supabase.from("admin_hedefler").select("hedef_detay").eq("id", hedefId).single();
      const existingDetay = existingHedef?.hedef_detay || {};
      
      let updatedDetay = { ...existingDetay };
      let updateData: any = {};
      
      if (kademeler && Array.isArray(kademeler) && kademeler.length > 0) {
        // New tiered system
        updatedDetay.kademeler = kademeler;
        // Clear legacy fields
        delete updatedDetay.prim_birimi;
        updateData.birim_basi_prim = 0;
      } else if (birimBasiPrim !== undefined) {
        // Legacy single-rate
        updatedDetay.prim_birimi = primBirimi || "tl";
        delete updatedDetay.kademeler;
        updateData.birim_basi_prim = birimBasiPrim;
      }
      
      updateData.hedef_detay = updatedDetay;
      
      const { error } = await supabase.from("admin_hedefler").update(updateData).eq("id", hedefId);
      if (error) return jsonResponse({ error: error.message }, 400);
      
      const kademeCount = kademeler?.length || 0;
      await logActivity(supabase, payload, "pkl_prim_guncellendi", {
        target_type: "pkl", target_id: hedefId, 
        target_label: kademeCount > 0 ? `${kademeCount} kademeli prim tanımlandı` : `Birim başı prim: ${birimBasiPrim}`,
      });
      
      return jsonResponse({ success: true });
    }

    // ─── PKL: SİL ───
    if (action === "delete-hedef") {
      const payload = verifyToken(body.token);
      const { hedefId } = body;
      if (!hedefId) return jsonResponse({ error: "PKL ID zorunlu" }, 400);
      
      const { error } = await supabase.from("admin_hedefler").delete().eq("id", hedefId);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    // ─── ADMIN USERS LİSTELE ───
    if (action === "list-admin-users") {
      const payload = verifyToken(body.token);
      const { data, error } = await supabase.from("admin_users").select("id, ad, soyad, departman, pozisyon").order("ad");
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ users: data });
    }

    // ─── KONUM GÜNCELLE ───
    if (action === "update-konum") {
      const payload = verifyToken(body.token);
      const { lat, lng } = body;
      if (typeof lat !== "number" || typeof lng !== "number") {
        return jsonResponse({ error: "lat ve lng zorunludur" }, 400);
      }
      const { error } = await supabase.from("admin_konumlar").upsert({
        admin_id: payload.id,
        lat,
        lng,
        updated_at: new Date().toISOString(),
      }, { onConflict: "admin_id" });
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ success: true });
    }

    // ─── KONUMLARI LİSTELE ───
    if (action === "list-konumlar") {
      const payload = verifyToken(body.token);
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("admin_konumlar")
        .select("admin_id, lat, lng, updated_at")
        .gte("updated_at", fiveMinAgo);
      if (error) return jsonResponse({ error: error.message }, 400);

      // Get admin names
      const adminIds = (data || []).map((d: any) => d.admin_id);
      let admins: any[] = [];
      if (adminIds.length > 0) {
        const { data: aData } = await supabase
          .from("admin_users")
          .select("id, ad, soyad, pozisyon")
          .in("id", adminIds);
        admins = aData || [];
      }

      const result = (data || []).map((k: any) => {
        const admin = admins.find((a: any) => a.id === k.admin_id);
        return {
          ...k,
          admin_ad: admin?.ad || "",
          admin_soyad: admin?.soyad || "",
          admin_pozisyon: admin?.pozisyon || "",
        };
      });

      return jsonResponse({ konumlar: result });
    }

    // ─── GET FIRMA EMAIL ───
    if (action === "get-firma-email") {
      const payload = verifyToken(body.token);
      const { firmaId } = body;
      if (!firmaId) return jsonResponse({ error: "Firma ID zorunlu" }, 400);

      const { data: firma } = await supabase.from("firmalar")
        .select("firma_iletisim_email, user_id")
        .eq("id", firmaId).single();

      let email = firma?.firma_iletisim_email || "";
      if (!email && firma?.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(firma.user_id);
        email = authUser?.user?.email || "";
      }
      if (!email && firma?.user_id) {
        const { data: profile } = await supabase.from("profiles")
          .select("iletisim_email").eq("user_id", firma.user_id).single();
        email = profile?.iletisim_email || "";
      }

      return jsonResponse({ email });
    }

    // ─── AJANDA: LIST NOTES ───
    if (action === "list-ajanda") {
      const payload = verifyToken(body.token);
      const adminId = body.actingAdminId || payload.id;
      const { baslangic, bitis } = body;
      let q = supabase.from("admin_ajanda").select("*").eq("admin_id", adminId).order("tarih", { ascending: true });
      if (baslangic) q = q.gte("tarih", baslangic);
      if (bitis) q = q.lte("tarih", bitis);
      const { data, error } = await q;
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ notes: data });
    }

    // ─── AJANDA: CREATE NOTE ───
    if (action === "create-ajanda") {
      const payload = verifyToken(body.token);
      const adminId = body.actingAdminId || payload.id;
      const { tarih, icerik, renk } = body;
      if (!tarih || !icerik) return jsonResponse({ error: "Tarih ve içerik zorunlu" }, 400);
      const { data, error } = await supabase.from("admin_ajanda").insert({ admin_id: adminId, tarih, icerik, renk: renk || "blue" }).select().single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ note: data });
    }

    // ─── AJANDA: UPDATE NOTE ───
    if (action === "update-ajanda") {
      const payload = verifyToken(body.token);
      const adminId = body.actingAdminId || payload.id;
      const { noteId, updates } = body;
      if (!noteId) return jsonResponse({ error: "Not ID zorunlu" }, 400);
      const { data, error } = await supabase.from("admin_ajanda").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", noteId).eq("admin_id", adminId).select().single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ note: data });
    }

    // ─── AJANDA: DELETE NOTE ───
    if (action === "delete-ajanda") {
      const payload = verifyToken(body.token);
      const adminId = body.actingAdminId || payload.id;
      const { noteId } = body;
      if (!noteId) return jsonResponse({ error: "Not ID zorunlu" }, 400);
      const { error } = await supabase.from("admin_ajanda").delete().eq("id", noteId).eq("admin_id", adminId);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ success: true });
    }

    // ─── LIST SYSTEM LOGS ───
    if (action === "list-system-logs") {
      const payload = verifyToken(body.token);

      let query = supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (body.kaynak) query = query.eq("kaynak", body.kaynak);
      if (body.seviye) query = query.eq("seviye", body.seviye);
      if (body.basarili !== undefined && body.basarili !== null) query = query.eq("basarili", body.basarili);
      if (body.from) query = query.gte("created_at", body.from);
      if (body.to) query = query.lte("created_at", body.to);

      query = query.limit(1000);

      const { data, error } = await query;
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ logs: data || [] });
    }

    return jsonResponse({ error: "Geçersiz istek" }, 400);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
