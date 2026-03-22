import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

const LAYERS = [
  {
    label: "L1 Altyapı + L2 Veri",
    frequency: "Her 15 dakika",
    reason: "DB erişimi ve veri bütünlüğü sürekli kontrol edilmeli",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  },
  {
    label: "L3 İş Akışı + L4 E2E",
    frequency: "Günde 2 kez",
    reason: "Gerçek akış testleri veri oluşturur, sık çalıştırılmamalı",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  },
  {
    label: "L5 UI Testleri",
    frequency: "Deployment sonrası",
    reason: "Browser-level testler sadece yeni deploy sonrası gerekir",
    color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  },
];

export default function TestOperationInfo() {
  return (
    <Card className="border border-border/60 bg-card">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Info className="w-4 h-4" />
          Operasyon Rehberi
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-2">
        {LAYERS.map((l, i) => (
          <div key={i} className="flex items-start gap-2 p-1.5 rounded bg-muted/30">
            <Badge className={`text-[10px] px-1.5 py-0.5 shrink-0 ${l.color}`}>{l.label}</Badge>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground">{l.frequency}</div>
              <div className="text-[10px] text-muted-foreground">{l.reason}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
