import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportDateFilter, { DateRange } from "@/components/admin/reports/ReportDateFilter";
import ReportKPICard from "@/components/admin/reports/ReportKPICard";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminApi } from "@/hooks/use-admin-api";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, CheckCircle, XCircle, BarChart3, ArrowLeft } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { AKSIYON_TURLERI, TUR_CONFIG } from "@/lib/aksiyon-config";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#a78bfa", "#0077b5", "#0a66c2"];

const SUCCESS_RESULTS = new Set(["satis_kapatildi", "satis_kapandi"]);

// Build label map from config
const TUR_LABELS: Record<string, string> = {};
AKSIYON_TURLERI.forEach(t => { TUR_LABELS[t.value] = t.label; });

export default function RaporAksiyonTuru() {
  const navigate = useNavigate();
  const { token } = useAdminAuth();
  const callApi = useAdminApi();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(new Date()), to: new Date() });
  const [aksiyonlar, setAksiyonlar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Use edge function to bypass RLS
      const data = await callApi("list-aksiyonlar", { token });
      const all = (data.aksiyonlar || []).filter((a: any) => {
        const t = new Date(a.tarih);
        return t >= dateRange.from && t <= dateRange.to;
      });
      setAksiyonlar(all);
    } catch {
      setAksiyonlar([]);
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
      .channel("rapor-aksiyon-turu-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_aksiyonlar" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Group by tur
  const turMap = new Map<string, { total: number; basarili: number; basarisiz: number }>();
  aksiyonlar.forEach((a: any) => {
    const tur = a.tur || "diger";
    const existing = turMap.get(tur) || { total: 0, basarili: 0, basarisiz: 0 };
    existing.total++;
    if (SUCCESS_RESULTS.has(a.sonuc) || !!a.sonuc_paket_id) existing.basarili++;
    if (a.sonuc === "satis_kapanmadi") existing.basarisiz++;
    turMap.set(tur, existing);
  });

  const turData = Array.from(turMap.entries()).map(([tur, stats]) => ({
    name: TUR_LABELS[tur] || TUR_CONFIG[tur]?.label || tur,
    tur,
    ...stats,
    basariOran: stats.total ? ((stats.basarili / stats.total) * 100).toFixed(1) : "0",
  })).sort((a, b) => b.total - a.total);

  const pieData = turData.map(d => ({ name: d.name, value: d.total }));
  const totalBasarili = aksiyonlar.filter((a: any) => SUCCESS_RESULTS.has(a.sonuc) || !!a.sonuc_paket_id).length;
  const totalBasarisiz = aksiyonlar.filter((a: any) => a.sonuc === "satis_kapanmadi").length;

  return (
    <AdminLayout title="Aksiyon Türü Raporları">
      <div className="space-y-6">
        <ReportDateFilter value={dateRange} onChange={setDateRange} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportKPICard title="Toplam Aksiyon" value={aksiyonlar.length} icon={ClipboardList} color="from-orange-500 to-amber-500" />
          <ReportKPICard title="Satış Kapandı" value={totalBasarili} icon={CheckCircle} color="from-emerald-500 to-teal-500" />
          <ReportKPICard title="Kapanmadı" value={totalBasarisiz} icon={XCircle} color="from-rose-500 to-pink-500" />
          <ReportKPICard title="Genel Başarı" value={aksiyonlar.length ? ((totalBasarili / aksiyonlar.length) * 100).toFixed(1) + "%" : "-"} icon={BarChart3} color="from-blue-500 to-cyan-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: `hsl(var(--admin-text))` }}>Aksiyon Türü Dağılımı</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: `hsl(var(--admin-text))` }}>Başarı / Başarısızlık Karşılaştırması</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={turData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="basarili" name="Satış Kapandı" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="basarisiz" name="Kapanmadı" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <div className="p-4 border-b" style={{ borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold" style={{ color: `hsl(var(--admin-text))` }}>Aksiyon Türü Detayları</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Aksiyon Türü</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Toplam</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Başarılı</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Başarısız</th>
                  <th className="text-right p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Başarı Oranı</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Yükleniyor...</td></tr>
                ) : turData.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Veri bulunamadı</td></tr>
                ) : (
                  turData.map((d, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                      <td className="p-3 font-medium" style={{ color: `hsl(var(--admin-text))` }}>{d.name}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{d.total}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{d.basarili}</td>
                      <td className="p-3 text-right" style={{ color: `hsl(var(--admin-text))` }}>{d.basarisiz}</td>
                      <td className="p-3 text-right font-semibold" style={{ color: `hsl(var(--admin-text))` }}>{d.basariOran}%</td>
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
