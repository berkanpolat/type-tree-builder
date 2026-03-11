// Stripe product & price IDs
export const STRIPE_CONFIG = {
  pro: {
    aylik: {
      priceId: "price_1T9kVU16sgu1Ou2XJkpzKddd",
      productId: "prod_U80WHflxsIWOlO",
      fiyat: 199,
      label: "Aylık",
    },
    yillik: {
      priceId: "price_1T9kVs16sgu1Ou2X9S0sStli",
      productId: "prod_U80WAzlvl7py3Y",
      fiyat: 1299,
      label: "Yıllık",
    },
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
