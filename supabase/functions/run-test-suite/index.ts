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
  createdTestRecords?: string[];
  verifiedTables?: string[];
  cleanupStatus?: "success" | "failed" | "skipped";
  failureReason?: string;
  verificationSteps?: string[];
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
// LAYER 4: REAL E2E SIMULATION TESTS (yeni)
// ═══════════════════════════════════════════
async function runRealUserFlowTests(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const t = (r: TestResult) => results.push({ ...r, layer: "e2e_simulation" });
  const start = () => performance.now();
  const elapsed = (s: number) => Math.round(performance.now() - s);
  const TEST_PREFIX = "__e2e_test_";
  const testTimestamp = Date.now();

  const cleanupIds: { table: string; id: string }[] = [];
  let cleanupSuccess = true;
  const cleanup = async () => {
    for (const item of cleanupIds.reverse()) {
      const { error } = await supabase.from(item.table).delete().eq("id", item.id);
      if (error) cleanupSuccess = false;
    }
  };

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // E2E-1: ÜRÜN EKLEME SİMÜLASYONU
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      const s = start();
      let stepFailed: string | undefined;

      // Step 1: Find a real user to simulate
      const { data: testFirma } = await supabase.from("firmalar").select("id, user_id").limit(1).single();
      if (!testFirma) {
        t({ group: "E2E Ürün Ekleme", name: "Simülasyon", status: "fail", detail: "Test için firma bulunamadı", category: "product", errorCategory: "DATA_ERROR", stepFailed: "find_test_user", durationMs: elapsed(s) });
      } else {
        // Step 2: Get a valid category chain
        const { data: kategoriler } = await supabase.from("firma_bilgi_kategorileri").select("id, name").limit(1).single();
        const { data: l1Options } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", kategoriler?.id).is("parent_id", null).limit(1);
        let l2Option: any = null;
        let l3Option: any = null;
        if (l1Options && l1Options.length > 0) {
          const { data: l2 } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("parent_id", l1Options[0].id).limit(1);
          if (l2 && l2.length > 0) {
            l2Option = l2[0];
            const { data: l3 } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("parent_id", l2[0].id).limit(1);
            if (l3 && l3.length > 0) l3Option = l3[0];
          }
        }

        // Step 3: INSERT product (simulating form submit)
        const productData = {
          user_id: testFirma.user_id,
          baslik: `${TEST_PREFIX}urun_${testTimestamp}`,
          aciklama: "E2E test ürünü - otomatik silinecek",
          fiyat: 100,
          fiyat_tipi: "tek_fiyat",
          para_birimi: "TRY",
          min_siparis_miktari: 10,
          durum: "onay_bekliyor",
          urun_kategori_id: l1Options?.[0]?.id || null,
          urun_grup_id: l2Option?.id || null,
          urun_tur_id: l3Option?.id || null,
          teknik_detaylar: { test: true, source: "e2e_simulation" },
        };

        const { data: newProduct, error: insertErr } = await supabase.from("urunler").insert(productData).select("id, urun_no, slug, durum").single();

        if (insertErr) {
          stepFailed = "product_insert";
          t({ group: "E2E Ürün Ekleme", name: "Ürün INSERT", status: "fail", detail: `INSERT başarısız: ${insertErr.message}`, category: "product", errorCategory: "DATA_ERROR", stepFailed, technicalDetail: `[E2E_PRODUCT_INSERT_FAIL] ${insertErr.message}`, solution: "Check RLS policies on urunler table for service_role access", durationMs: elapsed(s) });
        } else {
          cleanupIds.push({ table: "urunler", id: newProduct.id });

          // Step 4: Verify trigger-generated fields
          const hasUrunNo = newProduct.urun_no && newProduct.urun_no.startsWith("#");
          t({ group: "E2E Ürün Ekleme", name: "urun_no Trigger", status: hasUrunNo ? "pass" : "fail", detail: hasUrunNo ? `Otomatik no: ${newProduct.urun_no}` : "urun_no oluşmadı!", category: "product", errorCategory: !hasUrunNo ? "DATA_ERROR" : undefined, stepFailed: !hasUrunNo ? "urun_no_trigger" : undefined });

          const hasSlug = !!newProduct.slug;
          t({ group: "E2E Ürün Ekleme", name: "Slug Trigger", status: hasSlug ? "pass" : "fail", detail: hasSlug ? `Slug: ${newProduct.slug}` : "Slug oluşmadı!", category: "product", errorCategory: !hasSlug ? "DATA_ERROR" : undefined, stepFailed: !hasSlug ? "slug_trigger" : undefined });

          t({ group: "E2E Ürün Ekleme", name: "Durum Kontrolü", status: newProduct.durum === "onay_bekliyor" ? "pass" : "fail", detail: `Durum: ${newProduct.durum}`, category: "product", errorCategory: newProduct.durum !== "onay_bekliyor" ? "STATE_ERROR" : undefined });

          // Step 5: Add variation
          const varyasyonData = {
            urun_id: newProduct.id,
            varyant_1_label: "Beden",
            varyant_1_value: "M",
            varyant_2_label: "Renk",
            varyant_2_value: "Kırmızı",
            min_adet: 10,
            max_adet: 100,
            birim_fiyat: 50,
            foto_url: "https://placeholder.co/200",
          };

          const { data: newVar, error: varErr } = await supabase.from("urun_varyasyonlar").insert(varyasyonData).select("id").single();
          if (varErr) {
            t({ group: "E2E Ürün Ekleme", name: "Varyasyon INSERT", status: "fail", detail: `Varyasyon eklenemedi: ${varErr.message}`, category: "product", errorCategory: "DATA_ERROR", stepFailed: "variation_insert" });
          } else {
            cleanupIds.push({ table: "urun_varyasyonlar", id: newVar.id });
            // Verify variation exists for product
            const { count } = await supabase.from("urun_varyasyonlar").select("id", { count: "exact", head: true }).eq("urun_id", newProduct.id);
            t({ group: "E2E Ürün Ekleme", name: "Varyasyon Doğrulama", status: (count || 0) > 0 ? "pass" : "fail", detail: `${count} varyasyon kaydı`, category: "product", errorCategory: (count || 0) === 0 ? "DATA_ERROR" : undefined });
          }

          // Step 6: Verify notification was triggered
          const { data: notifs } = await supabase.from("notifications").select("id, type").eq("user_id", testFirma.user_id).eq("type", "urun_onay_bekliyor").order("created_at", { ascending: false }).limit(1);
          t({ group: "E2E Ürün Ekleme", name: "Bildirim Trigger", status: (notifs?.length || 0) > 0 ? "pass" : "warn", detail: (notifs?.length || 0) > 0 ? "Bildirim tetiklendi" : "Bildirim bulunamadı (eski olabilir)", category: "product" });

          // Proof summary
          t({ group: "E2E Ürün Ekleme", name: "Kanıt Özeti", status: "pass", detail: "Ürün ekleme simülasyonu tamamlandı", category: "product",
            createdTestRecords: [`urunler:${newProduct.id}`, newVar?.id ? `urun_varyasyonlar:${newVar.id}` : ""].filter(Boolean),
            verifiedTables: ["urunler", "urun_varyasyonlar", "notifications"],
            verificationSteps: ["Ürün INSERT", "urun_no trigger", "slug trigger", "durum kontrolü", "varyasyon INSERT", "varyasyon DB doğrulama", "bildirim trigger"],
            cleanupStatus: "skipped",
          });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // E2E-2: İHALE OLUŞTURMA SİMÜLASYONU
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      const s = start();
      const { data: testFirma } = await supabase.from("firmalar").select("id, user_id").limit(1).single();
      if (!testFirma) {
        t({ group: "E2E İhale Oluşturma", name: "Simülasyon", status: "fail", detail: "Test için firma bulunamadı", category: "tender", errorCategory: "DATA_ERROR", durationMs: elapsed(s) });
      } else {
        const { data: kat } = await supabase.from("firma_bilgi_kategorileri").select("id").limit(1).single();
        const { data: l1 } = await supabase.from("firma_bilgi_secenekleri").select("id").eq("kategori_id", kat?.id).is("parent_id", null).limit(1);

        const ihaleData = {
          user_id: testFirma.user_id,
          baslik: `${TEST_PREFIX}ihale_${testTimestamp}`,
          aciklama: "E2E test ihalesi - otomatik silinecek",
          ihale_turu: "urun",
          teklif_usulu: "acik",
          baslangic_tarihi: new Date().toISOString(),
          bitis_tarihi: new Date(Date.now() + 86400000 * 7).toISOString(),
          durum: "onay_bekliyor",
          para_birimi: "TRY",
          miktar: 100,
          birim: "Adet",
          kategori_id: l1?.[0]?.id || null,
        };

        const { data: newIhale, error: ihaleErr } = await supabase.from("ihaleler").insert(ihaleData).select("id, ihale_no, slug, durum").single();

        if (ihaleErr) {
          t({ group: "E2E İhale Oluşturma", name: "İhale INSERT", status: "fail", detail: `INSERT başarısız: ${ihaleErr.message}`, category: "tender", errorCategory: "DATA_ERROR", stepFailed: "ihale_insert", technicalDetail: `[E2E_IHALE_INSERT_FAIL] ${ihaleErr.message}` });
        } else {
          cleanupIds.push({ table: "ihaleler", id: newIhale.id });

          t({ group: "E2E İhale Oluşturma", name: "ihale_no Trigger", status: newIhale.ihale_no ? "pass" : "fail", detail: newIhale.ihale_no ? `No: ${newIhale.ihale_no}` : "ihale_no oluşmadı!", category: "tender", errorCategory: !newIhale.ihale_no ? "DATA_ERROR" : undefined });

          t({ group: "E2E İhale Oluşturma", name: "Slug Trigger", status: newIhale.slug ? "pass" : "fail", detail: newIhale.slug ? `Slug: ${newIhale.slug}` : "Slug oluşmadı!", category: "tender", errorCategory: !newIhale.slug ? "DATA_ERROR" : undefined });

          t({ group: "E2E İhale Oluşturma", name: "Durum Kontrolü", status: newIhale.durum === "onay_bekliyor" ? "pass" : "fail", detail: `Durum: ${newIhale.durum}`, category: "tender" });

          // Add ihale stock entry
          const { data: stok, error: stokErr } = await supabase.from("ihale_stok").insert({
            ihale_id: newIhale.id,
            varyant_1_label: "Beden",
            varyant_1_value: "L",
            stok_sayisi: 500,
            miktar_tipi: "Adet",
          }).select("id").single();

          if (!stokErr && stok) {
            cleanupIds.push({ table: "ihale_stok", id: stok.id });
            t({ group: "E2E İhale Oluşturma", name: "Stok Kaydı", status: "pass", detail: "Stok başarıyla eklendi", category: "tender" });
          } else {
            t({ group: "E2E İhale Oluşturma", name: "Stok Kaydı", status: "fail", detail: stokErr?.message || "Stok eklenemedi", category: "tender", errorCategory: "DATA_ERROR" });
          }
        }
      }
      t({ group: "E2E İhale Oluşturma", name: "Toplam Süre", status: "pass", detail: `${elapsed(s)}ms`, category: "tender", durationMs: elapsed(s) });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // E2E-3: TEKLİF VERME SİMÜLASYONU
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      const s = start();
      // Find an active ihale to bid on
      const { data: activeIhale } = await supabase.from("ihaleler").select("id, user_id").eq("durum", "devam_ediyor").limit(1).single();
      if (!activeIhale) {
        t({ group: "E2E Teklif Verme", name: "Simülasyon", status: "warn", detail: "Aktif ihale bulunamadı - teklif testi atlandı", category: "tender", durationMs: elapsed(s) });
      } else {
        // Find a different user to bid
        const { data: bidder } = await supabase.from("firmalar").select("user_id").neq("user_id", activeIhale.user_id).limit(1).single();
        if (!bidder) {
          t({ group: "E2E Teklif Verme", name: "Simülasyon", status: "warn", detail: "Farklı teklif veren kullanıcı bulunamadı", category: "tender", durationMs: elapsed(s) });
        } else {
          const teklifData = {
            ihale_id: activeIhale.id,
            teklif_veren_user_id: bidder.user_id,
            tutar: 999.99,
            durum: "inceleniyor",
          };

          const { data: newTeklif, error: teklifErr } = await supabase.from("ihale_teklifler").insert(teklifData).select("id, tutar, durum").single();

          if (teklifErr) {
            t({ group: "E2E Teklif Verme", name: "Teklif INSERT", status: "fail", detail: `INSERT başarısız: ${teklifErr.message}`, category: "tender", errorCategory: "DATA_ERROR", stepFailed: "teklif_insert", technicalDetail: `[E2E_TEKLIF_INSERT_FAIL] ${teklifErr.message}` });
          } else {
            cleanupIds.push({ table: "ihale_teklifler", id: newTeklif.id });

            t({ group: "E2E Teklif Verme", name: "Teklif Kaydı", status: "pass", detail: `Tutar: ${newTeklif.tutar}, Durum: ${newTeklif.durum}`, category: "tender" });

            // Verify DB record
            const { data: verify } = await supabase.from("ihale_teklifler").select("id, tutar").eq("id", newTeklif.id).single();
            t({ group: "E2E Teklif Verme", name: "DB Doğrulama", status: verify ? "pass" : "fail", detail: verify ? "Kayıt DB'de doğrulandı" : "Kayıt bulunamadı!", category: "tender", errorCategory: !verify ? "DATA_ERROR" : undefined });

            // Check notification was triggered for ihale owner
            const { data: notifs } = await supabase.from("notifications").select("id, type").eq("user_id", activeIhale.user_id).eq("type", "ihale_yeni_teklif").order("created_at", { ascending: false }).limit(1);
            t({ group: "E2E Teklif Verme", name: "Bildirim Trigger", status: (notifs?.length || 0) > 0 ? "pass" : "warn", detail: (notifs?.length || 0) > 0 ? "İhale sahibine bildirim gitti" : "Bildirim bulunamadı", category: "tender" });
          }
        }
      }
      t({ group: "E2E Teklif Verme", name: "Toplam Süre", status: "pass", detail: `${elapsed(s)}ms`, category: "tender", durationMs: elapsed(s) });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // E2E-4: DROPDOWN ZİNCİR DOĞRULAMA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      const s = start();
      const { data: allKats } = await supabase.from("firma_bilgi_kategorileri").select("id, name");
      const testedKats: string[] = [];

      if (allKats) {
        for (const kat of allKats.slice(0, 5)) {
          const { data: l1 } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", kat.id).is("parent_id", null);
          const l1Count = l1?.length || 0;

          if (l1Count === 0) {
            t({ group: "E2E Dropdown Zinciri", name: `${kat.name}: L1 Boş`, status: "fail", detail: `${kat.name} kategorisinde hiç üst seçenek yok!`, category: "dropdown", errorCategory: "DATA_ERROR", stepFailed: "l1_empty" });
            continue;
          }

          // Test first L1 → L2 chain
          const { data: l2 } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("parent_id", l1![0].id);
          const l2Count = l2?.length || 0;

          if (l2Count === 0) {
            t({ group: "E2E Dropdown Zinciri", name: `${kat.name}: L1→L2`, status: "warn", detail: `${l1![0].name} altında alt seçenek yok`, category: "dropdown" });
          } else {
            // Test L2 → L3 chain
            const { data: l3 } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("parent_id", l2[0].id);
            const l3Count = l3?.length || 0;
            t({ group: "E2E Dropdown Zinciri", name: `${kat.name}: Tam Zincir`, status: l3Count > 0 ? "pass" : "warn", detail: `${l1![0].name} → ${l2[0].name} → ${l3Count} alt seçenek`, category: "dropdown" });
          }

          // Test: switching category should give different L1 options
          testedKats.push(kat.name);
        }
      }

      // Verify parent_id reset simulation: changing parent should yield different children
      if (allKats && allKats.length >= 2) {
        const { data: l1_kat1 } = await supabase.from("firma_bilgi_secenekleri").select("id").eq("kategori_id", allKats[0].id).is("parent_id", null).limit(1);
        const { data: l1_kat2 } = await supabase.from("firma_bilgi_secenekleri").select("id").eq("kategori_id", allKats[1].id).is("parent_id", null).limit(1);

        if (l1_kat1?.length && l1_kat2?.length) {
          const { data: children1 } = await supabase.from("firma_bilgi_secenekleri").select("id").eq("parent_id", l1_kat1[0].id);
          const { data: children2 } = await supabase.from("firma_bilgi_secenekleri").select("id").eq("parent_id", l1_kat2[0].id);
          const ids1 = new Set((children1 || []).map((c: any) => c.id));
          const ids2 = new Set((children2 || []).map((c: any) => c.id));
          const overlap = [...ids1].filter(id => ids2.has(id));
          t({ group: "E2E Dropdown Zinciri", name: "Kategori Değişim İzolasyonu", status: overlap.length === 0 ? "pass" : "warn", detail: overlap.length === 0 ? "Kategoriler izole, çakışma yok" : `${overlap.length} çakışan seçenek`, category: "dropdown" });
        }
      }
      t({ group: "E2E Dropdown Zinciri", name: "Toplam Süre", status: "pass", detail: `${elapsed(s)}ms, ${testedKats.length} kategori test edildi`, category: "dropdown", durationMs: elapsed(s) });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // E2E-5: PAKET & KOTA KONTROLÜ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      const s = start();
      // Check free package exists and has correct limits
      const { data: freePaket } = await supabase.from("paketler").select("*").eq("slug", "ucretsiz").single();
      if (!freePaket) {
        t({ group: "E2E Paket/Kota", name: "Ücretsiz Paket", status: "fail", detail: "Ücretsiz paket bulunamadı!", category: "payment", errorCategory: "DATA_ERROR" });
      } else {
        t({ group: "E2E Paket/Kota", name: "Ücretsiz Paket Varlığı", status: "pass", detail: `Paket: ${freePaket.ad}`, category: "payment" });

        // Verify limits are set
        const hasLimits = freePaket.profil_goruntuleme_limiti !== null || freePaket.teklif_verme_limiti !== null;
        t({ group: "E2E Paket/Kota", name: "Limit Tanımları", status: hasLimits ? "pass" : "warn", detail: hasLimits ? `Profil: ${freePaket.profil_goruntuleme_limiti}, Teklif: ${freePaket.teklif_verme_limiti}, Ürün: ${freePaket.aktif_urun_limiti}` : "Limitler tanımsız", category: "payment" });
      }

      // Check PRO package exists
      const { data: proPaketler } = await supabase.from("paketler").select("id, ad, slug").neq("slug", "ucretsiz");
      t({ group: "E2E Paket/Kota", name: "PRO Paketler", status: (proPaketler?.length || 0) > 0 ? "pass" : "warn", detail: `${proPaketler?.length || 0} ücretli paket tanımlı`, category: "payment" });

      // Verify auto_assign_free_package trigger by checking a recent firma
      const { data: recentFirma } = await supabase.from("firmalar").select("user_id").order("created_at", { ascending: false }).limit(1).single();
      if (recentFirma) {
        const { data: sub } = await supabase.from("kullanici_abonelikler").select("id, paket_id").eq("user_id", recentFirma.user_id).limit(1).single();
        t({ group: "E2E Paket/Kota", name: "Otomatik Paket Ataması", status: sub ? "pass" : "fail", detail: sub ? "Son firma kaydına otomatik paket atanmış" : "Abonelik bulunamadı!", category: "payment", errorCategory: !sub ? "DATA_ERROR" : undefined, stepFailed: !sub ? "auto_assign_free_package trigger" : undefined });
      }

      t({ group: "E2E Paket/Kota", name: "Toplam Süre", status: "pass", detail: `${elapsed(s)}ms`, category: "payment", durationMs: elapsed(s) });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // E2E-6: ADMIN ONAY/RED SİMÜLASYONU
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      const s = start();
      // Find a test product we just created (or any onay_bekliyor)
      const testProductName = `${TEST_PREFIX}urun_${testTimestamp}`;
      const { data: testProduct } = await supabase.from("urunler").select("id, durum, user_id").eq("baslik", testProductName).single();

      if (testProduct) {
        // Simulate admin approval
        const { error: approveErr } = await supabase.from("urunler").update({ durum: "aktif", admin_karar_tarihi: new Date().toISOString(), admin_karar_veren: "e2e_test_system" }).eq("id", testProduct.id);

        if (approveErr) {
          t({ group: "E2E Admin Onay/Red", name: "Ürün Onaylama", status: "fail", detail: `UPDATE başarısız: ${approveErr.message}`, category: "admin", errorCategory: "DATA_ERROR" });
        } else {
          // Verify status changed
          const { data: verified } = await supabase.from("urunler").select("durum").eq("id", testProduct.id).single();
          t({ group: "E2E Admin Onay/Red", name: "Ürün Onaylama", status: verified?.durum === "aktif" ? "pass" : "fail", detail: verified?.durum === "aktif" ? "Durum başarıyla 'aktif' oldu" : `Durum: ${verified?.durum}`, category: "admin" });

          // Now simulate rejection
          const { error: rejectErr } = await supabase.from("urunler").update({ durum: "reddedildi", admin_karar_sebebi: "E2E test reddi" }).eq("id", testProduct.id);
          if (!rejectErr) {
            const { data: rejVerified } = await supabase.from("urunler").select("durum, admin_karar_sebebi").eq("id", testProduct.id).single();
            t({ group: "E2E Admin Onay/Red", name: "Ürün Reddetme", status: rejVerified?.durum === "reddedildi" ? "pass" : "fail", detail: rejVerified?.durum === "reddedildi" ? `Red sebebi: ${rejVerified.admin_karar_sebebi}` : `Durum: ${rejVerified?.durum}`, category: "admin" });
          }
        }
      } else {
        t({ group: "E2E Admin Onay/Red", name: "Simülasyon", status: "warn", detail: "Test ürünü bulunamadı, onay/red testi atlandı", category: "admin" });
      }

      t({ group: "E2E Admin Onay/Red", name: "Toplam Süre", status: "pass", detail: `${elapsed(s)}ms`, category: "admin", durationMs: elapsed(s) });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // E2E-7: MESAJLAŞMA SİMÜLASYONU
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      const s = start();
      // Find two different users
      const { data: users } = await supabase.from("firmalar").select("user_id").limit(2);
      if (!users || users.length < 2) {
        t({ group: "E2E Mesajlaşma", name: "Simülasyon", status: "warn", detail: "Yeterli kullanıcı bulunamadı", category: "messaging", durationMs: elapsed(s) });
      } else {
        // Use RPC to get/create conversation
        const { data: convId, error: convErr } = await supabase.rpc("get_or_create_conversation", {
          p_user1: users[0].user_id,
          p_user2: users[1].user_id,
        });

        if (convErr) {
          t({ group: "E2E Mesajlaşma", name: "Sohbet Oluşturma", status: "fail", detail: `RPC hatası: ${convErr.message}`, category: "messaging", errorCategory: "DATA_ERROR" });
        } else {
          t({ group: "E2E Mesajlaşma", name: "Sohbet Oluşturma", status: "pass", detail: `Conversation ID: ${convId}`, category: "messaging" });

          // Insert test message
          const { data: newMsg, error: msgErr } = await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: users[0].user_id,
            content: `${TEST_PREFIX}mesaj_${testTimestamp}`,
          }).select("id").single();

          if (msgErr) {
            t({ group: "E2E Mesajlaşma", name: "Mesaj Gönderme", status: "fail", detail: `INSERT başarısız: ${msgErr.message}`, category: "messaging", errorCategory: "DATA_ERROR" });
          } else {
            cleanupIds.push({ table: "messages", id: newMsg.id });
            // Verify in DB
            const { data: verified } = await supabase.from("messages").select("id, content").eq("id", newMsg.id).single();
            t({ group: "E2E Mesajlaşma", name: "Mesaj DB Doğrulama", status: verified ? "pass" : "fail", detail: verified ? "Mesaj DB'de doğrulandı" : "Mesaj bulunamadı!", category: "messaging" });

            // Check notification for recipient
            const { data: notifs } = await supabase.from("notifications").select("id").eq("user_id", users[1].user_id).eq("type", "yeni_mesaj").order("created_at", { ascending: false }).limit(1);
            t({ group: "E2E Mesajlaşma", name: "Bildirim Trigger", status: (notifs?.length || 0) > 0 ? "pass" : "warn", detail: (notifs?.length || 0) > 0 ? "Alıcıya bildirim gitti" : "Bildirim bulunamadı", category: "messaging" });
          }
        }
      }
      t({ group: "E2E Mesajlaşma", name: "Toplam Süre", status: "pass", detail: `${elapsed(s)}ms`, category: "messaging", durationMs: elapsed(s) });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // E2E-8: AUTH GERÇEK TEST (signUp / signIn / session)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      const s = start();
      const testEmail = `${TEST_PREFIX}auth_${testTimestamp}@test-e2e.local`;
      const testPass = "E2eTest_" + testTimestamp;

      // Step 1: signUp
      const { data: signUpData, error: signUpErr } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPass,
        email_confirm: true,
        user_metadata: { source: "e2e_test" },
      });

      if (signUpErr) {
        t({ group: "E2E Auth", name: "Kullanıcı Oluşturma (signUp)", status: "fail", detail: `signUp başarısız: ${signUpErr.message}`, category: "auth", errorCategory: "AUTH_ERROR", stepFailed: "signup", durationMs: elapsed(s) });
      } else {
        const testUserId = signUpData.user?.id;
        t({ group: "E2E Auth", name: "Kullanıcı Oluşturma (signUp)", status: "pass", detail: `Kullanıcı oluşturuldu: ${testEmail}`, category: "auth" });

        // Step 2: signIn with anon client
        const anonClient = createClient(SUPABASE_URL, ANON_KEY);
        const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
          email: testEmail,
          password: testPass,
        });

        if (signInErr) {
          t({ group: "E2E Auth", name: "Oturum Açma (signIn)", status: "fail", detail: `signIn başarısız: ${signInErr.message}`, category: "auth", errorCategory: "AUTH_ERROR", stepFailed: "signin" });
        } else {
          t({ group: "E2E Auth", name: "Oturum Açma (signIn)", status: "pass", detail: "signIn başarılı, token alındı", category: "auth" });

          // Step 3: Verify session
          const hasSession = !!signInData.session?.access_token;
          t({ group: "E2E Auth", name: "Session Doğrulama", status: hasSession ? "pass" : "fail", detail: hasSession ? "access_token mevcut" : "Session oluşmadı!", category: "auth", errorCategory: !hasSession ? "AUTH_ERROR" : undefined, stepFailed: !hasSession ? "session_verify" : undefined });

          // Step 4: getUser with token
          if (hasSession) {
            const authedClient = createClient(SUPABASE_URL, ANON_KEY, {
              global: { headers: { Authorization: `Bearer ${signInData.session!.access_token}` } }
            });
            const { data: userData, error: userErr } = await authedClient.auth.getUser();
            t({ group: "E2E Auth", name: "getUser Doğrulama", status: !userErr && userData.user?.email === testEmail ? "pass" : "fail", detail: !userErr ? `User: ${userData.user?.email}` : `Hata: ${userErr?.message}`, category: "auth", errorCategory: userErr ? "AUTH_ERROR" : undefined });
          }
        }

        // Step 5: Wrong password should fail
        const { error: wrongErr } = await anonClient.auth.signInWithPassword({
          email: testEmail,
          password: "wrong_password_123",
        });
        t({ group: "E2E Auth", name: "Yanlış Şifre Reddi", status: wrongErr ? "pass" : "fail", detail: wrongErr ? "Yanlış şifre doğru reddedildi" : "Yanlış şifre kabul edildi!", category: "auth", errorCategory: !wrongErr ? "AUTH_ERROR" : undefined });

        // Cleanup: delete test user
        if (testUserId) {
          await supabase.auth.admin.deleteUser(testUserId);
        }
      }

      t({ group: "E2E Auth", name: "Toplam Süre", status: "pass", detail: `${elapsed(s)}ms`, category: "auth", durationMs: elapsed(s) });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // E2E-9: STORAGE TEST (upload / verify / delete)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      const s = start();
      const testFileName = `${TEST_PREFIX}storage_${testTimestamp}.txt`;
      const testContent = new TextEncoder().encode("E2E storage test - " + testTimestamp);
      const testBucket = "firma-images";

      // Step 1: Upload
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(testBucket)
        .upload(`e2e-tests/${testFileName}`, testContent, {
          contentType: "text/plain",
          upsert: true,
        });

      if (uploadErr) {
        t({ group: "E2E Storage", name: "Dosya Yükleme", status: "fail", detail: `Upload başarısız: ${uploadErr.message}`, category: "infrastructure", errorCategory: "NETWORK_ERROR", stepFailed: "upload" });
      } else {
        t({ group: "E2E Storage", name: "Dosya Yükleme", status: "pass", detail: `Yüklendi: ${uploadData.path}`, category: "infrastructure" });

        // Step 2: Verify file exists
        const { data: listData } = await supabase.storage
          .from(testBucket)
          .list("e2e-tests", { search: testFileName });

        const found = (listData || []).some((f: any) => f.name === testFileName);
        t({ group: "E2E Storage", name: "Dosya Doğrulama", status: found ? "pass" : "fail", detail: found ? "Dosya listede bulundu" : "Dosya listede yok!", category: "infrastructure", errorCategory: !found ? "DATA_ERROR" : undefined });

        // Step 3: Get public URL
        const { data: urlData } = supabase.storage.from(testBucket).getPublicUrl(`e2e-tests/${testFileName}`);
        t({ group: "E2E Storage", name: "Public URL", status: urlData?.publicUrl ? "pass" : "fail", detail: urlData?.publicUrl ? "URL oluşturuldu" : "URL oluşturulamadı", category: "infrastructure" });

        // Step 4: Delete
        const { error: delErr } = await supabase.storage
          .from(testBucket)
          .remove([`e2e-tests/${testFileName}`]);

        t({ group: "E2E Storage", name: "Dosya Silme", status: !delErr ? "pass" : "fail", detail: !delErr ? "Dosya silindi" : `Silme hatası: ${delErr.message}`, category: "infrastructure", errorCategory: delErr ? "DATA_ERROR" : undefined });
      }

      t({ group: "E2E Storage", name: "Toplam Süre", status: "pass", detail: `${elapsed(s)}ms`, category: "infrastructure", durationMs: elapsed(s) });
    }

  } finally {
    await cleanup();
    // Update all E2E results with cleanup status
    for (const r of results) {
      if (r.layer === "e2e_simulation" && r.cleanupStatus === "skipped") {
        r.cleanupStatus = cleanupSuccess ? "success" : "failed";
      }
    }
  }

  // Log critical failures to system_logs
  const failures = results.filter(r => r.status === "fail");
  if (failures.length > 0) {
    try {
      await supabase.from("system_logs").insert({
        log_type: "error",
        message: `E2E test suite: ${failures.length} test(s) failed`,
        details: { failures: failures.map(f => ({ name: f.name, group: f.group, detail: f.detail, errorCategory: f.errorCategory })) },
      });
    } catch { /* ignore logging errors */ }
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
      layers: requestedLayers,
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

    if (requestedLayers.includes("e2e_simulation")) {
      const e2eResults = await runRealUserFlowTests(supabase);
      allResults = allResults.concat(e2eResults);
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
        overall_status: fail > 0 ? "fail" : warn > 0 ? "warn" : "pass",
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
        proof_metadata: (r.createdTestRecords || r.verifiedTables || r.verificationSteps) ? JSON.stringify({
          created_test_records: r.createdTestRecords || [],
          verified_tables: r.verifiedTables || [],
          cleanup_status: r.cleanupStatus || null,
          failure_reason: r.failureReason || null,
          verification_steps: r.verificationSteps || [],
        }) : null,
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
