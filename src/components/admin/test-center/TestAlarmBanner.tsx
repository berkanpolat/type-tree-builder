import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TestAlarmBanner() {
  const [lastFail, setLastFail] = useState<{ id: string; failed: number; total: number; time: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("test_runs")
        .select("id, failed_tests, total_tests, started_at, overall_status")
        .order("started_at", { ascending: false })
        .limit(1) as any;

      if (data?.[0] && data[0].overall_status === "fail" && data[0].failed_tests > 0) {
        setLastFail({
          id: data[0].id,
          failed: data[0].failed_tests,
          total: data[0].total_tests,
          time: data[0].started_at,
        });
      } else {
        setLastFail(null);
      }
    };
    check();
  }, []);

  if (!lastFail || dismissed) return null;

  return (
    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
        <div>
          <span className="text-sm font-semibold text-red-700 dark:text-red-400">
            Son test koşusu başarısız!
          </span>
          <span className="text-xs text-red-600 dark:text-red-400 ml-2">
            {lastFail.failed}/{lastFail.total} test hatalı · {new Date(lastFail.time).toLocaleString("tr-TR")}
          </span>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDismissed(true)}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
