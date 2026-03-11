import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Users, Clock, AlertCircle, CheckCircle, XCircle,
  Search, Filter, ExternalLink, Gavel, FileText, Package, ShieldAlert, HeadphonesIcon, RotateCcw, TrendingUp,
  CreditCard, Wifi, ArrowUpDown, ArrowUp, ArrowDown, Infinity, Eye, MessageSquare, Loader2
} from "lucide-react";

// Shared style helpers
const s = {
  card: {
    background: "hsl(var(--admin-card-bg))",
    border: "1px solid hsl(var(--admin-border))",
    borderRadius: "0.75rem",
  } as CSSProperties,
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
  secondary: { color: "hsl(var(--admin-text-secondary))" } as CSSProperties,
  input: {
    background: "hsl(var(--admin-input-bg))",
    borderColor: "hsl(var(--admin-border))",
    color: "hsl(var(--admin-text))",
  } as CSSProperties,
  statBox: {
    background: "hsl(var(--admin-hover))",
    borderRadius: "0.5rem",
    padding: "0.625rem",
    textAlign: "center" as const,
  } as CSSProperties,
};

// Color-coded value helper: <5 red, 6-20 yellow, 20+ green
function getValueColor(value: number): string {
  if (value < 5) return "#ef4444";
  if (value <= 20) return "#eab308";
  return "#22c55e";
}

function getValueBgColor(value: number): string {
  if (value < 5) return "rgba(239,68,68,0.1)";
  if (value <= 20) return "rgba(234,179,8,0.1)";
  return "rgba(34,197,94,0.1)";
}

interface FirmaItem {
  id: string;
  firma_unvani: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  onay_durumu: string;
  user_id: string;
  firma_turu_id: string;
  firma_tipi_id: string;
  kurulus_il_id: string | null;
  kurulus_ilce_id: string | null;
  firma_turu_name: string | null;
  firma_tipi_name: string | null;
  il_name: string | null;
  ilce_name: string | null;
  ihale_sayisi: number;
  teklif_sayisi: number;
  urun_sayisi: number;
  sikayet_sayisi: number;
  profil_doluluk: number;
  profile: { ad: string; soyad: string; iletisim_email: string; iletisim_numarasi: string | null; last_seen: string | null } | null;
  abonelik: {
    paket_id: string;
    paket_ad: string;
    paket_slug: string;
    periyot: string;
    donem_baslangic: string;
    donem_bitis: string;
    durum: string;
    limits: any;
  } | null;
}

interface FirmaStats {
  total: number;
  turDagilimi: { name: string; id: string; count: number }[];
  tipDagilimi: { name: string; id: string; firma_turu_id: string; count: number }[];
  recent: number;
  pending: number;
  paketDagilimi: { id: string; ad: string; slug: string; count: number }[];
  yeniAboneler: { son24saat: number; sonBirHafta: number; sonBirAy: number };
  onlineCount: number;
}

interface FirmaDetail {
  firma: any;
  profile: any;
  email: string | null;
}

type SortField = "ihale_sayisi" | "teklif_sayisi" | "urun_sayisi" | "profil_doluluk";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

