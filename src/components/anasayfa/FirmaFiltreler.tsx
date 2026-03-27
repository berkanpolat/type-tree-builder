import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Search, X, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";

interface FilterDef {
  key: string;
  label: string;
  type: "firma_tipleri" | "kategori" | "il" | "moq" | "uretim_satis";
  kategoriName?: string;
}

const FILTER_CONFIG: Record<string, FilterDef[]> = {
  "Tedarikçi": [
    { key: "firmaTipi", label: "Firma Tipi", type: "firma_tipleri" },
    { key: "firmaOlcegi", label: "Firma Ölçeği", type: "kategori", kategoriName: "Firma Ölçeği" },
    { key: "faaliyetAlani", label: "Faaliyet Alanı", type: "kategori", kategoriName: "Faaliyet Alanı" },
    { key: "firmaBolgesi", label: "Firma Bölgesi", type: "il" },
    { key: "uretimSatis", label: "Üretim/Satış", type: "uretim_satis" },
  ],
  "Hazır Giyim Üreticisi": [
    { key: "firmaTipi", label: "Firma Tipi", type: "firma_tipleri" },
    { key: "firmaOlcegi", label: "Firma Ölçeği", type: "kategori", kategoriName: "Firma Ölçeği" },
    { key: "faaliyetAlani", label: "Faaliyet Alanı", type: "kategori", kategoriName: "Faaliyet Alanı" },
    { key: "firmaBolgesi", label: "Firma Bölgesi", type: "il" },
    { key: "uretimModeli", label: "Üretim Modeli", type: "kategori", kategoriName: "Üretim Modeli" },
    { key: "uretimYetkinlikleri", label: "Üretim Yetkinliği", type: "kategori", kategoriName: "Üretim Yetkinlikleri" },
    { key: "moq", label: "Minimum Sipariş Miktarı (MOQ)", type: "moq" },
    { key: "uretimSatis", label: "Üretim/Satış", type: "uretim_satis" },
  ],
  "Fason Atölye": [
    { key: "firmaTipi", label: "Firma Tipi", type: "firma_tipleri" },
    { key: "firmaOlcegi", label: "Firma Ölçeği", type: "kategori", kategoriName: "Firma Ölçeği" },
    { key: "faaliyetAlani", label: "Faaliyet Alanı", type: "kategori", kategoriName: "Faaliyet Alanı" },
    { key: "firmaBolgesi", label: "Firma Bölgesi", type: "il" },
    { key: "uretimModeli", label: "Üretim Modeli", type: "kategori", kategoriName: "Üretim Modeli" },
    { key: "uzmanlikAlani", label: "Ürün Uzmanlık Alanı", type: "kategori", kategoriName: "Uzman Olunan Ürün Grupları" },
    { key: "moq", label: "Minimum Sipariş Miktarı (MOQ)", type: "moq" },
    { key: "uretimSatis", label: "Üretim/Satış", type: "uretim_satis" },
  ],
  "Mümessil Ofis": [
    { key: "firmaTipi", label: "Firma Tipi", type: "firma_tipleri" },
    { key: "firmaOlcegi", label: "Firma Ölçeği", type: "kategori", kategoriName: "Firma Ölçeği" },
    { key: "faaliyetAlani", label: "Faaliyet Alanı", type: "kategori", kategoriName: "Faaliyet Alanı" },
    { key: "firmaBolgesi", label: "Firma Bölgesi", type: "il" },
    { key: "urunSegmenti", label: "Ürün Segmenti", type: "kategori", kategoriName: "Ürün Segmenti" },
    { key: "uzmanlikAlani", label: "Ürün Uzmanlık Alanı", type: "kategori", kategoriName: "Uzman Olunan Ürün Grupları" },
    { key: "tedarikHizmetTipi", label: "Tedarik - Hizmet Tipi", type: "kategori", kategoriName: "Tedarik Hizmet Tipi" },
    { key: "temsilTipi", label: "Temsil Tipi", type: "kategori", kategoriName: "Temsil Tipi" },
    { key: "uretimSatis", label: "Üretim/Satış", type: "uretim_satis" },
  ],
  "Marka": [
    { key: "firmaTipi", label: "Firma Tipi", type: "firma_tipleri" },
    { key: "firmaOlcegi", label: "Firma Ölçeği", type: "kategori", kategoriName: "Firma Ölçeği" },
    { key: "faaliyetAlani", label: "Faaliyet Alanı", type: "kategori", kategoriName: "Faaliyet Alanı" },
    { key: "firmaBolgesi", label: "Firma Bölgesi", type: "il" },
    { key: "urunSegmenti", label: "Ürün Segmenti", type: "kategori", kategoriName: "Ürün Segmenti" },
    { key: "uretimModeli", label: "Üretim Modeli", type: "kategori", kategoriName: "Üretim Modeli" },
    { key: "mevcutPazarlar", label: "Mevcut Pazarlar", type: "kategori", kategoriName: "Mevcut Pazarlar" },
    { key: "uretimSatis", label: "Üretim/Satış", type: "uretim_satis" },
  ],
};

