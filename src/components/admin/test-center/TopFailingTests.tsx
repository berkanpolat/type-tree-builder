import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircle, Flame } from "lucide-react";

interface FailStat {
  test_name: string;
  test_group: string;
  fail_count: number;
  error_category: string | null;
}

interface Props {
  refreshKey: number;
}

export default function TopFailingTests({ refreshKey }: Props) {
  const [fails, setFails] = useState<FailStat[]>([]);

  useEffect(() => {
    const load = async () => {
      // Get recent failed tests and count occurrences
      const { data } = await supabase
        .from("test_results")
        .select("test_name, test_group, error_category")
        .eq("status", "fail")
        .order("created_at", { ascending: false })
        .limit(200) as any;

      if (data) {
        const counts: Record<string, FailStat> = {};
        data.forEach((r: any) => {
          const key = r.test_name;
          if (!counts[key]) {
            counts[key] = { test_name: r.test_name, test_group: r.test_group, fail_count: 0, error_category: r.error_category };
          }
          counts[key].fail_count++;
        });
        const sorted = Object.values(counts).sort((a, b) => b.fail_count - a.fail_count).slice(0, 10);
        setFails(sorted);
      }
    };
    load();
  }, [refreshKey]);

  if (fails.length === 0) return null;

  return (
    <Card className="border border-border/60 bg-card">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Flame className="w-4 h-4 text-red-500" />
          En Çok Hata Veren Testler
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="space-y-1.5">
          {fails.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 rounded text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="truncate text-foreground text-xs">{f.test_name}</span>
                {f.error_category && (
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-mono">{f.error_category}</Badge>
                )}
              </div>
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shrink-0">{f.fail_count}×</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
