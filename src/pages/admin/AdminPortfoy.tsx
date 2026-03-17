import { useState, useEffect, useCallback, CSSProperties, Fragment } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAdminApi } from "@/hooks/use-admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Search, ExternalLink, Gavel, Package, CreditCard, Wifi,
  ArrowUpDown, ArrowUp, ArrowDown, Eye, Loader2, ShieldCheck,
  MoreHorizontal, Briefcase, ClipboardList, Plus, Users, ChevronUp, ChevronDown, MapPin, CalendarIcon, Send,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TUR_CONFIG } from "@/lib/aksiyon-config";
import AksiyonEkleDialog, { type EditAksiyonData } from "@/components/admin/AksiyonEkleDialog";
import FirmaAksiyonlarDialog from "@/components/admin/FirmaAksiyonlarDialog";
import FirmaYetkililerDialog from "@/components/admin/FirmaYetkililerDialog";
import AksiyonDetayDialog, { type AksiyonDetay } from "@/components/admin/AksiyonDetayDialog";

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
};

function getValueColor(value: number): string {
  if (value < 5) return "#ef4444";
  if (value <= 20) return "#eab308";
  return "#22c55e";
}

interface FirmaItem {
  id: string;
  firma_unvani: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  onay_durumu: string;
  user_id: string;
  firma_turu_name: string | null;
  firma_tipi_name: string | null;
  il_name: string | null;
  ihale_sayisi: number;
  teklif_sayisi: number;
  urun_sayisi: number;
  profil_doluluk: number;
  belge_onayli?: boolean;
  profile: { ad: string; soyad: string; iletisim_email: string; iletisim_numarasi: string | null; last_seen: string | null } | null;
  abonelik: { paket_id: string; paket_ad: string; paket_slug: string; periyot: string; durum: string } | null;
  portfolyo: { admin_id: string; admin_ad: string; admin_soyad: string; atanmis?: boolean } | null;
}

type SortField = "firma_unvani" | "ihale_sayisi" | "teklif_sayisi" | "urun_sayisi" | "profil_doluluk" | "created_at" | "last_seen";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatRelativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Şimdi";
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.floor(hours / 24);
  return `${days}g`;
}

function durumBadge(durum: string) {
  const config: Record<string, { label: string; bg: string; color: string; border: string }> = {
    onaylandi: { label: "Onaylı", bg: "rgba(34,197,94,0.1)", color: "#22c55e", border: "rgba(34,197,94,0.3)" },
    onay_bekliyor: { label: "Bekliyor", bg: "rgba(234,179,8,0.1)", color: "#eab308", border: "rgba(234,179,8,0.3)" },
    reddedildi: { label: "Reddedildi", bg: "rgba(239,68,68,0.1)", color: "#ef4444", border: "rgba(239,68,68,0.3)" },
  };
  const c = config[durum] || { label: durum, bg: "rgba(100,116,139,0.1)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" };
  return <Badge className="text-[10px] px-1.5 py-0" style={{ background: c.bg, color: c.color, borderColor: c.border }}>{c.label}</Badge>;
}

