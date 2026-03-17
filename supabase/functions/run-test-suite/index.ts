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
  // 1. VERİTABANI BAĞLANTISI & TABLOLAR
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
      t({ group: "Veritabanı Tabloları", name: `${table}`, status: "fail", detail: `Tablo erişilemedi`, technicalDetail: `SELECT error: ${error.message} (code: ${error.code})`, solution: `Tablonun var olduğunu ve RLS politikalarının doğru olduğunu kontrol edin. Service role ile test ediliyor, bu hata tablo yoksa oluşur.`, durationMs: ms });
    } else {
      t({ group: "Veritabanı Tabloları", name: `${table}`, status: ms > 2000 ? "warn" : "pass", detail: `${count ?? 0} kayıt, ${ms}ms`, technicalDetail: ms > 2000 ? `Yanıt süresi yüksek: ${ms}ms` : undefined, solution: ms > 2000 ? "Index eksik olabilir veya tablo çok büyük." : undefined, durationMs: ms });
    }
  }

  // ═══════════════════════════════════════════
  // 2. VERİTABANI FONKSİYONLARI (RPC)
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
      t({ group: "Veritabanı Fonksiyonları", name: rpc.name, status: "fail", detail: `RPC çalışmadı`, technicalDetail: `rpc("${rpc.name}") error: ${error.message}`, solution: `Fonksiyonun CREATE OR REPLACE ile güncel olduğundan ve parametre tiplerinin doğru olduğundan emin olun.`, durationMs: ms });
    } else {
      t({ group: "Veritabanı Fonksiyonları", name: rpc.name, status: "pass", detail: `Başarılı (${ms}ms)`, durationMs: ms });
    }
  }

  // ═══════════════════════════════════════════
  // 3. AUTH SİSTEMİ
  // ═══════════════════════════════════════════
  {
    const s = start();
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: ANON_KEY } });
    const ms = elapsed(s);
    const body = await res.text();
    t({ group: "Kimlik Doğrulama", name: "Auth Health Check", status: res.ok ? "pass" : "fail", detail: res.ok ? `Auth servisi çalışıyor (${ms}ms)` : "Auth servisi erişilemedi", technicalDetail: !res.ok ? `Status: ${res.status}, Body: ${body.substring(0, 200)}` : undefined, solution: !res.ok ? "Supabase Auth servisini kontrol edin." : undefined, durationMs: ms });
  }

  // Kayıt duplikasyon kontrolü
  {
    const s = start();
    const { data, error } = await supabase.rpc("check_registration_duplicate", { p_email: "test-nonexist@test.test", p_phone: "5559999999" });
    const ms = elapsed(s);
    if (error) {
      t({ group: "Kimlik Doğrulama", name: "Duplikasyon Kontrolü", status: "fail", detail: "Kayıt duplikasyon kontrolü çalışmıyor", technicalDetail: error.message, solution: "check_registration_duplicate fonksiyonunu kontrol edin.", durationMs: ms });
    } else {
      const isValid = data && typeof data.email_exists === "boolean" && typeof data.phone_exists === "boolean";
      t({ group: "Kimlik Doğrulama", name: "Duplikasyon Kontrolü", status: isValid ? "pass" : "warn", detail: isValid ? `Çalışıyor (${ms}ms)` : "Beklenmeyen format", technicalDetail: !isValid ? `Dönen veri: ${JSON.stringify(data)}` : undefined, durationMs: ms });
    }
  }

  // ═══════════════════════════════════════════
  // 4. İHALE SİSTEMİ
  // ═══════════════════════════════════════════
  {
    // İhale numarası benzersizliği
    const s = start();
    const { data, error } = await supabase.from("ihaleler").select("ihale_no").limit(100);
    const ms = elapsed(s);
    if (error) {
      t({ group: "İhale Sistemi", name: "İhale Listesi Erişim", status: "fail", detail: "İhaleler tablosuna erişilemedi", technicalDetail: error.message, solution: "ihaleler tablosu RLS politikalarını kontrol edin.", durationMs: ms });
    } else {
      const nos = data?.map((d: any) => d.ihale_no) || [];
      const unique = new Set(nos).size === nos.length;
      t({ group: "İhale Sistemi", name: "İhale No Benzersizlik", status: unique ? "pass" : "fail", detail: unique ? `${nos.length} ihale numarası benzersiz` : "Tekrarlayan ihale numaraları var!", technicalDetail: !unique ? "generate_ihale_no trigger'ı kontrol edilmeli" : undefined, solution: !unique ? "generate_ihale_no() fonksiyonundaki UNIQUE kontrolünü gözden geçirin." : undefined, durationMs: ms });
    }
  }

  {
    // İhale durum geçişleri
    const { data: ihaleler } = await supabase.from("ihaleler").select("id, durum, baslangic_tarihi, bitis_tarihi, baslik, ihale_no, teklif_usulu").limit(50);
    const durumlar = ["duzenleniyor", "onay_bekliyor", "devam_ediyor", "tamamlandi", "reddedildi", "iptal"];
    const invalidDurum = (ihaleler || []).filter((i: any) => !durumlar.includes(i.durum));
    t({ group: "İhale Sistemi", name: "Durum Geçerliliği", status: invalidDurum.length === 0 ? "pass" : "fail", detail: invalidDurum.length === 0 ? "Tüm ihalelerin durumu geçerli" : `${invalidDurum.length} ihale geçersiz durumda`, technicalDetail: invalidDurum.length > 0 ? `Geçersiz durumlar: ${invalidDurum.map((i: any) => `${i.ihale_no}:${i.durum}`).join(", ")}` : undefined, solution: invalidDurum.length > 0 ? "Manuel olarak durum düzeltmesi yapın." : undefined });

    // Süresi dolmuş ama hâlâ devam_ediyor
    const now = new Date().toISOString();
    const expired = (ihaleler || []).filter((i: any) => i.durum === "devam_ediyor" && i.bitis_tarihi && i.bitis_tarihi < now);
    t({ group: "İhale Sistemi", name: "Süre Dolmuş İhaleler", status: expired.length === 0 ? "pass" : "warn", detail: expired.length === 0 ? "Süresi dolmuş aktif ihale yok" : `${expired.length} ihale süresi dolmuş ama hâlâ aktif`, technicalDetail: expired.length > 0 ? `İhale No'lar: ${expired.map((i: any) => i.ihale_no).join(", ")}` : undefined, solution: expired.length > 0 ? "check-ihale-expiry edge function'ı veya auto_complete_expired_ihaleler trigger'ını kontrol edin." : undefined });
  }

  {
    // İhale teklif bütünlüğü
    const { data: teklifler } = await supabase.from("ihale_teklifler").select("id, ihale_id, tutar, teklif_veren_user_id").limit(100);
    const invalidTeklifler = (teklifler || []).filter((t: any) => !t.tutar || t.tutar <= 0);
    t({ group: "İhale Sistemi", name: "Teklif Tutarları", status: invalidTeklifler.length === 0 ? "pass" : "fail", detail: invalidTeklifler.length === 0 ? "Tüm teklifler geçerli tutarda" : `${invalidTeklifler.length} teklif geçersiz tutarda`, technicalDetail: invalidTeklifler.length > 0 ? `IDs: ${invalidTeklifler.map((t: any) => t.id).join(", ")}` : undefined, solution: invalidTeklifler.length > 0 ? "Teklif validasyonunu frontend ve backend tarafında kontrol edin." : undefined });
  }

  // ═══════════════════════════════════════════
  // 5. ÜRÜN SİSTEMİ
  // ═══════════════════════════════════════════
  {
    const s = start();
    const { data: urunler, error } = await supabase.from("urunler").select("id, durum, baslik, urun_no, slug").limit(100);
    const ms = elapsed(s);
    if (error) {
      t({ group: "Ürün Sistemi", name: "Ürün Listesi Erişim", status: "fail", detail: "Ürünler tablosuna erişilemedi", technicalDetail: error.message, durationMs: ms });
    } else {
      t({ group: "Ürün Sistemi", name: "Ürün Listesi Erişim", status: "pass", detail: `${urunler?.length || 0} ürün erişildi (${ms}ms)`, durationMs: ms });

      // Slug benzersizliği
      const slugs = (urunler || []).map((u: any) => u.slug).filter(Boolean);
      const uniqueSlugs = new Set(slugs).size === slugs.length;
      t({ group: "Ürün Sistemi", name: "Ürün Slug Benzersizlik", status: uniqueSlugs ? "pass" : "fail", detail: uniqueSlugs ? "Tüm sluglar benzersiz" : "Tekrarlayan ürün slug'ları var!", solution: !uniqueSlugs ? "set_urun_slug trigger'ını kontrol edin." : undefined });

      // Urun no benzersizliği
      const nos = (urunler || []).map((u: any) => u.urun_no).filter(Boolean);
      const uniqueNos = new Set(nos).size === nos.length;
      t({ group: "Ürün Sistemi", name: "Ürün No Benzersizlik", status: uniqueNos ? "pass" : "fail", detail: uniqueNos ? "Tüm ürün numaraları benzersiz" : "Tekrarlayan ürün numaraları var!" });

      // Durum kontrolü
      const validDurumlar = ["duzenleniyor", "onay_bekliyor", "aktif", "reddedildi", "pasif"];
      const invalidUrunDurum = (urunler || []).filter((u: any) => !validDurumlar.includes(u.durum));
      t({ group: "Ürün Sistemi", name: "Ürün Durum Geçerliliği", status: invalidUrunDurum.length === 0 ? "pass" : "fail", detail: invalidUrunDurum.length === 0 ? "Tüm ürünlerin durumu geçerli" : `${invalidUrunDurum.length} ürün geçersiz durumda` });
    }
  }

  // ═══════════════════════════════════════════
  // 6. PAKET & ABONELİK SİSTEMİ
  // ═══════════════════════════════════════════
  {
    const { data: paketler, error } = await supabase.from("paketler").select("id, ad, slug, fiyat_aylik, fiyat_yillik");
    if (error) {
      t({ group: "Paket Sistemi", name: "Paket Tanımları", status: "fail", detail: "Paketler tablosuna erişilemedi", technicalDetail: error.message });
    } else {
      t({ group: "Paket Sistemi", name: "Paket Tanımları", status: (paketler?.length || 0) > 0 ? "pass" : "fail", detail: `${paketler?.length || 0} paket tanımlı` });

      const freePackage = (paketler || []).find((p: any) => p.slug === "ucretsiz");
      t({ group: "Paket Sistemi", name: "Ücretsiz Paket", status: freePackage ? "pass" : "fail", detail: freePackage ? "Ücretsiz paket mevcut" : "Ücretsiz paket bulunamadı!", solution: !freePackage ? "paketler tablosuna slug='ucretsiz' olan bir paket ekleyin." : undefined });
    }

    // Abonelik bütünlüğü
    const { data: abonelikler } = await supabase.from("kullanici_abonelikler").select("id, user_id, paket_id, durum").limit(100);
    const aktifAbonelikler = (abonelikler || []).filter((a: any) => a.durum === "aktif");
    // Check for users with multiple active subscriptions
    const userAbonelikMap: Record<string, number> = {};
    aktifAbonelikler.forEach((a: any) => { userAbonelikMap[a.user_id] = (userAbonelikMap[a.user_id] || 0) + 1; });
    const multiActive = Object.entries(userAbonelikMap).filter(([_, count]) => count > 1);
    t({ group: "Paket Sistemi", name: "Çoklu Aktif Abonelik", status: multiActive.length === 0 ? "pass" : "warn", detail: multiActive.length === 0 ? "Her kullanıcının tek aktif aboneliği var" : `${multiActive.length} kullanıcının birden fazla aktif aboneliği var`, solution: multiActive.length > 0 ? "kullanici_abonelikler tablosunda mükerrer kayıtları temizleyin." : undefined });
  }

  // ═══════════════════════════════════════════
  // 7. MESAJLAŞMA SİSTEMİ
  // ═══════════════════════════════════════════
  {
    const s = start();
    const { error: convErr } = await supabase.from("conversations").select("id", { count: "exact", head: true });
    const ms = elapsed(s);
    t({ group: "Mesajlaşma", name: "Sohbetler Tablosu", status: convErr ? "fail" : "pass", detail: convErr ? "conversations tablosu erişilemedi" : `Erişim başarılı (${ms}ms)`, technicalDetail: convErr?.message, durationMs: ms });

    const { error: msgErr } = await supabase.from("messages").select("id", { count: "exact", head: true });
    t({ group: "Mesajlaşma", name: "Mesajlar Tablosu", status: msgErr ? "fail" : "pass", detail: msgErr ? "messages tablosu erişilemedi" : "Erişim başarılı", technicalDetail: msgErr?.message });

    // get_or_create_conversation RPC
    const { error: rpcErr } = await supabase.rpc("get_or_create_conversation", { p_user1: "00000000-0000-0000-0000-000000000001", p_user2: "00000000-0000-0000-0000-000000000002" });
    // This will likely fail with FK constraint but the function itself should exist
    t({ group: "Mesajlaşma", name: "Sohbet Oluşturma RPC", status: rpcErr && rpcErr.message?.includes("violates foreign key") ? "pass" : rpcErr ? "warn" : "pass", detail: !rpcErr || rpcErr.message?.includes("violates foreign key") ? "RPC fonksiyonu çalışıyor" : "RPC hatası", technicalDetail: rpcErr && !rpcErr.message?.includes("violates foreign key") ? rpcErr.message : undefined });
  }

  // ═══════════════════════════════════════════
  // 8. BİLDİRİM SİSTEMİ
  // ═══════════════════════════════════════════
  {
    const { data, error } = await supabase.from("notifications").select("id, type", { count: "exact", head: false }).limit(10);
    t({ group: "Bildirimler", name: "Bildirim Tablosu", status: error ? "fail" : "pass", detail: error ? "notifications tablosu erişilemedi" : "Erişim başarılı", technicalDetail: error?.message });

    // Check notification types
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
      t({ group: "Bildirimler", name: "Bildirim Tip Kontrolü", status: invalidTypes.length === 0 ? "pass" : "warn", detail: invalidTypes.length === 0 ? "Tüm bildirim tipleri geçerli" : `${invalidTypes.length} bilinmeyen bildirim tipi`, technicalDetail: invalidTypes.length > 0 ? `Bilinmeyen tipler: ${[...new Set(invalidTypes)].join(", ")}` : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 9. DESTEK SİSTEMİ
  // ═══════════════════════════════════════════
  {
    const { data, error } = await supabase.from("destek_talepleri").select("id, durum, talep_no").limit(50);
    t({ group: "Destek Sistemi", name: "Destek Talepleri", status: error ? "fail" : "pass", detail: error ? "Erişilemedi" : `${data?.length || 0} talep kontrol edildi`, technicalDetail: error?.message });

    if (data) {
      const validDurum = ["acik", "cevaplandi", "cozuldu", "beklemede"];
      const invalidDurum = data.filter((d: any) => !validDurum.includes(d.durum));
      t({ group: "Destek Sistemi", name: "Talep Durumları", status: invalidDurum.length === 0 ? "pass" : "warn", detail: invalidDurum.length === 0 ? "Tüm talepler geçerli durumda" : `${invalidDurum.length} geçersiz durum`, technicalDetail: invalidDurum.length > 0 ? `No'lar: ${invalidDurum.map((d: any) => d.talep_no).join(", ")}` : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 10. FİRMA SİSTEMİ
  // ═══════════════════════════════════════════
  {
    const { data: firmalar } = await supabase.from("firmalar").select("id, slug, firma_unvani, user_id, onay_durumu, firma_turu_id, firma_tipi_id").limit(100);
    if (firmalar) {
      // Slug kontrolü
      const slugs = firmalar.map((f: any) => f.slug).filter(Boolean);
      const uniqueSlugs = new Set(slugs).size === slugs.length;
      t({ group: "Firma Sistemi", name: "Firma Slug Benzersizlik", status: uniqueSlugs ? "pass" : "fail", detail: uniqueSlugs ? "Tüm firma slugları benzersiz" : "Tekrarlayan slug var!" });

      // Zorunlu alan kontrolü
      const missingRequired = firmalar.filter((f: any) => !f.firma_unvani || !f.user_id || !f.firma_turu_id || !f.firma_tipi_id);
      t({ group: "Firma Sistemi", name: "Zorunlu Alan Kontrolü", status: missingRequired.length === 0 ? "pass" : "fail", detail: missingRequired.length === 0 ? "Tüm zorunlu alanlar dolu" : `${missingRequired.length} firma eksik bilgili`, solution: missingRequired.length > 0 ? "Eksik firma bilgilerini tamamlayın." : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 11. EDGE FUNCTION'LAR
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
      t({ group: "Edge Functions", name: fn, status: res.status < 500 ? "pass" : "fail", detail: res.status < 500 ? `Erişilebilir (${ms}ms)` : `HTTP ${res.status}`, technicalDetail: res.status >= 500 ? `OPTIONS ${SUPABASE_URL}/functions/v1/${fn} → ${res.status}` : undefined, solution: res.status >= 500 ? "Edge function deploy durumunu kontrol edin." : undefined, durationMs: ms });
    } catch (e: any) {
      const ms = elapsed(s);
      t({ group: "Edge Functions", name: fn, status: "fail", detail: "Erişilemedi", technicalDetail: e.message, solution: "Edge function'ın deploy edildiğinden emin olun.", durationMs: ms });
    }
  }

  // ═══════════════════════════════════════════
  // 12. STORAGE BUCKET'LAR
  // ═══════════════════════════════════════════
  const buckets = ["firma-images", "ihale-files", "urun-images", "chat-files", "sikayet-files", "firma-belgeler", "banners"];
  for (const bucket of buckets) {
    const s = start();
    const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });
    const ms = elapsed(s);
    t({ group: "Depolama (Storage)", name: bucket, status: error ? "fail" : "pass", detail: error ? "Bucket erişilemedi" : `Erişim başarılı (${ms}ms)`, technicalDetail: error?.message, solution: error ? "Storage bucket ayarlarını ve RLS politikalarını kontrol edin." : undefined, durationMs: ms });
  }

  // ═══════════════════════════════════════════
  // 13. VERİ BÜTÜNLÜĞÜ
  // ═══════════════════════════════════════════
  {
    // Profilleri olmayan firmalar
    const { data: firmalar } = await supabase.from("firmalar").select("user_id").limit(500);
    if (firmalar && firmalar.length > 0) {
      const userIds = firmalar.map((f: any) => f.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id").in("user_id", userIds.slice(0, 100));
      const profileUserIds = new Set((profiles || []).map((p: any) => p.user_id));
      const orphan = userIds.slice(0, 100).filter((uid: string) => !profileUserIds.has(uid));
      t({ group: "Veri Bütünlüğü", name: "Firma-Profil Eşleşmesi", status: orphan.length === 0 ? "pass" : "warn", detail: orphan.length === 0 ? "Tüm firmaların profili var" : `${orphan.length} firmanın profili yok`, solution: orphan.length > 0 ? "register_user RPC fonksiyonunu kontrol edin; profil oluşturma akışını gözden geçirin." : undefined });
    }

    // Aboneliği olmayan firmalar
    const { data: allFirmalar } = await supabase.from("firmalar").select("user_id").limit(500);
    if (allFirmalar && allFirmalar.length > 0) {
      const fUserIds = allFirmalar.map((f: any) => f.user_id);
      const { data: abonelikler } = await supabase.from("kullanici_abonelikler").select("user_id").in("user_id", fUserIds.slice(0, 100));
      const aUserIds = new Set((abonelikler || []).map((a: any) => a.user_id));
      const noSub = fUserIds.slice(0, 100).filter((uid: string) => !aUserIds.has(uid));
      t({ group: "Veri Bütünlüğü", name: "Firma-Abonelik Eşleşmesi", status: noSub.length === 0 ? "pass" : "warn", detail: noSub.length === 0 ? "Tüm firmaların aboneliği var" : `${noSub.length} firmanın aboneliği yok`, solution: noSub.length > 0 ? "auto_assign_free_package trigger'ını kontrol edin." : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 14. ŞİKAYET SİSTEMİ
  // ═══════════════════════════════════════════
  {
    const { data, error } = await supabase.from("sikayetler").select("id, sikayet_no, durum, tur").limit(50);
    t({ group: "Şikayet Sistemi", name: "Şikayet Tablosu", status: error ? "fail" : "pass", detail: error ? "Erişilemedi" : `${data?.length || 0} şikayet kontrol edildi`, technicalDetail: error?.message });
  }

  // ═══════════════════════════════════════════
  // 15. BANNER & REKLAM
  // ═══════════════════════════════════════════
  {
    const { data, error } = await supabase.from("banners").select("id, aktif, sayfa, konum, gorsel_url").eq("aktif", true);
    t({ group: "Banner & Reklam", name: "Aktif Bannerlar", status: error ? "fail" : "pass", detail: error ? "Erişilemedi" : `${data?.length || 0} aktif banner`, technicalDetail: error?.message });

    // Görseli olmayan aktif bannerlar
    if (data) {
      const noImage = data.filter((b: any) => !b.gorsel_url);
      t({ group: "Banner & Reklam", name: "Banner Görsel Kontrolü", status: noImage.length === 0 ? "pass" : "warn", detail: noImage.length === 0 ? "Tüm aktif bannerların görseli var" : `${noImage.length} aktif banner görselsiz`, solution: noImage.length > 0 ? "Yönetim paneli → Reklam bölümünden görselleri yükleyin." : undefined });
    }
  }

  // ═══════════════════════════════════════════
  // 16. CHATBOT
  // ═══════════════════════════════════════════
  {
    const { data: config, error } = await supabase.from("chatbot_config").select("anahtar, deger");
    t({ group: "Chatbot", name: "Chatbot Konfigürasyonu", status: error ? "fail" : (config?.length || 0) > 0 ? "pass" : "warn", detail: error ? "Erişilemedi" : `${config?.length || 0} ayar`, technicalDetail: error?.message });

    const { data: bilgi } = await supabase.from("chatbot_bilgi").select("id", { count: "exact", head: true });
    t({ group: "Chatbot", name: "Chatbot Bilgi Tabanı", status: bilgi !== null ? "pass" : "warn", detail: "Erişim kontrol edildi" });
  }

  // ═══════════════════════════════════════════
  // 17. ADMIN SİSTEMİ
  // ═══════════════════════════════════════════
  {
    const { data: admins, error } = await supabase.from("admin_users").select("id, username, is_primary").limit(10);
    t({ group: "Admin Sistemi", name: "Admin Kullanıcılar", status: error ? "fail" : "pass", detail: error ? "Erişilemedi" : `${admins?.length || 0} admin kullanıcı`, technicalDetail: error?.message });

    // Primary admin kontrolü
    if (admins) {
      const primaryCount = admins.filter((a: any) => a.is_primary).length;
      t({ group: "Admin Sistemi", name: "Primary Admin", status: primaryCount >= 1 ? "pass" : "fail", detail: primaryCount >= 1 ? `${primaryCount} primary admin` : "Primary admin bulunamadı!", solution: primaryCount === 0 ? "admin_users tablosunda en az bir is_primary=true kullanıcı olmalı." : undefined });
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

    // Verify admin token
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
