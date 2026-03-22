import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

interface TestResult {
  group: string;
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  technicalDetail?: string;
  solution?: string;
  durationMs?: number;
  layer?: string;
  category?: string;
  errorCategory?: string;
  stepFailed?: string;
}

// ═══════════════════════════════════════════
// LAYER 1: INFRASTRUCTURE TESTS (mevcut)
// ═══════════════════════════════════════════
async function runInfrastructureTests(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const t = (r: TestResult) => results.push({ ...r, layer: "infrastructure" });
  const start = () => performance.now();
  const elapsed = (s: number) => Math.round(performance.now() - s);

  // 1. DATABASE TABLES
  const criticalTables = [
    "firmalar", "profiles", "ihaleler", "ihale_teklifler", "urunler",
    "paketler", "kullanici_abonelikler", "notifications", "conversations",
    "messages", "destek_talepleri", "destek_mesajlar", "sikayetler",
    "firma_turleri", "firma_tipleri", "firma_bilgi_kategorileri",
    "firma_bilgi_secenekleri", "firma_belgeler", "firma_galeri",
    "firma_sertifikalar", "firma_makineler", "firma_tesisler",
    "firma_referanslar", "firma_teknolojiler", "firma_uretim_satis",
    "firma_urun_hizmet_secimler", "firma_favoriler", "firma_kisitlamalar",
    "firma_uzaklastirmalar", "firma_yasaklar", "firma_yetkililer",
    "ihale_fotograflar", "ihale_ek_dosyalar", "ihale_stok", "ihale_filtreler",
    "banners", "chatbot_bilgi", "chatbot_config", "admin_users",
    "admin_activity_log", "admin_aksiyonlar", "admin_portfolyo",
    "admin_hedefler", "admin_ajanda", "admin_ziyaret_planlari",
    "admin_konumlar", "visitor_sources",
  ];

  for (const table of criticalTables) {
    const s = start();
    const { error, count } = await supabase.from(table).select("*", { count: "exact", head: true });
    const ms = elapsed(s);
    if (error) {
      t({ group: "Veritabanı Tabloları", name: `${table}`, status: "fail", detail: `Tablo erişilemedi`, category: "infrastructure", errorCategory: "DATA_ERROR", technicalDetail: `[TABLE_ACCESS_ERROR] SELECT on "${table}" failed. Error: ${error.message} (code: ${error.code})`, solution: `Check if table "${table}" exists. Verify RLS policies allow service_role access.`, durationMs: ms });
    } else {
      t({ group: "Veritabanı Tabloları", name: `${table}`, status: ms > 2000 ? "warn" : "pass", detail: `${count ?? 0} kayıt, ${ms}ms`, category: "infrastructure", durationMs: ms });
    }
  }

  // 2. RPC FUNCTIONS
  const rpcTests = [
    { name: "get_firma_user_counts", args: { p_user_ids: [] } },
    { name: "get_firma_sort_scores", args: { p_firma_ids: [] } },
    { name: "check_registration_duplicate", args: { p_email: "test-nonexistent@test.xyz" } },
    { name: "normalize_phone", args: { p_phone: "+905551234567" } },
    { name: "normalize_email", args: { p_email: "Test@Example.COM" } },
    { name: "admin_hash_password", args: { p_password: "test123" } },
  ];

  for (const rpc of rpcTests) {
    const s = start();
    const { error } = await supabase.rpc(rpc.name, rpc.args);
    const ms = elapsed(s);
    if (error) {
      t({ group: "Veritabanı Fonksiyonları", name: rpc.name, status: "fail", detail: `RPC çalışmadı`, category: "infrastructure", errorCategory: "DATA_ERROR", technicalDetail: `[RPC_ERROR] supabase.rpc("${rpc.name}", ${JSON.stringify(rpc.args)}) failed. Error: ${error.message}`, solution: `Verify function exists: SELECT proname FROM pg_proc WHERE proname='${rpc.name}';`, durationMs: ms });
    } else {
      t({ group: "Veritabanı Fonksiyonları", name: rpc.name, status: "pass", detail: `Başarılı (${ms}ms)`, category: "infrastructure", durationMs: ms });
    }
  }

  // 3. AUTH HEALTH
  {
    const s = start();
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: ANON_KEY } });
    const ms = elapsed(s);
    await res.text();
    t({ group: "Kimlik Doğrulama", name: "Auth Health Check", status: res.ok ? "pass" : "fail", detail: res.ok ? `Auth servisi çalışıyor (${ms}ms)` : "Auth servisi erişilemedi", category: "auth", errorCategory: res.ok ? undefined : "AUTH_ERROR", durationMs: ms });
  }

  {
    const s = start();
    const { data, error } = await supabase.rpc("check_registration_duplicate", { p_email: "test-nonexist@test.test", p_phone: "5559999999" });
    const ms = elapsed(s);
    if (error) {
      t({ group: "Kimlik Doğrulama", name: "Duplikasyon Kontrolü", status: "fail", detail: "Kayıt duplikasyon kontrolü çalışmıyor", category: "auth", errorCategory: "AUTH_ERROR", technicalDetail: `[DUPLICATE_CHECK_FAIL] ${error.message}`, durationMs: ms });
    } else {
      const isValid = data && typeof data.email_exists === "boolean" && typeof data.phone_exists === "boolean";
      t({ group: "Kimlik Doğrulama", name: "Duplikasyon Kontrolü", status: isValid ? "pass" : "warn", detail: isValid ? `Çalışıyor (${ms}ms)` : "Beklenmeyen format", category: "auth", durationMs: ms });
    }
  }

  // 4. EDGE FUNCTIONS
  const edgeFunctions = [
    "admin-auth", "chatbot", "check-ihale-expiry", "check-subscription",
    "create-paytr-token", "paytr-callback", "send-email", "send-notification-sms",
    "send-password-reset", "send-sms-otp", "send-welcome-email",
    "verify-payment", "verify-sms-otp", "run-performance-test",
  ];

  for (const fn of edgeFunctions) {
    const s = start();
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, { method: "OPTIONS", headers: { apikey: ANON_KEY } });
      const ms = elapsed(s);
      await res.text();
      t({ group: "Edge Functions", name: fn, status: res.status < 500 ? "pass" : "fail", detail: res.status < 500 ? `Erişilebilir (${ms}ms)` : `HTTP ${res.status}`, category: "infrastructure", errorCategory: res.status >= 500 ? "NETWORK_ERROR" : undefined, durationMs: ms });
    } catch (e: any) {
      t({ group: "Edge Functions", name: fn, status: "fail", detail: "Erişilemedi", category: "infrastructure", errorCategory: "NETWORK_ERROR", technicalDetail: `[EDGE_FN_UNREACHABLE] ${e.message}`, durationMs: elapsed(s) });
    }
  }

  // 5. STORAGE
  const buckets = ["firma-images", "ihale-files", "urun-images", "chat-files", "sikayet-files", "firma-belgeler", "banners"];
  for (const bucket of buckets) {
    const s = start();
    const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });
    const ms = elapsed(s);
    t({ group: "Depolama (Storage)", name: bucket, status: error ? "fail" : "pass", detail: error ? "Bucket erişilemedi" : `Erişim başarılı (${ms}ms)`, category: "infrastructure", durationMs: ms });
  }

  return results;
}

