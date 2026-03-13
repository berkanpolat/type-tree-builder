import { useState, CSSProperties } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Activity, ChevronLeft, ChevronRight, X, Clock, Target, FileText
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

interface LogEntry {
  id: string;
  admin_id: string;
  admin_username: string;
  admin_ad: string;
  admin_soyad: string;
  admin_pozisyon: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: "Giriş Yaptı",
  "approve-firma": "Firma Onayladı",
  "reject-firma": "Firma Reddetti",
  "approve-ihale": "İhale Onayladı",
  "reject-ihale": "İhale Reddetti",
  "remove-ihale": "İhale Kaldırdı",
  "update-ihale": "İhale Güncelledi",
  "admin-save-ihale": "İhale Düzenledi",
  "approve-urun": "Ürün Onayladı",
  "reject-urun": "Ürün Reddetti",
  "remove-urun": "Ürün Kaldırdı",
  "toggle-urun": "Ürün Durumunu Değiştirdi",
  "admin-save-urun": "Ürün Düzenledi",
  kisitla: "Kullanıcı Kısıtladı",
  uzaklastir: "Kullanıcı Uzaklaştırdı",
  yasakla: "Kullanıcı Yasakladı",
  "destek-mesaj-gonder": "Destek Yanıtladı",
  "destek-durum-guncelle": "Destek Durumu Güncelledi",
  "create-user": "Admin Kullanıcı Oluşturdu",
  "update-user": "Admin Kullanıcı Güncelledi",
  "delete-user": "Admin Kullanıcı Sildi",
  "update-firma-paket": "Firma Paketi Güncelledi",
  "update-ekstra-haklar": "Ekstra Hak Tanımladı",
  "paketler-create": "Paket Oluşturdu",
  "paketler-update": "Paket Güncelledi",
  "paketler-delete": "Paket Sildi",
  impersonate: "Firma Hesabına Giriş Yaptı",
  "create-firma": "Yeni Firma Oluşturdu",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  firma: "Firma",
  ihale: "İhale",
  urun: "Ürün",
  user: "Kullanıcı",
  admin_user: "Admin Kullanıcı",
  destek: "Destek Talebi",
  sikayet: "Şikayet",
  paket: "Paket",
};

function getActionColor(action: string): string {
  if (action.includes("approve") || action === "login") return "#22c55e";
  if (action.includes("reject") || action.includes("remove") || action === "yasakla" || action.includes("delete")) return "#ef4444";
  if (action.includes("update") || action.includes("save") || action.includes("toggle")) return "#3b82f6";
  if (action.includes("create") || action.includes("gonder")) return "#8b5cf6";
  if (action === "kisitla" || action === "uzaklastir") return "#f59e0b";
  if (action === "impersonate") return "#ec4899";
  return "#6b7280";
}

const ITEMS_PER_PAGE = 20;

const formatDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
});

interface AdminLogPanelProps {
  logs: LogEntry[];
  loading: boolean;
}

