import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Search, X, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1"; // Ana Ürün Kategorileri

// Filter definitions per firma türü name
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

// Which filters map to firmalar columns vs junction table
const DIRECT_COLUMN_FILTERS: Record<string, string> = {
  firmaOlcegi: "firma_olcegi_id",
};

// Junction table filters - these secenek_ids are in firma_urun_hizmet_secimler
const JUNCTION_FILTER_KEYS = [
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
  junctionFilters: Record<string, string[]>; // key → secenek_ids
  uretimSatisKategoriIds: string[];
  uretimSatisGrupIds: string[];
  uretimSatisTurIds: string[];
}

interface Props {
  firmaTuruId: string;
  firmaTuruName: string;
  onFilterChange: (state: FirmaFilterState) => void;
}

// Cache
const optionsCache: Record<string, Option[]> = {};

export default function FirmaFiltreler({ firmaTuruId, firmaTuruName, onFilterChange }: Props) {
  const [firmaTipleri, setFirmaTipleri] = useState<Option[]>([]);
  const [kategoriOptions, setKategoriOptions] = useState<Record<string, Option[]>>({});
  const [ilOptions, setIlOptions] = useState<Option[]>([]);
  const [usKategoriler, setUsKategoriler] = useState<Option[]>([]);
  const [usGruplar, setUsGruplar] = useState<Option[]>([]);
  const [usTurler, setUsTurler] = useState<Option[]>([]);

  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [moq, setMoq] = useState("");
  const [usSelectedKategoriler, setUsSelectedKategoriler] = useState<string[]>([]);
  const [usSelectedGruplar, setUsSelectedGruplar] = useState<string[]>([]);
  const [usSelectedTurler, setUsSelectedTurler] = useState<string[]>([]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  const filters = FILTER_CONFIG[firmaTuruName] || FILTER_CONFIG["Tedarikçi"] || [];

  // Reset on firma türü change
  useEffect(() => {
    setSelections({});
    setMoq("");
    setUsSelectedKategoriler([]);
    setUsSelectedGruplar([]);
    setUsSelectedTurler([]);
    setSearchTerms({});
    setExpandedSections({});
  }, [firmaTuruName]);

  // Fetch firma tipleri
  useEffect(() => {
    if (!firmaTuruId) return;
    supabase.from("firma_tipleri").select("id, name").eq("firma_turu_id", firmaTuruId).order("name")
      .then(({ data }) => setFirmaTipleri(data || []));
  }, [firmaTuruId]);

  // Fetch kategori-based filter options
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

    supabase.from("firma_bilgi_kategorileri").select("id, name").in("name", uncached)
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
  }, [firmaTuruName]);

  // Fetch İl options (distinct from firmalar)
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

  // Fetch Üretim/Satış kategorileri
  useEffect(() => {
    supabase.from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_ID)
      .is("parent_id", null)
      .order("name")
      .then(({ data }) => setUsKategoriler(data || []));
  }, []);

  // Fetch gruplar when kategori selected
  useEffect(() => {
    if (usSelectedKategoriler.length === 0) { setUsGruplar([]); setUsSelectedGruplar([]); setUsTurler([]); setUsSelectedTurler([]); return; }
    supabase.from("firma_bilgi_secenekleri")
      .select("id, name")
      .in("parent_id", usSelectedKategoriler)
      .order("name")
      .then(({ data }) => { setUsGruplar(data || []); setUsSelectedGruplar([]); setUsTurler([]); setUsSelectedTurler([]); });
  }, [usSelectedKategoriler]);

  // Fetch türler when grup selected
  useEffect(() => {
    if (usSelectedGruplar.length === 0) { setUsTurler([]); setUsSelectedTurler([]); return; }
    supabase.from("firma_bilgi_secenekleri")
      .select("id, name")
      .in("parent_id", usSelectedGruplar)
      .order("name")
      .then(({ data }) => { setUsTurler(data || []); setUsSelectedTurler([]); });
  }, [usSelectedGruplar]);

  // Emit filter state
  useEffect(() => {
    const junctionFilters: Record<string, string[]> = {};
    JUNCTION_FILTER_KEYS.forEach((key) => {
      const filterDef = filters.find((f) => f.key === key);
      if (filterDef?.kategoriName && selections[key]?.length > 0) {
        junctionFilters[key] = selections[key];
      }
    });

    onFilterChange({
      firmaTipleri: selections["firmaTipi"] || [],
      firmaOlcekleri: selections["firmaOlcegi"] || [],
      iller: selections["firmaBolgesi"] || [],
      moq,
      junctionFilters,
      uretimSatisKategoriIds: usSelectedKategoriler,
      uretimSatisGrupIds: usSelectedGruplar,
      uretimSatisTurIds: usSelectedTurler,
    });
  }, [selections, moq, usSelectedKategoriler, usSelectedGruplar, usSelectedTurler]);

  const toggle = (key: string, id: string) => {
    setSelections((prev) => {
      const current = prev[key] || [];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { ...prev, [key]: next };
    });
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeCount = Object.values(selections).reduce((a, v) => a + v.length, 0)
    + (moq ? 1 : 0) + usSelectedKategoriler.length + usSelectedGruplar.length + usSelectedTurler.length;

  const clearAll = () => {
    setSelections({});
    setMoq("");
    setUsSelectedKategoriler([]);
    setUsSelectedGruplar([]);
    setUsSelectedTurler([]);
  };

  const getFilteredOpts = (opts: Option[], key: string) => {
    const term = searchTerms[key] || "";
    if (!term) return opts;
    return opts.filter((o) => o.name.toLowerCase().includes(term.toLowerCase()));
  };

  const toggleUsKategori = (id: string) => {
    setUsSelectedKategoriler((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleUsGrup = (id: string) => {
    setUsSelectedGruplar((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleUsTur = (id: string) => {
    setUsSelectedTurler((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filterContent = (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground text-lg">Filtreler</h3>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground h-auto py-1">
            <X className="w-3 h-3 mr-1" /> Temizle
          </Button>
        )}
      </div>

      {filters.map((filterDef) => {
        if (filterDef.type === "firma_tipleri") {
          const opts = getFilteredOpts(firmaTipleri, filterDef.key);
          const selected = selections[filterDef.key] || [];
          return (
            <FilterSection key={filterDef.key} title={filterDef.label} isExpanded={expandedSections[filterDef.key] !== false} onToggle={() => toggleSection(filterDef.key)} selectedCount={selected.length}>
              <FilterSearchInput value={searchTerms[filterDef.key] || ""} onChange={(v) => setSearchTerms((p) => ({ ...p, [filterDef.key]: v }))} placeholder={`${filterDef.label} ara...`} />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {opts.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50">
                    <Checkbox checked={selected.includes(opt.id)} onCheckedChange={() => toggle(filterDef.key, opt.id)} className="h-3.5 w-3.5" />
                    <span className="text-sm text-foreground">{opt.name}</span>
                  </label>
                ))}
              </div>
            </FilterSection>
          );
        }

        if (filterDef.type === "kategori") {
          const opts = getFilteredOpts(kategoriOptions[filterDef.kategoriName!] || [], filterDef.key);
          const selected = selections[filterDef.key] || [];
          return (
            <FilterSection key={filterDef.key} title={filterDef.label} isExpanded={expandedSections[filterDef.key] !== false} onToggle={() => toggleSection(filterDef.key)} selectedCount={selected.length}>
              <FilterSearchInput value={searchTerms[filterDef.key] || ""} onChange={(v) => setSearchTerms((p) => ({ ...p, [filterDef.key]: v }))} placeholder={`${filterDef.label} ara...`} />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {opts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">Seçenek yok</p>
                ) : opts.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50">
                    <Checkbox checked={selected.includes(opt.id)} onCheckedChange={() => toggle(filterDef.key, opt.id)} className="h-3.5 w-3.5" />
                    <span className="text-sm text-foreground">{opt.name}</span>
                  </label>
                ))}
              </div>
            </FilterSection>
          );
        }

        if (filterDef.type === "il") {
          const opts = getFilteredOpts(ilOptions, filterDef.key);
          const selected = selections[filterDef.key] || [];
          return (
            <FilterSection key={filterDef.key} title={filterDef.label} isExpanded={expandedSections[filterDef.key] !== false} onToggle={() => toggleSection(filterDef.key)} selectedCount={selected.length}>
              <FilterSearchInput value={searchTerms[filterDef.key] || ""} onChange={(v) => setSearchTerms((p) => ({ ...p, [filterDef.key]: v }))} placeholder="İl ara..." />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {opts.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50">
                    <Checkbox checked={selected.includes(opt.id)} onCheckedChange={() => toggle(filterDef.key, opt.id)} className="h-3.5 w-3.5" />
                    <span className="text-sm text-foreground">{opt.name}</span>
                  </label>
                ))}
              </div>
            </FilterSection>
          );
        }

        if (filterDef.type === "moq") {
          return (
            <FilterSection key={filterDef.key} title={filterDef.label} isExpanded={expandedSections[filterDef.key] !== false} onToggle={() => toggleSection(filterDef.key)} selectedCount={moq ? 1 : 0}>
              <Input
                type="number"
                placeholder="Min. sipariş miktarı"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Girilen değer ve üzeri MOQ'ya sahip firmalar</p>
            </FilterSection>
          );
        }

        if (filterDef.type === "uretim_satis") {
          return (
            <FilterSection key={filterDef.key} title={filterDef.label} isExpanded={expandedSections[filterDef.key] !== false} onToggle={() => toggleSection(filterDef.key)} selectedCount={usSelectedKategoriler.length + usSelectedGruplar.length + usSelectedTurler.length}>
              {/* Kategori */}
              <p className="text-xs font-medium text-muted-foreground mb-1">Ana Ürün Kategorisi</p>
              <FilterSearchInput value={searchTerms["us_kat"] || ""} onChange={(v) => setSearchTerms((p) => ({ ...p, us_kat: v }))} placeholder="Kategori ara..." />
              <div className="max-h-36 overflow-y-auto space-y-1 mb-3">
                {getFilteredOpts(usKategoriler, "us_kat").map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50">
                    <Checkbox checked={usSelectedKategoriler.includes(opt.id)} onCheckedChange={() => toggleUsKategori(opt.id)} className="h-3.5 w-3.5" />
                    <span className="text-sm text-foreground">{opt.name}</span>
                  </label>
                ))}
              </div>

              {/* Grup */}
              {usGruplar.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ürün Grubu</p>
                  <FilterSearchInput value={searchTerms["us_grup"] || ""} onChange={(v) => setSearchTerms((p) => ({ ...p, us_grup: v }))} placeholder="Grup ara..." />
                  <div className="max-h-36 overflow-y-auto space-y-1 mb-3">
                    {getFilteredOpts(usGruplar, "us_grup").map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50">
                        <Checkbox checked={usSelectedGruplar.includes(opt.id)} onCheckedChange={() => toggleUsGrup(opt.id)} className="h-3.5 w-3.5" />
                        <span className="text-sm text-foreground">{opt.name}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {/* Tür */}
              {usTurler.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ürün Türü</p>
                  <FilterSearchInput value={searchTerms["us_tur"] || ""} onChange={(v) => setSearchTerms((p) => ({ ...p, us_tur: v }))} placeholder="Tür ara..." />
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {getFilteredOpts(usTurler, "us_tur").map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50">
                        <Checkbox checked={usSelectedTurler.includes(opt.id)} onCheckedChange={() => toggleUsTur(opt.id)} className="h-3.5 w-3.5" />
                        <span className="text-sm text-foreground">{opt.name}</span>
                      </label>
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
        <Button variant="outline" className="lg:hidden gap-2" onClick={() => setMobileOpen(true)}>
          <SlidersHorizontal className="w-4 h-4" />
          Filtreler
          {activeCount > 0 && (
            <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeCount}</Badge>
          )}
        </Button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[300px] overflow-y-auto p-4">
            <SheetHeader className="mb-4">
              <SheetTitle>Filtreler</SheetTitle>
            </SheetHeader>
            <div className="space-y-3">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="w-72 shrink-0 space-y-3 hidden lg:block">
      {filterContent}
    </div>
  );
}

// Sub-components
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
    <Card className="p-4">
      <button onClick={onToggle} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm text-foreground">{title}</h4>
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {selectedCount}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {isExpanded && <div className="mt-3 space-y-2">{children}</div>}
    </Card>
  );
}

function FilterSearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-2">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 pl-8 text-sm"
      />
    </div>
  );
}
