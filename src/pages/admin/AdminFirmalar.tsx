import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Users, Clock, AlertCircle, CheckCircle, XCircle,
  Search, Filter, ExternalLink, Gavel, FileText, Package, ShieldAlert, HeadphonesIcon, RotateCcw, TrendingUp
} from "lucide-react";

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
  profile: { ad: string; soyad: string; iletisim_email: string; iletisim_numarasi: string | null } | null;
}

interface FirmaStats {
  total: number;
  turDagilimi: { name: string; count: number }[];
  recent: number;
  pending: number;
}

interface FirmaDetail {
  firma: any;
  profile: any;
  email: string | null;
}

export default function AdminFirmalar() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [firmalar, setFirmalar] = useState<FirmaItem[]>([]);
  const [stats, setStats] = useState<FirmaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsDays, setStatsDays] = useState(7);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filters
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

  // Dropdown options
  const [turler, setTurler] = useState<{ id: string; name: string }[]>([]);
  const [tipler, setTipler] = useState<{ id: string; name: string; firma_turu_id: string }[]>([]);
  const [iller, setIller] = useState<{ id: string; name: string }[]>([]);

  // Review dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDetail, setReviewDetail] = useState<FirmaDetail | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

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
    const ilKatId = await getIlKategoriId();
    const [{ data: t }, { data: tp }, { data: il }] = await Promise.all([
      supabase.from("firma_turleri").select("id, name").order("name"),
      supabase.from("firma_tipleri").select("id, name, firma_turu_id").order("name"),
      supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", ilKatId).order("name"),
    ]);
    setTurler(t || []);
    setTipler((tp || []) as any);
    setIller(il || []);
  }, []);

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

  const clearFilters = () => {
    setFilterTuru("all");
    setFilterTipi("all");
    setFilterIl("all");
    setFilterDurum("all");
    setFilterMinIhale("");
    setFilterMaxIhale("");
    setFilterMinTeklif("");
    setFilterMaxTeklif("");
    setFilterMinUrun("");
    setFilterMaxUrun("");
    setFilterMinProfil("");
    setFilterMaxProfil("");
    setSearchTerm("");
  };

  const hasActiveFilters = filterTuru !== "all" || filterTipi !== "all" || filterIl !== "all" || filterDurum !== "all" ||
    filterMinIhale || filterMaxIhale || filterMinTeklif || filterMaxTeklif ||
    filterMinUrun || filterMaxUrun || filterMinProfil || filterMaxProfil || searchTerm;

  // Filter logic
  const filtered = firmalar.filter((f) => {
    if (searchTerm && !f.firma_unvani.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterTuru !== "all" && f.firma_turu_id !== filterTuru) return false;
    if (filterTipi !== "all" && f.firma_tipi_id !== filterTipi) return false;
    if (filterIl !== "all" && f.kurulus_il_id !== filterIl) return false;
    if (filterDurum !== "all" && f.onay_durumu !== filterDurum) return false;
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

  const durumBadge = (durum: string) => {
    switch (durum) {
      case "onaylandi": return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[10px] px-1.5 py-0">Onaylı</Badge>;
      case "onay_bekliyor": return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0">Onay Bekliyor</Badge>;
      case "onaysiz": return <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px] px-1.5 py-0">Reddedildi</Badge>;
      default: return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{durum}</Badge>;
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <AdminLayout title="Firmalar">
      <div className="space-y-6">
        {/* Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="admin-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Toplam</span>
                </div>
                <div className="text-3xl font-bold admin-text">{stats.total}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kayıtlı firma</p>
              </CardContent>
            </Card>

            <Card className="admin-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bekleyen</span>
                </div>
                <div className="text-3xl font-bold text-amber-500">{stats.pending}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Onay bekliyor</p>
              </CardContent>
            </Card>

            <Card className="admin-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <Select value={String(statsDays)} onValueChange={(v) => setStatsDays(Number(v))}>
                    <SelectTrigger className="w-auto h-5 text-[10px] admin-input border-0 bg-transparent px-1 gap-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="admin-dropdown">
                      <SelectItem value="1" className="text-xs">24 Saat</SelectItem>
                      <SelectItem value="7" className="text-xs">7 Gün</SelectItem>
                      <SelectItem value="15" className="text-xs">15 Gün</SelectItem>
                      <SelectItem value="30" className="text-xs">30 Gün</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-3xl font-bold admin-text">{stats.recent}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {statsDays === 1 ? "Son 24 saat" : `Son ${statsDays} gün`}
                </p>
              </CardContent>
            </Card>

            <Card className="admin-card col-span-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tür Dağılımı</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {stats.turDagilimi.map((t) => (
                    <div key={t.name} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-500 dark:text-slate-400 truncate">{t.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${stats.total > 0 ? (t.count / stats.total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="admin-text font-semibold w-4 text-right">{t.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Firma adı ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 admin-input"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="admin-btn-outline"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtreler
              {hasActiveFilters && (
                <span className="ml-2 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-slate-500 hover:text-red-500 text-xs px-3"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Temizle
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="admin-card rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-slate-500 dark:text-slate-400 text-xs">Durum</Label>
                <Select value={filterDurum} onValueChange={setFilterDurum}>
                  <SelectTrigger className="admin-input text-xs h-8"><SelectValue placeholder="Tümü" /></SelectTrigger>
                  <SelectContent className="admin-dropdown">
                    <SelectItem value="all" className="text-xs">Tümü</SelectItem>
                    <SelectItem value="onay_bekliyor" className="text-xs">Onay Bekliyor</SelectItem>
                    <SelectItem value="onaylandi" className="text-xs">Onaylı</SelectItem>
                    <SelectItem value="onaysiz" className="text-xs">Reddedildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-500 dark:text-slate-400 text-xs">Firma Türü</Label>
                <Select value={filterTuru} onValueChange={setFilterTuru}>
                  <SelectTrigger className="admin-input text-xs h-8"><SelectValue placeholder="Tümü" /></SelectTrigger>
                  <SelectContent className="admin-dropdown">
                    <SelectItem value="all" className="text-xs">Tümü</SelectItem>
                    {turler.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-500 dark:text-slate-400 text-xs">Firma Tipi</Label>
                <Select value={filterTipi} onValueChange={setFilterTipi}>
                  <SelectTrigger className="admin-input text-xs h-8"><SelectValue placeholder="Tümü" /></SelectTrigger>
                  <SelectContent className="admin-dropdown">
                    <SelectItem value="all" className="text-xs">Tümü</SelectItem>
                    {tipler
                      .filter((tp) => filterTuru === "all" || tp.firma_turu_id === filterTuru)
                      .map((tp) => (
                        <SelectItem key={tp.id} value={tp.id} className="text-xs">{tp.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-500 dark:text-slate-400 text-xs">İl</Label>
                <Select value={filterIl} onValueChange={setFilterIl}>
                  <SelectTrigger className="admin-input text-xs h-8"><SelectValue placeholder="Tümü" /></SelectTrigger>
                  <SelectContent className="admin-dropdown">
                    <SelectItem value="all" className="text-xs">Tümü</SelectItem>
                    {iller.map((il) => (
                      <SelectItem key={il.id} value={il.id} className="text-xs">{il.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-500 dark:text-slate-400 text-xs">İhale Sayısı</Label>
                <div className="flex gap-1">
                  <Input placeholder="Min" value={filterMinIhale} onChange={(e) => setFilterMinIhale(e.target.value)} className="admin-input text-xs h-8" />
                  <Input placeholder="Max" value={filterMaxIhale} onChange={(e) => setFilterMaxIhale(e.target.value)} className="admin-input text-xs h-8" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-500 dark:text-slate-400 text-xs">Teklif Sayısı</Label>
                <div className="flex gap-1">
                  <Input placeholder="Min" value={filterMinTeklif} onChange={(e) => setFilterMinTeklif(e.target.value)} className="admin-input text-xs h-8" />
                  <Input placeholder="Max" value={filterMaxTeklif} onChange={(e) => setFilterMaxTeklif(e.target.value)} className="admin-input text-xs h-8" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-500 dark:text-slate-400 text-xs">Ürün Sayısı</Label>
                <div className="flex gap-1">
                  <Input placeholder="Min" value={filterMinUrun} onChange={(e) => setFilterMinUrun(e.target.value)} className="admin-input text-xs h-8" />
                  <Input placeholder="Max" value={filterMaxUrun} onChange={(e) => setFilterMaxUrun(e.target.value)} className="admin-input text-xs h-8" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-500 dark:text-slate-400 text-xs">Profil Doluluk %</Label>
                <div className="flex gap-1">
                  <Input placeholder="Min" value={filterMinProfil} onChange={(e) => setFilterMinProfil(e.target.value)} className="admin-input text-xs h-8" />
                  <Input placeholder="Max" value={filterMaxProfil} onChange={(e) => setFilterMaxProfil(e.target.value)} className="admin-input text-xs h-8" />
                </div>
              </div>

              <div className="col-span-2 md:col-span-4 flex justify-end">
                <Button variant="ghost" onClick={clearFilters} className="text-xs text-slate-500 hover:text-red-500">
                  <RotateCcw className="w-3 h-3 mr-1.5" />
                  Tüm Filtreleri Temizle
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Result count */}
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {filtered.length} firma listeleniyor {hasActiveFilters && `(${firmalar.length} toplam)`}
        </div>

        {/* Firma List */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center text-slate-500 py-12">Firma bulunamadı.</div>
            )}
            {filtered.map((firma) => (
              <div
                key={firma.id}
                className="admin-card rounded-xl p-5 hover:shadow-lg transition-all"
              >
                {/* Top row: logo, name + badge, actions */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {firma.logo_url ? (
                        <img src={firma.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="admin-text font-semibold text-base">{firma.firma_unvani}</h3>
                        {durumBadge(firma.onay_durumu)}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {firma.firma_turu_name || "—"} · {firma.firma_tipi_name || "—"}
                      </p>
                      {firma.il_name && (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">{firma.il_name}{firma.ilce_name ? ` / ${firma.ilce_name}` : ""}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {firma.onay_durumu === "onay_bekliyor" && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); openReview(firma); }}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
                        size="sm"
                      >
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                        Başvuruyu Değerlendir
                      </Button>
                    )}
                    <Button
                      onClick={(e) => { e.stopPropagation(); handleImpersonate(firma.user_id); }}
                      variant="outline"
                      size="sm"
                      className="admin-btn-outline text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Kullanıcıyı Yönet
                    </Button>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-6 mb-3 text-xs text-slate-400 dark:text-slate-500">
                  <span>Kayıt: {formatDate(firma.created_at)}</span>
                  <span>Son Hareket: {formatDate(firma.updated_at)}</span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  <StatBox icon={Gavel} label="İhale" value={firma.ihale_sayisi} />
                  <StatBox icon={FileText} label="Teklif" value={firma.teklif_sayisi} />
                  <StatBox icon={Package} label="Ürün" value={firma.urun_sayisi} />
                  <StatBox icon={Users} label="Profil" value={`%${firma.profil_doluluk}`} />
                  <StatBox icon={ShieldAlert} label="Şikayet" value={firma.sikayet_sayisi} />
                  <StatBox icon={HeadphonesIcon} label="Destek" value={0} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="admin-card border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="admin-text">Başvuruyu Değerlendir</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Firma kayıt bilgilerini inceleyin ve onaylayın veya reddedin.</DialogDescription>
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
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3" />
              <InfoRow label="Firma Ünvanı" value={reviewDetail.firma?.firma_unvani} />
              <InfoRow label="Firma Türü" value={reviewDetail.firma?.firma_turu_name} />
              <InfoRow label="Firma Tipi" value={reviewDetail.firma?.firma_tipi_name} />
              <InfoRow label="Vergi No" value={reviewDetail.firma?.vergi_numarasi} />
              <InfoRow label="Vergi Dairesi" value={reviewDetail.firma?.vergi_dairesi} />
            </div>
          ) : null}

          {reviewDetail && (
            <DialogFooter className="gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={() => handleReject(reviewDetail.firma.id)}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reddet
              </Button>
              <Button
                onClick={() => handleApprove(reviewDetail.firma.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Onayla
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-2.5 text-center">
      <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mx-auto mb-1" />
      <div className="admin-text font-semibold text-sm">{value}</div>
      <div className="text-slate-400 dark:text-slate-500 text-[10px]">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400 text-sm">{label}</span>
      <span className="admin-text text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

// Helper to get "İl" kategori ID
async function getIlKategoriId(): Promise<string> {
  const { data } = await supabase
    .from("firma_bilgi_kategorileri")
    .select("id")
    .eq("name", "İl")
    .single();
  return data?.id || "";
}