export default function AdminLogPanel({ logs, loading }: AdminLogPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterAdmin, setFilterAdmin] = useState("all");
  const [filterTarget, setFilterTarget] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const uniqueAdmins = [...new Map(logs.map(l => [l.admin_id, { id: l.admin_id, name: `${l.admin_ad} ${l.admin_soyad}` }])).values()];
  const uniqueActions = [...new Set(logs.map(l => l.action))];

  const filtered = logs.filter(l => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !l.admin_ad.toLowerCase().includes(q) &&
        !l.admin_soyad.toLowerCase().includes(q) &&
        !l.admin_username.toLowerCase().includes(q) &&
        !(l.target_label || "").toLowerCase().includes(q) &&
        !(ACTION_LABELS[l.action] || l.action).toLowerCase().includes(q)
      ) return false;
    }
    if (filterAction !== "all" && l.action !== filterAction) return false;
    if (filterAdmin !== "all" && l.admin_id !== filterAdmin) return false;
    if (filterTarget !== "all" && l.target_type !== filterTarget) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearchTerm(""); setFilterAction("all"); setFilterAdmin("all"); setFilterTarget("all");
  };
  const hasFilters = searchTerm || filterAction !== "all" || filterAdmin !== "all" || filterTarget !== "all";

  // Reset page on filter change
  const handleSearch = (v: string) => { setSearchTerm(v); setCurrentPage(1); };
  const handleFilterAction = (v: string) => { setFilterAction(v); setCurrentPage(1); };
  const handleFilterAdmin = (v: string) => { setFilterAdmin(v); setCurrentPage(1); };
  const handleFilterTarget = (v: string) => { setFilterTarget(v); setCurrentPage(1); };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div style={s.card} className="p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
            <Input placeholder="Ara..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} className="pl-10" style={s.input} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Select value={filterAction} onValueChange={handleFilterAction}>
              <SelectTrigger className="text-xs h-9" style={s.input}><SelectValue placeholder="İşlem Türü" /></SelectTrigger>
              <SelectContent style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                <SelectItem value="all">Tüm İşlemler</SelectItem>
                {uniqueActions.map(a => (<SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterAdmin} onValueChange={handleFilterAdmin}>
              <SelectTrigger className="text-xs h-9" style={s.input}><SelectValue placeholder="Kullanıcı" /></SelectTrigger>
              <SelectContent style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                <SelectItem value="all">Tüm Kullanıcılar</SelectItem>
                {uniqueAdmins.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterTarget} onValueChange={handleFilterTarget}>
              <SelectTrigger className="text-xs h-9 col-span-2 md:col-span-1" style={s.input}><SelectValue placeholder="Hedef Türü" /></SelectTrigger>
              <SelectContent style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                <SelectItem value="all">Tümü</SelectItem>
                {Object.entries(TARGET_TYPE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={s.muted}>{filtered.length} işlem</span>
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
          <Activity className="w-10 h-10 mx-auto mb-2" style={s.muted} />
          <p style={s.muted}>Henüz işlem kaydı bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((log) => {
            const color = getActionColor(log.action);
            const isExpanded = expandedId === log.id;
            return (
              <div key={log.id} style={s.card} className="p-3 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1 h-10 rounded-full mt-0.5 shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                      <Badge className="text-[10px] px-1.5 py-0 shrink-0" style={{ background: `${color}20`, color, borderColor: `${color}40` }}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                      <span className="text-xs font-medium truncate" style={s.text}>{log.admin_ad} {log.admin_soyad}</span>
                      <span className="text-[10px] px-1.5 py-0 rounded" style={{ ...s.muted, background: "hsl(var(--admin-hover))" }}>{log.admin_pozisyon}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-1 text-xs" style={s.muted}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" />{formatDate(log.created_at)}</span>
                      {log.target_type && (
                        <span className="flex items-center gap-1 truncate">
                          <Target className="w-3 h-3 shrink-0" />
                          {TARGET_TYPE_LABELS[log.target_type] || log.target_type}
                          {log.target_label && `: ${log.target_label}`}
                        </span>
                      )}
                    </div>
                    {isExpanded && log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-3 p-3 rounded-lg text-xs space-y-1 overflow-x-auto" style={{ background: "hsl(var(--admin-hover))" }}>
                        <div className="flex items-center gap-1 mb-2 font-medium" style={s.secondary}>
                          <FileText className="w-3 h-3" /> İşlem Detayları
                        </div>
                        {Object.entries(log.details).map(([key, val]) => (
                          <div key={key} className="flex gap-2">
                            <span className="font-medium min-w-[80px] md:min-w-[120px] shrink-0" style={s.secondary}>{key}:</span>
                            <span className="break-all" style={s.text}>{typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}</span>
                          </div>
                        ))}
                        {log.target_id && (
                          <div className="flex gap-2">
                            <span className="font-medium min-w-[80px] md:min-w-[120px] shrink-0" style={s.secondary}>Hedef ID:</span>
                            <span className="font-mono text-[10px] break-all" style={s.text}>{log.target_id}</span>
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
          <Button variant="ghost" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-xs" style={s.muted}>{safePage} / {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  );
}
