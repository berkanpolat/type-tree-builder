import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Fields to check on firmalar table for profile completion
const FIRMA_FIELDS = [
  "firma_unvani",
  "firma_turu_id",
  "firma_tipi_id",
  "vergi_numarasi",
  "vergi_dairesi",
  "firma_olcegi_id",
  "kurulus_tarihi",
  "kurulus_il_id",
  "kurulus_ilce_id",
  "web_sitesi",
  "firma_iletisim_numarasi",
  "firma_iletisim_email",
  "instagram",
  "facebook",
  "linkedin",
  "x_twitter",
  "tiktok",
  "logo_url",
  "kapak_fotografi_url",
  "firma_hakkinda",
] as const;

export function useProfileCompletion() {
  const [percentage, setPercentage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calc = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: firma } = await supabase
        .from("firmalar")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!firma) { setLoading(false); return; }

      const total = FIRMA_FIELDS.length;
      let filled = 0;
      for (const field of FIRMA_FIELDS) {
        const val = (firma as Record<string, unknown>)[field];
        if (val !== null && val !== undefined && val !== "") {
          filled++;
        }
      }

      setPercentage(Math.round((filled / total) * 100));
      setLoading(false);
    };

    calc();
  }, []);

  return { percentage, loading };
}
