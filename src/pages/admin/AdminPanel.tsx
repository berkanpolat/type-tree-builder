import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2, Gavel, Package, HeadphonesIcon, MessageSquareWarning, ShoppingBag,
  Users, Clock, CheckCircle, XCircle, FileText, Eye, Wifi, CalendarDays
} from "lucide-react";

type TimeFilter = "all" | "24h" | "7d" | "30d";
interface DateRange { from: string; to: string; }

function statColor(val: number) {
  if (val < 5) return "text-red-500";
  if (val <= 20) return "text-yellow-500";
  return "text-emerald-500";
}

const inputStyle = {
  background: "hsl(var(--admin-input-bg))",
  borderColor: "hsl(var(--admin-border))",
  color: "hsl(var(--admin-text))",
};

function TimeFilterSelect({ value, onChange }: { value: TimeFilter; onChange: (v: TimeFilter) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeFilter)}>
      <SelectTrigger className="w-[140px] h-8 text-xs" style={inputStyle}><SelectValue /></SelectTrigger>
      <SelectContent className="z-[300]" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
        <SelectItem value="all" className="text-xs" style={{ color: "hsl(var(--admin-text))" }}>Tümü</SelectItem>
        <SelectItem value="24h" className="text-xs" style={{ color: "hsl(var(--admin-text))" }}>Son 24 Saat</SelectItem>
        <SelectItem value="7d" className="text-xs" style={{ color: "hsl(var(--admin-text))" }}>Son 1 Hafta</SelectItem>
        <SelectItem value="30d" className="text-xs" style={{ color: "hsl(var(--admin-text))" }}>Son 1 Ay</SelectItem>
      </SelectContent>
    </Select>
  );
}

