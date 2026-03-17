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
}

async function runAllTests(supabase: any): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const t = (r: TestResult) => results.push(r);
  const start = () => performance.now();
  const elapsed = (s: number) => Math.round(performance.now() - s);

  // ═══════════════════════════════════════════
  // 1. DATABASE TABLES
  // ═══════════════════════════════════════════
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
      t({ group: "Veritabanı Tabloları", name: `${table}`, status: "fail", detail: `Tablo erişilemedi`, technicalDetail: `[TABLE_ACCESS_ERROR] SELECT on "${table}" failed. Error: ${error.message} (code: ${error.code}). Query: supabase.from("${table}").select("*", {count:"exact", head:true})`, solution: `Check if table "${table}" exists. Verify RLS policies allow service_role access. Run: SELECT * FROM pg_tables WHERE tablename='${table}';`, durationMs: ms });
    } else {
      t({ group: "Veritabanı Tabloları", name: `${table}`, status: ms > 2000 ? "warn" : "pass", detail: `${count ?? 0} kayıt, ${ms}ms`, technicalDetail: ms > 2000 ? `[SLOW_QUERY] Table "${table}" response time: ${ms}ms (threshold: 2000ms). Row count: ${count}. Possible missing index or large table scan.` : undefined, solution: ms > 2000 ? `Add index on frequently queried columns of "${table}". Check EXPLAIN ANALYZE for the table. Consider partitioning if row count > 100k.` : undefined, durationMs: ms });
    }
  }

  // ═══════════════════════════════════════════
  // 2. DATABASE FUNCTIONS (RPC)
  // ═══════════════════════════════════════════
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
      t({ group: "Veritabanı Fonksiyonları", name: rpc.name, status: "fail", detail: `RPC çalışmadı`, technicalDetail: `[RPC_ERROR] supabase.rpc("${rpc.name}", ${JSON.stringify(rpc.args)}) failed. Error: ${error.message} (code: ${error.code})`, solution: `Verify function exists: SELECT proname FROM pg_proc WHERE proname='${rpc.name}'. Check parameter types match. Re-deploy with CREATE OR REPLACE FUNCTION if needed.`, durationMs: ms });
    } else {
      t({ group: "Veritabanı Fonksiyonları", name: rpc.name, status: "pass", detail: `Başarılı (${ms}ms)`, durationMs: ms });
    }
  }

  // ═══════════════════════════════════════════
  // 3. AUTH SYSTEM
  // ═══════════════════════════════════════════
  {
    const s = start();
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: ANON_KEY } });
    const ms = elapsed(s);
    const body = await res.text();
    t({ group: "Kimlik Doğrulama", name: "Auth Health Check", status: res.ok ? "pass" : "fail", detail: res.ok ? `Auth servisi çalışıyor (${ms}ms)` : "Auth servisi erişilemedi", technicalDetail: !res.ok ? `[AUTH_HEALTH_FAIL] GET ${SUPABASE_URL}/auth/v1/health → HTTP ${res.status}. Response body: ${body.substring(0, 300)}` : undefined, solution: !res.ok ? `Auth service is unreachable. Check Supabase project status. Verify SUPABASE_URL and ANON_KEY environment variables.` : undefined, durationMs: ms });
  }

  {
    const s = start();
    const { data, error } = await supabase.rpc("check_registration_duplicate", { p_email: "test-nonexist@test.test", p_phone: "5559999999" });
    const ms = elapsed(s);
    if (error) {
      t({ group: "Kimlik Doğrulama", name: "Duplikasyon Kontrolü", status: "fail", detail: "Kayıt duplikasyon kontrolü çalışmıyor", technicalDetail: `[DUPLICATE_CHECK_FAIL] rpc("check_registration_duplicate") error: ${error.message}`, solution: `Function check_registration_duplicate is missing or broken. Check: SELECT proname FROM pg_proc WHERE proname='check_registration_duplicate';`, durationMs: ms });
    } else {
      const isValid = data && typeof data.email_exists === "boolean" && typeof data.phone_exists === "boolean";
      t({ group: "Kimlik Doğrulama", name: "Duplikasyon Kontrolü", status: isValid ? "pass" : "warn", detail: isValid ? `Çalışıyor (${ms}ms)` : "Beklenmeyen format", technicalDetail: !isValid ? `[UNEXPECTED_RESPONSE] check_registration_duplicate returned: ${JSON.stringify(data)}. Expected: {email_exists: boolean, phone_exists: boolean}` : undefined, durationMs: ms });
    }
  }

  // ═══════════════════════════════════════════
  // 4. TENDER (İHALE) SYSTEM
  // ═══════════════════════════════════════════
  {
    const s = start();
    const { data, error } = await supabase.from("ihaleler").select("ihale_no").limit(100);
    const ms = elapsed(s);
    if (error) {
      t({ group: "İhale Sistemi", name: "İhale Listesi Erişim", status: "fail", detail: "İhaleler tablosuna erişilemedi", technicalDetail: `[IHALE_ACCESS_ERROR] SELECT ihale_no FROM ihaleler LIMIT 100 failed. Error: ${error.message}`, solution: `Check RLS policies on ihaleler table. Service role should bypass RLS. Verify table exists.`, durationMs: ms });
    } else {
      const nos = data?.map((d: any) => d.ihale_no) || [];
      const unique = new Set(nos).size === nos.length;
      t({ group: "İhale Sistemi", name: "İhale No Benzersizlik", status: unique ? "pass" : "fail", detail: unique ? `${nos.length} ihale numarası benzersiz` : "Tekrarlayan ihale numaraları var!", technicalDetail: !unique ? `[DUPLICATE_IHALE_NO] Found duplicate ihale_no values among ${nos.length} records. Trigger generate_ihale_no() is not enforcing uniqueness properly.` : undefined, solution: !unique ? `Fix: Check generate_ihale_no() trigger function. Verify UNIQUE constraint on ihaleler.ihale_no column. SQL: ALTER TABLE ihaleler ADD CONSTRAINT ihale_no_unique UNIQUE (ihale_no);` : undefined, durationMs: ms });
    }
  }

  {
    const { data: ihaleler } = await supabase.from("ihaleler").select("id, durum, baslangic_tarihi, bitis_tarihi, baslik, ihale_no, teklif_usulu").limit(50);
    const durumlar = ["duzenleniyor", "onay_bekliyor", "devam_ediyor", "tamamlandi", "reddedildi", "iptal"];
    const invalidDurum = (ihaleler || []).filter((i: any) => !durumlar.includes(i.durum));
    t({ group: "İhale Sistemi", name: "Durum Geçerliliği", status: invalidDurum.length === 0 ? "pass" : "fail", detail: invalidDurum.length === 0 ? "Tüm ihalelerin durumu geçerli" : `${invalidDurum.length} ihale geçersiz durumda`, technicalDetail: invalidDurum.length > 0 ? `[INVALID_STATUS] Tenders with invalid durum: ${invalidDurum.map((i: any) => `${i.ihale_no}="${i.durum}"`).join(", ")}. Valid values: ${durumlar.join(", ")}` : undefined, solution: invalidDurum.length > 0 ? `Manually fix durum column. SQL: UPDATE ihaleler SET durum='iptal' WHERE id IN (${invalidDurum.map((i: any) => `'${i.id}'`).join(",")});` : undefined });

    const now = new Date().toISOString();
    const expired = (ihaleler || []).filter((i: any) => i.durum === "devam_ediyor" && i.bitis_tarihi && i.bitis_tarihi < now);
    t({ group: "İhale Sistemi", name: "Süre Dolmuş İhaleler", status: expired.length === 0 ? "pass" : "warn", detail: expired.length === 0 ? "Süresi dolmuş aktif ihale yok" : `${expired.length} ihale süresi dolmuş ama hâlâ aktif`, technicalDetail: expired.length > 0 ? `[EXPIRED_ACTIVE_TENDERS] ${expired.length} tenders have durum='devam_ediyor' but bitis_tarihi < NOW(). IDs: ${expired.map((i: any) => i.ihale_no).join(", ")}. The auto_complete_expired_ihaleler trigger or check-ihale-expiry edge function is not running.` : undefined, solution: expired.length > 0 ? `Run: UPDATE ihaleler SET durum='tamamlandi' WHERE durum='devam_ediyor' AND bitis_tarihi < NOW(); Also check check-ihale-expiry cron schedule.` : undefined });
  }

  {
    const { data: teklifler } = await supabase.from("ihale_teklifler").select("id, ihale_id, tutar, teklif_veren_user_id").limit(100);
    const invalidTeklifler = (teklifler || []).filter((t: any) => !t.tutar || t.tutar <= 0);
    t({ group: "İhale Sistemi", name: "Teklif Tutarları", status: invalidTeklifler.length === 0 ? "pass" : "fail", detail: invalidTeklifler.length === 0 ? "Tüm teklifler geçerli tutarda" : `${invalidTeklifler.length} teklif geçersiz tutarda`, technicalDetail: invalidTeklifler.length > 0 ? `[INVALID_BID_AMOUNT] ${invalidTeklifler.length} bids have tutar <= 0 or NULL. IDs: ${invalidTeklifler.map((t: any) => t.id).join(", ")}` : undefined, solution: invalidTeklifler.length > 0 ? `Add CHECK constraint: ALTER TABLE ihale_teklifler ADD CONSTRAINT tutar_positive CHECK (tutar > 0); Fix existing: DELETE FROM ihale_teklifler WHERE tutar <= 0;` : undefined });
  }

  // ═══════════════════════════════════════════
  // 5. PRODUCT (ÜRÜN) SYSTEM
  // ═══════════════════════════════════════════
  {
    const s = start();
    const { data: urunler, error } = await supabase.from("urunler").select("id, durum, baslik, urun_no, slug").limit(100);
    const ms = elapsed(s);
    if (error) {
      t({ group: "Ürün Sistemi", name: "Ürün Listesi Erişim", status: "fail", detail: "Ürünler tablosuna erişilemedi", technicalDetail: `[URUN_ACCESS_ERROR] SELECT from urunler failed: ${error.message}`, durationMs: ms });
    } else {
      t({ group: "Ürün Sistemi", name: "Ürün Listesi Erişim", status: "pass", detail: `${urunler?.length || 0} ürün erişildi (${ms}ms)`, durationMs: ms });

      const slugs = (urunler || []).map((u: any) => u.slug).filter(Boolean);
      const uniqueSlugs = new Set(slugs).size === slugs.length;
      t({ group: "Ürün Sistemi", name: "Ürün Slug Benzersizlik", status: uniqueSlugs ? "pass" : "fail", detail: uniqueSlugs ? "Tüm sluglar benzersiz" : "Tekrarlayan ürün slug'ları var!", technicalDetail: !uniqueSlugs ? `[DUPLICATE_SLUG] Duplicate slug values found in urunler table. Trigger set_urun_slug() is not enforcing uniqueness.` : undefined, solution: !uniqueSlugs ? `Check set_urun_slug() trigger and generate_slug() function. Add UNIQUE constraint on urunler.slug.` : undefined });

      const nos = (urunler || []).map((u: any) => u.urun_no).filter(Boolean);
      const uniqueNos = new Set(nos).size === nos.length;
      t({ group: "Ürün Sistemi", name: "Ürün No Benzersizlik", status: uniqueNos ? "pass" : "fail", detail: uniqueNos ? "Tüm ürün numaraları benzersiz" : "Tekrarlayan ürün numaraları var!", technicalDetail: !uniqueNos ? `[DUPLICATE_URUN_NO] Duplicate urun_no values found. Trigger generate_urun_no() uniqueness check may be failing.` : undefined });

      const validDurumlar = ["duzenleniyor", "onay_bekliyor", "aktif", "reddedildi", "pasif"];
      const invalidUrunDurum = (urunler || []).filter((u: any) => !validDurumlar.includes(u.durum));
      t({ group: "Ürün Sistemi", name: "Ürün Durum Geçerliliği", status: invalidUrunDurum.length === 0 ? "pass" : "fail", detail: invalidUrunDurum.length === 0 ? "Tüm ürünlerin durumu geçerli" : `${invalidUrunDurum.length} ürün geçersiz durumda`, technicalDetail: invalidUrunDurum.length > 0 ? `[INVALID_PRODUCT_STATUS] Products with invalid durum: ${invalidUrunDurum.map((u: any) => `${u.urun_no}="${u.durum}"`).join(", ")}. Valid: ${validDurumlar.join(", ")}` : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 6. PACKAGE & SUBSCRIPTION SYSTEM
  // ═══════════════════════════════════════════
  {
    const { data: paketler, error } = await supabase.from("paketler").select("id, ad, slug, fiyat_aylik, fiyat_yillik");
    if (error) {
      t({ group: "Paket Sistemi", name: "Paket Tanımları", status: "fail", detail: "Paketler tablosuna erişilemedi", technicalDetail: `[PAKET_ACCESS_ERROR] ${error.message}` });
    } else {
      t({ group: "Paket Sistemi", name: "Paket Tanımları", status: (paketler?.length || 0) > 0 ? "pass" : "fail", detail: `${paketler?.length || 0} paket tanımlı` });

      const freePackage = (paketler || []).find((p: any) => p.slug === "ucretsiz");
      t({ group: "Paket Sistemi", name: "Ücretsiz Paket", status: freePackage ? "pass" : "fail", detail: freePackage ? "Ücretsiz paket mevcut" : "Ücretsiz paket bulunamadı!", technicalDetail: !freePackage ? `[MISSING_FREE_PACKAGE] No row in paketler with slug='ucretsiz'. This breaks auto_assign_free_package trigger.` : undefined, solution: !freePackage ? `INSERT INTO paketler (ad, slug, fiyat_aylik, fiyat_yillik) VALUES ('Ücretsiz', 'ucretsiz', 0, 0);` : undefined });
    }

    const { data: abonelikler } = await supabase.from("kullanici_abonelikler").select("id, user_id, paket_id, durum").limit(100);
    const aktifAbonelikler = (abonelikler || []).filter((a: any) => a.durum === "aktif");
    const userAbonelikMap: Record<string, number> = {};
    aktifAbonelikler.forEach((a: any) => { userAbonelikMap[a.user_id] = (userAbonelikMap[a.user_id] || 0) + 1; });
    const multiActive = Object.entries(userAbonelikMap).filter(([_, count]) => count > 1);
    t({ group: "Paket Sistemi", name: "Çoklu Aktif Abonelik", status: multiActive.length === 0 ? "pass" : "warn", detail: multiActive.length === 0 ? "Her kullanıcının tek aktif aboneliği var" : `${multiActive.length} kullanıcının birden fazla aktif aboneliği var`, technicalDetail: multiActive.length > 0 ? `[DUPLICATE_ACTIVE_SUBSCRIPTIONS] ${multiActive.length} users have >1 active subscription. User IDs: ${multiActive.map(([uid]) => uid).join(", ")}` : undefined, solution: multiActive.length > 0 ? `Deduplicate: For each user, keep the most recent active subscription and set others to durum='iptal'. SQL: WITH ranked AS (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) rn FROM kullanici_abonelikler WHERE durum='aktif') UPDATE kullanici_abonelikler SET durum='iptal' WHERE id IN (SELECT id FROM ranked WHERE rn > 1);` : undefined });
  }

  // ═══════════════════════════════════════════
  // 7. MESSAGING SYSTEM
  // ═══════════════════════════════════════════
  {
    const s = start();
    const { error: convErr } = await supabase.from("conversations").select("id", { count: "exact", head: true });
    const ms = elapsed(s);
    t({ group: "Mesajlaşma", name: "Sohbetler Tablosu", status: convErr ? "fail" : "pass", detail: convErr ? "conversations tablosu erişilemedi" : `Erişim başarılı (${ms}ms)`, technicalDetail: convErr ? `[CONV_ACCESS_ERROR] ${convErr.message}` : undefined, durationMs: ms });

    const { error: msgErr } = await supabase.from("messages").select("id", { count: "exact", head: true });
    t({ group: "Mesajlaşma", name: "Mesajlar Tablosu", status: msgErr ? "fail" : "pass", detail: msgErr ? "messages tablosu erişilemedi" : "Erişim başarılı", technicalDetail: msgErr ? `[MSG_ACCESS_ERROR] ${msgErr.message}` : undefined });

    const { error: rpcErr } = await supabase.rpc("get_or_create_conversation", { p_user1: "00000000-0000-0000-0000-000000000001", p_user2: "00000000-0000-0000-0000-000000000002" });
    t({ group: "Mesajlaşma", name: "Sohbet Oluşturma RPC", status: rpcErr && rpcErr.message?.includes("violates foreign key") ? "pass" : rpcErr ? "warn" : "pass", detail: !rpcErr || rpcErr.message?.includes("violates foreign key") ? "RPC fonksiyonu çalışıyor" : "RPC hatası", technicalDetail: rpcErr && !rpcErr.message?.includes("violates foreign key") ? `[CONV_RPC_ERROR] get_or_create_conversation error: ${rpcErr.message}` : undefined });
  }

  // ═══════════════════════════════════════════
  // 8. NOTIFICATION SYSTEM
  // ═══════════════════════════════════════════
  {
    const { data, error } = await supabase.from("notifications").select("id, type", { count: "exact", head: false }).limit(10);
    t({ group: "Bildirimler", name: "Bildirim Tablosu", status: error ? "fail" : "pass", detail: error ? "notifications tablosu erişilemedi" : "Erişim başarılı", technicalDetail: error ? `[NOTIF_ACCESS_ERROR] ${error.message}` : undefined });

    if (data && data.length > 0) {
      const validTypes = [
        "ihale_onay_bekliyor", "ihale_onaylandi", "ihale_reddedildi", "ihale_iptal",
        "ihale_yeni_teklif", "teklif_iletildi", "teklif_kabul_edildi", "teklif_reddedildi",
        "teklif_ihale_durum_degisti", "urun_onay_bekliyor", "urun_onaylandi", "urun_reddedildi",
        "urun_durum_degisti", "yeni_mesaj", "sikayet_alindi", "destek_cevaplandi",
        "destek_cozuldu", "odeme_basarili", "odeme_basarisiz", "kota_uyari",
        "kisitlama_eklendi", "uzaklastirma_eklendi", "yasak_eklendi",
      ];
      const types = data.map((d: any) => d.type);
      const invalidTypes = types.filter((t: string) => !validTypes.includes(t));
      t({ group: "Bildirimler", name: "Bildirim Tip Kontrolü", status: invalidTypes.length === 0 ? "pass" : "warn", detail: invalidTypes.length === 0 ? "Tüm bildirim tipleri geçerli" : `${invalidTypes.length} bilinmeyen bildirim tipi`, technicalDetail: invalidTypes.length > 0 ? `[UNKNOWN_NOTIF_TYPES] Unknown notification types: ${[...new Set(invalidTypes)].join(", ")}. Expected one of: ${validTypes.join(", ")}` : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 9. SUPPORT SYSTEM
  // ═══════════════════════════════════════════
  {
    const { data, error } = await supabase.from("destek_talepleri").select("id, durum, talep_no").limit(50);
    t({ group: "Destek Sistemi", name: "Destek Talepleri", status: error ? "fail" : "pass", detail: error ? "Erişilemedi" : `${data?.length || 0} talep kontrol edildi`, technicalDetail: error ? `[DESTEK_ACCESS_ERROR] ${error.message}` : undefined });

    if (data) {
      const validDurum = ["acik", "cevaplandi", "cozuldu", "beklemede", "inceleniyor"];
      const invalidDurum = data.filter((d: any) => !validDurum.includes(d.durum));
      t({ group: "Destek Sistemi", name: "Talep Durumları", status: invalidDurum.length === 0 ? "pass" : "warn", detail: invalidDurum.length === 0 ? "Tüm talepler geçerli durumda" : `${invalidDurum.length} geçersiz durum`, technicalDetail: invalidDurum.length > 0 ? `[INVALID_DESTEK_STATUS] Tickets with invalid durum: ${invalidDurum.map((d: any) => `${d.talep_no}="${d.durum}"`).join(", ")}. Valid: ${validDurum.join(", ")}` : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 10. COMPANY (FİRMA) SYSTEM
  // ═══════════════════════════════════════════
  {
    const { data: firmalar } = await supabase.from("firmalar").select("id, slug, firma_unvani, user_id, onay_durumu, firma_turu_id, firma_tipi_id").limit(100);
    if (firmalar) {
      const slugs = firmalar.map((f: any) => f.slug).filter(Boolean);
      const uniqueSlugs = new Set(slugs).size === slugs.length;
      t({ group: "Firma Sistemi", name: "Firma Slug Benzersizlik", status: uniqueSlugs ? "pass" : "fail", detail: uniqueSlugs ? "Tüm firma slugları benzersiz" : "Tekrarlayan slug var!", technicalDetail: !uniqueSlugs ? `[DUPLICATE_FIRMA_SLUG] Duplicate slug values in firmalar. Trigger set_firma_slug() may be broken.` : undefined });

      const missingRequired = firmalar.filter((f: any) => !f.firma_unvani || !f.user_id || !f.firma_turu_id || !f.firma_tipi_id);
      t({ group: "Firma Sistemi", name: "Zorunlu Alan Kontrolü", status: missingRequired.length === 0 ? "pass" : "fail", detail: missingRequired.length === 0 ? "Tüm zorunlu alanlar dolu" : `${missingRequired.length} firma eksik bilgili`, technicalDetail: missingRequired.length > 0 ? `[MISSING_REQUIRED_FIELDS] ${missingRequired.length} firmalar rows missing required fields (firma_unvani, user_id, firma_turu_id, or firma_tipi_id). IDs: ${missingRequired.map((f: any) => f.id).join(", ")}` : undefined, solution: missingRequired.length > 0 ? `Complete missing fields via admin panel or SQL UPDATE.` : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 11. EDGE FUNCTIONS
  // ═══════════════════════════════════════════
  const edgeFunctions = [
    "admin-auth", "chatbot", "check-ihale-expiry", "check-subscription",
    "create-paytr-token", "paytr-callback", "send-email", "send-notification-sms",
    "send-password-reset", "send-sms-otp", "send-welcome-email",
    "verify-payment", "verify-sms-otp", "run-performance-test",
  ];

  for (const fn of edgeFunctions) {
    const s = start();
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: "OPTIONS",
        headers: { apikey: ANON_KEY },
      });
      const ms = elapsed(s);
      await res.text();
      t({ group: "Edge Functions", name: fn, status: res.status < 500 ? "pass" : "fail", detail: res.status < 500 ? `Erişilebilir (${ms}ms)` : `HTTP ${res.status}`, technicalDetail: res.status >= 500 ? `[EDGE_FN_ERROR] OPTIONS ${SUPABASE_URL}/functions/v1/${fn} → HTTP ${res.status}. Function may not be deployed or has runtime errors.` : undefined, solution: res.status >= 500 ? `Redeploy edge function "${fn}". Check function logs for runtime errors.` : undefined, durationMs: ms });
    } catch (e: any) {
      const ms = elapsed(s);
      t({ group: "Edge Functions", name: fn, status: "fail", detail: "Erişilemedi", technicalDetail: `[EDGE_FN_UNREACHABLE] Fetch to ${fn} threw: ${e.message}`, solution: `Verify edge function "${fn}" is deployed. Check supabase/functions/${fn}/index.ts exists.`, durationMs: ms });
    }
  }

  // ═══════════════════════════════════════════
  // 12. STORAGE BUCKETS
  // ═══════════════════════════════════════════
  const buckets = ["firma-images", "ihale-files", "urun-images", "chat-files", "sikayet-files", "firma-belgeler", "banners"];
  for (const bucket of buckets) {
    const s = start();
    const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });
    const ms = elapsed(s);
    t({ group: "Depolama (Storage)", name: bucket, status: error ? "fail" : "pass", detail: error ? "Bucket erişilemedi" : `Erişim başarılı (${ms}ms)`, technicalDetail: error ? `[STORAGE_ERROR] supabase.storage.from("${bucket}").list() failed: ${error.message}` : undefined, solution: error ? `Verify bucket "${bucket}" exists in storage. Check storage RLS policies.` : undefined, durationMs: ms });
  }

  // ═══════════════════════════════════════════
  // 13. DATA INTEGRITY
  // ═══════════════════════════════════════════
  {
    const { data: firmalar } = await supabase.from("firmalar").select("user_id").limit(500);
    if (firmalar && firmalar.length > 0) {
      const userIds = firmalar.map((f: any) => f.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id").in("user_id", userIds.slice(0, 100));
      const profileUserIds = new Set((profiles || []).map((p: any) => p.user_id));
      const orphan = userIds.slice(0, 100).filter((uid: string) => !profileUserIds.has(uid));
      t({ group: "Veri Bütünlüğü", name: "Firma-Profil Eşleşmesi", status: orphan.length === 0 ? "pass" : "warn", detail: orphan.length === 0 ? "Tüm firmaların profili var" : `${orphan.length} firmanın profili yok`, technicalDetail: orphan.length > 0 ? `[ORPHAN_FIRMA] ${orphan.length} firmalar rows have user_id with no matching profiles row. Orphan user_ids: ${orphan.slice(0, 5).join(", ")}${orphan.length > 5 ? "..." : ""}` : undefined, solution: orphan.length > 0 ? `Check register_user() RPC function. It should INSERT into both profiles and firmalar atomically. Manually fix: INSERT INTO profiles (user_id, ad, soyad) SELECT ... for missing users.` : undefined });
    }

    const { data: allFirmalar } = await supabase.from("firmalar").select("user_id").limit(500);
    if (allFirmalar && allFirmalar.length > 0) {
      const fUserIds = allFirmalar.map((f: any) => f.user_id);
      const { data: abonelikler } = await supabase.from("kullanici_abonelikler").select("user_id").in("user_id", fUserIds.slice(0, 100));
      const aUserIds = new Set((abonelikler || []).map((a: any) => a.user_id));
      const noSub = fUserIds.slice(0, 100).filter((uid: string) => !aUserIds.has(uid));
      t({ group: "Veri Bütünlüğü", name: "Firma-Abonelik Eşleşmesi", status: noSub.length === 0 ? "pass" : "warn", detail: noSub.length === 0 ? "Tüm firmaların aboneliği var" : `${noSub.length} firmanın aboneliği yok`, technicalDetail: noSub.length > 0 ? `[MISSING_SUBSCRIPTION] ${noSub.length} users have firmalar row but no kullanici_abonelikler row. The auto_assign_free_package trigger may not be firing. User IDs: ${noSub.slice(0, 5).join(", ")}${noSub.length > 5 ? "..." : ""}` : undefined, solution: noSub.length > 0 ? `Check auto_assign_free_package() trigger on firmalar table. Manual fix: INSERT INTO kullanici_abonelikler (user_id, paket_id, ...) SELECT ... for missing users.` : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 14. COMPLAINT SYSTEM
  // ═══════════════════════════════════════════
  {
    const { data, error } = await supabase.from("sikayetler").select("id, sikayet_no, durum, tur").limit(50);
    t({ group: "Şikayet Sistemi", name: "Şikayet Tablosu", status: error ? "fail" : "pass", detail: error ? "Erişilemedi" : `${data?.length || 0} şikayet kontrol edildi`, technicalDetail: error ? `[SIKAYET_ACCESS_ERROR] ${error.message}` : undefined });
  }

  // ═══════════════════════════════════════════
  // 15. BANNER & ADS
  // ═══════════════════════════════════════════
  {
    const { data, error } = await supabase.from("banners").select("id, aktif, sayfa, konum, gorsel_url").eq("aktif", true);
    t({ group: "Banner & Reklam", name: "Aktif Bannerlar", status: error ? "fail" : "pass", detail: error ? "Erişilemedi" : `${data?.length || 0} aktif banner`, technicalDetail: error ? `[BANNER_ACCESS_ERROR] ${error.message}` : undefined });

    if (data) {
      const noImage = data.filter((b: any) => !b.gorsel_url);
      t({ group: "Banner & Reklam", name: "Banner Görsel Kontrolü", status: noImage.length === 0 ? "pass" : "warn", detail: noImage.length === 0 ? "Tüm aktif bannerların görseli var" : `${noImage.length} aktif banner görselsiz`, technicalDetail: noImage.length > 0 ? `[MISSING_BANNER_IMAGE] ${noImage.length} active banners have NULL gorsel_url. IDs: ${noImage.map((b: any) => b.id).join(", ")}` : undefined, solution: noImage.length > 0 ? `Upload images via Admin Panel → Reklam section, or deactivate banners without images.` : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 16. CHATBOT
  // ═══════════════════════════════════════════
  {
    const { data: config, error } = await supabase.from("chatbot_config").select("anahtar, deger");
    t({ group: "Chatbot", name: "Chatbot Konfigürasyonu", status: error ? "fail" : (config?.length || 0) > 0 ? "pass" : "warn", detail: error ? "Erişilemedi" : `${config?.length || 0} ayar`, technicalDetail: error ? `[CHATBOT_CONFIG_ERROR] ${error.message}` : undefined });

    const { data: bilgi } = await supabase.from("chatbot_bilgi").select("id", { count: "exact", head: true });
    t({ group: "Chatbot", name: "Chatbot Bilgi Tabanı", status: bilgi !== null ? "pass" : "warn", detail: "Erişim kontrol edildi" });
  }

  // ═══════════════════════════════════════════
  // 17. ADMIN SYSTEM
  // ═══════════════════════════════════════════
  {
    const { data: admins, error } = await supabase.from("admin_users").select("id, username, is_primary").limit(10);
    t({ group: "Admin Sistemi", name: "Admin Kullanıcılar", status: error ? "fail" : "pass", detail: error ? "Erişilemedi" : `${admins?.length || 0} admin kullanıcı`, technicalDetail: error ? `[ADMIN_ACCESS_ERROR] ${error.message}` : undefined });

    if (admins) {
      const primaryCount = admins.filter((a: any) => a.is_primary).length;
      t({ group: "Admin Sistemi", name: "Primary Admin", status: primaryCount >= 1 ? "pass" : "fail", detail: primaryCount >= 1 ? `${primaryCount} primary admin` : "Primary admin bulunamadı!", technicalDetail: primaryCount === 0 ? `[NO_PRIMARY_ADMIN] No admin_users row with is_primary=true. The admin panel requires at least one primary admin.` : undefined, solution: primaryCount === 0 ? `SQL: UPDATE admin_users SET is_primary=true WHERE username='your_admin_username';` : undefined });
    }
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token) return json({ error: "Token gerekli" }, 401);
    try {
      const payload = JSON.parse(atob(token));
      if (payload.exp < Date.now()) return json({ error: "Token süresi dolmuş" }, 401);
    } catch {
      return json({ error: "Geçersiz token" }, 401);
    }

    const startTime = performance.now();
    const results = await runAllTests(supabase);
    const totalMs = Math.round(performance.now() - startTime);

    const pass = results.filter(r => r.status === "pass").length;
    const fail = results.filter(r => r.status === "fail").length;
    const warn = results.filter(r => r.status === "warn").length;

    return json({
      total: results.length,
      pass,
      fail,
      warn,
      durationMs: totalMs,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("Test suite error:", e);
    return json({ error: e.message }, 500);
  }
});
