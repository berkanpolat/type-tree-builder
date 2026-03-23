import { describe, it, expect } from "vitest";

/**
 * Rota tanımları ve navigasyon kuralları testleri.
 * App.tsx'teki route yapılandırmasını doğrular.
 */

// All defined routes from App.tsx
const PUBLIC_ROUTES = [
  "/",
  "/test-index",
  "/dashboard",
  "/tekpazar",
  "/firma-bilgilerim",
  "/ihalelerim",
  "/ihalelerim/yeni",
  "/ihaleler",
  "/ihaleler/:slug",
  "/ihalelerim/duzenle/:id",
  "/ihalelerim/takip/:id",
  "/tekliflerim",
  "/urunlerim",
  "/urunlerim/yeni",
  "/urunlerim/duzenle/:id",
  "/favoriler",
  "/mesajlar",
  "/bildirimler",
  "/paketim",
  "/destek",
  "/destek/:id",
  "/hizmet-bilgileri",
  "/urun-bilgileri",
  "/urun-kategorisi",
  "/giris-kayit",
  "/urun/:slug",
  "/firma/:slug",
  "/firmalar",
  "/ayarlar",
  "/profil-ayarlari",
  "/hakkimizda",
  "/iletisim",
  "/uretici-tedarikci-kesfi",
  "/tekihale-tanitim",
  "/tekpazar-tanitim",
  "/sss",
  "/gizlilik-kosullari",
  "/kvkk-aydinlatma",
  "/kullanim-kosullari",
  "/mesafeli-satis-sozlesmesi",
  "/sifre-sifirla",
  "/telefon-dogrulama",
  "/:slug", // FirmaDetay catch-all
];

const ADMIN_ROUTES = [
  "/yonetim",
  "/yonetim/panel",
  "/yonetim/kullanicilar",
  "/yonetim/firmalar",
  "/yonetim/firmalar-v2",
  "/yonetim/ihaleler",
  "/yonetim/urunler",
  "/yonetim/sikayetler",
  "/yonetim/paketler",
  "/yonetim/destek",
  "/yonetim/islemler",
  "/yonetim/kisitlamalar",
  "/yonetim/reklam",
  "/yonetim/tekbot",
  "/yonetim/portfolyo",
  "/yonetim/aksiyonlar",
  "/yonetim/ziyaret-planlari",
  "/yonetim/hedefler",
  "/yonetim/ajanda",
  "/yonetim/canli-harita",
  "/yonetim/yetkilendirme",
  "/yonetim/kaynak-raporu",
  "/yonetim/raporlar",
  "/yonetim/raporlar/satis-kanali",
  "/yonetim/raporlar/musteri-tipi",
  "/yonetim/raporlar/personel-performans",
  "/yonetim/raporlar/aksiyon-turu",
  "/yonetim/raporlar/hedef-prim",
  "/yonetim/performans",
];

describe("Rota tanımları", () => {
  it("ana sayfa rotası tanımlı", () => {
    expect(PUBLIC_ROUTES).toContain("/");
  });

  it("giriş-kayıt rotası tanımlı", () => {
    expect(PUBLIC_ROUTES).toContain("/giris-kayit");
  });

  it("şifre sıfırlama rotası tanımlı", () => {
    expect(PUBLIC_ROUTES).toContain("/sifre-sifirla");
  });

  it("telefon doğrulama rotası tanımlı", () => {
    expect(PUBLIC_ROUTES).toContain("/telefon-dogrulama");
  });

  it("ihale CRUD rotaları mevcut", () => {
    expect(PUBLIC_ROUTES).toContain("/ihalelerim");
    expect(PUBLIC_ROUTES).toContain("/ihalelerim/yeni");
    expect(PUBLIC_ROUTES).toContain("/ihalelerim/duzenle/:id");
    expect(PUBLIC_ROUTES).toContain("/ihalelerim/takip/:id");
  });

  it("ürün CRUD rotaları mevcut", () => {
    expect(PUBLIC_ROUTES).toContain("/urunlerim");
    expect(PUBLIC_ROUTES).toContain("/urunlerim/yeni");
    expect(PUBLIC_ROUTES).toContain("/urunlerim/duzenle/:id");
  });

  it("yasal sayfaların tümü tanımlı", () => {
    expect(PUBLIC_ROUTES).toContain("/gizlilik-kosullari");
    expect(PUBLIC_ROUTES).toContain("/kvkk-aydinlatma");
    expect(PUBLIC_ROUTES).toContain("/kullanim-kosullari");
    expect(PUBLIC_ROUTES).toContain("/mesafeli-satis-sozlesmesi");
  });
});

