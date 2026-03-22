import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TestSummaryCardsProps {
  total: number;
  pass: number;
  fail: number;
  warn: number;
  durationMs: number;
  timestamp: string;
}

export default function TestSummaryCards({ total, pass, fail, warn, durationMs, timestamp }: TestSummaryCardsProps) {
  const scorePercent = Math.round((pass / total) * 100);
  const scoreColor = scorePercent >= 90 ? "text-emerald-600" : scorePercent >= 70 ? "text-amber-600" : "text-red-600";
  const progressColor = scorePercent >= 90 ? "bg-emerald-500" : scorePercent >= 70 ? "bg-amber-500" : "bg-red-500";

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Başarı Oranı", value: `${scorePercent}%`, color: scoreColor, progress: scorePercent },
          { label: "Toplam Test", value: total },
          { label: "Başarılı", value: pass, color: "text-emerald-600" },
          { label: "Başarısız", value: fail, color: "text-red-600" },
          { label: "Uyarı", value: warn, color: "text-amber-600" },
        ].map((item, idx) => (
          <Card key={idx} className="border border-border/60 bg-card">
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${item.color || "text-foreground"}`}>{item.value}</div>
              <div className="text-xs mt-1 text-muted-foreground">{item.label}</div>
              {item.progress !== undefined && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div className={`h-1.5 rounded-full ${progressColor} transition-all`} style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        <span>{(durationMs / 1000).toFixed(1)}s</span>
        <span className="mx-1">·</span>
        <span>{new Date(timestamp).toLocaleString("tr-TR")}</span>
      </div>
    </>
  );
}
