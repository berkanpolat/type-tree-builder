import { useState, useEffect, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminApi } from "@/hooks/use-admin-api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, X, Clock, AlertTriangle,
  CheckCircle2, XCircle, Server, Mail, MessageSquare, CreditCard, Shield, FileText, Activity
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
};

interface SystemLog {
  id: string;
  created_at: string;
  seviye: string;
  kaynak: string;
  islem: string;
  mesaj: string;
  detaylar: Record<string, any>;
  user_id: string | null;
  firma_id: string | null;
  basarili: boolean;
  hata_mesaji: string | null;
}

const KAYNAK_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  sms: { label: "SMS", icon: MessageSquare, color: "#3b82f6" },
  email: { label: "E-posta", icon: Mail, color: "#8b5cf6" },
  odeme: { label: "Ödeme", icon: CreditCard, color: "#22c55e" },
  auth: { label: "Kimlik Doğr.", icon: Shield, color: "#f59e0b" },
  sistem: { label: "Sistem", icon: Server, color: "#6b7280" },
  edge_function: { label: "Backend", icon: Server, color: "#06b6d4" },
  client_error: { label: "Tarayıcı Hatası", icon: AlertTriangle, color: "#dc2626" },
};

const SEVIYE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  info: { label: "Bilgi", color: "#3b82f6", icon: Activity },
  warning: { label: "Uyarı", color: "#f59e0b", icon: AlertTriangle },
  error: { label: "Hata", color: "#ef4444", icon: XCircle },
};

const ITEMS_PER_PAGE = 25;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