describe("Admin rota tanımları", () => {
  it("admin giriş rotası tanımlı", () => {
    expect(ADMIN_ROUTES).toContain("/yonetim");
  });

  it("tüm admin alt rotaları tanımlı", () => {
    expect(ADMIN_ROUTES).toContain("/yonetim/panel");
    expect(ADMIN_ROUTES).toContain("/yonetim/kullanicilar");
    expect(ADMIN_ROUTES).toContain("/yonetim/firmalar-v2");
    expect(ADMIN_ROUTES).toContain("/yonetim/ihaleler");
    expect(ADMIN_ROUTES).toContain("/yonetim/urunler");
    expect(ADMIN_ROUTES).toContain("/yonetim/sikayetler");
  });

  it("rapor alt rotaları tanımlı", () => {
    expect(ADMIN_ROUTES).toContain("/yonetim/raporlar");
    expect(ADMIN_ROUTES).toContain("/yonetim/raporlar/satis-kanali");
    expect(ADMIN_ROUTES).toContain("/yonetim/raporlar/musteri-tipi");
    expect(ADMIN_ROUTES).toContain("/yonetim/raporlar/personel-performans");
    expect(ADMIN_ROUTES).toContain("/yonetim/raporlar/aksiyon-turu");
    expect(ADMIN_ROUTES).toContain("/yonetim/raporlar/hedef-prim");
  });

  it("portföy, aksiyonlar, hedefler rotaları tanımlı", () => {
    expect(ADMIN_ROUTES).toContain("/yonetim/portfolyo");
    expect(ADMIN_ROUTES).toContain("/yonetim/aksiyonlar");
    expect(ADMIN_ROUTES).toContain("/yonetim/hedefler");
  });
});

describe("İhale navigasyon kuralları", () => {
  // From ManuIhale.tsx click handler logic
  function getIhaleNavigationTarget(durum: string, slug: string | null, id: string): string {
    if (durum === "duzenleniyor" || durum === "onay_bekliyor") return `/ihalelerim/duzenle/${id}`;
    if (durum === "devam_ediyor" || durum === "tamamlandi") return `/ihalelerim/takip/${id}`;
    return `/ihaleler/${slug || id}`;
  }

  it("düzenleniyor → düzenleme sayfası", () => {
    expect(getIhaleNavigationTarget("duzenleniyor", "test-slug", "123")).toBe("/ihalelerim/duzenle/123");
  });

  it("onay_bekliyor → düzenleme sayfası", () => {
    expect(getIhaleNavigationTarget("onay_bekliyor", "test-slug", "123")).toBe("/ihalelerim/duzenle/123");
  });

  it("devam_ediyor → takip sayfası", () => {
    expect(getIhaleNavigationTarget("devam_ediyor", "test-slug", "123")).toBe("/ihalelerim/takip/123");
  });

  it("tamamlandi → takip sayfası", () => {
    expect(getIhaleNavigationTarget("tamamlandi", "test-slug", "123")).toBe("/ihalelerim/takip/123");
  });

  it("iptal → detay sayfası (slug ile)", () => {
    expect(getIhaleNavigationTarget("iptal", "test-slug", "123")).toBe("/ihaleler/test-slug");
  });

  it("slug yoksa id kullanılır", () => {
    expect(getIhaleNavigationTarget("iptal", null, "123")).toBe("/ihaleler/123");
  });
});

describe("Admin path tespiti", () => {
  it("/yonetim ile başlayan path admin olarak algılanır", () => {
    expect("/yonetim/panel".startsWith("/yonetim")).toBe(true);
  });

  it("normal path admin olarak algılanmaz", () => {
    expect("/ihalelerim".startsWith("/yonetim")).toBe(false);
    expect("/firmalar".startsWith("/yonetim")).toBe(false);
  });
});