function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays className="w-4 h-4 shrink-0 hidden sm:block" style={{ color: "hsl(var(--admin-muted))" }} />
      <Input type="date" value={value.from} onChange={e => onChange({ ...value, from: e.target.value })} className="h-8 text-xs w-[120px] sm:w-[130px]" style={inputStyle} />
      <span className="text-xs" style={{ color: "hsl(var(--admin-muted))" }}>—</span>
      <Input type="date" value={value.to} onChange={e => onChange({ ...value, to: e.target.value })} className="h-8 text-xs w-[120px] sm:w-[130px]" style={inputStyle} />
      {(value.from || value.to) && (
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-red-400 hover:text-red-300" onClick={() => onChange({ from: "", to: "" })}>
          <XCircle className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, onClick }: { title: string; value: number; icon: any; color: string; onClick?: () => void }) {
  return (
    <Card
      style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))", cursor: onClick ? "pointer" : "default" }}
      className={onClick ? "hover:opacity-80 transition-opacity" : ""}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium" style={{ color: "hsl(var(--admin-text-secondary))" }}>{title}</CardTitle>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${statColor(value)}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function DistributionList({ items }: { items: { name: string; count: number }[] | undefined | null }) {
  const safeItems = Array.isArray(items)
    ? items.filter((item): item is { name: string; count: number } => Boolean(item && typeof item.name === "string" && typeof item.count === "number"))
    : [];
  const sorted = [...safeItems].sort((a, b) => b.count - a.count);
  if (sorted.length === 0) return <p className="text-xs" style={{ color: "hsl(var(--admin-muted))" }}>Veri yok</p>;
  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {sorted.map(item => (
        <div key={item.name} className="flex items-center justify-between text-xs">
          <span className="truncate mr-2" style={{ color: "hsl(var(--admin-text))" }}>{item.name}</span>
          <span className={`font-semibold ${statColor(item.count)}`}>{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function SectionFilters({ timeFilter, onTimeChange, dateRange, onDateChange }: {
  timeFilter: TimeFilter; onTimeChange: (v: TimeFilter) => void;
  dateRange: DateRange; onDateChange: (v: DateRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TimeFilterSelect value={timeFilter} onChange={onTimeChange} />
      <DateRangeFilter value={dateRange} onChange={onDateChange} />
    </div>
  );
}

const emptyDateRange: DateRange = { from: "", to: "" };

export default function AdminPanel() {
  const { user, token } = useAdminAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);

  // Per-section filters
  const [firmaFilter, setFirmaFilter] = useState<TimeFilter>("all");
  const [ihaleFilter, setIhaleFilter] = useState<TimeFilter>("all");
  const [urunFilter, setUrunFilter] = useState<TimeFilter>("all");
  const [paketFilter, setPaketFilter] = useState<TimeFilter>("all");
  const [destekFilter, setDestekFilter] = useState<TimeFilter>("all");
  const [sikayetFilter, setSikayetFilter] = useState<TimeFilter>("all");

  const [firmaDateRange, setFirmaDateRange] = useState<DateRange>(emptyDateRange);
  const [ihaleDateRange, setIhaleDateRange] = useState<DateRange>(emptyDateRange);
  const [urunDateRange, setUrunDateRange] = useState<DateRange>(emptyDateRange);
  const [paketDateRange, setPaketDateRange] = useState<DateRange>(emptyDateRange);
  const [destekDateRange, setDestekDateRange] = useState<DateRange>(emptyDateRange);
  const [sikayetDateRange, setSikayetDateRange] = useState<DateRange>(emptyDateRange);

  // Debounce filter changes to avoid excessive API calls
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildFilters = useCallback(() => ({
    firma: { time: firmaFilter, dateRange: firmaDateRange.from || firmaDateRange.to ? firmaDateRange : undefined },
    ihale: { time: ihaleFilter, dateRange: ihaleDateRange.from || ihaleDateRange.to ? ihaleDateRange : undefined },
    urun: { time: urunFilter, dateRange: urunDateRange.from || urunDateRange.to ? urunDateRange : undefined },
    paket: { time: paketFilter, dateRange: paketDateRange.from || paketDateRange.to ? paketDateRange : undefined },
    destek: { time: destekFilter, dateRange: destekDateRange.from || destekDateRange.to ? destekDateRange : undefined },
    sikayet: { time: sikayetFilter, dateRange: sikayetDateRange.from || sikayetDateRange.to ? sikayetDateRange : undefined },
  }), [firmaFilter, ihaleFilter, urunFilter, paketFilter, destekFilter, sikayetFilter, firmaDateRange, ihaleDateRange, urunDateRange, paketDateRange, destekDateRange, sikayetDateRange]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const { data: res, error } = await supabase.functions.invoke("admin-auth", {
        body: { action: "panel-stats", token, filters: buildFilters() },
      });
      if (!error && res) {
        setData(res);
        setOnlineCount(res.firma?.online || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [token, buildFilters]);

  // Initial load
  useEffect(() => {
    if (token) fetchStats();
  }, [fetchStats]);

  // Debounced re-fetch on filter change (skip initial)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchStats(), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [firmaFilter, ihaleFilter, urunFilter, paketFilter, destekFilter, sikayetFilter, firmaDateRange, ihaleDateRange, urunDateRange, paketDateRange, destekDateRange, sikayetDateRange]);

  // Online count polling - every 60 seconds
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      try {
        const { data: res } = await supabase.functions.invoke("admin-auth", {
          body: { action: "online-count", token },
        });
        if (res?.online !== undefined) setOnlineCount(res.online);
      } catch {}
    }, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  // Navigation helpers
  const goFirmalar = (filter?: string) => navigate(`/yonetim/firmalar${filter ? `?durum=${filter}` : ""}`);
  const goIhaleler = (filter?: string) => navigate(`/yonetim/ihaleler${filter ? `?durum=${filter}` : ""}`);
  const goUrunler = (filter?: string) => navigate(`/yonetim/urunler${filter ? `?durum=${filter}` : ""}`);
  const goDestek = (filter?: string) => navigate(`/yonetim/destek${filter ? `?durum=${filter}` : ""}`);
  const goSikayetler = (filter?: string) => navigate(`/yonetim/sikayetler${filter ? `?durum=${filter}` : ""}`);

  if (loading) {
    return (
      <AdminLayout title="Panel Özeti">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  const cardStyle = { background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" };

  return (
    <AdminLayout title="Panel Özeti">
      <div className="space-y-6 md:space-y-8">
        {/* Welcome */}
        <div className="rounded-xl p-4 md:p-6" style={{ background: "linear-gradient(to right, hsla(30,90%,55%,0.1), hsla(25,90%,55%,0.1))", border: "1px solid hsla(30,90%,55%,0.2)" }}>
          <h2 className="text-lg md:text-xl font-bold" style={{ color: "hsl(var(--admin-text))" }}>
            Hoş geldiniz, {user?.ad} {user?.soyad}
          </h2>
          <p className="mt-1" style={{ color: "hsl(var(--admin-text-secondary))" }}>
            {user?.is_primary ? "Ana Yönetici" : user?.pozisyon} olarak giriş yaptınız.
          </p>
        </div>

        {/* ═══ FİRMA ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><Building2 className="w-5 h-5 text-blue-500" /> Firma</h3>
            <SectionFilters timeFilter={firmaFilter} onTimeChange={setFirmaFilter} dateRange={firmaDateRange} onDateChange={setFirmaDateRange} />
          </div>
          {data?.firma && (<>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <StatCard title="Toplam Kayıtlı Firma" value={data.firma.toplam} icon={Building2} color="from-blue-500 to-blue-600" onClick={() => goFirmalar()} />
              <StatCard title="Onay Bekleyen" value={data.firma.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goFirmalar("onay_bekliyor")} />
              <StatCard title="Çevrimiçi" value={onlineCount} icon={Wifi} color="from-emerald-500 to-emerald-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Firma Türü Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={data.firma.turDagilimi || []} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Firma Tipi Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={data.firma.tipDagilimi || []} /></CardContent></Card>
            </div>
          </>)}
        </section>

        {/* ═══ İHALE ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><Gavel className="w-5 h-5 text-emerald-500" /> İhale</h3>
            <SectionFilters timeFilter={ihaleFilter} onTimeChange={setIhaleFilter} dateRange={ihaleDateRange} onDateChange={setIhaleDateRange} />
          </div>
          {data?.ihale && (<>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4">
              <StatCard title="Toplam" value={data.ihale.toplam} icon={Gavel} color="from-emerald-500 to-emerald-600" onClick={() => goIhaleler()} />
              <StatCard title="Aktif" value={data.ihale.aktif} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goIhaleler("devam_ediyor")} />
              <StatCard title="Tamamlanan" value={data.ihale.tamamlanan} icon={CheckCircle} color="from-teal-500 to-teal-600" onClick={() => goIhaleler("tamamlandi")} />
              <StatCard title="İptal" value={data.ihale.iptal} icon={XCircle} color="from-red-500 to-red-600" onClick={() => goIhaleler("iptal")} />
              <StatCard title="Onay Bekleyen" value={data.ihale.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goIhaleler("onay_bekliyor")} />
              <StatCard title="Reddedilen" value={data.ihale.reddedilen} icon={XCircle} color="from-orange-500 to-orange-600" onClick={() => goIhaleler("reddedildi")} />
              <StatCard title="Taslak" value={data.ihale.taslak} icon={FileText} color="from-slate-400 to-slate-500" onClick={() => goIhaleler("taslak")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Ürün Kategorisi Bazlı</CardTitle></CardHeader><CardContent><DistributionList items={data.ihale.urunKatDist || []} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Hizmet Kategorisi Bazlı</CardTitle></CardHeader><CardContent><DistributionList items={data.ihale.hizmetKatDist || []} /></CardContent></Card>
            </div>
          </>)}
        </section>

        {/* ═══ PAZAR ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><ShoppingBag className="w-5 h-5 text-purple-500" /> Pazar</h3>
            <SectionFilters timeFilter={urunFilter} onTimeChange={setUrunFilter} dateRange={urunDateRange} onDateChange={setUrunDateRange} />
          </div>
          {data?.urun && (<>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <StatCard title="Toplam" value={data.urun.toplam} icon={ShoppingBag} color="from-purple-500 to-purple-600" onClick={() => goUrunler()} />
              <StatCard title="Aktif" value={data.urun.aktif} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goUrunler("aktif")} />
              <StatCard title="Pasif" value={data.urun.pasif} icon={XCircle} color="from-slate-400 to-slate-500" onClick={() => goUrunler("pasif")} />
              <StatCard title="Onay Bekleyen" value={data.urun.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goUrunler("onay_bekliyor")} />
              <StatCard title="Reddedilen" value={data.urun.reddedilen} icon={XCircle} color="from-red-500 to-red-600" onClick={() => goUrunler("reddedildi")} />
              <StatCard title="Taslak" value={data.urun.taslak} icon={FileText} color="from-slate-400 to-slate-500" onClick={() => goUrunler("taslak")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Ürün Kategorisi Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={data.urun.katDist || []} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Ürün Türü Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={data.urun.turDist || []} /></CardContent></Card>
            </div>
          </>)}
        </section>

        {/* ═══ PAKET ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><Package className="w-5 h-5 text-amber-500" /> Paket</h3>
            <SectionFilters timeFilter={paketFilter} onTimeChange={setPaketFilter} dateRange={paketDateRange} onDateChange={setPaketDateRange} />
          </div>
          {data?.paket && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Paket Abone Sayısı</CardTitle></CardHeader><CardContent><DistributionList items={data.paket.paketDist || []} /></CardContent></Card>
            </div>
          )}
        </section>

        {/* ═══ DESTEK ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><HeadphonesIcon className="w-5 h-5 text-cyan-500" /> Destek</h3>
            <SectionFilters timeFilter={destekFilter} onTimeChange={setDestekFilter} dateRange={destekDateRange} onDateChange={setDestekDateRange} />
          </div>
          {data?.destek && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Toplam Destek Talebi" value={data.destek.toplam} icon={HeadphonesIcon} color="from-cyan-500 to-cyan-600" onClick={() => goDestek()} />
              <StatCard title="Çözülen" value={data.destek.cozulen} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goDestek("cozuldu")} />
              <StatCard title="İncelenen" value={data.destek.incelenen} icon={Eye} color="from-yellow-500 to-yellow-600" onClick={() => goDestek("inceleniyor")} />
            </div>
          )}
        </section>

        {/* ═══ ŞİKAYET ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><MessageSquareWarning className="w-5 h-5 text-red-500" /> Şikayet</h3>
            <SectionFilters timeFilter={sikayetFilter} onTimeChange={setSikayetFilter} dateRange={sikayetDateRange} onDateChange={setSikayetDateRange} />
          </div>
          {data?.sikayet && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
              <StatCard title="Toplam" value={data.sikayet.toplam} icon={MessageSquareWarning} color="from-red-500 to-red-600" onClick={() => goSikayetler()} />
              <StatCard title="Mesaj" value={data.sikayet.mesaj} icon={MessageSquareWarning} color="from-blue-500 to-blue-600" onClick={() => goSikayetler("mesaj")} />
              <StatCard title="İhale" value={data.sikayet.ihale} icon={Gavel} color="from-emerald-500 to-emerald-600" onClick={() => goSikayetler("ihale")} />
              <StatCard title="Profil" value={data.sikayet.profil} icon={Users} color="from-purple-500 to-purple-600" onClick={() => goSikayetler("profil")} />
              <StatCard title="Ürün" value={data.sikayet.urun} icon={ShoppingBag} color="from-orange-500 to-orange-600" onClick={() => goSikayetler("urun")} />
              <StatCard title="Beklemede" value={data.sikayet.beklemede} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goSikayetler("beklemede")} />
              <StatCard title="Çözüldü" value={data.sikayet.cozuldu} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goSikayetler("cozuldu")} />
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