export default function AdminSistemLoglari() {
  const { token, hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const callApi = useAdminApi();

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKaynak, setFilterKaynak] = useState("all");
  const [filterSeviye, setFilterSeviye] = useState("all");
  const [filterBasarili, setFilterBasarili] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = () => {
    if (!token) return;
    setLoading(true);
    const params: Record<string, any> = { token };
    if (filterKaynak !== "all") params.kaynak = filterKaynak;
    if (filterSeviye !== "all") params.seviye = filterSeviye;
    if (filterBasarili !== "all") params.basarili = filterBasarili === "true";

    callApi("list-system-logs", params)
      .then((data) => setLogs(data.logs || []))
      .catch(() => toast({ title: "Hata", description: "Sistem logları yüklenemedi", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(); }, [token]);

  const filtered = logs.filter((l) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !l.mesaj.toLowerCase().includes(q) &&
        !l.islem.toLowerCase().includes(q) &&
        !l.kaynak.toLowerCase().includes(q) &&
        !(l.hata_mesaji || "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterKaynak("all");
    setFilterSeviye("all");
    setFilterBasarili("all");
    setCurrentPage(1);
  };
  const hasFilters = searchTerm || filterKaynak !== "all" || filterSeviye !== "all" || filterBasarili !== "all";

  // Stats
  const totalErrors = logs.filter((l) => !l.basarili).length;
  const totalSuccess = logs.filter((l) => l.basarili).length;
  const smsSent = logs.filter((l) => l.kaynak === "sms" && l.basarili).length;
  const emailSent = logs.filter((l) => l.kaynak === "email" && l.basarili).length;
  const clientErrors = logs.filter((l) => l.kaynak === "client_error").length;

  if (!hasPermission("islem_goruntule")) {
    return (
      <AdminLayout title="Sistem Logları">
        <div className="flex items-center justify-center h-64" style={s.text}>
          <p>Bu sayfayı görüntülemek için yetkiniz bulunmamaktadır.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Sistem Logları">
      <div className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Toplam Log", value: logs.length, icon: Activity, color: "#3b82f6" },
            { label: "Hata", value: totalErrors, icon: XCircle, color: "#ef4444" },
            { label: "Tarayıcı Hatası", value: clientErrors, icon: AlertTriangle, color: "#dc2626" },
            { label: "SMS Gönderildi", value: smsSent, icon: MessageSquare, color: "#22c55e" },
            { label: "E-posta Gönderildi", value: emailSent, icon: Mail, color: "#8b5cf6" },
          ].map((kpi) => (
            <div key={kpi.label} style={s.card} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                <span className="text-xs" style={s.muted}>{kpi.label}</span>
              </div>
              <div className="text-xl font-bold" style={s.text}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={s.card} className="p-3 md:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
                <Input
                  placeholder="Mesaj, işlem veya hata ara..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                  style={s.input}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={loadLogs} className="shrink-0" style={s.text}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={filterKaynak} onValueChange={(v) => { setFilterKaynak(v); setCurrentPage(1); loadLogs(); }}>
                <SelectTrigger className="text-xs h-9" style={s.input}><SelectValue placeholder="Kaynak" /></SelectTrigger>
                <SelectContent style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                  <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                  {Object.entries(KAYNAK_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSeviye} onValueChange={(v) => { setFilterSeviye(v); setCurrentPage(1); loadLogs(); }}>
                <SelectTrigger className="text-xs h-9" style={s.input}><SelectValue placeholder="Seviye" /></SelectTrigger>
                <SelectContent style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                  <SelectItem value="all">Tüm Seviyeler</SelectItem>
                  {Object.entries(SEVIYE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterBasarili} onValueChange={(v) => { setFilterBasarili(v); setCurrentPage(1); loadLogs(); }}>
                <SelectTrigger className="text-xs h-9" style={s.input}><SelectValue placeholder="Durum" /></SelectTrigger>
                <SelectContent style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="true">Başarılı</SelectItem>
                  <SelectItem value="false">Başarısız</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={s.muted}>{filtered.length} log kaydı</span>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-400 hover:text-red-300 h-7 text-xs">
                  <X className="w-3 h-3 mr-1" /> Temizle
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Log List */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : paginated.length === 0 ? (
          <div style={s.card} className="p-8 text-center">
            <Server className="w-10 h-10 mx-auto mb-2" style={s.muted} />
            <p style={s.muted}>Henüz sistem log kaydı bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginated.map((log) => {
              const kaynakInfo = KAYNAK_LABELS[log.kaynak] || KAYNAK_LABELS.sistem;
              const seviyeInfo = SEVIYE_CONFIG[log.seviye] || SEVIYE_CONFIG.info;
              const isExpanded = expandedId === log.id;
              const KaynakIcon = kaynakInfo.icon;

              return (
                <div
                  key={log.id}
                  style={s.card}
                  className="p-3 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start gap-2 md:gap-3">
                    <div
                      className="w-1 h-10 rounded-full mt-0.5 shrink-0"
                      style={{ background: log.basarili ? "#22c55e" : "#ef4444" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          className="text-[10px] px-1.5 py-0 shrink-0 flex items-center gap-1"
                          style={{ background: `${kaynakInfo.color}20`, color: kaynakInfo.color, borderColor: `${kaynakInfo.color}40` }}
                        >
                          <KaynakIcon className="w-3 h-3" />
                          {kaynakInfo.label}
                        </Badge>
                        <Badge
                          className="text-[10px] px-1.5 py-0 shrink-0"
                          style={{ background: `${seviyeInfo.color}20`, color: seviyeInfo.color, borderColor: `${seviyeInfo.color}40` }}
                        >
                          {seviyeInfo.label}
                        </Badge>
                        {log.basarili ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#22c55e" }} />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#ef4444" }} />
                        )}
                        <span className="text-xs truncate" style={s.text}>{log.islem}</span>
                      </div>
                      <p className="text-xs mt-1 line-clamp-1" style={s.secondary}>{log.mesaj}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[10px]" style={s.muted}>
                          <Clock className="w-3 h-3" />
                          {formatDate(log.created_at)}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 p-3 rounded-lg text-xs space-y-2 overflow-x-auto" style={{ background: "hsl(var(--admin-hover))" }}>
                          {log.hata_mesaji && (
                            <div className="flex items-start gap-2 p-2 rounded" style={{ background: "rgba(239,68,68,0.1)" }}>
                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                              <span style={{ color: "#ef4444" }}>{log.hata_mesaji}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 font-medium" style={s.secondary}>
                            <FileText className="w-3 h-3" /> Detaylar
                          </div>
                          {log.detaylar && Object.keys(log.detaylar).length > 0 ? (
                            Object.entries(log.detaylar).map(([key, val]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium min-w-[100px] shrink-0" style={s.secondary}>{key}:</span>
                                <span className="break-all" style={s.text}>
                                  {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span style={s.muted}>Ek detay yok</span>
                          )}
                          {log.user_id && (
                            <div className="flex gap-2">
                              <span className="font-medium min-w-[100px] shrink-0" style={s.secondary}>User ID:</span>
                              <span className="font-mono text-[10px] break-all" style={s.text}>{log.user_id}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button variant="ghost" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs" style={s.muted}>{safePage} / {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
