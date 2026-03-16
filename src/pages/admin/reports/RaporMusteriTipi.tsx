import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportDateFilter, { DateRange } from "@/components/admin/reports/ReportDateFilter";
import ReportKPICard from "@/components/admin/reports/ReportKPICard";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, Layers, TrendingUp, ArrowLeft } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function RaporMusteriTipi() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(new Date()), to: new Date() });
  const [firmalar, setFirmalar] = useState<any[]>([]);
  const [turler, setTurler] = useState<any[]>([]);
  const [tipler, setTipler] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: f }, { data: t }, { data: tp }] = await Promise.all([
      supabase.from("firmalar").select("id, firma_turu_id, firma_tipi_id, firma_olcegi_id, created_at")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString()),
      supabase.from("firma_turleri").select("*"),
      supabase.from("firma_tipleri").select("*"),
    ]);
    setFirmalar(f || []);
    setTurler(t || []);
    setTipler(tp || []);
    setLoading(false);
  };

  // Group by tur
  const turMap = new Map<string, number>();
  firmalar.forEach((f) => {
    const tur = turler.find((t: any) => t.id === f.firma_turu_id);
    const name = tur?.name || "Bilinmeyen";
    turMap.set(name, (turMap.get(name) || 0) + 1);
  });
  const turChartData = Array.from(turMap.entries()).map(([name, value]) => ({ name, value }));

  // Group by tip
  const tipMap = new Map<string, number>();
  firmalar.forEach((f) => {
    const tip = tipler.find((t: any) => t.id === f.firma_tipi_id);
    const name = tip?.name || "Bilinmeyen";
    tipMap.set(name, (tipMap.get(name) || 0) + 1);
  });
  const tipChartData = Array.from(tipMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

  return (
    <AdminLayout title="Müşteri Tipi Raporları">
      <div className="space-y-6">
        <ReportDateFilter value={dateRange} onChange={setDateRange} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportKPICard title="Toplam Yeni Firma" value={firmalar.length} icon={Building2} color="from-emerald-500 to-teal-500" />
          <ReportKPICard title="Firma Türü Çeşitliliği" value={turMap.size} icon={Layers} color="from-blue-500 to-cyan-500" />
          <ReportKPICard title="Firma Tipi Çeşitliliği" value={tipMap.size} icon={Users} color="from-violet-500 to-purple-500" />
          <ReportKPICard title="En Çok Kayıt" value={turChartData[0]?.name || "-"} icon={TrendingUp} color="from-orange-500 to-amber-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: `hsl(var(--admin-text))` }}>Firma Türü Dağılımı</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={turChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {turChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: `hsl(var(--admin-text))` }}>Firma Tipi Dağılımı</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tipChartData.slice(0, 10)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <div className="p-4 border-b" style={{ borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold" style={{ color: `hsl(var(--admin-text))` }}>Firma Tipi Detayları</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Firma Tipi</th>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Kayıt Sayısı</th>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Oran</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Yükleniyor...</td></tr>
                ) : tipChartData.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Veri bulunamadı</td></tr>
                ) : (
                  tipChartData.map((d, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{d.name}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{d.value}</td>
                      <td className="p-3" style={{ color: `hsl(var(--admin-text))` }}>{firmalar.length ? ((d.value / firmalar.length) * 100).toFixed(1) + "%" : "-"}</td>
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
