import { useEffect, useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Gavel, Package, HeadphonesIcon, MessageSquareWarning, ShoppingBag,
  Users, Clock, CheckCircle, XCircle, AlertTriangle, FileText, Eye, Wifi
} from "lucide-react";

type TimeFilter = "all" | "24h" | "7d" | "30d";

function getTimeThreshold(filter: TimeFilter): Date | null {
  if (filter === "all") return null;
  const now = new Date();
  if (filter === "24h") return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (filter === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

function filterByTime<T extends { created_at: string }>(items: T[], filter: TimeFilter): T[] {
  const threshold = getTimeThreshold(filter);
  if (!threshold) return items;
  return items.filter(i => new Date(i.created_at) >= threshold);
}

function statColor(val: number) {
  if (val < 5) return "text-red-400";
  if (val <= 20) return "text-yellow-400";
  return "text-emerald-400";
}

function TimeFilterSelect({ value, onChange }: { value: TimeFilter; onChange: (v: TimeFilter) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeFilter)}>
      <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-700 border-slate-600 text-slate-200">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-slate-700 border-slate-600 z-[300]">
        <SelectItem value="all" className="text-slate-200 text-xs">Tümü</SelectItem>
        <SelectItem value="24h" className="text-slate-200 text-xs">Son 24 Saat</SelectItem>
        <SelectItem value="7d" className="text-slate-200 text-xs">Son 1 Hafta</SelectItem>
        <SelectItem value="30d" className="text-slate-200 text-xs">Son 1 Ay</SelectItem>
      </SelectContent>
    </Select>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-slate-400">{title}</CardTitle>
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
  const sorted = [...items].filter(i => i.count > 0).sort((a, b) => b.count - a.count);
  if (sorted.length === 0) return <p className="text-xs text-slate-500">Veri yok</p>;
  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {sorted.map(item => (
        <div key={item.name} className="flex items-center justify-between text-xs">
          <span className="text-slate-300 truncate mr-2">{item.name}</span>
          <span className={`font-semibold ${statColor(item.count)}`}>{item.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminPanel() {
  const { user, token } = useAdminAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Time filters per block
  const [firmaFilter, setFirmaFilter] = useState<TimeFilter>("all");
  const [ihaleFilter, setIhaleFilter] = useState<TimeFilter>("all");
  const [urunFilter, setUrunFilter] = useState<TimeFilter>("all");
  const [paketFilter, setPaketFilter] = useState<TimeFilter>("all");
  const [destekFilter, setDestekFilter] = useState<TimeFilter>("all");
  const [sikayetFilter, setSikayetFilter] = useState<TimeFilter>("all");

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

  // ── Firma computed ──
  const firmaComputed = useMemo(() => {
    if (!data?.firma) return null;
    const items = filterByTime(data.firma.items, firmaFilter);
    const turDagilimi = (data.firma.turler || []).map((t: any) => ({
      name: t.name,
      count: items.filter((f: any) => f.firma_turu_id === t.id).length,
    }));
    const tipDagilimi = (data.firma.tipler || []).map((t: any) => ({
      name: t.name,
      count: items.filter((f: any) => f.firma_tipi_id === t.id).length,
    }));
    return {
      toplam: items.length,
      onay_bekleyen: items.filter((f: any) => f.onay_durumu === "onay_bekliyor").length,
      online: firmaFilter === "all" ? data.firma.online : "—",
      turDagilimi,
      tipDagilimi,
    };
  }, [data, firmaFilter]);

  // ── İhale computed ──
  const ihaleComputed = useMemo(() => {
    if (!data?.ihale) return null;
    const items = filterByTime(data.ihale.items, ihaleFilter);
    const byStatus = (s: string) => items.filter((i: any) => i.durum === s).length;
    const urunKatDist = Object.entries(
      items.filter((i: any) => i.urun_kategori_id).reduce((acc: Record<string, number>, i: any) => {
        const name = data.kategoriMap?.[i.urun_kategori_id] || i.urun_kategori_id;
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count: count as number }));
    const hizmetKatDist = Object.entries(
      items.filter((i: any) => i.hizmet_kategori_id).reduce((acc: Record<string, number>, i: any) => {
        const name = data.kategoriMap?.[i.hizmet_kategori_id] || i.hizmet_kategori_id;
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count: count as number }));

    // Firma türü/tipi dağılımı for ihaleler
    const ihaleUserIds = [...new Set(items.map((i: any) => i.user_id))];
    const firmaItems = data.firma?.items || [];
    const turler = data.firma?.turler || [];
    const tipler = data.firma?.tipler || [];
    const ihaleFirmaTurDist = turler.map((t: any) => ({
      name: t.name,
      count: ihaleUserIds.filter((uid: string) => firmaItems.find((f: any) => f.id?.toString() === uid || f.user_id === uid)?.firma_turu_id === t.id).length,
    })).filter((x: any) => x.count > 0);
    // Simplified - map user_id to firma
    const userFirmaMap: Record<string, any> = {};
    for (const f of firmaItems) userFirmaMap[f.user_id || f.id] = f;
    const ihaleFirmaTipDist = tipler.map((t: any) => ({
      name: t.name,
      count: ihaleUserIds.filter((uid: string) => userFirmaMap[uid]?.firma_tipi_id === t.id).length,
    })).filter((x: any) => x.count > 0);

    return {
      toplam: items.length,
      aktif: byStatus("devam_ediyor"),
      tamamlanan: byStatus("tamamlandi"),
      iptal: byStatus("iptal"),
      onay_bekleyen: byStatus("onay_bekliyor"),
      reddedilen: byStatus("reddedildi"),
      taslak: byStatus("taslak") + byStatus("duzenleniyor"),
      urunKatDist,
      hizmetKatDist,
      firmaTurDist: ihaleFirmaTurDist,
      firmaTipDist: ihaleFirmaTipDist,
    };
  }, [data, ihaleFilter]);

  // ── Ürün computed ──
  const urunComputed = useMemo(() => {
    if (!data?.urun) return null;
    const items = filterByTime(data.urun.items, urunFilter);
    const byStatus = (s: string) => items.filter((i: any) => i.durum === s).length;
    const katDist = Object.entries(
      items.filter((i: any) => i.urun_kategori_id).reduce((acc: Record<string, number>, i: any) => {
        const name = data.kategoriMap?.[i.urun_kategori_id] || i.urun_kategori_id;
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count: count as number }));
    const turDist = Object.entries(
      items.filter((i: any) => i.urun_tur_id).reduce((acc: Record<string, number>, i: any) => {
        const name = data.kategoriMap?.[i.urun_tur_id] || i.urun_tur_id;
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, count]) => ({ name, count: count as number }));
    return {
      toplam: items.length,
      aktif: byStatus("aktif"),
      pasif: byStatus("pasif"),
      onay_bekleyen: byStatus("onay_bekliyor"),
      reddedilen: byStatus("reddedildi"),
      taslak: byStatus("taslak"),
      katDist,
      turDist,
    };
  }, [data, urunFilter]);

  // ── Paket computed ──
  const paketComputed = useMemo(() => {
    if (!data?.paket) return null;
    const abonelikler = filterByTime(data.paket.abonelikler, paketFilter).filter((a: any) => a.durum === "aktif");
    const paketler = data.paket.paketler || [];
    const subFirmalar = data.paket.subFirmalar || [];
    const turler = data.firma?.turler || [];
    const tipler = data.firma?.tipler || [];

    const paketDist = paketler.map((p: any) => ({
      name: p.ad,
      count: abonelikler.filter((a: any) => a.paket_id === p.id).length,
    }));

    // Firma türü/tipi dağılımı for subscribers
    const subUserIds = abonelikler.map((a: any) => a.user_id);
    const subFirmaMap: Record<string, any> = {};
    for (const f of subFirmalar) subFirmaMap[f.user_id] = f;

    const turDist = turler.map((t: any) => ({
      name: t.name,
      count: subUserIds.filter((uid: string) => subFirmaMap[uid]?.firma_turu_id === t.id).length,
    })).filter((x: any) => x.count > 0);

    const tipDist = tipler.map((t: any) => ({
      name: t.name,
      count: subUserIds.filter((uid: string) => subFirmaMap[uid]?.firma_tipi_id === t.id).length,
    })).filter((x: any) => x.count > 0);

    return { paketDist, turDist, tipDist };
  }, [data, paketFilter]);

  // ── Destek computed ──
  const destekComputed = useMemo(() => {
    if (!data?.destek) return null;
    const items = filterByTime(data.destek.items, destekFilter);
    return {
      toplam: items.length,
      cozulen: items.filter((i: any) => i.durum === "cozuldu").length,
      incelenen: items.filter((i: any) => i.durum === "inceleniyor").length,
    };
  }, [data, destekFilter]);

  // ── Şikayet computed ──
  const sikayetComputed = useMemo(() => {
    if (!data?.sikayet) return null;
    const items = filterByTime(data.sikayet.items, sikayetFilter);
    return {
      toplam: items.length,
      mesaj: items.filter((i: any) => i.tur === "mesaj").length,
      ihale: items.filter((i: any) => i.tur === "ihale").length,
      profil: items.filter((i: any) => i.tur === "profil").length,
      urun: items.filter((i: any) => i.tur === "urun").length,
      beklemede: items.filter((i: any) => i.durum === "beklemede").length,
      cozuldu: items.filter((i: any) => i.durum === "cozuldu").length,
    };
  }, [data, sikayetFilter]);

  if (loading) {
    return (
      <AdminLayout title="Panel Özeti">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Panel Özeti">
      <div className="space-y-8">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white">
            Hoş geldiniz, {user?.ad} {user?.soyad}
          </h2>
          <p className="text-slate-400 mt-1">
            {user?.is_primary ? "Ana Yönetici" : user?.pozisyon} olarak giriş yaptınız.
          </p>
        </div>

        {/* ═══ FİRMA BLOĞU ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-400" /> Firma</h3>
            <TimeFilterSelect value={firmaFilter} onChange={setFirmaFilter} />
          </div>
          {firmaComputed && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <StatCard title="Toplam Kayıtlı Firma" value={firmaComputed.toplam} icon={Building2} color="from-blue-500 to-blue-600" />
                <StatCard title="Onay Bekleyen" value={firmaComputed.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" />
                <StatCard title="Çevrimiçi" value={typeof firmaComputed.online === "number" ? firmaComputed.online : 0} icon={Wifi} color="from-emerald-500 to-emerald-600" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Firma Türü Dağılımı</CardTitle></CardHeader>
                  <CardContent><DistributionList items={firmaComputed.turDagilimi} /></CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Firma Tipi Dağılımı</CardTitle></CardHeader>
                  <CardContent><DistributionList items={firmaComputed.tipDagilimi} /></CardContent>
                </Card>
              </div>
            </>
          )}
        </section>

        {/* ═══ İHALE BLOĞU ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Gavel className="w-5 h-5 text-emerald-400" /> İhale</h3>
            <TimeFilterSelect value={ihaleFilter} onChange={setIhaleFilter} />
          </div>
          {ihaleComputed && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                <StatCard title="Toplam" value={ihaleComputed.toplam} icon={Gavel} color="from-emerald-500 to-emerald-600" />
                <StatCard title="Aktif" value={ihaleComputed.aktif} icon={CheckCircle} color="from-green-500 to-green-600" />
                <StatCard title="Tamamlanan" value={ihaleComputed.tamamlanan} icon={CheckCircle} color="from-teal-500 to-teal-600" />
                <StatCard title="İptal" value={ihaleComputed.iptal} icon={XCircle} color="from-red-500 to-red-600" />
                <StatCard title="Onay Bekleyen" value={ihaleComputed.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" />
                <StatCard title="Reddedilen" value={ihaleComputed.reddedilen} icon={XCircle} color="from-orange-500 to-orange-600" />
                <StatCard title="Taslak" value={ihaleComputed.taslak} icon={FileText} color="from-slate-500 to-slate-600" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Ürün Kategorisi Bazlı</CardTitle></CardHeader>
                  <CardContent><DistributionList items={ihaleComputed.urunKatDist} /></CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Hizmet Kategorisi Bazlı</CardTitle></CardHeader>
                  <CardContent><DistributionList items={ihaleComputed.hizmetKatDist} /></CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Firma Türü Dağılımı</CardTitle></CardHeader>
                  <CardContent><DistributionList items={ihaleComputed.firmaTurDist} /></CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Firma Tipi Dağılımı</CardTitle></CardHeader>
                  <CardContent><DistributionList items={ihaleComputed.firmaTipDist} /></CardContent>
                </Card>
              </div>
            </>
          )}
        </section>

        {/* ═══ ÜRÜNLER BLOĞU ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-purple-400" /> Ürünler</h3>
            <TimeFilterSelect value={urunFilter} onChange={setUrunFilter} />
          </div>
          {urunComputed && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <StatCard title="Toplam" value={urunComputed.toplam} icon={ShoppingBag} color="from-purple-500 to-purple-600" />
                <StatCard title="Aktif" value={urunComputed.aktif} icon={CheckCircle} color="from-green-500 to-green-600" />
                <StatCard title="Pasif" value={urunComputed.pasif} icon={XCircle} color="from-slate-500 to-slate-600" />
                <StatCard title="Onay Bekleyen" value={urunComputed.onay_bekleyen} icon={Clock} color="from-yellow-500 to-yellow-600" />
                <StatCard title="Reddedilen" value={urunComputed.reddedilen} icon={XCircle} color="from-red-500 to-red-600" />
                <StatCard title="Taslak" value={urunComputed.taslak} icon={FileText} color="from-slate-500 to-slate-600" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Ürün Kategorisi Dağılımı</CardTitle></CardHeader>
                  <CardContent><DistributionList items={urunComputed.katDist} /></CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Ürün Türü Dağılımı</CardTitle></CardHeader>
                  <CardContent><DistributionList items={urunComputed.turDist} /></CardContent>
                </Card>
              </div>
            </>
          )}
        </section>

        {/* ═══ PAKET BLOĞU ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Package className="w-5 h-5 text-amber-400" /> Paket</h3>
            <TimeFilterSelect value={paketFilter} onChange={setPaketFilter} />
          </div>
          {paketComputed && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Paket Abone Sayısı</CardTitle></CardHeader>
                <CardContent><DistributionList items={paketComputed.paketDist} /></CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Firma Türü Dağılımı</CardTitle></CardHeader>
                <CardContent><DistributionList items={paketComputed.turDist} /></CardContent>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Firma Tipi Dağılımı</CardTitle></CardHeader>
                <CardContent><DistributionList items={paketComputed.tipDist} /></CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* ═══ DESTEK BLOĞU ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><HeadphonesIcon className="w-5 h-5 text-cyan-400" /> Destek</h3>
            <TimeFilterSelect value={destekFilter} onChange={setDestekFilter} />
          </div>
          {destekComputed && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Toplam Destek Talebi" value={destekComputed.toplam} icon={HeadphonesIcon} color="from-cyan-500 to-cyan-600" />
              <StatCard title="Çözülen" value={destekComputed.cozulen} icon={CheckCircle} color="from-green-500 to-green-600" />
              <StatCard title="İncelenen" value={destekComputed.incelenen} icon={Eye} color="from-yellow-500 to-yellow-600" />
            </div>
          )}
        </section>

        {/* ═══ ŞİKAYET BLOĞU ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><MessageSquareWarning className="w-5 h-5 text-red-400" /> Şikayet</h3>
            <TimeFilterSelect value={sikayetFilter} onChange={setSikayetFilter} />
          </div>
          {sikayetComputed && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatCard title="Toplam" value={sikayetComputed.toplam} icon={MessageSquareWarning} color="from-red-500 to-red-600" />
              <StatCard title="Mesaj" value={sikayetComputed.mesaj} icon={MessageSquareWarning} color="from-blue-500 to-blue-600" />
              <StatCard title="İhale" value={sikayetComputed.ihale} icon={Gavel} color="from-emerald-500 to-emerald-600" />
              <StatCard title="Profil" value={sikayetComputed.profil} icon={Users} color="from-purple-500 to-purple-600" />
              <StatCard title="Ürün" value={sikayetComputed.urun} icon={ShoppingBag} color="from-orange-500 to-orange-600" />
              <StatCard title="Beklemede" value={sikayetComputed.beklemede} icon={Clock} color="from-yellow-500 to-yellow-600" />
              <StatCard title="Çözüldü" value={sikayetComputed.cozuldu} icon={CheckCircle} color="from-green-500 to-green-600" />
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
