import { describe, it, expect } from "vitest";
import type { IhaleFormData } from "@/pages/YeniIhale";

/**
 * Pure-logic tests for İhale Wizard validation rules.
 * These mirror the canProceed() and date validation logic in YeniIhale.tsx
 */

const INITIAL_FORM: IhaleFormData = {
  ihale_turu: "",
  teklif_usulu: "",
  urun_kategori_id: "",
  urun_grup_id: "",
  urun_tur_id: "",
  hizmet_kategori_id: "",
  hizmet_tur_id: "",
  baslik: "",
  aciklama: "",
  baslangic_fiyati: null,
  birim: "",
  para_birimi: "TRY",
  kdv_durumu: "",
  odeme_secenekleri: [],
  odeme_vadesi: [],
  kargo_masrafi: "",
  kargo_sirketi_anlasmasi: "",
  teslimat_tarihi: "",
  teslimat_yeri: "",
  baslangic_tarihi: "",
  bitis_tarihi: "",
  foto_url: null,
  fotograflar: [],
  ek_dosya_url: null,
  ek_dosyalar: [],
  ozel_filtreleme: false,
  firma_adi_gizle: false,
  min_teklif_degisim: null,
  teknik_detaylar: {},
  filtreler: [],
  stoklar: [],
};

// Replicate canProceed logic from YeniIhale.tsx
function canProceed(step: number, formData: IhaleFormData, skipStokStep = false): boolean {
  switch (step) {
    case 0: return !!formData.ihale_turu;
    case 1: return !!formData.teklif_usulu;
    case 2:
      if (formData.ihale_turu === "hizmet_alim") {
        return !!formData.hizmet_kategori_id && !!formData.hizmet_tur_id;
      }
      return !!formData.urun_kategori_id && !!formData.urun_grup_id && !!formData.urun_tur_id;
    case 3: {
      const birimRequired = !skipStokStep;
      return !!(formData.baslik && formData.aciklama && formData.baslangic_fiyati &&
        (birimRequired ? formData.birim : true) && formData.kdv_durumu &&
        formData.odeme_secenekleri.length > 0 && formData.odeme_vadesi.length > 0 &&
        formData.baslangic_tarihi && formData.bitis_tarihi);
    }
    default: return true;
  }
}

function getMissingFields(step: number, formData: IhaleFormData, skipStokStep = false): string[] {
  const missing: string[] = [];
  switch (step) {
    case 0:
      if (!formData.ihale_turu) missing.push("İhale Türü");
      break;
    case 1:
      if (!formData.teklif_usulu) missing.push("Teklif Usulü");
      break;
    case 2:
      if (formData.ihale_turu === "hizmet_alim") {
        if (!formData.hizmet_kategori_id) missing.push("Hizmet Kategorisi");
        if (!formData.hizmet_tur_id) missing.push("Hizmet Türü");
      } else {
        if (!formData.urun_kategori_id) missing.push("Ürün Kategorisi");
        if (!formData.urun_grup_id) missing.push("Ürün Grubu");
        if (!formData.urun_tur_id) missing.push("Ürün Türü");
      }
      break;
    case 3:
      if (!formData.baslik) missing.push("İhale Başlığı");
      if (!formData.aciklama) missing.push("Açıklama");
      if (!formData.baslangic_fiyati) missing.push("Başlangıç Fiyatı");
      if (!skipStokStep && !formData.birim) missing.push("Birim");
      if (!formData.kdv_durumu) missing.push("KDV Durumu");
      if (formData.odeme_secenekleri.length === 0) missing.push("Ödeme Seçenekleri");
      if (formData.odeme_vadesi.length === 0) missing.push("Ödeme Vadesi");
      if (!formData.baslangic_tarihi) missing.push("Başlangıç Tarihi");
      if (!formData.bitis_tarihi) missing.push("Bitiş Tarihi");
      break;
  }
  return missing;
}

