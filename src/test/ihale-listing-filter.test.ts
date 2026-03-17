import { describe, it, expect } from "vitest";

/**
 * İhale & Ürün listeleme, filtreleme, arama mantığı testleri.
 * ManuIhale.tsx ve TekIhale.tsx'ten çıkarılmış saf filtreleme mantığı.
 */

interface Ihale {
  id: string;
  ihale_no: string;
  baslik: string;
  durum: string;
  teklif_usulu: string;
  goruntuleme_sayisi: number;
}

interface IhaleTeklif {
  ihale_id: string;
  tutar: number;
}

// From ManuIhale.tsx
const durumLabels: Record<string, string> = {
  duzenleniyor: "Düzenleniyor",
  onay_bekliyor: "Onay Bekliyor",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
  iptal: "İptal Edildi",
};

const teklifUsuluLabels: Record<string, string> = {
  acik_indirme: "Açık İndirme",
  acik_arttirma: "Açık Arttırma",
  kapali_teklif: "Kapalı Teklif",
};

// Replicated from ManuIhale.tsx
function filterIhaleler(ihaleler: Ihale[], searchTerm: string, filterDurum: string): Ihale[] {
  return ihaleler.filter((ihale) => {
    const matchSearch =
      ihale.baslik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ihale.ihale_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDurum = filterDurum === "all" || ihale.durum === filterDurum;
    return matchSearch && matchDurum;
  });
}

function getTeklifSayisi(teklifler: IhaleTeklif[], ihaleId: string): number {
  return teklifler.filter((t) => t.ihale_id === ihaleId).length;
}

function getEnIyiTeklif(teklifler: IhaleTeklif[], ihale: Ihale): number | null {
  const ihaleTeklifleri = teklifler.filter((t) => t.ihale_id === ihale.id);
  if (ihaleTeklifleri.length === 0) return null;
  const tutarlar = ihaleTeklifleri.map((t) => t.tutar);
  if (ihale.teklif_usulu === "acik_indirme") return Math.min(...tutarlar);
  return Math.max(...tutarlar);
}

const sampleIhaleler: Ihale[] = [
  { id: "1", ihale_no: "ABC123", baslik: "Pamuk İplik Alımı", durum: "devam_ediyor", teklif_usulu: "acik_indirme", goruntuleme_sayisi: 50 },
  { id: "2", ihale_no: "DEF456", baslik: "Kumaş Satış İhalesi", durum: "tamamlandi", teklif_usulu: "acik_arttirma", goruntuleme_sayisi: 120 },
  { id: "3", ihale_no: "GHI789", baslik: "Boyama Hizmeti", durum: "duzenleniyor", teklif_usulu: "kapali_teklif", goruntuleme_sayisi: 10 },
  { id: "4", ihale_no: "JKL012", baslik: "Aksesuar Tedarik", durum: "devam_ediyor", teklif_usulu: "acik_indirme", goruntuleme_sayisi: 30 },
  { id: "5", ihale_no: "MNO345", baslik: "İplik İthalat", durum: "iptal", teklif_usulu: "kapali_teklif", goruntuleme_sayisi: 5 },
];

const sampleTeklifler: IhaleTeklif[] = [
  { ihale_id: "1", tutar: 5000 },
  { ihale_id: "1", tutar: 4500 },
  { ihale_id: "1", tutar: 4800 },
  { ihale_id: "2", tutar: 10000 },
  { ihale_id: "2", tutar: 12000 },
  { ihale_id: "4", tutar: 3000 },
];

describe("İhale filtreleme - Arama", () => {
  it("başlığa göre arar (case-insensitive)", () => {
    const result = filterIhaleler(sampleIhaleler, "pamuk", "all");
    expect(result).toHaveLength(1);
    expect(result[0].baslik).toBe("Pamuk İplik Alımı");
  });

  it("ihale numarasına göre arar", () => {
    const result = filterIhaleler(sampleIhaleler, "DEF456", "all");
    expect(result).toHaveLength(1);
    expect(result[0].ihale_no).toBe("DEF456");
  });

  it("boş arama tüm ihaleleri getirir", () => {
    const result = filterIhaleler(sampleIhaleler, "", "all");
    expect(result).toHaveLength(5);
  });

  it("eşleşmeyen arama boş döner", () => {
    const result = filterIhaleler(sampleIhaleler, "xyz_bulunamaz", "all");
    expect(result).toHaveLength(0);
  });

  it("kısmi eşleşme çalışır", () => {
    const result = filterIhaleler(sampleIhaleler, "İplik", "all");
    expect(result).toHaveLength(2); // "Pamuk İplik Alımı" + "İplik İthalat"
  });
});

