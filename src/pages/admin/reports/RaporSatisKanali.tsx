import { useState, useEffect } from "react";
import { startOfMonth } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportDateFilter, { DateRange } from "@/components/admin/reports/ReportDateFilter";
import ReportKPICard from "@/components/admin/reports/ReportKPICard";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { TrendingUp, DollarSign, Users, BarChart3, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

interface SalesRecord {
  id: string;
  tarih: string;
  personel: string;
  departman: string;
  tur: string;
  baslik: string;
  kaynak: "aksiyon" | "paket_atama";
  paketAd?: string;
}

export default function RaporSatisKanali() {
  const { user } = useAdminAuth();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(new Date()), to: new Date() });
  const [data, setData] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch from both sources in parallel
    const [aksiyonRes, logRes] = await Promise.all([
      // 1) Aksiyonlar with sonuc = satis_kapandi
      supabase
        .from("admin_aksiyonlar")
        .select("id, tarih, baslik, tur, admin_users!admin_aksiyonlar_admin_id_fkey(ad, soyad, departman)")
        .gte("tarih", dateRange.from.toISOString())
        .lte("tarih", dateRange.to.toISOString())
        .eq("sonuc", "satis_kapandi"),
      // 2) Activity log for direct package assignments
      supabase
        .from("admin_activity_log")
        .select("id, created_at, admin_ad, admin_soyad, admin_pozisyon, target_label, details")
        .eq("action", "update-firma-paket")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString()),
    ]);

    const records: SalesRecord[] = [];

    // Map aksiyonlar
    (aksiyonRes.data || []).forEach((d: any) => {
      records.push({
        id: d.id,
        tarih: d.tarih,
        personel: `${d.admin_users?.ad || ""} ${d.admin_users?.soyad || ""}`.trim(),
        departman: d.admin_users?.departman || "Bilinmeyen",
        tur: d.tur || "Diğer",
        baslik: d.baslik,
        kaynak: "aksiyon",
      });
    });

    // Map activity log (direct package assignments)
    (logRes.data || []).forEach((d: any) => {
      records.push({
        id: d.id,
        tarih: d.created_at,
        personel: `${d.admin_ad || ""} ${d.admin_soyad || ""}`.trim(),
        departman: d.admin_pozisyon || "Yönetim",
        tur: "Paket Tanımlama",
        baslik: `Paket: ${d.target_label || "—"}`,
        kaynak: "paket_atama",
        paketAd: d.target_label || undefined,
      });
    });

    // Sort by date descending
    records.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());

    setData(records);
    setLoading(false);
  };

  // Group by department as "channel"
  const channelMap = new Map<string, number>();
  data.forEach((d) => {
    channelMap.set(d.departman, (channelMap.get(d.departman) || 0) + 1);
  });
  const chartData = Array.from(channelMap.entries()).map(([name, value]) => ({ name, value }));
  const totalSales = data.length;
  const aksiyonSales = data.filter(d => d.kaynak === "aksiyon").length;
  const paketSales = data.filter(d => d.kaynak === "paket_atama").length;

  // Group by tur (action type used as sub-channel)
  const turMap = new Map<string, number>();
  data.forEach((d) => {
    turMap.set(d.tur, (turMap.get(d.tur) || 0) + 1);
  });
  const turData = Array.from(turMap.entries()).map(([name, value]) => ({ name, value }));

  return (
    <AdminLayout title="Satış Kanalı Raporları">
      <div className="space-y-6">
        <ReportDateFilter value={dateRange} onChange={setDateRange} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <ReportKPICard title="Toplam Satış" value={totalSales} icon={TrendingUp} color="from-blue-500 to-cyan-500" />
          <ReportKPICard title="Aksiyon Satışı" value={aksiyonSales} icon={BarChart3} color="from-emerald-500 to-teal-500" />
          <ReportKPICard title="Paket Tanımlama" value={paketSales} icon={Package} color="from-amber-500 to-orange-500" />
          <ReportKPICard title="En Aktif Kanal" value={chartData.sort((a,b) => b.value - a.value)[0]?.name || "-"} icon={Users} color="from-violet-500 to-purple-500" />
          <ReportKPICard title="Ort. Satış/Kanal" value={channelMap.size ? Math.round(totalSales / channelMap.size) : 0} icon={DollarSign} color="from-rose-500 to-pink-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: `hsl(var(--admin-text))` }}>Departman Bazlı Satışlar</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: `hsl(var(--admin-text))` }}>Satış Türü Dağılımı</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={turData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {turData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detail table */}
        <div className="rounded-xl border overflow-hidden" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <div className="p-4 border-b" style={{ borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold" style={{ color: `hsl(var(--admin-text))` }}>Satış Detayları</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Tarih</th>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Personel</th>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Departman</th>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Tür</th>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Başlık</th>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Kaynak</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Yükleniyor...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Veri bulunamadı</td></tr>
                ) : (
                  data.slice(0, 100).map((d) => (
                    <tr key={d.id} style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{new Date(d.tarih).toLocaleDateString("tr-TR")}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{d.personel}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{d.departman}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{d.tur}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{d.baslik}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          d.kaynak === "aksiyon" 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {d.kaynak === "aksiyon" ? "Aksiyon" : "Paket Tanımlama"}
                        </span>
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
