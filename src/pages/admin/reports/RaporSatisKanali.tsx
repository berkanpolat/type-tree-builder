import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportDateFilter, { DateRange } from "@/components/admin/reports/ReportDateFilter";
import ReportKPICard from "@/components/admin/reports/ReportKPICard";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminApi } from "@/hooks/use-admin-api";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, Users, BarChart3, Package, ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TUR_CONFIG } from "@/lib/aksiyon-config";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
const SUCCESS_RESULTS = new Set(["satis_kapatildi", "satis_kapandi"]);

interface SalesRecord {
  id: string;
  tarih: string;
  personel: string;
  departman: string;
  tur: string;
  baslik: string;
  kaynak: "aksiyon" | "paket_atama";
}

export default function RaporSatisKanali() {
  const { token } = useAdminAuth();
  const callApi = useAdminApi();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(new Date()), to: new Date() });
  const [data, setData] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch aksiyonlar and admin list via edge function (bypasses RLS)
      const [aksiyonData, adminData] = await Promise.all([
        callApi("list-aksiyonlar", { token }),
        callApi("list-admin-users", { token }),
      ]);

      const allAksiyonlar = aksiyonData.aksiyonlar || [];
      const admins = adminData.users || [];
      const adminDepartmanMap = new Map(admins.map((a: any) => [a.id, a.departman || "Bilinmeyen"]));
      const adminNameMap = new Map(admins.map((a: any) => [a.id, `${a.ad} ${a.soyad}`]));

      const from = dateRange.from;
      const to = dateRange.to;

      const records: SalesRecord[] = [];

      // Filter aksiyonlar by date range and success
      allAksiyonlar
        .filter((item: any) => {
          const t = new Date(item.tarih);
          return t >= from && t <= to && (SUCCESS_RESULTS.has(item.sonuc) || !!item.sonuc_paket_id);
        })
        .forEach((item: any) => {
          records.push({
            id: item.id,
            tarih: item.tarih,
            personel: item.admin_ad || adminNameMap.get(item.admin_id) || "Bilinmeyen",
            departman: (adminDepartmanMap.get(item.admin_id) as string) || "Bilinmeyen",
            tur: TUR_CONFIG[item.tur]?.label || item.tur || "Diğer",
            baslik: item.baslik || "Satış",
            kaynak: "aksiyon",
          });
        });

      // Fetch activity log for paket assignments (this table may also lack RLS)
      // Use edge function report-activity-log action
      try {
        const logData = await callApi("list-activity-log", {
          token,
          action: "update-firma-paket",
          from: from.toISOString(),
          to: to.toISOString(),
        });
        (logData.logs || []).forEach((item: any) => {
          records.push({
            id: item.id,
            tarih: item.created_at,
            personel: `${item.admin_ad || ""} ${item.admin_soyad || ""}`.trim() || "Bilinmeyen",
            departman: (adminDepartmanMap.get(item.admin_id) as string) || "Bilinmeyen",
            tur: "Paket Tanımlama",
            baslik: `${item.target_label || "—"} paketi tanımlandı`,
            kaynak: "paket_atama",
          });
        });
      } catch {
        // Activity log endpoint may not exist yet, skip
      }

      records.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      setData(records);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [token, dateRange, callApi]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Polling fallback
  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("rapor-satis-kanali-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_aksiyonlar" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_activity_log" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const channelMap = new Map<string, number>();
  data.forEach((item) => {
    channelMap.set(item.departman, (channelMap.get(item.departman) || 0) + 1);
  });
  const chartData = Array.from(channelMap.entries()).map(([name, value]) => ({ name, value }));

  const turMap = new Map<string, number>();
  data.forEach((item) => {
    turMap.set(item.tur, (turMap.get(item.tur) || 0) + 1);
  });
  const turData = Array.from(turMap.entries()).map(([name, value]) => ({ name, value }));

  const totalSales = data.length;
  const aksiyonSales = data.filter((item) => item.kaynak === "aksiyon").length;
  const paketSales = data.filter((item) => item.kaynak === "paket_atama").length;
  const topChannel = [...chartData].sort((a, b) => b.value - a.value)[0]?.name || "-";

  return (
    <AdminLayout title="Satış Kanalı Raporları">
      <div className="space-y-6">
        <ReportDateFilter value={dateRange} onChange={setDateRange} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <ReportKPICard title="Toplam Satış" value={totalSales} icon={TrendingUp} color="from-blue-500 to-cyan-500" />
          <ReportKPICard title="Aksiyon Satışı" value={aksiyonSales} icon={BarChart3} color="from-emerald-500 to-teal-500" />
          <ReportKPICard title="Paket Tanımlama" value={paketSales} icon={Package} color="from-orange-500 to-amber-500" />
          <ReportKPICard title="En Aktif Kanal" value={topChannel} icon={Users} color="from-violet-500 to-purple-500" />
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
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: `hsl(var(--admin-text))` }}>Satış Türü Dağılımı</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={turData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {turData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

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
                  data.slice(0, 100).map((item) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{new Date(item.tarih).toLocaleDateString("tr-TR")}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{item.personel}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{item.departman}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{item.tur}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{item.baslik}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{item.kaynak === "aksiyon" ? "Aksiyon" : "Paket Tanımlama"}</td>
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
