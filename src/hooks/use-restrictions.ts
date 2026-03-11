import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Restriction {
  id: string;
  kisitlama_alanlari: Record<string, boolean>;
  bitis_tarihi: string;
  sebep: string;
}

export function useRestrictions() {
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRestrictions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const now = new Date().toISOString();
    const { data } = await supabase
      .from("firma_kisitlamalar" as any)
      .select("id, kisitlama_alanlari, bitis_tarihi, sebep")
      .eq("user_id", user.id)
      .eq("aktif", true)
      .gte("bitis_tarihi", now);

    setRestrictions((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRestrictions(); }, [fetchRestrictions]);

  const isRestricted = useCallback((alanKey: string): boolean => {
    const now = new Date();
    return restrictions.some(r => {
      const alanlari = r.kisitlama_alanlari as Record<string, boolean>;
      return alanlari[alanKey] === true && new Date(r.bitis_tarihi) > now;
    });
  }, [restrictions]);

  const getRestrictionMessage = useCallback((alanKey: string): string | null => {
    const now = new Date();
    const active = restrictions.find(r => {
      const alanlari = r.kisitlama_alanlari as Record<string, boolean>;
      return alanlari[alanKey] === true && new Date(r.bitis_tarihi) > now;
    });
    if (!active) return null;

    const labels: Record<string, string> = {
      ihale_acamaz: "ihale açma",
      teklif_veremez: "teklif verme",
      urun_aktif_edemez: "ürün aktif etme",
      mesaj_gonderemez: "mesaj gönderme",
      mesaj_alamaz: "mesaj alma",
      profil_goruntuleyemez: "firma profili görüntüleme",
      ihale_goruntuleyemez: "ihale görüntüleme",
      urun_goruntuleyemez: "ürün görüntüleme",
    };

    const bitis = new Date(active.bitis_tarihi).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

    return `${bitis} tarihine kadar ${labels[alanKey] || alanKey} işleminiz kısıtlanmıştır. Sebep: ${active.sebep}`;
  }, [restrictions]);

  return { isRestricted, getRestrictionMessage, loading, restrictions };
}
