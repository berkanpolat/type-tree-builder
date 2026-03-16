import { useState, useEffect } from "react";
import { startOfMonth } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportDateFilter, { DateRange } from "@/components/admin/reports/ReportDateFilter";
import ReportKPICard from "@/components/admin/reports/ReportKPICard";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, ClipboardList, MapPin, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function RaporPersonelPerformans() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(new Date()), to: new Date() });
  const [aksiyonlar, setAksiyonlar] = useState<any[]>([]);
  const [ziyaretler, setZiyaretler] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: a }, { data: z }, { data: u }] = await Promise.all([
      supabase.from("admin_aksiyonlar")
        .select("admin_id, sonuc, tur, tarih")
        .gte("tarih", dateRange.from.toISOString())
        .lte("tarih", dateRange.to.toISOString()),
      supabase.from("admin_ziyaret_planlari")
        .select("admin_id, durum, planlanan_tarih")
        .gte("planlanan_tarih", dateRange.from.toISOString().split("T")[0])
        .lte("planlanan_tarih", dateRange.to.toISOString().split("T")[0]),
      supabase.from("admin_users").select("id, ad, soyad, departman, pozisyon"),
    ]);
    setAksiyonlar(a || []);
    setZiyaretler(z || []);
    setAdminUsers(u || []);
    setLoading(false);
  };

  // Build per-person stats
  const personStats = adminUsers.map((u: any) => {
    const myAks = aksiyonlar.filter((a: any) => a.admin_id === u.id);
    const myZiy = ziyaretler.filter((z: any) => z.admin_id === u.id);
    const satislar = myAks.filter((a: any) => a.sonuc === "satis_kapandi").length;
    return {
      name: `${u.ad} ${u.soyad}`,
      departman: u.departman,
      aksiyonSayisi: myAks.length,
      ziyaretSayisi: myZiy.length,
      tamamlananZiyaret: myZiy.filter((z: any) => z.durum === "tamamlandi").length,
      satisSayisi: satislar,
    };
  }).filter(p => p.aksiyonSayisi > 0 || p.ziyaretSayisi > 0).sort((a, b) => b.satisSayisi - a.satisSayisi);

  const topPerformer = personStats[0];

  return (
    <AdminLayout title="Personel Performans Raporları">
      <div className="space-y-6">
        <ReportDateFilter value={dateRange} onChange={setDateRange} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportKPICard title="Toplam Aksiyon" value={aksiyonlar.length} icon={ClipboardList} color="from-violet-500 to-purple-500" />
          <ReportKPICard title="Toplam Ziyaret" value={ziyaretler.length} icon={MapPin} color="from-blue-500 to-cyan-500" />
          <ReportKPICard title="Toplam Satış" value={aksiyonlar.filter((a: any) => a.sonuc === "satis_kapandi").length} icon={TrendingUp} color="from-emerald-500 to-teal-500" />
          <ReportKPICard title="En İyi Personel" value={topPerformer?.name || "-"} subtitle={topPerformer ? `${topPerformer.satisSayisi} satış` : undefined} icon={UserCheck} color="from-orange-500 to-amber-500" />
        </div>

        <div className="rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: `hsl(var(--admin-text))` }}>Personel Karşılaştırması</h3>
          <ResponsiveContainer width="100%" height={Math.max(300, personStats.length * 40)}>
            <BarChart data={personStats} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
              <Tooltip />
              <Legend />
              <Bar dataKey="aksiyonSayisi" name="Aksiyon" fill="#8b5cf6" radius={[0,4,4,0]} />
              <Bar dataKey="ziyaretSayisi" name="Ziyaret" fill="#3b82f6" radius={[0,4,4,0]} />
              <Bar dataKey="satisSayisi" name="Satış" fill="#10b981" radius={[0,4,4,0]} />
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
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Satış</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Başarı %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Yükleniyor...</td></tr>
                ) : personStats.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Veri bulunamadı</td></tr>
                ) : (
                  personStats.map((p, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                      <td className="p-3 font-medium" style={{ color: `hsl(var(--admin-text))` }}>{p.name}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{p.departman}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{p.aksiyonSayisi}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{p.ziyaretSayisi}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{p.tamamlananZiyaret}</td>
                      <td className="p-3 text-right font-semibold" style={{ color: `hsl(var(--admin-text))` }}>{p.satisSayisi}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>
                        {p.aksiyonSayisi ? ((p.satisSayisi / p.aksiyonSayisi) * 100).toFixed(1) + "%" : "-"}
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
