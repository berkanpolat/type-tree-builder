import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Building2, Gavel, Package, HeadphonesIcon, MessageSquareWarning, ShoppingBag,
  Users, Clock, CheckCircle, XCircle, FileText, Eye, Wifi, CalendarDays
} from "lucide-react";

type TimeFilter = "all" | "24h" | "7d" | "30d";

interface DateRange {
  from: string;
  to: string;
}

function filterByTime<T extends { created_at: string }>(items: T[], filter: TimeFilter, dateRange?: DateRange): T[] {
  let result = items;

  // Date range filter takes priority if set
  if (dateRange?.from || dateRange?.to) {
    result = result.filter(i => {
      const d = new Date(i.created_at);
      if (dateRange.from && d < new Date(dateRange.from)) return false;
      if (dateRange.to && d > new Date(dateRange.to + "T23:59:59")) return false;
      return true;
    });
    return result;
  }

  if (filter === "all") return result;
  const now = new Date();
  const ms = filter === "24h" ? 86400000 : filter === "7d" ? 604800000 : 2592000000;
  const threshold = new Date(now.getTime() - ms);
  return result.filter(i => new Date(i.created_at) >= threshold);
}

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
      <SelectTrigger className="w-[140px] h-8 text-xs" style={inputStyle}>
        <SelectValue />
      </SelectTrigger>
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
      <Input
        type="date"
        value={value.from}
        onChange={e => onChange({ ...value, from: e.target.value })}
        className="h-8 text-xs w-[120px] sm:w-[130px]"
        style={inputStyle}
      />
      <span className="text-xs" style={{ color: "hsl(var(--admin-muted))" }}>—</span>
      <Input
        type="date"
        value={value.to}
        onChange={e => onChange({ ...value, to: e.target.value })}
        className="h-8 text-xs w-[120px] sm:w-[130px]"
        style={inputStyle}
      />
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

function DistributionList({ items }: { items: { name: string; count: number }[] }) {
  const sorted = [...items].sort((a, b) => b.count - a.count);
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
    <div className="flex flex-wrap items-center gap-3">
      <TimeFilterSelect value={timeFilter} onChange={onTimeChange} />
      <DateRangeFilter value={dateRange} onChange={onDateChange} />
    </div>
  );
}

