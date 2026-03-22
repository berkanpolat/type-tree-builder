import { Download } from "lucide-react";

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
}

interface TestSummary {
  total: number;
  pass: number;
  fail: number;
  warn: number;
  durationMs: number;
  results: TestResult[];
  timestamp: string;
  run_id?: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function generateReportHTML(data: TestSummary): string {
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
  .tech-detail { background: #f8f8f8; border-left: 3px solid #dc2626; padding: 6px 10px; margin: 4px 0 4px 20px; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
  .solution { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 6px 10px; margin: 4px 0 4px 20px; font-size: 11px; }
  .warn-detail { border-left-color: #d97706; background: #fffbeb; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-left: 4px; }
  .badge-layer { background: #e2e8f0; color: #475569; }
  .badge-error { background: #fee2e2; color: #991b1b; }
  @media print { body { padding: 10px; } }
</style></head><body>
<h1>TEKSTİL A.Ş. — SYSTEM TEST REPORT (3-Layer)</h1>
<p><strong>Generated:</strong> ${ts}<br>
<strong>Duration:</strong> ${(data.durationMs / 1000).toFixed(2)}s<br>
<strong>Score:</strong> ${scorePercent}% (${data.pass}/${data.total} passed)<br>
<strong>Layers:</strong> Infrastructure + Data Integrity + Workflow</p>

<div class="summary">
  <div><div class="num">${data.total}</div>Total</div>
  <div><div class="num pass">${data.pass}</div>Passed</div>
  <div><div class="num fail">${data.fail}</div>Failed</div>
  <div><div class="num warn">${data.warn}</div>Warnings</div>
</div>`;

  if (failResults.length > 0) {
    html += `<h2>❌ CRITICAL ERRORS (${failResults.length})</h2>`;
    failResults.forEach((r, i) => {
      html += `<div class="test-row"><strong>${i + 1}. [${r.group}] ${r.name}</strong>`;
      if (r.errorCategory) html += ` <span class="badge badge-error">${r.errorCategory}</span>`;
      if (r.layer) html += ` <span class="badge badge-layer">${r.layer}</span>`;
      html += ` — ${r.detail}`;
      if (r.stepFailed) html += `<div class="tech-detail">STEP FAILED: ${escapeHtml(r.stepFailed)}</div>`;
      if (r.technicalDetail) html += `<div class="tech-detail">${escapeHtml(r.technicalDetail)}</div>`;
      if (r.solution) html += `<div class="solution">FIX: ${escapeHtml(r.solution)}</div>`;
      html += `</div>`;
    });
  }

  if (warnResults.length > 0) {
    html += `<h2>⚠️ WARNINGS (${warnResults.length})</h2>`;
    warnResults.forEach((r, i) => {
      html += `<div class="test-row"><strong>${i + 1}. [${r.group}] ${r.name}</strong> — ${r.detail}`;
      if (r.technicalDetail) html += `<div class="tech-detail warn-detail">${escapeHtml(r.technicalDetail)}</div>`;
      if (r.solution) html += `<div class="solution">FIX: ${escapeHtml(r.solution)}</div>`;
      html += `</div>`;
    });
  }

  html += `<h2>📋 FULL RESULTS BY GROUP</h2>`;
  Object.entries(grouped).forEach(([group, items]) => {
    const gF = items.filter(i => i.status === "fail").length;
    const gW = items.filter(i => i.status === "warn").length;
    const gP = items.filter(i => i.status === "pass").length;
    html += `<h3>${group} (✅${gP} ❌${gF} ⚠️${gW})</h3>`;
    items.forEach(item => {
      const icon = item.status === "pass" ? "✅" : item.status === "fail" ? "❌" : "⚠️";
      const ms = item.durationMs != null ? ` [${item.durationMs}ms]` : "";
      html += `<div class="test-row"><span>${icon}</span> <strong>${item.name}</strong>${ms} — ${item.detail}</div>`;
    });
  });

  html += `<hr style="margin-top:30px"><p style="font-size:10px;color:#999">Report generated by TekstilAS Test Center v2.0 (3-Layer Architecture)</p>`;
  html += `</body></html>`;
  return html;
}

export function downloadReport(data: TestSummary) {
  const html = generateReportHTML(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => { setTimeout(() => win.print(), 500); };
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-report-${new Date(data.timestamp).toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
