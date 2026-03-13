import { useState, CSSProperties } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Activity, ChevronLeft, ChevronRight, X, Clock, User, FileText, Building2
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

interface UserActivity {
  id: string;
  type: string;
  action: string;
  user_id: string;
  user_name: string;
  firma_unvani: string;
  label: string;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  ihale_olusturdu: "İhale Oluşturdu",
  teklif_verdi: "Teklif Verdi",
  urun_ekledi: "Ürün Ekledi",
  sikayet_bildirdi: "Şikayet Bildirdi",
  destek_talebi_olusturdu: "Destek Talebi Oluşturdu",
  firma_kayit: "Firma Kaydı",
};

const TYPE_LABELS: Record<string, string> = {
  ihale: "İhale",
  teklif: "Teklif",
  urun: "Ürün",
  sikayet: "Şikayet",
  destek: "Destek",
  firma: "Firma",
};

function getTypeColor(type: string): string {
  switch (type) {
    case "ihale": return "#3b82f6";
    case "teklif": return "#8b5cf6";
    case "urun": return "#22c55e";
    case "sikayet": return "#ef4444";
    case "destek": return "#f59e0b";
    case "firma": return "#06b6d4";
    default: return "#6b7280";
  }
}

const DURUM_LABELS: Record<string, string> = {
  onay_bekliyor: "Onay Bekliyor",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
  reddedildi: "Reddedildi",
  duzenleniyor: "Düzenleniyor",
  aktif: "Aktif",
  pasif: "Pasif",
  inceleniyor: "İnceleniyor",
  cozuldu: "Çözüldü",
  kabul_edildi: "Kabul Edildi",
  onaylandi: "Onaylandı",
};

const ITEMS_PER_PAGE = 20;

const formatDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
});

interface UserActivityPanelProps {
  activities: UserActivity[];
  loading: boolean;
}

export default function UserActivityPanel({ activities, loading }: UserActivityPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = activities.filter(a => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !a.user_name.toLowerCase().includes(q) &&
        !a.firma_unvani.toLowerCase().includes(q) &&
        !a.label.toLowerCase().includes(q) &&
        !(ACTION_LABELS[a.action] || a.action).toLowerCase().includes(q)
      ) return false;
    }
    if (filterType !== "all" && a.type !== filterType) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const clearFilters = () => { setSearchTerm(""); setFilterType("all"); };
  const hasFilters = searchTerm || filterType !== "all";

  const handleSearch = (v: string) => { setSearchTerm(v); setCurrentPage(1); };
  const handleFilterType = (v: string) => { setFilterType(v); setCurrentPage(1); };

  // Stats
  const stats = {
    ihale: activities.filter(a => a.type === "ihale").length,
    teklif: activities.filter(a => a.type === "teklif").length,
    urun: activities.filter(a => a.type === "urun").length,
    sikayet: activities.filter(a => a.type === "sikayet").length,
    destek: activities.filter(a => a.type === "destek").length,
    firma: activities.filter(a => a.type === "firma").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(stats).map(([key, count]) => (
            <div key={key} style={s.card} className="p-2 text-center cursor-pointer hover:opacity-80" onClick={() => handleFilterType(filterType === key ? "all" : key)}>
              <div className="text-lg font-bold" style={{ color: getTypeColor(key) }}>{count}</div>
              <div className="text-[10px]" style={s.muted}>{TYPE_LABELS[key]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={s.card} className="p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
            <Input placeholder="Kullanıcı, firma veya işlem ara..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} className="pl-10" style={s.input} />
          </div>
          <div className="flex items-center justify-between">
            <Select value={filterType} onValueChange={handleFilterType}>
              <SelectTrigger className="text-xs h-9 w-48" style={s.input}><SelectValue placeholder="İşlem Türü" /></SelectTrigger>
              <SelectContent style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                <SelectItem value="all">Tüm İşlemler</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={s.muted}>{filtered.length} kayıt</span>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-400 hover:text-red-300 h-7 text-xs">
                  <X className="w-3 h-3 mr-1" /> Temizle
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      ) : paginated.length === 0 ? (
        <div style={s.card} className="p-8 text-center">
          <Activity className="w-10 h-10 mx-auto mb-2" style={s.muted} />
          <p style={s.muted}>Henüz kullanıcı aktivitesi bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((activity) => {
            const color = getTypeColor(activity.type);
            const isExpanded = expandedId === activity.id;
            return (
              <div key={activity.id} style={s.card} className="p-3 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedId(isExpanded ? null : activity.id)}>
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-1 h-10 rounded-full mt-0.5 shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                      <Badge className="text-[10px] px-1.5 py-0 shrink-0" style={{ background: `${color}20`, color, borderColor: `${color}40` }}>
                        {ACTION_LABELS[activity.action] || activity.action}
                      </Badge>
                      <span className="text-xs font-medium truncate" style={s.text}>{activity.user_name}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 shrink-0" style={s.muted} />
                      <span className="text-[11px] truncate" style={s.secondary}>{activity.firma_unvani}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-1 text-xs" style={s.muted}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" />{formatDate(activity.created_at)}</span>
                      <span className="flex items-center gap-1 truncate">
                        <FileText className="w-3 h-3 shrink-0" />
                        {activity.label}
                      </span>
                    </div>
                    {isExpanded && activity.details && Object.keys(activity.details).length > 0 && (
                      <div className="mt-3 p-3 rounded-lg text-xs space-y-1 overflow-x-auto" style={{ background: "hsl(var(--admin-hover))" }}>
                        <div className="flex items-center gap-1 mb-2 font-medium" style={s.secondary}>
                          <User className="w-3 h-3" /> Detaylar
                        </div>
                        {Object.entries(activity.details).map(([key, val]) => (
                          <div key={key} className="flex gap-2">
                            <span className="font-medium min-w-[80px] md:min-w-[120px] shrink-0" style={s.secondary}>{key}:</span>
                            <span className="break-all" style={s.text}>
                              {key === "durum" || key === "onay_durumu"
                                ? DURUM_LABELS[String(val)] || String(val)
                                : typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                            </span>
                          </div>
                        ))}
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
