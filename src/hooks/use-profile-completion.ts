import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Genel Firma Bilgileri fields
const FIRMA_FIELDS = [
  "firma_olcegi_id",
  "kurulus_tarihi",
  "kurulus_il_id",
  "kurulus_ilce_id",
  "web_sitesi",
  "firma_iletisim_numarasi",
  "firma_iletisim_email",
  "logo_url",
  "kapak_fotografi_url",
  "firma_hakkinda",
] as const;

const GENEL_ALAN_AGIRLIK = 2;     // Her genel bilgi alanı 2 puan
const TAB_AGIRLIKLARI = {
  urunHizmet: 6,
  uretimSatis: 7,
  galeri: 3,
  sertifikalar: 2,
  referanslar: 2,
  tesisler: 1,
  belgeler: 1,
  makineler: 1,
} as const;

const FIRMA_TYPES_WITH_MAKINE = ["Hazır Giyim Üreticisi", "Fason Atölye"];

// Ürün/Hizmet kategori ID'leri
const UH = {
  FAALIYET_ALANI: "a0000001-0000-0000-0000-000000000002",
  URETIM_MODELI: "a0000001-0000-0000-0000-000000000003",
  URUN_SEGMENTI: "a0000001-0000-0000-0000-000000000004",
  URETIM_YETKINLIKLERI: "a0000001-0000-0000-0000-000000000005",
  UZMAN_URUN_GRUPLARI: "a0000001-0000-0000-0000-000000000007",
  TEMSIL_TIPI: "a0000001-0000-0000-0000-000000000008",
  TEDARIK_HIZMET_TIPI: "a0000001-0000-0000-0000-000000000012",
  FAALIYET_ALANI_TEDARIKCI: "a0000001-0000-0000-0000-000000000013",
  MEVCUT_PAZARLAR: "a0000001-0000-0000-0000-000000000019",
  HEDEFLENEN_PAZARLAR: "a0000001-0000-0000-0000-000000000020",
  ONLINE_SATIS: "a0000001-0000-0000-0000-000000000021",
  SECIM_KRITERLERI: "a0000001-0000-0000-0000-000000000022",
  TERCIH_BOLGE: "a0000001-0000-0000-0000-000000000099",
};

type FieldDef = { type: "cat"; id: string } | { type: "col"; name: string };

// Her firma türü için Ürün/Hizmet altındaki input alanları
const UH_FIELDS: Record<string, FieldDef[]> = {
  "Hazır Giyim Üreticisi": [
    { type: "cat", id: UH.FAALIYET_ALANI },
    { type: "cat", id: UH.URETIM_MODELI },
    { type: "cat", id: UH.URUN_SEGMENTI },
    { type: "cat", id: UH.URETIM_YETKINLIKLERI },
    { type: "col", name: "moq" },
    { type: "col", name: "aylik_uretim_kapasitesi" },
  ],
  "Marka": [
    { type: "cat", id: UH.FAALIYET_ALANI },
    { type: "cat", id: UH.URUN_SEGMENTI },
    { type: "cat", id: UH.URETIM_MODELI },
    { type: "cat", id: UH.MEVCUT_PAZARLAR },
    { type: "cat", id: UH.HEDEFLENEN_PAZARLAR },
    { type: "cat", id: UH.ONLINE_SATIS },
    { type: "cat", id: UH.SECIM_KRITERLERI },
    { type: "cat", id: UH.TERCIH_BOLGE },
    { type: "col", name: "fiziksel_magaza_sayisi" },
  ],
  "Mümessil Ofis": [
    { type: "cat", id: UH.FAALIYET_ALANI },
    { type: "cat", id: UH.URUN_SEGMENTI },
    { type: "cat", id: UH.TEMSIL_TIPI },
    { type: "cat", id: UH.TEDARIK_HIZMET_TIPI },
    { type: "cat", id: UH.UZMAN_URUN_GRUPLARI },
  ],
  "Fason Atölye": [
    { type: "cat", id: UH.FAALIYET_ALANI },
    { type: "cat", id: UH.URUN_SEGMENTI },
    { type: "cat", id: UH.URETIM_MODELI },
    { type: "cat", id: UH.UZMAN_URUN_GRUPLARI },
    { type: "col", name: "uretim_vardiyasi_id" },
    { type: "col", name: "bagimsiz_denetim_id" },
    { type: "col", name: "hizli_numune_id" },
    { type: "col", name: "moq" },
    { type: "col", name: "aylik_uretim_kapasitesi" },
  ],
  "Tedarikçi": [
    { type: "cat", id: UH.FAALIYET_ALANI_TEDARIKCI },
    { type: "cat", id: UH.TEDARIK_HIZMET_TIPI },
    { type: "col", name: "aylik_tedarik_sayisi" },
    { type: "col", name: "aylik_tedarik_birim_id" },
  ],
};

