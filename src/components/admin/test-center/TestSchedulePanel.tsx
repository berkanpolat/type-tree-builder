import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarClock } from "lucide-react";
import { toast } from "sonner";

interface Schedule {
  id: string;
  name: string;
  cron_expression: string;
  test_layers: string[];
  enabled: boolean;
  last_run_at: string | null;
}

export default function TestSchedulePanel() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    const { data } = await supabase.from("test_schedules").select("*").order("created_at") as any;
    if (data && data.length === 0) {
      // Seed default schedules
      const defaults = [
        { name: "P0 Hızlı Test (15dk)", cron_expression: "*/15 * * * *", test_layers: ["infrastructure"], enabled: false },
        { name: "Günlük Tam Test", cron_expression: "0 6 * * *", test_layers: ["infrastructure", "data_integrity", "workflow"], enabled: false },
      ];
      const { data: seeded } = await supabase.from("test_schedules").insert(defaults).select("*") as any;
      setSchedules(seeded || []);
    } else {
      setSchedules(data || []);
    }
    setLoading(false);
  };

  const toggleSchedule = async (id: string, enabled: boolean) => {
    await supabase.from("test_schedules").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id) as any;
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
    toast.success(enabled ? "Zamanlama aktifleştirildi" : "Zamanlama durduruldu");
  };

  const cronLabel = (expr: string) => {
    if (expr === "*/15 * * * *") return "Her 15 dakika";
    if (expr === "0 6 * * *") return "Her gün 06:00";
    if (expr === "0 */6 * * *") return "Her 6 saat";
    return expr;
  };

  if (loading) return null;

  return (
    <Card className="border border-border/60 bg-card">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <CalendarClock className="w-4 h-4" />
          Zamanlanmış Testler
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-2">
        {schedules.map(schedule => (
          <div key={schedule.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">{schedule.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {cronLabel(schedule.cron_expression)}
                </span>
                {schedule.test_layers.map(l => (
                  <Badge key={l} variant="outline" className="text-[9px] h-4 px-1">
                    {l === "infrastructure" ? "L1" : l === "data_integrity" ? "L2" : "L3"}
                  </Badge>
                ))}
              </div>
              {schedule.last_run_at && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Son: {new Date(schedule.last_run_at).toLocaleString("tr-TR")}
                </div>
              )}
            </div>
            <Switch checked={schedule.enabled} onCheckedChange={(v) => toggleSchedule(schedule.id, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
