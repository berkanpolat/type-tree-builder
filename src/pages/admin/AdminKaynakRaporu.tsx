import { useAdminTitle } from "@/components/admin/AdminLayout";
import { useEffect, useState, useMemo, CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Search as SearchIcon, Users, TrendingUp, BarChart3,
  Instagram, Facebook, Linkedin, Twitter, Mail, ArrowUpRight,
  Monitor, Megaphone, HelpCircle, ChevronLeft, ChevronRight, Calendar
} from "lucide-react";

const s = {
  card: { background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))", borderRadius: "0.75rem" } as CSSProperties,
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
  secondary: { color: "hsl(var(--admin-text-secondary))" } as CSSProperties,
  input: { background: "hsl(var(--admin-input-bg))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" } as CSSProperties,
};

const KANAL_CONFIG: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  dogrudan: { label: "Doğrudan", icon: Monitor, color: "#6366f1" },
  organik_arama: { label: "Organik Arama", icon: SearchIcon, color: "#22c55e" },
  ucretli_arama: { label: "Ücretli Arama", icon: TrendingUp, color: "#f59e0b" },
  sosyal_medya: { label: "Sosyal Medya", icon: Users, color: "#ec4899" },
  ucretli_sosyal: { label: "Ücretli Sosyal", icon: Megaphone, color: "#f97316" },
  email: { label: "E-posta", icon: Mail, color: "#3b82f6" },
  yonlendirme: { label: "Yönlendirme", icon: ArrowUpRight, color: "#14b8a6" },
  diger_kampanya: { label: "Diğer Kampanya", icon: BarChart3, color: "#8b5cf6" },
  diger: { label: "Diğer", icon: HelpCircle, color: "#94a3b8" },
};

type TimeFilter = "24h" | "7d" | "30d" | "90d" | "all";

