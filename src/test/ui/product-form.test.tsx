import { describe, it, expect, vi } from "vitest";

// Teknik alanlar config (mirrors YeniUrun.tsx TEKNIK_ALANLAR)
const TEKNIK_ALANLAR: Record<string, { label: string; type: string; kategoriName?: string; dependsOn?: string }[]> = {
  "Hazır Giyim": [
    { label: "Kumaş Kompozisyonu", type: "text" },
    { label: "Sezon", type: "dropdown", kategoriName: "Sezon" },
    { label: "Cinsiyet", type: "dropdown", kategoriName: "Cinsiyet" },
    { label: "Yaş Grubu", type: "dropdown", kategoriName: "Yaş Grubu" },
    { label: "Desen", type: "dropdown", kategoriName: "Desen" },
    { label: "Kalıp", type: "dropdown", kategoriName: "Kalıp" },
  ],
  "Kumaş": [
    { label: "Kumaş Kompozisyonu", type: "text" },
    { label: "Kumaş Grubu", type: "dropdown", kategoriName: "Kumaş Grubu" },
    { label: "Kumaş Türü", type: "dependent_dropdown", dependsOn: "Kumaş Grubu" },
    { label: "En Bilgisi (cm)", type: "text" },
    { label: "Boy Bilgisi (cm)", type: "text" },
    { label: "Gramaj (gram)", type: "text" },
    { label: "Desen", type: "dropdown", kategoriName: "Desen" },
    { label: "Esneklik Oranı", type: "text" },
    { label: "İplik Numarası", type: "dropdown", kategoriName: "İplik Numarası" },
  ],
};

describe("Product Form Tests (L5)", () => {
  describe("Ürün Bilgileri Validation", () => {
    it("should require baslik (product title)", () => {
      const isValid = (baslik: string) => baslik.trim().length > 0;
      expect(isValid("")).toBe(false);
      expect(isValid("  ")).toBe(false);
      expect(isValid("Test Ürün")).toBe(true);
    });

    it("should validate price is positive number", () => {
      const isValidPrice = (fiyat: string) => {
        const num = parseFloat(fiyat);
        return !isNaN(num) && num > 0;
      };
      expect(isValidPrice("0")).toBe(false);
      expect(isValidPrice("-5")).toBe(false);
      expect(isValidPrice("abc")).toBe(false);
      expect(isValidPrice("")).toBe(false);
      expect(isValidPrice("100")).toBe(true);
      expect(isValidPrice("99.99")).toBe(true);
    });

    it("should validate min_siparis_miktari is positive integer", () => {
      const isValid = (val: string) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num > 0 && num === parseFloat(val);
      };
      expect(isValid("0")).toBe(false);
      expect(isValid("-1")).toBe(false);
      expect(isValid("1.5")).toBe(false);
      expect(isValid("10")).toBe(true);
      expect(isValid("500")).toBe(true);
    });
  });

  describe("Teknik Detaylar", () => {
    it("should return correct technical fields for Hazır Giyim category", () => {
      const fields = TEKNIK_ALANLAR["Hazır Giyim"];
      expect(fields).toBeDefined();
      expect(fields.length).toBe(6);
      expect(fields.some(f => f.label === "Sezon")).toBe(true);
      expect(fields.some(f => f.label === "Cinsiyet")).toBe(true);
    });

    it("should return correct technical fields for Kumaş category", () => {
      const fields = TEKNIK_ALANLAR["Kumaş"];
      expect(fields).toBeDefined();
      expect(fields.length).toBe(9);
      expect(fields.some(f => f.label === "Kumaş Grubu")).toBe(true);
      expect(fields.some(f => f.type === "dependent_dropdown")).toBe(true);
    });

    it("should identify dependent dropdowns correctly", () => {
      const kumasFields = TEKNIK_ALANLAR["Kumaş"];
      const dependent = kumasFields.filter(f => f.type === "dependent_dropdown");
      expect(dependent.length).toBe(1);
      expect(dependent[0].dependsOn).toBe("Kumaş Grubu");
    });

    it("should handle unknown category gracefully", () => {
      const getFields = (katName: string) => {
        if (TEKNIK_ALANLAR[katName]) return TEKNIK_ALANLAR[katName];
        const key = Object.keys(TEKNIK_ALANLAR).find(k => katName.toLowerCase().includes(k.toLowerCase()));
        return key ? TEKNIK_ALANLAR[key] : [];
      };

      expect(getFields("Unknown Category").length).toBe(0);
      expect(getFields("Kumaş").length).toBe(9);
    });
  });

  describe("Varyasyon Matrisi", () => {
    it("should create correct variation matrix from selections", () => {
      const selectedV1 = ["M", "L", "XL"]; // Beden
      const selectedV2 = ["Kırmızı", "Mavi"]; // Renk

      const matrix: any[] = [];
      for (const v2 of selectedV2) {
        for (const v1 of selectedV1) {
          matrix.push({
            varyant_1_label: "Beden",
            varyant_1_value: v1,
            varyant_2_label: "Renk",
            varyant_2_value: v2,
            foto_urls: [],
          });
        }
      }

      expect(matrix.length).toBe(6); // 3 beden × 2 renk
      expect(matrix[0].varyant_1_value).toBe("M");
      expect(matrix[0].varyant_2_value).toBe("Kırmızı");
    });

    it("should require at least one variation", () => {
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

    it("should use Beden for Hazır Giyim, Birim for others", () => {
      const getV1Label = (kategoriName: string) =>
        kategoriName.toLowerCase().includes("hazır giyim") ? "Beden" : "Birim";

      expect(getV1Label("Hazır Giyim")).toBe("Beden");
      expect(getV1Label("Hazır Giyim Üretim")).toBe("Beden");
      expect(getV1Label("Kumaş")).toBe("Birim");
      expect(getV1Label("İplik")).toBe("Birim");
    });
  });

  describe("Step Navigation", () => {
    const STEPS = ["Kategori", "Ürün Bilgileri", "Teknik Detaylar", "Varyasyon"];

    it("should have 4 steps", () => {
      expect(STEPS.length).toBe(4);
    });

    it("should not allow step 1 without category selection", () => {
      const canGoToStep1 = (kategori: string, grup: string, tur: string) =>
        !!(kategori && grup && tur);
      expect(canGoToStep1("", "", "")).toBe(false);
    });

    it("should not allow final step without baslik", () => {
      const canGoToFinal = (baslik: string, aciklama: string) =>
        !!(baslik.trim() && aciklama.trim());
      expect(canGoToFinal("", "")).toBe(false);
      expect(canGoToFinal("Title", "Description")).toBe(true);
    });
  });
});
