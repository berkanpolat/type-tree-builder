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

    const tabCounts = [urunHizmet, uretimSatis, tesisler, referanslar, sertifikalar, galeri, belgeler];

    if (hasMakine) {
      const makineler = await supabase.from("firma_makineler").select("id", { count: "exact", head: true }).eq("firma_id", firmaId);
      tabCounts.push(makineler);
    }

    let filledTabs = 0;
    for (const res of tabCounts) {
      if ((res.count ?? 0) > 0) filledTabs++;
    }

    const totalFields = FIRMA_FIELDS.length;
    const totalTabs = hasMakine ? 8 : 7;
    const total = totalFields + totalTabs;
    const filled = filledGenel + filledTabs;

    setPercentage(Math.round((filled / total) * 100));
    setLoading(false);
  };

  useEffect(() => {
    calc();
  }, [refreshKey]);

  return { percentage, loading, refresh: () => calc() };
}