export function useProfileCompletion(refreshKey?: number) {
  const [percentage, setPercentage] = useState(0);
  const [loading, setLoading] = useState(true);

  const calc = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setPercentage(0);
      setLoading(false);
      return;
    }

    const user = session.user;

    const { data: firma } = await supabase
      .from("firmalar")
      .select("*, firma_turleri(name)")
      .eq("user_id", user.id)
      .single();

    if (!firma) {
      setPercentage(0);
      setLoading(false);
      return;
    }

    const firmaId = firma.id;
    const firmaTuruName = (firma.firma_turleri as any)?.name || "";
    const hasMakine = FIRMA_TYPES_WITH_MAKINE.includes(firmaTuruName);

    // Genel bilgi alanları
    let filledGenel = 0;
    for (const field of FIRMA_FIELDS) {
      const val = (firma as Record<string, unknown>)[field];
      if (val !== null && val !== undefined && val !== "") filledGenel++;
    }

    // Ürün/Hizmet: her bir input alanı ayrı puanlanır
    const [uhSelections, uretimSatis, tesisler, referanslar, sertifikalar, galeri, belgeler] = await Promise.all([
      supabase.from("firma_urun_hizmet_secimler").select("kategori_id").eq("firma_id", firmaId),
      supabase.from("firma_uretim_satis").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_tesisler").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_referanslar").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_sertifikalar").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_galeri").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_belgeler").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
    ]);

    // Ürün/Hizmet oransal puan hesaplama
    const filledCats = new Set((uhSelections.data || []).map(r => r.kategori_id));
    const uhFields = UH_FIELDS[firmaTuruName] || [];
    let uhFilledCount = 0;
    for (const f of uhFields) {
      if (f.type === "cat") {
        if (filledCats.has(f.id)) uhFilledCount++;
      } else {
        const val = (firma as Record<string, unknown>)[f.name];
        if (val !== null && val !== undefined && val !== "" && val !== 0) uhFilledCount++;
      }
    }
    const uhScore = uhFields.length > 0
      ? (uhFilledCount / uhFields.length) * TAB_AGIRLIKLARI.urunHizmet
      : 0;

    let makinelerCount = 0;
    if (hasMakine) {
      const makineler = await supabase.from("firma_makineler").select("id", { count: "exact", head: true }).eq("firma_id", firmaId);
      makinelerCount = makineler.count ?? 0;
    }

    const genelPuan = filledGenel * GENEL_ALAN_AGIRLIK;
    
    let tabPuan = uhScore;
    if ((uretimSatis.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.uretimSatis;
    if ((galeri.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.galeri;
    if ((sertifikalar.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.sertifikalar;
    if ((referanslar.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.referanslar;
    if ((tesisler.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.tesisler;
    if ((belgeler.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.belgeler;
    if (hasMakine && makinelerCount > 0) tabPuan += TAB_AGIRLIKLARI.makineler;

    const maxGenel = FIRMA_FIELDS.length * GENEL_ALAN_AGIRLIK;
    const maxTab = TAB_AGIRLIKLARI.urunHizmet + TAB_AGIRLIKLARI.uretimSatis + 
                   TAB_AGIRLIKLARI.galeri + TAB_AGIRLIKLARI.sertifikalar + 
                   TAB_AGIRLIKLARI.referanslar + TAB_AGIRLIKLARI.tesisler + 
                   TAB_AGIRLIKLARI.belgeler + (hasMakine ? TAB_AGIRLIKLARI.makineler : 0);
    const total = maxGenel + maxTab;
    const filled = genelPuan + tabPuan;

    setPercentage(Math.round((filled / total) * 100));
    setLoading(false);
  }, []);

  useEffect(() => {
    void calc();
  }, [calc, refreshKey]);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const refreshCompletion = () => {
      if (!isMounted) return;
      void calc();
    };

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !isMounted) return;

      const { data: firma } = await supabase
        .from("firmalar")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!firma || !isMounted) return;

      channel = supabase
        .channel(`profile-completion:${session.user.id}:${firma.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "firmalar", filter: `user_id=eq.${session.user.id}` },
          refreshCompletion,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "firma_urun_hizmet_secimler", filter: `firma_id=eq.${firma.id}` },
          refreshCompletion,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "firma_uretim_satis", filter: `firma_id=eq.${firma.id}` },
          refreshCompletion,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "firma_tesisler", filter: `firma_id=eq.${firma.id}` },
          refreshCompletion,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "firma_referanslar", filter: `firma_id=eq.${firma.id}` },
          refreshCompletion,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "firma_sertifikalar", filter: `firma_id=eq.${firma.id}` },
          refreshCompletion,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "firma_galeri", filter: `firma_id=eq.${firma.id}` },
          refreshCompletion,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "firma_belgeler", filter: `firma_id=eq.${firma.id}` },
          refreshCompletion,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "firma_makineler", filter: `firma_id=eq.${firma.id}` },
          refreshCompletion,
        )
        .subscribe();
    };

    const handleWindowFocus = () => refreshCompletion();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshCompletion();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void setupRealtime();

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [calc]);

  return { percentage, loading, refresh: () => calc() };
}
