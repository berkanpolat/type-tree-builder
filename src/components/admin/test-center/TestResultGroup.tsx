import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, RefreshCcw, Database, Shield, Gavel, ShoppingBag, Package, MessageSquare, Bell, Headphones, Building2, Megaphone, Bot, Users, HardDrive, LinkIcon, FileWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const groupIcons: Record<string, React.ElementType> = {
  "Veritabanı Tabloları": Database,
  "Veritabanı Fonksiyonları": Database,
  "Kimlik Doğrulama": Shield,
  "İhale Sistemi": Gavel,
  "İhale Veri Bütünlüğü": Gavel,
  "İhale İş Akışı": Gavel,
  "Ürün Sistemi": ShoppingBag,
  "Ürün Veri Bütünlüğü": ShoppingBag,
  "Ürün İş Akışı": ShoppingBag,
  "Paket Sistemi": Package,
  "Paket Veri Bütünlüğü": Package,
  "Paket İş Akışı": Package,
  "Mesajlaşma": MessageSquare,
  "Mesajlaşma Bütünlüğü": MessageSquare,
  "Mesaj İş Akışı": MessageSquare,
  "Bildirimler": Bell,
  "Bildirim Bütünlüğü": Bell,
  "Destek Sistemi": Headphones,
  "Destek Bütünlüğü": Headphones,
  "Firma Sistemi": Building2,
  "Firma Veri Bütünlüğü": Building2,
  "Edge Functions": LinkIcon,
  "Depolama (Storage)": HardDrive,
  "Veri Bütünlüğü": FileWarning,
  "Şikayet Sistemi": AlertTriangle,
  "Şikayet Bütünlüğü": AlertTriangle,
  "Banner & Reklam": Megaphone,
  "Banner Bütünlüğü": Megaphone,
  "Chatbot": Bot,
  "Chatbot Bütünlüğü": Bot,
  "Admin Sistemi": Users,
  "Admin Bütünlüğü": Users,
  "Admin İş Akışı": Users,
  "Auth İş Akışı": Shield,
  "Dropdown Veri Doğrulama": Database,
  "Dropdown İş Akışı": Database,
  "Teklif Veri Bütünlüğü": Gavel,
  "Teklif İş Akışı": Gavel,
  "İletişim İş Akışı": MessageSquare,
};

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === "fail") return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
}

interface TestResult {
  group: string;
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  technicalDetail?: string;
  solution?: string;
  durationMs?: number;
  layer?: string;
  errorCategory?: string;
  stepFailed?: string;
  createdTestRecords?: string[];
  verifiedTables?: string[];
  cleanupStatus?: string;
  failureReason?: string;
  verificationSteps?: string[];
}

interface Props {
  group: string;
  items: TestResult[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function TestResultGroup({ group, items, isOpen, onToggle }: Props) {
  const Icon = groupIcons[group] || Database;
  const groupFail = items.filter(i => i.status === "fail").length;
  const groupWarn = items.filter(i => i.status === "warn").length;
  const groupPass = items.filter(i => i.status === "pass").length;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className={`border ${groupFail > 0 ? "border-red-300 dark:border-red-500/30" : "border-border/60"} bg-card`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="p-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <Icon className="w-4 h-4 text-foreground" />
                <CardTitle className="text-sm font-semibold text-foreground">{group}</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                {groupFail > 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{groupFail} hata</Badge>}
                {groupWarn > 0 && <Badge className="text-[10px] h-5 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">{groupWarn} uyarı</Badge>}
                {groupPass > 0 && <Badge className="text-[10px] h-5 px-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">{groupPass} başarılı</Badge>}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="space-y-1">
              {items.map((item, idx) => (
                <div key={idx} className={`rounded-md p-2 text-sm ${item.status === "fail" ? "bg-red-50 dark:bg-red-500/5" : item.status === "warn" ? "bg-amber-50 dark:bg-amber-500/5" : ""}`}>
                  <div className="flex items-start gap-2">
                    <StatusIcon status={item.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate text-foreground">{item.name}</span>
                          {item.errorCategory && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono">{item.errorCategory}</Badge>
                          )}
                          {item.layer && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 opacity-50">L{item.layer === "infrastructure" ? "1" : item.layer === "data_integrity" ? "2" : "3"}</Badge>
                          )}
                        </div>
                        {item.durationMs != null && (
                          <span className="text-[10px] shrink-0 text-muted-foreground">{item.durationMs}ms</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 text-muted-foreground">{item.detail}</p>
                      {item.stepFailed && (
                        <p className="text-[10px] mt-0.5 text-red-600 dark:text-red-400 font-mono">Step: {item.stepFailed}</p>
                      )}
                      {item.technicalDetail && (
                        <pre className="text-[10px] mt-1 p-1.5 rounded overflow-x-auto bg-muted text-muted-foreground">
                          {item.technicalDetail}
                        </pre>
                      )}
                      {item.solution && (
                        <div className="text-xs mt-1 flex items-start gap-1 text-blue-600 dark:text-blue-400">
                          <RefreshCcw className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{item.solution}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
