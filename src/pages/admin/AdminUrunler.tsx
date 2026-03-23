import { useState, useEffect, useCallback, CSSProperties, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAdminApi } from "@/hooks/use-admin-api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Activity, XCircle, Clock, FileEdit, Ban, Users, ShoppingBag, Tag, Building2,
  Search, Filter, RotateCcw, ArrowUpDown, ExternalLink, Eye, ChevronLeft, ChevronRight,
  Image as ImageIcon, X, ChevronDown, Pencil, Trash2, ToggleLeft
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

interface UrunStats {
  total: number;
  aktif: number;
  pasif: number;
  onayBekleyen: number;
  reddedilen: number;
  taslak: number;
  totalUsers: number;
  usersWithProducts: number;
  kategoriDagilimi: { id: string; name: string; count: number }[];
  urunTurDagilimi: { id: string; name: string; count: number; grup_id: string | null; kategori_id: string | null }[];
  firmaTuruDagilimi: { id: string; name: string; count: number }[];
  firmaTipiDagilimi: { id: string; name: string; count: number }[];
}

interface UrunItem {
  id: string;
  urun_no: string;
  baslik: string;
  foto_url: string | null;
  durum: string;
  fiyat: number | null;
  fiyat_tipi: string;
  para_birimi: string | null;
  min_siparis_miktari: number | null;
  created_at: string;
  user_id: string;
  firma_unvani: string;
  firma_logo_url: string | null;
  kategori_label: string;
  urun_kategori_id: string | null;
  urun_grup_id: string | null;
  urun_tur_id: string | null;
  goruntuleme_sayisi?: number;
  slug?: string | null;
}

const DURUM_LABELS: Record<string, string> = {
  taslak: "Taslak",
  onay_bekliyor: "Onay Bekliyor",
  aktif: "Aktif",
  pasif: "Pasif",
  reddedildi: "Reddedildi",
};

const RED_SEBEPLERI = [
  "Eksik veya yetersiz ürün bilgisi",
  "Yanlış kategori seçimi",
  "Yanlış ürün tipi seçimi",
  "Düşük kaliteli görseller",
  "Uygunsuz görseller",
  "Platform kurallarına aykırı içerik",
  "Platform dışı iletişim bilgisi paylaşımı",
  "Reklam veya yönlendirme içerikleri",
  "Tekstil kapsamı dışı ürün",
  "Yasaklı ürün",
  "Sahte veya marka ihlali içeren ürün",
  "Telif hakkı ihlali",
  "Gerçekçi olmayan fiyatlandırma",
  "Fiyat bilgisinin eksik olması",
  "Yinelenen (duplicate) ürün",
  "Yanıltıcı ürün bilgisi",
  "Doğrulanmamış veya şüpheli satıcı davranışı",
  "Spam ürün yükleme",
  "Eksik teknik özellik bilgileri",
  "Platform standartlarına uygun olmayan ürün başlığı",
  "Platform kalite standartlarına uymayan içerik",
];

const ITEMS_PER_PAGE = 10;
type SortField = "created_at" | "fiyat" | "goruntuleme";
type SortDir = "asc" | "desc";
type StatFilterType = "all" | "aktif" | "pasif" | "onay_bekliyor" | "reddedildi" | "taslak" | "kategori" | "tur";

