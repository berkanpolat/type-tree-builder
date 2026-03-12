// PayTR PRO paket fiyatları
export const PRO_FIYATLAR = {
  aylik: {
    fiyat: 199,
    label: "Aylık",
  },
  yillik: {
    fiyat: 1299,
    label: "Yıllık",
  },
} as const;

export const PAKET_OZELLIKLERI = {
  ucretsiz: {
    ad: "Ücretsiz",
    profil_goruntuleme: "5 adet / ay",
    ihale_acma: "Sınırsız",
    teklif_verme: "1 adet / ay",
    aktif_urun: "5 adet",
    mesaj: "Sadece yanıt",
  },
  pro: {
    ad: "PRO",
    profil_goruntuleme: "Sınırsız",
    ihale_acma: "Sınırsız",
    teklif_verme: "Sınırsız",
    aktif_urun: "30 adet",
    mesaj: "50 adet / ay",
  },
} as const;
