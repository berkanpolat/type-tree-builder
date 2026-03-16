import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth } from "date-fns";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportDateFilter, { DateRange } from "@/components/admin/reports/ReportDateFilter";
import ReportKPICard from "@/components/admin/reports/ReportKPICard";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminApi } from "@/hooks/use-admin-api";
import { TrendingUp, Users, BarChart3, ArrowLeft, XCircle, CheckCircle, RefreshCw } from "lucide-react";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TUR_CONFIG } from "@/lib/aksiyon-config";

const COLORS = ["#1a2e5a", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
const SUCCESS_RESULTS = new Set(["satis_kapatildi", "satis_kapandi"]);

const PERIYOT_LABELS: Record<string, string> = {
  yillik: "Yıllık",
  aylik: "Aylık",
  sinursiz: "Sınırsız",
};

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
            periyot: item.periyot || null,
          });
        });

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

  // ── Paket dağılımı: her paket için toplam, aylık, yıllık, sınırsız, belirsiz
  const paketDetailMap = new Map<string, { toplam: number; aylik: number; yillik: number; sinursiz: number; belirsiz: number }>();
  successData.forEach((item) => {
    const paket = item.sonucPaketAd || "Bilinmeyen";
    if (!paketDetailMap.has(paket)) paketDetailMap.set(paket, { toplam: 0, aylik: 0, yillik: 0, sinursiz: 0, belirsiz: 0 });
    const entry = paketDetailMap.get(paket)!;
    entry.toplam++;
    if (item.periyot === "aylik") entry.aylik++;
    else if (item.periyot === "yillik") entry.yillik++;
    else if (item.periyot === "sinursiz") entry.sinursiz++;
    else entry.belirsiz++;
  });
  const paketDetailData = Array.from(paketDetailMap.entries())
    .map(([name, counts]) => ({ name, ...counts }))
    .sort((a, b) => b.toplam - a.toplam);
  const paketPieData = paketDetailData.map((d) => ({ name: d.name, value: d.toplam }));

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
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/yonetim/raporlar")} className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80" style={{ color: "hsl(var(--admin-muted))" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Raporlara Dön
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>

        <ReportDateFilter value={dateRange} onChange={setDateRange} />

        {/* Departman & Personel Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 shadow-sm" style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" }}>
            <Users className="w-3.5 h-3.5 shrink-0" style={{ color: "#1a2e5a" }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={s.muted}>Departman</span>
            <select
              value={selectedDepartman}
              onChange={(e) => setSelectedDepartman(e.target.value)}
              className="text-xs border-none outline-none cursor-pointer font-semibold min-w-[100px] rounded-md px-2 py-1"
              style={{ color: "hsl(var(--admin-text))", background: "hsl(var(--admin-bg))" }}
            >
              <option value="all">Tümü</option>
              {departmanlar.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 shadow-sm" style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" }}>
            <Users className="w-3.5 h-3.5 shrink-0" style={{ color: "#f59e0b" }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={s.muted}>Personel</span>
            <select
              value={selectedPersonel}
              onChange={(e) => setSelectedPersonel(e.target.value)}
              className="text-xs border-none outline-none cursor-pointer font-semibold min-w-[100px] rounded-md px-2 py-1"
              style={{ color: "hsl(var(--admin-text))", background: "hsl(var(--admin-bg))" }}
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

        {/* Charts Row: Paket Dağılımı + Kapanmama Nedenleri */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Paket Dağılımı */}
          <div className="rounded-xl border p-3" style={s.card}>
            <h3 className="text-xs font-semibold mb-2" style={s.text}>Kapanan Satışlar — Paket Dağılımı</h3>
            {paketPieData.length === 0 ? (
              <p className="text-xs py-6 text-center" style={s.muted}>Veri yok</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={paketPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} label={{ fontSize: 9 }}>
                      {paketPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 border-t pt-2" style={{ borderColor: "hsl(var(--admin-border))" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
                        <th className="text-left py-1.5 px-2 font-medium" style={s.muted}>Paket</th>
                        <th className="text-right py-1.5 px-2 font-medium" style={s.muted}>Aylık</th>
                        <th className="text-right py-1.5 px-2 font-medium" style={s.muted}>Yıllık</th>
                        <th className="text-right py-1.5 px-2 font-medium" style={s.muted}>Belirsiz</th>
                        <th className="text-right py-1.5 px-2 font-medium" style={s.muted}>Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paketDetailData.map((item, i) => (
                        <tr key={item.name} style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
                          <td className="py-1.5 px-2 flex items-center gap-1.5" style={s.text}>
                            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            {item.name}
                          </td>
                          <td className="py-1.5 px-2 text-right" style={s.text}>{item.aylik || "—"}</td>
                          <td className="py-1.5 px-2 text-right" style={s.text}>{item.yillik || "—"}</td>
                          <td className="py-1.5 px-2 text-right" style={s.muted}>{item.belirsiz || "—"}</td>
                          <td className="py-1.5 px-2 text-right font-bold" style={s.text}>{item.toplam}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="py-1.5 px-2 font-semibold" style={s.text}>Toplam</td>
                        <td className="py-1.5 px-2 text-right font-semibold" style={s.text}>{paketDetailData.reduce((acc, d) => acc + d.aylik, 0) || "—"}</td>
                        <td className="py-1.5 px-2 text-right font-semibold" style={s.text}>{paketDetailData.reduce((acc, d) => acc + d.yillik, 0) || "—"}</td>
                        <td className="py-1.5 px-2 text-right font-semibold" style={s.muted}>{paketDetailData.reduce((acc, d) => acc + d.belirsiz, 0) || "—"}</td>
                        <td className="py-1.5 px-2 text-right font-bold" style={s.text}>{totalSales}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Kapanmama Nedenleri */}
          <div className="rounded-xl border p-3" style={s.card}>
            <h3 className="text-xs font-semibold mb-2" style={s.text}>Satış Kapanmama Nedenleri</h3>
            {nedenData.length === 0 ? (
              <p className="text-xs py-6 text-center" style={s.muted}>Kapanmayan satış verisi yok</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={nedenData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} label={{ fontSize: 9 }}>
                      {nedenData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 border-t pt-2" style={{ borderColor: "hsl(var(--admin-border))" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
                        <th className="text-left py-1.5 px-2 font-medium" style={s.muted}>Neden</th>
                        <th className="text-right py-1.5 px-2 font-medium" style={s.muted}>Adet</th>
                        <th className="text-right py-1.5 px-2 font-medium" style={s.muted}>Oran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nedenData.map((item, i) => (
                        <tr key={item.name} style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
                          <td className="py-1.5 px-2 flex items-center gap-1.5" style={s.text}>
                            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            {item.name}
                          </td>
                          <td className="py-1.5 px-2 text-right font-semibold" style={s.text}>{item.value}</td>
                          <td className="py-1.5 px-2 text-right" style={s.muted}>{totalFail > 0 ? ((item.value / totalFail) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="py-1.5 px-2 font-semibold" style={s.text}>Toplam</td>
                        <td className="py-1.5 px-2 text-right font-bold" style={s.text}>{totalFail}</td>
                        <td className="py-1.5 px-2 text-right font-semibold" style={s.muted}>100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
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
                  <th className="text-left p-2.5 font-medium" style={s.muted}>Periyot</th>
                  <th className="text-left p-2.5 font-medium" style={s.muted}>Neden</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center" style={s.muted}>Yükleniyor...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center" style={s.muted}>Veri bulunamadı</td></tr>
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
                        <td className="p-2.5" style={s.text}>{item.periyot ? (PERIYOT_LABELS[item.periyot] || item.periyot) : "—"}</td>
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
