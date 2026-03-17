import { useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, AlertTriangle, Play, Loader2,
  ChevronDown, ChevronRight, Clock, Database, Shield, Gavel,
  ShoppingBag, Package, MessageSquare, Bell, Headphones, Building2,
  Megaphone, Bot, Users, HardDrive, LinkIcon, FileWarning, RefreshCcw,
  Download
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TestResult {
  group: string;
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  technicalDetail?: string;
  solution?: string;
  durationMs?: number;
}

interface TestSummary {
  total: number;
  pass: number;
  fail: number;
  warn: number;
  durationMs: number;
  results: TestResult[];
  timestamp: string;
}

const groupIcons: Record<string, React.ElementType> = {
  "Veritabanı Tabloları": Database,
  "Veritabanı Fonksiyonları": Database,
  "Kimlik Doğrulama": Shield,
  "İhale Sistemi": Gavel,
  "Ürün Sistemi": ShoppingBag,
  "Paket Sistemi": Package,
  "Mesajlaşma": MessageSquare,
  "Bildirimler": Bell,
  "Destek Sistemi": Headphones,
  "Firma Sistemi": Building2,
  "Edge Functions": LinkIcon,
  "Depolama (Storage)": HardDrive,
  "Veri Bütünlüğü": FileWarning,
  "Şikayet Sistemi": AlertTriangle,
  "Banner & Reklam": Megaphone,
  "Chatbot": Bot,
  "Admin Sistemi": Users,
};

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === "fail") return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
}