export default function AdminPanel() {
  const { user, token } = useAdminAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [firmaFilter, setFirmaFilter] = useState<TimeFilter>("all");
  const [ihaleFilter, setIhaleFilter] = useState<TimeFilter>("all");
  const [urunFilter, setUrunFilter] = useState<TimeFilter>("all");
  const [paketFilter, setPaketFilter] = useState<TimeFilter>("all");
  const [destekFilter, setDestekFilter] = useState<TimeFilter>("all");
  const [sikayetFilter, setSikayetFilter] = useState<TimeFilter>("all");

  const [firmaDateRange, setFirmaDateRange] = useState<DateRange>({ from: "", to: "" });
  const [ihaleDateRange, setIhaleDateRange] = useState<DateRange>({ from: "", to: "" });
  const [urunDateRange, setUrunDateRange] = useState<DateRange>({ from: "", to: "" });
  const [paketDateRange, setPaketDateRange] = useState<DateRange>({ from: "", to: "" });
  const [destekDateRange, setDestekDateRange] = useState<DateRange>({ from: "", to: "" });
  const [sikayetDateRange, setSikayetDateRange] = useState<DateRange>({ from: "", to: "" });

  // Firma tipi dağılımı için firma türü filtresi
  const [firmaTipTurFilter, setFirmaTipTurFilter] = useState<string>("all");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke("admin-auth/panel-stats", {
          body: { token },
        });
        if (!error && res) setData(res);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const firmaComputed = useMemo(() => {
    if (!data?.firma) return null;
    const items = filterByTime(data.firma.items, firmaFilter, firmaDateRange);
    const tipItems = firmaTipTurFilter === "all"
      ? items
      : items.filter((f: any) => f.firma_turu_id === firmaTipTurFilter);
    return {
      toplam: items.length,
      onay_bekleyen: items.filter((f: any) => f.onay_durumu === "onay_bekliyor").length,
      online: data.firma.online || 0,
      turDagilimi: (data.firma.turler || []).map((t: any) => ({ name: t.name, count: items.filter((f: any) => f.firma_turu_id === t.id).length })),
      tipDagilimi: (data.firma.tipler || []).map((t: any) => {
        if (firmaTipTurFilter !== "all" && t.firma_turu_id !== firmaTipTurFilter) return null;
        return { name: t.name, count: tipItems.filter((f: any) => f.firma_tipi_id === t.id).length };
      }).filter(Boolean) as { name: string; count: number }[],
    };
  }, [data, firmaFilter, firmaDateRange, firmaTipTurFilter]);

  const ihaleComputed = useMemo(() => {
    if (!data?.ihale) return null;
    const items = filterByTime(data.ihale.items, ihaleFilter, ihaleDateRange);
    const byStatus = (s: string) => items.filter((i: any) => i.durum === s).length;
    const groupBy = (field: string) => Object.entries(
      items.filter((i: any) => i[field]).reduce((acc: Record<string, number>, i: any) => {
        const name = data.kategoriMap?.[i[field]] || i[field];
        acc[name] = (acc[name] || 0) + 1; return acc;
      }, {})
    ).map(([name, count]) => ({ name, count: count as number }));

    const firmaItems = data.firma?.items || [];
    const userFirmaMap: Record<string, any> = {};
    for (const f of firmaItems) userFirmaMap[f.user_id || f.id] = f;
    const ihaleUserIds = [...new Set(items.map((i: any) => i.user_id))];

    return {
      toplam: items.length, aktif: byStatus("devam_ediyor"), tamamlanan: byStatus("tamamlandi"),
      iptal: byStatus("iptal"), onay_bekleyen: byStatus("onay_bekliyor"), reddedilen: byStatus("reddedildi"),
      taslak: byStatus("taslak") + byStatus("duzenleniyor"),
      urunKatDist: groupBy("urun_kategori_id"), hizmetKatDist: groupBy("hizmet_kategori_id"),
      firmaTurDist: (data.firma?.turler || []).map((t: any) => ({ name: t.name, count: ihaleUserIds.filter((uid: string) => userFirmaMap[uid]?.firma_turu_id === t.id).length })),
      firmaTipDist: (data.firma?.tipler || []).map((t: any) => ({ name: t.name, count: ihaleUserIds.filter((uid: string) => userFirmaMap[uid]?.firma_tipi_id === t.id).length })),
    };
  }, [data, ihaleFilter, ihaleDateRange]);

  const urunComputed = useMemo(() => {
    if (!data?.urun) return null;
    const items = filterByTime(data.urun.items, urunFilter, urunDateRange);
    const byStatus = (s: string) => items.filter((i: any) => i.durum === s).length;
    const groupBy = (field: string) => Object.entries(
      items.filter((i: any) => i[field]).reduce((acc: Record<string, number>, i: any) => {
        const name = data.kategoriMap?.[i[field]] || i[field]; acc[name] = (acc[name] || 0) + 1; return acc;
      }, {})
    ).map(([name, count]) => ({ name, count: count as number }));
    return {
      toplam: items.length, aktif: byStatus("aktif"), pasif: byStatus("pasif"),
      onay_bekleyen: byStatus("onay_bekliyor"), reddedilen: byStatus("reddedildi"), taslak: byStatus("taslak"),
      katDist: groupBy("urun_kategori_id"), turDist: groupBy("urun_tur_id"),
    };
  }, [data, urunFilter, urunDateRange]);

  const paketComputed = useMemo(() => {
    if (!data?.paket) return null;
    const abonelikler = filterByTime(data.paket.abonelikler, paketFilter, paketDateRange).filter((a: any) => a.durum === "aktif");
    const subFirmalar = data.paket.subFirmalar || [];
    const subFirmaMap: Record<string, any> = {};
    for (const f of subFirmalar) subFirmaMap[f.user_id] = f;
    const subUserIds = abonelikler.map((a: any) => a.user_id);
    return {
      paketDist: (data.paket.paketler || []).map((p: any) => ({ name: p.ad, count: abonelikler.filter((a: any) => a.paket_id === p.id).length })),
      turDist: (data.firma?.turler || []).map((t: any) => ({ name: t.name, count: subUserIds.filter((uid: string) => subFirmaMap[uid]?.firma_turu_id === t.id).length })),
      tipDist: (data.firma?.tipler || []).map((t: any) => ({ name: t.name, count: subUserIds.filter((uid: string) => subFirmaMap[uid]?.firma_tipi_id === t.id).length })),
    };
  }, [data, paketFilter, paketDateRange]);

  const destekComputed = useMemo(() => {
    if (!data?.destek) return null;
    const items = filterByTime(data.destek.items, destekFilter, destekDateRange);
    return { toplam: items.length, cozulen: items.filter((i: any) => i.durum === "cozuldu").length, incelenen: items.filter((i: any) => i.durum === "inceleniyor").length };
  }, [data, destekFilter, destekDateRange]);

  const sikayetComputed = useMemo(() => {
    if (!data?.sikayet) return null;
    const items = filterByTime(data.sikayet.items, sikayetFilter, sikayetDateRange);
    return {
      toplam: items.length, mesaj: items.filter((i: any) => i.tur === "mesaj").length,
      ihale: items.filter((i: any) => i.tur === "ihale").length, profil: items.filter((i: any) => i.tur === "profil").length,
      urun: items.filter((i: any) => i.tur === "urun").length, beklemede: items.filter((i: any) => i.durum === "beklemede").length,
      cozuldu: items.filter((i: any) => i.durum === "cozuldu").length,
    };
  }, [data, sikayetFilter, sikayetDateRange]);

  // Navigation helpers
  const goFirmalar = (filter?: string) => {
    const params = filter ? `?durum=${filter}` : "";
    navigate(`/yonetim/firmalar${params}`);
  };
  const goIhaleler = (filter?: string) => {
    const params = filter ? `?durum=${filter}` : "";
    navigate(`/yonetim/ihaleler${params}`);
  };
  const goUrunler = (filter?: string) => {
    const params = filter ? `?durum=${filter}` : "";
    navigate(`/yonetim/urunler${params}`);
  };
  const goDestek = (filter?: string) => {
    const params = filter ? `?durum=${filter}` : "";
    navigate(`/yonetim/destek${params}`);
  };
  const goSikayetler = (filter?: string) => {
    const params = filter ? `?durum=${filter}` : "";
    navigate(`/yonetim/sikayetler${params}`);
  };

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
          {firmaComputed && (<>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <StatCard title="Toplam Kayıtlı Firma" value={firmaComputed.toplam} icon={Building2} color="from-blue-500 to-blue-600" onClick={() => goFirmalar()} />
              <StatCard title="Onay Bekleyen" value={firmaComputed.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goFirmalar("onay_bekliyor")} />
              <StatCard title="Çevrimiçi" value={firmaComputed.online} icon={Wifi} color="from-emerald-500 to-emerald-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Firma Türü Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={firmaComputed.turDagilimi} /></CardContent></Card>
              <Card style={cardStyle}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Firma Tipi Dağılımı</CardTitle>
                  <Select value={firmaTipTurFilter} onValueChange={setFirmaTipTurFilter}>
                    <SelectTrigger className="w-[140px] h-7 text-[11px]" style={inputStyle}><SelectValue placeholder="Firma Türü" /></SelectTrigger>
                    <SelectContent className="z-[300]" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                      <SelectItem value="all" className="text-xs" style={{ color: "hsl(var(--admin-text))" }}>Tüm Türler</SelectItem>
                      {(data?.firma?.turler || []).map((t: any) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs" style={{ color: "hsl(var(--admin-text))" }}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent><DistributionList items={firmaComputed.tipDagilimi} /></CardContent>
              </Card>
            </div>
          </>)}
        </section>

        {/* ═══ İHALE ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><Gavel className="w-5 h-5 text-emerald-500" /> İhale</h3>
            <SectionFilters timeFilter={ihaleFilter} onTimeChange={setIhaleFilter} dateRange={ihaleDateRange} onDateChange={setIhaleDateRange} />
          </div>
          {ihaleComputed && (<>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
              <StatCard title="Toplam" value={ihaleComputed.toplam} icon={Gavel} color="from-emerald-500 to-emerald-600" onClick={() => goIhaleler()} />
              <StatCard title="Aktif" value={ihaleComputed.aktif} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goIhaleler("devam_ediyor")} />
              <StatCard title="Tamamlanan" value={ihaleComputed.tamamlanan} icon={CheckCircle} color="from-teal-500 to-teal-600" onClick={() => goIhaleler("tamamlandi")} />
              <StatCard title="İptal" value={ihaleComputed.iptal} icon={XCircle} color="from-red-500 to-red-600" onClick={() => goIhaleler("iptal")} />
              <StatCard title="Onay Bekleyen" value={ihaleComputed.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goIhaleler("onay_bekliyor")} />
              <StatCard title="Reddedilen" value={ihaleComputed.reddedilen} icon={XCircle} color="from-orange-500 to-orange-600" onClick={() => goIhaleler("reddedildi")} />
              <StatCard title="Taslak" value={ihaleComputed.taslak} icon={FileText} color="from-slate-400 to-slate-500" onClick={() => goIhaleler("taslak")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Ürün Kategorisi Bazlı</CardTitle></CardHeader><CardContent><DistributionList items={ihaleComputed.urunKatDist} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Hizmet Kategorisi Bazlı</CardTitle></CardHeader><CardContent><DistributionList items={ihaleComputed.hizmetKatDist} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Firma Türü Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={ihaleComputed.firmaTurDist} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Firma Tipi Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={ihaleComputed.firmaTipDist} /></CardContent></Card>
            </div>
          </>)}
        </section>

        {/* ═══ PAZAR ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><ShoppingBag className="w-5 h-5 text-purple-500" /> Pazar</h3>
            <SectionFilters timeFilter={urunFilter} onTimeChange={setUrunFilter} dateRange={urunDateRange} onDateChange={setUrunDateRange} />
          </div>
          {urunComputed && (<>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <StatCard title="Toplam" value={urunComputed.toplam} icon={ShoppingBag} color="from-purple-500 to-purple-600" onClick={() => goUrunler()} />
              <StatCard title="Aktif" value={urunComputed.aktif} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goUrunler("aktif")} />
              <StatCard title="Pasif" value={urunComputed.pasif} icon={XCircle} color="from-slate-400 to-slate-500" onClick={() => goUrunler("pasif")} />
              <StatCard title="Onay Bekleyen" value={urunComputed.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goUrunler("onay_bekliyor")} />
              <StatCard title="Reddedilen" value={urunComputed.reddedilen} icon={XCircle} color="from-red-500 to-red-600" onClick={() => goUrunler("reddedildi")} />
              <StatCard title="Taslak" value={urunComputed.taslak} icon={FileText} color="from-slate-400 to-slate-500" onClick={() => goUrunler("taslak")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Ürün Kategorisi Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={urunComputed.katDist} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Ürün Türü Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={urunComputed.turDist} /></CardContent></Card>
            </div>
          </>)}
        </section>

        {/* ═══ PAKET ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><Package className="w-5 h-5 text-amber-500" /> Paket</h3>
            <SectionFilters timeFilter={paketFilter} onTimeChange={setPaketFilter} dateRange={paketDateRange} onDateChange={setPaketDateRange} />
          </div>
          {paketComputed && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Paket Abone Sayısı</CardTitle></CardHeader><CardContent><DistributionList items={paketComputed.paketDist} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Firma Türü Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={paketComputed.turDist} /></CardContent></Card>
              <Card style={cardStyle}><CardHeader className="pb-2"><CardTitle className="text-sm" style={{ color: "hsl(var(--admin-text-secondary))" }}>Firma Tipi Dağılımı</CardTitle></CardHeader><CardContent><DistributionList items={paketComputed.tipDist} /></CardContent></Card>
            </div>
          )}
        </section>

        {/* ═══ DESTEK ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><HeadphonesIcon className="w-5 h-5 text-cyan-500" /> Destek</h3>
            <SectionFilters timeFilter={destekFilter} onTimeChange={setDestekFilter} dateRange={destekDateRange} onDateChange={setDestekDateRange} />
          </div>
          {destekComputed && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Toplam Destek Talebi" value={destekComputed.toplam} icon={HeadphonesIcon} color="from-cyan-500 to-cyan-600" onClick={() => goDestek()} />
              <StatCard title="Çözülen" value={destekComputed.cozulen} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goDestek("cozuldu")} />
              <StatCard title="İncelenen" value={destekComputed.incelenen} icon={Eye} color="from-yellow-500 to-yellow-600" onClick={() => goDestek("inceleniyor")} />
            </div>
          )}
        </section>

        {/* ═══ ŞİKAYET ═══ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}><MessageSquareWarning className="w-5 h-5 text-red-500" /> Şikayet</h3>
            <SectionFilters timeFilter={sikayetFilter} onTimeChange={setSikayetFilter} dateRange={sikayetDateRange} onDateChange={setSikayetDateRange} />
          </div>
          {sikayetComputed && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatCard title="Toplam" value={sikayetComputed.toplam} icon={MessageSquareWarning} color="from-red-500 to-red-600" onClick={() => goSikayetler()} />
              <StatCard title="Mesaj" value={sikayetComputed.mesaj} icon={MessageSquareWarning} color="from-blue-500 to-blue-600" onClick={() => goSikayetler("mesaj")} />
              <StatCard title="İhale" value={sikayetComputed.ihale} icon={Gavel} color="from-emerald-500 to-emerald-600" onClick={() => goSikayetler("ihale")} />
              <StatCard title="Profil" value={sikayetComputed.profil} icon={Users} color="from-purple-500 to-purple-600" onClick={() => goSikayetler("profil")} />
              <StatCard title="Ürün" value={sikayetComputed.urun} icon={ShoppingBag} color="from-orange-500 to-orange-600" onClick={() => goSikayetler("urun")} />
              <StatCard title="Beklemede" value={sikayetComputed.beklemede} icon={Clock} color="from-yellow-500 to-yellow-600" onClick={() => goSikayetler("beklemede")} />
              <StatCard title="Çözüldü" value={sikayetComputed.cozuldu} icon={CheckCircle} color="from-green-500 to-green-600" onClick={() => goSikayetler("cozuldu")} />
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