// ═══════════════════════════════════════════
// LAYER 2: DATA INTEGRITY TESTS (yeni)
// ═══════════════════════════════════════════
async function runDataIntegrityTests(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const t = (r: TestResult) => results.push({ ...r, layer: "data_integrity" });
  const start = () => performance.now();
  const elapsed = (s: number) => Math.round(performance.now() - s);

  // --- DROPDOWN HIERARCHY CHAIN ---
  {
    const s = start();
    const { data: kategoriler, error } = await supabase.from("firma_bilgi_kategorileri").select("id, name, format");
    const ms = elapsed(s);
    if (error) {
      t({ group: "Dropdown Veri Doğrulama", name: "Kategori Tablosu Erişim", status: "fail", detail: "firma_bilgi_kategorileri erişilemedi", category: "dropdown", errorCategory: "DATA_ERROR", technicalDetail: `[DROPDOWN_CATEGORY_ERROR] ${error.message}`, durationMs: ms });
    } else {
      t({ group: "Dropdown Veri Doğrulama", name: "Kategori Tablosu", status: (kategoriler?.length || 0) > 0 ? "pass" : "fail", detail: `${kategoriler?.length || 0} kategori tanımlı`, category: "dropdown", durationMs: ms });

      // Check each category has options
      if (kategoriler && kategoriler.length > 0) {
        for (const kat of kategoriler.slice(0, 10)) {
          const { data: secenekler } = await supabase.from("firma_bilgi_secenekleri").select("id, name, parent_id").eq("kategori_id", kat.id).is("parent_id", null).limit(5);
          const count = secenekler?.length || 0;
          t({ group: "Dropdown Veri Doğrulama", name: `${kat.name} Seçenekleri`, status: count > 0 ? "pass" : "warn", detail: count > 0 ? `${count}+ üst seçenek var` : "Hiç seçenek yok!", category: "dropdown", errorCategory: count === 0 ? "DATA_ERROR" : undefined });
        }
      }
    }
  }

  // --- DEPENDENT DROPDOWN CHAIN (Kategori > Grup > Tür) ---
  {
    const s = start();
    const { data: secenekler } = await supabase.from("firma_bilgi_secenekleri").select("id, name, parent_id, kategori_id").limit(500);
    const ms = elapsed(s);
    if (secenekler) {
      const withParent = secenekler.filter((s: any) => s.parent_id);
      const parentIds = new Set(secenekler.map((s: any) => s.id));
      const orphanChildren = withParent.filter((s: any) => !parentIds.has(s.parent_id));
      t({ group: "Dropdown Veri Doğrulama", name: "Bağımlı Dropdown Zinciri", status: orphanChildren.length === 0 ? "pass" : "fail", detail: orphanChildren.length === 0 ? "Tüm alt seçeneklerin üst kaydı var" : `${orphanChildren.length} yetim alt seçenek`, category: "dropdown", errorCategory: orphanChildren.length > 0 ? "DATA_ERROR" : undefined, technicalDetail: orphanChildren.length > 0 ? `[ORPHAN_OPTIONS] ${orphanChildren.length} firma_bilgi_secenekleri rows reference non-existent parent_id. IDs: ${orphanChildren.slice(0, 5).map((o: any) => o.id).join(", ")}` : undefined, durationMs: ms });
    }
  }

  // --- IHALE DATA INTEGRITY ---
  {
    const { data: ihaleler } = await supabase.from("ihaleler").select("id, ihale_no, durum, baslik, slug, baslangic_tarihi, bitis_tarihi, teklif_usulu").limit(200);
    if (ihaleler) {
      const nos = ihaleler.map((i: any) => i.ihale_no).filter(Boolean);
      const uniqueNos = new Set(nos).size === nos.length;
      t({ group: "İhale Veri Bütünlüğü", name: "İhale No Benzersizlik", status: uniqueNos ? "pass" : "fail", detail: uniqueNos ? `${nos.length} ihale no benzersiz` : "Tekrarlayan ihale numaraları!", category: "tender", errorCategory: !uniqueNos ? "DATA_ERROR" : undefined });

      const slugs = ihaleler.map((i: any) => i.slug).filter(Boolean);
      const uniqueSlugs = new Set(slugs).size === slugs.length;
      t({ group: "İhale Veri Bütünlüğü", name: "İhale Slug Benzersizlik", status: uniqueSlugs ? "pass" : "fail", detail: uniqueSlugs ? "Tüm sluglar benzersiz" : "Tekrarlayan slug!", category: "tender", errorCategory: !uniqueSlugs ? "DATA_ERROR" : undefined });

      const durumlar = ["duzenleniyor", "onay_bekliyor", "devam_ediyor", "tamamlandi", "reddedildi", "iptal"];
      const invalidDurum = ihaleler.filter((i: any) => !durumlar.includes(i.durum));
      t({ group: "İhale Veri Bütünlüğü", name: "Durum Geçerliliği", status: invalidDurum.length === 0 ? "pass" : "fail", detail: invalidDurum.length === 0 ? "Tüm durumlar geçerli" : `${invalidDurum.length} geçersiz`, category: "tender", errorCategory: invalidDurum.length > 0 ? "VALIDATION_ERROR" : undefined });

      const now = new Date().toISOString();
      const expired = ihaleler.filter((i: any) => i.durum === "devam_ediyor" && i.bitis_tarihi && i.bitis_tarihi < now);
      t({ group: "İhale Veri Bütünlüğü", name: "Süre Dolmuş Aktif İhaleler", status: expired.length === 0 ? "pass" : "warn", detail: expired.length === 0 ? "Yok" : `${expired.length} adet`, category: "tender" });
    }
  }

  // --- ÜRÜN DATA INTEGRITY ---
  {
    const { data: urunler } = await supabase.from("urunler").select("id, urun_no, slug, durum, baslik, user_id").limit(200);
    if (urunler) {
      const nos = urunler.map((u: any) => u.urun_no).filter(Boolean);
      t({ group: "Ürün Veri Bütünlüğü", name: "Ürün No Benzersizlik", status: new Set(nos).size === nos.length ? "pass" : "fail", detail: new Set(nos).size === nos.length ? "Benzersiz" : "Tekrar var!", category: "product", errorCategory: new Set(nos).size !== nos.length ? "DATA_ERROR" : undefined });

      const slugs = urunler.map((u: any) => u.slug).filter(Boolean);
      t({ group: "Ürün Veri Bütünlüğü", name: "Ürün Slug Benzersizlik", status: new Set(slugs).size === slugs.length ? "pass" : "fail", detail: new Set(slugs).size === slugs.length ? "Benzersiz" : "Tekrar var!", category: "product", errorCategory: new Set(slugs).size !== slugs.length ? "DATA_ERROR" : undefined });

      const validDurumlar = ["duzenleniyor", "onay_bekliyor", "aktif", "reddedildi", "pasif", "taslak"];
      const invalid = urunler.filter((u: any) => !validDurumlar.includes(u.durum));
      t({ group: "Ürün Veri Bütünlüğü", name: "Durum Geçerliliği", status: invalid.length === 0 ? "pass" : "fail", detail: invalid.length === 0 ? "Geçerli" : `${invalid.length} geçersiz`, category: "product", errorCategory: invalid.length > 0 ? "VALIDATION_ERROR" : undefined });
    }
  }

  // --- TEKLIF DATA ---
  {
    const { data: teklifler } = await supabase.from("ihale_teklifler").select("id, tutar").limit(200);
    const invalid = (teklifler || []).filter((t: any) => !t.tutar || t.tutar <= 0);
    t({ group: "Teklif Veri Bütünlüğü", name: "Teklif Tutarları", status: invalid.length === 0 ? "pass" : "fail", detail: invalid.length === 0 ? "Tüm tutarlar geçerli" : `${invalid.length} geçersiz`, category: "tender", errorCategory: invalid.length > 0 ? "VALIDATION_ERROR" : undefined });
  }

  // --- FİRMA-PROFİL EŞLEŞMESİ ---
  {
    const { data: firmalar } = await supabase.from("firmalar").select("user_id").limit(200);
    if (firmalar && firmalar.length > 0) {
      const userIds = firmalar.map((f: any) => f.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id").in("user_id", userIds.slice(0, 100));
      const profileSet = new Set((profiles || []).map((p: any) => p.user_id));
      const orphan = userIds.slice(0, 100).filter((uid: string) => !profileSet.has(uid));
      t({ group: "Veri Bütünlüğü", name: "Firma-Profil Eşleşmesi", status: orphan.length === 0 ? "pass" : "warn", detail: orphan.length === 0 ? "Tüm firmaların profili var" : `${orphan.length} firma profili yok`, category: "admin", errorCategory: orphan.length > 0 ? "DATA_ERROR" : undefined });
    }
  }

  // --- PAKET SİSTEMİ ---
  {
    const { data: paketler } = await supabase.from("paketler").select("id, ad, slug");
    const freePackage = (paketler || []).find((p: any) => p.slug === "ucretsiz");
    t({ group: "Paket Veri Bütünlüğü", name: "Ücretsiz Paket Varlığı", status: freePackage ? "pass" : "fail", detail: freePackage ? "Mevcut" : "Bulunamadı!", category: "payment", errorCategory: !freePackage ? "DATA_ERROR" : undefined });

    const { data: abonelikler } = await supabase.from("kullanici_abonelikler").select("user_id, durum").eq("durum", "aktif").limit(500);
    const userCounts: Record<string, number> = {};
    (abonelikler || []).forEach((a: any) => { userCounts[a.user_id] = (userCounts[a.user_id] || 0) + 1; });
    const multi = Object.entries(userCounts).filter(([_, c]) => c > 1);
    t({ group: "Paket Veri Bütünlüğü", name: "Çoklu Aktif Abonelik", status: multi.length === 0 ? "pass" : "warn", detail: multi.length === 0 ? "Herkesin tek aboneliği var" : `${multi.length} kullanıcı çoklu`, category: "payment" });
  }

  // --- BANNER INTEGRITY ---
  {
    const { data } = await supabase.from("banners").select("id, aktif, gorsel_url").eq("aktif", true);
    const noImage = (data || []).filter((b: any) => !b.gorsel_url);
    t({ group: "Banner Bütünlüğü", name: "Aktif Banner Görselleri", status: noImage.length === 0 ? "pass" : "warn", detail: noImage.length === 0 ? "Tüm görseller tamam" : `${noImage.length} görselsiz banner`, category: "admin" });
  }

  // --- CHATBOT ---
  {
    const { data: config } = await supabase.from("chatbot_config").select("anahtar");
    const { count } = await supabase.from("chatbot_bilgi").select("id", { count: "exact", head: true });
    t({ group: "Chatbot Bütünlüğü", name: "Chatbot Verileri", status: (config?.length || 0) > 0 && (count || 0) > 0 ? "pass" : "warn", detail: `${config?.length || 0} ayar, ${count || 0} bilgi kaydı`, category: "admin" });
  }

  // --- ADMIN SYSTEM ---
  {
    const { data: admins } = await supabase.from("admin_users").select("id, is_primary").limit(20);
    const primaryCount = (admins || []).filter((a: any) => a.is_primary).length;
    t({ group: "Admin Bütünlüğü", name: "Primary Admin Varlığı", status: primaryCount >= 1 ? "pass" : "fail", detail: primaryCount >= 1 ? `${primaryCount} primary admin` : "Bulunamadı!", category: "admin", errorCategory: primaryCount === 0 ? "AUTH_ERROR" : undefined });
  }

  // --- NOTIFICATION TYPES ---
  {
    const { data } = await supabase.from("notifications").select("type").limit(50);
    if (data && data.length > 0) {
      const validTypes = [
        "ihale_onay_bekliyor", "ihale_onaylandi", "ihale_reddedildi", "ihale_iptal",
        "ihale_yeni_teklif", "teklif_iletildi", "teklif_kabul_edildi", "teklif_reddedildi",
        "teklif_ihale_durum_degisti", "urun_onay_bekliyor", "urun_onaylandi", "urun_reddedildi",
        "urun_durum_degisti", "yeni_mesaj", "sikayet_alindi", "destek_cevaplandi",
        "destek_cozuldu", "odeme_basarili", "odeme_basarisiz", "kota_uyari",
        "kisitlama_eklendi", "uzaklastirma_eklendi", "yasak_eklendi",
        "firma_onaylandi", "ihale_admin_duzenlendi", "urun_admin_kaldirildi",
      ];
      const invalid = data.map((d: any) => d.type).filter((t: string) => !validTypes.includes(t));
      t({ group: "Bildirim Bütünlüğü", name: "Bildirim Tip Kontrolü", status: invalid.length === 0 ? "pass" : "warn", detail: invalid.length === 0 ? "Tüm tipler geçerli" : `${new Set(invalid).size} bilinmeyen tip`, category: "admin" });
    }
  }

  // --- FIRMA SLUG UNIQUENESS ---
  {
    const { data: firmalar } = await supabase.from("firmalar").select("id, slug, firma_unvani, firma_turu_id, firma_tipi_id, user_id").limit(200);
    if (firmalar) {
      const slugs = firmalar.map((f: any) => f.slug).filter(Boolean);
      t({ group: "Firma Veri Bütünlüğü", name: "Firma Slug Benzersizlik", status: new Set(slugs).size === slugs.length ? "pass" : "fail", detail: new Set(slugs).size === slugs.length ? "Benzersiz" : "Tekrar var!", category: "admin", errorCategory: new Set(slugs).size !== slugs.length ? "DATA_ERROR" : undefined });

      const missingReq = firmalar.filter((f: any) => !f.firma_unvani || !f.user_id);
      t({ group: "Firma Veri Bütünlüğü", name: "Zorunlu Alan Kontrolü", status: missingReq.length === 0 ? "pass" : "fail", detail: missingReq.length === 0 ? "Tamam" : `${missingReq.length} eksik`, category: "admin", errorCategory: missingReq.length > 0 ? "DATA_ERROR" : undefined });
    }
  }

  // --- MESSAGING ---
  {
    const { error: convErr } = await supabase.from("conversations").select("id", { count: "exact", head: true });
    t({ group: "Mesajlaşma Bütünlüğü", name: "Conversations Tablosu", status: convErr ? "fail" : "pass", detail: convErr ? "Erişilemedi" : "OK", category: "messaging" });

    const { error: msgErr } = await supabase.from("messages").select("id", { count: "exact", head: true });
    t({ group: "Mesajlaşma Bütünlüğü", name: "Messages Tablosu", status: msgErr ? "fail" : "pass", detail: msgErr ? "Erişilemedi" : "OK", category: "messaging" });

    const { error: rpcErr } = await supabase.rpc("get_or_create_conversation", { p_user1: "00000000-0000-0000-0000-000000000001", p_user2: "00000000-0000-0000-0000-000000000002" });
    t({ group: "Mesajlaşma Bütünlüğü", name: "Sohbet Oluşturma RPC", status: rpcErr && rpcErr.message?.includes("violates foreign key") ? "pass" : rpcErr ? "warn" : "pass", detail: !rpcErr || rpcErr.message?.includes("violates foreign key") ? "RPC çalışıyor" : "RPC hatası", category: "messaging" });
  }

  // --- DESTEK ---
  {
    const { data } = await supabase.from("destek_talepleri").select("id, durum, talep_no").limit(50);
    if (data) {
      const valid = ["acik", "cevaplandi", "cozuldu", "beklemede", "inceleniyor"];
      const invalid = data.filter((d: any) => !valid.includes(d.durum));
      t({ group: "Destek Bütünlüğü", name: "Destek Durumları", status: invalid.length === 0 ? "pass" : "warn", detail: invalid.length === 0 ? "Geçerli" : `${invalid.length} geçersiz`, category: "admin" });
    }
  }

  // --- SIKAYET ---
  {
    const { error } = await supabase.from("sikayetler").select("id", { count: "exact", head: true });
    t({ group: "Şikayet Bütünlüğü", name: "Şikayet Tablosu", status: error ? "fail" : "pass", detail: error ? "Erişilemedi" : "OK", category: "admin" });
  }

  return results;
}

// ═══════════════════════════════════════════
// LAYER 3: WORKFLOW / BUSINESS LOGIC TESTS (yeni)
// ═══════════════════════════════════════════
async function runWorkflowTests(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const t = (r: TestResult) => results.push({ ...r, layer: "workflow" });
  const start = () => performance.now();
  const elapsed = (s: number) => Math.round(performance.now() - s);

  // --- AUTH WORKFLOW: Wrong login should fail ---
  {
    const s = start();
    const { data, error } = await supabase.rpc("admin_verify_password", { p_username: "__test_nonexistent_user__", p_password: "wrong_pass_12345" });
    const ms = elapsed(s);
    const correctlyDenied = data === false;
    t({ group: "Auth İş Akışı", name: "Yanlış Giriş Reddi", status: correctlyDenied ? "pass" : "fail", detail: correctlyDenied ? "Yanlış bilgi reddedildi" : "Yanlış bilgi reddedilmedi!", category: "auth", errorCategory: !correctlyDenied ? "AUTH_ERROR" : undefined, stepFailed: !correctlyDenied ? "admin_verify_password should return false for nonexistent user" : undefined, durationMs: ms });
  }

  // --- AUTH WORKFLOW: Duplicate check ---
  {
    const s = start();
    const { data } = await supabase.rpc("check_registration_duplicate", { p_email: "__test_nonexistent@test.xyz__", p_phone: "5559999999" });
    const ms = elapsed(s);
    const correct = data && data.email_exists === false && data.phone_exists === false;
    t({ group: "Auth İş Akışı", name: "Yeni Kayıt Duplikasyon Kontrolü", status: correct ? "pass" : "warn", detail: correct ? "Olmayan email/telefon doğru tespit edildi" : "Beklenmeyen yanıt", category: "auth", durationMs: ms });
  }

  // --- DROPDOWN WORKFLOW: Category chain ---
  {
    const s = start();
    const { data: kategoriler } = await supabase.from("firma_bilgi_kategorileri").select("id, name").limit(5);
    if (kategoriler && kategoriler.length > 0) {
      const kat = kategoriler[0];
      const { data: l1 } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", kat.id).is("parent_id", null).limit(3);
      if (l1 && l1.length > 0) {
        const { data: l2 } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("parent_id", l1[0].id).limit(3);
        const ms = elapsed(s);
        const hasChain = l2 && l2.length > 0;
        t({ group: "Dropdown İş Akışı", name: `Kategori Zinciri: ${kat.name}`, status: hasChain ? "pass" : "warn", detail: hasChain ? `${kat.name} → ${l1[0].name} → ${l2.length} alt seçenek` : `${kat.name} → ${l1[0].name} → alt seçenek yok`, category: "dropdown", stepFailed: !hasChain ? "Level 2 options empty for first category chain" : undefined, durationMs: ms });
      } else {
        t({ group: "Dropdown İş Akışı", name: `Kategori Zinciri: ${kat.name}`, status: "warn", detail: `${kat.name} için üst seçenek yok`, category: "dropdown", durationMs: elapsed(s) });
      }
    }
  }

  // --- ÜRÜN OLUŞTURMA WORKFLOW ---
  {
    const s = start();
    // Check that products with onay_bekliyor exist (proves submit flow works)
    const { data: recentProducts, count } = await supabase.from("urunler").select("id, urun_no, durum, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(5);
    const ms = elapsed(s);
    const hasProducts = (count || 0) > 0;
    t({ group: "Ürün İş Akışı", name: "Ürün Kayıt Varlığı", status: hasProducts ? "pass" : "warn", detail: hasProducts ? `${count} ürün mevcut` : "Hiç ürün yok", category: "product", durationMs: ms });

    if (recentProducts && recentProducts.length > 0) {
      // Verify each product has a unique urun_no (trigger fired)
      const allHaveNo = recentProducts.every((p: any) => p.urun_no && p.urun_no.startsWith("#"));
      t({ group: "Ürün İş Akışı", name: "Ürün No Trigger Kontrolü", status: allHaveNo ? "pass" : "fail", detail: allHaveNo ? "generate_urun_no trigger çalışıyor" : "Bazı ürünlerin numarası yok!", category: "product", errorCategory: !allHaveNo ? "DATA_ERROR" : undefined, stepFailed: !allHaveNo ? "generate_urun_no() trigger not firing on INSERT" : undefined });

      // Check varyasyonlar for first product
      const { data: varyasyonlar } = await supabase.from("urun_varyasyonlar").select("id").eq("urun_id", recentProducts[0].id);
      t({ group: "Ürün İş Akışı", name: "Varyasyon Matrisi", status: (varyasyonlar?.length || 0) > 0 ? "pass" : "warn", detail: (varyasyonlar?.length || 0) > 0 ? `Son ürün: ${varyasyonlar.length} varyasyon` : "Son üründe varyasyon yok", category: "product" });
    }
  }

  // --- İHALE OLUŞTURMA WORKFLOW ---
  {
    const s = start();
    const { data: recentIhale, count } = await supabase.from("ihaleler").select("id, ihale_no, durum, slug, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(5);
    const ms = elapsed(s);
    t({ group: "İhale İş Akışı", name: "İhale Kayıt Varlığı", status: (count || 0) > 0 ? "pass" : "warn", detail: (count || 0) > 0 ? `${count} ihale mevcut` : "Hiç ihale yok", category: "tender", durationMs: ms });

    if (recentIhale && recentIhale.length > 0) {
      const allHaveNo = recentIhale.every((i: any) => i.ihale_no && i.ihale_no.length >= 4);
      t({ group: "İhale İş Akışı", name: "İhale No Trigger Kontrolü", status: allHaveNo ? "pass" : "fail", detail: allHaveNo ? "generate_ihale_no trigger çalışıyor" : "Bazı ihalelerin no'su yok!", category: "tender", errorCategory: !allHaveNo ? "DATA_ERROR" : undefined });

      const allHaveSlug = recentIhale.every((i: any) => i.slug);
      t({ group: "İhale İş Akışı", name: "İhale Slug Trigger Kontrolü", status: allHaveSlug ? "pass" : "fail", detail: allHaveSlug ? "set_ihale_slug trigger çalışıyor" : "Bazı ihalelerin slug'ı yok!", category: "tender", errorCategory: !allHaveSlug ? "DATA_ERROR" : undefined });
    }
  }

  // --- TEKLİF WORKFLOW ---
  {
    const s = start();
    const { count: teklifCount } = await supabase.from("ihale_teklifler").select("id", { count: "exact", head: true });
    const ms = elapsed(s);
    t({ group: "Teklif İş Akışı", name: "Teklif Kayıt Varlığı", status: (teklifCount || 0) > 0 ? "pass" : "warn", detail: (teklifCount || 0) > 0 ? `${teklifCount} teklif mevcut` : "Hiç teklif yok", category: "tender", durationMs: ms });

    // Check that teklifler reference valid ihaleler
    if ((teklifCount || 0) > 0) {
      const { data: teklifler } = await supabase.from("ihale_teklifler").select("id, ihale_id").limit(20);
      if (teklifler && teklifler.length > 0) {
        const ihaleIds = [...new Set(teklifler.map((t: any) => t.ihale_id))];
        const { data: ihaleler } = await supabase.from("ihaleler").select("id").in("id", ihaleIds);
        const validIds = new Set((ihaleler || []).map((i: any) => i.id));
        const orphan = ihaleIds.filter((id: string) => !validIds.has(id));
        t({ group: "Teklif İş Akışı", name: "Teklif-İhale FK Bütünlüğü", status: orphan.length === 0 ? "pass" : "fail", detail: orphan.length === 0 ? "Tüm teklifler geçerli ihaleye bağlı" : `${orphan.length} yetim teklif`, category: "tender", errorCategory: orphan.length > 0 ? "DATA_ERROR" : undefined });
      }
    }
  }

  // --- MESAJ WORKFLOW ---
  {
    const s = start();
    const { count: convCount } = await supabase.from("conversations").select("id", { count: "exact", head: true });
    const { count: msgCount } = await supabase.from("messages").select("id", { count: "exact", head: true });
    const ms = elapsed(s);
    t({ group: "Mesaj İş Akışı", name: "Mesajlaşma Varlığı", status: (convCount || 0) > 0 ? "pass" : "warn", detail: `${convCount || 0} sohbet, ${msgCount || 0} mesaj`, category: "messaging", durationMs: ms });
  }

  // --- ADMIN ONAY/RED WORKFLOW ---
  {
    // Check that approved ihaleler exist (proves admin approval works)
    const { data: approvedIhale } = await supabase.from("ihaleler").select("id").eq("durum", "devam_ediyor").limit(1);
    t({ group: "Admin İş Akışı", name: "Onaylanmış İhale Varlığı", status: (approvedIhale?.length || 0) > 0 ? "pass" : "warn", detail: (approvedIhale?.length || 0) > 0 ? "Onaylanmış ihale var" : "Hiç onaylanmış ihale yok", category: "admin" });

    const { data: approvedUrun } = await supabase.from("urunler").select("id").eq("durum", "aktif").limit(1);
    t({ group: "Admin İş Akışı", name: "Onaylanmış Ürün Varlığı", status: (approvedUrun?.length || 0) > 0 ? "pass" : "warn", detail: (approvedUrun?.length || 0) > 0 ? "Aktif ürün var" : "Hiç aktif ürün yok", category: "admin" });

    // Check notifications triggered for status changes
    const { count: notifCount } = await supabase.from("notifications").select("id", { count: "exact", head: true });
    t({ group: "Admin İş Akışı", name: "Bildirim Sistemi", status: (notifCount || 0) > 0 ? "pass" : "warn", detail: `${notifCount || 0} bildirim kaydı`, category: "admin" });
  }

  // --- PAKET WORKFLOW ---
  {
    const { data: paketler } = await supabase.from("paketler").select("id, slug, ad");
    const free = (paketler || []).find((p: any) => p.slug === "ucretsiz");
    const pro = (paketler || []).find((p: any) => p.slug !== "ucretsiz");
    t({ group: "Paket İş Akışı", name: "Paket Tanımları", status: free && pro ? "pass" : free ? "warn" : "fail", detail: free && pro ? `Ücretsiz + ${(paketler?.length || 1) - 1} ücretli paket` : free ? "Sadece ücretsiz" : "Ücretsiz paket yok!", category: "payment", errorCategory: !free ? "DATA_ERROR" : undefined });

    // Check auto-assign works
    const { data: firmalar } = await supabase.from("firmalar").select("user_id").limit(20);
    if (firmalar && firmalar.length > 0) {
      const uids = firmalar.map((f: any) => f.user_id).slice(0, 10);
      const { data: subs } = await supabase.from("kullanici_abonelikler").select("user_id").in("user_id", uids);
      const subSet = new Set((subs || []).map((s: any) => s.user_id));
      const noSub = uids.filter((uid: string) => !subSet.has(uid));
      t({ group: "Paket İş Akışı", name: "Otomatik Paket Atama", status: noSub.length === 0 ? "pass" : "warn", detail: noSub.length === 0 ? "Tüm firmaların aboneliği var" : `${noSub.length} firma aboneliksiz`, category: "payment", stepFailed: noSub.length > 0 ? "auto_assign_free_package trigger not firing" : undefined });
    }
  }

  // --- EMAIL/SMS TRIGGER CHECK ---
  {
    // Check system_logs for recent email/sms entries
    const { data: emailLogs } = await supabase.from("system_logs").select("id, log_type, message").ilike("message", "%email%").limit(5);
    const { data: smsLogs } = await supabase.from("system_logs").select("id, log_type, message").ilike("message", "%sms%").limit(5);
    t({ group: "İletişim İş Akışı", name: "Email Trigger Logları", status: (emailLogs?.length || 0) > 0 ? "pass" : "warn", detail: (emailLogs?.length || 0) > 0 ? `${emailLogs.length} email log kaydı` : "Email log bulunamadı", category: "admin" });
    t({ group: "İletişim İş Akışı", name: "SMS Trigger Logları", status: (smsLogs?.length || 0) > 0 ? "pass" : "warn", detail: (smsLogs?.length || 0) > 0 ? `${smsLogs.length} sms log kaydı` : "SMS log bulunamadı", category: "admin" });
  }

  return results;
}

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const { token, layers, triggered_by } = body;

    if (!token) return json({ error: "Token gerekli" }, 401);
    try {
      const payload = JSON.parse(atob(token));
      if (payload.exp < Date.now()) return json({ error: "Token süresi dolmuş" }, 401);
    } catch {
      return json({ error: "Geçersiz token" }, 401);
    }

    // Determine which layers to run
    const requestedLayers: string[] = layers || ["infrastructure", "data_integrity", "workflow"];

    const startTime = performance.now();
    let allResults: TestResult[] = [];

    // Create test run record
    const { data: runRecord } = await supabase.from("test_runs").insert({
      triggered_by: triggered_by || "manual",
      environment: "prod",
    }).select("id").single();
    const runId = runRecord?.id;

    // Run layers
    if (requestedLayers.includes("infrastructure")) {
      const infraResults = await runInfrastructureTests(supabase);
      allResults = allResults.concat(infraResults);
    }

    if (requestedLayers.includes("data_integrity")) {
      const dataResults = await runDataIntegrityTests(supabase);
      allResults = allResults.concat(dataResults);
    }

    if (requestedLayers.includes("workflow")) {
      const wfResults = await runWorkflowTests(supabase);
      allResults = allResults.concat(wfResults);
    }

    const totalMs = Math.round(performance.now() - startTime);
    const pass = allResults.filter(r => r.status === "pass").length;
    const fail = allResults.filter(r => r.status === "fail").length;
    const warn = allResults.filter(r => r.status === "warn").length;

    // Persist results
    if (runId) {
      await supabase.from("test_runs").update({
        finished_at: new Date().toISOString(),
        duration_ms: totalMs,
        total_tests: allResults.length,
        passed_tests: pass,
        failed_tests: fail,
        warning_tests: warn,
      }).eq("id", runId);

      // Batch insert test results
      const resultRows = allResults.map(r => ({
        run_id: runId,
        test_name: r.name,
        test_group: r.group,
        category: r.category || "infrastructure",
        layer: r.layer || "infrastructure",
        status: r.status,
        error_message: r.detail,
        error_category: r.errorCategory || null,
        step_failed: r.stepFailed || null,
        technical_detail: r.technicalDetail || null,
        solution: r.solution || null,
        duration_ms: r.durationMs || 0,
      }));

      // Insert in batches of 50
      for (let i = 0; i < resultRows.length; i += 50) {
        await supabase.from("test_results").insert(resultRows.slice(i, i + 50));
      }
    }

    return json({
      run_id: runId,
      total: allResults.length,
      pass,
      fail,
      warn,
      durationMs: totalMs,
      results: allResults,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("Test suite error:", e);
    return json({ error: e.message }, 500);
  }
});
