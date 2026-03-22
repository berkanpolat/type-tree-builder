import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, History } from "lucide-react";

interface TestRun {
  id: string;
  started_at: string;
  duration_ms: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  warning_tests: number;
  triggered_by: string;
}

interface Props {
  refreshKey: number;
  onSelectRun?: (runId: string) => void;
}

export default function TestHistory({ refreshKey, onSelectRun }: Props) {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("test_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20) as any;
      setRuns(data || []);
      setLoading(false);
    };
    load();
  }, [refreshKey]);

  if (loading) return <div className="text-sm text-muted-foreground p-4">Yükleniyor...</div>;
  if (runs.length === 0) return null;

  return (
    <Card className="border border-border/60 bg-card">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <History className="w-4 h-4" />
          Son Test Koşuları
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {runs.map(run => {
            const score = run.total_tests > 0 ? Math.round((run.passed_tests / run.total_tests) * 100) : 0;
            return (
              <div
                key={run.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors text-sm"
                onClick={() => onSelectRun?.(run.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {run.failed_tests > 0 ? (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  ) : run.warning_tests > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <span className="text-xs text-muted-foreground truncate">
                    {new Date(run.started_at).toLocaleString("tr-TR")}
                  </span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">{run.triggered_by}</Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold ${score >= 90 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-red-600"}`}>
                    {score}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {run.total_tests}t · {(run.duration_ms / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
