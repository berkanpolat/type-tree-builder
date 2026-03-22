import { useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, Download, XCircle, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TestSummaryCards from "@/components/admin/test-center/TestSummaryCards";
import TestResultGroup from "@/components/admin/test-center/TestResultGroup";
import TestHistory from "@/components/admin/test-center/TestHistory";
import TestCharts from "@/components/admin/test-center/TestCharts";
import TopFailingTests from "@/components/admin/test-center/TopFailingTests";
import TestSchedulePanel from "@/components/admin/test-center/TestSchedulePanel";
import TestDetailDialog from "@/components/admin/test-center/TestDetailDialog";
import TestAlarmBanner from "@/components/admin/test-center/TestAlarmBanner";
import TestValidationMode from "@/components/admin/test-center/TestValidationMode";
import TestOperationInfo from "@/components/admin/test-center/TestOperationInfo";
import { downloadReport } from "@/components/admin/test-center/TestReportGenerator";
import { runBrowserTests } from "@/lib/browser-test-engine";

interface TestResult {
  group: string;
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  technicalDetail?: string;
  solution?: string;
  durationMs?: number;
  layer?: string;
  category?: string;
  errorCategory?: string;
  stepFailed?: string;
  createdTestRecords?: string[];
  verifiedTables?: string[];
  cleanupStatus?: string;
  failureReason?: string;
  verificationSteps?: string[];
}

interface TestSummary {
  run_id?: string;
  total: number;
  pass: number;
  fail: number;
  warn: number;
  durationMs: number;
  results: TestResult[];
  timestamp: string;
}

const LAYER_OPTIONS = [
  { key: "infrastructure", label: "L1 Altyapı", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  { key: "data_integrity", label: "L2 Veri Bütünlüğü", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" },
  { key: "workflow", label: "L3 İş Akışı", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" },
  { key: "e2e_simulation", label: "L4 E2E Simülasyon", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
  { key: "ui_browser", label: "L5 UI Testleri", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
] as const;

export default function AdminTestMerkezi() {
  const { user } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "fail" | "warn" | "pass">("all");
  const [selectedLayers, setSelectedLayers] = useState<string[]>(["infrastructure", "data_integrity", "workflow", "e2e_simulation", "ui_browser"]);
  const [l5Running, setL5Running] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const toggleLayer = (layer: string) => {
    setSelectedLayers(prev => {
      if (prev.includes(layer)) {
        return prev.length > 1 ? prev.filter(l => l !== layer) : prev;
      }
      return [...prev, layer];
    });
  };

  const handleTestClick = (test: TestResult) => {
    setSelectedTest(test);
    setDetailOpen(true);
  };

  const runL5Tests = useCallback(async (): Promise<TestResult[]> => {
    const results = await runBrowserTests();
    return results.map(r => ({
      group: r.group,
      name: r.name,
      status: r.status,
      detail: r.detail,
      technicalDetail: r.technicalDetail,
      durationMs: r.durationMs,
      layer: "ui_browser",
      category: r.category,
      errorCategory: r.errorCategory,
    }));
  }, []);

  const saveL5Results = useCallback(async (results: TestResult[]) => {
    try {
      const pass = results.filter(r => r.status === "pass").length;
      const fail = results.filter(r => r.status === "fail").length;
      const totalDuration = results.reduce((s, r) => s + (r.durationMs || 0), 0);

      const { data: runData } = await supabase.from("test_runs").insert({
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: totalDuration,
        total_tests: results.length,
        passed_tests: pass,
        failed_tests: fail,
        warning_tests: 0,
        environment: "prod",
        triggered_by: "manual",
        layers: ["ui_browser"],
        overall_status: fail > 0 ? "fail" : "pass",
      } as any).select("id").single();

      if (runData?.id) {
        const rows = results.map(r => ({
          run_id: runData.id,
          test_name: r.name,
          category: "ui",
          status: r.status,
          error_message: r.technicalDetail || null,
          step_failed: null,
          duration_ms: r.durationMs || 0,
          error_category: r.errorCategory || null,
        }));
        await supabase.from("test_results").insert(rows as any);
      }
    } catch (e) {
      console.error("L5 save error:", e);
    }
  }, []);

  const runTests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const backendLayers = selectedLayers.filter(l => l !== "ui_browser");
      const includesL5 = selectedLayers.includes("ui_browser");

      let backendResults: TestResult[] = [];
      let backendSummary: any = null;

      if (backendLayers.length > 0) {
        const token = btoa(JSON.stringify({ uid: user.id, exp: Date.now() + 600000 }));
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-test-suite`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ token, layers: backendLayers }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Bilinmeyen hata");
        backendResults = json.results || [];
        backendSummary = json;
      }

      let l5Results: TestResult[] = [];
      if (includesL5) {
        setL5Running(true);
        l5Results = await runL5Tests();
        await saveL5Results(l5Results);
        setL5Running(false);
      }

      const allResults = [...backendResults, ...l5Results];
      const pass = allResults.filter(r => r.status === "pass").length;
      const fail = allResults.filter(r => r.status === "fail").length;
      const warn = allResults.filter(r => r.status === "warn").length;

      const merged: TestSummary = {
        run_id: backendSummary?.run_id,
        total: allResults.length,
        pass,
        fail,
        warn,
        durationMs: (backendSummary?.durationMs || 0) + l5Results.reduce((s, r) => s + (r.durationMs || 0), 0),
        results: allResults,
        timestamp: new Date().toISOString(),
      };

      setData(merged);
      setRefreshKey(k => k + 1);
      const failGroups = new Set<string>(allResults.filter(r => r.status === "fail").map(r => r.group));
      setOpenGroups(failGroups);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setL5Running(false);
    }
  }, [user, selectedLayers, runL5Tests, saveL5Results]);

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const grouped = (data?.results || []).reduce<Record<string, TestResult[]>>((acc, r) => {
    (acc[r.group] = acc[r.group] || []).push(r);
    return acc;
  }, {});

  const filteredGrouped = Object.entries(grouped).map(([group, items]) => ({
    group,
    items: filter === "all" ? items : items.filter(i => i.status === filter),
  })).filter(g => g.items.length > 0);

  return (
    <AdminLayout title="Test Merkezi v2">
      <div className="space-y-4 max-w-6xl">
        {/* Alarm Banner */}
        <TestAlarmBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              5 katmanlı test mimarisi: Altyapı, Veri Bütünlüğü, İş Akışı, E2E Simülasyon ve UI testleri.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {data && (
              <Button onClick={() => downloadReport(data)} variant="outline" className="text-xs">
                <Download className="w-4 h-4 mr-1.5" />
                Rapor İndir
              </Button>
            )}
            <Button
              onClick={runTests}
              disabled={loading}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              {loading ? (l5Running ? "UI Testleri..." : "Testler Çalışıyor...") : "Testleri Başlat"}
            </Button>
          </div>
        </div>

        {/* Layer Selection */}
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-1">Katmanlar:</span>
          {LAYER_OPTIONS.map(opt => (
            <Badge
              key={opt.key}
              className={`cursor-pointer text-xs px-2 py-0.5 transition-all ${selectedLayers.includes(opt.key) ? opt.color : "bg-muted text-muted-foreground opacity-50"}`}
              onClick={() => toggleLayer(opt.key)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>

        {error && (
          <Card className="border-red-300 dark:border-red-500/30 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Hata:</span>
                <span className="text-sm">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <TestSummaryCards
              total={data.total}
              pass={data.pass}
              fail={data.fail}
              warn={data.warn}
              durationMs={data.durationMs}
              timestamp={data.timestamp}
            />

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <TestCharts refreshKey={refreshKey} />
              <TopFailingTests refreshKey={refreshKey} />
              <TestSchedulePanel />
            </div>

            {/* Filter Bar */}
            <div className="flex gap-1">
              {(["all", "fail", "warn", "pass"] as const).map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                  className={`text-xs h-7 px-2 ${filter === f ? "bg-amber-500 text-white hover:bg-amber-600 border-0" : ""}`}
                >
                  {f === "all" ? "Tümü" : f === "fail" ? `❌ Hatalar (${data.fail})` : f === "warn" ? `⚠️ Uyarılar (${data.warn})` : `✅ Başarılı (${data.pass})`}
                </Button>
              ))}
            </div>

            {/* Test Groups */}
            <div className="space-y-2">
              {filteredGrouped.map(({ group, items }) => (
                <TestResultGroup
                  key={group}
                  group={group}
                  items={items}
                  isOpen={openGroups.has(group)}
                  onToggle={() => toggleGroup(group)}
                  onTestClick={handleTestClick}
                />
              ))}
            </div>
          </>
        )}

        {/* Validation Mode + Operation Info + History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TestValidationMode />
          <TestOperationInfo />
        </div>

        <TestHistory refreshKey={refreshKey} />

        {/* Empty State */}
        {!data && !loading && !error && (
          <Card className="bg-card border border-border/60">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Test Merkezi v2</h3>
              <p className="text-sm max-w-md mx-auto mb-4 text-muted-foreground">
                5 katmanlı test mimarisi ile veritabanı, veri bütünlüğü, iş akışları, E2E simülasyon ve UI testlerini çalıştırın.
              </p>
              <div className="flex items-center justify-center gap-2 mb-6">
                {LAYER_OPTIONS.map(opt => (
                  <Badge key={opt.key} className={`text-xs ${opt.color}`}>{opt.label}</Badge>
                ))}
              </div>
              <Button onClick={runTests} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700">
                <Play className="w-4 h-4 mr-2" />
                Testleri Başlat
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Test Detail Dialog */}
        <TestDetailDialog test={selectedTest} open={detailOpen} onOpenChange={setDetailOpen} />
      </div>
    </AdminLayout>
  );
}