export default function AdminUrunler() {
  const { token, hasPermission } = useAdminAuth();
  const { toast } = useToast();

  const noPermission = () => toast({ title: "Yetkisiz", description: "Buna yetkiniz yok", variant: "destructive" });

  const [urunler, setUrunler] = useState<UrunItem[]>([]);
  const [stats, setStats] = useState<UrunStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [statFilter, setStatFilter] = useState<{ type: StatFilterType; value?: string }>({ type: "all" });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDurum, setFilterDurum] = useState("all");
  const [filterFirma, setFilterFirma] = useState("all");
  const [firmaSearch, setFirmaSearch] = useState("");

  // Category filters
  const [selectedKategoriler, setSelectedKategoriler] = useState<string[]>([]);
  const [selectedGruplar, setSelectedGruplar] = useState<string[]>([]);
  const [selectedTurler, setSelectedTurler] = useState<string[]>([]);
  const [allSecenekler, setAllSecenekler] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [categoryRoots, setCategoryRoots] = useState<{ id: string; name: string }[]>([]);

  // Ürün Türü dağılımı filter states
  const [turFilterKategori, setTurFilterKategori] = useState("all");
  const [turFilterGrup, setTurFilterGrup] = useState("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Firma list
  const [firmaList, setFirmaList] = useState<{ user_id: string; firma_unvani: string }[]>([]);

  // Action dialogs
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; urunId: string; baslik: string }>({ open: false, urunId: "", baslik: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const callApi = useAdminApi();

  // Derived: filtered groups based on selected categories
  const filteredGruplar = allSecenekler.filter(o =>
    o.parent_id && (selectedKategoriler.length === 0
      ? categoryRoots.some(r => r.id === o.parent_id)
      : selectedKategoriler.includes(o.parent_id!))
  );

  const filteredTurler = allSecenekler.filter(o =>
    o.parent_id && (selectedGruplar.length === 0
      ? filteredGruplar.some(g => g.id === o.parent_id)
      : selectedGruplar.includes(o.parent_id!))
  );

  // Clear child selections when parent changes
  useEffect(() => {
    setSelectedGruplar(prev => prev.filter(id => filteredGruplar.some(g => g.id === id)));
  }, [selectedKategoriler]);

  useEffect(() => {
    setSelectedTurler(prev => prev.filter(id => filteredTurler.some(t => t.id === id)));
  }, [selectedGruplar, selectedKategoriler]);

  const fetchCategoryOptions = useCallback(async () => {
    try {
      const { data: kategoriler } = await supabase
        .from("firma_bilgi_kategorileri")
        .select("id, name");
      if (!kategoriler) return;
      const urunKat = kategoriler.find((k: any) => k.name === "Ana Ürün Kategorileri");
      if (urunKat) {
        const { data } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name, parent_id")
          .eq("kategori_id", urunKat.id);
        if (data) {
          setAllSecenekler(data);
          setCategoryRoots(data.filter((o: any) => !o.parent_id).map((r: any) => ({ id: r.id, name: r.name })));
        }
      }
    } catch { }
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [{ data: urunResult, error: urunErr }, { data: statsResult, error: statsErr }] = await Promise.all([
        supabase.rpc("admin_list_urunler_v2"),
        supabase.rpc("admin_urun_stats_v2"),
      ]);
      if (urunErr) throw urunErr;
      if (statsErr) throw statsErr;
      const urunList = (urunResult as any) || [];
      setUrunler(urunList);
      setStats((statsResult || null) as unknown as UrunStats);

      const firms = urunList.reduce((acc: any[], u: any) => {
        if (!acc.find((f: any) => f.user_id === u.user_id)) {
          acc.push({ user_id: u.user_id, firma_unvani: u.firma_unvani });
        }
        return acc;
      }, []);
      setFirmaList(firms.sort((a: any, b: any) => a.firma_unvani.localeCompare(b.firma_unvani)));
    } catch {
      toast({ title: "Hata", description: "Veriler yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { fetchData(); fetchCategoryOptions(); }, [fetchData, fetchCategoryOptions]);

  const clearFilters = () => {
    setSearchTerm(""); setFilterDurum("all"); setFilterFirma("all");
    setSelectedKategoriler([]); setSelectedGruplar([]); setSelectedTurler([]);
  };

  const hasActiveFilters = searchTerm || filterDurum !== "all" || filterFirma !== "all" ||
    selectedKategoriler.length > 0 || selectedGruplar.length > 0 || selectedTurler.length > 0;

  const filtered = urunler
    .filter((u) => {
      if (statFilter.type !== "all") {
        if (["aktif", "pasif", "onay_bekliyor", "reddedildi", "taslak"].includes(statFilter.type) && u.durum !== statFilter.type) return false;
        if (statFilter.type === "kategori" && u.urun_kategori_id !== statFilter.value) return false;
        if (statFilter.type === "tur" && u.urun_tur_id !== statFilter.value) return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!u.baslik.toLowerCase().includes(q) && !u.urun_no.toLowerCase().includes(q) && !u.kategori_label.toLowerCase().includes(q) && !u.firma_unvani.toLowerCase().includes(q)) return false;
      }
      if (filterDurum !== "all" && u.durum !== filterDurum) return false;
      if (filterFirma !== "all" && u.user_id !== filterFirma) return false;
      if (selectedKategoriler.length > 0 && !selectedKategoriler.includes(u.urun_kategori_id || "")) return false;
      if (selectedGruplar.length > 0 && !selectedGruplar.includes(u.urun_grup_id || "")) return false;
      if (selectedTurler.length > 0 && !selectedTurler.includes(u.urun_tur_id || "")) return false;
      return true;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "fiyat": aVal = a.fiyat ?? 0; bVal = b.fiyat ?? 0; break;
        case "goruntuleme": aVal = a.goruntuleme_sayisi ?? 0; bVal = b.goruntuleme_sayisi ?? 0; break;
        default: aVal = a.created_at; bVal = b.created_at;
      }
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterDurum, filterFirma, sortField, sortDir, selectedKategoriler, selectedGruplar, selectedTurler, statFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const durumBadge = (durum: string) => {
    const colors: Record<string, string> = {
      aktif: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
      pasif: "bg-slate-500/15 text-slate-500 border-slate-500/25",
      onay_bekliyor: "bg-amber-500/15 text-amber-600 border-amber-500/25",
      reddedildi: "bg-red-500/15 text-red-500 border-red-500/25",
      taslak: "bg-slate-500/15 text-slate-500 border-slate-500/25",
    };
    return <Badge variant="outline" className={`${colors[durum] || ""} text-[11px] px-2 py-0.5 font-medium`}>{DURUM_LABELS[durum] || durum}</Badge>;
  };

  const formatPrice = (fiyat: number | null, birim: string | null) => {
    if (fiyat === null) return "—";
    const curr = birim === "USD" ? "$" : birim === "EUR" ? "€" : "₺";
    return `${curr}${fiyat.toLocaleString("tr-TR")}`;
  };

  const filteredFirmaList = firmaSearch
    ? firmaList.filter(f => f.firma_unvani.toLowerCase().includes(firmaSearch.toLowerCase()))
    : firmaList;

  // Toggle ürün aktif/pasif
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const handleToggle = async (urunId: string, currentDurum: string) => {
    if (toggleLoadingId) return;
    setToggleLoadingId(urunId);
    const newDurum = currentDurum === "aktif" ? "pasif" : "aktif";
    try {
      await callApi("toggle-urun", { token, urunId, newDurum });
      setUrunler(prev => prev.map(u => u.id === urunId ? { ...u, durum: newDurum } : u));
      toast({ title: `Ürün ${newDurum === "aktif" ? "aktif" : "pasif"} yapıldı` });
    } catch {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" });
    } finally {
      setToggleLoadingId(null);
    }
  };

  // Remove ürün
  const handleRemove = async () => {
    if (!removeDialog.urunId) return;
    setActionLoading(true);
    try {
      await callApi("remove-urun", { token, urunId: removeDialog.urunId });
      setUrunler(prev => prev.filter(u => u.id !== removeDialog.urunId));
      toast({ title: "Ürün kaldırıldı" });
      setRemoveDialog({ open: false, urunId: "", baslik: "" });
    } catch {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
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

  const getStatFilterLabel = () => {
    if (statFilter.type === "aktif") return "Aktif Ürünler";
    if (statFilter.type === "pasif") return "Pasif Ürünler";
    if (statFilter.type === "onay_bekliyor") return "Onay Bekleyen Ürünler";
    if (statFilter.type === "reddedildi") return "Reddedilen Ürünler";
    if (statFilter.type === "taslak") return "Taslak Ürünler";
    if (statFilter.type === "kategori") return stats?.kategoriDagilimi.find(c => c.id === statFilter.value)?.name;
    if (statFilter.type === "tur") return stats?.urunTurDagilimi.find(c => c.id === statFilter.value)?.name;
    return "";
  };

  // Ürün türü dağılımı filtered by selected kategori/grup
  const filteredTurDagilimi = stats?.urunTurDagilimi.filter(t => {
    if (turFilterKategori !== "all" && t.kategori_id !== turFilterKategori) return false;
    if (turFilterGrup !== "all" && t.grup_id !== turFilterGrup) return false;
    return true;
  }) || [];

  // Groups for ürün türü filter (based on selected category)
  const turFilterGrupOptions = allSecenekler.filter(o =>
    o.parent_id && (turFilterKategori === "all"
      ? categoryRoots.some(r => r.id === o.parent_id)
      : o.parent_id === turFilterKategori)
  );

  // Reset grup when category changes
  useEffect(() => { setTurFilterGrup("all"); }, [turFilterKategori]);

  if (loading) {
    return (
      <AdminLayout title="Ürünler">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Ürünler">
      <div className="space-y-5">
        {/* ── Summary Stats ── */}
        {stats && (
          <div className="space-y-3">
            {/* Status cards */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {([
                { type: "all" as StatFilterType, label: "Toplam Ürün", value: stats.total, icon: <Package className="w-3.5 h-3.5" />, color: "text-blue-500" },
                { type: "aktif" as StatFilterType, label: "Aktif", value: stats.aktif, icon: <Activity className="w-3.5 h-3.5" />, color: "text-emerald-500" },
                { type: "pasif" as StatFilterType, label: "Pasif", value: stats.pasif, icon: <Ban className="w-3.5 h-3.5" />, color: "text-slate-400" },
                { type: "onay_bekliyor" as StatFilterType, label: "Onay Bekleyen", value: stats.onayBekleyen, icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-500" },
                { type: "reddedildi" as StatFilterType, label: "Reddedilen", value: stats.reddedilen, icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-500" },
                { type: "taslak" as StatFilterType, label: "Taslak", value: stats.taslak, icon: <FileEdit className="w-3.5 h-3.5" />, color: "text-slate-400" },
              ]).map((card) => (
                <button
                  key={card.type}
                  onClick={() => setStatFilter(statFilter.type === card.type ? { type: "all" } : { type: card.type })}
                  style={{
                    ...s.card,
                    ...(statFilter.type === card.type ? { borderColor: "hsl(var(--admin-accent, 40 96% 53%))", boxShadow: "0 0 0 1px hsl(var(--admin-accent, 40 96% 53%) / 0.3)" } : {}),
                  }}
                  className="p-2.5 text-left transition-all hover:opacity-80 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={card.color}>{card.icon}</span>
                    <span className="text-[10px] font-medium truncate" style={s.muted}>{card.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                </button>
              ))}
            </div>

            {/* User stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div style={s.card} className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[11px] font-medium" style={s.muted}>Toplam Kullanıcı / Ürünü Olan</p>
                  <p className="text-lg font-bold" style={s.text}>
                    {stats.totalUsers} <span className="text-sm font-normal" style={s.muted}>/</span>{" "}
                    <span className="text-emerald-500">{stats.usersWithProducts}</span>
                  </p>
                </div>
              </div>
              <div style={s.card} className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-[11px] font-medium" style={s.muted}>Ortalama Ürün / Kullanıcı</p>
                  <p className="text-lg font-bold text-purple-500">
                    {stats.usersWithProducts > 0 ? (stats.total / stats.usersWithProducts).toFixed(1) : "0"}
                  </p>
                </div>
              </div>
            </div>

            {/* Category distribution */}
            <div style={s.card} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-semibold" style={s.text}>Ana Ürün Kategorisi Dağılımı</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                {stats.kategoriDagilimi.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setStatFilter(
                      statFilter.type === "kategori" && statFilter.value === cat.id
                        ? { type: "all" }
                        : { type: "kategori", value: cat.id }
                    )}
                    className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md transition-all"
                    style={{
                      background: statFilter.type === "kategori" && statFilter.value === cat.id
                        ? "rgba(168, 85, 247, 0.15)" : "hsl(var(--admin-hover))",
                      color: statFilter.type === "kategori" && statFilter.value === cat.id
                        ? "rgb(168, 85, 247)" : "hsl(var(--admin-text))",
                      border: statFilter.type === "kategori" && statFilter.value === cat.id
                        ? "1px solid rgba(168, 85, 247, 0.3)" : "1px solid transparent",
                    }}
                  >
                    <span className="truncate max-w-[140px]">{cat.name}</span>
                    <span className="font-bold">{cat.count}</span>
                  </button>
                ))}
                {stats.kategoriDagilimi.length === 0 && (
                  <span className="text-[11px]" style={s.muted}>Henüz veri yok</span>
                )}
              </div>
            </div>

            {/* Ürün Türü distribution with category/group filters */}
            <div style={s.card} className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-xs font-semibold" style={s.text}>Ürün Türü Dağılımı</span>
                  <span className="text-[10px]" style={s.muted}>({filteredTurDagilimi.length} tür)</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={turFilterKategori}
                    onChange={(e) => setTurFilterKategori(e.target.value)}
                    className="text-[11px] px-2 py-1 rounded-md"
                    style={{ background: "hsl(var(--admin-input-bg))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))", border: "1px solid hsl(var(--admin-border))" }}
                  >
                    <option value="all">Tüm Kategoriler</option>
                    {categoryRoots.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select
                    value={turFilterGrup}
                    onChange={(e) => setTurFilterGrup(e.target.value)}
                    className="text-[11px] px-2 py-1 rounded-md"
                    style={{ background: "hsl(var(--admin-input-bg))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))", border: "1px solid hsl(var(--admin-border))" }}
                  >
                    <option value="all">Tüm Gruplar</option>
                    {turFilterGrupOptions.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto">
                {filteredTurDagilimi.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setStatFilter(
                      statFilter.type === "tur" && statFilter.value === item.id
                        ? { type: "all" }
                        : { type: "tur", value: item.id }
                    )}
                    className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md transition-all"
                    style={{
                      background: statFilter.type === "tur" && statFilter.value === item.id
                        ? "rgba(20, 184, 166, 0.15)" : "hsl(var(--admin-hover))",
                      color: statFilter.type === "tur" && statFilter.value === item.id
                        ? "rgb(20, 184, 166)" : "hsl(var(--admin-text))",
                      border: statFilter.type === "tur" && statFilter.value === item.id
                        ? "1px solid rgba(20, 184, 166, 0.3)" : "1px solid transparent",
                    }}
                  >
                    <span className="truncate max-w-[140px]">{item.name}</span>
                    <span className={`font-bold ${item.count > 0 ? "text-teal-500" : "text-slate-500"}`}>{item.count}</span>
                  </button>
                ))}
                {filteredTurDagilimi.length === 0 && (
                  <span className="text-[11px]" style={s.muted}>Henüz veri yok</span>
                )}
              </div>
            </div>

            {/* Firma Türü & Tipi distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div style={s.card} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-semibold" style={s.text}>Firma Türü Ürün Dağılımı</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                  {stats.firmaTuruDagilimi.map((item) => (
                    <span
                      key={item.id}
                      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md"
                      style={{ background: "hsl(var(--admin-hover))", color: "hsl(var(--admin-text))", border: "1px solid transparent" }}
                    >
                      <span className="truncate max-w-[120px]">{item.name}</span>
                      <span className={`font-bold ${item.count > 0 ? "text-orange-500" : "text-slate-500"}`}>{item.count}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div style={s.card} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-xs font-semibold" style={s.text}>Firma Tipi Ürün Dağılımı</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                  {stats.firmaTipiDagilimi.map((item) => (
                    <span
                      key={item.id}
                      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md"
                      style={{ background: "hsl(var(--admin-hover))", color: "hsl(var(--admin-text))", border: "1px solid transparent" }}
                    >
                      <span className="truncate max-w-[120px]">{item.name}</span>
                      <span className={`font-bold ${item.count > 0 ? "text-cyan-500" : "text-slate-500"}`}>{item.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Active stat filter indicator */}
            {statFilter.type !== "all" && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={s.muted}>Filtre aktif:</span>
                <Badge variant="outline" className="text-[11px] gap-1 pr-1">
                  {getStatFilterLabel()}
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
                placeholder="Ürün no, başlık, firma veya kategori ara..."
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
            <SortButton field="fiyat" label="Fiyat" />
            <SortButton field="goruntuleme" label="Görüntülenme" />
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div style={s.card} className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs" style={s.muted}>Durum</Label>
                  <Select value={filterDurum} onValueChange={setFilterDurum}>
                    <SelectTrigger className="text-xs h-8" style={s.input}><SelectValue placeholder="Tümü" /></SelectTrigger>
                    <SelectContent style={s.selectContent} className="z-[100]">
                      <SelectItem value="all" className="text-xs">Tümü</SelectItem>
                      {Object.entries(DURUM_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Firma dropdown */}
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

              {/* Category filters */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MultiSelectFilter
                  label="Ürün Kategorisi"
                  options={categoryRoots}
                  selected={selectedKategoriler}
                  onChange={setSelectedKategoriler}
                />
                <MultiSelectFilter
                  label="Ürün Grubu"
                  options={filteredGruplar.map(o => ({ id: o.id, name: o.name }))}
                  selected={selectedGruplar}
                  onChange={setSelectedGruplar}
                />
                <MultiSelectFilter
                  label="Ürün Türü"
                  options={filteredTurler.map(o => ({ id: o.id, name: o.name }))}
                  selected={selectedTurler}
                  onChange={setSelectedTurler}
                />
              </div>
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between text-xs" style={s.muted}>
          <span>{filtered.length} ürün {hasActiveFilters && `(${urunler.length} toplam)`}</span>
          <span>Sayfa {safePage} / {totalPages}</span>
        </div>

        {/* ── Ürün Cards ── */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16" style={s.muted}>
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ürün bulunamadı.</p>
            </div>
          )}
          {paginated.map((urun) => (
            <div key={urun.id} style={s.card} className="overflow-hidden hover:shadow-md transition-shadow sm:min-h-[140px]">
              <div className="flex flex-col sm:flex-row sm:h-full">
                {/* Photo */}
                <div className="w-full h-36 sm:w-[140px] sm:h-full flex-shrink-0 flex items-center justify-center" style={{ background: "hsl(var(--admin-hover))" }}>
                  {urun.foto_url ? (
                    <img src={urun.foto_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-10 h-10 opacity-20" style={s.muted} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-3 sm:p-4 min-w-0 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="min-w-0 space-y-1.5">
                      {/* Row 1: ID + Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: "hsl(var(--admin-hover))", ...s.text }}>
                          {urun.urun_no}
                        </code>
                        {durumBadge(urun.durum)}
                      </div>

                      {/* Row 2: Title */}
                      <h3 className="font-semibold text-sm leading-tight line-clamp-2 sm:truncate" style={s.text}>{urun.baslik}</h3>

                      {/* Row 3: Firma info */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0" style={{ background: "hsl(var(--admin-hover))", border: "1px solid hsl(var(--admin-border))" }}>
                          {urun.firma_logo_url ? (
                            <img src={urun.firma_logo_url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[9px] font-bold" style={s.muted}>{urun.firma_unvani?.charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-xs font-medium truncate" style={s.secondary}>{urun.firma_unvani}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {hasPermission("urun_inceleyebilir") && (
                        <Button
                          onClick={() => window.open(`/urun/${urun.slug || urun.id}`, "_blank")}
                          variant="outline" size="sm"
                          className="text-xs h-7 px-2.5 gap-1.5"
                          style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text-secondary))" }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> İncele
                        </Button>
                      )}
                      {(urun.durum === "aktif" || urun.durum === "pasif") && hasPermission("urun_onaylayabilir") && (
                        <Switch
                          checked={urun.durum === "aktif"}
                          disabled={toggleLoadingId === urun.id}
                          onCheckedChange={() => handleToggle(urun.id, urun.durum)}
                          className="scale-[0.85]"
                        />
                      )}
                      {hasPermission("urun_duzenleyebilir") && (
                        <Button
                          onClick={() => window.open(`/urunlerim/duzenle/${urun.id}?admin=1`, "_blank")}
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0"
                          style={s.muted}
                          title="Düzenle"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {hasPermission("urun_kaldirabilir") && (
                        <Button
                          onClick={() => setRemoveDialog({ open: true, urunId: urun.id, baslik: urun.baslik })}
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          title="Kaldır"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: Category + Views + Price */}
                  <div className="flex items-center gap-3 text-xs mt-auto pt-1 flex-wrap" style={s.muted}>
                    {urun.kategori_label !== "—" && (
                      <span className="text-purple-500 truncate max-w-[200px] sm:max-w-[280px]">{urun.kategori_label}</span>
                    )}
                    <span className="flex items-center gap-1 shrink-0">
                      <Eye className="w-3.5 h-3.5" />
                      {urun.goruntuleme_sayisi ?? 0}
                    </span>
                    {urun.fiyat !== null && (
                      <span className="font-bold text-emerald-500 shrink-0">
                        {formatPrice(urun.fiyat, urun.para_birimi)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

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

      {/* Remove Dialog */}
      <AlertDialog open={removeDialog.open} onOpenChange={(open) => !open && setRemoveDialog({ open: false, urunId: "", baslik: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünü Kaldır</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{removeDialog.baslik}"</strong> başlıklı ürünü kaldırmak istediğinize emin misiniz? Bu işlem geri alınamaz. Ürün sahibine bildirim ve mail gönderilecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading ? "Kaldırılıyor..." : "Kaldır"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

/* ── MultiSelectFilter Component ── */
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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const filteredOptions = search
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="space-y-1 relative" ref={ref}>
      <Label className="text-xs" style={s.muted}>{label}</Label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between h-8 px-3 rounded-md text-xs"
        style={{ background: "hsl(var(--admin-input-bg))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))", border: "1px solid hsl(var(--admin-border))" }}
      >
        <span className="truncate" style={s.text}>
          {selected.length ? `${selected.length} seçili` : "Tümü"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={s.muted} />
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