function generateReportHTML(data: TestSummary): string {
  const scorePercent = Math.round((data.pass / data.total) * 100);
  const ts = new Date(data.timestamp).toISOString();

  const grouped: Record<string, TestResult[]> = {};
  data.results.forEach(r => { (grouped[r.group] = grouped[r.group] || []).push(r); });

  const failResults = data.results.filter(r => r.status === "fail");
  const warnResults = data.results.filter(r => r.status === "warn");

  let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Test Report ${ts}</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 12px; padding: 30px; max-width: 1000px; margin: 0 auto; color: #1a1a1a; }
  h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 14px; margin-top: 24px; border-bottom: 1px solid #999; padding-bottom: 4px; }
  h3 { font-size: 13px; margin-top: 16px; color: #444; }
  .summary { display: flex; gap: 30px; margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 4px; }
  .summary div { text-align: center; }
  .summary .num { font-size: 24px; font-weight: bold; }
  .pass { color: #16a34a; } .fail { color: #dc2626; } .warn { color: #d97706; }
  .test-row { padding: 4px 0; border-bottom: 1px dotted #ddd; }
  .status-icon { display: inline-block; width: 16px; }
  .tech-detail { background: #f8f8f8; border-left: 3px solid #dc2626; padding: 6px 10px; margin: 4px 0 4px 20px; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
  .solution { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 6px 10px; margin: 4px 0 4px 20px; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
  .warn-detail { border-left-color: #d97706; background: #fffbeb; }
  .section-errors { margin: 12px 0; }
  @media print { body { padding: 10px; } }
</style></head><body>
<h1>TEKSTIL A.S. — SYSTEM TEST REPORT</h1>
<p><strong>Generated:</strong> ${ts}<br>
<strong>Duration:</strong> ${(data.durationMs / 1000).toFixed(2)}s<br>
<strong>Score:</strong> ${scorePercent}% (${data.pass}/${data.total} passed)</p>

<div class="summary">
  <div><div class="num">${data.total}</div>Total</div>
  <div><div class="num pass">${data.pass}</div>Passed</div>
  <div><div class="num fail">${data.fail}</div>Failed</div>
  <div><div class="num warn">${data.warn}</div>Warnings</div>
</div>`;

  // CRITICAL ERRORS SECTION
  if (failResults.length > 0) {
    html += `<h2>❌ CRITICAL ERRORS (${failResults.length})</h2><div class="section-errors">`;
    failResults.forEach((r, i) => {
      html += `<div class="test-row"><strong>${i + 1}. [${r.group}] ${r.name}</strong> — ${r.detail}`;
      if (r.technicalDetail) html += `<div class="tech-detail">${escapeHtml(r.technicalDetail)}</div>`;
      if (r.solution) html += `<div class="solution">FIX: ${escapeHtml(r.solution)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  // WARNINGS SECTION
  if (warnResults.length > 0) {
    html += `<h2>⚠️ WARNINGS (${warnResults.length})</h2><div class="section-errors">`;
    warnResults.forEach((r, i) => {
      html += `<div class="test-row"><strong>${i + 1}. [${r.group}] ${r.name}</strong> — ${r.detail}`;
      if (r.technicalDetail) html += `<div class="tech-detail warn-detail">${escapeHtml(r.technicalDetail)}</div>`;
      if (r.solution) html += `<div class="solution">FIX: ${escapeHtml(r.solution)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  // ALL RESULTS BY GROUP
  html += `<h2>📋 FULL RESULTS BY GROUP</h2>`;
  Object.entries(grouped).forEach(([group, items]) => {
    const gFail = items.filter(i => i.status === "fail").length;
    const gWarn = items.filter(i => i.status === "warn").length;
    const gPass = items.filter(i => i.status === "pass").length;
    html += `<h3>${group} (✅${gPass} ❌${gFail} ⚠️${gWarn})</h3>`;
    items.forEach(item => {
      const icon = item.status === "pass" ? "✅" : item.status === "fail" ? "❌" : "⚠️";
      const ms = item.durationMs != null ? ` [${item.durationMs}ms]` : "";
      html += `<div class="test-row"><span class="status-icon">${icon}</span> <strong>${item.name}</strong>${ms} — ${item.detail}`;
      if (item.status !== "pass" && item.technicalDetail) {
        html += `<div class="tech-detail${item.status === "warn" ? " warn-detail" : ""}">${escapeHtml(item.technicalDetail)}</div>`;
      }
      if (item.status !== "pass" && item.solution) {
        html += `<div class="solution">FIX: ${escapeHtml(item.solution)}</div>`;
      }
      html += `</div>`;
    });
  });

  html += `<hr style="margin-top:30px"><p style="font-size:10px;color:#999">Report generated by TekstilAS Test Center. Share this file with your developer or AI assistant for automated diagnosis.</p>`;
  html += `</body></html>`;
  return html;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function downloadReport(data: TestSummary) {
  const html = generateReportHTML(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  // Open in new tab for print-to-PDF
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => {
      setTimeout(() => win.print(), 500);
    };
  } else {
    // Fallback: direct download
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date(data.timestamp).toISOString().slice(0, 10);
    a.download = `test-report-${dateStr}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export default function AdminTestMerkezi() {
  const { user } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "fail" | "warn" | "pass">("all");

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
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bilinmeyen hata");
      setData(json);
      const failGroups = new Set<string>(json.results.filter((r: TestResult) => r.status === "fail").map((r: TestResult) => r.group));
      setOpenGroups(failGroups);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

  const scorePercent = data ? Math.round((data.pass / data.total) * 100) : 0;
  const scoreColor = scorePercent >= 90 ? "text-emerald-500" : scorePercent >= 70 ? "text-amber-500" : "text-red-500";
  const progressColor = scorePercent >= 90 ? "bg-emerald-500" : scorePercent >= 70 ? "bg-amber-500" : "bg-red-500";

  return (
    <AdminLayout title="Test Merkezi">
      <div className="space-y-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm" style={{ color: "hsl(var(--admin-muted))" }}>
              Tüm site fonksiyonlarını otomatik olarak test edin. Hatalar, detayları ve çözüm önerileriyle birlikte raporlanır.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {data && (
              <Button
                onClick={() => downloadReport(data)}
                variant="outline"
                className="text-xs"
                style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Rapor İndir (PDF)
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

        {error && (
          <Card className="border-red-500/30" style={{ background: "hsl(var(--admin-card))" }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-500">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Hata:</span>
                <span className="text-sm">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card style={{ background: "hsl(var(--admin-card))" }}>
                <CardContent className="p-4 text-center">
                  <div className={`text-3xl font-bold ${scoreColor}`}>{scorePercent}%</div>
                  <div className="text-xs mt-1" style={{ color: "hsl(var(--admin-muted))" }}>Başarı Oranı</div>
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full" style={{ background: "hsl(var(--admin-border))" }}>
                      <div className={`h-1.5 rounded-full ${progressColor} transition-all`} style={{ width: `${scorePercent}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card style={{ background: "hsl(var(--admin-card))" }}>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold" style={{ color: "hsl(var(--admin-text))" }}>{data.total}</div>
                  <div className="text-xs mt-1" style={{ color: "hsl(var(--admin-muted))" }}>Toplam Test</div>
                </CardContent>
              </Card>
              <Card style={{ background: "hsl(var(--admin-card))" }}>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-500">{data.pass}</div>
                  <div className="text-xs mt-1" style={{ color: "hsl(var(--admin-muted))" }}>Başarılı</div>
                </CardContent>
              </Card>
              <Card style={{ background: "hsl(var(--admin-card))" }}>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-red-500">{data.fail}</div>
                  <div className="text-xs mt-1" style={{ color: "hsl(var(--admin-muted))" }}>Başarısız</div>
                </CardContent>
              </Card>
              <Card style={{ background: "hsl(var(--admin-card))" }}>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-amber-500">{data.warn}</div>
                  <div className="text-xs mt-1" style={{ color: "hsl(var(--admin-muted))" }}>Uyarı</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs" style={{ color: "hsl(var(--admin-muted))" }}>
                <Clock className="w-3.5 h-3.5" />
                <span>{(data.durationMs / 1000).toFixed(1)}s</span>
                <span className="mx-1">·</span>
                <span>{new Date(data.timestamp).toLocaleString("tr-TR")}</span>
              </div>
              <div className="flex gap-1">
                {(["all", "fail", "warn", "pass"] as const).map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    onClick={() => setFilter(f)}
                    className={`text-xs h-7 px-2 ${filter === f ? "bg-amber-500 text-white hover:bg-amber-600 border-0" : ""}`}
                    style={filter !== f ? { borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-muted))" } : undefined}
                  >
                    {f === "all" ? "Tümü" : f === "fail" ? `❌ Hatalar (${data.fail})` : f === "warn" ? `⚠️ Uyarılar (${data.warn})` : `✅ Başarılı (${data.pass})`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Test Groups */}
            <div className="space-y-2">
              {filteredGrouped.map(({ group, items }) => {
                const Icon = groupIcons[group] || Database;
                const groupFail = items.filter(i => i.status === "fail").length;
                const groupWarn = items.filter(i => i.status === "warn").length;
                const groupPass = items.filter(i => i.status === "pass").length;
                const isOpen = openGroups.has(group);

                return (
                  <Collapsible key={group} open={isOpen} onOpenChange={() => toggleGroup(group)}>
                    <Card style={{ background: "hsl(var(--admin-card))", borderColor: groupFail > 0 ? "hsl(0 70% 50% / 0.3)" : "hsl(var(--admin-border))" }}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="p-3 cursor-pointer hover:opacity-80 transition-opacity">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: "hsl(var(--admin-muted))" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "hsl(var(--admin-muted))" }} />}
                              <Icon className="w-4 h-4" style={{ color: "hsl(var(--admin-text))" }} />
                              <CardTitle className="text-sm font-semibold" style={{ color: "hsl(var(--admin-text))" }}>{group}</CardTitle>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {groupFail > 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{groupFail} hata</Badge>}
                              {groupWarn > 0 && <Badge className="text-[10px] h-5 px-1.5 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30">{groupWarn} uyarı</Badge>}
                              {groupPass > 0 && <Badge className="text-[10px] h-5 px-1.5 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30">{groupPass} başarılı</Badge>}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="px-3 pb-3 pt-0">
                          <div className="space-y-1">
                            {items.map((item, idx) => (
                              <div key={idx} className="rounded-md p-2 text-sm" style={{ background: item.status === "fail" ? "hsl(0 70% 50% / 0.05)" : item.status === "warn" ? "hsl(40 100% 50% / 0.05)" : "transparent" }}>
                                <div className="flex items-start gap-2">
                                  <StatusIcon status={item.status} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium truncate" style={{ color: "hsl(var(--admin-text))" }}>{item.name}</span>
                                      {item.durationMs != null && (
                                        <span className="text-[10px] shrink-0" style={{ color: "hsl(var(--admin-muted))" }}>{item.durationMs}ms</span>
                                      )}
                                    </div>
                                    <p className="text-xs mt-0.5" style={{ color: "hsl(var(--admin-muted))" }}>{item.detail}</p>
                                    {item.technicalDetail && (
                                      <pre className="text-[10px] mt-1 p-1.5 rounded overflow-x-auto" style={{ background: "hsl(var(--admin-bg))", color: "hsl(var(--admin-muted))" }}>
                                        {item.technicalDetail}
                                      </pre>
                                    )}
                                    {item.solution && (
                                      <div className="text-xs mt-1 flex items-start gap-1" style={{ color: "hsl(210 80% 60%)" }}>
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
              })}
            </div>
          </>
        )}

        {/* Empty State */}
        {!data && !loading && !error && (
          <Card style={{ background: "hsl(var(--admin-card))" }}>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center mb-4">
                <Play className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "hsl(var(--admin-text))" }}>Test Merkezi</h3>
              <p className="text-sm max-w-md mx-auto mb-6" style={{ color: "hsl(var(--admin-muted))" }}>
                Veritabanı tabloları, edge function'lar, auth sistemi, ihale/ürün/paket akışları, mesajlaşma, bildirimler,
                storage, veri bütünlüğü ve daha fazlasını tek tıkla test edin.
              </p>
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
