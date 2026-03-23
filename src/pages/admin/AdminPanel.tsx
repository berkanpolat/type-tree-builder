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
      // Direct RPC call — no Edge Function needed
      const { data: res } = await supabase.rpc("admin_panel_stats_v2");
      if (res) {
        setData(res);
        setOnlineCount((res as any)?.firma?.online || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

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
        const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).gt("last_seen", new Date(Date.now() - 15 * 60 * 1000).toISOString());
        if (count !== null) setOnlineCount(count);
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

  const panelData = {
    firma: {
      toplam: Number(data?.firma?.toplam ?? 0),
      onay_bekleyen: Number(data?.firma?.onay_bekleyen ?? 0),
      turDagilimi: Array.isArray(data?.firma?.turDagilimi) ? data.firma.turDagilimi : [],
      tipDagilimi: Array.isArray(data?.firma?.tipDagilimi) ? data.firma.tipDagilimi : [],
    },
    ihale: {
      toplam: Number(data?.ihale?.toplam ?? 0),
      aktif: Number(data?.ihale?.aktif ?? 0),
      tamamlanan: Number(data?.ihale?.tamamlanan ?? 0),
      iptal: Number(data?.ihale?.iptal ?? 0),
      onay_bekleyen: Number(data?.ihale?.onay_bekleyen ?? 0),
      reddedilen: Number(data?.ihale?.reddedilen ?? 0),
      taslak: Number(data?.ihale?.taslak ?? 0),
      urunKatDist: Array.isArray(data?.ihale?.urunKatDist) ? data.ihale.urunKatDist : [],
      hizmetKatDist: Array.isArray(data?.ihale?.hizmetKatDist) ? data.ihale.hizmetKatDist : [],
    },
    urun: {
      toplam: Number(data?.urun?.toplam ?? 0),
      aktif: Number(data?.urun?.aktif ?? 0),
      pasif: Number(data?.urun?.pasif ?? 0),
      onay_bekleyen: Number(data?.urun?.onay_bekleyen ?? 0),
      reddedilen: Number(data?.urun?.reddedilen ?? 0),
      taslak: Number(data?.urun?.taslak ?? 0),
      katDist: Array.isArray(data?.urun?.katDist) ? data.urun.katDist : [],
      turDist: Array.isArray(data?.urun?.turDist) ? data.urun.turDist : [],
    },
    paket: {
      paketDist: Array.isArray(data?.paket?.paketDist) ? data.paket.paketDist : [],
    },
    destek: {
      toplam: Number(data?.destek?.toplam ?? 0),
      cozulen: Number(data?.destek?.cozulen ?? 0),
      incelenen: Number(data?.destek?.incelenen ?? 0),
    },
    sikayet: {
      toplam: Number(data?.sikayet?.toplam ?? 0),
      mesaj: Number(data?.sikayet?.mesaj ?? 0),
      ihale: Number(data?.sikayet?.ihale ?? 0),
      profil: Number(data?.sikayet?.profil ?? 0),
      urun: Number(data?.sikayet?.urun ?? 0),
      beklemede: Number(data?.sikayet?.beklemede ?? 0),
      cozuldu: Number(data?.sikayet?.cozuldu ?? 0),
    },
  };

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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <StatCard title="Toplam Kayıtlı Firma" value={panelData.firma.toplam} icon={Building2} color="from-blue-500 to-blue-600" onClick={() => goFirmalar()} />
              <StatCard title="Onay Bekleyen" value={panelData.firma.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goFirmalar("onay_bekliyor")} />
              <StatCard title="Çevrimiçi" value={onlineCount} icon={Wifi} color="from-emerald-500 to-emerald-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Firma Türü Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={panelData.firma.turDagilimi} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Firma Tipi Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={panelData.firma.tipDagilimi} /></CardContent></Card>
            </div>
          </>
        </section>

        {/* ═══ İHALE ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><Gavel className="w-5 h-5 text-emerald-500" /> İhale</h3>
            <SectionFilters timeFilter={ihaleFilter} onTimeChange={setIhaleFilter} dateRange={ihaleDateRange} onDateChange={setIhaleDateRange} />
          </div>
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4">
              <StatCard title="Toplam" value={panelData.ihale.toplam} icon={Gavel} color="from-emerald-500 to-emerald-600" onClick={() => goIhaleler()} />
              <StatCard title="Aktif" value={panelData.ihale.aktif} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goIhaleler("devam_ediyor")} />
              <StatCard title="Tamamlanan" value={panelData.ihale.tamamlanan} icon={CheckCircle} color="from-teal-500 to-teal-600" onClick={() => goIhaleler("tamamlandi")} />
              <StatCard title="İptal" value={panelData.ihale.iptal} icon={XCircle} color="from-red-500 to-red-600" onClick={() => goIhaleler("iptal")} />
              <StatCard title="Onay Bekleyen" value={panelData.ihale.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goIhaleler("onay_bekliyor")} />
              <StatCard title="Reddedilen" value={panelData.ihale.reddedilen} icon={XCircle} color="from-orange-500 to-orange-600" onClick={() => goIhaleler("reddedildi")} />
              <StatCard title="Taslak" value={panelData.ihale.taslak} icon={FileText} color="from-slate-400 to-slate-500" onClick={() => goIhaleler("taslak")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Ürün Kategorisi Bazlı</CardTitle></CardHeader><CardContent><DistributionList items={panelData.ihale.urunKatDist} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Hizmet Kategorisi Bazlı</CardTitle></CardHeader><CardContent><DistributionList items={panelData.ihale.hizmetKatDist} /></CardContent></Card>
            </div>
          </>
        </section>

        {/* ═══ PAZAR ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><ShoppingBag className="w-5 h-5 text-purple-500" /> Pazar</h3>
            <SectionFilters timeFilter={urunFilter} onTimeChange={setUrunFilter} dateRange={urunDateRange} onDateChange={setUrunDateRange} />
          </div>
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <StatCard title="Toplam" value={panelData.urun.toplam} icon={ShoppingBag} color="from-purple-500 to-purple-600" onClick={() => goUrunler()} />
              <StatCard title="Aktif" value={panelData.urun.aktif} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goUrunler("aktif")} />
              <StatCard title="Pasif" value={panelData.urun.pasif} icon={XCircle} color="from-slate-400 to-slate-500" onClick={() => goUrunler("pasif")} />
              <StatCard title="Onay Bekleyen" value={panelData.urun.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goUrunler("onay_bekliyor")} />
              <StatCard title="Reddedilen" value={panelData.urun.reddedilen} icon={XCircle} color="from-red-500 to-red-600" onClick={() => goUrunler("reddedildi")} />
              <StatCard title="Taslak" value={panelData.urun.taslak} icon={FileText} color="from-slate-400 to-slate-500" onClick={() => goUrunler("taslak")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Ürün Kategorisi Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={panelData.urun.katDist} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Ürün Türü Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={panelData.urun.turDist} /></CardContent></Card>
            </div>
          </>
        </section>

        {/* ═══ PAKET ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><Package className="w-5 h-5 text-amber-500" /> Paket</h3>
            <SectionFilters timeFilter={paketFilter} onTimeChange={setPaketFilter} dateRange={paketDateRange} onDateChange={setPaketDateRange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Paket Abone Sayısı</CardTitle></CardHeader><CardContent><DistributionList items={panelData.paket.paketDist} /></CardContent></Card>
          </div>
        </section>

        {/* ═══ DESTEK ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><HeadphonesIcon className="w-5 h-5 text-cyan-500" /> Destek</h3>
            <SectionFilters timeFilter={destekFilter} onTimeChange={setDestekFilter} dateRange={destekDateRange} onDateChange={setDestekDateRange} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Toplam Destek Talebi" value={panelData.destek.toplam} icon={HeadphonesIcon} color="from-cyan-500 to-cyan-600" onClick={() => goDestek()} />
            <StatCard title="Çözülen" value={panelData.destek.cozulen} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goDestek("cozuldu")} />
            <StatCard title="İncelenen" value={panelData.destek.incelenen} icon={Eye} color="from-yellow-500 to-yellow-600" onClick={() => goDestek("inceleniyor")} />
          </div>
        </section>

        {/* ═══ ŞİKAYET ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><MessageSquareWarning className="w-5 h-5 text-red-500" /> Şikayet</h3>
            <SectionFilters timeFilter={sikayetFilter} onTimeChange={setSikayetFilter} dateRange={sikayetDateRange} onDateChange={setSikayetDateRange} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
            <StatCard title="Toplam" value={panelData.sikayet.toplam} icon={MessageSquareWarning} color="from-red-500 to-red-600" onClick={() => goSikayetler()} />
            <StatCard title="Mesaj" value={panelData.sikayet.mesaj} icon={MessageSquareWarning} color="from-blue-500 to-blue-600" onClick={() => goSikayetler("mesaj")} />
            <StatCard title="İhale" value={panelData.sikayet.ihale} icon={Gavel} color="from-emerald-500 to-emerald-600" onClick={() => goSikayetler("ihale")} />
            <StatCard title="Profil" value={panelData.sikayet.profil} icon={Users} color="from-purple-500 to-purple-600" onClick={() => goSikayetler("profil")} />
            <StatCard title="Ürün" value={panelData.sikayet.urun} icon={ShoppingBag} color="from-orange-500 to-orange-600" onClick={() => goSikayetler("urun")} />
            <StatCard title="Beklemede" value={panelData.sikayet.beklemede} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goSikayetler("beklemede")} />
            <StatCard title="Çözüldü" value={panelData.sikayet.cozuldu} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goSikayetler("cozuldu")} />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
