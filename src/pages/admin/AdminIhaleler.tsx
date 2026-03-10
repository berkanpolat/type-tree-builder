import { useState, useEffect, useCallback, CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Gavel, Eye, Clock, Filter, Search, RotateCcw, TrendingUp, Package, HeadphonesIcon,
  CheckCircle, XCircle, ExternalLink, Pencil, Trash2, ArrowUpDown, FileText, ChevronLeft, ChevronRight,
  Image as ImageIcon
} from "lucide-react";

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
  urunCount: number;
  hizmetCount: number;
  urunKategoriDagilimi: { name: string; count: number }[];
  hizmetKategoriDagilimi: { name: string; count: number }[];
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

type SortField = "created_at" | "teklif_sayisi" | "goruntuleme_sayisi" | "bitis_tarihi";
type SortDir = "asc" | "desc";

export default function AdminIhaleler() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [ihaleler, setIhaleler] = useState<IhaleItem[]>([]);
  const [stats, setStats] = useState<IhaleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

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

  // Sorting
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Firma list for dropdown
  const [firmaList, setFirmaList] = useState<{ user_id: string; firma_unvani: string }[]>([]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; desc: string; action: () => void }>({ open: false, title: "", desc: "", action: () => {} });

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editIhale, setEditIhale] = useState<IhaleItem | null>(null);
  const [editForm, setEditForm] = useState({ baslik: "", durum: "", ihale_turu: "", teklif_usulu: "" });

  const callApi = useCallback(async (action: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, { body });
    if (error) throw error;
    return data;
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

      // Build unique firma list
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterTuru("all");
    setFilterUsulu("all");
    setFilterDurum("all");
    setFilterFirma("all");
    setFilterMinTeklif("");
    setFilterMaxTeklif("");
    setFilterMinGoruntuleme("");
    setFilterMaxGoruntuleme("");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const hasActiveFilters = searchTerm || filterTuru !== "all" || filterUsulu !== "all" || filterDurum !== "all" || filterFirma !== "all" ||
    filterMinTeklif || filterMaxTeklif || filterMinGoruntuleme || filterMaxGoruntuleme || filterStartDate || filterEndDate;

  const filtered = ihaleler
    .filter((i) => {
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
      return true;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "teklif_sayisi": aVal = a.teklif_sayisi; bVal = b.teklif_sayisi; break;
        case "goruntuleme_sayisi": aVal = a.goruntuleme_sayisi; bVal = b.goruntuleme_sayisi; break;
        case "bitis_tarihi": aVal = a.bitis_tarihi || ""; bVal = b.bitis_tarihi || ""; break;
        default: aVal = a.created_at; bVal = b.created_at;
      }
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterTuru, filterUsulu, filterDurum, filterFirma, filterMinTeklif, filterMaxTeklif, filterMinGoruntuleme, filterMaxGoruntuleme, filterStartDate, filterEndDate, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Actions
  const openEdit = (ihale: IhaleItem) => {
    setEditIhale(ihale);
    setEditForm({ baslik: ihale.baslik, durum: ihale.durum, ihale_turu: ihale.ihale_turu, teklif_usulu: ihale.teklif_usulu });
    setEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editIhale) return;
    try {
      await callApi("update-ihale", { token, ihaleId: editIhale.id, updates: editForm });
      toast({ title: "Başarılı", description: "İhale güncellendi" });
      setEditDialog(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    }
  };

  const handleApprove = (ihale: IhaleItem) => {
    setConfirmDialog({
      open: true,
      title: "İhaleyi Onayla",
      desc: `"${ihale.baslik}" (${ihale.ihale_no}) başlıklı ihaleyi onaylamak istediğinize emin misiniz? İhale "Devam Ediyor" durumuna geçecektir.`,
      action: async () => {
        try {
          await callApi("approve-ihale", { token, ihaleId: ihale.id });
          toast({ title: "Başarılı", description: "İhale onaylandı" });
          fetchData();
        } catch (err: any) {
          toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
        }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  const handleReject = (ihale: IhaleItem) => {
    setConfirmDialog({
      open: true,
      title: "İhaleyi Reddet",
      desc: `"${ihale.baslik}" (${ihale.ihale_no}) başlıklı ihaleyi reddetmek istediğinize emin misiniz?`,
      action: async () => {
        try {
          await callApi("reject-ihale", { token, ihaleId: ihale.id });
          toast({ title: "Başarılı", description: "İhale reddedildi" });
          fetchData();
        } catch (err: any) {
          toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
        }
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  const handleRemove = (ihale: IhaleItem) => {
    setConfirmDialog({
      open: true,
      title: "İhaleyi Kaldır",
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
      devam_ediyor: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
      onay_bekliyor: "bg-amber-500/20 text-amber-500 border-amber-500/30",
      tamamlandi: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      iptal: "bg-red-500/20 text-red-500 border-red-500/30",
      reddedildi: "bg-red-500/20 text-red-500 border-red-500/30",
      duzenleniyor: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      taslak: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    };
    return <Badge className={`${colors[durum] || ""} text-[10px] px-1.5 py-0`}>{DURUM_LABELS[durum] || durum}</Badge>;
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getRemainingTime = (bitis: string | null) => {
    if (!bitis) return null;
    const end = new Date(bitis).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return "Süre doldu";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}g ${hours}s kaldı`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}s ${mins}dk kaldı`;
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider hover:opacity-80 transition-opacity"
      style={sortField === field ? { color: "hsl(32 92% 54%)" } : s.muted}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <AdminLayout title="İhaleler">
      <div className="space-y-6">
        {/* Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div style={s.card} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Gavel className="w-5 h-5 text-blue-400" />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={s.muted}>Toplam</span>
              </div>
              <div className="text-3xl font-bold" style={s.text}>{stats.total}</div>
              <p className="text-xs mt-1" style={s.muted}>Açılmış ihale</p>
            </div>

            <div style={s.card} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] font-medium uppercase tracking-wider" style={s.muted}>Aktif</span>
              </div>
              <div className="text-3xl font-bold text-emerald-500">{stats.active}</div>
              <p className="text-xs mt-1" style={s.muted}>Devam ediyor</p>
            </div>

            <div style={s.card} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium" style={s.muted}>Ürün Kategorisi ({stats.urunCount})</span>
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {stats.urunKategoriDagilimi.slice(0, 5).map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs gap-2">
                    <span className="truncate" style={s.muted}>{c.name}</span>
                    <span className="font-semibold flex-shrink-0" style={s.text}>{c.count}</span>
                  </div>
                ))}
                {stats.urunKategoriDagilimi.length === 0 && <span className="text-xs" style={s.muted}>Veri yok</span>}
              </div>
            </div>

            <div style={s.card} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <HeadphonesIcon className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-medium" style={s.muted}>Hizmet Kategorisi ({stats.hizmetCount})</span>
              </div>
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {stats.hizmetKategoriDagilimi.slice(0, 5).map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs gap-2">
                    <span className="truncate" style={s.muted}>{c.name}</span>
                    <span className="font-semibold flex-shrink-0" style={s.text}>{c.count}</span>
                  </div>
                ))}
                {stats.hizmetKategoriDagilimi.length === 0 && <span className="text-xs" style={s.muted}>Veri yok</span>}
              </div>
            </div>
          </div>
        )}

        {/* Search, Sort & Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
              <Input
                placeholder="İhale ID, başlık, firma veya kategori ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                style={s.input}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtreler
              {hasActiveFilters && <span className="ml-2 w-2 h-2 rounded-full bg-amber-500" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-red-500 hover:text-red-600 text-xs px-3">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Temizle
              </Button>
            )}
          </div>

          {/* Sort buttons row */}
          <div className="flex items-center gap-4 px-1">
            <span className="text-[10px] font-medium uppercase tracking-wider" style={s.muted}>Sırala:</span>
            <SortButton field="created_at" label="Tarih" />
            <SortButton field="teklif_sayisi" label="Teklif" />
            <SortButton field="goruntuleme_sayisi" label="Görüntülenme" />
            <SortButton field="bitis_tarihi" label="Bitiş" />
          </div>

          {showFilters && (
            <div style={s.card} className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <FilterSelect label="İhale Türü" value={filterTuru} onChange={setFilterTuru}
                options={[{ value: "all", label: "Tümü" }, ...Object.entries(IHALE_TURU_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
              <FilterSelect label="Teklif Usulü" value={filterUsulu} onChange={setFilterUsulu}
                options={[{ value: "all", label: "Tümü" }, ...Object.entries(TEKLIF_USULU_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
              <FilterSelect label="Durum" value={filterDurum} onChange={setFilterDurum}
                options={[{ value: "all", label: "Tümü" }, ...Object.entries(DURUM_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Firma</Label>
                <Select value={filterFirma} onValueChange={setFilterFirma}>
                  <SelectTrigger className="text-xs h-8" style={s.input}><SelectValue placeholder="Tümü" /></SelectTrigger>
                  <SelectContent style={{ ...s.card, padding: "0.25rem" }} className="max-h-60">
                    <SelectItem value="all" className="text-xs">Tümü</SelectItem>
                    {firmaList.map(f => (
                      <SelectItem key={f.user_id} value={f.user_id} className="text-xs">{f.firma_unvani}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              <div className="col-span-2 md:col-span-4 flex justify-end">
                <Button variant="ghost" onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600">
                  <RotateCcw className="w-3 h-3 mr-1.5" />
                  Tüm Filtreleri Temizle
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between text-xs" style={s.muted}>
          <span>{filtered.length} ihale listeleniyor {hasActiveFilters && `(${ihaleler.length} toplam)`}</span>
          <span>Sayfa {safePage} / {totalPages}</span>
        </div>

        {/* İhale List */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12" style={s.muted}>İhale bulunamadı.</div>
            )}
            {paginated.map((ihale) => (
              <div key={ihale.id} style={s.card} className="p-5 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  {/* Photo */}
                  <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "hsl(var(--admin-hover))" }}>
                    {ihale.foto_url ? (
                      <img src={ihale.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6" style={s.muted} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--admin-hover))", ...s.text }}>
                        {ihale.ihale_no}
                      </span>
                      <h3 className="font-semibold text-sm truncate" style={s.text}>{ihale.baslik}</h3>
                      {durumBadge(ihale.durum)}
                    </div>

                    <div className="flex items-center gap-4 text-xs flex-wrap mb-2" style={s.secondary}>
                      <span>{ihale.firma_unvani}</span>
                      <span>·</span>
                      <span>{IHALE_TURU_LABELS[ihale.ihale_turu] || ihale.ihale_turu}</span>
                      <span>·</span>
                      <span>{TEKLIF_USULU_LABELS[ihale.teklif_usulu] || ihale.teklif_usulu}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs flex-wrap mb-2" style={s.muted}>
                      <span>Kategori: {ihale.kategori_label}</span>
                    </div>

                    <div className="flex items-center gap-6 text-xs" style={s.muted}>
                      <span>Başlangıç: {formatDate(ihale.baslangic_tarihi)}</span>
                      <span>Bitiş: {formatDate(ihale.bitis_tarihi)}</span>
                      {ihale.durum === "devam_ediyor" && ihale.bitis_tarihi && (
                        <span className="text-amber-500 font-medium">{getRemainingTime(ihale.bitis_tarihi)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-6 mt-2">
                      <div className="flex items-center gap-1.5 text-xs" style={s.muted}>
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-semibold" style={s.text}>{ihale.teklif_sayisi}</span> Teklif
                      </div>
                      <div className="flex items-center gap-1.5 text-xs" style={s.muted}>
                        <Eye className="w-3.5 h-3.5" />
                        <span className="font-semibold" style={s.text}>{ihale.goruntuleme_sayisi}</span> Görüntülenme
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <Button onClick={() => openEdit(ihale)} variant="outline" size="sm" className="text-xs justify-start"
                      style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" }}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Düzenle
                    </Button>

                    {ihale.durum === "onay_bekliyor" && (
                      <>
                        <Button onClick={() => handleApprove(ihale)} size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white justify-start">
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          Onayla
                        </Button>
                        <Button onClick={() => handleReject(ihale)} size="sm" variant="outline" className="text-xs text-red-500 border-red-500/30 hover:bg-red-500/10 justify-start">
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          Reddet
                        </Button>
                      </>
                    )}

                    <Button onClick={() => window.open(`/tekihale/${ihale.id}`, "_blank")} variant="outline" size="sm" className="text-xs justify-start"
                      style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" }}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Detay
                    </Button>

                    {(ihale.durum === "devam_ediyor" || ihale.durum === "tamamlandi") && (
                      <Button onClick={() => window.open(`/manuihale/takip/${ihale.id}`, "_blank")} variant="outline" size="sm" className="text-xs justify-start"
                        style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" }}>
                        <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                        Takip
                      </Button>
                    )}

                    {ihale.durum !== "iptal" && ihale.durum !== "tamamlandi" && (
                      <Button onClick={() => handleRemove(ihale)} variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 justify-start">
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Kaldır
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline" size="sm" disabled={safePage <= 1}
              onClick={() => setCurrentPage(safePage - 1)}
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}
              className="text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
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
                  <Button
                    key={p} size="sm" variant={p === safePage ? "default" : "outline"}
                    onClick={() => setCurrentPage(p as number)}
                    className={p === safePage ? "bg-amber-500 hover:bg-amber-600 text-white text-xs w-8 h-8 p-0" : "text-xs w-8 h-8 p-0"}
                    style={p !== safePage ? { borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" } : undefined}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button
              variant="outline" size="sm" disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}
              className="text-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent style={s.card} className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={s.text}>İhaleyi Düzenle</DialogTitle>
            <DialogDescription style={s.muted}>
              {editIhale?.ihale_no} numaralı ihaleyi düzenleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs" style={s.muted}>Başlık</Label>
              <Input value={editForm.baslik} onChange={(e) => setEditForm({ ...editForm, baslik: e.target.value })} style={s.input} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Durum</Label>
                <Select value={editForm.durum} onValueChange={(v) => setEditForm({ ...editForm, durum: v })}>
                  <SelectTrigger className="text-xs h-8" style={s.input}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ ...s.card, padding: "0.25rem" }}>
                    {Object.entries(DURUM_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>İhale Türü</Label>
                <Select value={editForm.ihale_turu} onValueChange={(v) => setEditForm({ ...editForm, ihale_turu: v })}>
                  <SelectTrigger className="text-xs h-8" style={s.input}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ ...s.card, padding: "0.25rem" }}>
                    {Object.entries(IHALE_TURU_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Teklif Usulü</Label>
                <Select value={editForm.teklif_usulu} onValueChange={(v) => setEditForm({ ...editForm, teklif_usulu: v })}>
                  <SelectTrigger className="text-xs h-8" style={s.input}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ ...s.card, padding: "0.25rem" }}>
                    {Object.entries(TEKLIF_USULU_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="ghost" onClick={() => setEditDialog(false)} style={s.muted}>İptal</Button>
            <Button onClick={handleEditSave} className="bg-amber-500 hover:bg-amber-600 text-white">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent style={s.card}>
          <AlertDialogHeader>
            <AlertDialogTitle style={s.text}>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription style={s.muted}>{confirmDialog.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={s.muted}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.action} className="bg-amber-500 hover:bg-amber-600 text-white">
              Evet, Onayla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
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
