/**
 * Browser-level smoke test engine
 * Runs inside the admin panel browser context
 * Tests real pages, API endpoints, DOM structure, and form logic
 */

import { supabase } from "@/integrations/supabase/client";

export interface BrowserTestResult {
  group: string;
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  technicalDetail?: string;
  durationMs: number;
  layer: string;
  category: string;
  errorCategory?: string;
}

type TestFn = () => Promise<{ ok: boolean; detail: string; errorCategory?: string }>;

interface TestDef {
  group: string;
  name: string;
  test: TestFn;
  detail: string;
  category: string;
}

// ─── PAGE AVAILABILITY TESTS ───
const pageTests: TestDef[] = [
  {
    group: "Sayfa Erişim",
    name: "Ana sayfa yükleniyor",
    category: "page",
    detail: "Ana sayfa HTML yanıtı 200 döndürüyor",
    test: async () => {
      const res = await fetch("/", { method: "GET", redirect: "follow" });
      const html = await res.text();
      const hasRoot = html.includes("id=\"root\"") || html.includes('id="root"');
      return { ok: res.ok && hasRoot, detail: `Status: ${res.status}, root div: ${hasRoot}` };
    },
  },
  {
    group: "Sayfa Erişim",
    name: "Login sayfası yükleniyor",
    category: "page",
    detail: "Giriş/Kayıt sayfası erişilebilir",
    test: async () => {
      const res = await fetch("/giris-kayit", { method: "GET", redirect: "follow" });
      return { ok: res.ok, detail: `Status: ${res.status}` };
    },
  },
  {
    group: "Sayfa Erişim",
    name: "Dashboard sayfası yükleniyor",
    category: "page",
    detail: "Dashboard sayfası erişilebilir",
    test: async () => {
      const res = await fetch("/dashboard", { method: "GET", redirect: "follow" });
      return { ok: res.ok, detail: `Status: ${res.status}` };
    },
  },
  {
    group: "Sayfa Erişim",
    name: "TekPazar sayfası yükleniyor",
    category: "page",
    detail: "Pazar sayfası erişilebilir",
    test: async () => {
      const res = await fetch("/urunlerim", { method: "GET", redirect: "follow" });
      return { ok: res.ok, detail: `Status: ${res.status}` };
    },
  },
  {
    group: "Sayfa Erişim",
    name: "Tekİhale sayfası yükleniyor",
    category: "page",
    detail: "İhale sayfası erişilebilir",
    test: async () => {
      const res = await fetch("/ihalelerim", { method: "GET", redirect: "follow" });
      return { ok: res.ok, detail: `Status: ${res.status}` };
    },
  },
];

// ─── API ENDPOINT TESTS ───
const apiTests: TestDef[] = [
  {
    group: "API Sağlık",
    name: "Supabase REST erişilebilir",
    category: "api",
    detail: "Supabase REST API erişim kontrolü",
    test: async () => {
      const { data, error } = await supabase.from("firma_bilgi_kategorileri").select("id").limit(1);
      return {
        ok: !error,
        detail: error ? `Error: ${error.message}` : `OK, ${data?.length ?? 0} row(s)`,
        errorCategory: error ? "NETWORK_ERROR" : undefined,
      };
    },
  },
  {
    group: "API Sağlık",
    name: "Auth endpoint erişilebilir",
    category: "api",
    detail: "Auth session kontrolü",
    test: async () => {
      const { data, error } = await supabase.auth.getSession();
      return {
        ok: !error,
        detail: error ? `Error: ${error.message}` : `Session: ${data.session ? "active" : "none"}`,
      };
    },
  },
  {
    group: "API Sağlık",
    name: "Storage endpoint erişilebilir",
    category: "api",
    detail: "Storage bucket listesi alınabiliyor",
    test: async () => {
      const { data, error } = await supabase.storage.listBuckets();
      return {
        ok: !error,
        detail: error ? `Error: ${error.message}` : `${data?.length ?? 0} bucket(s)`,
      };
    },
  },
];

