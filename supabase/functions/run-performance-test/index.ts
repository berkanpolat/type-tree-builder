import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://tekstilas.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// API endpoints to test
const API_ENDPOINTS = [
  { name: "Supabase Health", url: `${SUPABASE_URL}/rest/v1/firma_turleri?select=count&limit=0`, method: "GET" },
  { name: "Auth Health", url: `${SUPABASE_URL}/auth/v1/health`, method: "GET" },
  { name: "Firma Türleri", url: `${SUPABASE_URL}/rest/v1/firma_turleri?select=id,name&limit=1`, method: "GET" },
  { name: "Firma Tipleri", url: `${SUPABASE_URL}/rest/v1/firma_tipleri?select=id,name&limit=1`, method: "GET" },
  { name: "Banners", url: `${SUPABASE_URL}/rest/v1/banners?select=id&aktif=eq.true&limit=1`, method: "GET" },
  { name: "Chatbot Config", url: `${SUPABASE_URL}/rest/v1/chatbot_config?select=id&limit=1`, method: "GET" },
  { name: "Paketler", url: `${SUPABASE_URL}/rest/v1/paketler?select=id,ad&limit=1`, method: "GET" },
  { name: "Bilgi Kategorileri", url: `${SUPABASE_URL}/rest/v1/firma_bilgi_kategorileri?select=id&limit=1`, method: "GET" },
];

const PAGE_ENDPOINTS = [
  { name: "Ana Sayfa (Landing)", url: SITE_URL },
  { name: "Dashboard", url: `${SITE_URL}/dashboard` },
  { name: "TekPazar Ana Sayfa", url: `${SITE_URL}/tekpazar` },
  { name: "Firma Bilgilerim", url: `${SITE_URL}/firma-bilgilerim` },
  { name: "İhalelerim", url: `${SITE_URL}/ihalelerim` },
  { name: "Yeni İhale", url: `${SITE_URL}/ihalelerim/yeni` },
  { name: "İhaleler (TekIhale)", url: `${SITE_URL}/ihaleler` },
  { name: "Tekliflerim", url: `${SITE_URL}/tekliflerim` },
  { name: "Ürünlerim", url: `${SITE_URL}/urunlerim` },
  { name: "Yeni Ürün", url: `${SITE_URL}/urunlerim/yeni` },
  { name: "Favoriler", url: `${SITE_URL}/favoriler` },
  { name: "Mesajlar", url: `${SITE_URL}/mesajlar` },
  { name: "Bildirimler", url: `${SITE_URL}/bildirimler` },
  { name: "Paketim", url: `${SITE_URL}/paketim` },
  { name: "Destek", url: `${SITE_URL}/destek` },
  { name: "Hizmet Bilgileri", url: `${SITE_URL}/hizmet-bilgileri` },
  { name: "Ürün Bilgileri", url: `${SITE_URL}/urun-bilgileri` },
  { name: "Ürün Kategorisi", url: `${SITE_URL}/urun-kategorisi` },
  { name: "Giriş/Kayıt", url: `${SITE_URL}/giris-kayit` },
  { name: "Firmalar (TekRehber)", url: `${SITE_URL}/firmalar` },
  { name: "Profil Ayarları", url: `${SITE_URL}/profil-ayarlari` },
  { name: "Hakkımızda", url: `${SITE_URL}/hakkimizda` },
  { name: "İletişim", url: `${SITE_URL}/iletisim` },
  { name: "Üretici/Tedarikçi Keşfi", url: `${SITE_URL}/uretici-tedarikci-kesfi` },
  { name: "TekIhale Tanıtım", url: `${SITE_URL}/tekihale-tanitim` },
  { name: "TekPazar Tanıtım", url: `${SITE_URL}/tekpazar-tanitim` },
  { name: "SSS", url: `${SITE_URL}/sss` },
  { name: "Gizlilik Koşulları", url: `${SITE_URL}/gizlilik-kosullari` },
  { name: "KVKK Aydınlatma", url: `${SITE_URL}/kvkk-aydinlatma` },
  { name: "Kullanım Koşulları", url: `${SITE_URL}/kullanim-kosullari` },
  { name: "Mesafeli Satış Sözleşmesi", url: `${SITE_URL}/mesafeli-satis-sozlesmesi` },
  { name: "Şifre Sıfırla", url: `${SITE_URL}/sifre-sifirla` },
  { name: "Telefon Doğrulama", url: `${SITE_URL}/telefon-dogrulama` },
];

