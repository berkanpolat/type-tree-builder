import { useState, useEffect } from "react";
import { startOfMonth } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportDateFilter, { DateRange } from "@/components/admin/reports/ReportDateFilter";
import ReportKPICard from "@/components/admin/reports/ReportKPICard";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, DollarSign, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";

export default function RaporHedefPrim() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(new Date()), to: new Date() });
  const [hedefler, setHedefler] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: h }, { data: u }] = await Promise.all([
      supabase.from("admin_hedefler")
        .select("*")
        .lte("baslangic_tarihi", dateRange.to.toISOString().split("T")[0])
        .gte("bitis_tarihi", dateRange.from.toISOString().split("T")[0]),
      supabase.from("admin_users").select("id, ad, soyad"),
    ]);
    setHedefler(h || []);
    setAdminUsers(u || []);
    setLoading(false);
  };

  const getAdminName = (id: string) => {
    const u = adminUsers.find((a: any) => a.id === id);
    return u ? `${u.ad} ${u.soyad}` : "Bilinmeyen";
  };

  const toplam = hedefler.length;
  const tamamlanan = hedefler.filter((h: any) => h.gerceklesen_miktar >= h.hedef_miktar).length;
  const toplamPrim = hedefler.reduce((acc: number, h: any) => {
    if (h.gerceklesen_miktar >= h.hedef_miktar && h.birim_basi_prim) {
      return acc + (h.gerceklesen_miktar * h.birim_basi_prim);
    }
    return acc;
  }, 0);

  // Per-person chart
  const personMap = new Map<string, { hedef: number; gerceklesen: number }>();
  hedefler.forEach((h: any) => {
    const name = getAdminName(h.hedef_admin_id);
    const existing = personMap.get(name) || { hedef: 0, gerceklesen: 0 };
    existing.hedef += h.hedef_miktar;
    existing.gerceklesen += h.gerceklesen_miktar;
    personMap.set(name, existing);
  });
  const chartData = Array.from(personMap.entries()).map(([name, stats]) => ({ name, ...stats }));

  const HEDEF_TURU_LABELS: Record<string, string> = {
    paket_uyeligi: "Paket Üyeliği",
    ciro: "Ciro",
    dis_arama: "Dış Arama",
    ziyaret: "Ziyaret",
  };

  return (
    <AdminLayout title="Hedef & Prim Raporları">
      <div className="space-y-6">
        <ReportDateFilter value={dateRange} onChange={setDateRange} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportKPICard title="Toplam Hedef" value={toplam} icon={Target} color="from-rose-500 to-pink-500" />
          <ReportKPICard title="Tamamlanan" value={tamamlanan} icon={TrendingUp} color="from-emerald-500 to-teal-500" />
          <ReportKPICard title="Başarı Oranı" value={toplam ? ((tamamlanan / toplam) * 100).toFixed(1) + "%" : "-"} icon={Award} color="from-violet-500 to-purple-500" />
          <ReportKPICard title="Toplam Prim" value={`$${toplamPrim.toLocaleString("tr-TR")}`} icon={DollarSign} color="from-orange-500 to-amber-500" />
        </div>

        <div className="rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: `hsl(var(--admin-text))` }}>Personel Hedef Karşılaştırması</h3>
          <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 45)}>
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
              <Tooltip />
              <Legend />
              <Bar dataKey="hedef" name="Hedef" fill="#8b5cf6" radius={[0,4,4,0]} />
              <Bar dataKey="gerceklesen" name="Gerçekleşen" fill="#10b981" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <div className="p-4 border-b" style={{ borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold" style={{ color: `hsl(var(--admin-text))` }}>Hedef Detayları</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Personel</th>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Hedef Türü</th>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Başlık</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Hedef</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Gerçekleşen</th>
                  <th className="p-3 font-medium min-w-[120px]" style={{ color: `hsl(var(--admin-muted))` }}>İlerleme</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Prim/Birim</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Yükleniyor...</td></tr>
                ) : hedefler.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Veri bulunamadı</td></tr>
                ) : (
                  hedefler.map((h: any) => {
                    const progress = h.hedef_miktar ? Math.min((h.gerceklesen_miktar / h.hedef_miktar) * 100, 100) : 0;
                    return (
                      <tr key={h.id} style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                        <td className="p-3 font-medium" style={{ color: `hsl(var(--admin-text))` }}>{getAdminName(h.hedef_admin_id)}</td>
                        <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{HEDEF_TURU_LABELS[h.hedef_turu] || h.hedef_turu}</td>
                        <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{h.baslik}</td>
                        <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{h.hedef_miktar}</td>
                        <td className="p-3 text-right font-semibold" style={{ color: `hsl(var(--admin-text))` }}>{h.gerceklesen_miktar}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-[10px] font-medium" style={{ color: `hsl(var(--admin-muted))` }}>{progress.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{h.birim_basi_prim ? `$${h.birim_basi_prim}` : "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