describe("İhale filtreleme - Durum", () => {
  it("devam_ediyor filtresi", () => {
    const result = filterIhaleler(sampleIhaleler, "", "devam_ediyor");
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.durum === "devam_ediyor")).toBe(true);
  });

  it("tamamlandi filtresi", () => {
    const result = filterIhaleler(sampleIhaleler, "", "tamamlandi");
    expect(result).toHaveLength(1);
  });

  it("iptal filtresi", () => {
    const result = filterIhaleler(sampleIhaleler, "", "iptal");
    expect(result).toHaveLength(1);
    expect(result[0].baslik).toBe("İplik İthalat");
  });

  it("duzenleniyor filtresi", () => {
    const result = filterIhaleler(sampleIhaleler, "", "duzenleniyor");
    expect(result).toHaveLength(1);
  });

  it("all filtresi tüm ihaleleri getirir", () => {
    const result = filterIhaleler(sampleIhaleler, "", "all");
    expect(result).toHaveLength(5);
  });
});

describe("İhale filtreleme - Arama + Durum birlikte", () => {
  it("arama + durum filtresi birlikte çalışır", () => {
    const result = filterIhaleler(sampleIhaleler, "Pamuk", "devam_ediyor");
    expect(result).toHaveLength(1);
    expect(result[0].baslik).toBe("Pamuk İplik Alımı");
  });

  it("arama + durum eşleşmezse boş döner", () => {
    const result = filterIhaleler(sampleIhaleler, "pamuk", "iptal");
    expect(result).toHaveLength(0);
  });
});

describe("Teklif sayısı hesaplama", () => {
  it("ihale 1 için 3 teklif", () => {
    expect(getTeklifSayisi(sampleTeklifler, "1")).toBe(3);
  });

  it("ihale 2 için 2 teklif", () => {
    expect(getTeklifSayisi(sampleTeklifler, "2")).toBe(2);
  });

  it("teklif olmayan ihale için 0", () => {
    expect(getTeklifSayisi(sampleTeklifler, "3")).toBe(0);
  });
});

describe("En iyi teklif hesaplama", () => {
  it("açık indirme → en düşük teklif", () => {
    const ihale = sampleIhaleler[0]; // acik_indirme
    const result = getEnIyiTeklif(sampleTeklifler, ihale);
    expect(result).toBe(4500);
  });

  it("açık arttırma → en yüksek teklif", () => {
    const ihale = sampleIhaleler[1]; // acik_arttirma
    const result = getEnIyiTeklif(sampleTeklifler, ihale);
    expect(result).toBe(12000);
  });

  it("teklif yoksa null döner", () => {
    const ihale = sampleIhaleler[2]; // teklif yok
    const result = getEnIyiTeklif(sampleTeklifler, ihale);
    expect(result).toBeNull();
  });
});

describe("Durum etiketleri", () => {
  it("tüm durumların Türkçe karşılığı tanımlı", () => {
    expect(durumLabels["duzenleniyor"]).toBe("Düzenleniyor");
    expect(durumLabels["onay_bekliyor"]).toBe("Onay Bekliyor");
    expect(durumLabels["devam_ediyor"]).toBe("Devam Ediyor");
    expect(durumLabels["tamamlandi"]).toBe("Tamamlandı");
    expect(durumLabels["iptal"]).toBe("İptal Edildi");
  });

  it("tüm teklif usullerinin Türkçe karşılığı tanımlı", () => {
    expect(teklifUsuluLabels["acik_indirme"]).toBe("Açık İndirme");
    expect(teklifUsuluLabels["acik_arttirma"]).toBe("Açık Arttırma");
    expect(teklifUsuluLabels["kapali_teklif"]).toBe("Kapalı Teklif");
  });
});

describe("Özet kartları hesaplamaları", () => {
  it("toplam ihale sayısı doğru", () => {
    expect(sampleIhaleler.length).toBe(5);
  });

  it("aktif ihale sayısı doğru", () => {
    const aktif = sampleIhaleler.filter((i) => i.durum === "devam_ediyor").length;
    expect(aktif).toBe(2);
  });

  it("tamamlanan ihale sayısı doğru", () => {
    const tamamlanan = sampleIhaleler.filter((i) => i.durum === "tamamlandi").length;
    expect(tamamlanan).toBe(1);
  });
});