export default function AdminFirmalar() {
  const { token, hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [firmalar, setFirmalar] = useState<FirmaItem[]>([]);
  const [stats, setStats] = useState<FirmaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statsDays, setStatsDays] = useState(7);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Yeni Firma dialog state
  const [yeniFirmaOpen, setYeniFirmaOpen] = useState(false);
  const [yeniFirmaSaving, setYeniFirmaSaving] = useState(false);
  const [yeniFirma, setYeniFirma] = useState({
    email: "", password: "", ad: "", soyad: "", iletisim_email: "", iletisim_numarasi: "",
    firma_unvani: "", vergi_numarasi: "", vergi_dairesi: "", firma_turu_id: "", firma_tipi_id: "",
  });

  const [filterTuru, setFilterTuru] = useState<string>("all");
  const [filterTipi, setFilterTipi] = useState<string>("all");
  const [filterIl, setFilterIl] = useState<string>("all");
  const [filterDurum, setFilterDurum] = useState<string>("all");
  const [filterMinIhale, setFilterMinIhale] = useState("");
  const [filterMaxIhale, setFilterMaxIhale] = useState("");
  const [filterMinTeklif, setFilterMinTeklif] = useState("");
  const [filterMaxTeklif, setFilterMaxTeklif] = useState("");
  const [filterMinUrun, setFilterMinUrun] = useState("");
  const [filterMaxUrun, setFilterMaxUrun] = useState("");
  const [filterMinProfil, setFilterMinProfil] = useState("");
  const [filterMaxProfil, setFilterMaxProfil] = useState("");
  const [filterPaket, setFilterPaket] = useState<string>("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Stat card filter for tip dağılımı
  const [statTurFilter, setStatTurFilter] = useState<string>("all");
  const [abonePeriod, setAbonePeriod] = useState<"son24saat" | "sonBirHafta" | "sonBirAy">("sonBirHafta");

  const [turler, setTurler] = useState<{ id: string; name: string }[]>([]);
  const [tipler, setTipler] = useState<{ id: string; name: string; firma_turu_id: string }[]>([]);
  const [iller, setIller] = useState<{ id: string; name: string }[]>([]);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDetail, setReviewDetail] = useState<FirmaDetail | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Package management dialog
  const [paketDialogOpen, setPaketDialogOpen] = useState(false);
  const [paketDialogFirma, setPaketDialogFirma] = useState<FirmaItem | null>(null);
  const [paketDialogLoading, setPaketDialogLoading] = useState(false);
  const [paketDialogQuota, setPaketDialogQuota] = useState<any>(null);
  const [allPaketler, setAllPaketler] = useState<any[]>([]);
  const [selectedPaketId, setSelectedPaketId] = useState<string>("");
  const [paketSaving, setPaketSaving] = useState(false);
  const [ekstraHaklar, setEkstraHaklar] = useState<Record<string, number>>({});
  const [ekstraSaving, setEkstraSaving] = useState(false);

  const callApi = useCallback(async (action: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, { body });
    if (error) throw error;
    return data;
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [firmaData, statsData] = await Promise.all([
        callApi("list-firmalar", { token }),
        callApi("firma-stats", { token, days: statsDays }),
      ]);
      setFirmalar(firmaData.firmalar || []);
      setStats(statsData);
    } catch {
      toast({ title: "Hata", description: "Veriler yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, statsDays, callApi, toast]);

  const fetchDropdowns = useCallback(async () => {
    if (!token) return;
    try {
      // Fetch turler/tipler via edge function (bypasses RLS)
      const dropdownData = await callApi("get-dropdown-options", { token });
      setTurler(dropdownData.turler || []);
      setTipler((dropdownData.tipler || []) as any);

      // Fetch iller via edge function's panel-stats or directly
      const ilKatId = await getIlKategoriId();
      const { data: il } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", ilKatId).order("name");
      setIller(il || []);
    } catch {
      // fallback: try direct queries
      const ilKatId = await getIlKategoriId();
      const [{ data: t }, { data: tp }, { data: il }] = await Promise.all([
        supabase.from("firma_turleri").select("id, name").order("name"),
        supabase.from("firma_tipleri").select("id, name, firma_turu_id").order("name"),
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", ilKatId).order("name"),
      ]);
      setTurler(t || []);
      setTipler((tp || []) as any);
      setIller(il || []);
    }
  }, [token, callApi]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchDropdowns(); }, []);

  const handleApprove = async (firmaId: string) => {
    try {
      await callApi("approve-firma", { token, firmaId });
      toast({ title: "Başarılı", description: "Firma onaylandı" });
      setReviewDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    }
  };

  const handleReject = async (firmaId: string) => {
    try {
      await callApi("reject-firma", { token, firmaId });
      toast({ title: "Başarılı", description: "Firma reddedildi" });
      setReviewDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    }
  };

  const openReview = async (firma: FirmaItem) => {
    setReviewLoading(true);
    setReviewDialogOpen(true);
    try {
      const detail = await callApi("get-firma-detail", { token, firmaId: firma.id });
      setReviewDetail(detail);
    } catch {
      toast({ title: "Hata", description: "Detay yüklenemedi", variant: "destructive" });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const result = await callApi("impersonate", { token, userId });
      if (result.access_token && result.refresh_token) {
        await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });
        window.open("/dashboard", "_blank");
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Giriş yapılamadı", variant: "destructive" });
    }
  };

  // Package dialog
  const openPaketDialog = async (firma: FirmaItem) => {
    setPaketDialogFirma(firma);
    setPaketDialogOpen(true);
    setPaketDialogLoading(true);
    setSelectedPaketId(firma.abonelik?.paket_id || "");
    setEkstraHaklar({});
    try {
      const [quotaRes, paketlerRes] = await Promise.all([
        callApi("get-firma-quota", { token, userId: firma.user_id }),
        callApi("paketler-list", {}),
      ]);
      setPaketDialogQuota(quotaRes);
      setAllPaketler(paketlerRes.paketler || []);
      setEkstraHaklar(quotaRes?.abonelik?.ekstra_haklar || {});
    } catch {
      toast({ title: "Hata", description: "Paket bilgisi yüklenemedi", variant: "destructive" });
    } finally {
      setPaketDialogLoading(false);
    }
  };

  const handleChangePaket = async () => {
    if (!paketDialogFirma || !selectedPaketId) return;
    setPaketSaving(true);
    try {
      const res = await callApi("update-firma-paket", { token, userId: paketDialogFirma.user_id, paketId: selectedPaketId, ekstraHaklar });
      if (res.error) throw new Error(res.error);
      toast({ title: "Başarılı", description: "Paket güncellendi." });
      setPaketDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message, variant: "destructive" });
    } finally {
      setPaketSaving(false);
    }
  };

  const handleSaveEkstraHaklar = async () => {
    if (!hasPermission("paket_ekstra_hak")) {
      toast({ title: "Yetkisiz", description: "Buna yetkiniz yok", variant: "destructive" });
      return;
    }
    if (!paketDialogFirma) return;
    setEkstraSaving(true);
    try {
      const res = await callApi("update-ekstra-haklar", { token, userId: paketDialogFirma.user_id, ekstraHaklar });
      if (res.error) throw new Error(res.error);
      toast({ title: "Başarılı", description: "Ekstra haklar güncellendi." });
      // Refresh quota display
      const quotaRes = await callApi("get-firma-quota", { token, userId: paketDialogFirma.user_id });
      setPaketDialogQuota(quotaRes);
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message, variant: "destructive" });
    } finally {
      setEkstraSaving(false);
    }
  };

  const clearFilters = () => {
    setFilterTuru("all"); setFilterTipi("all"); setFilterIl("all"); setFilterDurum("all"); setFilterPaket("all");
    setFilterMinIhale(""); setFilterMaxIhale(""); setFilterMinTeklif(""); setFilterMaxTeklif("");
    setFilterMinUrun(""); setFilterMaxUrun(""); setFilterMinProfil(""); setFilterMaxProfil("");
    setSearchTerm(""); setSortField(null);
  };

  const hasActiveFilters = filterTuru !== "all" || filterTipi !== "all" || filterIl !== "all" || filterDurum !== "all" || filterPaket !== "all" ||
    filterMinIhale || filterMaxIhale || filterMinTeklif || filterMaxTeklif ||
    filterMinUrun || filterMaxUrun || filterMinProfil || filterMaxProfil || searchTerm;

  const filtered = firmalar.filter((f) => {
    if (searchTerm && !f.firma_unvani.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterTuru !== "all" && f.firma_turu_id !== filterTuru) return false;
    if (filterTipi !== "all" && f.firma_tipi_id !== filterTipi) return false;
    if (filterIl !== "all" && f.kurulus_il_id !== filterIl) return false;
    if (filterDurum !== "all" && f.onay_durumu !== filterDurum) return false;
    if (filterPaket !== "all") {
      if (filterPaket === "none" && f.abonelik) return false;
      if (filterPaket !== "none" && f.abonelik?.paket_id !== filterPaket) return false;
    }
    if (filterMinIhale && f.ihale_sayisi < Number(filterMinIhale)) return false;
    if (filterMaxIhale && f.ihale_sayisi > Number(filterMaxIhale)) return false;
    if (filterMinTeklif && f.teklif_sayisi < Number(filterMinTeklif)) return false;
    if (filterMaxTeklif && f.teklif_sayisi > Number(filterMaxTeklif)) return false;
    if (filterMinUrun && f.urun_sayisi < Number(filterMinUrun)) return false;
    if (filterMaxUrun && f.urun_sayisi > Number(filterMaxUrun)) return false;
    if (filterMinProfil && f.profil_doluluk < Number(filterMinProfil)) return false;
    if (filterMaxProfil && f.profil_doluluk > Number(filterMaxProfil)) return false;
    return true;
  });

  // Sorting
  const sorted = [...filtered];
  if (sortField) {
    sorted.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFirmalar = sorted.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterTuru, filterTipi, filterIl, filterDurum, filterPaket, filterMinIhale, filterMaxIhale, filterMinTeklif, filterMaxTeklif, filterMinUrun, filterMaxUrun, filterMinProfil, filterMaxProfil, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === "desc") setSortDir("asc");
      else { setSortField(null); setSortDir("desc"); }
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3" />;
    return sortDir === "desc" ? <ArrowDown className="w-3 h-3 text-amber-500" /> : <ArrowUp className="w-3 h-3 text-amber-500" />;
  };

  const durumBadge = (durum: string) => {
    switch (durum) {
      case "onaylandi": return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px] px-1.5 py-0">Onaylı</Badge>;
      case "onay_bekliyor": return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0">Onay Bekliyor</Badge>;
      case "onaysiz": return <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px] px-1.5 py-0">Reddedildi</Badge>;
      default: return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{durum}</Badge>;
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const renderLimit = (val: number | null) => {
    if (val === null) return <span className="flex items-center gap-1 text-xs"><Infinity className="w-3 h-3" /> Sınırsız</span>;
    if (val === 0) return <span className="text-xs text-red-400">Kapalı</span>;
    return <span className="text-xs">{val}</span>;
  };

  // Tip dağılımı filtered by selected tur
  const filteredTipDagilimi = stats?.tipDagilimi?.filter(
    (tp) => statTurFilter === "all" || tp.firma_turu_id === statTurFilter
  ) || [];

  const handleCreateFirma = async () => {
    if (!yeniFirma.email || !yeniFirma.password || !yeniFirma.ad || !yeniFirma.soyad || !yeniFirma.firma_unvani || !yeniFirma.vergi_numarasi || !yeniFirma.vergi_dairesi || !yeniFirma.firma_turu_id || !yeniFirma.firma_tipi_id) {
      toast({ title: "Hata", description: "E-posta, şifre, ad, soyad, firma ünvanı, vergi numarası, vergi dairesi, firma türü ve firma tipi zorunludur", variant: "destructive" });
      return;
    }
    setYeniFirmaSaving(true);
    try {
      await callApi("create-firma", { token, ...yeniFirma });
      toast({ title: "Başarılı", description: "Firma oluşturuldu" });
      setYeniFirmaOpen(false);
      setYeniFirma({ email: "", password: "", ad: "", soyad: "", iletisim_email: "", iletisim_numarasi: "", firma_unvani: "", vergi_numarasi: "", vergi_dairesi: "", firma_turu_id: "", firma_tipi_id: "" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    } finally {
      setYeniFirmaSaving(false);
    }
  };

  const filteredTipler = tipler.filter(t => yeniFirma.firma_turu_id === "" || t.firma_turu_id === yeniFirma.firma_turu_id);

  return (
    <AdminLayout title="Firmalar">
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex justify-end">
          <Button onClick={() => setYeniFirmaOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Building2 className="w-4 h-4 mr-2" /> Yeni Firma Oluştur
          </Button>
        </div>

        {/* Summary Cards */}
        {stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Total */}
              <div style={s.card} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={s.muted}>Toplam</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: getValueColor(stats.total) }}>{stats.total}</div>
                <p className="text-xs mt-1" style={s.muted}>Kayıtlı firma</p>
              </div>

              {/* Pending */}
              <div style={s.card} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={s.muted}>Bekleyen</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: getValueColor(stats.pending) }}>{stats.pending}</div>
                <p className="text-xs mt-1" style={s.muted}>Onay bekliyor</p>
              </div>

              {/* Recent */}
              <div style={s.card} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <Select value={String(statsDays)} onValueChange={(v) => setStatsDays(Number(v))}>
                    <SelectTrigger className="w-auto h-5 text-[10px] border-0 bg-transparent px-1 gap-1" style={s.text}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ ...s.card, padding: "0.25rem" }}>
                      <SelectItem value="1" className="text-xs">24 Saat</SelectItem>
                      <SelectItem value="7" className="text-xs">7 Gün</SelectItem>
                      <SelectItem value="15" className="text-xs">15 Gün</SelectItem>
                      <SelectItem value="30" className="text-xs">30 Gün</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-3xl font-bold" style={{ color: getValueColor(stats.recent) }}>{stats.recent}</div>
                <p className="text-xs mt-1" style={s.muted}>
                  {statsDays === 1 ? "Son 24 saat" : `Son ${statsDays} gün`}
                </p>
              </div>

              {/* Online count */}
              <div style={s.card} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Wifi className="w-5 h-5 text-green-400" />
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={s.muted}>Çevrimiçi</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: getValueColor(stats.onlineCount) }}>{stats.onlineCount}</div>
                <p className="text-xs mt-1" style={s.muted}>Son 15 dk aktif</p>
              </div>

              {/* New subscribers */}
              <div style={s.card} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="w-5 h-5 text-amber-400" />
                  <Select value={abonePeriod} onValueChange={(v: any) => setAbonePeriod(v)}>
                    <SelectTrigger className="w-auto h-5 text-[10px] border-0 bg-transparent px-1 gap-1" style={s.text}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ ...s.card, padding: "0.25rem" }}>
                      <SelectItem value="son24saat" className="text-xs">24 Saat</SelectItem>
                      <SelectItem value="sonBirHafta" className="text-xs">1 Hafta</SelectItem>
                      <SelectItem value="sonBirAy" className="text-xs">1 Ay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-3xl font-bold" style={{ color: getValueColor(stats.yeniAboneler[abonePeriod]) }}>{stats.yeniAboneler[abonePeriod]}</div>
                <p className="text-xs mt-1" style={s.muted}>Yeni abone</p>
              </div>
            </div>

            {/* Second row: Package distribution + Tür/Tip dağılımı */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Package distribution */}
              <div style={s.card} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium" style={s.muted}>Paket Dağılımı</span>
                </div>
                <div className="space-y-2">
                  {stats.paketDagilimi.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs gap-2">
                      <span className="truncate" style={s.muted}>{p.ad}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--admin-hover))" }}>
                          <div className="h-full rounded-full bg-amber-500" style={{ width: `${stats.total > 0 ? (p.count / stats.total) * 100 : 0}%` }} />
                        </div>
                        <span className="font-semibold w-6 text-right" style={{ color: getValueColor(p.count) }}>{p.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tür dağılımı */}
              <div style={s.card} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium" style={s.muted}>Tür Dağılımı</span>
                </div>
                <div className="space-y-1.5">
                  {stats.turDagilimi.map((t) => (
                    <div key={t.name} className="flex items-center justify-between text-xs gap-2">
                      <span className="truncate" style={s.muted}>{t.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--admin-hover))" }}>
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${stats.total > 0 ? (t.count / stats.total) * 100 : 0}%` }} />
                        </div>
                        <span className="font-semibold w-4 text-right" style={{ color: getValueColor(t.count) }}>{t.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip dağılımı */}
              <div style={s.card} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium" style={s.muted}>Tip Dağılımı</span>
                  </div>
                  <Select value={statTurFilter} onValueChange={setStatTurFilter}>
                    <SelectTrigger className="w-auto h-5 text-[10px] border-0 bg-transparent px-1 gap-1" style={s.text}>
                      <SelectValue placeholder="Tür Filtre" />
                    </SelectTrigger>
                    <SelectContent style={{ ...s.card, padding: "0.25rem" }}>
                      <SelectItem value="all" className="text-xs">Tümü</SelectItem>
                      {stats.turDagilimi.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {filteredTipDagilimi.length === 0 && <p className="text-xs" style={s.muted}>Veri yok</p>}
                  {filteredTipDagilimi.slice(0, 10).map((tp) => (
                    <div key={tp.id} className="flex items-center justify-between text-xs gap-2">
                      <span className="truncate" style={s.muted}>{tp.name}</span>
                      <span className="font-semibold" style={{ color: getValueColor(tp.count) }}>{tp.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
              <Input placeholder="Firma adı ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" style={s.input} />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" }}>
              <Filter className="w-4 h-4 mr-2" /> Filtreler
              {hasActiveFilters && <span className="ml-2 w-2 h-2 rounded-full bg-amber-500" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-red-500 hover:text-red-600 text-xs px-3">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Temizle
              </Button>
            )}
          </div>

          {showFilters && (
            <div style={s.card} className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <FilterSelect label="Durum" value={filterDurum} onChange={setFilterDurum}
                options={[{ value: "all", label: "Tümü" }, { value: "onay_bekliyor", label: "Onay Bekliyor" }, { value: "onaylandi", label: "Onaylı" }, { value: "onaysiz", label: "Reddedildi" }]} />
              <FilterSelect label="Firma Türü" value={filterTuru} onChange={setFilterTuru}
                options={[{ value: "all", label: "Tümü" }, ...turler.map(t => ({ value: t.id, label: t.name }))]} />
              <FilterSelect label="Firma Tipi" value={filterTipi} onChange={setFilterTipi}
                options={[{ value: "all", label: "Tümü" }, ...tipler.filter(tp => filterTuru === "all" || tp.firma_turu_id === filterTuru).map(tp => ({ value: tp.id, label: tp.name }))]} />
              <FilterSelect label="İl" value={filterIl} onChange={setFilterIl}
                options={[{ value: "all", label: "Tümü" }, ...iller.map(il => ({ value: il.id, label: il.name }))]} />
              <FilterSelect label="Paket" value={filterPaket} onChange={setFilterPaket}
                options={[
                  { value: "all", label: "Tümü" },
                  { value: "none", label: "Paket Yok" },
                  ...(stats?.paketDagilimi || []).map(p => ({ value: p.id, label: p.ad })),
                ]} />
              <FilterRange label="İhale Sayısı" min={filterMinIhale} max={filterMaxIhale} onMinChange={setFilterMinIhale} onMaxChange={setFilterMaxIhale} />
              <FilterRange label="Teklif Sayısı" min={filterMinTeklif} max={filterMaxTeklif} onMinChange={setFilterMinTeklif} onMaxChange={setFilterMaxTeklif} />
              <FilterRange label="Ürün Sayısı" min={filterMinUrun} max={filterMaxUrun} onMinChange={setFilterMinUrun} onMaxChange={setFilterMaxUrun} />
              <FilterRange label="Profil Doluluk %" min={filterMinProfil} max={filterMaxProfil} onMinChange={setFilterMinProfil} onMaxChange={setFilterMaxProfil} />
              <div className="col-span-2 md:col-span-4 flex justify-end">
                <Button variant="ghost" onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600">
                  <RotateCcw className="w-3 h-3 mr-1.5" /> Tüm Filtreleri Temizle
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sorting + result count */}
        <div className="flex items-center justify-between text-xs" style={s.muted}>
          <span>{sorted.length} firma listeleniyor {hasActiveFilters && `(${firmalar.length} toplam)`}</span>
          <div className="flex items-center gap-2">
            <span>Sırala:</span>
            {(["ihale_sayisi", "teklif_sayisi", "urun_sayisi", "profil_doluluk"] as SortField[]).map(field => (
              <Button key={field} variant="ghost" size="sm" onClick={() => toggleSort(field)}
                className={`text-xs h-7 px-2 gap-1 ${sortField === field ? "text-amber-500" : ""}`}
                style={sortField !== field ? s.muted : undefined}>
                {field === "ihale_sayisi" ? "İhale" : field === "teklif_sayisi" ? "Teklif" : field === "urun_sayisi" ? "Ürün" : "Profil"}
                <SortIcon field={field} />
              </Button>
            ))}
            <span className="ml-4">Sayfa {safePage} / {totalPages}</span>
          </div>
        </div>

        {/* Firma List */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.length === 0 && (
              <div className="text-center py-12" style={s.muted}>Firma bulunamadı.</div>
            )}
            {paginatedFirmalar.map((firma) => (
              <div key={firma.id} style={s.card} className="p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: "hsl(var(--admin-hover))" }}>
                      {firma.logo_url ? (
                        <img src={firma.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-5 h-5" style={s.muted} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base" style={s.text}>{firma.firma_unvani}</h3>
                        {durumBadge(firma.onay_durumu)}
                        {/* Package badge */}
                        <Badge
                          className="text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            background: firma.abonelik?.paket_slug === "pro" ? "rgba(234,179,8,0.15)" : "rgba(100,116,139,0.15)",
                            color: firma.abonelik?.paket_slug === "pro" ? "#eab308" : "#94a3b8",
                            borderColor: firma.abonelik?.paket_slug === "pro" ? "rgba(234,179,8,0.3)" : "rgba(100,116,139,0.3)",
                          }}
                          onClick={(e) => { e.stopPropagation(); openPaketDialog(firma); }}
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          {firma.abonelik?.paket_ad || "Paket Yok"}
                        </Badge>
                      </div>
                      <p className="text-sm" style={s.secondary}>
                        {firma.firma_turu_name || "—"} · {firma.firma_tipi_name || "—"}
                      </p>
                      {firma.il_name && (
                        <span className="text-xs" style={s.muted}>{firma.il_name}{firma.ilce_name ? ` / ${firma.ilce_name}` : ""}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {firma.onay_durumu === "onay_bekliyor" && (
                      <Button onClick={(e) => { e.stopPropagation(); openReview(firma); }} className="bg-amber-500 hover:bg-amber-600 text-white text-xs" size="sm">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Başvuruyu Değerlendir
                      </Button>
                    )}
                    <Button onClick={(e) => { e.stopPropagation(); handleImpersonate(firma.user_id); }}
                      variant="outline" size="sm" className="text-xs"
                      style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" }}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Kullanıcıyı Yönet
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-6 mb-3 text-xs" style={s.muted}>
                  <span>Kayıt: {formatDate(firma.created_at)}</span>
                  <span>Son Hareket: {firma.profile?.last_seen ? formatDate(firma.profile.last_seen) : "—"}</span>
                  {firma.profile?.last_seen && new Date(firma.profile.last_seen) >= new Date(Date.now() - 15 * 60 * 1000) && (
                    <span className="flex items-center gap-1 text-emerald-400"><Wifi className="w-3 h-3" /> Çevrimiçi</span>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  <ColoredStatBox icon={Gavel} label="İhale" value={firma.ihale_sayisi} />
                  <ColoredStatBox icon={FileText} label="Teklif" value={firma.teklif_sayisi} />
                  <ColoredStatBox icon={Package} label="Ürün" value={firma.urun_sayisi} />
                  <ColoredStatBox icon={Users} label="Profil" value={firma.profil_doluluk} suffix="%" />
                  <ColoredStatBox icon={ShieldAlert} label="Şikayet" value={firma.sikayet_sayisi} />
                  <ColoredStatBox icon={HeadphonesIcon} label="Destek" value={0} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }} className="text-xs">← Önceki</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                typeof p === "string" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs" style={s.muted}>…</span>
                ) : (
                  <Button key={p} size="sm" variant={p === safePage ? "default" : "outline"}
                    onClick={() => setCurrentPage(p)}
                    className={p === safePage ? "bg-amber-500 hover:bg-amber-600 text-white text-xs w-8 h-8 p-0" : "text-xs w-8 h-8 p-0"}
                    style={p !== safePage ? { borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" } : undefined}>
                    {p}
                  </Button>
                )
              )}
            <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }} className="text-xs">Sonraki →</Button>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent style={s.card} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={s.text}>Başvuruyu Değerlendir</DialogTitle>
            <DialogDescription style={s.muted}>Firma kayıt bilgilerini inceleyin ve onaylayın veya reddedin.</DialogDescription>
          </DialogHeader>
          {reviewLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : reviewDetail ? (
            <div className="space-y-4">
              <InfoRow label="E-posta" value={reviewDetail.email} />
              <InfoRow label="Ad Soyad" value={`${reviewDetail.profile?.ad || ""} ${reviewDetail.profile?.soyad || ""}`} />
              <InfoRow label="İletişim E-posta" value={reviewDetail.profile?.iletisim_email} />
              <InfoRow label="Telefon" value={reviewDetail.profile?.iletisim_numarasi} />
              <div style={{ borderTop: "1px solid hsl(var(--admin-border))", paddingTop: "0.75rem" }} />
              <InfoRow label="Firma Ünvanı" value={reviewDetail.firma?.firma_unvani} />
              <InfoRow label="Firma Türü" value={reviewDetail.firma?.firma_turu_name} />
              <InfoRow label="Firma Tipi" value={reviewDetail.firma?.firma_tipi_name} />
              <InfoRow label="Vergi No" value={reviewDetail.firma?.vergi_numarasi} />
              <InfoRow label="Vergi Dairesi" value={reviewDetail.firma?.vergi_dairesi} />
            </div>
          ) : null}
          {reviewDetail && (
            <DialogFooter className="gap-2 mt-4">
              <Button variant="ghost" onClick={() => handleReject(reviewDetail.firma.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                <XCircle className="w-4 h-4 mr-2" /> Reddet
              </Button>
              <Button onClick={() => handleApprove(reviewDetail.firma.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle className="w-4 h-4 mr-2" /> Onayla
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Package Management Dialog */}
      <Dialog open={paketDialogOpen} onOpenChange={setPaketDialogOpen}>
        <DialogContent style={s.card} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={s.text}>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                Paket Yönetimi
              </div>
            </DialogTitle>
            <DialogDescription style={s.muted}>
              {paketDialogFirma?.firma_unvani} — paket değişikliği ve kota görüntüleme
            </DialogDescription>
          </DialogHeader>

          {paketDialogLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Current package */}
              <div>
                <Label className="text-xs mb-2 block" style={s.muted}>Mevcut Paket</Label>
                <div className="p-3 rounded-lg" style={{ background: "hsl(var(--admin-hover))" }}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm" style={s.text}>{paketDialogQuota?.abonelik?.paket_ad || "Paket Yok"}</span>
                    {paketDialogQuota?.abonelik?.donem_bitis && (
                      <span className="text-xs" style={s.muted}>
                        Bitiş: {new Date(paketDialogQuota.abonelik.donem_bitis).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quota usage */}
              {paketDialogQuota?.usage && paketDialogQuota?.abonelik?.limits && (
                <div>
                  <Label className="text-xs mb-2 block" style={s.muted}>Kalan Haklar</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <QuotaItem icon={Eye} label="Profil Görüntüleme"
                      used={paketDialogQuota.usage.profil_goruntuleme}
                      limit={paketDialogQuota.abonelik.limits.profil_goruntuleme_limiti} />
                    <QuotaItem icon={Gavel} label="Teklif Verme"
                      used={paketDialogQuota.usage.teklif_verme}
                      limit={paketDialogQuota.abonelik.limits.teklif_verme_limiti} />
                    <QuotaItem icon={Package} label="Aktif Ürün"
                      used={paketDialogQuota.usage.aktif_urun}
                      limit={paketDialogQuota.abonelik.limits.aktif_urun_limiti} />
                    <QuotaItem icon={MessageSquare} label="Mesaj"
                      used={paketDialogQuota.usage.mesaj}
                      limit={paketDialogQuota.abonelik.limits.mesaj_limiti} />
                  </div>
                </div>
              )}

              {/* Extra quota */}
              <div>
                <Label className="text-xs mb-2 block" style={s.muted}>Ekstra Hak Tanımla</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "profil_goruntuleme", label: "Profil Görüntüleme" },
                    { key: "teklif_verme", label: "Teklif Verme" },
                    { key: "aktif_urun", label: "Aktif Ürün" },
                    { key: "mesaj", label: "Mesaj" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-[10px]" style={s.muted}>{label}</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={ekstraHaklar[key] || ""}
                        onChange={(e) => setEkstraHaklar((prev) => ({
                          ...prev,
                          [key]: parseInt(e.target.value) || 0,
                        }))}
                        className="h-8 text-xs"
                        style={s.input}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleSaveEkstraHaklar}
                  disabled={ekstraSaving}
                  size="sm"
                  className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  {ekstraSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Ekstra Hakları Kaydet
                </Button>
              </div>

              {/* Change package */}
              <div>
                <Label className="text-xs mb-2 block" style={s.muted}>Paket Değiştir</Label>
                <Select value={selectedPaketId} onValueChange={setSelectedPaketId}>
                  <SelectTrigger style={s.input}><SelectValue placeholder="Paket seçin" /></SelectTrigger>
                  <SelectContent style={{ ...s.card, padding: "0.25rem", zIndex: 250 }}>
                    {allPaketler.map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.ad} {p.fiyat_aylik ? `(${p.fiyat_aylik} ${p.para_birimi}/ay)` : "(Ücretsiz)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPaketDialogOpen(false)}
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>İptal</Button>
            <Button onClick={handleChangePaket} disabled={paketSaving || !selectedPaketId}
              className="bg-amber-500 hover:bg-amber-600 text-white">
              {paketSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Paketi Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni Firma Dialog */}
      <Dialog open={yeniFirmaOpen} onOpenChange={setYeniFirmaOpen}>
        <DialogContent style={s.card} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={s.text}>Yeni Firma Oluştur</DialogTitle>
            <DialogDescription style={s.muted}>
              E-posta onayı olmadan yeni firma hesabı oluşturun
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>E-posta *</Label>
                <Input value={yeniFirma.email} onChange={e => setYeniFirma(p => ({ ...p, email: e.target.value }))} style={s.input} className="text-xs h-8" placeholder="ornek@email.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Şifre *</Label>
                <Input type="password" value={yeniFirma.password} onChange={e => setYeniFirma(p => ({ ...p, password: e.target.value }))} style={s.input} className="text-xs h-8" placeholder="Min 6 karakter" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Ad *</Label>
                <Input value={yeniFirma.ad} onChange={e => setYeniFirma(p => ({ ...p, ad: e.target.value }))} style={s.input} className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Soyad *</Label>
                <Input value={yeniFirma.soyad} onChange={e => setYeniFirma(p => ({ ...p, soyad: e.target.value }))} style={s.input} className="text-xs h-8" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs" style={s.muted}>Firma Ünvanı *</Label>
              <Input value={yeniFirma.firma_unvani} onChange={e => setYeniFirma(p => ({ ...p, firma_unvani: e.target.value }))} style={s.input} className="text-xs h-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Vergi Numarası *</Label>
                <Input value={yeniFirma.vergi_numarasi} onChange={e => setYeniFirma(p => ({ ...p, vergi_numarasi: e.target.value }))} style={s.input} className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Vergi Dairesi *</Label>
                <Input value={yeniFirma.vergi_dairesi} onChange={e => setYeniFirma(p => ({ ...p, vergi_dairesi: e.target.value }))} style={s.input} className="text-xs h-8" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Firma Türü *</Label>
                <Select value={yeniFirma.firma_turu_id} onValueChange={v => setYeniFirma(p => ({ ...p, firma_turu_id: v, firma_tipi_id: "" }))}>
                  <SelectTrigger className="text-xs h-8" style={s.input}><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent style={{ ...s.card, padding: "0.25rem" }}>
                    {turler.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Firma Tipi *</Label>
                <Select value={yeniFirma.firma_tipi_id} onValueChange={v => setYeniFirma(p => ({ ...p, firma_tipi_id: v }))}>
                  <SelectTrigger className="text-xs h-8" style={s.input}><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent style={{ ...s.card, padding: "0.25rem" }}>
                    {filteredTipler.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>İletişim E-posta</Label>
                <Input value={yeniFirma.iletisim_email} onChange={e => setYeniFirma(p => ({ ...p, iletisim_email: e.target.value }))} style={s.input} className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>İletişim Numarası</Label>
                <Input value={yeniFirma.iletisim_numarasi} onChange={e => setYeniFirma(p => ({ ...p, iletisim_numarasi: e.target.value }))} style={s.input} className="text-xs h-8" />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setYeniFirmaOpen(false)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>İptal</Button>
            <Button onClick={handleCreateFirma} disabled={yeniFirmaSaving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {yeniFirmaSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Firma Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// Color-coded stat box
function ColoredStatBox({ icon: Icon, label, value, suffix }: { icon: any; label: string; value: number; suffix?: string }) {
  const numVal = typeof value === "number" ? value : 0;
  return (
    <div style={{ ...s.statBox, background: getValueBgColor(numVal) }}>
      <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: getValueColor(numVal) }} />
      <div className="font-semibold text-sm" style={{ color: getValueColor(numVal) }}>{suffix ? `${value}${suffix}` : value}</div>
      <div className="text-[10px]" style={s.muted}>{label}</div>
    </div>
  );
}

function QuotaItem({ icon: Icon, label, used, limit }: { icon: any; label: string; used: number; limit: number | null }) {
  const remaining = limit === null ? "∞" : Math.max(0, limit - used);
  const percentage = limit === null ? 0 : limit > 0 ? (used / limit) * 100 : 100;
  const barColor = limit === null ? "#22c55e" : percentage >= 90 ? "#ef4444" : percentage >= 60 ? "#eab308" : "#22c55e";

  return (
    <div className="p-2.5 rounded-lg" style={{ background: "hsl(var(--admin-hover))" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={s.muted} />
        <span className="text-[10px]" style={s.muted}>{label}</span>
      </div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span style={s.text}>{used} / {limit === null ? "∞" : limit}</span>
        <span className="font-semibold" style={{ color: barColor }}>Kalan: {remaining}</span>
      </div>
      {limit !== null && (
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--admin-border))" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, percentage)}%`, background: barColor }} />
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={s.muted}>{label}</span>
      <span className="text-sm font-medium" style={s.text}>{value || "—"}</span>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs" style={s.muted}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="text-xs h-8" style={s.input}><SelectValue placeholder="Tümü" /></SelectTrigger>
        <SelectContent style={{ ...s.card, padding: "0.25rem" }}>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterRange({ label, min, max, onMinChange, onMaxChange }: {
  label: string; min: string; max: string; onMinChange: (v: string) => void; onMaxChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs" style={s.muted}>{label}</Label>
      <div className="flex gap-1">
        <Input placeholder="Min" value={min} onChange={(e) => onMinChange(e.target.value)} className="text-xs h-8" style={s.input} />
        <Input placeholder="Max" value={max} onChange={(e) => onMaxChange(e.target.value)} className="text-xs h-8" style={s.input} />
      </div>
    </div>
  );
}

async function getIlKategoriId(): Promise<string> {
  const { data } = await supabase
    .from("firma_bilgi_kategorileri")
    .select("id")
    .eq("name", "İl")
    .single();
  return data?.id || "";
}
