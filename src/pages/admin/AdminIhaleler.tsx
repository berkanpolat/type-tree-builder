import { useState, useEffect, useCallback, CSSProperties, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Gavel, Eye, Clock, Filter, Search, RotateCcw, Package, HeadphonesIcon,
  ExternalLink, Pencil, Trash2, ArrowUpDown, FileText, ChevronLeft, ChevronRight,
  Image as ImageIcon, X, ChevronDown, Activity, CheckCircle2, XCircle, ClockIcon, FileEdit, MessageSquare
} from "lucide-react";

/* ── Theme-aware style helpers ── */
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
  selectContent: {
    background: "hsl(var(--admin-card-bg))",
    border: "1px solid hsl(var(--admin-border))",
    borderRadius: "0.5rem",
    padding: "0.25rem",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
  } as CSSProperties,
};

interface IhaleItem {
  id: string;
  ihale_no: string;
  baslik: string;
  foto_url: string | null;
  ihale_turu: string;
  teklif_usulu: string;
  durum: string;
  baslangic_tarihi: string | null;
  bitis_tarihi: string | null;
  goruntuleme_sayisi: number;
  created_at: string;
  user_id: string;
  firma_unvani: string;
  teklif_sayisi: number;
  kategori_label: string;
  urun_kategori_id: string | null;
  urun_grup_id: string | null;
  urun_tur_id: string | null;
  hizmet_kategori_id: string | null;
  hizmet_tur_id: string | null;
}

interface IhaleStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  pendingApproval: number;
  draft: number;
  totalTeklifler: number;
  urunKategoriDagilimi: { id: string; name: string; count: number }[];
  hizmetKategoriDagilimi: { id: string; name: string; count: number }[];
}

const ITEMS_PER_PAGE = 10;

const IHALE_TURU_LABELS: Record<string, string> = {
  urun_alis: "Ürün Alış",
  urun_satis: "Ürün Satış",
  hizmet: "Hizmet Alımı",
};

const TEKLIF_USULU_LABELS: Record<string, string> = {
  acik_indirme: "Açık İndirme",
  acik_arttirma: "Açık Arttırma",
  kapali_teklif: "Kapalı Teklif",
};

const DURUM_LABELS: Record<string, string> = {
  duzenleniyor: "Düzenleniyor",
  taslak: "Taslak",
  onay_bekliyor: "Onay Bekliyor",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
  reddedildi: "Reddedildi",
};

type SortField = "created_at" | "teklif_sayisi" | "goruntuleme_sayisi" | "bitis_tarihi" | "kalan_sure";
type SortDir = "asc" | "desc";