const DIRECT_COLUMN_FILTERS: Record<string, string> = {
  firmaOlcegi: "firma_olcegi_id",
};

export const JUNCTION_FILTER_KEYS = [
  "faaliyetAlani", "uretimModeli", "uretimYetkinlikleri", "uzmanlikAlani",
  "urunSegmenti", "tedarikHizmetTipi", "temsilTipi", "mevcutPazarlar",
];

interface Option {
  id: string;
  name: string;
}

export interface FirmaFilterState {
  firmaTipleri: string[];
  firmaOlcekleri: string[];
  iller: string[];
  moq: string;
  junctionFilters: Record<string, string[]>;
  uretimSatisKategoriIds: string[];
  uretimSatisGrupIds: string[];
  uretimSatisTurIds: string[];
}

interface Props {
  firmaTuruId: string;
  firmaTuruName: string;
  value: FirmaFilterState;
  onFilterChange: (state: FirmaFilterState) => void;
  firmaTurleri?: { id: string; name: string }[];
  onFirmaTuruChange?: (id: string) => void;
}

const optionsCache: Record<string, Option[]> = {};

export default function FirmaFiltreler({ firmaTuruId, firmaTuruName, value, onFilterChange, firmaTurleri: firmaTurleriProp, onFirmaTuruChange }: Props) {
  // Option loading state (UI only)
  const [firmaTipleri, setFirmaTipleri] = useState<Option[]>([]);
  const [kategoriOptions, setKategoriOptions] = useState<Record<string, Option[]>>({});
  const [ilOptions, setIlOptions] = useState<Option[]>([]);
  const [usKategoriler, setUsKategoriler] = useState<Option[]>([]);
  const [usGruplar, setUsGruplar] = useState<Option[]>([]);
  const [usTurler, setUsTurler] = useState<Option[]>([]);

  // UI-only state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moqInput, setMoqInput] = useState(value.moq || "");

  const isMobile = useIsMobile();
  const filters = FILTER_CONFIG[firmaTuruName] || FILTER_CONFIG["Tedarikçi"] || [];

  // Derive selections from controlled value
  const selections = useMemo(() => {
    const s: Record<string, string[]> = {};
    s.firmaTipi = value.firmaTipleri || [];
    s.firmaOlcegi = value.firmaOlcekleri || [];
    s.firmaBolgesi = value.iller || [];
    if (value.junctionFilters) {
      Object.entries(value.junctionFilters).forEach(([key, ids]) => {
        s[key] = ids;
      });
    }
    return s;
  }, [value]);

  const usSelectedKategoriler = value.uretimSatisKategoriIds || [];
  const usSelectedGruplar = value.uretimSatisGrupIds || [];
  const usSelectedTurler = value.uretimSatisTurIds || [];

  // Sync moqInput from controlled value
  useEffect(() => { setMoqInput(value.moq || ""); }, [value.moq]);

  // Debounce MOQ changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (moqInput !== (value.moq || "")) {
        const jf: Record<string, string[]> = {};
        JUNCTION_FILTER_KEYS.forEach(key => {
          const filterDef = filters.find(f => f.key === key);
          if (filterDef?.kategoriName && selections[key]?.length > 0) jf[key] = selections[key];
        });
        onFilterChange({ ...value, moq: moqInput, junctionFilters: jf });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [moqInput]);

  // Reset UI state when firma türü changes
  const prevTuruRef = useRef(firmaTuruName);
  useEffect(() => {
    if (prevTuruRef.current !== firmaTuruName) {
      prevTuruRef.current = firmaTuruName;
      setSearchTerms({});
      setExpandedSections({});
      setMoqInput("");
    }
  }, [firmaTuruName]);

  // Build new FirmaFilterState helper
  const buildState = useCallback((overrides: {
    sel?: Record<string, string[]>;
    moqVal?: string;
    usKat?: string[];
    usGrp?: string[];
    usTr?: string[];
  } = {}): FirmaFilterState => {
    const sel = overrides.sel ?? selections;
    const jf: Record<string, string[]> = {};
    JUNCTION_FILTER_KEYS.forEach(key => {
      const filterDef = filters.find(f => f.key === key);
      if (filterDef?.kategoriName && sel[key]?.length > 0) jf[key] = sel[key];
    });
    return {
      firmaTipleri: sel.firmaTipi || [],
      firmaOlcekleri: sel.firmaOlcegi || [],
      iller: sel.firmaBolgesi || [],
      moq: overrides.moqVal ?? (value.moq || ""),
      junctionFilters: jf,
      uretimSatisKategoriIds: overrides.usKat ?? usSelectedKategoriler,
      uretimSatisGrupIds: overrides.usGrp ?? usSelectedGruplar,
      uretimSatisTurIds: overrides.usTr ?? usSelectedTurler,
    };
  }, [selections, value.moq, usSelectedKategoriler, usSelectedGruplar, usSelectedTurler, filters]);

  // Load firma tipleri options
  useEffect(() => {
    if (!firmaTuruId) return;
    supabase
      .from("firma_tipleri")
      .select("id, name")
      .eq("firma_turu_id", firmaTuruId)
      .order("name")
      .then(({ data }) => setFirmaTipleri(data || []));
  }, [firmaTuruId]);

  // Load kategori options
  useEffect(() => {
    const kategoriNames = filters
      .filter((f) => f.type === "kategori" && f.kategoriName)
      .map((f) => f.kategoriName!);

    const uncached = kategoriNames.filter((n) => !optionsCache[n]);
    if (uncached.length === 0) {
      const opts: Record<string, Option[]> = {};
      kategoriNames.forEach((n) => { opts[n] = optionsCache[n] || []; });
      setKategoriOptions(opts);
      return;
    }

    supabase
      .from("firma_bilgi_kategorileri")
      .select("id, name")
      .in("name", uncached)
      .then(async ({ data: kats }) => {
        if (!kats || kats.length === 0) return;
        const katIds = kats.map((k) => k.id);
        const { data: opts } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name, kategori_id")
          .in("kategori_id", katIds)
          .is("parent_id", null)
          .order("name");

        if (opts) {
          const katIdToName: Record<string, string> = {};
          kats.forEach((k) => { katIdToName[k.id] = k.name; });
          opts.forEach((o) => {
            const catName = katIdToName[o.kategori_id];
            if (catName) {
              if (!optionsCache[catName]) optionsCache[catName] = [];
              if (!optionsCache[catName].find((x) => x.id === o.id)) {
                optionsCache[catName].push({ id: o.id, name: o.name });
              }
            }
          });
        }

        const allOpts: Record<string, Option[]> = {};
        kategoriNames.forEach((n) => { allOpts[n] = optionsCache[n] || []; });
        setKategoriOptions(allOpts);
      });
  }, [filters]);

  // Load il options
  useEffect(() => {
    const fetchIller = async () => {
      const { data: firmaData } = await supabase
        .from("firmalar")
        .select("kurulus_il_id")
        .not("kurulus_il_id", "is", null);

      if (!firmaData) return;
      const uniqueIds = [...new Set(firmaData.map((f) => f.kurulus_il_id).filter(Boolean))] as string[];
      if (uniqueIds.length === 0) return;

      const { data: names } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .in("id", uniqueIds)
        .order("name");

      setIlOptions(names || []);
    };
    fetchIller();
  }, []);

  // Load üretim/satış kategoriler
  useEffect(() => {
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_ID)
      .is("parent_id", null)
      .order("name")
      .then(({ data }) => setUsKategoriler(data || []));
  }, []);

  // Load grup options based on controlled kategori selection
  useEffect(() => {
    if (usSelectedKategoriler.length === 0) {
      setUsGruplar([]);
      setUsTurler([]);
      return;
    }
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .in("parent_id", usSelectedKategoriler)
      .order("name")
      .then(({ data }) => {
        setUsGruplar(data || []);
        setUsTurler([]);
      });
  }, [usSelectedKategoriler]);

  // Load tür options based on controlled grup selection
  useEffect(() => {
    if (usSelectedGruplar.length === 0) {
      setUsTurler([]);
      return;
    }
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .in("parent_id", usSelectedGruplar)
      .order("name")
      .then(({ data }) => setUsTurler(data || []));
  }, [usSelectedGruplar]);

  // Toggle handlers
  const toggle = (key: string, id: string) => {
    const current = selections[key] || [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onFilterChange(buildState({ sel: { ...selections, [key]: next } }));
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeCount =
    Object.values(selections).reduce((a, v) => a + v.length, 0) +
    (value.moq ? 1 : 0) +
    usSelectedKategoriler.length +
    usSelectedGruplar.length +
    usSelectedTurler.length;

  const clearAll = () => {
    onFilterChange({
      firmaTipleri: [],
      firmaOlcekleri: [],
      iller: [],
      moq: "",
      junctionFilters: {},
      uretimSatisKategoriIds: [],
      uretimSatisGrupIds: [],
      uretimSatisTurIds: [],
    });
    setMoqInput("");
  };

  const getFilteredOpts = (opts: Option[], key: string) => {
    const term = searchTerms[key] || "";
    if (!term) return opts;
    return opts.filter((o) => o.name.toLowerCase().includes(term.toLowerCase()));
  };

  const toggleUsKategori = (id: string) => {
    const next = usSelectedKategoriler.includes(id)
      ? usSelectedKategoriler.filter((x) => x !== id)
      : [...usSelectedKategoriler, id];
    onFilterChange(buildState({ usKat: next, usGrp: [], usTr: [] }));
  };

  const toggleUsGrup = (id: string) => {
    const next = usSelectedGruplar.includes(id)
      ? usSelectedGruplar.filter((x) => x !== id)
      : [...usSelectedGruplar, id];
    onFilterChange(buildState({ usGrp: next, usTr: [] }));
  };

  const toggleUsTur = (id: string) => {
    const next = usSelectedTurler.includes(id)
      ? usSelectedTurler.filter((x) => x !== id)
      : [...usSelectedTurler, id];
    onFilterChange(buildState({ usTr: next }));
  };

  const filterContent = (
    <>
      <div className="mb-4 flex items-start justify-between gap-3 lg:mb-3 lg:items-center">
        <div>
          <h3 className="text-xl font-semibold text-foreground lg:text-lg">Filtreler</h3>
          {activeCount > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{activeCount} aktif filtre seçildi</p>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9 rounded-full px-3 text-xs text-muted-foreground lg:h-auto lg:rounded-md lg:px-2 lg:py-1"
          >
            <X className="mr-1 h-3.5 w-3.5" /> Temizle
          </Button>
        )}
      </div>

      {filters.map((filterDef) => {
        if (filterDef.type === "firma_tipleri") {
          const opts = getFilteredOpts(firmaTipleri, filterDef.key);
          const selected = selections[filterDef.key] || [];
          return (
            <FilterSection
              key={filterDef.key}
              title={filterDef.label}
              isExpanded={expandedSections[filterDef.key] !== false}
              onToggle={() => toggleSection(filterDef.key)}
              selectedCount={selected.length}
            >
              <FilterSearchInput
                value={searchTerms[filterDef.key] || ""}
                onChange={(v) => setSearchTerms((p) => ({ ...p, [filterDef.key]: v }))}
                placeholder={`${filterDef.label} ara...`}
              />
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1 lg:max-h-48">
                {opts.map((opt) => (
                  <FilterOptionRow
                    key={opt.id}
                    checked={selected.includes(opt.id)}
                    label={opt.name}
                    onCheckedChange={() => toggle(filterDef.key, opt.id)}
                  />
                ))}
              </div>
            </FilterSection>
          );
        }

        if (filterDef.type === "kategori") {
          const opts = getFilteredOpts(kategoriOptions[filterDef.kategoriName!] || [], filterDef.key);
          const selected = selections[filterDef.key] || [];
          return (
            <FilterSection
              key={filterDef.key}
              title={filterDef.label}
              isExpanded={expandedSections[filterDef.key] !== false}
              onToggle={() => toggleSection(filterDef.key)}
              selectedCount={selected.length}
            >
              <FilterSearchInput
                value={searchTerms[filterDef.key] || ""}
                onChange={(v) => setSearchTerms((p) => ({ ...p, [filterDef.key]: v }))}
                placeholder={`${filterDef.label} ara...`}
              />
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1 lg:max-h-48">
                {opts.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">Seçenek yok</p>
                ) : (
                  opts.map((opt) => (
                    <FilterOptionRow
                      key={opt.id}
                      checked={selected.includes(opt.id)}
                      label={opt.name}
                      onCheckedChange={() => toggle(filterDef.key, opt.id)}
                    />
                  ))
                )}
              </div>
            </FilterSection>
          );
        }

        if (filterDef.type === "il") {
          const opts = getFilteredOpts(ilOptions, filterDef.key);
          const selected = selections[filterDef.key] || [];
          return (
            <FilterSection
              key={filterDef.key}
              title={filterDef.label}
              isExpanded={expandedSections[filterDef.key] !== false}
              onToggle={() => toggleSection(filterDef.key)}
              selectedCount={selected.length}
            >
              <FilterSearchInput
                value={searchTerms[filterDef.key] || ""}
                onChange={(v) => setSearchTerms((p) => ({ ...p, [filterDef.key]: v }))}
                placeholder="İl ara..."
              />
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1 lg:max-h-48">
                {opts.map((opt) => (
                  <FilterOptionRow
                    key={opt.id}
                    checked={selected.includes(opt.id)}
                    label={opt.name}
                    onCheckedChange={() => toggle(filterDef.key, opt.id)}
                  />
                ))}
              </div>
            </FilterSection>
          );
        }

        if (filterDef.type === "moq") {
          return (
            <FilterSection
              key={filterDef.key}
              title={filterDef.label}
              isExpanded={expandedSections[filterDef.key] !== false}
              onToggle={() => toggleSection(filterDef.key)}
              selectedCount={value.moq ? 1 : 0}
            >
              <Input
                type="number"
                placeholder="Min. sipariş miktarı"
                value={moqInput}
                onChange={(e) => setMoqInput(e.target.value)}
                className="h-11 rounded-xl text-base lg:h-8 lg:rounded-md lg:text-sm"
              />
              <p className="text-xs text-muted-foreground">Girilen değer ve üzeri MOQ'ya sahip firmalar</p>
            </FilterSection>
          );
        }

        if (filterDef.type === "uretim_satis") {
          return (
            <FilterSection
              key={filterDef.key}
              title={filterDef.label}
              isExpanded={expandedSections[filterDef.key] !== false}
              onToggle={() => toggleSection(filterDef.key)}
              selectedCount={usSelectedKategoriler.length + usSelectedGruplar.length + usSelectedTurler.length}
            >
              <p className="text-xs font-medium text-muted-foreground">Ana Ürün Kategorisi</p>
              <FilterSearchInput
                value={searchTerms.us_kat || ""}
                onChange={(v) => setSearchTerms((p) => ({ ...p, us_kat: v }))}
                placeholder="Kategori ara..."
              />
              <div className="mb-3 max-h-52 space-y-2 overflow-y-auto pr-1 lg:max-h-36">
                {getFilteredOpts(usKategoriler, "us_kat").map((opt) => (
                  <FilterOptionRow
                    key={opt.id}
                    checked={usSelectedKategoriler.includes(opt.id)}
                    label={opt.name}
                    onCheckedChange={() => toggleUsKategori(opt.id)}
                  />
                ))}
              </div>

              {usGruplar.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground">Ürün Grubu</p>
                  <FilterSearchInput
                    value={searchTerms.us_grup || ""}
                    onChange={(v) => setSearchTerms((p) => ({ ...p, us_grup: v }))}
                    placeholder="Grup ara..."
                  />
                  <div className="mb-3 max-h-52 space-y-2 overflow-y-auto pr-1 lg:max-h-36">
                    {getFilteredOpts(usGruplar, "us_grup").map((opt) => (
                      <FilterOptionRow
                        key={opt.id}
                        checked={usSelectedGruplar.includes(opt.id)}
                        label={opt.name}
                        onCheckedChange={() => toggleUsGrup(opt.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {usTurler.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground">Ürün Türü</p>
                  <FilterSearchInput
                    value={searchTerms.us_tur || ""}
                    onChange={(v) => setSearchTerms((p) => ({ ...p, us_tur: v }))}
                    placeholder="Tür ara..."
                  />
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1 lg:max-h-36">
                    {getFilteredOpts(usTurler, "us_tur").map((opt) => (
                      <FilterOptionRow
                        key={opt.id}
                        checked={usSelectedTurler.includes(opt.id)}
                        label={opt.name}
                        onCheckedChange={() => toggleUsTur(opt.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </FilterSection>
          );
        }

        return null;
      })}
    </>
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl text-base lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtreler
          {activeCount > 0 && (
            <Badge className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-[calc(100vw-1.5rem)] max-w-[420px] overflow-y-auto border-r px-4 py-5 sm:px-5"
          >
            <SheetHeader className="mb-5 border-b border-border pb-4 text-left">
              <SheetTitle className="text-2xl font-semibold text-foreground">Filtreler</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return <div className="hidden w-72 shrink-0 space-y-3 lg:block">{filterContent}</div>;
}

function FilterSection({
  title,
  isExpanded,
  onToggle,
  selectedCount,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  selectedCount: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border p-4 shadow-sm lg:rounded-xl">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-medium text-foreground lg:text-sm">{title}</h4>
          {selectedCount > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground lg:h-5 lg:min-w-5 lg:text-[10px]">
              {selectedCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground lg:h-4 lg:w-4" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground lg:h-4 lg:w-4" />
        )}
      </button>
      {isExpanded && <div className="mt-4 space-y-3">{children}</div>}
    </Card>
  );
}

function FilterSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground lg:left-2.5 lg:h-3.5 lg:w-3.5" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl pl-10 text-base lg:h-8 lg:rounded-md lg:pl-8 lg:text-sm"
      />
    </div>
  );
}

function FilterOptionRow({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        checked ? "border-primary/30 bg-primary/5" : "border-transparent hover:border-border hover:bg-muted/40"
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-[15px] leading-6 text-foreground lg:text-sm lg:leading-5">{label}</span>
    </label>
  );
}