export default function AdminPortfoy() {
  const { token, user: adminUser, hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [allFirmalar, setAllFirmalar] = useState<FirmaItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTuru, setFilterTuru] = useState<string>("all");
  const [filterTipi, setFilterTipi] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [aksiyonEkleOpen, setAksiyonEkleOpen] = useState(false);
  const [aksiyonlarOpen, setAksiyonlarOpen] = useState(false);
  const [yetkililerOpen, setYetkililerOpen] = useState(false);
  const [editAksiyon, setEditAksiyon] = useState<EditAksiyonData | null>(null);
  const [selectedFirma, setSelectedFirma] = useState<FirmaItem | null>(null);
  const [ziyaretDialogOpen, setZiyaretDialogOpen] = useState(false);
  const [ziyaretTarih, setZiyaretTarih] = useState<Date | undefined>(undefined);
  const [ziyaretNotlar, setZiyaretNotlar] = useState("");
  const [ziyaretSaving, setZiyaretSaving] = useState(false);
  const [sevkDialogOpen, setSevkDialogOpen] = useState(false);
  const [sevkAdminList, setSevkAdminList] = useState<{ id: string; ad: string; soyad: string; departman: string; pozisyon: string }[]>([]);
  const [sevkTargetId, setSevkTargetId] = useState("");
  const [sevkSaving, setSevkSaving] = useState(false);
  const [sevkSelectedFirma, setSevkSelectedFirma] = useState<FirmaItem | null>(null);
  // Expandable row - aksiyon geçmişi
  const [expandedFirmaId, setExpandedFirmaId] = useState<string | null>(null);
  const [expandedAksiyonlar, setExpandedAksiyonlar] = useState<any[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [detayAksiyon, setDetayAksiyon] = useState<AksiyonDetay | null>(null);

  const callApi = useAdminApi();

  const fetchData = useCallback(async () => {
    if (!token || !adminUser?.id) return;
    try {
      // Fetch all portfolio firms using pagination to bypass limits
      let allFirms: FirmaItem[] = [];
      let page = 1;
      const perPage = 500;
      let hasMore = true;

      while (hasMore) {
        const firmaData = await callApi("list-firmalar", {
          token,
          paginated: true,
          page,
          perPage,
          filterPortfolyo: adminUser.id,
        });
        const firms = firmaData.firmalar || [];
        allFirms = allFirms.concat(firms);
        const total = firmaData.total || 0;
        setTotalCount(total);
        hasMore = allFirms.length < total;
        page++;
      }

      setAllFirmalar(allFirms);
    } catch {
      toast({ title: "Hata", description: "Veriler yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, adminUser?.id, callApi, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleExpandFirma = async (firmaId: string) => {
    if (expandedFirmaId === firmaId) {
      setExpandedFirmaId(null);
      return;
    }
    setExpandedFirmaId(firmaId);
    setExpandedLoading(true);
    setExpandedAksiyonlar([]);
    try {
      const data = await callApi("list-firma-aksiyonlar", { token, firmaId });
      setExpandedAksiyonlar(data.aksiyonlar || []);
    } catch {
      setExpandedAksiyonlar([]);
    } finally {
      setExpandedLoading(false);
    }
  };

  const handleAddZiyaret = async () => {
    if (!selectedFirma || !ziyaretTarih) return;
    setZiyaretSaving(true);
    try {
      await callApi("add-ziyaret-plani", {
        token,
        firmaId: selectedFirma.id,
        planlanenTarih: format(ziyaretTarih, "yyyy-MM-dd"),
        notlar: ziyaretNotlar || null,
      });
      toast({ title: "Başarılı", description: `${selectedFirma.firma_unvani} ziyaret planına eklendi` });
      setZiyaretDialogOpen(false);
      setZiyaretTarih(undefined);
      setZiyaretNotlar("");
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    } finally {
      setZiyaretSaving(false);
    }
  };

  const handleRemovePortfolyo = async (firma: FirmaItem) => {
    try {
      await callApi("remove-portfolyo", { token, firmaId: firma.id });
      toast({ title: "Başarılı", description: `${firma.firma_unvani} portföyünüzden çıkarıldı` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const result = await callApi("impersonate", { token, userId });
      if (result.access_token && result.refresh_token) {
        await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
        window.open("/dashboard", "_blank");
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Giriş yapılamadı", variant: "destructive" });
    }
  };

  const openSevkDialog = async (firma: FirmaItem) => {
    setSevkSelectedFirma(firma);
    setSevkTargetId("");
    setSevkDialogOpen(true);
    try {
      const data = await callApi("list-admin-users", { token });
      const others = (data.users || []).filter((u: any) => u.id !== adminUser?.id);
      setSevkAdminList(others);
    } catch {
      setSevkAdminList([]);
    }
  };

  const handleSevk = async () => {
    if (!sevkSelectedFirma || !sevkTargetId) return;
    setSevkSaving(true);
    try {
      await callApi("transfer-portfolyo", { token, firmaIds: [sevkSelectedFirma.id], targetAdminId: sevkTargetId });
      const target = sevkAdminList.find(a => a.id === sevkTargetId);
      toast({ title: "Başarılı", description: `${sevkSelectedFirma.firma_unvani} → ${target?.ad} ${target?.soyad} sevk edildi` });
      setSevkDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Sevk başarısız", variant: "destructive" });
    } finally {
      setSevkSaving(false);
    }
  };

  // Portfolio filtering is now done server-side via filterPortfolyo param
  const filtered = allFirmalar.filter(f => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!f.firma_unvani.toLowerCase().includes(term) &&
          !(f.profile?.ad + " " + f.profile?.soyad).toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === "desc") setSortDir("asc");
      else { setSortField(null); setSortDir("desc"); }
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-amber-500" /> : <ArrowDown className="w-3 h-3 text-amber-500" />;
  };

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "firma_unvani") return dir * a.firma_unvani.localeCompare(b.firma_unvani, "tr");
    if (sortField === "created_at") return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortField === "last_seen") {
      const aT = a.profile?.last_seen ? new Date(a.profile.last_seen).getTime() : 0;
      const bT = b.profile?.last_seen ? new Date(b.profile.last_seen).getTime() : 0;
      return dir * (aT - bT);
    }
    return dir * ((a as any)[sortField] - (b as any)[sortField]);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFirmalar = sorted.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  return (
    <AdminLayout title="Portföyüm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
              <Input
                placeholder="Firma veya yetkili ara..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9 w-64 h-9 text-sm"
                style={s.input}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2" style={{ background: "hsl(var(--admin-hover))" }}>
              <Briefcase className="w-3.5 h-3.5" style={{ color: "hsl(38 92% 50%)" }} />
              <span style={s.text}>{allFirmalar.length} firma</span>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : paginatedFirmalar.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={s.card}>
            <Briefcase className="w-10 h-10 mx-auto mb-3" style={s.muted} />
            <p className="text-sm" style={s.muted}>
              {searchTerm ? "Aramanızla eşleşen firma bulunamadı" : "Portföyünüzde henüz firma bulunmuyor"}
            </p>
            <p className="text-xs mt-1" style={s.muted}>
              Firmalar sayfasından firma ekleyebilirsiniz
            </p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={s.card}>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "hsl(var(--admin-border))" }}>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("firma_unvani")}>
                    <span className="flex items-center gap-1 text-xs" style={s.muted}>Firma <SortIcon field="firma_unvani" /></span>
                  </TableHead>
                  <TableHead><span className="text-xs" style={s.muted}>Durum</span></TableHead>
                  <TableHead><span className="text-xs" style={s.muted}>Tür / Tip</span></TableHead>
                  <TableHead><span className="text-xs" style={s.muted}>Paket</span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("ihale_sayisi")}>
                    <span className="flex items-center gap-1 text-xs" style={s.muted}>İhale <SortIcon field="ihale_sayisi" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("teklif_sayisi")}>
                    <span className="flex items-center gap-1 text-xs" style={s.muted}>Teklif <SortIcon field="teklif_sayisi" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("urun_sayisi")}>
                    <span className="flex items-center gap-1 text-xs" style={s.muted}>Ürün <SortIcon field="urun_sayisi" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("profil_doluluk")}>
                    <span className="flex items-center gap-1 text-xs" style={s.muted}>Profil <SortIcon field="profil_doluluk" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                    <span className="flex items-center gap-1 text-xs" style={s.muted}>Kayıt <SortIcon field="created_at" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("last_seen")}>
                    <span className="flex items-center gap-1 text-xs" style={s.muted}>Son Hareket <SortIcon field="last_seen" /></span>
                  </TableHead>
                  <TableHead className="w-10 sticky-action-col" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFirmalar.map((firma) => {
                  const isOnline = firma.profile?.last_seen && new Date(firma.profile.last_seen) >= new Date(Date.now() - 15 * 60 * 1000);
                  const isExpanded = expandedFirmaId === firma.id;
                  return (
                    <Fragment key={firma.id}>
                    <TableRow
                      className={`transition-colors cursor-pointer ${isExpanded ? "border-b-0" : ""}`}
                      style={{ borderColor: "hsl(var(--admin-border))" }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('[role="menuitem"]')) return;
                        toggleExpandFirma(firma.id);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: "hsl(var(--admin-hover))" }}>
                            {firma.logo_url ? (
                              <img src={firma.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5" style={s.muted} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate max-w-[180px]" style={s.text}>{firma.firma_unvani}</span>
                              {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                              {firma.belge_onayli && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                              {isExpanded ? <ChevronUp className="w-3 h-3 flex-shrink-0" style={s.muted} /> : <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-30" style={s.muted} />}
                            </div>
                            <span className="text-[11px] truncate block max-w-[180px]" style={s.muted}>
                              {firma.profile?.ad} {firma.profile?.soyad}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{durumBadge(firma.onay_durumu)}</TableCell>
                      <TableCell>
                        <div className="text-xs" style={s.secondary}>
                          <div className="truncate max-w-[120px]">{firma.firma_turu_name || "—"}</div>
                          <div className="truncate max-w-[120px] text-[10px]" style={s.muted}>{firma.firma_tipi_name || "—"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="text-[10px] px-1.5 py-0"
                          style={{
                            background: firma.abonelik?.paket_slug === "pro" ? "rgba(234,179,8,0.15)" : "rgba(100,116,139,0.15)",
                            color: firma.abonelik?.paket_slug === "pro" ? "#eab308" : "#94a3b8",
                            borderColor: firma.abonelik?.paket_slug === "pro" ? "rgba(234,179,8,0.3)" : "rgba(100,116,139,0.3)",
                          }}
                        >
                          {firma.abonelik?.paket_ad || "Yok"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium" style={{ color: getValueColor(firma.ihale_sayisi) }}>{firma.ihale_sayisi}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium" style={{ color: getValueColor(firma.teklif_sayisi) }}>{firma.teklif_sayisi}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium" style={{ color: getValueColor(firma.urun_sayisi) }}>{firma.urun_sayisi}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium" style={{ color: getValueColor(firma.profil_doluluk) }}>{firma.profil_doluluk}%</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs" style={s.muted}>{formatDate(firma.created_at)}</span>
                      </TableCell>
                      <TableCell>
                        {firma.profile?.last_seen ? (
                          <span className="text-xs" style={s.muted}>{formatRelativeTime(firma.profile.last_seen)}</span>
                        ) : (
                          <span className="text-xs opacity-40" style={s.muted}>—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()} className="sticky-action-col">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-4 h-4" style={s.muted} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" style={s.card} className="min-w-[160px]">
                            {hasPermission("portfolyo_aksiyon_ekle") && (
                              <DropdownMenuItem onClick={() => { setSelectedFirma(firma); setAksiyonEkleOpen(true); }} className="text-xs cursor-pointer">
                                <Plus className="w-3.5 h-3.5 mr-2" /> Aksiyon Ekle
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { setSelectedFirma(firma); setAksiyonlarOpen(true); }} className="text-xs cursor-pointer">
                              <ClipboardList className="w-3.5 h-3.5 mr-2" /> Aksiyonları Gör
                            </DropdownMenuItem>
                            {hasPermission("portfolyo_yetkili_yonet") && (
                              <DropdownMenuItem onClick={() => { setSelectedFirma(firma); setYetkililerOpen(true); }} className="text-xs cursor-pointer">
                                <Users className="w-3.5 h-3.5 mr-2" /> Yetkili Kişiler
                              </DropdownMenuItem>
                            )}
                            {hasPermission("portfolyo_ziyaret_ekle") && (
                              <DropdownMenuItem onClick={() => { setSelectedFirma(firma); setZiyaretTarih(undefined); setZiyaretNotlar(""); setZiyaretDialogOpen(true); }} className="text-xs cursor-pointer">
                                <MapPin className="w-3.5 h-3.5 mr-2" /> Ziyaret Planıma Ekle
                              </DropdownMenuItem>
                            )}
                            {hasPermission("portfolyo_sevk") && (
                              <DropdownMenuItem onClick={() => openSevkDialog(firma)} className="text-xs cursor-pointer">
                                <Send className="w-3.5 h-3.5 mr-2" /> Portföyü Sevk Et
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator style={{ background: "hsl(var(--admin-border))" }} />
                            <DropdownMenuItem onClick={() => handleImpersonate(firma.user_id)} className="text-xs cursor-pointer">
                              <ExternalLink className="w-3.5 h-3.5 mr-2" /> Yönet (Giriş)
                            </DropdownMenuItem>
                            {hasPermission("portfolyo_cikar") && (!firma.portfolyo?.atanmis || adminUser?.departman === "Yönetim Kurulu" || adminUser?.is_primary) && (
                              <>
                                <DropdownMenuSeparator style={{ background: "hsl(var(--admin-border))" }} />
                                <DropdownMenuItem onClick={() => handleRemovePortfolyo(firma)} className="text-xs cursor-pointer text-red-500 focus:text-red-500">
                                  <Briefcase className="w-3.5 h-3.5 mr-2" /> Portföyden Çıkar
                                </DropdownMenuItem>
                              </>
                            )}
                            {firma.portfolyo?.atanmis && adminUser?.departman !== "Yönetim Kurulu" && !adminUser?.is_primary && (
                              <>
                                <DropdownMenuSeparator style={{ background: "hsl(var(--admin-border))" }} />
                                <DropdownMenuItem disabled className="text-xs opacity-50">
                                  <Briefcase className="w-3.5 h-3.5 mr-2" /> Yönetim tarafından atandı
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {/* Expanded aksiyon geçmişi */}
                    {isExpanded && (
                      <TableRow style={{ borderColor: "hsl(var(--admin-border))" }}>
                        <TableCell colSpan={11} className="p-0">
                          <div className="px-4 py-3" style={{ background: "hsl(var(--admin-hover))" }}>
                            <div className="flex items-center gap-2 mb-2">
                              <ClipboardList className="w-3.5 h-3.5" style={{ color: "hsl(38 92% 50%)" }} />
                              <span className="text-xs font-semibold" style={s.text}>Aksiyon Geçmişi</span>
                              <span className="text-[10px]" style={s.muted}>({expandedAksiyonlar.length})</span>
                            </div>
                            {expandedLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                              </div>
                            ) : expandedAksiyonlar.length === 0 ? (
                              <p className="text-xs py-3 text-center" style={s.muted}>Bu firmaya ait aksiyon bulunamadı</p>
                            ) : (
                              <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                                {expandedAksiyonlar.map((a: any) => {
                                  const turConfig = TUR_CONFIG[a.tur] || TUR_CONFIG.diger;
                                  const Icon = turConfig.icon;
                                  return (
                                    <div key={a.id} className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:brightness-95 transition-all" style={{ background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))" }} onClick={() => setDetayAksiyon(a)}>
                                      <div className="mt-0.5 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${turConfig.color}15`, width: 18, height: 18 }}>
                                        <Icon className="w-2.5 h-2.5" style={{ color: turConfig.color }} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium truncate" style={s.text}>{a.baslik}</span>
                                          <Badge className="text-[8px] px-1 py-0 flex-shrink-0" style={{ background: `${turConfig.color}20`, color: turConfig.color, borderColor: `${turConfig.color}40` }}>{turConfig.label}</Badge>
                                          <span className="text-[10px] ml-auto flex-shrink-0" style={s.muted}>
                                            {new Date(a.tarih).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} {new Date(a.tarih).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                        </div>
                                        {a.aciklama && <p className="text-[11px] mt-0.5 line-clamp-1" style={s.muted}>{a.aciklama}</p>}
                                        {a.admin_ad && <span className="text-[10px]" style={s.muted}>— {a.admin_ad}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs" style={s.muted}>{sorted.length} firma, sayfa {safePage}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}
                style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }} className="text-xs h-7">←</Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  typeof p === "string" ? (
                    <span key={`e-${idx}`} className="px-1 text-xs" style={s.muted}>…</span>
                  ) : (
                    <Button key={p} size="sm" variant={p === safePage ? "default" : "outline"}
                      onClick={() => setCurrentPage(p as number)}
                      className={p === safePage ? "bg-amber-500 hover:bg-amber-600 text-white text-xs w-7 h-7 p-0" : "text-xs w-7 h-7 p-0"}
                      style={p !== safePage ? { borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" } : undefined}>
                      {p}
                    </Button>
                  )
                )}
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}
                style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }} className="text-xs h-7">→</Button>
            </div>
          </div>
        )}

        {/* Aksiyon Dialogs */}
        {selectedFirma && token && (
          <>
            <AksiyonEkleDialog
              open={aksiyonEkleOpen}
              onOpenChange={(o) => { setAksiyonEkleOpen(o); if (!o) setEditAksiyon(null); }}
              firmaId={selectedFirma.id}
              firmaUnvani={selectedFirma.firma_unvani}
              callApi={callApi}
              token={token}
              onSuccess={() => { toast({ title: "Başarılı", description: editAksiyon ? "Aksiyon güncellendi" : "Aksiyon eklendi" }); setEditAksiyon(null); }}
              adminDepartman={adminUser?.departman || "Yönetim Kurulu"}
              adminIsPrimary={adminUser?.is_primary || false}
              editData={editAksiyon}
            />
            <FirmaAksiyonlarDialog
              open={aksiyonlarOpen}
              onOpenChange={setAksiyonlarOpen}
              firmaId={selectedFirma.id}
              firmaUnvani={selectedFirma.firma_unvani}
              callApi={callApi}
              token={token}
              onAddClick={() => { setAksiyonlarOpen(false); setEditAksiyon(null); setAksiyonEkleOpen(true); }}
              onEditClick={(a) => { setAksiyonlarOpen(false); setEditAksiyon(a); setAksiyonEkleOpen(true); }}
              currentAdminId={adminUser?.id}
              isPrimary={adminUser?.is_primary || false}
            />
            <FirmaYetkililerDialog
              open={yetkililerOpen}
              onOpenChange={setYetkililerOpen}
              firmaId={selectedFirma.id}
              firmaUnvani={selectedFirma.firma_unvani}
              callApi={callApi}
              token={token}
            />
          </>
        )}
        <AksiyonDetayDialog open={!!detayAksiyon} onOpenChange={(o) => !o && setDetayAksiyon(null)} aksiyon={detayAksiyon} />

        {/* Ziyaret Planı Dialog */}
        <Dialog open={ziyaretDialogOpen} onOpenChange={setZiyaretDialogOpen}>
          <DialogContent style={s.card} className="max-w-sm">
            <DialogHeader>
              <DialogTitle style={s.text}>Ziyaret Planı Ekle</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs" style={s.muted}>{selectedFirma?.firma_unvani}</p>
              <div>
                <label className="text-xs font-medium mb-1 block" style={s.text}>Ziyaret Tarihi *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-sm", !ziyaretTarih && "text-muted-foreground")}
                      style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))", background: "hsl(var(--admin-input-bg))" }}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {ziyaretTarih ? format(ziyaretTarih, "d MMMM yyyy", { locale: tr }) : "Tarih seçin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 9999 }}>
                    <Calendar mode="single" selected={ziyaretTarih} onSelect={setZiyaretTarih} className={cn("p-3 pointer-events-auto")} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={s.text}>Notlar</label>
                <Textarea value={ziyaretNotlar} onChange={e => setZiyaretNotlar(e.target.value)} placeholder="Ziyaret ile ilgili notlar..." rows={3} style={s.input} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setZiyaretDialogOpen(false)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>İptal</Button>
              <Button size="sm" onClick={handleAddZiyaret} disabled={!ziyaretTarih || ziyaretSaving} className="bg-amber-500 hover:bg-amber-600 text-white">
                {ziyaretSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ekle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sevk Dialog */}
        <Dialog open={sevkDialogOpen} onOpenChange={setSevkDialogOpen}>
          <DialogContent style={s.card} className="max-w-sm">
            <DialogHeader>
              <DialogTitle style={s.text}>Portföyü Sevk Et</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs" style={s.muted}>{sevkSelectedFirma?.firma_unvani}</p>
              <div>
                <label className="text-xs font-medium mb-1 block" style={s.text}>Hedef Personel *</label>
                <select
                  value={sevkTargetId}
                  onChange={e => setSevkTargetId(e.target.value)}
                  className="w-full h-10 rounded-md border px-3 text-sm"
                  style={{ ...s.input, background: "hsl(var(--admin-input-bg))" }}
                >
                  <option value="">Personel seçin</option>
                  {sevkAdminList.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.ad} {a.soyad} — {a.departman} / {a.pozisyon}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSevkDialogOpen(false)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>İptal</Button>
              <Button size="sm" onClick={handleSevk} disabled={!sevkTargetId || sevkSaving} className="bg-amber-500 hover:bg-amber-600 text-white">
                {sevkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sevk Et"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}