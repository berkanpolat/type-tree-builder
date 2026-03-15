import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sortFirmaTurleri } from "@/lib/sort-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Users, Clock, AlertCircle, CheckCircle, XCircle,
  Search, Filter, ExternalLink, Gavel, FileText, Package, ShieldAlert, HeadphonesIcon, RotateCcw, TrendingUp,
  CreditCard, Wifi, ArrowUpDown, ArrowUp, ArrowDown, Infinity, Eye, MessageSquare, Loader2, Trash2, ShieldCheck, Download,
  MoreHorizontal, CheckCheck, ChevronDown, Briefcase,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
  belge_onayli?: boolean;
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
  portfolyo: {
    admin_id: string;
    admin_ad: string;
    admin_soyad: string;
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

type SortField = "firma_unvani" | "ihale_sayisi" | "teklif_sayisi" | "urun_sayisi" | "profil_doluluk" | "created_at" | "last_seen";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

export default function AdminFirmalarV2() {
  const { token, hasPermission, user: adminUser } = useAdminAuth();
  const { toast } = useToast();
  const [firmalar, setFirmalar] = useState<FirmaItem[]>([]);
  const [stats, setStats] = useState<FirmaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statsDays, setStatsDays] = useState(7);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk action states
  const [bulkAction, setBulkAction] = useState<"delete" | "approve" | "verify" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState("");

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
  const [filterPaket, setFilterPaket] = useState<string>("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Stat card filter
  type StatCardFilter = "total" | "pending" | "recent" | "online" | "yeniAbone" | null;
  const [activeStatCard, setActiveStatCard] = useState<StatCardFilter>(null);
  const [abonePeriod, setAbonePeriod] = useState<"son24saat" | "sonBirHafta" | "sonBirAy">("sonBirHafta");

  const [turler, setTurler] = useState<{ id: string; name: string }[]>([]);
  const [tipler, setTipler] = useState<{ id: string; name: string; firma_turu_id: string }[]>([]);
  const [iller, setIller] = useState<{ id: string; name: string }[]>([]);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDetail, setReviewDetail] = useState<FirmaDetail | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Package management
  const [paketDialogOpen, setPaketDialogOpen] = useState(false);
  const [paketDialogFirma, setPaketDialogFirma] = useState<FirmaItem | null>(null);
  const [paketDialogLoading, setPaketDialogLoading] = useState(false);
  const [paketDialogQuota, setPaketDialogQuota] = useState<any>(null);
  const [allPaketler, setAllPaketler] = useState<any[]>([]);
  const [selectedPaketId, setSelectedPaketId] = useState<string>("");
  const [selectedPeriyot, setSelectedPeriyot] = useState<string>("sinursiz");
  const [paketSaving, setPaketSaving] = useState(false);
  const [ekstraHaklar, setEkstraHaklar] = useState<Record<string, number>>({});
  const [ekstraSaving, setEkstraSaving] = useState(false);

  // Delete firma
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteFirma, setDeleteFirma] = useState<FirmaItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Belge doğrulama
  const [belgeDialogOpen, setBelgeDialogOpen] = useState(false);
  const [belgeDialogFirma, setBelgeDialogFirma] = useState<FirmaItem | null>(null);
  const [belgeDialogLoading, setBelgeDialogLoading] = useState(false);
  const [belgeler, setBelgeler] = useState<any[]>([]);
  const [belgeActionLoading, setBelgeActionLoading] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

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
      const dropdownData = await callApi("get-dropdown-options", { token });
      setTurler(dropdownData.turler || []);
      setTipler((dropdownData.tipler || []) as any);
      const ilKatId = await getIlKategoriId();
      const { data: il } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", ilKatId).order("name");
      setIller(il || []);
    } catch {
      const ilKatId = await getIlKategoriId();
      const [{ data: t }, { data: tp }, { data: il }] = await Promise.all([
        supabase.from("firma_turleri").select("id, name").order("name"),
        supabase.from("firma_tipleri").select("id, name, firma_turu_id").order("name"),
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", ilKatId).order("name"),
      ]);
      setTurler(sortFirmaTurleri(t || []));
      setTipler((tp || []) as any);
      setIller(il || []);
    }
  }, [token, callApi]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);

  // ── Single actions ──
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
        await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
        window.open("/dashboard", "_blank");
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Giriş yapılamadı", variant: "destructive" });
    }
  };

  const openPaketDialog = async (firma: FirmaItem) => {
    setPaketDialogFirma(firma);
    setPaketDialogOpen(true);
    setPaketDialogLoading(true);
    setSelectedPaketId(firma.abonelik?.paket_id || "");
    setSelectedPeriyot(firma.abonelik?.periyot || "sinursiz");
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
      const res = await callApi("update-firma-paket", { token, userId: paketDialogFirma.user_id, paketId: selectedPaketId, ekstraHaklar, periyot: selectedPeriyot });
      if (res.error) throw new Error(res.error);

      const secilenPaket = allPaketler.find((p: any) => p.id === selectedPaketId);
      const nowIso = new Date().toISOString();

      setFirmalar((prev) =>
        prev.map((f) =>
          f.user_id === paketDialogFirma.user_id
            ? {
                ...f,
                abonelik: {
                  paket_id: selectedPaketId,
                  paket_ad: secilenPaket?.ad || "—",
                  paket_slug: secilenPaket?.slug || "",
                  periyot: selectedPeriyot || "sinursiz",
                  donem_baslangic: nowIso,
                  donem_bitis: f.abonelik?.donem_bitis || nowIso,
                  durum: "aktif",
                  limits: f.abonelik?.limits || null,
                },
              }
            : f,
        ),
      );

      setPaketDialogQuota((prev: any) =>
        prev
          ? {
              ...prev,
              abonelik: {
                ...prev.abonelik,
                paket_ad: secilenPaket?.ad || prev.abonelik?.paket_ad,
                paket_slug: secilenPaket?.slug || prev.abonelik?.paket_slug,
                periyot: selectedPeriyot || prev.abonelik?.periyot || "sinursiz",
              },
            }
          : prev,
      );

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
      const quotaRes = await callApi("get-firma-quota", { token, userId: paketDialogFirma.user_id });
      setPaketDialogQuota(quotaRes);
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message, variant: "destructive" });
    } finally {
      setEkstraSaving(false);
    }
  };

  const handleDeleteFirma = async () => {
    if (!deleteFirma || deleteConfirmText !== deleteFirma.firma_unvani) return;
    setDeleteLoading(true);
    try {
      await callApi("delete-firma", { token, firmaId: deleteFirma.id });
      toast({ title: "Başarılı", description: `${deleteFirma.firma_unvani} silindi.` });
      setDeleteDialogOpen(false);
      setDeleteFirma(null);
      setDeleteConfirmText("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Silme işlemi başarısız", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const openBelgeDialog = async (firma: FirmaItem) => {
    setBelgeDialogFirma(firma);
    setBelgeDialogOpen(true);
    setBelgeDialogLoading(true);
    setRejectReasons({});
    try {
      const result = await callApi("get-firma-belgeler", { token, firmaId: firma.id });
      setBelgeler(result.belgeler || []);
    } catch {
      toast({ title: "Hata", description: "Belgeler yüklenemedi", variant: "destructive" });
    } finally {
      setBelgeDialogLoading(false);
    }
  };

  const handleBelgeAction = async (belgeId: string, durum: string) => {
    setBelgeActionLoading(belgeId);
    try {
      await callApi("update-belge-status", {
        token, belgeId, durum,
        karar_sebebi: durum === "reddedildi" ? (rejectReasons[belgeId] || "Belge uygun değil") : null,
      });
      toast({ title: "Başarılı", description: durum === "onaylandi" ? "Belge onaylandı" : "Belge reddedildi" });
      const result = await callApi("get-firma-belgeler", { token, firmaId: belgeDialogFirma!.id });
      setBelgeler(result.belgeler || []);
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    } finally {
      setBelgeActionLoading(null);
    }
  };

  const handleDownloadBelge = async (dosyaUrl: string, dosyaAdi: string) => {
    try {
      const result = await callApi("get-belge-url", { token, dosyaUrl });
      const a = document.createElement("a");
      a.href = result.url;
      a.download = dosyaAdi;
      a.target = "_blank";
      a.click();
    } catch {
      toast({ title: "Hata", description: "Dosya indirilemedi", variant: "destructive" });
    }
  };

  const handleAddPortfolyo = async (firma: FirmaItem) => {
    try {
      await callApi("add-portfolyo", { token, firmaId: firma.id });
      toast({ title: "Başarılı", description: `${firma.firma_unvani} portföyünüze eklendi` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
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

  // ── Bulk actions ──
  const handleBulkApprove = async () => {
    setBulkLoading(true);
    let success = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        await callApi("approve-firma", { token, firmaId: id });
        success++;
      } catch {
        fail++;
      }
    }
    toast({ title: "Toplu Onay", description: `${success} firma onaylandı${fail > 0 ? `, ${fail} başarısız` : ""}` });
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkLoading(false);
    fetchData();
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteConfirm !== "SİL") return;
    setBulkLoading(true);
    let success = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        await callApi("delete-firma", { token, firmaId: id });
        success++;
      } catch {
        fail++;
      }
    }
    toast({ title: "Toplu Silme", description: `${success} firma silindi${fail > 0 ? `, ${fail} başarısız` : ""}` });
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkDeleteConfirm("");
    setBulkLoading(false);
    fetchData();
  };

  const handleBulkVerify = async () => {
    setBulkLoading(true);
    let success = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        await callApi("set-belge-onayli", { token, firmaId: id, belge_onayli: true });
        success++;
      } catch {
        fail++;
      }
    }
    toast({ title: "Toplu Doğrulama", description: `${success} firma doğrulandı${fail > 0 ? `, ${fail} başarısız` : ""}` });
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkLoading(false);
    fetchData();
  };

  // ── Filters ──
  const clearFilters = () => {
    setFilterTuru("all"); setFilterTipi("all"); setFilterIl("all"); setFilterDurum("all"); setFilterPaket("all");
    setSearchTerm(""); setSortField(null); setActiveStatCard(null);
  };

  const handleStatCardClick = (card: StatCardFilter) => {
    if (activeStatCard === card) setActiveStatCard(null);
    else setActiveStatCard(card);
    clearFilters();
  };

  const hasActiveFilters = filterTuru !== "all" || filterTipi !== "all" || filterIl !== "all" || filterDurum !== "all" || filterPaket !== "all" || searchTerm || activeStatCard;

  const filtered = firmalar.filter((f) => {
    if (activeStatCard === "pending" && f.onay_durumu !== "onay_bekliyor") return false;
    if (activeStatCard === "recent") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - statsDays);
      if (new Date(f.created_at) < cutoff) return false;
    }
    if (activeStatCard === "online") {
      if (!f.profile?.last_seen) return false;
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (new Date(f.profile.last_seen) < fifteenMinAgo) return false;
    }
    if (activeStatCard === "yeniAbone") {
      if (!f.abonelik) return false;
      const cutoff = new Date();
      if (abonePeriod === "son24saat") cutoff.setDate(cutoff.getDate() - 1);
      else if (abonePeriod === "sonBirHafta") cutoff.setDate(cutoff.getDate() - 7);
      else cutoff.setMonth(cutoff.getMonth() - 1);
      if (new Date(f.abonelik.donem_baslangic) < cutoff) return false;
    }
    if (searchTerm && !f.firma_unvani.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterTuru !== "all" && f.firma_turu_id !== filterTuru) return false;
    if (filterTipi !== "all" && f.firma_tipi_id !== filterTipi) return false;
    if (filterIl !== "all" && f.kurulus_il_id !== filterIl) return false;
    if (filterDurum !== "all" && f.onay_durumu !== filterDurum) return false;
    if (filterPaket !== "all") {
      if (filterPaket === "none" && f.abonelik) return false;
      if (filterPaket !== "none" && f.abonelik?.paket_id !== filterPaket) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  if (sortField) {
    sorted.sort((a, b) => {
      if (sortField === "firma_unvani") {
        return sortDir === "asc" ? a.firma_unvani.localeCompare(b.firma_unvani, "tr") : b.firma_unvani.localeCompare(a.firma_unvani, "tr");
      }
      if (sortField === "created_at") {
        return sortDir === "asc" ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime() : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortField === "last_seen") {
        const aTime = a.profile?.last_seen ? new Date(a.profile.last_seen).getTime() : 0;
        const bTime = b.profile?.last_seen ? new Date(b.profile.last_seen).getTime() : 0;
        return sortDir === "asc" ? aTime - bTime : bTime - aTime;
      }
      const av = (a as any)[sortField];
      const bv = (b as any)[sortField];
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFirmalar = sorted.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterTuru, filterTipi, filterIl, filterDurum, filterPaket, sortField, sortDir, activeStatCard]);

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
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "desc" ? <ArrowDown className="w-3 h-3 text-amber-500" /> : <ArrowUp className="w-3 h-3 text-amber-500" />;
  };

  const durumBadge = (durum: string) => {
    switch (durum) {
      case "onaylandi": return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px] px-1.5 py-0">Onaylı</Badge>;
      case "onay_bekliyor": return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0">Bekliyor</Badge>;
      case "onaysiz": return <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px] px-1.5 py-0">Reddedildi</Badge>;
      default: return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{durum}</Badge>;
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });

  const formatRelativeTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Şimdi";
    if (mins < 60) return `${mins}dk`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}sa`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}g`;
    return formatDate(d);
  };

  // Selection helpers
  const allPageSelected = paginatedFirmalar.length > 0 && paginatedFirmalar.every(f => selectedIds.has(f.id));
  const somePageSelected = paginatedFirmalar.some(f => selectedIds.has(f.id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedIds);
      paginatedFirmalar.forEach(f => next.delete(f.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginatedFirmalar.forEach(f => next.add(f.id));
      setSelectedIds(next);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const BELGE_LABELS: Record<string, string> = {
    vergi_levhasi: "Vergi Levhası",
    ticaret_sicil: "Ticaret Sicil Gazetesi",
    imza_sirkusu: "İmza Sirküsü",
  };

  const handleCreateFirma = async () => {
    if (!yeniFirma.email || !yeniFirma.password || !yeniFirma.ad || !yeniFirma.soyad || !yeniFirma.firma_unvani || !yeniFirma.vergi_numarasi || !yeniFirma.vergi_dairesi || !yeniFirma.firma_turu_id || !yeniFirma.firma_tipi_id) {
      toast({ title: "Hata", description: "Zorunlu alanları doldurun", variant: "destructive" });
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

  const selectedCount = selectedIds.size;

  return (
    <AdminLayout title="Firmalar">
      <div className="space-y-4">
        {/* Action Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs" style={s.muted}>
            <Badge variant="secondary" className="text-[10px]">V2 TEST</Badge>
            {stats && <span>{stats.total} firma kayıtlı</span>}
          </div>
          <Button onClick={() => setYeniFirmaOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white" size="sm">
            <Building2 className="w-4 h-4 mr-2" /> Yeni Firma
          </Button>
        </div>

        {/* Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard icon={Building2} label="Toplam" value={stats.total} color="text-blue-400" active={activeStatCard === "total"} onClick={() => handleStatCardClick("total")} />
            <StatCard icon={AlertCircle} label="Bekleyen" value={stats.pending} color="text-amber-400" active={activeStatCard === "pending"} onClick={() => handleStatCardClick("pending")} />
            <StatCard icon={Clock} label={statsDays === 1 ? "Son 24s" : `Son ${statsDays}g`} value={stats.recent} color="text-purple-400" active={activeStatCard === "recent"} onClick={() => handleStatCardClick("recent")} />
            <StatCard icon={Wifi} label="Çevrimiçi" value={stats.onlineCount} color="text-green-400" active={activeStatCard === "online"} onClick={() => handleStatCardClick("online")} />
            <StatCard icon={CreditCard} label="Yeni Abone" value={stats.yeniAboneler[abonePeriod]} color="text-amber-400" active={activeStatCard === "yeniAbone"} onClick={() => handleStatCardClick("yeniAbone")} />
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
            <Input placeholder="Firma adı ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9 text-sm" style={s.input} />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" }}>
            <Filter className="w-4 h-4 mr-1.5" /> Filtreler
            {hasActiveFilters && <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-500" />}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="text-red-500 hover:text-red-600 text-xs px-2" size="sm">
              <RotateCcw className="w-3 h-3 mr-1" /> Temizle
            </Button>
          )}
        </div>

        {showFilters && (
          <div style={s.card} className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <FilterSelect label="Durum" value={filterDurum} onChange={setFilterDurum}
              options={[{ value: "all", label: "Tümü" }, { value: "onay_bekliyor", label: "Bekliyor" }, { value: "onaylandi", label: "Onaylı" }, { value: "onaysiz", label: "Reddedildi" }]} />
            <FilterSelect label="Firma Türü" value={filterTuru} onChange={setFilterTuru}
              options={[{ value: "all", label: "Tümü" }, ...turler.map(t => ({ value: t.id, label: t.name }))]} />
            <FilterSelect label="Firma Tipi" value={filterTipi} onChange={setFilterTipi}
              options={[{ value: "all", label: "Tümü" }, ...tipler.filter(tp => filterTuru === "all" || tp.firma_turu_id === filterTuru).map(tp => ({ value: tp.id, label: tp.name }))]} />
            <FilterSelect label="İl" value={filterIl} onChange={setFilterIl}
              options={[{ value: "all", label: "Tümü" }, ...iller.map(il => ({ value: il.id, label: il.name }))]} />
            <FilterSelect label="Paket" value={filterPaket} onChange={setFilterPaket}
              options={[{ value: "all", label: "Tümü" }, { value: "none", label: "Paket Yok" }, ...(stats?.paketDagilimi || []).map(p => ({ value: p.id, label: p.ad }))]} />
          </div>
        )}

        {/* Bulk Action Toolbar */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: "hsl(var(--admin-hover))", border: "1px solid hsl(var(--admin-border))" }}>
            <CheckCheck className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium" style={s.text}>{selectedCount} firma seçildi</span>
            <div className="flex items-center gap-2 ml-auto">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7" onClick={() => setBulkAction("approve")}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Toplu Onayla
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7" onClick={() => setBulkAction("verify")}>
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Toplu Doğrula
              </Button>
              <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs h-7" onClick={() => setBulkAction("delete")} style={{ borderColor: "hsl(var(--admin-border))" }}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Toplu Sil
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" style={s.muted} onClick={() => setSelectedIds(new Set())}>
                Seçimi Kaldır
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12" style={s.muted}>Firma bulunamadı.</div>
        ) : (
          <div style={s.card} className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "hsl(var(--admin-border))" }}>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPageSelected}
                      // @ts-ignore
                      indeterminate={somePageSelected && !allPageSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
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
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFirmalar.map((firma) => {
                  const isSelected = selectedIds.has(firma.id);
                  const isOnline = firma.profile?.last_seen && new Date(firma.profile.last_seen) >= new Date(Date.now() - 15 * 60 * 1000);
                  return (
                    <TableRow
                      key={firma.id}
                      className={`transition-colors ${isSelected ? "bg-amber-500/5" : ""}`}
                      style={{ borderColor: "hsl(var(--admin-border))" }}
                    >
                      <TableCell>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(firma.id)} />
                      </TableCell>
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
                            </div>
                            <span className="text-[11px] truncate block max-w-[180px]" style={s.muted}>
                              {firma.profile?.ad} {firma.profile?.soyad}
                            </span>
                            {firma.portfolyo && (
                              <span className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: "hsl(38 92% 50%)" }}>
                                <Briefcase className="w-3 h-3" /> {firma.portfolyo.admin_ad} {firma.portfolyo.admin_soyad}
                              </span>
                            )}
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
                          className="text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80"
                          style={{
                            background: firma.abonelik?.paket_slug === "pro" ? "rgba(234,179,8,0.15)" : "rgba(100,116,139,0.15)",
                            color: firma.abonelik?.paket_slug === "pro" ? "#eab308" : "#94a3b8",
                            borderColor: firma.abonelik?.paket_slug === "pro" ? "rgba(234,179,8,0.3)" : "rgba(100,116,139,0.3)",
                          }}
                          onClick={() => openPaketDialog(firma)}
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-4 h-4" style={s.muted} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" style={s.card} className="min-w-[160px]">
                            {firma.onay_durumu === "onay_bekliyor" && (
                              <DropdownMenuItem onClick={() => openReview(firma)} className="text-xs cursor-pointer">
                                <AlertCircle className="w-3.5 h-3.5 mr-2 text-amber-500" /> Değerlendir
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openBelgeDialog(firma)} className="text-xs cursor-pointer">
                              <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Doğrulama
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPaketDialog(firma)} className="text-xs cursor-pointer">
                              <CreditCard className="w-3.5 h-3.5 mr-2" /> Paket Yönet
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleImpersonate(firma.user_id)} className="text-xs cursor-pointer">
                              <ExternalLink className="w-3.5 h-3.5 mr-2" /> Yönet (Giriş)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator style={{ background: "hsl(var(--admin-border))" }} />
                            <DropdownMenuItem
                              onClick={() => { setDeleteFirma(firma); setDeleteConfirmText(""); setDeleteDialogOpen(true); }}
                              className="text-xs cursor-pointer text-red-500 focus:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
                      onClick={() => setCurrentPage(p)}
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
      </div>

      {/* ── Dialogs (same as original) ── */}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent style={s.card} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={s.text}>Başvuruyu Değerlendir</DialogTitle>
            <DialogDescription style={s.muted}>Firma kayıt bilgilerini inceleyin.</DialogDescription>
          </DialogHeader>
          {reviewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : reviewDetail ? (
            <div className="space-y-3">
              <InfoRow label="E-posta" value={reviewDetail.email} />
              <InfoRow label="Ad Soyad" value={`${reviewDetail.profile?.ad || ""} ${reviewDetail.profile?.soyad || ""}`} />
              <InfoRow label="Telefon" value={reviewDetail.profile?.iletisim_numarasi} />
              <div style={{ borderTop: "1px solid hsl(var(--admin-border))", paddingTop: "0.5rem" }} />
              <InfoRow label="Firma Ünvanı" value={reviewDetail.firma?.firma_unvani} />
              <InfoRow label="Firma Türü" value={reviewDetail.firma?.firma_turu_name} />
              <InfoRow label="Vergi No" value={reviewDetail.firma?.vergi_numarasi} />
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

      {/* Package Dialog */}
      <Dialog open={paketDialogOpen} onOpenChange={setPaketDialogOpen}>
        <DialogContent style={s.card} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={s.text}>Paket Yönetimi — {paketDialogFirma?.firma_unvani}</DialogTitle>
          </DialogHeader>
          {paketDialogLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs mb-2 block" style={s.muted}>Mevcut Paket</Label>
                <div className="p-3 rounded-lg flex items-center justify-between" style={{ background: "hsl(var(--admin-hover))" }}>
                  <span className="font-semibold text-sm" style={s.text}>{paketDialogQuota?.abonelik?.paket_ad || "Paket Yok"}</span>
                  {paketDialogFirma?.abonelik?.periyot && (
                    <Badge className="text-[10px]" style={{
                      background: paketDialogFirma.abonelik.periyot === "sinursiz" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)",
                      color: paketDialogFirma.abonelik.periyot === "sinursiz" ? "#22c55e" : "#eab308",
                      borderColor: paketDialogFirma.abonelik.periyot === "sinursiz" ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)",
                    }}>
                      {paketDialogFirma.abonelik.periyot === "sinursiz" ? "Sınırsız" : paketDialogFirma.abonelik.periyot === "yillik" ? "Yıllık" : "Aylık"}
                    </Badge>
                  )}
                </div>
              </div>
              {paketDialogQuota?.usage && paketDialogQuota?.abonelik?.limits && (
                <div>
                  <Label className="text-xs mb-2 block" style={s.muted}>Kalan Haklar</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <QuotaItem icon={Eye} label="Profil" used={paketDialogQuota.usage.profil_goruntuleme} limit={paketDialogQuota.abonelik.limits.profil_goruntuleme_limiti} />
                    <QuotaItem icon={Gavel} label="Teklif" used={paketDialogQuota.usage.teklif_verme} limit={paketDialogQuota.abonelik.limits.teklif_verme_limiti} />
                    <QuotaItem icon={Package} label="Ürün" used={paketDialogQuota.usage.aktif_urun} limit={paketDialogQuota.abonelik.limits.aktif_urun_limiti} />
                    <QuotaItem icon={MessageSquare} label="Mesaj" used={paketDialogQuota.usage.mesaj} limit={paketDialogQuota.abonelik.limits.mesaj_limiti} />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs mb-2 block" style={s.muted}>Ekstra Hak</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ key: "profil_goruntuleme", label: "Profil" }, { key: "teklif_verme", label: "Teklif" }, { key: "aktif_urun", label: "Ürün" }, { key: "mesaj", label: "Mesaj" }].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-[10px]" style={s.muted}>{label}</Label>
                      <Input type="number" min={0} placeholder="0" value={ekstraHaklar[key] || ""} onChange={(e) => setEkstraHaklar(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))} className="h-7 text-xs" style={s.input} />
                    </div>
                  ))}
                </div>
                <Button onClick={handleSaveEkstraHaklar} disabled={ekstraSaving} size="sm" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  {ekstraSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Ekstra Hakları Kaydet
                </Button>
              </div>
              <div>
                <Label className="text-xs mb-2 block" style={s.muted}>Paket Değiştir</Label>
                <Select value={selectedPaketId} onValueChange={setSelectedPaketId}>
                  <SelectTrigger style={s.input}><SelectValue placeholder="Paket seçin" /></SelectTrigger>
                  <SelectContent style={{ ...s.card, padding: "0.25rem", zIndex: 250 }}>
                    {allPaketler.map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.ad}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-2 block" style={s.muted}>Süre</Label>
                <div className="flex gap-2">
                  {[
                    { value: "aylik", label: "Aylık", color: "#94a3b8" },
                    { value: "yillik", label: "Yıllık", color: "#eab308" },
                    { value: "sinursiz", label: "Sınırsız", color: "#22c55e" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedPeriyot(opt.value)}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border"
                      style={{
                        background: selectedPeriyot === opt.value ? `${opt.color}15` : "hsl(var(--admin-input-bg))",
                        borderColor: selectedPeriyot === opt.value ? `${opt.color}50` : "hsl(var(--admin-border))",
                        color: selectedPeriyot === opt.value ? opt.color : "hsl(var(--admin-muted))",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPaketDialogOpen(false)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>İptal</Button>
            <Button onClick={handleChangePaket} disabled={paketSaving || !selectedPaketId} className="bg-amber-500 hover:bg-amber-600 text-white">
              {paketSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Paketi Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni Firma Dialog */}
      <Dialog open={yeniFirmaOpen} onOpenChange={setYeniFirmaOpen}>
        <DialogContent style={s.card} className="max-w-lg max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle style={s.text}>Yeni Firma Oluştur</DialogTitle>
            <DialogDescription style={s.muted}>E-posta onayı olmadan yeni firma hesabı oluşturun</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>E-posta *</Label>
                <Input value={yeniFirma.email} onChange={e => setYeniFirma(p => ({ ...p, email: e.target.value }))} style={s.input} className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Şifre *</Label>
                <Input type="password" value={yeniFirma.password} onChange={e => setYeniFirma(p => ({ ...p, password: e.target.value }))} style={s.input} className="text-xs h-8" />
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
                <Label className="text-xs" style={s.muted}>Vergi No *</Label>
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
                  <SelectContent style={{ ...s.card, padding: "0.25rem", zIndex: 9999 }} position="popper" className="max-h-60">
                    {turler.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={s.muted}>Firma Tipi *</Label>
                <Select value={yeniFirma.firma_tipi_id} onValueChange={v => setYeniFirma(p => ({ ...p, firma_tipi_id: v }))}>
                  <SelectTrigger className="text-xs h-8" style={s.input}><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent style={{ ...s.card, padding: "0.25rem", zIndex: 9999 }} position="popper" className="max-h-60">
                    {filteredTipler.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setYeniFirmaOpen(false)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>İptal</Button>
            <Button onClick={handleCreateFirma} disabled={yeniFirmaSaving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {yeniFirmaSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Firma Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) { setDeleteFirma(null); setDeleteConfirmText(""); } }}>
        <DialogContent style={s.card} className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Firmayı Sil</DialogTitle>
            <DialogDescription style={s.muted}>Bu işlem geri alınamaz.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg border border-red-500/30" style={{ background: "rgba(239,68,68,0.05)" }}>
              <p className="text-sm font-medium" style={s.text}>{deleteFirma?.firma_unvani}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs" style={s.muted}>Firma adını yazın: <span className="font-semibold text-red-400">{deleteFirma?.firma_unvani}</span></Label>
              <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} style={s.input} className="text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>İptal</Button>
            <Button onClick={handleDeleteFirma} disabled={deleteLoading || deleteConfirmText !== deleteFirma?.firma_unvani} className="bg-red-600 hover:bg-red-700 text-white">
              {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Belge Dialog */}
      <Dialog open={belgeDialogOpen} onOpenChange={setBelgeDialogOpen}>
        <DialogContent style={s.card} className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={s.text}><ShieldCheck className="w-5 h-5 text-amber-500 inline mr-2" />Belge Doğrulama</DialogTitle>
            <DialogDescription style={s.muted}>{belgeDialogFirma?.firma_unvani}</DialogDescription>
          </DialogHeader>
          {belgeDialogLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
          ) : belgeler.length === 0 ? (
            <div className="text-center py-8"><p className="text-sm" style={s.muted}>Henüz belge yok.</p></div>
          ) : (
            <div className="space-y-3">
              {belgeler.map((belge: any) => (
                <div key={belge.id} className="p-3 rounded-lg" style={{ background: "hsl(var(--admin-hover))" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={s.text}>{BELGE_LABELS[belge.belge_turu] || belge.belge_turu}</span>
                    {belge.durum === "inceleniyor" && <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0">İnceleniyor</Badge>}
                    {belge.durum === "onaylandi" && <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px] px-1.5 py-0">Onaylı</Badge>}
                    {belge.durum === "reddedildi" && <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px] px-1.5 py-0">Reddedildi</Badge>}
                  </div>
                  <p className="text-xs mb-2" style={s.muted}>{belge.dosya_adi}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }} onClick={() => handleDownloadBelge(belge.dosya_url, belge.dosya_adi)}>
                      <Download className="w-3.5 h-3.5 mr-1" /> İndir
                    </Button>
                    {belge.durum === "inceleniyor" && (
                      <>
                        <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white" disabled={belgeActionLoading === belge.id} onClick={() => handleBelgeAction(belge.id, "onaylandi")}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Onayla
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs" style={{ color: "#ef4444" }} disabled={belgeActionLoading === belge.id} onClick={() => {
                          if (rejectReasons[belge.id] === undefined) setRejectReasons(prev => ({ ...prev, [belge.id]: "" }));
                          else handleBelgeAction(belge.id, "reddedildi");
                        }}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reddet
                        </Button>
                      </>
                    )}
                  </div>
                  {rejectReasons[belge.id] !== undefined && belge.durum === "inceleniyor" && (
                    <div className="mt-2 space-y-2">
                      <Textarea placeholder="Reddetme sebebi..." value={rejectReasons[belge.id]} onChange={(e) => setRejectReasons(prev => ({ ...prev, [belge.id]: e.target.value }))} className="text-xs h-16" style={s.input} />
                      <Button size="sm" className="text-xs bg-red-600 hover:bg-red-700 text-white" disabled={belgeActionLoading === belge.id || !rejectReasons[belge.id]} onClick={() => handleBelgeAction(belge.id, "reddedildi")}>Reddet</Button>
                    </div>
                  )}
                  {belge.karar_sebebi && belge.durum === "reddedildi" && (
                    <p className="text-xs mt-2" style={{ color: "#ef4444" }}>Sebep: {belge.karar_sebebi}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bulk Action Confirmation Dialogs ── */}

      {/* Bulk Approve */}
      <AlertDialog open={bulkAction === "approve"} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent style={s.card}>
          <AlertDialogHeader>
            <AlertDialogTitle style={s.text}>Toplu Onaylama</AlertDialogTitle>
            <AlertDialogDescription style={s.muted}>
              Seçilen <strong>{selectedCount}</strong> firmayı onaylamak istediğinize emin misiniz? Onaylanan firmalara şifre oluşturma maili gönderilecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>İptal</AlertDialogCancel>
            <Button onClick={handleBulkApprove} disabled={bulkLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {bulkLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedCount} Firmayı Onayla
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Verify */}
      <AlertDialog open={bulkAction === "verify"} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent style={s.card}>
          <AlertDialogHeader>
            <AlertDialogTitle style={s.text}>Toplu Doğrulama</AlertDialogTitle>
            <AlertDialogDescription style={s.muted}>
              Seçilen <strong>{selectedCount}</strong> firmanın profilini "Doğrulanmış" olarak işaretlemek istediğinize emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>İptal</AlertDialogCancel>
            <Button onClick={handleBulkVerify} disabled={bulkLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {bulkLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedCount} Firmayı Doğrula
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete */}
      <AlertDialog open={bulkAction === "delete"} onOpenChange={(open) => { if (!open) { setBulkAction(null); setBulkDeleteConfirm(""); } }}>
        <AlertDialogContent style={s.card}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">Toplu Silme</AlertDialogTitle>
            <AlertDialogDescription style={s.muted}>
              Seçilen <strong>{selectedCount}</strong> firmayı ve tüm ilişkili verilerini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs" style={s.muted}>Onaylamak için <span className="font-bold text-red-400">SİL</span> yazın:</Label>
            <Input value={bulkDeleteConfirm} onChange={e => setBulkDeleteConfirm(e.target.value)} style={s.input} className="text-sm" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>İptal</AlertDialogCancel>
            <Button onClick={handleBulkDelete} disabled={bulkLoading || bulkDeleteConfirm !== "SİL"} className="bg-red-600 hover:bg-red-700 text-white">
              {bulkLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedCount} Firmayı Sil
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

// ── Helper components ──

function StatCard({ icon: Icon, label, value, color, active, onClick }: { icon: any; label: string; value: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <div
      style={{ ...s.card, ...(active ? { borderColor: "hsl(38 92% 50%)", boxShadow: "0 0 0 1px hsl(38 92% 50%)" } : {}) }}
      className="p-3 cursor-pointer transition-all hover:scale-[1.02]"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] font-medium uppercase tracking-wider" style={s.muted}>{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: getValueColor(value) }}>{value}</div>
    </div>
  );
}

function QuotaItem({ icon: Icon, label, used, limit }: { icon: any; label: string; used: number; limit: number | null }) {
  const remaining = limit === null ? "∞" : Math.max(0, limit - used);
  const percentage = limit === null ? 0 : limit > 0 ? (used / limit) * 100 : 100;
  const barColor = limit === null ? "#22c55e" : percentage >= 90 ? "#ef4444" : percentage >= 60 ? "#eab308" : "#22c55e";
  return (
    <div className="p-2 rounded-lg" style={{ background: "hsl(var(--admin-hover))" }}>
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="w-3 h-3" style={s.muted} />
        <span className="text-[10px]" style={s.muted}>{label}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span style={s.text}>{used}/{limit === null ? "∞" : limit}</span>
        <span className="font-semibold" style={{ color: barColor }}>{remaining}</span>
      </div>
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

async function getIlKategoriId(): Promise<string> {
  const { data } = await supabase.from("firma_bilgi_kategorileri").select("id").eq("name", "İl").single();
  return data?.id || "";
}
