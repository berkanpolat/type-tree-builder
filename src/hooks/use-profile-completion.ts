import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Genel Firma Bilgileri fields (excluding zero-weight: firma_unvani, firma_turu_id,
// firma_tipi_id, vergi_numarasi, vergi_dairesi, social media)
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

// Ağırlık sabitleri
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

// Firma types that have Makine Parkuru tab
const FIRMA_TYPES_WITH_MAKINE = ["Hazır Giyim Üreticisi", "Fason Atölye"];

export function useProfileCompletion(refreshKey?: number) {
  const [percentage, setPercentage] = useState(0);
  const [loading, setLoading] = useState(true);

  const calc = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); return; }
    const user = session.user;

    const { data: firma } = await supabase
      .from("firmalar")
      .select("*, firma_turleri(name)")
      .eq("user_id", user.id)
      .single();

    if (!firma) { setLoading(false); return; }

    const firmaId = firma.id;
    const firmaTuruName = (firma.firma_turleri as any)?.name || "";
    const hasMakine = FIRMA_TYPES_WITH_MAKINE.includes(firmaTuruName);

    let filledGenel = 0;
    for (const field of FIRMA_FIELDS) {
      const val = (firma as Record<string, unknown>)[field];
      if (val !== null && val !== undefined && val !== "") filledGenel++;
    }

    const [urunHizmet, uretimSatis, tesisler, referanslar, sertifikalar, galeri, belgeler] = await Promise.all([
      supabase.from("firma_urun_hizmet_secimler").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_uretim_satis").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_tesisler").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_referanslar").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_sertifikalar").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_galeri").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
      supabase.from("firma_belgeler").select("id", { count: "exact", head: true }).eq("firma_id", firmaId),
    ]);

    let makinelerCount = 0;
    if (hasMakine) {
      const makineler = await supabase.from("firma_makineler").select("id", { count: "exact", head: true }).eq("firma_id", firmaId);
      makinelerCount = makineler.count ?? 0;
    }

    // Ağırlıklı puan hesaplama
    const genelPuan = filledGenel * GENEL_ALAN_AGIRLIK;
    
    let tabPuan = 0;
    if ((urunHizmet.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.urunHizmet;
    if ((uretimSatis.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.uretimSatis;
    if ((galeri.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.galeri;
    if ((sertifikalar.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.sertifikalar;
    if ((referanslar.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.referanslar;
    if ((tesisler.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.tesisler;
    if ((belgeler.count ?? 0) > 0) tabPuan += TAB_AGIRLIKLARI.belgeler;
    if (hasMakine && makinelerCount > 0) tabPuan += TAB_AGIRLIKLARI.makineler;

    const maxGenel = FIRMA_FIELDS.length * GENEL_ALAN_AGIRLIK; // 10 * 2 = 20
    const maxTab = TAB_AGIRLIKLARI.urunHizmet + TAB_AGIRLIKLARI.uretimSatis + 
                   TAB_AGIRLIKLARI.galeri + TAB_AGIRLIKLARI.sertifikalar + 
                   TAB_AGIRLIKLARI.referanslar + TAB_AGIRLIKLARI.tesisler + 
                   TAB_AGIRLIKLARI.belgeler + (hasMakine ? TAB_AGIRLIKLARI.makineler : 0);
    const total = maxGenel + maxTab;
    const filled = genelPuan + tabPuan;

    setPercentage(Math.round((filled / total) * 100));
    setLoading(false);
  };

  useEffect(() => {
    calc();
  }, [refreshKey]);

  return { percentage, loading, refresh: () => calc() };
}
