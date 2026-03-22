import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";

interface RunStat {
  started_at: string;
  passed_tests: number;
  failed_tests: number;
  warning_tests: number;
  total_tests: number;
}

interface Props {
  refreshKey: number;
}

export default function TestCharts({ refreshKey }: Props) {
  const [stats, setStats] = useState<RunStat[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("test_runs")
        .select("started_at, passed_tests, failed_tests, warning_tests, total_tests")
        .order("started_at", { ascending: true })
        .limit(10) as any;
      setStats(data || []);
    };
    load();
  }, [refreshKey]);

  if (stats.length < 2) return null;

  const maxTotal = Math.max(...stats.map(s => s.total_tests), 1);

  return (
    <Card className="border border-border/60 bg-card">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <TrendingUp className="w-4 h-4" />
          Başarı Oranı Trendi
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="flex items-end gap-1 h-24">
          {stats.map((s, i) => {
            const score = s.total_tests > 0 ? Math.round((s.passed_tests / s.total_tests) * 100) : 0;
            const height = Math.max(8, (score / 100) * 80);
            const color = score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-red-500";
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${new Date(s.started_at).toLocaleString("tr-TR")}: ${score}%`}>
                <span className="text-[8px] text-muted-foreground">{score}%</span>
                <div className={`w-full rounded-sm ${color} transition-all`} style={{ height: `${height}px` }} />
                <span className="text-[7px] text-muted-foreground truncate w-full text-center">
                  {new Date(s.started_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
