import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportDateFilter, { DateRange } from "@/components/admin/reports/ReportDateFilter";
import ReportKPICard from "@/components/admin/reports/ReportKPICard";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminApi } from "@/hooks/use-admin-api";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, Users, BarChart3, Package, ArrowLeft, XCircle, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TUR_CONFIG } from "@/lib/aksiyon-config";

const COLORS = ["#1a2e5a", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
const SUCCESS_RESULTS = new Set(["satis_kapatildi", "satis_kapandi"]);

interface AksiyonRecord {
  id: string;
  tarih: string;
  personel: string;
  personelId: string;
  departman: string;
  tur: string;
  baslik: string;
  sonuc: string | null;
  sonucNeden: string | null;
  sonucPaketAd: string | null;
  kaynak: "aksiyon" | "paket_atama";
  periyot?: string | null;
}

const NEDEN_LABELS: Record<string, string> = {
  fiyat_yuksek: "Fiyat Yüksek",
  ihtiyac_yok: "İhtiyaca Uygun Değil",
  rakip_tercih: "Rakip Tercih Edildi",
  zamanlama: "Zamanlama Uygun Değil",
  karar_verici_degil: "Karar Verici Değil",
  diger: "Diğer",
};

export default function RaporSatisKanali() {
  const navigate = useNavigate();
  const { token } = useAdminAuth();
  const callApi = useAdminApi();
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfMonth(new Date()), to: new Date() });
  const [data, setData] = useState<AksiyonRecord[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartman, setSelectedDepartman] = useState<string>("all");
  const [selectedPersonel, setSelectedPersonel] = useState<string>("all");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [aksiyonData, adminData] = await Promise.all([
        callApi("list-aksiyonlar", { token }),
        callApi("list-admin-users", { token }),
      ]);

      const allAksiyonlar = aksiyonData.aksiyonlar || [];
      const admins = adminData.users || [];
      setAdminUsers(admins);
      const adminDepartmanMap = new Map(admins.map((a: any) => [a.id, a.departman || "Bilinmeyen"]));
      const adminNameMap = new Map(admins.map((a: any) => [a.id, `${a.ad} ${a.soyad}`]));

      const from = dateRange.from;
      const to = dateRange.to;

      const records: AksiyonRecord[] = [];

      // Include ALL aksiyonlar with a sonuc (not just successful ones)
      allAksiyonlar
        .filter((item: any) => {
          const t = new Date(item.tarih);
          return t >= from && t <= to && item.sonuc;
        })
        .forEach((item: any) => {
          records.push({
            id: item.id,
            tarih: item.tarih,
            personel: item.admin_ad || adminNameMap.get(item.admin_id) || "Bilinmeyen",
            personelId: item.admin_id,
            departman: (adminDepartmanMap.get(item.admin_id) as string) || "Bilinmeyen",
            tur: TUR_CONFIG[item.tur]?.label || item.tur || "Diğer",
            baslik: item.baslik || "—",
            sonuc: item.sonuc,
            sonucNeden: item.sonuc_neden,
            sonucPaketAd: item.sonuc_paket_ad || null,
            kaynak: "aksiyon",
          });
        });

      // Fetch activity log for paket assignments with periyot info
      try {
        const logData = await callApi("list-activity-log", {
          token,
          action: "update-firma-paket",
          from: from.toISOString(),
          to: to.toISOString(),
        });
        (logData.logs || []).forEach((item: any) => {
          const details = typeof item.details === "string" ? JSON.parse(item.details) : item.details || {};
          records.push({
            id: item.id,
            tarih: item.created_at,
            personel: `${item.admin_ad || ""} ${item.admin_soyad || ""}`.trim() || "Bilinmeyen",
            personelId: item.admin_id,
            departman: (adminDepartmanMap.get(item.admin_id) as string) || "Bilinmeyen",
            tur: "Paket Tanımlama",
            baslik: `${item.target_label || "—"} paketi tanımlandı`,
            sonuc: "satis_kapatildi",
            sonucNeden: null,
            sonucPaketAd: item.target_label || null,
            kaynak: "paket_atama",
            periyot: details.periyot || null,
          });
        });
      } catch {
        // skip
      }

      records.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      setData(records);
    } catch {
      setData([]);
      setAdminUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token, dateRange, callApi]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("rapor-satis-kanali-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_aksiyonlar" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_activity_log" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Departman list
  const departmanlar = useMemo(() => {
    const set = new Set(adminUsers.map((u: any) => u.departman || "Bilinmeyen"));
    return Array.from(set).sort();
  }, [adminUsers]);

  // Personel list (filtered by departman)
  const personelListesi = useMemo(() => {
    let list = adminUsers;
    if (selectedDepartman !== "all") {
      list = list.filter((u: any) => u.departman === selectedDepartman);
    }
    return list.map((u: any) => ({ id: u.id, name: `${u.ad} ${u.soyad}` })).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [adminUsers, selectedDepartman]);

  // Reset personel when departman changes
  useEffect(() => { setSelectedPersonel("all"); }, [selectedDepartman]);

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (selectedDepartman !== "all" && item.departman !== selectedDepartman) return false;
      if (selectedPersonel !== "all" && item.personelId !== selectedPersonel) return false;
      return true;
    });
  }, [data, selectedDepartman, selectedPersonel]);

  const successData = filteredData.filter((item) => SUCCESS_RESULTS.has(item.sonuc || "") || item.kaynak === "paket_atama");
  const failData = filteredData.filter((item) => item.sonuc === "satis_kapanmadi");

  // ── Paket dağılımı (Ücretsiz vs PRO)
  const paketDistMap = new Map<string, number>();
  successData.forEach((item) => {
    const label = item.sonucPaketAd || "Bilinmeyen";
    paketDistMap.set(label, (paketDistMap.get(label) || 0) + 1);
  });
  const paketDistData = Array.from(paketDistMap.entries()).map(([name, value]) => ({ name, value }));

  // ── Periyot dağılımı (Aylık vs Yıllık) - from activity log
  const periyotMap = new Map<string, number>();
  successData.forEach((item) => {
    if (item.periyot) {
      const label = item.periyot === "yillik" ? "Yıllık" : item.periyot === "aylik" ? "Aylık" : item.periyot === "sinursiz" ? "Sınırsız" : item.periyot;
      periyotMap.set(label, (periyotMap.get(label) || 0) + 1);
    }
  });
  const periyotData = Array.from(periyotMap.entries()).map(([name, value]) => ({ name, value }));

  // ── Kapanmama nedenleri
  const nedenMap = new Map<string, number>();
  failData.forEach((item) => {
    const label = NEDEN_LABELS[item.sonucNeden || ""] || item.sonucNeden || "Belirtilmedi";
    nedenMap.set(label, (nedenMap.get(label) || 0) + 1);
  });
  const nedenData = Array.from(nedenMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const totalSales = successData.length;
  const totalFail = failData.length;
  const conversionRate = (totalSales + totalFail) > 0 ? ((totalSales / (totalSales + totalFail)) * 100).toFixed(1) : "0";

  const s = {
    card: { background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" },
    text: { color: "hsl(var(--admin-text))" },
    muted: { color: "hsl(var(--admin-muted))" },
  };

  return (
    <AdminLayout title="Satış Kanalı Raporları">
      <div className="space-y-4">
        <button onClick={() => navigate("/yonetim/raporlar")} className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80" style={{ color: "hsl(var(--admin-muted))" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Raporlara Dön
        </button>

        <ReportDateFilter value={dateRange} onChange={setDateRange} />

        {/* Departman & Personel Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={s.card}>
            <span className="text-[10px] font-medium uppercase tracking-wider" style={s.muted}>Departman</span>
            <select
              value={selectedDepartman}
              onChange={(e) => setSelectedDepartman(e.target.value)}
              className="text-xs bg-transparent border-none outline-none cursor-pointer font-medium"
              style={s.text}
            >
              <option value="all">Tümü</option>
              {departmanlar.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5" style={s.card}>
            <span className="text-[10px] font-medium uppercase tracking-wider" style={s.muted}>Personel</span>
            <select
              value={selectedPersonel}
              onChange={(e) => setSelectedPersonel(e.target.value)}
              className="text-xs bg-transparent border-none outline-none cursor-pointer font-medium"
              style={s.text}
            >
              <option value="all">Tümü</option>
              {personelListesi.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ReportKPICard title="Kapanan Satış" value={totalSales} icon={CheckCircle} color="from-emerald-500 to-teal-500" />
          <ReportKPICard title="Kapanmayan" value={totalFail} icon={XCircle} color="from-red-500 to-rose-500" />
          <ReportKPICard title="Dönüşüm Oranı" value={`%${conversionRate}`} icon={TrendingUp} color="from-blue-500 to-cyan-500" />
          <ReportKPICard title="Toplam Aksiyon" value={filteredData.length} icon={BarChart3} color="from-violet-500 to-purple-500" />
        </div>

        {/* Charts Row 1: Paket Dağılımı + Periyot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border p-3" style={s.card}>
            <h3 className="text-xs font-semibold mb-2" style={s.text}>Kapanan Satışlar — Paket Dağılımı</h3>
            {paketDistData.length === 0 ? (
              <p className="text-xs py-6 text-center" style={s.muted}>Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={paketDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} label={{ fontSize: 10 }}>
                    {paketDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border p-3" style={s.card}>
            <h3 className="text-xs font-semibold mb-2" style={s.text}>Paket Periyot Dağılımı (Aylık / Yıllık)</h3>
            {periyotData.length === 0 ? (
              <p className="text-xs py-6 text-center" style={s.muted}>Periyot verisi bulunamadı</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={periyotData} barSize={28} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="value" name="Adet" fill="#1a2e5a" radius={[6, 6, 0, 0]}>
                    {periyotData.map((_, i) => <Cell key={i} fill={i === 0 ? "#f59e0b" : "#1a2e5a"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart Row 2: Kapanmama Nedenleri */}
        <div className="rounded-xl border p-3" style={s.card}>
          <h3 className="text-xs font-semibold mb-2" style={s.text}>Satış Kapanmama Nedenleri</h3>
          {nedenData.length === 0 ? (
            <p className="text-xs py-6 text-center" style={s.muted}>Kapanmayan satış verisi yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.min(200, Math.max(120, nedenData.length * 32))}>
              <BarChart data={nedenData} layout="vertical" barSize={14} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={120} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" name="Adet" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Detail Table */}
        <div className="rounded-xl border overflow-hidden" style={s.card}>
          <div className="p-3 border-b" style={{ borderColor: "hsl(var(--admin-border))" }}>
            <h3 className="text-xs font-semibold" style={s.text}>Satış Detayları</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
                  <th className="text-left p-2.5 font-medium" style={s.muted}>Tarih</th>
                  <th className="text-left p-2.5 font-medium" style={s.muted}>Personel</th>
                  <th className="text-left p-2.5 font-medium" style={s.muted}>Tür</th>
                  <th className="text-left p-2.5 font-medium" style={s.muted}>Sonuç</th>
                  <th className="text-left p-2.5 font-medium" style={s.muted}>Paket</th>
                  <th className="text-left p-2.5 font-medium" style={s.muted}>Neden</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center" style={s.muted}>Yükleniyor...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center" style={s.muted}>Veri bulunamadı</td></tr>
                ) : (
                  filteredData.slice(0, 100).map((item) => {
                    const isSuccess = SUCCESS_RESULTS.has(item.sonuc || "") || item.kaynak === "paket_atama";
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
                        <td className="p-2.5" style={s.text}>{new Date(item.tarih).toLocaleDateString("tr-TR")}</td>
                        <td className="p-2.5" style={s.text}>{item.personel}</td>
                        <td className="p-2.5" style={s.text}>{item.tur}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${isSuccess ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                            {isSuccess ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {isSuccess ? "Kapandı" : "Kapanmadı"}
                          </span>
                        </td>
                        <td className="p-2.5" style={s.text}>{item.sonucPaketAd || "—"}</td>
                        <td className="p-2.5" style={s.text}>{item.sonucNeden ? (NEDEN_LABELS[item.sonucNeden] || item.sonucNeden) : "—"}</td>
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