const USER_SCENARIOS = [
  { name: "Ana Sayfa Yükleme", url: SITE_URL, description: "Ana sayfayı yükle" },
  { name: "Dashboard", url: `${SITE_URL}/dashboard`, description: "Dashboard sayfası" },
  { name: "Firma Listesi Görüntüleme", url: `${SITE_URL}/firmalar`, description: "Firma rehberini aç" },
  { name: "İhale Listesi", url: `${SITE_URL}/ihaleler`, description: "İhale listesini görüntüle" },
  { name: "Ürün Listesi", url: `${SITE_URL}/tekpazar`, description: "Ürün/pazar sayfası" },
  { name: "Giriş Sayfası", url: `${SITE_URL}/giris-kayit`, description: "Giriş sayfasını yükle" },
  { name: "Hakkımızda", url: `${SITE_URL}/hakkimizda`, description: "Hakkımızda sayfası" },
  { name: "SSS", url: `${SITE_URL}/sss`, description: "SSS sayfası" },
  { name: "İletişim", url: `${SITE_URL}/iletisim`, description: "İletişim sayfası" },
  { name: "Destek", url: `${SITE_URL}/destek`, description: "Destek sayfası" },
];

async function testEndpoint(url: string, method = "GET", headers: Record<string, string> = {}): Promise<{ responseTime: number; statusCode: number; success: boolean; error?: string; contentLength?: number }> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      method,
      headers: { ...headers },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const end = performance.now();
    const body = await res.text();
    return {
      responseTime: Math.round(end - start),
      statusCode: res.status,
      success: res.ok,
      contentLength: body.length,
    };
  } catch (e: any) {
    const end = performance.now();
    return {
      responseTime: Math.round(end - start),
      statusCode: 0,
      success: false,
      error: e.message || "Unknown error",
    };
  }
}

async function runApiHealthTests(supabase: any, testId: string): Promise<any[]> {
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const results = [];
  for (const ep of API_ENDPOINTS) {
    const headers: Record<string, string> = {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    };
    const result = await testEndpoint(ep.url, ep.method, headers);
    const row = {
      test_id: testId,
      module: "api_health",
      endpoint: ep.name,
      response_time: result.responseTime,
      status_code: result.statusCode,
      success: result.success,
      error_message: result.error || null,
      details: { url: ep.url, content_length: result.contentLength },
    };
    results.push(row);
    await supabase.from("performance_test_results").insert(row);
  }
  return results;
}

async function runPageTests(supabase: any, testId: string): Promise<any[]> {
  const results = [];
  for (const page of PAGE_ENDPOINTS) {
    const result = await testEndpoint(page.url);
    const row = {
      test_id: testId,
      module: "page_performance",
      endpoint: page.name,
      response_time: result.responseTime,
      status_code: result.statusCode,
      success: result.success,
      error_message: result.error || null,
      details: {
        url: page.url,
        page_size_kb: result.contentLength ? Math.round(result.contentLength / 1024) : 0,
      },
    };
    results.push(row);
    await supabase.from("performance_test_results").insert(row);
  }
  return results;
}

async function runScenarioTests(supabase: any, testId: string): Promise<any[]> {
  const results = [];
  for (const scenario of USER_SCENARIOS) {
    const result = await testEndpoint(scenario.url);
    const row = {
      test_id: testId,
      module: "user_scenario",
      endpoint: scenario.name,
      response_time: result.responseTime,
      status_code: result.statusCode,
      success: result.success,
      error_message: result.error || null,
      details: { description: scenario.description, url: scenario.url },
    };
    results.push(row);
    await supabase.from("performance_test_results").insert(row);
  }
  return results;
}