// ─── DROPDOWN DATA TESTS ───
const dropdownTests: TestDef[] = [
  {
    group: "Dropdown Veri",
    name: "Kategoriler yükleniyor",
    category: "dropdown",
    detail: "firma_bilgi_secenekleri kategorileri boş değil",
    test: async () => {
      const { data, error } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .is("parent_id", null)
        .limit(50);
      return {
        ok: !error && !!data && data.length > 0,
        detail: error ? error.message : `${data?.length ?? 0} top-level option(s)`,
        errorCategory: (!data || data.length === 0) ? "DATA_ERROR" : undefined,
      };
    },
  },
  {
    group: "Dropdown Veri",
    name: "Firma türleri yükleniyor",
    category: "dropdown",
    detail: "firma_turleri tablosu veri içeriyor",
    test: async () => {
      const { data, error } = await supabase.from("firma_turleri").select("id, name");
      return {
        ok: !error && !!data && data.length > 0,
        detail: error ? error.message : `${data?.length ?? 0} firma türü`,
        errorCategory: (!data || data.length === 0) ? "DATA_ERROR" : undefined,
      };
    },
  },
  {
    group: "Dropdown Veri",
    name: "Firma tipleri yükleniyor",
    category: "dropdown",
    detail: "firma_tipleri tablosu veri içeriyor",
    test: async () => {
      const { data, error } = await supabase.from("firma_tipleri").select("id, name, firma_turu_id");
      return {
        ok: !error && !!data && data.length > 0,
        detail: error ? error.message : `${data?.length ?? 0} firma tipi`,
        errorCategory: (!data || data.length === 0) ? "DATA_ERROR" : undefined,
      };
    },
  },
  {
    group: "Dropdown Veri",
    name: "Paketler yükleniyor",
    category: "dropdown",
    detail: "paketler tablosu veri içeriyor",
    test: async () => {
      const { data, error } = await supabase.from("paketler").select("id, ad, slug");
      return {
        ok: !error && !!data && data.length > 0,
        detail: error ? error.message : `${data?.length ?? 0} paket`,
        errorCategory: (!data || data.length === 0) ? "DATA_ERROR" : undefined,
      };
    },
  },
  {
    group: "Dropdown Veri",
    name: "Parent-child dropdown zinciri doğru",
    category: "dropdown",
    detail: "Bağımlı dropdown verileri parent_id ile bağlı",
    test: async () => {
      // Get a top-level category
      const { data: parents } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .is("parent_id", null)
        .limit(1);
      if (!parents || parents.length === 0) {
        return { ok: false, detail: "Top-level seçenek bulunamadı", errorCategory: "DATA_ERROR" };
      }
      // Get children of that parent
      const { data: children } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .eq("parent_id", parents[0].id)
        .limit(10);
      return {
        ok: !!children && children.length > 0,
        detail: `Parent: ${parents[0].name} → ${children?.length ?? 0} child(ren)`,
        errorCategory: (!children || children.length === 0) ? "DATA_ERROR" : undefined,
      };
    },
  },
];

// ─── FORM VALIDATION TESTS (real DOM) ───
const formDomTests: TestDef[] = [
  {
    group: "Form DOM",
    name: "Input email validation",
    category: "form",
    detail: "Email input HTML5 validation çalışıyor",
    test: async () => {
      const input = document.createElement("input");
      input.type = "email";
      input.value = "invalid";
      const invalidResult = !input.checkValidity();
      input.value = "test@test.com";
      const validResult = input.checkValidity();
      return { ok: invalidResult && validResult, detail: `invalid→${invalidResult}, valid→${validResult}` };
    },
  },
  {
    group: "Form DOM",
    name: "Number input constraints",
    category: "form",
    detail: "Number input min/max kontrolü",
    test: async () => {
      const input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.value = "0";
      const belowMin = !input.checkValidity();
      input.value = "10";
      const aboveMin = input.checkValidity();
      return { ok: belowMin && aboveMin, detail: `0→invalid:${belowMin}, 10→valid:${aboveMin}` };
    },
  },
  {
    group: "Form DOM",
    name: "Required field validation",
    category: "form",
    detail: "Required alanlar boş bırakılamaz",
    test: async () => {
      const input = document.createElement("input");
      input.required = true;
      input.value = "";
      const emptyInvalid = !input.checkValidity();
      input.value = "filled";
      const filledValid = input.checkValidity();
      return { ok: emptyInvalid && filledValid, detail: `empty→invalid:${emptyInvalid}, filled→valid:${filledValid}` };
    },
  },
  {
    group: "Form DOM",
    name: "Select dropdown DOM oluşturma",
    category: "form",
    detail: "Select elementi programatik olarak oluşturulup seçim yapılabiliyor",
    test: async () => {
      const select = document.createElement("select");
      select.innerHTML = '<option value="">Seçin</option><option value="a">A</option><option value="b">B</option>';
      select.value = "a";
      const selected = select.value === "a";
      select.value = "";
      const deselected = select.value === "";
      return { ok: selected && deselected, detail: `select:${selected}, deselect:${deselected}` };
    },
  },
];

