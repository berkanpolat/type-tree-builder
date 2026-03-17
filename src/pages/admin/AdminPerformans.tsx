import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity, Play, Download, RefreshCw, Clock, AlertTriangle, CheckCircle2,
  XCircle, Zap, TrendingUp, Server, Globe, Users, Cpu, Brain, Bell,
  ChevronDown, ChevronUp, FileText, History, Wrench, Loader2, Info
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface TestResult {
  id: string;
  overall_score: number;
  system_status: string;
  avg_response_time: number;
  max_response_time: number;
  error_rate: number;
  total_endpoints: number;
  failed_endpoints: number;
  summary: any;
  created_at: string;
  completed_at: string;
  test_type: string;
  status: string;
}

interface TestDetail {
  id: string;
  module: string;
  endpoint: string;
  response_time: number;
  status_code: number;
  success: boolean;
  error_message: string | null;
  details: any;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  endpoint: string | null;
  value: number | null;
  threshold: number | null;
  created_at: string;
}

interface Schedule {
  id: string;
  interval_minutes: number;
  enabled: boolean;
  last_run_at: string | null;
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  healthy: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Sağlıklı", icon: CheckCircle2 },
  warning: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Uyarı", icon: AlertTriangle },
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Kritik", icon: XCircle },
};

const moduleLabels: Record<string, { label: string; icon: any; color: string }> = {
  api_health: { label: "API Sağlık", icon: Server, color: "text-blue-400" },
  page_performance: { label: "Sayfa Performans", icon: Globe, color: "text-purple-400" },
  user_scenario: { label: "Kullanıcı Senaryosu", icon: Users, color: "text-cyan-400" },
  load_test: { label: "Yük Testi", icon: Cpu, color: "text-orange-400" },
};

const intervalLabels: Record<number, string> = {
  5: "5 Dakika",
  15: "15 Dakika",
  60: "1 Saat",
  1440: "Günlük",
};

async function callPerfApi(token: string, action: string, extra: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("run-performance-test", {
    body: { action, token, ...extra },
  });
  if (error) throw error;
  return data;
}