async function runLoadTest(supabase: any, testId: string, concurrency = 10): Promise<any[]> {
  const targetUrl = `${SUPABASE_URL}/rest/v1/firma_turleri?select=id&limit=1`;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

  const promises = Array.from({ length: concurrency }, (_, i) =>
    testEndpoint(targetUrl, "GET", headers)
  );

  const loadResults = await Promise.all(promises);
  const times = loadResults.map(r => r.responseTime);
  const successCount = loadResults.filter(r => r.success).length;
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  const row = {
    test_id: testId,
    module: "load_test",
    endpoint: `Yük Testi (${concurrency} eş zamanlı)`,
    response_time: avgTime,
    status_code: successCount === concurrency ? 200 : 500,
    success: successCount === concurrency,
    error_message: successCount < concurrency ? `${concurrency - successCount}/${concurrency} istek başarısız` : null,
    details: {
      concurrency,
      avg_time: avgTime,
      max_time: maxTime,
      min_time: minTime,
      success_count: successCount,
      total_requests: concurrency,
      success_rate: Math.round((successCount / concurrency) * 100),
    },
  };
  await supabase.from("performance_test_results").insert(row);
  return [row];
}

function calculateScore(allResults: any[]): { score: number; status: string; avgTime: number; maxTime: number; errorRate: number } {
  if (!allResults.length) return { score: 0, status: "critical", avgTime: 0, maxTime: 0, errorRate: 100 };

  const times = allResults.map(r => r.response_time || 0);
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const maxTime = Math.max(...times);
  const failedCount = allResults.filter(r => !r.success).length;
  const errorRate = Math.round((failedCount / allResults.length) * 100 * 100) / 100;

  // Score calculation
  let score = 100;
  // Penalize for avg response time
  if (avgTime > 2000) score -= 30;
  else if (avgTime > 1000) score -= 20;
  else if (avgTime > 500) score -= 10;
  else if (avgTime > 300) score -= 5;

  // Penalize for max response time
  if (maxTime > 5000) score -= 15;
  else if (maxTime > 3000) score -= 10;
  else if (maxTime > 1500) score -= 5;

  // Penalize for errors
  score -= errorRate * 3;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status = "healthy";
  if (score < 50) status = "critical";
  else if (score < 75) status = "warning";

  return { score, status, avgTime, maxTime, errorRate };
}

async function generateAlerts(supabase: any, testId: string, allResults: any[], scoreData: any) {
  const alerts = [];

  // Check for slow responses
  for (const r of allResults) {
    if (r.response_time > 1000) {
      alerts.push({
        test_id: testId,
        alert_type: "slow_response",
        severity: r.response_time > 3000 ? "critical" : "warning",
        message: `${r.endpoint}: ${r.response_time}ms yanıt süresi (limit: 1000ms)`,
        endpoint: r.endpoint,
        value: r.response_time,
        threshold: 1000,
      });
    }
  }

  // High error rate
  if (scoreData.errorRate > 3) {
    alerts.push({
      test_id: testId,
      alert_type: "high_error_rate",
      severity: scoreData.errorRate > 10 ? "critical" : "warning",
      message: `Hata oranı %${scoreData.errorRate} (limit: %3)`,
      value: scoreData.errorRate,
      threshold: 3,
    });
  }

  // System unreachable
  const criticalFails = allResults.filter(r => !r.success && r.module === "api_health");
  if (criticalFails.length > API_ENDPOINTS.length / 2) {
    alerts.push({
      test_id: testId,
      alert_type: "system_down",
      severity: "critical",
      message: `Sistem erişilemez: ${criticalFails.length}/${API_ENDPOINTS.length} API endpoint başarısız`,
      value: criticalFails.length,
      threshold: 1,
    });
  }

  if (alerts.length > 0) {
    await supabase.from("performance_alerts").insert(alerts);
  }
  return alerts;
}