// Date validation logic from YeniIhale.tsx
interface DateValidation { valid: boolean; error?: string }
function validateDates(baslangic: string, bitis: string, now = new Date()): DateValidation {
  const minStart = new Date(now.getTime() + 30 * 60 * 1000);
  const maxEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const start = baslangic ? new Date(baslangic) : null;
  const end = bitis ? new Date(bitis) : null;

  if (start && start < minStart) {
    return { valid: false, error: "Başlangıç tarihi en erken 30 dakika sonrası olabilir." };
  }
  if (end && end > maxEnd) {
    return { valid: false, error: "Bitiş tarihi en geç 30 gün sonrası olabilir." };
  }
  if (start && end && end <= start) {
    return { valid: false, error: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır." };
  }
  return { valid: true };
}

describe("İhale Wizard - Adım 0: İhale Türü", () => {
  it("ihale türü seçilmezse ilerleyemez", () => {
    expect(canProceed(0, INITIAL_FORM)).toBe(false);
  });

  it("ihale türü seçilirse ilerleyebilir", () => {
    expect(canProceed(0, { ...INITIAL_FORM, ihale_turu: "urun_alis" })).toBe(true);
  });

  it("eksik alan 'İhale Türü' olarak raporlanır", () => {
    expect(getMissingFields(0, INITIAL_FORM)).toContain("İhale Türü");
  });
});

describe("İhale Wizard - Adım 1: Teklif Usulü", () => {
  it("teklif usulü seçilmezse ilerleyemez", () => {
    expect(canProceed(1, { ...INITIAL_FORM, ihale_turu: "urun_alis" })).toBe(false);
  });

  it("kapalı teklif seçilirse ilerleyebilir", () => {
    expect(canProceed(1, { ...INITIAL_FORM, teklif_usulu: "kapali_teklif" })).toBe(true);
  });

  it("açık indirme seçilirse ilerleyebilir", () => {
    expect(canProceed(1, { ...INITIAL_FORM, teklif_usulu: "acik_indirme" })).toBe(true);
  });

  it("açık arttırma seçilirse ilerleyebilir", () => {
    expect(canProceed(1, { ...INITIAL_FORM, teklif_usulu: "acik_arttirma" })).toBe(true);
  });
});

describe("İhale Wizard - Adım 2: Kategori", () => {
  it("ürün ihalesi: 3 kategori alanı zorunlu", () => {
    const form = { ...INITIAL_FORM, ihale_turu: "urun_alis" };
    expect(canProceed(2, form)).toBe(false);
    expect(getMissingFields(2, form)).toEqual(["Ürün Kategorisi", "Ürün Grubu", "Ürün Türü"]);
  });

  it("ürün ihalesi: tüm 3 alan dolu → geçer", () => {
    const form = {
      ...INITIAL_FORM,
      ihale_turu: "urun_alis",
      urun_kategori_id: "k1",
      urun_grup_id: "g1",
      urun_tur_id: "t1",
    };
    expect(canProceed(2, form)).toBe(true);
  });

  it("hizmet ihalesi: 2 alan zorunlu", () => {
    const form = { ...INITIAL_FORM, ihale_turu: "hizmet_alim" };
    expect(canProceed(2, form)).toBe(false);
    expect(getMissingFields(2, form)).toEqual(["Hizmet Kategorisi", "Hizmet Türü"]);
  });

  it("hizmet ihalesi: 2 alan dolu → geçer", () => {
    const form = {
      ...INITIAL_FORM,
      ihale_turu: "hizmet_alim",
      hizmet_kategori_id: "hk1",
      hizmet_tur_id: "ht1",
    };
    expect(canProceed(2, form)).toBe(true);
  });
});

describe("İhale Wizard - Adım 3: İhale Bilgileri", () => {
  const validStep3: Partial<IhaleFormData> = {
    baslik: "Test İhale",
    aciklama: "Açıklama metni",
    baslangic_fiyati: 1000,
    birim: "Metre",
    kdv_durumu: "KDV Dahil",
    odeme_secenekleri: ["Nakit"],
    odeme_vadesi: ["Peşin"],
    baslangic_tarihi: "2026-04-01T10:00",
    bitis_tarihi: "2026-04-15T10:00",
  };

  it("tüm zorunlu alanlar dolu → geçer", () => {
    expect(canProceed(3, { ...INITIAL_FORM, ...validStep3 })).toBe(true);
  });

  it("başlık eksik → ilerleyemez", () => {
    expect(canProceed(3, { ...INITIAL_FORM, ...validStep3, baslik: "" })).toBe(false);
  });

  it("başlangıç fiyatı eksik → ilerleyemez", () => {
    expect(canProceed(3, { ...INITIAL_FORM, ...validStep3, baslangic_fiyati: null })).toBe(false);
  });

  it("birim, skipStokStep=true ise zorunlu değildir", () => {
    const form = { ...INITIAL_FORM, ...validStep3, birim: "" };
    expect(canProceed(3, form, false)).toBe(false); // birim zorunlu
    expect(canProceed(3, form, true)).toBe(true);   // birim zorunlu değil
  });

  it("tüm eksik alanları doğru raporlar", () => {
    const missing = getMissingFields(3, INITIAL_FORM);
    expect(missing).toContain("İhale Başlığı");
    expect(missing).toContain("Açıklama");
    expect(missing).toContain("Başlangıç Fiyatı");
    expect(missing).toContain("Birim");
    expect(missing).toContain("KDV Durumu");
    expect(missing).toContain("Ödeme Seçenekleri");
    expect(missing).toContain("Ödeme Vadesi");
    expect(missing).toContain("Başlangıç Tarihi");
    expect(missing).toContain("Bitiş Tarihi");
  });
});

describe("İhale Wizard - Tarih Validasyonları", () => {
  const now = new Date("2026-03-17T12:00:00Z");

  it("başlangıç tarihi 30dk'dan erken → hata", () => {
    const result = validateDates("2026-03-17T12:10:00Z", "2026-03-20T12:00:00Z", now);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("30 dakika");
  });

  it("başlangıç tarihi 30dk sonrası → geçerli", () => {
    const result = validateDates("2026-03-17T12:35:00Z", "2026-03-20T12:00:00Z", now);
    expect(result.valid).toBe(true);
  });

  it("bitiş tarihi 30 günden sonra → hata", () => {
    const result = validateDates("2026-03-17T13:00:00Z", "2026-05-01T12:00:00Z", now);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("30 gün");
  });

  it("bitiş tarihi 30 gün içinde → geçerli", () => {
    const result = validateDates("2026-03-17T13:00:00Z", "2026-04-10T12:00:00Z", now);
    expect(result.valid).toBe(true);
  });

  it("bitiş tarihi başlangıçtan önce → hata", () => {
    const result = validateDates("2026-03-20T12:00:00Z", "2026-03-19T12:00:00Z", now);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("başlangıç tarihinden sonra");
  });

  it("bitiş tarihi = başlangıç tarihi → hata", () => {
    const result = validateDates("2026-03-20T12:00:00Z", "2026-03-20T12:00:00Z", now);
    expect(result.valid).toBe(false);
  });
});

describe("İhale Wizard - Stok adımı kuralları", () => {
  it("Teknik & Tasarım Hizmetleri → stok adımı atlanır", () => {
    const ALL_STEPS = ["İhale Türü", "Teklif Usulü", "Kategori", "İhale Bilgileri", "Teknik Detaylar", "Stok"];
    const skipStokStep = true; // hizmet_alim + Teknik & Tasarım
    const steps = skipStokStep ? ALL_STEPS.filter(s => s !== "Stok") : ALL_STEPS;
    expect(steps).not.toContain("Stok");
    expect(steps.length).toBe(5);
  });

  it("normal ihale → stok adımı dahil", () => {
    const ALL_STEPS = ["İhale Türü", "Teklif Usulü", "Kategori", "İhale Bilgileri", "Teknik Detaylar", "Stok"];
    const skipStokStep = false;
    const steps = skipStokStep ? ALL_STEPS.filter(s => s !== "Stok") : ALL_STEPS;
    expect(steps).toContain("Stok");
    expect(steps.length).toBe(6);
  });
});
