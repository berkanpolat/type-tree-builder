import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportDateFilter, { DateRange } from "@/components/admin/reports/ReportDateFilter";
import ReportKPICard from "@/components/admin/reports/ReportKPICard";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminApi } from "@/hooks/use-admin-api";
import { Target, TrendingUp, DollarSign, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";

const HEDEF_TURU_LABELS: Record<string, string> = {
  paket_uyeligi: "Paket Üyeliği",
  ciro: "Ciro",
  dis_arama: "Dış Arama",
  ziyaret: "Ziyaret",
};

export default function RaporHedefPrim() {
  const { token } = useAdminAuth();
  const callApi = useAdminApi();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(new Date()), to: new Date() });
  const [hedefler, setHedefler] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>("all");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [hedefData, adminData] = await Promise.all([
        callApi("list-hedefler", { token }),
        callApi("list-admin-users", { token }),
      ]);
      const allHedefler = (hedefData.hedefler || []).filter((h: any) =>
        h.baslangic_tarihi <= dateRange.to.toISOString().split("T")[0] &&
        h.bitis_tarihi >= dateRange.from.toISOString().split("T")[0]
      );
      setHedefler(allHedefler);
      setAdminUsers(adminData.users || []);
    } catch {
      setHedefler([]);
      setAdminUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token, dateRange, callApi]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getAdminName = useCallback((id: string) => {
    const u = adminUsers.find((a: any) => a.id === id);
    return u ? `${u.ad} ${u.soyad}` : "Bilinmeyen";
  }, [adminUsers]);

  const getAdminDepartman = useCallback((id: string) => {
    const u = adminUsers.find((a: any) => a.id === id);
    return u?.departman || "Diğer";
  }, [adminUsers]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    hedefler.forEach((h: any) => depts.add(getAdminDepartman(h.hedef_admin_id)));
    return Array.from(depts).sort();
  }, [hedefler, getAdminDepartman]);

  const filteredHedefler = useMemo(() =>
    selectedDept === "all"
      ? hedefler
      : hedefler.filter((h: any) => getAdminDepartman(h.hedef_admin_id) === selectedDept),
    [hedefler, selectedDept, getAdminDepartman]
  );

  const toplam = filteredHedefler.length;
  const tamamlanan = filteredHedefler.filter((h: any) => h.gerceklesen_miktar >= h.hedef_miktar).length;
  const toplamPrim = filteredHedefler.reduce((acc: number, h: any) => {
    if (h.gerceklesen_miktar >= h.hedef_miktar && h.birim_basi_prim) {
      return acc + (h.gerceklesen_miktar * h.birim_basi_prim);
    }
    return acc;
  }, 0);

  const chartData = useMemo(() => {
    const personMap = new Map<string, { hedef: number; gerceklesen: number }>();
    filteredHedefler.forEach((h: any) => {
      const name = getAdminName(h.hedef_admin_id);
      const existing = personMap.get(name) || { hedef: 0, gerceklesen: 0 };
      existing.hedef += h.hedef_miktar;
      existing.gerceklesen += h.gerceklesen_miktar;
      personMap.set(name, existing);
    });
    return Array.from(personMap.entries()).map(([name, stats]) => ({ name, ...stats }));
  }, [filteredHedefler, getAdminName]);

  return (
    <AdminLayout title="Hedef & Prim Raporları">
      <div className="space-y-6">
        <ReportDateFilter value={dateRange} onChange={setDateRange} />

        {/* Department Tabs */}
        <div className="rounded-xl border p-1.5 flex flex-wrap gap-1.5" style={{ background: "hsl(var(--admin-hover))", borderColor: "hsl(var(--admin-border))" }}>
          {["all", ...departments].map((dept) => {
            const isActive = selectedDept === dept;
            const label = dept === "all" ? "Tümü" : dept;
            const count = dept === "all" ? hedefler.length : hedefler.filter((h: any) => getAdminDepartman(h.hedef_admin_id) === dept).length;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, #1a2e5a, #2a4a8a)"
                    : "transparent",
                  color: isActive ? "#f59e0b" : "hsl(var(--admin-text))",
                  boxShadow: isActive ? "0 2px 8px rgba(26,46,90,0.3)" : "none",
                }}
              >
                {label}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: isActive ? "rgba(245,158,11,0.2)" : "hsl(var(--admin-border))",
                    color: isActive ? "#f59e0b" : "hsl(var(--admin-muted))",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportKPICard title="Toplam Hedef" value={toplam} icon={Target} color="from-rose-500 to-pink-500" />
          <ReportKPICard title="Tamamlanan" value={tamamlanan} icon={TrendingUp} color="from-emerald-500 to-teal-500" />
          <ReportKPICard title="Başarı Oranı" value={toplam ? ((tamamlanan / toplam) * 100).toFixed(1) + "%" : "-"} icon={Award} color="from-violet-500 to-purple-500" />
          <ReportKPICard title="Toplam Prim" value={`$${toplamPrim.toLocaleString("tr-TR")}`} icon={DollarSign} color="from-orange-500 to-amber-500" />
        </div>

        {/* Chart */}
        <div className="rounded-xl border p-3" style={{ background: `hsl(var(--admin-card-bg))`, borderColor: `hsl(var(--admin-border))` }}>
          <h3 className="text-xs font-semibold mb-2" style={{ color: `hsl(var(--admin-text))` }}>
            Personel Hedef Karşılaştırması {selectedDept !== "all" && `— ${selectedDept}`}
          </h3>
          {chartData.length === 0 ? (
            <p className="text-center py-4 text-xs" style={{ color: `hsl(var(--admin-muted))` }}>Veri bulunamadı</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.min(200, Math.max(100, chartData.length * 28))}>
              <BarChart data={chartData} layout="vertical" barSize={10} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                <Bar dataKey="hedef" name="Hedef" fill="#1a2e5a" radius={[0, 6, 6, 0]} />
                <Bar dataKey="gerceklesen" name="Gerçekleşen" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <div className="p-4 border-b" style={{ borderColor: `hsl(var(--admin-border))` }}>
            <h3 className="text-sm font-semibold" style={{ color: `hsl(var(--admin-text))` }}>
              Hedef Detayları {selectedDept !== "all" && `— ${selectedDept}`}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                  <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Personel</th>
                  {selectedDept === "all" && <th className="text-left p-3 font-medium" style={{ color: `hsl(var(--admin-muted))` }}>Departman</th>}
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
                  <tr><td colSpan={selectedDept === "all" ? 8 : 7} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Yükleniyor...</td></tr>
                ) : filteredHedefler.length === 0 ? (
                  <tr><td colSpan={selectedDept === "all" ? 8 : 7} className="p-8 text-center" style={{ color: `hsl(var(--admin-muted))` }}>Veri bulunamadı</td></tr>
                ) : (
                  filteredHedefler.map((h: any) => {
                    const progress = h.hedef_miktar ? Math.min((h.gerceklesen_miktar / h.hedef_miktar) * 100, 100) : 0;
                    return (
                      <tr key={h.id} style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                        <td className="p-3 font-medium" style={{ color: `hsl(var(--admin-text))` }}>{getAdminName(h.hedef_admin_id)}</td>
                        {selectedDept === "all" && (
                          <td className="p-3" style={{ color: `hsl(var(--admin-muted))` }}>{getAdminDepartman(h.hedef_admin_id)}</td>
                        )}
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
