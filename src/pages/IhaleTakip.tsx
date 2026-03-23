import { useEffect, useState, useCallback } from "react";
import ihaleDefaultCover from "@/assets/ihale-default-cover.png";
import FirmaAvatar from "@/components/FirmaAvatar";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { usePackageQuota, canPerformAction } from "@/hooks/use-package-quota";
import UpgradeDialog from "@/components/UpgradeDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, ImageIcon, Search, TrendingUp, Eye, Layers, MessageSquare,
  Download, FileText, CheckCircle2, XCircle, Trash2, ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const paraBirimiSymbol: Record<string, string> = {
  TRY: "₺", USD: "$", EUR: "€", GBP: "£",
};

const ihaleTuruLabel: Record<string, string> = {
  urun_alis: "Ürün Alış İhalesi",
  urun_satis: "Ürün Satış İhalesi",
  hizmet_alim: "Hizmet İhalesi",
};

const teklifUsuluLabel: Record<string, string> = {
  acik_arttirma: "Açık Arttırma",
  acik_indirme: "Açık İndirme",
  kapali_teklif: "Kapalı Teklif",
};

function useCountdown(targetDate: string | null) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!targetDate) { setRemaining(""); return; }
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Süre doldu"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setRemaining(`${d} gün ${h} saat ${m} dakika ${s} saniye`);
      else if (h > 0) setRemaining(`${h} saat ${m} dakika ${s} saniye`);
      else setRemaining(`${m} dakika ${s} saniye`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return remaining;
}

interface TeklifItem {
  id: string;
  tutar: number;
  created_at: string;
  teklif_veren_user_id: string;
  durum: string;
  firma_unvani: string;
  firma_logo_url: string | null;
  firma_il: string;
  firma_ulke: string;
  odeme_secenekleri: string | null;
  kargo_masrafi: string | null;
  odeme_vadesi: string | null;
  ek_dosya_url: string | null;
  ek_dosya_adi: string | null;
}