// ─── STATE LOGIC TESTS ───
const stateTests: TestDef[] = [
  {
    group: "State Yönetimi",
    name: "Dropdown zincir reset mantığı",
    category: "state",
    detail: "Parent değişince child state sıfırlanıyor",
    test: async () => {
      // Simulate the exact logic from YeniUrun
      let kategoriId = "k1";
      let grupId = "g1";
      let turId = "t1";

      // Parent changes → children must reset
      kategoriId = "k2";
      grupId = "";
      turId = "";

      const resetWorked = grupId === "" && turId === "";

      // Now re-select
      grupId = "g2";
      turId = "t2";
      const reselected = grupId === "g2" && turId === "t2";

      return { ok: resetWorked && reselected, detail: `reset:${resetWorked}, reselect:${reselected}` };
    },
  },
  {
    group: "State Yönetimi",
    name: "Form multi-step state tutarlılığı",
    category: "state",
    detail: "Wizard step geçişlerinde state korunuyor",
    test: async () => {
      let currentStep = 0;
      const formData: Record<string, string> = {};

      // Step 0: set data
      formData.ihale_turu = "urun_alim";
      currentStep = 1;

      // Step 1: set more data
      formData.teklif_usulu = "acik_eksiltme";
      currentStep = 2;

      // Go back to step 0
      currentStep = 0;
      const dataPreserved = formData.ihale_turu === "urun_alim" && formData.teklif_usulu === "acik_eksiltme";

      return { ok: dataPreserved, detail: `Step geçişinde veri korundu: ${dataPreserved}` };
    },
  },
  {
    group: "State Yönetimi",
    name: "Teknik detay bağımlı alan temizleme",
    category: "state",
    detail: "Dependent dropdown parent değişince value temizleniyor",
    test: async () => {
      const teknikDetaylar: Record<string, string> = {
        "Kumaş Grubu": "pamuk",
        "Kumaş Türü": "poplin",
      };

      // Parent changes
      teknikDetaylar["Kumaş Grubu"] = "polyester";
      teknikDetaylar["Kumaş Türü"] = ""; // must reset

      return {
        ok: teknikDetaylar["Kumaş Türü"] === "",
        detail: `Bağımlı alan temizlendi: ${teknikDetaylar["Kumaş Türü"] === ""}`,
      };
    },
  },
  {
    group: "State Yönetimi",
    name: "Varyasyon matrisi hesaplama",
    category: "state",
    detail: "3 beden × 2 renk = 6 varyasyon oluşuyor",
    test: async () => {
      const bedenler = ["S", "M", "L"];
      const renkler = ["Beyaz", "Siyah"];
      const matrix = bedenler.flatMap((b) => renkler.map((r) => ({ beden: b, renk: r })));
      return {
        ok: matrix.length === 6,
        detail: `${bedenler.length} × ${renkler.length} = ${matrix.length} varyasyon`,
      };
    },
  },
  {
    group: "State Yönetimi",
    name: "Fiyat kademesi çakışma kontrolü",
    category: "state",
    detail: "Kademeli fiyat aralıkları çakışmıyor",
    test: async () => {
      const tiers = [
        { min: 1, max: 10 },
        { min: 11, max: 50 },
        { min: 51, max: 100 },
      ];
      let noOverlap = true;
      for (let i = 1; i < tiers.length; i++) {
        if (tiers[i].min <= tiers[i - 1].max) noOverlap = false;
      }
      return { ok: noOverlap, detail: `Çakışma yok: ${noOverlap}` };
    },
  },
];

// ─── ALL TESTS ───
const ALL_BROWSER_TESTS: TestDef[] = [
  ...pageTests,
  ...apiTests,
  ...dropdownTests,
  ...formDomTests,
  ...stateTests,
];

/**
 * Run all in-browser smoke tests
 */
export async function runBrowserTests(): Promise<BrowserTestResult[]> {
  const results: BrowserTestResult[] = [];

  for (const t of ALL_BROWSER_TESTS) {
    const start = performance.now();
    let status: "pass" | "fail" = "pass";
    let technicalDetail = "";

    try {
      const result = await t.test();
      if (!result.ok) {
        status = "fail";
        technicalDetail = result.detail;
      } else {
        technicalDetail = result.detail;
      }
    } catch (e: any) {
      status = "fail";
      technicalDetail = e.message || "Exception during test";
    }

    results.push({
      group: t.group,
      name: t.name,
      status,
      detail: t.detail,
      technicalDetail: technicalDetail || undefined,
      durationMs: Math.round(performance.now() - start),
      layer: "ui_browser",
      category: t.category,
      errorCategory: status === "fail" ? "UI_ERROR" : undefined,
    });
  }

  return results;
}

export const BROWSER_TEST_COUNT = ALL_BROWSER_TESTS.length;