export default function AdminPerformans() {
  const { token } = useAdminAuth();
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [testDetails, setTestDetails] = useState<TestDetail[]>([]);
  const [testAlerts, setTestAlerts] = useState<Alert[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyDays, setHistoryDays] = useState(7);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [fixing, setFixing] = useState(false);
  const [fixResults, setFixResults] = useState<{ action: string; status: "success" | "warning" | "info"; detail: string }[]>([]);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    try {
      const data = await callPerfApi(token, "get-history", { days: historyDays });
      setHistory(data.tests || []);
      if (data.tests?.length > 0 && !selectedTest) {
        setSelectedTest(data.tests[0]);
      }
    } catch (e: any) {
      console.error("History load error:", e);
    }
  }, [token, historyDays, selectedTest]);

  const loadSchedules = useCallback(async () => {
    if (!token) return;
    try {
      const data = await callPerfApi(token, "get-schedules");
      setSchedules(data.schedules || []);
    } catch {}
  }, [token]);

  const loadAlerts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await callPerfApi(token, "get-alerts", { limit: 50 });
      setAllAlerts(data.alerts || []);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([loadHistory(), loadSchedules(), loadAlerts()]).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selectedTest?.id || !token) return;
    callPerfApi(token, "get-test-detail", { test_id: selectedTest.id }).then(data => {
      setTestDetails(data.results || []);
      setTestAlerts(data.alerts || []);
    }).catch(() => {});
  }, [selectedTest?.id, token]);

  const runTest = async () => {
    if (!token || running) return;
    setRunning(true);
    toast.info("Performans testi başlatıldı...");
    try {
      const result = await callPerfApi(token, "run-test", { concurrency: 20 });
      toast.success(`Test tamamlandı! Skor: ${result.score}/100`);
      await loadHistory();
      await loadAlerts();
    } catch (e: any) {
      toast.error("Test hatası: " + (e.message || "Bilinmeyen hata"));
    } finally {
      setRunning(false);
    }
  };

  const fixIssues = async () => {
    if (!token || fixing) return;
    setFixing(true);
    setFixDialogOpen(true);
    setFixResults([]);
    try {
      const data = await callPerfApi(token, "fix-issues");
      setFixResults(data.fixes || []);
      toast.success("Sorun analizi tamamlandı!");
      await loadHistory();
      await loadAlerts();
    } catch (e: any) {
      toast.error("Hata: " + (e.message || "Bilinmeyen hata"));
      setFixResults([{ action: "İşlem başarısız", status: "warning", detail: e.message || "Bilinmeyen hata" }]);
    } finally {
      setFixing(false);
    }
  };

    if (!token) return;
    try {
      await callPerfApi(token, "update-schedule", { schedule_id: id, enabled });
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
      toast.success(enabled ? "Zamanlayıcı etkinleştirildi" : "Zamanlayıcı devre dışı bırakıldı");
    } catch {
      toast.error("Güncelleme hatası");
    }
  };

  const generatePdf = () => {
    if (!selectedTest) return;
    const content = buildPdfContent(selectedTest, testDetails, testAlerts);
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performans-raporu-${new Date(selectedTest.created_at).toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapor indirildi");
  };

  const latestTest = history[0] || null;
  const sc = statusConfig[latestTest?.system_status || "healthy"];
  const StatusIcon = sc.icon;

  // Chart data
  const chartData = [...history].reverse().map(t => ({
    date: new Date(t.created_at).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    skor: t.overall_score,
    yanit: t.avg_response_time,
    hata: t.error_rate,
  }));

  const groupedDetails = testDetails.reduce<Record<string, TestDetail[]>>((acc, d) => {
    (acc[d.module] = acc[d.module] || []).push(d);
    return acc;
  }, {});

  if (loading) {
    return (
      <AdminLayout title="Performans İzleme">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Performans İzleme">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={runTest}
              disabled={running}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
            >
              {running ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              {running ? "Test Çalışıyor..." : "Performans Testini Başlat"}
            </Button>
            <Button variant="outline" onClick={() => { loadHistory(); loadAlerts(); }} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" }}>
              <RefreshCw className="w-4 h-4 mr-2" /> Yenile
            </Button>
          </div>
          {selectedTest && (
            <Button variant="outline" onClick={generatePdf} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" }}>
              <Download className="w-4 h-4 mr-2" /> PDF İndir
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border" style={{ borderColor: "hsl(var(--admin-border))" }}>
            {[
              { value: "dashboard", label: "Genel Bakış", icon: Activity },
              { value: "details", label: "Detay Analiz", icon: Server },
              { value: "history", label: "Geçmiş", icon: History },
              { value: "alerts", label: "Uyarılar", icon: Bell },
              { value: "ai", label: "AI Analiz", icon: Brain },
              { value: "schedule", label: "Zamanlayıcı", icon: Clock },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500">
                <tab.icon className="w-4 h-4 mr-1.5" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard
                title="Performans Skoru"
                value={latestTest ? `${latestTest.overall_score}/100` : "—"}
                icon={Zap}
                color="from-amber-500 to-orange-600"
                subtitle={latestTest ? sc.label : "Test bekleniyor"}
              />
              <KpiCard
                title="Ort. Yanıt Süresi"
                value={latestTest ? `${latestTest.avg_response_time}ms` : "—"}
                icon={Clock}
                color="from-blue-500 to-cyan-600"
              />
              <KpiCard
                title="Maks. Yanıt Süresi"
                value={latestTest ? `${latestTest.max_response_time}ms` : "—"}
                icon={TrendingUp}
                color="from-purple-500 to-pink-600"
              />
              <KpiCard
                title="Hata Oranı"
                value={latestTest ? `%${latestTest.error_rate}` : "—"}
                icon={AlertTriangle}
                color="from-red-500 to-rose-600"
              />
              <KpiCard
                title="Toplam Endpoint"
                value={latestTest ? `${latestTest.total_endpoints - latestTest.failed_endpoints}/${latestTest.total_endpoints}` : "—"}
                icon={Server}
                color="from-emerald-500 to-teal-600"
                subtitle="Başarılı / Toplam"
              />
            </div>

            {/* System Status Banner */}
            {latestTest && (
              <div className={`rounded-xl border p-4 flex items-center gap-4 ${sc.bg}`}>
                <StatusIcon className={`w-8 h-8 ${sc.color}`} />
                <div>
                  <h3 className={`text-lg font-bold ${sc.color}`}>Sistem Durumu: {sc.label}</h3>
                  <p className="text-sm" style={{ color: "hsl(var(--admin-muted))" }}>
                    Son test: {new Date(latestTest.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>
            )}

            {/* Charts */}
            {chartData.length > 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Performans Skoru Trendi">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 20% 25%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(217 20% 55%)" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(217 20% 55%)" }} />
                      <Tooltip contentStyle={{ background: "hsl(217 33% 17%)", border: "1px solid hsl(217 20% 25%)", borderRadius: 8, color: "#fff" }} />
                      <Area type="monotone" dataKey="skor" stroke="#f59e0b" fill="url(#scoreFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Yanıt Süresi (ms)">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 20% 25%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(217 20% 55%)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(217 20% 55%)" }} />
                      <Tooltip contentStyle={{ background: "hsl(217 33% 17%)", border: "1px solid hsl(217 20% 25%)", borderRadius: 8, color: "#fff" }} />
                      <Line type="monotone" dataKey="yanit" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}
          </TabsContent>

          {/* Detail Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            {!selectedTest ? (
              <EmptyState message="Henüz test çalıştırılmamış." />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium" style={{ color: "hsl(var(--admin-text))" }}>
                    Test #{selectedTest.id.slice(0, 8)} — {new Date(selectedTest.created_at).toLocaleString("tr-TR")}
                  </span>
                </div>
                {Object.entries(groupedDetails).map(([module, details]) => {
                  const mod = moduleLabels[module] || { label: module, icon: Server, color: "text-gray-400" };
                  const ModIcon = mod.icon;
                  const isOpen = expandedModule === module;
                  return (
                    <div key={module} className="rounded-xl border overflow-hidden" style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" }}>
                      <button
                        onClick={() => setExpandedModule(isOpen ? null : module)}
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <ModIcon className={`w-5 h-5 ${mod.color}`} />
                          <span className="font-semibold" style={{ color: "hsl(var(--admin-text))" }}>{mod.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {details.filter(d => d.success).length}/{details.length} başarılı
                          </Badge>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4" style={{ color: "hsl(var(--admin-muted))" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "hsl(var(--admin-muted))" }} />}
                      </button>
                      {isOpen && (
                        <div className="border-t" style={{ borderColor: "hsl(var(--admin-border))" }}>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left" style={{ color: "hsl(var(--admin-muted))" }}>
                                <th className="px-4 py-2 font-medium">Endpoint</th>
                                <th className="px-4 py-2 font-medium">Yanıt Süresi</th>
                                <th className="px-4 py-2 font-medium">Durum Kodu</th>
                                <th className="px-4 py-2 font-medium">Sonuç</th>
                                <th className="px-4 py-2 font-medium">Hata</th>
                              </tr>
                            </thead>
                            <tbody>
                              {details.map((d, i) => (
                                <tr key={i} className="border-t" style={{ borderColor: "hsl(var(--admin-border))" }}>
                                  <td className="px-4 py-2" style={{ color: "hsl(var(--admin-text))" }}>{d.endpoint}</td>
                                  <td className="px-4 py-2">
                                    <span className={d.response_time > 1000 ? "text-red-400" : d.response_time > 500 ? "text-amber-400" : "text-emerald-400"}>
                                      {d.response_time}ms
                                    </span>
                                  </td>
                                  <td className="px-4 py-2" style={{ color: "hsl(var(--admin-muted))" }}>{d.status_code || "—"}</td>
                                  <td className="px-4 py-2">
                                    {d.success ? (
                                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Başarılı</Badge>
                                    ) : (
                                      <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Başarısız</Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-red-400 max-w-[200px] truncate">{d.error_message || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm" style={{ color: "hsl(var(--admin-muted))" }}>Geçmiş:</span>
              {[1, 7, 30].map(d => (
                <Button
                  key={d}
                  size="sm"
                  variant={historyDays === d ? "default" : "outline"}
                  onClick={() => { setHistoryDays(d); }}
                  className={historyDays === d ? "bg-amber-500 text-white" : ""}
                  style={historyDays !== d ? { borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" } : undefined}
                >
                  {d === 1 ? "24 Saat" : d === 7 ? "7 Gün" : "30 Gün"}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={loadHistory} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" }}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            {history.length === 0 ? (
              <EmptyState message="Bu dönemde test kaydı bulunamadı." />
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "hsl(var(--admin-muted))" }}>
                      <th className="px-4 py-3 text-left font-medium">Tarih</th>
                      <th className="px-4 py-3 text-left font-medium">Tür</th>
                      <th className="px-4 py-3 text-left font-medium">Skor</th>
                      <th className="px-4 py-3 text-left font-medium">Durum</th>
                      <th className="px-4 py-3 text-left font-medium">Ort. Yanıt</th>
                      <th className="px-4 py-3 text-left font-medium">Hata %</th>
                      <th className="px-4 py-3 text-left font-medium">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(t => {
                      const s = statusConfig[t.system_status || "healthy"];
                      return (
                        <tr
                          key={t.id}
                          className={`border-t cursor-pointer hover:bg-white/5 transition-colors ${selectedTest?.id === t.id ? "bg-amber-500/5" : ""}`}
                          style={{ borderColor: "hsl(var(--admin-border))" }}
                          onClick={() => setSelectedTest(t)}
                        >
                          <td className="px-4 py-3" style={{ color: "hsl(var(--admin-text))" }}>
                            {new Date(t.created_at).toLocaleString("tr-TR")}
                          </td>
                          <td className="px-4 py-3" style={{ color: "hsl(var(--admin-muted))" }}>
                            {t.test_type === "manual" ? "Manuel" : "Otomatik"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${t.overall_score >= 75 ? "text-emerald-400" : t.overall_score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                              {t.overall_score}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={s.bg}><s.icon className={`w-3 h-3 mr-1 ${s.color}`} />{s.label}</Badge>
                          </td>
                          <td className="px-4 py-3" style={{ color: "hsl(var(--admin-muted))" }}>{t.avg_response_time}ms</td>
                          <td className="px-4 py-3" style={{ color: "hsl(var(--admin-muted))" }}>%{t.error_rate}</td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedTest(t); setActiveTab("details"); }}>
                              Detay
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4 mt-4">
            {allAlerts.length === 0 ? (
              <EmptyState message="Henüz uyarı bulunmuyor." />
            ) : (
              <div className="space-y-3">
                {allAlerts.map(a => (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-4 flex items-start gap-3 ${a.severity === "critical" ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20"}`}
                  >
                    {a.severity === "critical" ? <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: "hsl(var(--admin-text))" }}>{a.message}</p>
                      <p className="text-xs mt-1" style={{ color: "hsl(var(--admin-muted))" }}>
                        {new Date(a.created_at).toLocaleString("tr-TR")}
                        {a.endpoint && ` · ${a.endpoint}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            {!selectedTest?.summary?.ai_analysis ? (
              <EmptyState message="AI analizi için bir test çalıştırın." />
            ) : (
              <>
                {/* Bottlenecks */}
                {selectedTest.summary.ai_analysis.bottlenecks?.length > 0 && (
                  <div className="rounded-xl border p-4" style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}>
                      <Zap className="w-4 h-4 text-red-400" /> Tespit Edilen Darboğazlar
                    </h3>
                    <div className="space-y-2">
                      {selectedTest.summary.ai_analysis.bottlenecks.map((b: any, i: number) => (
                        <div key={i} className="text-sm p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                          <span style={{ color: "hsl(var(--admin-text))" }}>
                            {b.type === "slow_endpoints" && `${b.count} yavaş endpoint tespit edildi. En yavaş: ${b.worst} (${b.worst_time}ms)`}
                            {b.type === "concurrency" && `Eş zamanlı istek başarı oranı: %${b.success_rate}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div className="rounded-xl border p-4" style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" }}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}>
                    <Brain className="w-4 h-4 text-purple-400" /> AI Önerileri
                  </h3>
                  <div className="space-y-3">
                    {selectedTest.summary.ai_analysis.recommendations?.map((r: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border" style={{ borderColor: "hsl(var(--admin-border))" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={
                            r.priority === "high" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            r.priority === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }>
                            {r.priority === "high" ? "Yüksek" : r.priority === "medium" ? "Orta" : "Düşük"}
                          </Badge>
                          <span className="text-sm font-medium" style={{ color: "hsl(var(--admin-text))" }}>{r.title}</span>
                        </div>
                        <p className="text-xs" style={{ color: "hsl(var(--admin-muted))" }}>{r.description}</p>
                        <p className="text-xs mt-1 text-amber-400">→ {r.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4 mt-4">
            <div className="rounded-xl border p-4" style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "hsl(var(--admin-text))" }}>
                Otomatik Test Zamanlayıcıları
              </h3>
              <div className="space-y-4">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "hsl(var(--admin-border))" }}>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="text-sm font-medium" style={{ color: "hsl(var(--admin-text))" }}>
                          Her {intervalLabels[s.interval_minutes] || `${s.interval_minutes} dk`}
                        </span>
                        {s.last_run_at && (
                          <p className="text-xs" style={{ color: "hsl(var(--admin-muted))" }}>
                            Son: {new Date(s.last_run_at).toLocaleString("tr-TR")}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={(v) => toggleSchedule(s.id, v)}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4" style={{ color: "hsl(var(--admin-muted))" }}>
                Not: Otomatik testler, Supabase cron job ile çalışır. Etkinleştirme sonrasında konfigürasyon gerekebilir.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// Sub-components
function KpiCard({ title, value, icon: Icon, color, subtitle }: { title: string; value: string; icon: any; color: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "hsl(var(--admin-muted))" }}>{title}</span>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: "hsl(var(--admin-text))" }}>{value}</div>
      {subtitle && <p className="text-xs mt-1" style={{ color: "hsl(var(--admin-muted))" }}>{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: "hsl(var(--admin-text))" }}>{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border p-12 flex flex-col items-center justify-center" style={{ background: "hsl(var(--admin-card))", borderColor: "hsl(var(--admin-border))" }}>
      <Activity className="w-12 h-12 mb-3" style={{ color: "hsl(var(--admin-muted))" }} />
      <p className="text-sm" style={{ color: "hsl(var(--admin-muted))" }}>{message}</p>
    </div>
  );
}

function buildPdfContent(test: TestResult, details: TestDetail[], alerts: Alert[]): string {
  const sc = statusConfig[test.system_status || "healthy"];
  const statusColor = test.system_status === "healthy" ? "#10b981" : test.system_status === "warning" ? "#f59e0b" : "#ef4444";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Performans Raporu — ${new Date(test.created_at).toLocaleDateString("tr-TR")}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a2e5a; max-width: 900px; margin: 0 auto; }
h1 { color: #1a2e5a; border-bottom: 3px solid #f59e0b; padding-bottom: 10px; }
h2 { color: #1a2e5a; margin-top: 30px; }
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
.kpi { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
.kpi .label { font-size: 12px; color: #6b7280; }
.kpi .value { font-size: 28px; font-weight: bold; margin-top: 4px; }
.status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; }
th, td { padding: 10px 12px; border: 1px solid #e5e7eb; text-align: left; font-size: 13px; }
th { background: #f9fafb; font-weight: 600; }
.success { color: #10b981; } .fail { color: #ef4444; }
.alert { padding: 12px; border-radius: 8px; margin: 8px 0; border-left: 4px solid; }
.alert-critical { background: #fef2f2; border-color: #ef4444; }
.alert-warning { background: #fffbeb; border-color: #f59e0b; }
.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
@media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>🔍 Performans Test Raporu</h1>
<p><strong>Tarih:</strong> ${new Date(test.created_at).toLocaleString("tr-TR")} · <strong>Tür:</strong> ${test.test_type === "manual" ? "Manuel" : "Otomatik"}</p>

<div class="kpi-grid">
<div class="kpi"><div class="label">Performans Skoru</div><div class="value" style="color:${statusColor}">${test.overall_score}/100</div></div>
<div class="kpi"><div class="label">Ort. Yanıt Süresi</div><div class="value">${test.avg_response_time}ms</div></div>
<div class="kpi"><div class="label">Hata Oranı</div><div class="value">${test.error_rate}%</div></div>
<div class="kpi"><div class="label">Maks. Yanıt Süresi</div><div class="value">${test.max_response_time}ms</div></div>
<div class="kpi"><div class="label">Başarılı Endpoint</div><div class="value">${test.total_endpoints - test.failed_endpoints}/${test.total_endpoints}</div></div>
<div class="kpi"><div class="label">Sistem Durumu</div><div class="value"><span class="status" style="background:${statusColor}20;color:${statusColor}">${sc.label}</span></div></div>
</div>

<h2>📊 Endpoint Detayları</h2>
<table>
<thead><tr><th>Modül</th><th>Endpoint</th><th>Yanıt (ms)</th><th>Durum</th><th>Hata</th></tr></thead>
<tbody>
${details.map(d => `<tr>
<td>${(moduleLabels[d.module] || { label: d.module }).label}</td>
<td>${d.endpoint}</td>
<td>${d.response_time}</td>
<td class="${d.success ? "success" : "fail"}">${d.success ? "✓ Başarılı" : "✗ Başarısız"}</td>
<td>${d.error_message || "—"}</td>
</tr>`).join("")}
</tbody>
</table>

${alerts.length > 0 ? `<h2>⚠️ Uyarılar</h2>
${alerts.map(a => `<div class="alert alert-${a.severity}"><strong>${a.severity === "critical" ? "🔴 Kritik" : "🟡 Uyarı"}:</strong> ${a.message}</div>`).join("")}` : ""}

${test.summary?.ai_analysis?.recommendations ? `<h2>🤖 AI Önerileri</h2>
${test.summary.ai_analysis.recommendations.map((r: any) => `<div class="alert alert-warning"><strong>[${r.priority === "high" ? "Yüksek" : r.priority === "medium" ? "Orta" : "Düşük"}] ${r.title}:</strong> ${r.description}<br><em>→ ${r.action}</em></div>`).join("")}` : ""}

<div class="footer">Bu rapor Tekstil A.Ş. Performans İzleme Sistemi tarafından otomatik oluşturulmuştur. · ${new Date().toLocaleString("tr-TR")}</div>
</body>
</html>`;
}
