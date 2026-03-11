import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquareWarning, Eye, Filter, RotateCcw, Search,
  ChevronLeft, ChevronRight, MessageSquare, Gavel, Package, User,
  FileText, Calendar, Building2, AlertTriangle, ShieldAlert, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import SikayetAksiyonDialog from "@/components/admin/SikayetAksiyonDialog";

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

const TUR_LABELS: Record<string, string> = {
  mesaj: "Mesaj",
  ihale: "İhale",
  urun: "Ürün",
  profil: "Profil",
};

const TUR_ICONS: Record<string, typeof MessageSquare> = {
  mesaj: MessageSquare,
  ihale: Gavel,
  urun: Package,
  profil: User,
};

const DURUM_LABELS: Record<string, string> = {
  beklemede: "Beklemede",
  inceleniyor: "İnceleniyor",
  cozuldu: "Çözüldü",
  reddedildi: "Reddedildi",
};

interface SikayetItem {
  id: string;
  sikayet_no: string;
  bildiren_user_id: string;
  bildiren_firma: string;
  sikayet_edilen_firma: string;
  sikayet_edilen_user_id: string | null;
  tur: string;
  sebep: string;
  aciklama: string | null;
  durum: string;
  created_at: string;
  referans_id: string;
  ek_dosya_url: string | null;
  ek_dosya_adi: string | null;
  islem_tipi: string | null;
  islem_yapan: string | null;
  islem_tarihi: string | null;
  islem_detay: string | null;
}

const ITEMS_PER_PAGE = 10;

