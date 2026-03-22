import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Database, Clock, Trash2, Shield } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface Props {
  test: TestResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const layerLabel = (l?: string) => {
  if (l === "infrastructure") return "L1 Altyapı";
  if (l === "data_integrity") return "L2 Veri Bütünlüğü";
  if (l === "workflow") return "L3 İş Akışı";
  if (l === "e2e_simulation") return "L4 E2E Simülasyon";
  if (l === "ui_browser") return "L5 UI";
  return l || "—";
};

export default function TestDetailDialog({ test, open, onOpenChange }: Props) {
  if (!test) return null;

  const StatusIcon = test.status === "pass" ? CheckCircle2 : test.status === "fail" ? XCircle : AlertTriangle;
  const statusColor = test.status === "pass" ? "text-emerald-500" : test.status === "fail" ? "text-red-500" : "text-amber-500";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <StatusIcon className={`w-5 h-5 ${statusColor}`} />
            {test.name}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-2">
            {/* Meta */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs">{layerLabel(test.layer)}</Badge>
              <Badge variant="outline" className="text-xs">{test.group}</Badge>
              {test.category && <Badge variant="outline" className="text-xs">{test.category}</Badge>}
              {test.errorCategory && <Badge variant="destructive" className="text-xs">{test.errorCategory}</Badge>}
            </div>

            {/* Duration */}
            {test.durationMs != null && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Süre: {test.durationMs}ms</span>
              </div>
            )}

            {/* Detail */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Sonuç</div>
              <p className="text-sm text-foreground">{test.detail}</p>
            </div>

            {/* Failure reason */}
            {test.failureReason && (
              <div>
                <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Hata Sebebi</div>
                <p className="text-sm text-red-600 dark:text-red-400">{test.failureReason}</p>
              </div>
            )}

            {/* Step failed */}
            {test.stepFailed && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Başarısız Adım</div>
                <code className="text-xs bg-muted px-2 py-1 rounded block">{test.stepFailed}</code>
              </div>
            )}

            {/* Verification steps */}
            {test.verificationSteps && test.verificationSteps.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Doğrulama Adımları
                </div>
                <div className="space-y-1">
                  {test.verificationSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Created test records */}
            {test.createdTestRecords && test.createdTestRecords.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5" />
                  Oluşturulan Test Kayıtları
                </div>
                <div className="space-y-0.5">
                  {test.createdTestRecords.map((rec, i) => (
                    <code key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded block font-mono">{rec}</code>
                  ))}
                </div>
              </div>
            )}

            {/* Verified tables */}
            {test.verifiedTables && test.verifiedTables.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5" />
                  Doğrulanan Tablolar
                </div>
                <div className="flex flex-wrap gap-1">
                  {test.verifiedTables.map((tbl, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-mono">{tbl}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Cleanup status */}
            {test.cleanupStatus && (
              <div className="flex items-center gap-1.5 text-xs">
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Cleanup:</span>
                <Badge variant={test.cleanupStatus === "success" ? "outline" : "destructive"} className="text-[10px]">
                  {test.cleanupStatus === "success" ? "Başarılı" : test.cleanupStatus === "failed" ? "Başarısız" : "Atlandı"}
                </Badge>
              </div>
            )}

            {/* Technical detail */}
            {test.technicalDetail && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Teknik Detay</div>
                <pre className="text-[10px] p-2 rounded bg-muted text-muted-foreground overflow-x-auto whitespace-pre-wrap">{test.technicalDetail}</pre>
              </div>
            )}

            {/* Solution */}
            {test.solution && (
              <div>
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Çözüm Önerisi</div>
                <p className="text-xs text-blue-600 dark:text-blue-400">{test.solution}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
