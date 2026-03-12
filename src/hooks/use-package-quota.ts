import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PackageLimits {
  profil_goruntuleme_limiti: number | null;
  ihale_acma_limiti: number | null;
  teklif_verme_limiti: number | null;
  aktif_urun_limiti: number;
  mesaj_limiti: number | null;
}

export interface QuotaUsage {
  profil_goruntuleme: number;
  teklif_verme: number;
  aktif_urun: number;
  mesaj: number;
}

export interface PackageInfo {
  paketAd: string;
  paketSlug: string;
  periyot: string;
  donemBitis: string | null;
  durum: string;
  limits: PackageLimits;
  usage: QuotaUsage;
  loading: boolean;
  cancelAtPeriodEnd: boolean;
}

const DEFAULT_LIMITS: PackageLimits = {
  profil_goruntuleme_limiti: 5,
  ihale_acma_limiti: null,
  teklif_verme_limiti: 1,
  aktif_urun_limiti: 5,
  mesaj_limiti: 0,
};

export function usePackageQuota(): PackageInfo {
  const [loading, setLoading] = useState(true);
  const [paketAd, setPaketAd] = useState("Ücretsiz");
  const [paketSlug, setPaketSlug] = useState("ucretsiz");
  const [periyot, setPeriyot] = useState("aylik");
  const [donemBitis, setDonemBitis] = useState<string | null>(null);
  const [durum, setDurum] = useState("aktif");
  const [limits, setLimits] = useState<PackageLimits>(DEFAULT_LIMITS);
  const [usage, setUsage] = useState<QuotaUsage>({ profil_goruntuleme: 0, teklif_verme: 0, aktif_urun: 0, mesaj: 0 });
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get subscription + package info
      const { data: abone } = await supabase
        .from("kullanici_abonelikler" as any)
        .select("*, paketler(*)")
        .eq("user_id", user.id)
        .single();

      if (abone) {
        const paket = (abone as any).paketler;
        const ekstra = (abone as any).ekstra_haklar || {};
        setPaketAd(paket.ad);
        setPaketSlug(paket.slug);
        setPeriyot((abone as any).periyot);
        setDonemBitis((abone as any).donem_bitis);
        setDurum((abone as any).durum || "aktif");
        setStripeSubscriptionId((abone as any).stripe_subscription_id);
        
        // Check if durum indicates pending cancellation
        const aboneDurum = (abone as any).durum || "";
        setCancelAtPeriodEnd(aboneDurum === "iptal_bekliyor");
        
        setLimits({
          profil_goruntuleme_limiti: paket.profil_goruntuleme_limiti != null
            ? paket.profil_goruntuleme_limiti + (ekstra.profil_goruntuleme || 0) : null,
          ihale_acma_limiti: paket.ihale_acma_limiti != null
            ? paket.ihale_acma_limiti + (ekstra.ihale_acma || 0) : null,
          teklif_verme_limiti: paket.teklif_verme_limiti != null
            ? paket.teklif_verme_limiti + (ekstra.teklif_verme || 0) : null,
          aktif_urun_limiti: paket.aktif_urun_limiti + (ekstra.aktif_urun || 0),
          mesaj_limiti: paket.mesaj_limiti != null
            ? paket.mesaj_limiti + (ekstra.mesaj || 0) : null,
        });

        const donemBaslangic = (abone as any).donem_baslangic;

        // Fetch usage counts in parallel
        const [profilRes, teklifRes, urunRes, mesajRes] = await Promise.all([
          supabase
            .from("profil_goruntulemeler" as any)
            .select("firma_id")
            .eq("user_id", user.id)
            .gte("created_at", donemBaslangic),
          supabase
            .from("ihale_teklifler")
            .select("ihale_id")
            .eq("teklif_veren_user_id", user.id)
            .gte("created_at", donemBaslangic),
          supabase
            .from("urunler")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("durum", "aktif"),
          supabase
            .from("conversations")
            .select("id, user1_id, user2_id, created_at")
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .gte("created_at", donemBaslangic),
        ]);

        const uniqueFirmaIds = new Set((profilRes.data || []).map((p: any) => p.firma_id));
        const uniqueIhaleIds = new Set((teklifRes.data || []).map((t: any) => t.ihale_id));

        let initiatedConversations = 0;
        if (mesajRes.data) {
          for (const conv of mesajRes.data) {
            const { data: firstMsg } = await supabase
              .from("messages")
              .select("sender_id")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: true })
              .limit(1)
              .single();
            if (firstMsg && firstMsg.sender_id === user.id) {
              initiatedConversations++;
            }
          }
        }

        setUsage({
          profil_goruntuleme: uniqueFirmaIds.size,
          teklif_verme: uniqueIhaleIds.size,
          aktif_urun: urunRes.count || 0,
          mesaj: initiatedConversations,
        });

        // Check for 10% remaining quota and send SMS warning
        const currentUsage = {
          profil_goruntuleme: uniqueFirmaIds.size,
          teklif_verme: uniqueIhaleIds.size,
          aktif_urun: urunRes.count || 0,
          mesaj: initiatedConversations,
        };
        const currentLimits = {
          profil_goruntuleme_limiti: paket.profil_goruntuleme_limiti != null
            ? paket.profil_goruntuleme_limiti + (ekstra.profil_goruntuleme || 0) : null,
          teklif_verme_limiti: paket.teklif_verme_limiti != null
            ? paket.teklif_verme_limiti + (ekstra.teklif_verme || 0) : null,
          aktif_urun_limiti: paket.aktif_urun_limiti + (ekstra.aktif_urun || 0),
          mesaj_limiti: paket.mesaj_limiti != null
            ? paket.mesaj_limiti + (ekstra.mesaj || 0) : null,
        };

        const quotaLabels: Record<string, string> = {
          profil_goruntuleme: "Firma Profili Goruntuleme",
          teklif_verme: "Teklif Verme",
          aktif_urun: "Aktif Urun",
          mesaj: "Mesaj Gonderme",
        };

        const limitKeys = [
          { usageKey: "profil_goruntuleme", limitKey: "profil_goruntuleme_limiti" },
          { usageKey: "teklif_verme", limitKey: "teklif_verme_limiti" },
          { usageKey: "aktif_urun", limitKey: "aktif_urun_limiti" },
          { usageKey: "mesaj", limitKey: "mesaj_limiti" },
        ] as const;

        for (const { usageKey, limitKey } of limitKeys) {
          const limit = currentLimits[limitKey];
          if (limit === null || limit === undefined || limit <= 0) continue;
          const used = currentUsage[usageKey];
          const remaining = limit - used;
          const threshold = Math.max(1, Math.ceil(limit * 0.1));

          if (remaining > 0 && remaining <= threshold) {
            // Check localStorage to avoid duplicate SMS
            const storageKey = `quota_sms_${usageKey}_${donemBaslangic}`;
            if (!localStorage.getItem(storageKey)) {
              localStorage.setItem(storageKey, "sent");
              try {
                await supabase.functions.invoke("send-notification-sms", {
                  body: {
                    type: "kota_uyari",
                    paketAd: paket.ad,
                    ozellikAd: quotaLabels[usageKey],
                    kalanSayi: remaining,
                  },
                });
              } catch (smsErr) {
                console.error("Quota SMS failed:", smsErr);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Paket bilgisi alınamadı:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: re-fetch usage when relevant tables change
  useEffect(() => {
    const channels = [
      supabase
        .channel('quota-profil')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profil_goruntulemeler' }, () => fetchData())
        .subscribe(),
      supabase
        .channel('quota-teklifler')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ihale_teklifler' }, () => fetchData())
        .subscribe(),
      supabase
        .channel('quota-urunler')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'urunler' }, () => fetchData())
        .subscribe(),
      supabase
        .channel('quota-conversations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchData())
        .subscribe(),
      supabase
        .channel('quota-abonelik')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kullanici_abonelikler' }, () => fetchData())
        .subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [fetchData]);

  return { paketAd, paketSlug, periyot, donemBitis, durum, limits, usage, loading, stripeSubscriptionId, cancelAtPeriodEnd };
}

// Helper: Check if a specific action is allowed
export function canPerformAction(
  limits: PackageLimits,
  usage: QuotaUsage,
  action: "profil_goruntuleme" | "teklif_verme" | "aktif_urun" | "mesaj"
): { allowed: boolean; message?: string } {
  const limitMap: Record<string, number | null> = {
    profil_goruntuleme: limits.profil_goruntuleme_limiti,
    teklif_verme: limits.teklif_verme_limiti,
    aktif_urun: limits.aktif_urun_limiti,
    mesaj: limits.mesaj_limiti,
  };

  const labelMap: Record<string, string> = {
    profil_goruntuleme: "firma profili görüntüleme",
    teklif_verme: "teklif verme",
    aktif_urun: "aktif ürün",
    mesaj: "mesaj gönderme",
  };

  const limit = limitMap[action];
  
  if (action === "mesaj" && limit === 0) {
    return { allowed: false, message: "Ücretsiz paketinizde yeni mesaj oluşturma hakkınız bulunmamaktadır. Sadece gelen mesajlara yanıt verebilirsiniz. PRO pakete yükselterek sınırsız mesajlaşma hakkı kazanabilirsiniz." };
  }

  if (limit === null) {
    return { allowed: true };
  }

  if (usage[action] >= limit) {
    return { allowed: false, message: `${labelMap[action]} hakkınız dolmuştur (${usage[action]}/${limit}). PRO pakete yükselterek daha fazla hak kazanabilirsiniz.` };
  }

  return { allowed: true };
}