export default function AdminSikayetler() {
  const { token } = useAdminAuth();
  const [sikayetler, setSikayetler] = useState<SikayetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewItem, setViewItem] = useState<SikayetItem | null>(null);
  const [actionItem, setActionItem] = useState<SikayetItem | null>(null);
  // Filters
  const [filterTur, setFilterTur] = useState("all");
  const [filterFirma, setFilterFirma] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth/list-sikayetler", {
        body: { token },
      });
      if (error) throw error;
      setSikayetler(data.sikayetler || []);
    } catch (err) {
      console.error("Şikayetler yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats
  const stats = {
    total: sikayetler.length,
    mesaj: sikayetler.filter(s => s.tur === "mesaj").length,
    ihale: sikayetler.filter(s => s.tur === "ihale").length,
    profil: sikayetler.filter(s => s.tur === "profil").length,
    urun: sikayetler.filter(s => s.tur === "urun").length,
  };

  // Filtered list
  const filtered = sikayetler.filter(s => {
    if (filterTur !== "all" && s.tur !== filterTur) return false;
    if (filterFirma && !s.bildiren_firma.toLowerCase().includes(filterFirma.toLowerCase()) && !s.sikayet_edilen_firma.toLowerCase().includes(filterFirma.toLowerCase())) return false;
    if (filterStartDate && s.created_at < filterStartDate) return false;
    if (filterEndDate && s.created_at > filterEndDate + "T23:59:59") return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const resetFilters = () => {
    setFilterTur("all");
    setFilterFirma("");
    setFilterStartDate("");
    setFilterEndDate("");
    setCurrentPage(1);
  };

  const statCards = [
    { label: "Toplam Şikayet", value: stats.total, icon: MessageSquareWarning, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Mesaj Şikayetleri", value: stats.mesaj, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "İhale Şikayetleri", value: stats.ihale, icon: Gavel, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Profil Şikayetleri", value: stats.profil, icon: User, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Ürün Şikayetleri", value: stats.urun, icon: Package, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  const durumBadge = (durum: string) => {
    const colors: Record<string, string> = {
      beklemede: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      inceleniyor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      cozuldu: "bg-green-500/10 text-green-600 border-green-500/20",
      reddedildi: "bg-red-500/10 text-red-600 border-red-500/20",
    };
    return colors[durum] || "bg-gray-500/10 text-gray-600 border-gray-500/20";
  };

  return (
    <AdminLayout title="Şikayetler">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {statCards.map((c) => (
          <div key={c.label} className="p-4 rounded-xl" style={s.card}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={s.text}>{c.value}</p>
                <p className="text-xs" style={s.muted}>{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 mb-6" style={s.card}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium"
            style={s.text}
          >
            <Filter className="w-4 h-4" />
            Filtreler
          </button>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs gap-1" style={s.muted}>
            <RotateCcw className="w-3 h-3" /> Sıfırla
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tarih */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={s.muted}>Başlangıç Tarihi</label>
              <Input type="date" value={filterStartDate} onChange={e => { setFilterStartDate(e.target.value); setCurrentPage(1); }} style={s.input} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={s.muted}>Bitiş Tarihi</label>
              <Input type="date" value={filterEndDate} onChange={e => { setFilterEndDate(e.target.value); setCurrentPage(1); }} style={s.input} />
            </div>
            {/* Şikayet Alanı */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={s.muted}>Şikayet Alanı</label>
              <Select value={filterTur} onValueChange={v => { setFilterTur(v); setCurrentPage(1); }}>
                <SelectTrigger style={s.input}><SelectValue /></SelectTrigger>
                <SelectContent style={s.selectContent}>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="mesaj">Mesaj</SelectItem>
                  <SelectItem value="ihale">İhale</SelectItem>
                  <SelectItem value="profil">Profil</SelectItem>
                  <SelectItem value="urun">Ürün</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Firma */}
            <div className="md:col-span-3">
              <label className="text-xs font-medium mb-1 block" style={s.muted}>Firma Ara</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
                <Input
                  placeholder="Şikayet eden veya edilen firma adı..."
                  value={filterFirma}
                  onChange={e => { setFilterFirma(e.target.value); setCurrentPage(1); }}
                  className="pl-9"
                  style={s.input}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={s.card}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <AlertTriangle className="w-10 h-10 text-amber-500/50" />
            <p className="text-sm" style={s.muted}>Şikayet bulunamadı</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
                    {["Şikayet ID", "Şikayet Eden Firma", "Şikayet Edilen Firma", "Alan", "Sebep", "Tarih", "Durum", "Aksiyonlar"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={s.muted}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map(item => {
                    const TurIcon = TUR_ICONS[item.tur] || AlertTriangle;
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid hsl(var(--admin-border))" }} className="hover:bg-amber-500/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs" style={s.text}>{item.sikayet_no}</td>
                        <td className="px-4 py-3 text-xs" style={s.text}>{item.bildiren_firma}</td>
                        <td className="px-4 py-3 text-xs" style={s.text}>{item.sikayet_edilen_firma}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <TurIcon className="w-3.5 h-3.5" style={s.muted} />
                            <span className="text-xs" style={s.text}>{TUR_LABELS[item.tur] || item.tur}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={s.text}>{item.sebep}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={s.muted}>
                          {format(new Date(item.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={durumBadge(item.durum)}>
                            {DURUM_LABELS[item.durum] || item.durum}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewItem(item)} className="h-7 w-7 p-0" title="Görüntüle">
                              <Eye className="w-3.5 h-3.5" style={s.muted} />
                            </Button>
                            {item.sikayet_edilen_user_id && item.durum !== "cozuldu" && (
                              <Button variant="ghost" size="sm" onClick={() => setActionItem(item)} className="h-7 w-7 p-0" title="İşlem Yap">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid hsl(var(--admin-border))" }}>
                <p className="text-xs" style={s.muted}>{filtered.length} şikayetten {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} arası</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 w-7 p-0">
                    <ChevronLeft className="w-4 h-4" style={s.muted} />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                    if (page < 1 || page > totalPages) return null;
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`h-7 w-7 p-0 text-xs ${page === currentPage ? "bg-amber-500 text-white hover:bg-amber-600" : ""}`}
                        style={page !== currentPage ? s.muted : undefined}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  <Button variant="ghost" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 w-7 p-0">
                    <ChevronRight className="w-4 h-4" style={s.muted} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="sm:max-w-lg" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
          <DialogHeader>
            <DialogTitle style={s.text}>Şikayet Detayı — {viewItem?.sikayet_no}</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium mb-1" style={s.muted}>Şikayet Eden Firma</p>
                  <p className="text-sm" style={s.text}>{viewItem.bildiren_firma}</p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={s.muted}>Şikayet Edilen Firma</p>
                  <p className="text-sm" style={s.text}>{viewItem.sikayet_edilen_firma}</p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={s.muted}>Şikayet Alanı</p>
                  <p className="text-sm" style={s.text}>{TUR_LABELS[viewItem.tur] || viewItem.tur}</p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={s.muted}>Durum</p>
                  <Badge variant="outline" className={durumBadge(viewItem.durum)}>
                    {DURUM_LABELS[viewItem.durum] || viewItem.durum}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={s.muted}>Tarih</p>
                  <p className="text-sm" style={s.text}>{format(new Date(viewItem.created_at), "dd MMM yyyy HH:mm", { locale: tr })}</p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={s.muted}>Şikayet Edilen İçerik</p>
                  {(() => {
                    const linkMap: Record<string, { href: string; label: string }> = {
                      profil: { href: `/firma/${viewItem.referans_id}`, label: "Firma Profilini Görüntüle" },
                      ihale: { href: `/tekihale/${viewItem.referans_id}`, label: "İhaleyi Görüntüle" },
                      urun: { href: `/urun/${viewItem.referans_id}`, label: "Ürünü Görüntüle" },
                      mesaj: { href: `/mesajlar`, label: "Mesajı Görüntüle" },
                    };
                    const link = linkMap[viewItem.tur];
                    return link ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-amber-500 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {link.label}
                      </a>
                    ) : (
                      <p className="text-sm font-mono" style={s.text}>{viewItem.referans_id.slice(0, 8)}...</p>
                    );
                  })()}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium mb-1" style={s.muted}>Şikayet Sebebi</p>
                <p className="text-sm" style={s.text}>{viewItem.sebep}</p>
              </div>

              {viewItem.aciklama && (
                <div>
                  <p className="text-xs font-medium mb-1" style={s.muted}>Açıklama</p>
                  <p className="text-sm whitespace-pre-wrap" style={s.text}>{viewItem.aciklama}</p>
                </div>
              )}

              {viewItem.ek_dosya_url && (
                <div>
                  <p className="text-xs font-medium mb-1" style={s.muted}>Ek Dosya</p>
                  <a
                    href={viewItem.ek_dosya_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-amber-500 hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {viewItem.ek_dosya_adi || "Dosyayı Görüntüle"}
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <SikayetAksiyonDialog
        open={!!actionItem}
        onClose={() => setActionItem(null)}
        item={actionItem}
        onSuccess={fetchData}
      />
    </AdminLayout>
  );
}
