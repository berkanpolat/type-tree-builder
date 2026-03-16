import { useState, useEffect, useCallback } from "react";
import { startOfMonth } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportDateFilter, { DateRange } from "@/components/admin/reports/ReportDateFilter";
import ReportKPICard from "@/components/admin/reports/ReportKPICard";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, ClipboardList, MapPin, TrendingUp, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const SUCCESS_RESULTS = new Set(["satis_kapatildi", "satis_kapandi"]);

export default function RaporPersonelPerformans() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(new Date()), to: new Date() });
  const [aksiyonlar, setAksiyonlar] = useState<any[]>([]);
  const [ziyaretler, setZiyaretler] = useState<any[]>([]);
  const [paketAtamalar, setPaketAtamalar] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [{ data: a }, { data: z }, { data: u }, { data: p }] = await Promise.all([
      supabase.from("admin_aksiyonlar")
        .select("admin_id, sonuc, tur, tarih, sonuc_paket_id")
        .gte("tarih", dateRange.from.toISOString())
        .lte("tarih", dateRange.to.toISOString()),
      supabase.from("admin_ziyaret_planlari")
        .select("admin_id, durum, planlanan_tarih")
        .gte("planlanan_tarih", dateRange.from.toISOString().split("T")[0])
        .lte("planlanan_tarih", dateRange.to.toISOString().split("T")[0]),
      supabase.from("admin_users").select("id, ad, soyad, departman, pozisyon"),
      supabase.from("admin_activity_log")
        .select("admin_id, created_at, target_label")
        .eq("action", "update-firma-paket")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString()),
    ]);

    setAksiyonlar(a || []);
    setZiyaretler(z || []);
    setAdminUsers(u || []);
    setPaketAtamalar(p || []);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("rapor-personel-performans-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_aksiyonlar" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_ziyaret_planlari" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_activity_log" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const successfulAksiyonlar = aksiyonlar.filter((item: any) => SUCCESS_RESULTS.has(item.sonuc) || !!item.sonuc_paket_id);

  const personStats = adminUsers
    .map((user: any) => {
      const myAksiyonlar = aksiyonlar.filter((item: any) => item.admin_id === user.id);
      const myZiyaretler = ziyaretler.filter((item: any) => item.admin_id === user.id);
      const myPaketAtamalar = paketAtamalar.filter((item: any) => item.admin_id === user.id);
      const aksiyonSatisSayisi = myAksiyonlar.filter((item: any) => SUCCESS_RESULTS.has(item.sonuc) || !!item.sonuc_paket_id).length;
      const paketSatisSayisi = myPaketAtamalar.length;
      const toplamSatis = aksiyonSatisSayisi + paketSatisSayisi;

      return {
        name: `${user.ad} ${user.soyad}`,
        departman: user.departman,
        aksiyonSayisi: myAksiyonlar.length,
        ziyaretSayisi: myZiyaretler.length,
        tamamlananZiyaret: myZiyaretler.filter((item: any) => item.durum === "tamamlandi").length,
        aksiyonSatisSayisi,
        paketSatisSayisi,
        toplamSatis,
      };
    })
    .filter((item) => item.aksiyonSayisi > 0 || item.ziyaretSayisi > 0 || item.toplamSatis > 0)
    .sort((a, b) => b.toplamSatis - a.toplamSatis);

  const topPerformer = personStats[0];
  const totalAksiyonSatis = successfulAksiyonlar.length;
  const totalPaketSatis = paketAtamalar.length;
  const totalSatis = totalAksiyonSatis + totalPaketSatis;

  return (
    <AdminLayout title="Personel Performans Raporları">
      <div className="space-y-6">
        <ReportDateFilter value={dateRange} onChange={setDateRange} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <ReportKPICard title="Toplam Aksiyon" value={aksiyonlar.length} icon={ClipboardList} color="from-violet-500 to-purple-500" />
          <ReportKPICard title="Toplam Ziyaret" value={ziyaretler.length} icon={MapPin} color="from-blue-500 to-cyan-500" />
          <ReportKPICard title="Toplam Satış" value={totalSatis} subtitle={`Aksiyon: ${totalAksiyonSatis} | Paket: ${totalPaketSatis}`} icon={TrendingUp} color="from-emerald-500 to-teal-500" />
          <ReportKPICard title="Paket Tanımlama" value={totalPaketSatis} icon={Package} color="from-orange-500 to-amber-500" />
          <ReportKPICard title="En İyi Personel" value={topPerformer?.name || "-"} subtitle={topPerformer ? `${topPerformer.toplamSatis} satış` : undefined} icon={UserCheck} color="from-rose-500 to-pink-500" />
        </div>

        <div className="rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: `hsl(var(--admin-text))` }}>Personel Karşılaştırması</h3>
          <ResponsiveContainer width="100%" height={Math.max(300, personStats.length * 40)}>
            <BarChart data={personStats} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="aksiyonSayisi" name="Aksiyon" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="ziyaretSayisi" name="Ziyaret" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="aksiyonSatisSayisi" name="Aksiyon Satışı" fill="#10b981" radius={[0, 4, 4, 0]} />
              <Bar dataKey="paketSatisSayisi" name="Paket Tanımlama" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <div className="p-4 border-b" style={{ borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold" style={{ color: `hsl(var(--admin-text))` }}>Detaylı Performans Tablosu</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Personel</th>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Departman</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Aksiyon</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Ziyaret</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Tam. Ziyaret</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Aks. Satış</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Paket Tanım.</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Toplam Satış</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Başarı %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Yükleniyor...</td></tr>
                ) : personStats.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Veri bulunamadı</td></tr>
                ) : (
                  personStats.map((item, index) => (
                    <tr key={index} style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                      <td className="p-3 font-medium" style={{ color: `hsl(var(--admin-text))` }}>{item.name}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{item.departman}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{item.aksiyonSayisi}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{item.ziyaretSayisi}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{item.tamamlananZiyaret}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{item.aksiyonSatisSayisi}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{item.paketSatisSayisi}</td>
                      <td className="p-3 text-right font-semibold" style={{ color: `hsl(var(--admin-text))` }}>{item.toplamSatis}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>
                        {item.aksiyonSayisi ? ((item.toplamSatis / item.aksiyonSayisi) * 100).toFixed(1) + "%" : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