interface VisitorRow {
  id: string;
  session_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  kanal: string;
  landing_page: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 25;

export default function AdminKaynakRaporu() {
  useAdminTitle("Kaynak Raporu");
  const [data, setData] = useState<VisitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");
  const [kanalFilter, setKanalFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("visitor_sources").select("*").order("created_at", { ascending: false }).limit(5000);

      if (timeFilter !== "all") {
        const d = new Date();
        if (timeFilter === "24h") d.setHours(d.getHours() - 24);
        else if (timeFilter === "7d") d.setDate(d.getDate() - 7);
        else if (timeFilter === "30d") d.setDate(d.getDate() - 30);
        else if (timeFilter === "90d") d.setDate(d.getDate() - 90);
        query = query.gte("created_at", d.toISOString());
      }

      const { data: rows } = await query;
      setData((rows as any) || []);
      setLoading(false);
    };
    fetch();
  }, [timeFilter]);

  const filtered = useMemo(() => {
    let result = data;
    if (kanalFilter !== "all") result = result.filter(r => r.kanal === kanalFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        (r.utm_source || "").toLowerCase().includes(q) ||
        (r.utm_campaign || "").toLowerCase().includes(q) ||
        (r.referrer || "").toLowerCase().includes(q) ||
        (r.landing_page || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, kanalFilter, search]);

  // Stats by kanal
  const kanalStats = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => { map[r.kanal] = (map[r.kanal] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Top sources
  const topSources = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => {
      const src = r.utm_source || (r.referrer ? (() => { try { return new URL(r.referrer).hostname; } catch { return "Bilinmiyor"; } })() : "Doğrudan");
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  // Top campaigns
  const topCampaigns = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => { if (r.utm_campaign) map[r.utm_campaign] = (map[r.utm_campaign] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  // Top landing pages
  const topPages = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => { if (r.landing_page) map[r.landing_page] = (map[r.landing_page] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const maxKanalCount = kanalStats.length > 0 ? kanalStats[0][1] : 1;

  return (
    <div className="space-y-4 md:space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div style={s.card} className="p-4 text-center">
            <Globe className="w-5 h-5 mx-auto mb-1" style={{ color: "#6366f1" }} />
            <div className="text-2xl font-bold" style={s.text}>{data.length}</div>
            <div className="text-xs" style={s.muted}>Toplam Ziyaret</div>
          </div>
          <div style={s.card} className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1" style={{ color: "#22c55e" }} />
            <div className="text-2xl font-bold" style={s.text}>{new Set(data.map(d => d.session_id)).size}</div>
            <div className="text-xs" style={s.muted}>Tekil Oturum</div>
          </div>
          <div style={s.card} className="p-4 text-center">
            <BarChart3 className="w-5 h-5 mx-auto mb-1" style={{ color: "#f59e0b" }} />
            <div className="text-2xl font-bold" style={s.text}>{kanalStats.length}</div>
            <div className="text-xs" style={s.muted}>Aktif Kanal</div>
          </div>
          <div style={s.card} className="p-4 text-center">
            <Megaphone className="w-5 h-5 mx-auto mb-1" style={{ color: "#ec4899" }} />
            <div className="text-2xl font-bold" style={s.text}>{topCampaigns.length}</div>
            <div className="text-xs" style={s.muted}>Kampanya</div>
          </div>
        </div>

        {/* Filters */}
        <div style={s.card} className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
              <Input placeholder="Kaynak, kampanya, URL ara..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-10" style={s.input} />
            </div>
            <Select value={timeFilter} onValueChange={v => { setTimeFilter(v as TimeFilter); setPage(1); }}>
              <SelectTrigger className="w-40 text-xs" style={s.input}><Calendar className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                <SelectItem value="24h">Son 24 Saat</SelectItem>
                <SelectItem value="7d">Son 7 Gün</SelectItem>
                <SelectItem value="30d">Son 30 Gün</SelectItem>
                <SelectItem value="90d">Son 90 Gün</SelectItem>
                <SelectItem value="all">Tüm Zamanlar</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kanalFilter} onValueChange={v => { setKanalFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44 text-xs" style={s.input}><SelectValue placeholder="Kanal" /></SelectTrigger>
              <SelectContent style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                <SelectItem value="all">Tüm Kanallar</SelectItem>
                {Object.entries(KANAL_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Kanal Breakdown - horizontal bars */}
        <div style={s.card} className="p-4 md:p-5">
          <h3 className="text-sm font-semibold mb-4" style={s.text}>Kanal Dağılımı</h3>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" /></div>
          ) : kanalStats.length === 0 ? (
            <p className="text-sm text-center py-4" style={s.muted}>Henüz veri yok</p>
          ) : (
            <div className="space-y-3">
              {kanalStats.map(([kanal, count]) => {
                const cfg = KANAL_CONFIG[kanal] || KANAL_CONFIG.diger;
                const Icon = cfg.icon;
                const pct = ((count / filtered.length) * 100).toFixed(1);
                const barWidth = Math.max(4, (count / maxKanalCount) * 100);
                return (
                  <div key={kanal} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                        <span className="text-xs font-medium" style={s.text}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: cfg.color }}>{count}</span>
                        <span className="text-[10px]" style={s.muted}>({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--admin-hover))" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barWidth}%`, background: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Two column: Top Sources + Top Campaigns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Sources */}
          <div style={s.card} className="p-4">
            <h3 className="text-sm font-semibold mb-3" style={s.text}>En Çok Ziyaretçi Getiren Kaynaklar</h3>
            {topSources.length === 0 ? (
              <p className="text-xs py-4 text-center" style={s.muted}>Veri yok</p>
            ) : (
              <div className="space-y-2">
                {topSources.map(([src, count], i) => (
                  <div key={src} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={i % 2 === 0 ? { background: "hsl(var(--admin-hover))" } : {}}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold w-5 text-center" style={s.muted}>{i + 1}</span>
                      <span className="text-xs truncate" style={s.text}>{src}</span>
                    </div>
                    <Badge className="text-[10px] px-1.5 shrink-0" style={{ background: "hsl(var(--admin-hover))", color: "hsl(var(--admin-text))", borderColor: "hsl(var(--admin-border))" }}>{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Campaigns */}
          <div style={s.card} className="p-4">
            <h3 className="text-sm font-semibold mb-3" style={s.text}>Aktif Kampanyalar</h3>
            {topCampaigns.length === 0 ? (
              <p className="text-xs py-4 text-center" style={s.muted}>Henüz kampanya verisi yok. UTM linklerinizde <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: "hsl(var(--admin-hover))" }}>utm_campaign</code> parametresi kullanın.</p>
            ) : (
              <div className="space-y-2">
                {topCampaigns.map(([camp, count], i) => (
                  <div key={camp} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={i % 2 === 0 ? { background: "hsl(var(--admin-hover))" } : {}}>
                    <span className="text-xs truncate" style={s.text}>{camp}</span>
                    <Badge className="text-[10px] px-1.5 shrink-0" style={{ background: "hsl(var(--admin-hover))", color: "hsl(var(--admin-text))", borderColor: "hsl(var(--admin-border))" }}>{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Landing Pages */}
        <div style={s.card} className="p-4">
          <h3 className="text-sm font-semibold mb-3" style={s.text}>En Çok Ziyaret Edilen Giriş Sayfaları</h3>
          {topPages.length === 0 ? (
            <p className="text-xs py-4 text-center" style={s.muted}>Veri yok</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {topPages.map(([pg, count], i) => (
                <div key={pg} className="flex items-center justify-between py-1.5 px-3 rounded-lg" style={{ background: "hsl(var(--admin-hover))" }}>
                  <span className="text-xs truncate" style={s.text}>{pg}</span>
                  <Badge className="text-[10px] px-1.5 shrink-0 ml-2" style={{ background: `${KANAL_CONFIG.dogrudan.color}20`, color: KANAL_CONFIG.dogrudan.color, borderColor: `${KANAL_CONFIG.dogrudan.color}40` }}>{count}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Visits Table */}
        <div style={s.card} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={s.text}>Son Ziyaretler</h3>
            <span className="text-xs" style={s.muted}>{filtered.length} kayıt</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
                      <th className="text-left py-2 px-2 font-medium" style={s.muted}>Kanal</th>
                      <th className="text-left py-2 px-2 font-medium" style={s.muted}>Kaynak</th>
                      <th className="text-left py-2 px-2 font-medium hidden md:table-cell" style={s.muted}>Kampanya</th>
                      <th className="text-left py-2 px-2 font-medium hidden md:table-cell" style={s.muted}>Giriş Sayfası</th>
                      <th className="text-left py-2 px-2 font-medium" style={s.muted}>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(row => {
                      const cfg = KANAL_CONFIG[row.kanal] || KANAL_CONFIG.diger;
                      return (
                        <tr key={row.id} style={{ borderBottom: "1px solid hsl(var(--admin-border) / 0.5)" }}>
                          <td className="py-2 px-2">
                            <Badge className="text-[10px] px-1.5" style={{ background: `${cfg.color}15`, color: cfg.color, borderColor: `${cfg.color}30` }}>{cfg.label}</Badge>
                          </td>
                          <td className="py-2 px-2 max-w-[120px] truncate" style={s.text}>{row.utm_source || (row.referrer ? (() => { try { return new URL(row.referrer).hostname; } catch { return "-"; } })() : "Doğrudan")}</td>
                          <td className="py-2 px-2 max-w-[100px] truncate hidden md:table-cell" style={s.secondary}>{row.utm_campaign || "-"}</td>
                          <td className="py-2 px-2 max-w-[120px] truncate hidden md:table-cell" style={s.secondary}>{row.landing_page || "-"}</td>
                          <td className="py-2 px-2 whitespace-nowrap" style={s.muted}>{new Date(row.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-3">
                  <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="p-1 rounded disabled:opacity-30" style={s.muted}><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs" style={s.muted}>{safePage} / {totalPages}</span>
                  <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="p-1 rounded disabled:opacity-30" style={s.muted}><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </>
          )}
        </div>

        {/* UTM Guide */}
        <div style={s.card} className="p-4 md:p-5">
          <h3 className="text-sm font-semibold mb-3" style={s.text}>📋 UTM Link Oluşturma Rehberi</h3>
          <div className="space-y-3 text-xs" style={s.secondary}>
            <p>Paylaştığınız her linke UTM parametreleri ekleyerek kaynakları doğru takip edin:</p>
            <div className="p-3 rounded-lg font-mono text-[11px] overflow-x-auto" style={{ background: "hsl(var(--admin-hover))" }}>
              <span style={s.text}>tekstilas.com</span><span style={{ color: "#22c55e" }}>?utm_source=</span><span style={{ color: "#f59e0b" }}>instagram</span><span style={{ color: "#22c55e" }}>&utm_medium=</span><span style={{ color: "#f59e0b" }}>social</span><span style={{ color: "#22c55e" }}>&utm_campaign=</span><span style={{ color: "#f59e0b" }}>mart_2026</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div className="p-2 rounded" style={{ background: "hsl(var(--admin-hover))" }}>
                <span className="font-semibold" style={s.text}>utm_source</span> — Kaynak (instagram, google, newsletter)
              </div>
              <div className="p-2 rounded" style={{ background: "hsl(var(--admin-hover))" }}>
                <span className="font-semibold" style={s.text}>utm_medium</span> — Ortam (social, cpc, email)
              </div>
              <div className="p-2 rounded" style={{ background: "hsl(var(--admin-hover))" }}>
                <span className="font-semibold" style={s.text}>utm_campaign</span> — Kampanya adı
              </div>
              <div className="p-2 rounded" style={{ background: "hsl(var(--admin-hover))" }}>
                <span className="font-semibold" style={s.text}>utm_content</span> — İçerik detayı (opsiyonel)
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