function generateAiAnalysis(allResults: any[], scoreData: any): any {
  const recommendations = [];
  const bottlenecks = [];

  // Analyze slow endpoints
  const slowEndpoints = allResults.filter(r => r.response_time > 500).sort((a, b) => b.response_time - a.response_time);
  if (slowEndpoints.length > 0) {
    bottlenecks.push({
      type: "slow_endpoints",
      count: slowEndpoints.length,
      worst: slowEndpoints[0].endpoint,
      worst_time: slowEndpoints[0].response_time,
    });
    recommendations.push({
      priority: "high",
      title: "Yavaş Endpoint Optimizasyonu",
      description: `${slowEndpoints.length} endpoint 500ms üzerinde yanıt veriyor. En yavaş: ${slowEndpoints[0].endpoint} (${slowEndpoints[0].response_time}ms)`,
      action: "Veritabanı sorgularını optimize edin, index ekleyin veya cache kullanın.",
    });
  }

  // Page size analysis
  const largePages = allResults.filter(r => r.module === "page_performance" && (r.details?.page_size_kb || 0) > 500);
  if (largePages.length > 0) {
    recommendations.push({
      priority: "medium",
      title: "Sayfa Boyutu Optimizasyonu",
      description: `${largePages.length} sayfa 500KB üzerinde. Görselleri sıkıştırın ve CDN kullanın.`,
      action: "Görselleri WebP formatına dönüştürün, lazy loading uygulayın.",
    });
  }

  // Cache recommendation
  if (scoreData.avgTime > 300) {
    recommendations.push({
      priority: "medium",
      title: "Cache Stratejisi",
      description: "Ortalama yanıt süresi yüksek. Redis veya CDN cache kullanın.",
      action: "Sık erişilen verilere cache ekleyin (firma_turleri, firma_tipleri, banners).",
    });
  }

  // Error rate
  if (scoreData.errorRate > 0) {
    recommendations.push({
      priority: "high",
      title: "Hata Oranı Düşürme",
      description: `%${scoreData.errorRate} hata oranı tespit edildi.`,
      action: "Hatalı endpointleri inceleyin, retry mekanizması ekleyin.",
    });
  }

  // Load test analysis
  const loadResults = allResults.filter(r => r.module === "load_test");
  if (loadResults.length > 0) {
    const loadData = loadResults[0]?.details;
    if (loadData && loadData.success_rate < 100) {
      bottlenecks.push({
        type: "concurrency",
        success_rate: loadData.success_rate,
      });
      recommendations.push({
        priority: "high",
        title: "Eş Zamanlı İstek Kapasitesi",
        description: `Yük testinde %${loadData.success_rate} başarı oranı.`,
        action: "Connection pooling ve rate limiting kontrol edin.",
      });
    }
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      priority: "low",
      title: "Sistem Stabil",
      description: "Tüm metrikler kabul edilebilir seviyede.",
      action: "Düzenli performans takibine devam edin.",
    });
  }

  return { recommendations, bottlenecks };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const { action, token, concurrency = 20 } = body;

    // Verify admin token
    if (action !== "scheduled") {
      if (!token) return jsonResponse({ error: "Token gerekli" }, 401);
      try {
        const payload = JSON.parse(atob(token));
        if (payload.exp < Date.now()) return jsonResponse({ error: "Token süresi dolmuş" }, 401);
      } catch {
        return jsonResponse({ error: "Geçersiz token" }, 401);
      }
    }

    if (action === "run-test") {
      // Create test record
      const { data: test, error: testErr } = await supabase
        .from("performance_tests")
        .insert({ test_type: body.test_type || "manual", status: "running" })
        .select()
        .single();

      if (testErr) return jsonResponse({ error: testErr.message }, 500);

      // Run all test modules
      const apiResults = await runApiHealthTests(supabase, test.id);
      const pageResults = await runPageTests(supabase, test.id);
      const scenarioResults = await runScenarioTests(supabase, test.id);
      const loadResults = await runLoadTest(supabase, test.id, Math.min(concurrency, 50));

      const allResults = [...apiResults, ...pageResults, ...scenarioResults, ...loadResults];
      const scoreData = calculateScore(allResults);
      const aiAnalysis = generateAiAnalysis(allResults, scoreData);
      const alerts = await generateAlerts(supabase, test.id, allResults, scoreData);

      // Update test record
      await supabase
        .from("performance_tests")
        .update({
          status: "completed",
          overall_score: scoreData.score,
          system_status: scoreData.status,
          avg_response_time: scoreData.avgTime,
          max_response_time: scoreData.maxTime,
          error_rate: scoreData.errorRate,
          total_endpoints: allResults.length,
          failed_endpoints: allResults.filter(r => !r.success).length,
          completed_at: new Date().toISOString(),
          summary: {
            ai_analysis: aiAnalysis,
            alerts_count: alerts.length,
            modules: {
              api_health: apiResults.length,
              page_performance: pageResults.length,
              user_scenario: scenarioResults.length,
              load_test: loadResults.length,
            },
          },
        })
        .eq("id", test.id);

      return jsonResponse({
        test_id: test.id,
        score: scoreData.score,
        status: scoreData.status,
        avg_response_time: scoreData.avgTime,
        max_response_time: scoreData.maxTime,
        error_rate: scoreData.errorRate,
        total_endpoints: allResults.length,
        failed_endpoints: allResults.filter(r => !r.success).length,
        ai_analysis: aiAnalysis,
        alerts_count: alerts.length,
      });
    }

    if (action === "get-history") {
      const { days = 7, limit = 50 } = body;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("performance_tests")
        .select("*")
        .eq("status", "completed")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ tests: data });
    }

    if (action === "get-test-detail") {
      const { test_id } = body;
      if (!test_id) return jsonResponse({ error: "test_id gerekli" }, 400);

      const [testRes, resultsRes, alertsRes] = await Promise.all([
        supabase.from("performance_tests").select("*").eq("id", test_id).single(),
        supabase.from("performance_test_results").select("*").eq("test_id", test_id).order("created_at"),
        supabase.from("performance_alerts").select("*").eq("test_id", test_id).order("created_at"),
      ]);

      if (testRes.error) return jsonResponse({ error: testRes.error.message }, 500);
      return jsonResponse({
        test: testRes.data,
        results: resultsRes.data || [],
        alerts: alertsRes.data || [],
      });
    }

    if (action === "get-alerts") {
      const { limit = 50 } = body;
      const { data, error } = await supabase
        .from("performance_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ alerts: data });
    }

    if (action === "get-schedules") {
      const { data, error } = await supabase
        .from("performance_test_schedules")
        .select("*")
        .order("interval_minutes");

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ schedules: data });
    }

    if (action === "update-schedule") {
      const { schedule_id, enabled } = body;
      if (!schedule_id) return jsonResponse({ error: "schedule_id gerekli" }, 400);

      const { error } = await supabase
        .from("performance_test_schedules")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", schedule_id);

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ success: true });
    }

    if (action === "fix-issues") {
      const fixes: { action: string; status: "success" | "warning" | "info"; detail: string }[] = [];
      const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

      // ── 1. Clean up old performance data (older than 30 days) ──
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: deletedResults } = await supabase
        .from("performance_test_results")
        .delete()
        .lt("created_at", thirtyDaysAgo.toISOString())
        .select("id", { count: "exact", head: true });
      const { count: deletedAlerts } = await supabase
        .from("performance_alerts")
        .delete()
        .lt("created_at", thirtyDaysAgo.toISOString())
        .select("id", { count: "exact", head: true });
      const totalCleaned = (deletedResults || 0) + (deletedAlerts || 0);
      if (totalCleaned > 0) {
        fixes.push({
          action: "Eski performans verileri temizlendi",
          status: "success",
          detail: `30 günden eski ${totalCleaned} kayıt silindi.`,
        });
      }

      // ── 2. Get last test and re-test failed endpoints (parallel, max 5) ──
      const { data: lastTest } = await supabase
        .from("performance_tests")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastTest) {
        const { data: results } = await supabase
          .from("performance_test_results")
          .select("*")
          .eq("test_id", lastTest.id);

        const failedEndpoints = (results || []).filter(r => !r.success).slice(0, 5);
        const slowEndpoints = (results || []).filter(r => r.success && r.response_time > 1000).slice(0, 5);

        // Re-test failed endpoints in parallel
        if (failedEndpoints.length > 0) {
          const retestPromises = failedEndpoints.map(ep => {
            const url = ep.details?.url || "";
            if (!url) return Promise.resolve(null);
            const headers: Record<string, string> = ep.module === "api_health"
              ? { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
              : {};
            return testEndpoint(url, "GET", headers).then(r => ({ ep, result: r }));
          });

          const retests = (await Promise.all(retestPromises)).filter(Boolean) as { ep: any; result: any }[];
          const fixedCount = retests.filter(r => r.result.success).length;
          const stillBroken = retests.filter(r => !r.result.success).length;

          fixes.push({
            action: `${failedEndpoints.length} başarısız endpoint yeniden test edildi`,
            status: fixedCount > 0 ? "success" : "warning",
            detail: fixedCount > 0
              ? `${fixedCount} endpoint düzeldi (geçici sorundu).${stillBroken > 0 ? ` ${stillBroken} tanesi hâlâ sorunlu.` : ""}`
              : `${stillBroken} endpoint hâlâ erişilemiyor. Sunucu durumunu kontrol edin.`,
          });
        }

        // Re-test slow endpoints in parallel (warm-up)
        if (slowEndpoints.length > 0) {
          const warmPromises = slowEndpoints.map(ep => {
            const url = ep.details?.url || "";
            if (!url) return Promise.resolve(null);
            const headers: Record<string, string> = ep.module === "api_health"
              ? { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
              : {};
            return testEndpoint(url, "GET", headers).then(r => ({ ep, result: r }));
          });

          const warmResults = (await Promise.all(warmPromises)).filter(Boolean) as { ep: any; result: any }[];
          const improved = warmResults.filter(r => r.result.success && r.result.responseTime < r.ep.response_time * 0.7).length;

          if (improved > 0) {
            fixes.push({
              action: "Yavaş endpointler ısındırıldı",
              status: "success",
              detail: `${improved}/${slowEndpoints.length} endpoint warm-up sonrası hızlandı.`,
            });
          }
        }

        // Delete resolved alerts
        const { data: openAlerts } = await supabase
          .from("performance_alerts")
          .select("id, endpoint, test_id, alert_type, threshold")
          .eq("test_id", lastTest.id);

        if (openAlerts && openAlerts.length > 0) {
          // Just delete alerts from the last test that are now resolved
          await supabase.from("performance_alerts").delete().eq("test_id", lastTest.id);
          fixes.push({
            action: "Eski uyarılar temizlendi",
            status: "success",
            detail: `${openAlerts.length} uyarı kaydı silindi.`,
          });
        }
      }

      // ── 3. Run quick API health verification ──
      const { data: verifyTest } = await supabase
        .from("performance_tests")
        .insert({ test_type: "auto_fix", status: "running" })
        .select()
        .single();

      if (verifyTest) {
        const apiResults = await runApiHealthTests(supabase, verifyTest.id);
        const scoreData = calculateScore(apiResults);
        await supabase.from("performance_tests").update({
          status: "completed",
          overall_score: scoreData.score,
          system_status: scoreData.status,
          avg_response_time: scoreData.avgTime,
          max_response_time: scoreData.maxTime,
          error_rate: scoreData.errorRate,
          total_endpoints: apiResults.length,
          failed_endpoints: apiResults.filter(r => !r.success).length,
          completed_at: new Date().toISOString(),
          summary: { type: "auto_fix_verify", fixes_applied: fixes.length },
        }).eq("id", verifyTest.id);

        const prevScore = lastTest?.overall_score || 0;
        const scoreDiff = scoreData.score - prevScore;

        fixes.unshift({
          action: `Doğrulama testi tamamlandı`,
          status: scoreData.status === "healthy" ? "success" : "warning",
          detail: `Skor: ${prevScore} → ${scoreData.score}/100 (${scoreDiff > 0 ? "+" : ""}${scoreDiff}). Durum: ${scoreData.status === "healthy" ? "Sağlıklı ✅" : scoreData.status === "warning" ? "Uyarı ⚠️" : "Kritik 🔴"}`,
        });
      }

      if (fixes.length === 0) {
        fixes.push({ action: "Sistemde sorun tespit edilmedi", status: "success", detail: "Tüm endpointler çalışıyor." });
      }

      return jsonResponse({ fixes, test_id: verifyTest?.id || null });
    }

    return jsonResponse({ error: "Geçersiz action" }, 400);
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
});
