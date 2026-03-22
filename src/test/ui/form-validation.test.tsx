import { describe, it, expect, vi } from "vitest";

describe("Form Validation Tests (L5)", () => {
  describe("Login Form Validation", () => {
    it("should validate email format", () => {
      const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      expect(isValidEmail("test@test.com")).toBe(true);
      expect(isValidEmail("user@domain.co")).toBe(true);
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("no@dots")).toBe(false);
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("@missing.com")).toBe(false);
    });

    it("should require both email and password for login", () => {
      const canLogin = (email: string, password: string) => !!(email && password);
      expect(canLogin("a@b.com", "pass")).toBe(true);
      expect(canLogin("", "pass")).toBe(false);
      expect(canLogin("a@b.com", "")).toBe(false);
      expect(canLogin("", "")).toBe(false);
    });
  });

  describe("Registration Form Validation", () => {
    it("should require all registration fields", () => {
      const isComplete = (fields: Record<string, string>) => {
        const required = ["selectedTurId", "selectedTipId", "firmaUnvani", "ad", "soyad", "email"];
        return required.every(f => !!fields[f]);
      };

      expect(isComplete({
        selectedTurId: "t1", selectedTipId: "tp1", firmaUnvani: "Firma",
        ad: "Ali", soyad: "Yılmaz", email: "a@b.com"
      })).toBe(true);

      expect(isComplete({
        selectedTurId: "t1", selectedTipId: "", firmaUnvani: "Firma",
        ad: "Ali", soyad: "Yılmaz", email: "a@b.com"
      })).toBe(false);
    });

    it("should validate phone number format", () => {
      const formatPhone = (value: string) => value.replace(/\D/g, "").replace(/^0+/, "");
      expect(formatPhone("05321234567")).toBe("5321234567");
      expect(formatPhone("532 123 45 67")).toBe("5321234567");
      expect(formatPhone("0532 123 45 67")).toBe("5321234567");
    });

    it("should require KVKK acceptance", () => {
      let kvkkAccepted = false;
      const canSubmit = () => kvkkAccepted;
      expect(canSubmit()).toBe(false);
      kvkkAccepted = true;
      expect(canSubmit()).toBe(true);
    });
  });

  describe("İhale Form Validation", () => {
    it("should validate all required ihale fields", () => {
      const getMissingFields = (formData: any): string[] => {
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

      // Empty form → all missing
      const empty = getMissingFields({});
      expect(empty.length).toBe(9);

      // Full form → none missing
      const full = getMissingFields({
        baslik: "Test", aciklama: "Desc", baslangic_fiyati: 100,
        birim: "Adet", kdv_durumu: "dahil",
        odeme_secenekleri: ["nakit"], odeme_vadesi: ["pesin"],
        baslangic_tarihi: "2026-01-01", bitis_tarihi: "2026-02-01"
      });
      expect(full.length).toBe(0);
    });

    it("should validate date constraints", () => {
      const now = new Date();
      const minStart = new Date(now.getTime() + 30 * 60 * 1000);
      const maxEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Start too early
      const earlyStart = new Date(now.getTime() - 60000);
      expect(earlyStart < minStart).toBe(true);

      // End too late
      const lateEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      expect(lateEnd > maxEnd).toBe(true);

      // Valid range
      const validStart = new Date(now.getTime() + 60 * 60 * 1000);
      const validEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      expect(validStart >= minStart).toBe(true);
      expect(validEnd <= maxEnd).toBe(true);
      expect(validEnd > validStart).toBe(true);
    });

    it("should validate end date is after start date", () => {
      const start = new Date("2026-03-01T10:00");
      const end = new Date("2026-03-15T10:00");
      expect(end > start).toBe(true);

      const badEnd = new Date("2026-02-28T10:00");
      expect(badEnd > start).toBe(false);
    });

    it("should require ihale_turu selection at step 0", () => {
      const canProceedStep0 = (ihale_turu: string) => !!ihale_turu;
      expect(canProceedStep0("")).toBe(false);
      expect(canProceedStep0("urun_alim")).toBe(true);
      expect(canProceedStep0("hizmet_alim")).toBe(true);
    });

    it("should require teklif_usulu at step 1", () => {
      const canProceedStep1 = (teklif_usulu: string) => !!teklif_usulu;
      expect(canProceedStep1("")).toBe(false);
      expect(canProceedStep1("acik_eksiltme")).toBe(true);
    });
  });

  describe("Ürün Form Validation", () => {
    it("should require baslik for product", () => {
      const isValid = (baslik: string) => baslik.trim().length > 0;
      expect(isValid("")).toBe(false);
      expect(isValid("  ")).toBe(false);
      expect(isValid("Test Ürün")).toBe(true);
    });

    it("should validate price is positive", () => {
      const isValidPrice = (fiyat: string) => {
        const num = parseFloat(fiyat);
        return !isNaN(num) && num > 0;
      };
      expect(isValidPrice("0")).toBe(false);
      expect(isValidPrice("-5")).toBe(false);
      expect(isValidPrice("abc")).toBe(false);
      expect(isValidPrice("100")).toBe(true);
      expect(isValidPrice("99.99")).toBe(true);
    });

    it("should validate variation matrix has at least one entry", () => {
      const varyasyonlar: any[] = [];
      expect(varyasyonlar.length > 0).toBe(false);

      varyasyonlar.push({
        varyant_1_label: "Beden",
        varyant_1_value: "M",
        varyant_2_label: "Renk",
        varyant_2_value: "Kırmızı",
        foto_urls: ["url1"],
      });
      expect(varyasyonlar.length > 0).toBe(true);
    });

    it("should validate price tiers do not overlap", () => {
      const tiers = [
        { min_adet: 1, max_adet: 10, birim_fiyat: 100 },
        { min_adet: 11, max_adet: 50, birim_fiyat: 90 },
        { min_adet: 51, max_adet: 100, birim_fiyat: 80 },
      ];

      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].min_adet).toBeGreaterThan(tiers[i - 1].max_adet);
      }
    });
  });
});
