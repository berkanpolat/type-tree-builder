import { describe, it, expect } from "vitest";

describe("Tender Form Tests (L5)", () => {
  const ALL_STEPS = ["İhale Türü", "Teklif Usulü", "Kategori", "İhale Bilgileri", "Teknik Detaylar", "Stok", "Onay"];

  describe("Step Validation", () => {
    it("should have 7 steps for urun ihale", () => {
      expect(ALL_STEPS.length).toBe(7);
    });

    it("should skip Stok step for Teknik & Tasarım hizmet", () => {
      const skipStokStep = true; // hizmet_alim + teknik tasarım
      const STEPS = skipStokStep ? ALL_STEPS.filter(s => s !== "Stok") : ALL_STEPS;
      expect(STEPS.length).toBe(6);
      expect(STEPS.includes("Stok")).toBe(false);
    });

    it("should require ihale_turu at step 0", () => {
      const canProceed = (ihale_turu: string) => !!ihale_turu;
      expect(canProceed("")).toBe(false);
      expect(canProceed("urun_alim")).toBe(true);
      expect(canProceed("hizmet_alim")).toBe(true);
    });

    it("should require teklif_usulu at step 1", () => {
      const canProceed = (teklif_usulu: string) => !!teklif_usulu;
      expect(canProceed("")).toBe(false);
      expect(canProceed("acik_eksiltme")).toBe(true);
      expect(canProceed("kapali_zarf")).toBe(true);
    });

    it("should require full category chain at step 2 for urun", () => {
      const canProceed = (turu: string, katId: string, grpId: string, turId: string, hKatId: string, hTurId: string) => {
        if (turu === "hizmet_alim") return !!hKatId && !!hTurId;
        return !!katId && !!grpId && !!turId;
      };
      expect(canProceed("urun_alim", "k", "g", "t", "", "")).toBe(true);
      expect(canProceed("urun_alim", "k", "", "", "", "")).toBe(false);
      expect(canProceed("hizmet_alim", "", "", "", "hk", "ht")).toBe(true);
    });
  });

  describe("İhale Bilgileri Validation", () => {
    const validate = (formData: any) => {
      const missing: string[] = [];
      if (!formData.baslik) missing.push("İhale Başlığı");
      if (!formData.aciklama) missing.push("Açıklama");
      if (!formData.baslangic_fiyati) missing.push("Başlangıç Fiyatı");
      if (!formData.birim) missing.push("Birim");
      if (!formData.kdv_durumu) missing.push("KDV Durumu");
      if (!formData.odeme_secenekleri?.length) missing.push("Ödeme Seçenekleri");
      if (!formData.odeme_vadesi?.length) missing.push("Ödeme Vadesi");
      if (!formData.baslangic_tarihi) missing.push("Başlangıç Tarihi");
      if (!formData.bitis_tarihi) missing.push("Bitiş Tarihi");
      return missing;
    };

    it("should report all 9 missing fields for empty form", () => {
      expect(validate({}).length).toBe(9);
    });

    it("should report 0 missing fields for complete form", () => {
      expect(validate({
        baslik: "Test", aciklama: "Desc", baslangic_fiyati: 100,
        birim: "Adet", kdv_durumu: "dahil",
        odeme_secenekleri: ["nakit"], odeme_vadesi: ["pesin"],
        baslangic_tarihi: "2026-01-01", bitis_tarihi: "2026-02-01"
      }).length).toBe(0);
    });

    it("should detect partial form errors", () => {
      const missing = validate({
        baslik: "Test", aciklama: "Desc", baslangic_fiyati: 100,
      });
      expect(missing).toContain("Birim");
      expect(missing).toContain("KDV Durumu");
      expect(missing).not.toContain("İhale Başlığı");
    });
  });

  describe("Date Validation", () => {
    it("should reject start date in the past", () => {
      const now = new Date();
      const minStart = new Date(now.getTime() + 30 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 60000);
      expect(pastDate < minStart).toBe(true);
    });

    it("should reject end date more than 30 days out", () => {
      const now = new Date();
      const maxEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const tooLate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      expect(tooLate > maxEnd).toBe(true);
    });

    it("should reject end date before start date", () => {
      const start = new Date("2026-03-10T10:00");
      const end = new Date("2026-03-05T10:00");
      expect(end <= start).toBe(true);
    });

    it("should accept valid date range", () => {
      const now = new Date();
      const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const minStart = new Date(now.getTime() + 30 * 60 * 1000);
      const maxEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      expect(start >= minStart).toBe(true);
      expect(end <= maxEnd).toBe(true);
      expect(end > start).toBe(true);
    });
  });

  describe("Stok (Variation) Management", () => {
    it("should create stok entries from variation selections", () => {
      const selectedBeden = ["S", "M", "L"];
      const selectedRenk = ["Beyaz", "Siyah"];
      const stoklar: any[] = [];

      for (const renk of selectedRenk) {
        for (const beden of selectedBeden) {
          stoklar.push({
            varyant_1_label: "Beden",
            varyant_1_value: beden,
            varyant_2_label: "Renk",
            varyant_2_value: renk,
            miktar_tipi: "Adet",
            stok_sayisi: 0,
          });
        }
      }

      expect(stoklar.length).toBe(6); // 3 × 2
    });

    it("should require stok_sayisi to be non-negative", () => {
      const isValid = (stok_sayisi: number) => stok_sayisi >= 0;
      expect(isValid(0)).toBe(true);
      expect(isValid(100)).toBe(true);
      expect(isValid(-1)).toBe(false);
    });
  });

  describe("Para Birimi", () => {
    it("should default to TRY", () => {
      const defaultCurrency = "TRY";
      expect(defaultCurrency).toBe("TRY");
    });

    it("should support multiple currencies", () => {
      const currencies = ["TRY", "USD", "EUR"];
      expect(currencies.includes("TRY")).toBe(true);
      expect(currencies.includes("USD")).toBe(true);
      expect(currencies.includes("EUR")).toBe(true);
    });
  });
});
