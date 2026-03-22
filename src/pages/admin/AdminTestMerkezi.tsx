import { useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, Download, XCircle, Layers } from "lucide-react";
import TestSummaryCards from "@/components/admin/test-center/TestSummaryCards";
import TestResultGroup from "@/components/admin/test-center/TestResultGroup";
import TestHistory from "@/components/admin/test-center/TestHistory";
import TestCharts from "@/components/admin/test-center/TestCharts";
import TopFailingTests from "@/components/admin/test-center/TopFailingTests";
import TestSchedulePanel from "@/components/admin/test-center/TestSchedulePanel";
import { downloadReport } from "@/components/admin/test-center/TestReportGenerator";

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
] as const;

export default function AdminTestMerkezi() {
  const { user } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "fail" | "warn" | "pass">("all");
  const [selectedLayers, setSelectedLayers] = useState<string[]>(["infrastructure", "data_integrity", "workflow"]);
  const [refreshKey, setRefreshKey] = useState(0);

  const toggleLayer = (layer: string) => {
    setSelectedLayers(prev => {
      if (prev.includes(layer)) {
        return prev.length > 1 ? prev.filter(l => l !== layer) : prev;
      }
      return [...prev, layer];
    });
  };

  const runTests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = btoa(JSON.stringify({ uid: user.id, exp: Date.now() + 600000 }));
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-test-suite`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ token, layers: selectedLayers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bilinmeyen hata");
      setData(json);
      setRefreshKey(k => k + 1);
      const failGroups = new Set<string>(json.results.filter((r: TestResult) => r.status === "fail").map((r: TestResult) => r.group));
      setOpenGroups(failGroups);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, selectedLayers]);

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              3 katmanlı test mimarisi: Altyapı, Veri Bütünlüğü ve İş Akışı testleri. Sonuçlar veritabanında saklanır.
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
              {loading ? "Testler Çalışıyor..." : "Testleri Başlat"}
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

        {/* Summary + Side panels */}
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
                />
              ))}
            </div>
          </>
        )}

        {/* History */}
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
                3 katmanlı test mimarisi ile veritabanı, veri bütünlüğü ve iş akışlarını test edin. Sonuçlar otomatik kaydedilir.
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
      </div>
    </AdminLayout>
  );
}