export default function IhaleTakip() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ihale, setIhale] = useState<any>(null);
  const [kategoriName, setKategoriName] = useState("");
  const [teklifler, setTeklifler] = useState<TeklifItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [fiyatMin, setFiyatMin] = useState("");
  const [fiyatMax, setFiyatMax] = useState("");
  const [filterOdeme, setFilterOdeme] = useState("all");
  const [filterVade, setFilterVade] = useState("all");
  const [filterKargo, setFilterKargo] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc"); // asc = artan

  // DB options
  const [dbOdemeSecenekleri, setDbOdemeSecenekleri] = useState<string[]>([]);
  const [dbKargoMasrafi, setDbKargoMasrafi] = useState<string[]>([]);
  const [dbOdemeVadeleri, setDbOdemeVadeleri] = useState<string[]>([]);

  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState<{ type: "kabul" | "red" | "iptal" | "sil"; teklifId?: string } | null>(null);
  const packageInfo = usePackageQuota();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const countdown = useCountdown(ihale?.bitis_tarihi);
  const sym = paraBirimiSymbol[ihale?.para_birimi || "TRY"] || "₺";

  // Load dropdown options
  useEffect(() => {
    const loadOptions = async () => {
      const { data: cats } = await supabase
        .from("firma_bilgi_kategorileri")
        .select("id, name")
        .in("name", ["Ödeme Seçenekleri", "Kargo Masrafı Ödemesi", "Ödeme Vadeleri"]);
      if (!cats) return;

      const catMap: Record<string, string> = {};
      cats.forEach(c => { catMap[c.name] = c.id; });
      const catIds = cats.map(c => c.id);
      if (catIds.length === 0) return;

      const { data: opts } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("name, kategori_id")
        .in("kategori_id", catIds)
        .is("parent_id", null)
        .order("name");
      if (!opts) return;

      const odeme: string[] = [], kargo: string[] = [], vade: string[] = [];
      opts.forEach(o => {
        if (o.name.toLowerCase().includes("belirtmek")) return;
        if (o.kategori_id === catMap["Ödeme Seçenekleri"]) odeme.push(o.name);
        else if (o.kategori_id === catMap["Kargo Masrafı Ödemesi"]) kargo.push(o.name);
        else if (o.kategori_id === catMap["Ödeme Vadeleri"]) vade.push(o.name);
      });

      setDbOdemeSecenekleri(odeme);
      setDbKargoMasrafi(kargo);
      setDbOdemeVadeleri(vade);
    };
    loadOptions();
  }, []);

  const isAdmin = !!localStorage.getItem("admin_token");

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    // Check if admin
    const adminToken = localStorage.getItem("admin_token");

    if (!adminToken) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/giris-kayit"); return; }
      setCurrentUserId(user.id);
    }

    let ihaleData: any = null;

    if (adminToken) {
      // Admin: fetch via edge function (bypasses RLS)
      try {
        const { data: adminRes } = await supabase.functions.invoke("admin-auth/get-ihale-detail", {
          body: { token: adminToken, ihaleId: id },
        });
        if (adminRes?.ihale) ihaleData = adminRes.ihale;
      } catch {}
    } else {
      const { data: directData } = await supabase
        .from("ihaleler")
        .select("*")
        .eq("id", id)
        .single();
      ihaleData = directData;
    }

    if (!ihaleData) { setLoading(false); return; }

    // Verify ownership only for non-admin users
    if (!adminToken && currentUserId && ihaleData.user_id !== currentUserId) {
      toast({ title: "Yetki hatası", description: "Bu ihaleye erişim yetkiniz yok.", variant: "destructive" });
      navigate("/ihalelerim");
      return;
    }

    setIhale(ihaleData);

    // Resolve category name
    const katId = ihaleData.urun_kategori_id || ihaleData.hizmet_kategori_id;
    if (katId) {
      const { data: katData } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("name")
        .eq("id", katId)
        .single();
      if (katData) setKategoriName(katData.name);
    }

    // Fetch teklifler - admin uses service role via edge function, normal user uses direct query
    let teklifData: any[] = [];
    if (adminToken) {
      try {
        const { data: adminRes } = await supabase.functions.invoke("admin-auth/get-ihale-teklifler", {
          body: { token: adminToken, ihaleId: id },
        });
        teklifData = adminRes?.teklifler || [];
      } catch {}
    } else {
      const { data } = await supabase
        .from("ihale_teklifler")
        .select("id, tutar, created_at, teklif_veren_user_id, durum, odeme_secenekleri, kargo_masrafi, odeme_vadesi, ek_dosya_url, ek_dosya_adi")
        .eq("ihale_id", id)
        .order("created_at", { ascending: false });
      teklifData = data || [];
    }

    if (teklifData.length === 0) {
      setTeklifler([]);
      setLoading(false);
      return;
    }
    // Keep only latest per user
    const latestPerUser = new Map<string, any>();
    for (const t of teklifData) {
      if (!latestPerUser.has(t.teklif_veren_user_id)) {
        latestPerUser.set(t.teklif_veren_user_id, t);
      }
    }
    const uniqueTeklifler = Array.from(latestPerUser.values());

    // Fetch firma info for each teklif veren
    const userIds = [...new Set(uniqueTeklifler.map(t => t.teklif_veren_user_id))];
    const { data: firmalar } = await supabase
      .from("firmalar")
      .select("user_id, firma_unvani, logo_url, kurulus_il_id")
      .in("user_id", userIds);

    const firmaMap: Record<string, any> = {};
    firmalar?.forEach(f => { firmaMap[f.user_id] = f; });

    // Resolve il names
    const ilIds = firmalar?.map(f => f.kurulus_il_id).filter(Boolean) || [];
    let ilMap: Record<string, string> = {};
    if (ilIds.length > 0) {
      const { data: ilData } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .in("id", ilIds);
      ilData?.forEach(i => { ilMap[i.id] = i.name; });
    }

    const enriched: TeklifItem[] = uniqueTeklifler.map(t => {
      const firma = firmaMap[t.teklif_veren_user_id];
      return {
        ...t,
        firma_unvani: firma?.firma_unvani || "Bilinmeyen Firma",
        firma_logo_url: firma?.logo_url || null,
        firma_il: firma?.kurulus_il_id ? (ilMap[firma.kurulus_il_id] || "") : "",
        firma_ulke: "Türkiye",
      };
    });

    setTeklifler(enriched);
    setLoading(false);
  }, [id, navigate, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats
  const toplamTeklif = teklifler.length;
  const enIyiTeklif = (() => {
    if (teklifler.length === 0) return null;
    const tutarlar = teklifler.map(t => t.tutar);
    if (ihale?.teklif_usulu === "acik_indirme") return Math.min(...tutarlar);
    return Math.max(...tutarlar);
  })();

  // Handle teklif kabul
  const handleKabulEt = async (teklifId: string) => {
    const { error } = await supabase
      .from("ihale_teklifler")
      .update({ durum: "kabul_edildi" } as any)
      .eq("id", teklifId);

    if (error) {
      toast({ title: "Hata", description: "Teklif kabul edilemedi.", variant: "destructive" });
      return;
    }

    await supabase.from("ihaleler").update({ durum: "tamamlandi" } as any).eq("id", id);

    toast({ title: "Teklif kabul edildi", description: "İhale tamamlandı olarak işaretlendi." });
    fetchData();

    // Send teklif_kabul email to bidder
    try {
      const teklif = teklifler.find(t => t.id === teklifId);
      if (teklif && ihale) {
        const { data: bidderFirma } = await supabase
          .from("firmalar")
          .select("firma_unvani")
          .eq("user_id", teklif.teklif_veren_user_id)
          .single();

        supabase.functions.invoke("send-email", {
          body: {
            type: "teklif_kabul",
            userId: teklif.teklif_veren_user_id,
            templateModel: {
              firma_unvani: bidderFirma?.firma_unvani || "",
              ihale_basligi: ihale.baslik,
              ihale_linki: `${window.location.origin}/ihaleler/${ihale.id}`,
            },
          },
        }).catch(console.error);

        // Send teklif_kabul SMS to bidder
        supabase.functions.invoke("send-notification-sms", {
          body: {
            type: "teklif_kabul",
            userId: teklif.teklif_veren_user_id,
            firmaUnvani: bidderFirma?.firma_unvani || "",
            ihaleBasligi: ihale.baslik,
            ihaleDetayLinki: `${window.location.origin}/ihaleler/${ihale.id}`,
          },
        }).catch(console.error);

        // Send ihale_tamamlandi email to ihale owner
        const { data: ownerFirma } = await supabase
          .from("firmalar")
          .select("firma_unvani")
          .eq("user_id", ihale.user_id)
          .single();

        supabase.functions.invoke("send-email", {
          body: {
            type: "ihale_tamamlandi",
            userId: ihale.user_id,
            templateModel: {
              firma_unvani: ownerFirma?.firma_unvani || "",
              ihale_basligi: ihale.baslik,
            },
          },
        }).catch(console.error);
      }
    } catch (e) {
      console.error("[IhaleTakip] Notification error:", e);
    }
  };

  // Handle teklif red
  const handleReddet = async (teklifId: string) => {
    const { error } = await supabase
      .from("ihale_teklifler")
      .update({ durum: "reddedildi" } as any)
      .eq("id", teklifId);

    if (error) {
      toast({ title: "Hata", description: "Teklif reddedilemedi.", variant: "destructive" });
      return;
    }

    toast({ title: "Teklif reddedildi" });
    fetchData();

    // Send teklif_red email to bidder
    try {
      const teklif = teklifler.find(t => t.id === teklifId);
      if (teklif && ihale) {
        const { data: bidderFirma } = await supabase
          .from("firmalar")
          .select("firma_unvani")
          .eq("user_id", teklif.teklif_veren_user_id)
          .single();

        supabase.functions.invoke("send-email", {
          body: {
            type: "teklif_red",
            userId: teklif.teklif_veren_user_id,
            templateModel: {
              firma_unvani: bidderFirma?.firma_unvani || "",
              ihale_basligi: ihale.baslik,
              ihale_linki: `${window.location.origin}/ihaleler/${ihale.id}`,
            },
          },
        }).catch(console.error);
      }
    } catch (e) {
      console.error("[IhaleTakip] Email notification error:", e);
    }
  };

  // Handle ihale iptal
  const handleIhaleIptal = async () => {
    await supabase.from("ihaleler").update({ durum: "iptal" } as any).eq("id", id);
    toast({ title: "İhale iptal edildi" });
    navigate("/ihalelerim");
  };

  // Handle ihale sil
  const handleIhaleSil = async () => {
    const { error } = await supabase.from("ihaleler").delete().eq("id", id);
    if (error) {
      toast({ title: "Hata", description: "İhale silinemedi.", variant: "destructive" });
      return;
    }
    toast({ title: "İhale silindi" });
    navigate("/ihalelerim");
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case "kabul": if (confirmAction.teklifId) await handleKabulEt(confirmAction.teklifId); break;
      case "red": if (confirmAction.teklifId) await handleReddet(confirmAction.teklifId); break;
      case "iptal": await handleIhaleIptal(); break;
      case "sil": await handleIhaleSil(); break;
    }
    setConfirmAction(null);
  };

  // Handle mesaj gönder
  const handleMesajGonder = async (userId: string) => {
    if (!currentUserId) return;
    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${currentUserId})`)
      .maybeSingle();
    if (!existingConv) {
      const check = canPerformAction(packageInfo.limits, packageInfo.usage, "mesaj", { paketAd: packageInfo.paketAd });
      if (!check.allowed) {
        setUpgradeMessage(check.message || "Mesaj gönderme hakkınız dolmuştur.");
        setUpgradeOpen(true);
        return;
      }
    }
    const { data: convId } = await supabase.rpc("get_or_create_conversation", {
      p_user1: currentUserId,
      p_user2: userId,
    });
    if (!convId) return;

    const priceText = ihale?.baslangic_fiyati ? `${sym}${Number(ihale.baslangic_fiyati).toLocaleString("tr-TR")}` : "";
    navigate("/mesajlar", {
      state: {
        openConversationId: convId,
        otherUserId: userId,
        quote: {
          urunBaslik: ihale?.baslik,
          urunNo: ihale?.ihale_no,
          fiyat: priceText,
          fotoUrl: ihale?.foto_url,
        },
      },
    });
  };

  // Filtered & sorted teklifler
  const filteredTeklifler = teklifler
    .filter(t => {
      if (searchTerm && !t.firma_unvani.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (fiyatMin && t.tutar < Number(fiyatMin)) return false;
      if (fiyatMax && t.tutar > Number(fiyatMax)) return false;
      if (filterOdeme !== "all" && t.odeme_secenekleri !== filterOdeme) return false;
      if (filterVade !== "all" && t.odeme_vadesi !== filterVade) return false;
      if (filterKargo !== "all" && t.kargo_masrafi !== filterKargo) return false;
      return true;
    })
    .sort((a, b) => sortOrder === "asc" ? a.tutar - b.tutar : b.tutar - a.tutar);

  const confirmLabels: Record<string, { title: string; desc: string }> = {
    kabul: { title: "Teklifi Kabul Et", desc: "Bu teklifi kabul etmek istediğinize emin misiniz? İhale tamamlandı olarak işaretlenecektir." },
    red: { title: "Teklifi Reddet", desc: "Bu teklifi reddetmek istediğinize emin misiniz?" },
    iptal: { title: "İhaleyi İptal Et", desc: "İhaleyi yayından kaldırmak istediğinize emin misiniz? Bu işlem geri alınamaz." },
    sil: { title: "İhaleyi Sil", desc: "İhaleyi silmek istediğinize emin misiniz? Tüm teklifler de silinecektir." },
  };

  if (loading) {
    return (
      <DashboardLayout title="İhale Takip">
        <div className="flex items-center justify-center py-20 text-muted-foreground">Yükleniyor...</div>
      </DashboardLayout>
    );
  }

  if (!ihale) {
    return (
      <DashboardLayout title="İhale Takip">
        <div className="flex items-center justify-center py-20 text-muted-foreground">İhale bulunamadı.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="İhale Takip">
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/ihalelerim")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> İhalelerime Dön
        </Button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">İhale Takip Ekranı</h2>
          </div>
          <p className="text-sm text-muted-foreground">İhalenize gelen teklifleri inceleyebilir, kabul ya da reddedebilirsiniz.</p>
        </div>

        {/* Ihale Info Card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Photo */}
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {ihale.foto_url ? (
                  <img src={ihale.foto_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <img src={ihaleDefaultCover} alt="" className="w-full h-full object-contain p-1" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-lg">{ihale.baslik}</h3>
                <p className="text-sm text-muted-foreground">#{ihale.ihale_no}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">{ihaleTuruLabel[ihale.ihale_turu] || ihale.ihale_turu}</Badge>
                  <Badge variant="outline" className="text-xs">{teklifUsuluLabel[ihale.teklif_usulu] || ihale.teklif_usulu}</Badge>
                  {kategoriName && <Badge variant="outline" className="text-xs">{kategoriName}</Badge>}
                </div>
              </div>

              {/* Countdown */}
              {countdown && (
                <div className="border rounded-lg px-3 md:px-4 py-2 flex items-center gap-2 shrink-0 mt-2 sm:mt-0">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs md:text-sm font-medium text-foreground">{countdown}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Başlangıç Fiyatı</p>
                <p className="text-lg font-bold text-foreground">
                  {ihale.baslangic_fiyati ? `${Number(ihale.baslangic_fiyati).toLocaleString("tr-TR")} ${ihale.para_birimi || "TRY"}` : "-"}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">En İyi Teklif</p>
                <p className="text-lg font-bold text-foreground">
                  {enIyiTeklif !== null ? `${sym}${enIyiTeklif.toLocaleString("tr-TR")}` : "-"}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Toplam Teklif</p>
                <p className="text-lg font-bold text-foreground">{toplamTeklif}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Görüntülenme Sayısı</p>
                <p className="text-lg font-bold text-foreground">{ihale.goruntuleme_sayisi || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Ünvana göre ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Fiyat (Min-Max)</label>
              <div className="flex gap-1">
                <Input placeholder="Min" value={fiyatMin} onChange={(e) => setFiyatMin(e.target.value)} className="w-full" type="number" />
                <Input placeholder="Max" value={fiyatMax} onChange={(e) => setFiyatMax(e.target.value)} className="w-full" type="number" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Ödeme Şekli</label>
              <Select value={filterOdeme} onValueChange={setFilterOdeme}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Ödeme Şekli" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {dbOdemeSecenekleri.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Ödeme Vadesi</label>
              <Select value={filterVade} onValueChange={setFilterVade}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Ödeme Vadesi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {dbOdemeVadeleri.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Kargo Masrafı</label>
              <Select value={filterKargo} onValueChange={setFilterKargo}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Kargo Masrafı" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {dbKargoMasrafi.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Sıralama</label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Tutar (Artan)</SelectItem>
                  <SelectItem value="desc">Tutar (Azalan)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Teklif List */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Teklif Listesi ({filteredTeklifler.length})</h3>

          {filteredTeklifler.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Henüz teklif bulunmamaktadır.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTeklifler.map((teklif) => (
                <Card key={teklif.id} className="border">
                    <div className="p-4 sm:p-5">
                     <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 md:gap-6">
                       {/* Firma Info */}
                       <div className="flex items-center gap-3 w-full sm:w-auto sm:min-w-[180px]">
                         <FirmaAvatar firmaUnvani={teklif.firma_unvani} logoUrl={teklif.firma_logo_url} size="md" className="rounded-full" />
                         <div className="min-w-0">
                           <p className="font-semibold text-foreground text-sm truncate">{teklif.firma_unvani}</p>
                           {teklif.firma_il && (
                             <p className="text-xs text-muted-foreground">📍 {teklif.firma_il}, {teklif.firma_ulke}</p>
                           )}
                         </div>
                       </div>

                       {/* Teklif Details */}
                       <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                         <div>
                           <p className="text-xs text-muted-foreground font-medium uppercase">Teklif Tutarı</p>
                           <p className="text-base sm:text-lg font-bold text-foreground">{sym}{teklif.tutar.toLocaleString("tr-TR")}</p>
                         </div>
                         <div>
                           <p className="text-xs text-muted-foreground font-medium uppercase">Ödeme Vadesi</p>
                           <p className="text-sm font-medium text-foreground">{teklif.odeme_vadesi || "-"}</p>
                         </div>
                         <div>
                           <p className="text-xs text-muted-foreground font-medium uppercase">Teklif Tarihi</p>
                           <p className="text-sm font-medium text-foreground">
                             {format(new Date(teklif.created_at), "dd.MM.yyyy, HH:mm", { locale: tr })}
                           </p>
                         </div>
                         <div>
                           <p className="text-xs text-muted-foreground font-medium uppercase">Durum</p>
                           <Badge
                             variant="secondary"
                             className={
                               teklif.durum === "kabul_edildi" ? "bg-emerald-100 text-emerald-700" :
                                 teklif.durum === "reddedildi" ? "bg-red-100 text-red-700" :
                                   "bg-amber-100 text-amber-700"
                             }
                           >
                             {teklif.durum === "kabul_edildi" ? "Kabul Edildi" : teklif.durum === "reddedildi" ? "Reddedildi" : "İnceleniyor"}
                           </Badge>
                         </div>
                       </div>
                     </div>

                    {/* Second row: Ödeme Şekli & Kargo */}
                    <div className="flex flex-wrap gap-6 mt-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Ödeme Şekli</p>
                        <p className="text-sm font-medium text-foreground">{teklif.odeme_secenekleri || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Kargo Masrafı</p>
                        <p className="text-sm font-medium text-primary">{teklif.kargo_masrafi || "-"}</p>
                      </div>
                    </div>

                     {/* Actions */}
                     <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 mt-4 pt-3 border-t">
                       <Button
                         variant="outline"
                         size="sm"
                         className="gap-1 w-full sm:w-auto"
                         onClick={() => handleMesajGonder(teklif.teklif_veren_user_id)}
                       >
                         <MessageSquare className="w-3.5 h-3.5" /> Mesaj Gönder
                       </Button>
                       {teklif.ek_dosya_url && (
                         <a href={teklif.ek_dosya_url} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                           <Button variant="outline" size="sm" className="gap-1 w-full">
                             <Download className="w-3.5 h-3.5" /> Ek Dosya {teklif.ek_dosya_adi ? `(${teklif.ek_dosya_adi.split('.').pop()?.toUpperCase()})` : ""}
                           </Button>
                         </a>
                       )}

                       {teklif.durum === "inceleniyor" && ihale.durum === "devam_ediyor" && (
                         <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
                           <Button
                             variant="outline"
                             size="sm"
                             className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1 sm:flex-none"
                             onClick={() => setConfirmAction({ type: "red", teklifId: teklif.id })}
                           >
                             Reddet
                           </Button>
                           <Button
                             size="sm"
                             className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none"
                             onClick={() => setConfirmAction({ type: "kabul", teklifId: teklif.id })}
                           >
                             <CheckCircle2 className="w-3.5 h-3.5" /> Kabul Et
                           </Button>
                         </div>
                       )}
                     </div>
                   </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* İhale Actions */}
        {ihale.durum === "devam_ediyor" && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground gap-2"
              onClick={() => setConfirmAction({ type: "iptal" })}
            >
              <XCircle className="w-4 h-4" /> İhaleyi Yayından Kaldır
            </Button>
          </div>
        )}

        {(ihale.durum === "duzenleniyor" || ihale.durum === "iptal" || ihale.durum === "tamamlandi") && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground gap-2"
              onClick={() => setConfirmAction({ type: "sil" })}
            >
              <Trash2 className="w-4 h-4" /> İhaleyi Sil
            </Button>
          </div>
        )}

        {/* Confirm Dialog */}
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmAction ? confirmLabels[confirmAction.type]?.title : ""}</AlertDialogTitle>
              <AlertDialogDescription>{confirmAction ? confirmLabels[confirmAction.type]?.desc : ""}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmAction}>
                Evet, Devam Et
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <UpgradeDialog
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          title="Mesaj Hakkınız Doldu"
          message={upgradeMessage}
        />
      </div>
    </DashboardLayout>
  );
}