export default function AdminIhaleler() {
  const { token, hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const noPermission = () => toast({ title: "Yetkisiz", description: "Buna yetkiniz yok", variant: "destructive" });

  const [ihaleler, setIhaleler] = useState<IhaleItem[]>([]);
  const [stats, setStats] = useState<IhaleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [statFilter, setStatFilter] = useState<{ type: string; value?: string }>({ type: "all" });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTuru, setFilterTuru] = useState("all");
  const [filterUsulu, setFilterUsulu] = useState("all");
  const [filterDurum, setFilterDurum] = useState("all");
  const [filterFirma, setFilterFirma] = useState("all");
  const [filterMinTeklif, setFilterMinTeklif] = useState("");
  const [filterMaxTeklif, setFilterMaxTeklif] = useState("");
  const [filterMinGoruntuleme, setFilterMinGoruntuleme] = useState("");
  const [filterMaxGoruntuleme, setFilterMaxGoruntuleme] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Multi-select category filters
  const [selectedUrunKategorileri, setSelectedUrunKategorileri] = useState<string[]>([]);
  const [selectedUrunGruplari, setSelectedUrunGruplari] = useState<string[]>([]);
  const [selectedUrunTurleri, setSelectedUrunTurleri] = useState<string[]>([]);
  const [selectedHizmetKategorileri, setSelectedHizmetKategorileri] = useState<string[]>([]);
  const [selectedHizmetTurleri, setSelectedHizmetTurleri] = useState<string[]>([]);

  // Raw category data for hierarchical filtering
  const [allUrunSecenekler, setAllUrunSecenekler] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [allHizmetSecenekler, setAllHizmetSecenekler] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);

  // Category options for filters (computed)
  const [categoryOptions, setCategoryOptions] = useState<{
    urunKategorileri: { id: string; name: string }[];
    hizmetKategorileri: { id: string; name: string }[];
  }>({
    urunKategorileri: [],
    hizmetKategorileri: [],
  });

  // Sorting
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Firma list for dropdown
  const [firmaList, setFirmaList] = useState<{ user_id: string; firma_unvani: string }[]>([]);
  const [firmaSearch, setFirmaSearch] = useState("");

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; desc: string; action: () => void }>({ open: false, title: "", desc: "", action: () => {} });

  const callApi = useCallback(async (action: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, { body });
    if (error) throw error;
    return data;
  }, []);

  // Derived: filtered urun groups based on selected categories
  const filteredUrunGruplari = allUrunSecenekler.filter(o =>
    o.parent_id && (selectedUrunKategorileri.length === 0
      ? allUrunSecenekler.filter(r => !r.parent_id).some(r => r.id === o.parent_id)
      : selectedUrunKategorileri.includes(o.parent_id))
  );

  // Derived: filtered urun types based on selected groups
  const filteredUrunTurleri = allUrunSecenekler.filter(o =>
    o.parent_id && (selectedUrunGruplari.length === 0
      ? filteredUrunGruplari.some(g => g.id === o.parent_id)
      : selectedUrunGruplari.includes(o.parent_id))
  );

  // Derived: filtered hizmet types based on selected hizmet categories
  const filteredHizmetTurleri = allHizmetSecenekler.filter(o =>
    o.parent_id && (selectedHizmetKategorileri.length === 0
      ? allHizmetSecenekler.filter(r => !r.parent_id).some(r => r.id === o.parent_id)
      : selectedHizmetKategorileri.includes(o.parent_id))
  );

  // Clear child selections when parent changes
  useEffect(() => {
    setSelectedUrunGruplari(prev => prev.filter(id => filteredUrunGruplari.some(g => g.id === id)));
  }, [selectedUrunKategorileri]);

  useEffect(() => {
    setSelectedUrunTurleri(prev => prev.filter(id => filteredUrunTurleri.some(t => t.id === id)));
  }, [selectedUrunGruplari, selectedUrunKategorileri]);

  useEffect(() => {
    setSelectedHizmetTurleri(prev => prev.filter(id => filteredHizmetTurleri.some(t => t.id === id)));
  }, [selectedHizmetKategorileri]);

  // Fetch category options for filters
  const fetchCategoryOptions = useCallback(async () => {
    try {
      const { data: kategoriler } = await supabase
        .from("firma_bilgi_kategorileri")
        .select("id, name");

      if (!kategoriler) return;

      const urunKatKat = kategoriler.find((k: any) => k.name === "Ana Ürün Kategorileri");
      const hizmetKatKat = kategoriler.find((k: any) => k.name === "Ana Hizmet Kategorileri");

      if (urunKatKat) {
        const { data: urunKats } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name, parent_id")
          .eq("kategori_id", urunKatKat.id);
        if (urunKats) {
          setAllUrunSecenekler(urunKats);
          const roots = urunKats.filter((o: any) => !o.parent_id);
          setCategoryOptions(prev => ({
            ...prev,
            urunKategorileri: roots.map((r: any) => ({ id: r.id, name: r.name })),
          }));
        }
      }

      if (hizmetKatKat) {
        const { data: hizmetKats } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name, parent_id")
          .eq("kategori_id", hizmetKatKat.id);
        if (hizmetKats) {
          setAllHizmetSecenekler(hizmetKats);
          const roots = hizmetKats.filter((o: any) => !o.parent_id);
          setCategoryOptions(prev => ({
            ...prev,
            hizmetKategorileri: roots.map((r: any) => ({ id: r.id, name: r.name })),
          }));
        }
      }
    } catch { }
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [ihaleData, statsData] = await Promise.all([
        callApi("list-ihaleler", { token }),
        callApi("ihale-stats", { token }),
      ]);
      setIhaleler(ihaleData.ihaleler || []);
      setStats(statsData);

      const firms = (ihaleData.ihaleler || []).reduce((acc: any[], i: any) => {
        if (!acc.find((f: any) => f.user_id === i.user_id)) {
          acc.push({ user_id: i.user_id, firma_unvani: i.firma_unvani });
        }
        return acc;
      }, []);
      setFirmaList(firms.sort((a: any, b: any) => a.firma_unvani.localeCompare(b.firma_unvani)));
    } catch {
      toast({ title: "Hata", description: "Veriler yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, callApi, toast]);

  useEffect(() => { fetchData(); fetchCategoryOptions(); }, [fetchData, fetchCategoryOptions]);

  const clearFilters = () => {
    setSearchTerm(""); setFilterTuru("all"); setFilterUsulu("all"); setFilterDurum("all");
    setFilterFirma("all"); setFilterMinTeklif(""); setFilterMaxTeklif("");
    setFilterMinGoruntuleme(""); setFilterMaxGoruntuleme("");
    setFilterStartDate(""); setFilterEndDate("");
    setSelectedUrunKategorileri([]); setSelectedUrunGruplari([]); setSelectedUrunTurleri([]);
    setSelectedHizmetKategorileri([]); setSelectedHizmetTurleri([]);
  };

  const hasActiveFilters = searchTerm || filterTuru !== "all" || filterUsulu !== "all" || filterDurum !== "all" || filterFirma !== "all" ||
    filterMinTeklif || filterMaxTeklif || filterMinGoruntuleme || filterMaxGoruntuleme || filterStartDate || filterEndDate ||
    selectedUrunKategorileri.length > 0 || selectedUrunGruplari.length > 0 || selectedUrunTurleri.length > 0 ||
    selectedHizmetKategorileri.length > 0 || selectedHizmetTurleri.length > 0;

  const filtered = ihaleler
    .filter((i) => {
      // Stat filter (from clicking stat cards)
      if (statFilter.type !== "all") {
        if (statFilter.type === "active" && i.durum !== "devam_ediyor") return false;
        if (statFilter.type === "completed" && i.durum !== "tamamlandi") return false;
        if (statFilter.type === "cancelled" && i.durum !== "iptal") return false;
        if (statFilter.type === "pending" && i.durum !== "onay_bekliyor") return false;
        if (statFilter.type === "draft" && i.durum !== "duzenleniyor" && i.durum !== "taslak") return false;
        if (statFilter.type === "urun_kat" && i.urun_kategori_id !== statFilter.value) return false;
        if (statFilter.type === "hizmet_kat" && i.hizmet_kategori_id !== statFilter.value) return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!i.baslik.toLowerCase().includes(q) && !i.ihale_no.toLowerCase().includes(q) && !i.kategori_label.toLowerCase().includes(q) && !i.firma_unvani.toLowerCase().includes(q)) return false;
      }
      if (filterTuru !== "all" && i.ihale_turu !== filterTuru) return false;
      if (filterUsulu !== "all" && i.teklif_usulu !== filterUsulu) return false;
      if (filterDurum !== "all" && i.durum !== filterDurum) return false;
      if (filterFirma !== "all" && i.user_id !== filterFirma) return false;
      if (filterMinTeklif && i.teklif_sayisi < Number(filterMinTeklif)) return false;
      if (filterMaxTeklif && i.teklif_sayisi > Number(filterMaxTeklif)) return false;
      if (filterMinGoruntuleme && i.goruntuleme_sayisi < Number(filterMinGoruntuleme)) return false;
      if (filterMaxGoruntuleme && i.goruntuleme_sayisi > Number(filterMaxGoruntuleme)) return false;
      if (filterStartDate && i.created_at < filterStartDate) return false;
      if (filterEndDate && i.created_at > filterEndDate + "T23:59:59") return false;
      // Multi-select category filters
      if (selectedUrunKategorileri.length > 0 && !selectedUrunKategorileri.includes(i.urun_kategori_id || "")) return false;
      if (selectedUrunGruplari.length > 0 && !selectedUrunGruplari.includes(i.urun_grup_id || "")) return false;
      if (selectedUrunTurleri.length > 0 && !selectedUrunTurleri.includes(i.urun_tur_id || "")) return false;
      if (selectedHizmetKategorileri.length > 0 && !selectedHizmetKategorileri.includes(i.hizmet_kategori_id || "")) return false;
      if (selectedHizmetTurleri.length > 0 && !selectedHizmetTurleri.includes(i.hizmet_tur_id || "")) return false;
      return true;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "teklif_sayisi": aVal = a.teklif_sayisi; bVal = b.teklif_sayisi; break;
        case "goruntuleme_sayisi": aVal = a.goruntuleme_sayisi; bVal = b.goruntuleme_sayisi; break;
        case "bitis_tarihi": aVal = a.bitis_tarihi || ""; bVal = b.bitis_tarihi || ""; break;
        case "kalan_sure": {
          const now = Date.now();
          const aRemaining = a.bitis_tarihi ? new Date(a.bitis_tarihi).getTime() - now : Infinity;
          const bRemaining = b.bitis_tarihi ? new Date(b.bitis_tarihi).getTime() - now : Infinity;
          aVal = aRemaining; bVal = bRemaining; break;
        }
        default: aVal = a.created_at; bVal = b.created_at;
      }
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterTuru, filterUsulu, filterDurum, filterFirma, filterMinTeklif, filterMaxTeklif, filterMinGoruntuleme, filterMaxGoruntuleme, filterStartDate, filterEndDate, sortField, sortDir, selectedUrunKategorileri, selectedUrunGruplari, selectedUrunTurleri, selectedHizmetKategorileri, selectedHizmetTurleri, statFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  // Actions
  const handleRemove = (ihale: IhaleItem) => {
    setConfirmDialog({
      open: true, title: "İhaleyi Kaldır",
      desc: `"${ihale.baslik}" (${ihale.ihale_no}) başlıklı ihaleyi kaldırmak istediğinize emin misiniz? İhale "İptal" durumuna geçecektir.`,
      action: async () => {
        try {
          await callApi("remove-ihale", { token, ihaleId: ihale.id });
          toast({ title: "Başarılı", description: "İhale kaldırıldı" });
          fetchData();
        } catch (err: any) {
          toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
        }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  const durumBadge = (durum: string) => {
    const colors: Record<string, string> = {
      devam_ediyor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
      onay_bekliyor: "bg-amber-500/15 text-amber-600 border-amber-500/25",
      tamamlandi: "bg-blue-500/15 text-blue-600 border-blue-500/25",
      iptal: "bg-red-500/15 text-red-500 border-red-500/25",
      reddedildi: "bg-red-500/15 text-red-500 border-red-500/25",
      duzenleniyor: "bg-slate-500/15 text-slate-500 border-slate-500/25",
      taslak: "bg-slate-500/15 text-slate-500 border-slate-500/25",
    };
    return <Badge variant="outline" className={`${colors[durum] || ""} text-[11px] px-2 py-0.5 font-medium`}>{DURUM_LABELS[durum] || durum}</Badge>;
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getRemainingTime = (bitis: string | null) => {
    if (!bitis) return null;
    const diff = new Date(bitis).getTime() - Date.now();
    if (diff <= 0) return "Süre doldu";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}g ${hours}s`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}s ${mins}dk`;
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-[11px] font-medium hover:opacity-80 transition-opacity px-2 py-1 rounded-md"
      style={sortField === field ? { color: "#f59e0b", background: "rgba(245,158,11,0.08)" } : s.muted}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  const filteredFirmaList = firmaSearch
    ? firmaList.filter(f => f.firma_unvani.toLowerCase().includes(firmaSearch.toLowerCase()))
    : firmaList;

  return (
    <AdminLayout title="İhaleler">
      <div className="space-y-5">
        {/* ── Summary Stats ── */}
        {stats && (
          <div className="space-y-3">
            {/* Status cards row */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <MiniStatCard
                label="Toplam"
                value={stats.total}
                icon={<Gavel className="w-3.5 h-3.5" />}
                color="text-blue-500"
                active={statFilter.type === "all"}
                onClick={() => setStatFilter({ type: "all" })}
              />
              <MiniStatCard
                label="Aktif"
                value={stats.active}
                icon={<Activity className="w-3.5 h-3.5" />}
                color="text-emerald-500"
                active={statFilter.type === "active"}
                onClick={() => setStatFilter({ type: "active" })}
              />
              <MiniStatCard
                label="Tamamlanan"
                value={stats.completed}
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                color="text-blue-400"
                active={statFilter.type === "completed"}
                onClick={() => setStatFilter({ type: "completed" })}
              />
              <MiniStatCard
                label="İptal"
                value={stats.cancelled}
                icon={<XCircle className="w-3.5 h-3.5" />}
                color="text-red-500"
                active={statFilter.type === "cancelled"}
                onClick={() => setStatFilter({ type: "cancelled" })}
              />
              <MiniStatCard
                label="Onay Bekleyen"
                value={stats.pendingApproval}
                icon={<Clock className="w-3.5 h-3.5" />}
                color="text-amber-500"
                active={statFilter.type === "pending"}
                onClick={() => setStatFilter({ type: "pending" })}
              />
              <MiniStatCard
                label="Taslak"
                value={stats.draft}
                icon={<FileEdit className="w-3.5 h-3.5" />}
                color="text-slate-400"
                active={statFilter.type === "draft"}
                onClick={() => setStatFilter({ type: "draft" })}
              />
              <MiniStatCard
                label="Toplam Teklif"
                value={stats.totalTeklifler}
                icon={<MessageSquare className="w-3.5 h-3.5" />}
                color="text-purple-500"
                active={false}
                onClick={() => {}}
                clickable={false}
              />
            </div>

            {/* Category distribution rows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {/* Ürün Kategorileri */}
              <div
                style={s.card}
                className="p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs font-semibold" style={s.text}>Ürün Kategorileri</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.urunKategoriDagilimi.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setStatFilter(
                        statFilter.type === "urun_kat" && statFilter.value === cat.id
                          ? { type: "all" }
                          : { type: "urun_kat", value: cat.id }
                      )}
                      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md transition-all"
                      style={{
                        background: statFilter.type === "urun_kat" && statFilter.value === cat.id
                          ? "rgba(168, 85, 247, 0.15)"
                          : "hsl(var(--admin-hover))",
                        color: statFilter.type === "urun_kat" && statFilter.value === cat.id
                          ? "rgb(168, 85, 247)"
                          : "hsl(var(--admin-text))",
                        border: statFilter.type === "urun_kat" && statFilter.value === cat.id
                          ? "1px solid rgba(168, 85, 247, 0.3)"
                          : "1px solid transparent",
                      }}
                    >
                      <span className="truncate max-w-[120px]">{cat.name}</span>
                      <span className="font-bold">{cat.count}</span>
                    </button>
                  ))}
                  {stats.urunKategoriDagilimi.length === 0 && (
                    <span className="text-[11px]" style={s.muted}>Henüz veri yok</span>
                  )}
                </div>
              </div>

              {/* Hizmet Kategorileri */}
              <div
                style={s.card}
                className="p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <HeadphonesIcon className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-semibold" style={s.text}>Hizmet Kategorileri</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.hizmetKategoriDagilimi.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setStatFilter(
                        statFilter.type === "hizmet_kat" && statFilter.value === cat.id
                          ? { type: "all" }
                          : { type: "hizmet_kat", value: cat.id }
                      )}
                      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md transition-all"
                      style={{
                        background: statFilter.type === "hizmet_kat" && statFilter.value === cat.id
                          ? "rgba(249, 115, 22, 0.15)"
                          : "hsl(var(--admin-hover))",
                        color: statFilter.type === "hizmet_kat" && statFilter.value === cat.id
                          ? "rgb(249, 115, 22)"
                          : "hsl(var(--admin-text))",
                        border: statFilter.type === "hizmet_kat" && statFilter.value === cat.id
                          ? "1px solid rgba(249, 115, 22, 0.3)"
                          : "1px solid transparent",
                      }}
                    >
                      <span className="truncate max-w-[120px]">{cat.name}</span>
                      <span className="font-bold">{cat.count}</span>
                    </button>
                  ))}
                  {stats.hizmetKategoriDagilimi.length === 0 && (
                    <span className="text-[11px]" style={s.muted}>Henüz veri yok</span>
                  )}
                </div>
              </div>
            </div>

            {/* Active stat filter indicator */}
            {statFilter.type !== "all" && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={s.muted}>Filtre aktif:</span>
                <Badge variant="outline" className="text-[11px] gap-1 pr-1">
                  {statFilter.type === "active" && "Aktif İhaleler"}
                  {statFilter.type === "completed" && "Tamamlanan İhaleler"}
                  {statFilter.type === "cancelled" && "İptal Edilen İhaleler"}
                  {statFilter.type === "pending" && "Onay Bekleyen İhaleler"}
                  {statFilter.type === "draft" && "Taslak İhaleler"}
                  {statFilter.type === "urun_kat" && stats.urunKategoriDagilimi.find(c => c.id === statFilter.value)?.name}
                  {statFilter.type === "hizmet_kat" && stats.hizmetKategoriDagilimi.find(c => c.id === statFilter.value)?.name}
                  <button onClick={() => setStatFilter({ type: "all" })} className="ml-1 hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
                <span className="text-xs font-medium" style={s.text}>{filtered.length} sonuç</span>
              </div>
            )}
          </div>
        )}

        {/* ── Search, Sort & Filters ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
              <Input
                placeholder="İhale ID, başlık, firma veya kategori ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
                style={s.input}
              />
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9 gap-2"
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))", background: showFilters ? "hsl(var(--admin-hover))" : "transparent" }}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtreler
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-500" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} size="sm" className="text-red-500 hover:text-red-600 h-9 gap-1.5">
                <RotateCcw className="w-3 h-3" />
                Temizle
              </Button>
            )}
          </div>

          {/* Sort row */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium mr-1" style={s.muted}>Sırala:</span>
            <SortButton field="created_at" label="Tarih" />
            <SortButton field="teklif_sayisi" label="Teklif" />
            <SortButton field="goruntuleme_sayisi" label="Görüntülenme" />
            <SortButton field="bitis_tarihi" label="Bitiş" />
            <SortButton field="kalan_sure" label="Kalan Süre" />
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div style={s.card} className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FilterSelect label="İhale Türü" value={filterTuru} onChange={setFilterTuru}
                  options={[{ value: "all", label: "Tümü" }, ...Object.entries(IHALE_TURU_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
                <FilterSelect label="Teklif Usulü" value={filterUsulu} onChange={setFilterUsulu}
                  options={[{ value: "all", label: "Tümü" }, ...Object.entries(TEKLIF_USULU_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
                <FilterSelect label="Durum" value={filterDurum} onChange={setFilterDurum}
                  options={[{ value: "all", label: "Tümü" }, ...Object.entries(DURUM_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />

                {/* Firma dropdown with search */}
                <div className="space-y-1">
                  <Label className="text-xs" style={s.muted}>Firma</Label>
                  <Select value={filterFirma} onValueChange={setFilterFirma}>
                    <SelectTrigger className="text-xs h-8" style={s.input}><SelectValue placeholder="Tümü" /></SelectTrigger>
                    <SelectContent style={s.selectContent} className="max-h-60 z-[100]">
                      <div className="px-2 pb-1.5 pt-1 sticky top-0" style={{ background: "hsl(var(--admin-card-bg))" }}>
                        <Input
                          placeholder="Firma ara..."
                          value={firmaSearch}
                          onChange={(e) => setFirmaSearch(e.target.value)}
                          className="h-7 text-xs"
                          style={s.input}
                        />
                      </div>
                      <SelectItem value="all" className="text-xs">Tümü</SelectItem>
                      {filteredFirmaList.map(f => (
                        <SelectItem key={f.user_id} value={f.user_id} className="text-xs">{f.firma_unvani}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Multi-select category filters */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MultiSelectFilter
                  label="Ürün Kategorisi"
                  options={categoryOptions.urunKategorileri}
                  selected={selectedUrunKategorileri}
                  onChange={setSelectedUrunKategorileri}
                />
                <MultiSelectFilter
                  label="Ürün Grubu"
                  options={filteredUrunGruplari.map(o => ({ id: o.id, name: o.name }))}
                  selected={selectedUrunGruplari}
                  onChange={setSelectedUrunGruplari}
                />
                <MultiSelectFilter
                  label="Ürün Türü"
                  options={filteredUrunTurleri.map(o => ({ id: o.id, name: o.name }))}
                  selected={selectedUrunTurleri}
                  onChange={setSelectedUrunTurleri}
                />
                <MultiSelectFilter
                  label="Hizmet Kategorisi"
                  options={categoryOptions.hizmetKategorileri}
                  selected={selectedHizmetKategorileri}
                  onChange={setSelectedHizmetKategorileri}
                />
                <MultiSelectFilter
                  label="Hizmet Türü"
                  options={filteredHizmetTurleri.map(o => ({ id: o.id, name: o.name }))}
                  selected={selectedHizmetTurleri}
                  onChange={setSelectedHizmetTurleri}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FilterRange label="Teklif Sayısı" min={filterMinTeklif} max={filterMaxTeklif} onMinChange={setFilterMinTeklif} onMaxChange={setFilterMaxTeklif} />
                <FilterRange label="Görüntülenme" min={filterMinGoruntuleme} max={filterMaxGoruntuleme} onMinChange={setFilterMinGoruntuleme} onMaxChange={setFilterMaxGoruntuleme} />
                <div className="space-y-1">
                  <Label className="text-xs" style={s.muted}>Başlangıç Tarihi</Label>
                  <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="text-xs h-8" style={s.input} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" style={s.muted}>Bitiş Tarihi</Label>
                  <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="text-xs h-8" style={s.input} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between text-xs" style={s.muted}>
          <span>{filtered.length} ihale {hasActiveFilters && `(${ihaleler.length} toplam)`}</span>
          <span>Sayfa {safePage} / {totalPages}</span>
        </div>

        {/* ── İhale Cards ── */}
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-16" style={s.muted}>
                <Gavel className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>İhale bulunamadı.</p>
              </div>
            )}
            {paginated.map((ihale) => (
              <div key={ihale.id} style={s.card} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex">
                  {/* Photo */}
                  <div className="w-24 min-h-[120px] flex-shrink-0 flex items-center justify-center relative" style={{ background: "hsl(var(--admin-hover))" }}>
                    {ihale.foto_url ? (
                      <img src={ihale.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 opacity-20" style={s.muted} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Title row */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <code className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--admin-hover))", ...s.text }}>
                            {ihale.ihale_no}
                          </code>
                          {durumBadge(ihale.durum)}
                        </div>
                        <h3 className="font-semibold text-sm mb-1 truncate" style={s.text}>{ihale.baslik}</h3>

                        {/* Meta info */}
                        <div className="flex items-center gap-2 text-[11px] flex-wrap mb-2" style={s.secondary}>
                          <span className="font-medium">{ihale.firma_unvani}</span>
                          <span className="opacity-40">•</span>
                          <span>{IHALE_TURU_LABELS[ihale.ihale_turu] || ihale.ihale_turu}</span>
                          <span className="opacity-40">•</span>
                          <span>{TEKLIF_USULU_LABELS[ihale.teklif_usulu] || ihale.teklif_usulu}</span>
                          {ihale.kategori_label !== "—" && (
                            <>
                              <span className="opacity-40">•</span>
                              <span className="text-purple-500">{ihale.kategori_label}</span>
                            </>
                          )}
                        </div>

                        {/* Dates & Stats */}
                        <div className="flex items-center gap-4 text-[11px] flex-wrap" style={s.muted}>
                          <span>{formatDate(ihale.baslangic_tarihi)} — {formatDate(ihale.bitis_tarihi)}</span>
                          {ihale.durum === "devam_ediyor" && ihale.bitis_tarihi && (
                            <span className="text-amber-500 font-semibold">{getRemainingTime(ihale.bitis_tarihi)}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <strong style={s.text}>{ihale.teklif_sayisi}</strong> teklif
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <strong style={s.text}>{ihale.goruntuleme_sayisi}</strong> görüntülenme
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {hasPermission("ihale_duzenleyebilir") && (
                          <Button
                            onClick={() => window.open(`/manuihale/duzenle/${ihale.id}`, "_blank")}
                            variant="outline" size="sm"
                            className="text-[11px] h-7 px-2.5 gap-1"
                            style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text-secondary))" }}
                          >
                            <Pencil className="w-3 h-3" /> Düzenle
                          </Button>
                        )}

                        {hasPermission("ihale_inceleyebilir") && (
                          <Button
                            onClick={() => window.open(`/tekihale/${ihale.id}`, "_blank")}
                            variant="outline" size="sm"
                            className="text-[11px] h-7 px-2.5 gap-1"
                            style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text-secondary))" }}
                          >
                            <ExternalLink className="w-3 h-3" /> İncele
                          </Button>
                        )}

                        {(ihale.durum === "devam_ediyor" || ihale.durum === "tamamlandi") && hasPermission("ihale_inceleyebilir") && (
                          <Button
                            onClick={() => window.open(`/manuihale/takip/${ihale.id}`, "_blank")}
                            variant="outline" size="sm"
                            className="text-[11px] h-7 px-2.5 gap-1"
                            style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text-secondary))" }}
                          >
                            <Activity className="w-3 h-3" /> Takip
                          </Button>
                        )}

                        {ihale.durum !== "iptal" && ihale.durum !== "tamamlandi" && hasPermission("ihale_kaldirabilir") && (
                          <Button
                            onClick={() => handleRemove(ihale)}
                            variant="ghost" size="sm"
                            className="text-[11px] h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}
              className="text-xs h-8 w-8 p-0"
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p); return acc;
              }, [])
              .map((p, idx) =>
                typeof p === "string" ? (
                  <span key={`e-${idx}`} className="px-1 text-xs" style={s.muted}>…</span>
                ) : (
                  <Button key={p} size="sm" variant={p === safePage ? "default" : "outline"} onClick={() => setCurrentPage(p as number)}
                    className={p === safePage ? "bg-amber-500 hover:bg-amber-600 text-white text-xs h-8 w-8 p-0" : "text-xs h-8 w-8 p-0"}
                    style={p !== safePage ? { borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" } : undefined}>
                    {p}
                  </Button>
                )
              )}
            <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}
              className="text-xs h-8 w-8 p-0"
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="z-[200]" style={{ background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={s.text}>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription style={s.muted}>{confirmDialog.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ color: "hsl(var(--admin-muted))", borderColor: "hsl(var(--admin-border))" }}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.action} className="bg-amber-500 hover:bg-amber-600 text-white">
              Evet, Onayla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

/* ── Reusable Components ── */

function MiniStatCard({ label, value, icon, color, active, onClick, clickable = true }: {
  label: string; value: number; icon: React.ReactNode; color: string;
  active: boolean; onClick: () => void; clickable?: boolean;
}) {
  return (
    <button
      onClick={clickable ? onClick : undefined}
      style={{
        ...s.card,
        ...(active ? { borderColor: "hsl(var(--admin-accent, 40 96% 53%))", boxShadow: "0 0 0 1px hsl(var(--admin-accent, 40 96% 53%) / 0.3)" } : {}),
      }}
      className={`p-2.5 text-left transition-all ${clickable ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-[10px] font-medium truncate" style={s.muted}>{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </button>
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
        <SelectContent style={s.selectContent} className="z-[100]">
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

function MultiSelectFilter({ label, options, selected, onChange }: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = search
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-1 relative" ref={ref}>
      <Label className="text-xs" style={s.muted}>{label}</Label>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full h-8 rounded-md border px-2.5 text-xs"
        style={s.input}
      >
        <span className="truncate" style={selected.length ? s.text : s.muted}>
          {selected.length > 0 ? `${selected.length} seçili` : "Tümü"}
        </span>
        <ChevronDown className="w-3 h-3 flex-shrink-0 ml-1" style={s.muted} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-[100] max-h-52 overflow-hidden flex flex-col"
          style={{ background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))" }}
        >
          <div className="p-1.5 border-b" style={{ borderColor: "hsl(var(--admin-border))" }}>
            <Input
              placeholder="Ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
              style={s.input}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 && (
              <p className="text-xs px-2 py-3 text-center" style={s.muted}>Sonuç yok</p>
            )}
            {filteredOptions.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity text-xs"
                style={s.text}
                onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--admin-hover))")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Checkbox
                  checked={selected.includes(opt.id)}
                  onCheckedChange={() => toggle(opt.id)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate">{opt.name}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="border-t p-1.5" style={{ borderColor: "hsl(var(--admin-border))" }}>
              <button
                onClick={() => onChange([])}
                className="text-[11px] text-red-500 hover:text-red-600 w-full text-center py-1"
              >
                Temizle ({selected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
