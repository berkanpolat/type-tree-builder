import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";

// Category-specific filter definitions
const KATEGORI_FILTRELER: Record<string, { label: string; kategoriName: string }[]> = {
  "Hazır Giyim (Satış)": [
    { label: "Renk", kategoriName: "Renk" },
    { label: "Sezon", kategoriName: "Sezon" },
    { label: "Cinsiyet", kategoriName: "Cinsiyet" },
    { label: "Yaş Grubu", kategoriName: "Yaş Grubu" },
    { label: "Beden", kategoriName: "Beden" },
    { label: "Kumaş Grubu", kategoriName: "Kumaş Grubu" },
    { label: "Kumaş Türü", kategoriName: "Kumaş Türü" },
    { label: "Desen", kategoriName: "Desen" },
    { label: "Kalıp", kategoriName: "Kalıp" },
  ],
  "Kumaş": [
    { label: "Renk", kategoriName: "Renk" },
    { label: "İplik Numarası", kategoriName: "İplik Numarası" },
    { label: "Desen", kategoriName: "Desen" },
  ],
  "İplik": [
    { label: "Renk", kategoriName: "Renk" },
    { label: "İplik Numarası", kategoriName: "İplik Numarası" },
    { label: "İplik Kullanım Alanı", kategoriName: "İplik Kullanım Alanı" },
    { label: "Büküm Tipi", kategoriName: "Büküm Tipi" },
    { label: "Mukavemet", kategoriName: "Mukavemet" },
  ],
  "Aksesuar": [
    { label: "Renk", kategoriName: "Renk" },
    { label: "Aksesuar Kullanım Alanı", kategoriName: "Aksesuar Kullanım Alanı" },
    { label: "Kaplama", kategoriName: "Kaplama" },
    { label: "Malzeme Türü", kategoriName: "Malzeme Türü" },
  ],
  "Ambalaj": [
    { label: "Renk", kategoriName: "Renk" },
    { label: "Ambalaj Kullanım Alanı", kategoriName: "Ambalaj Kullanım Alanı" },
    { label: "Kaplama", kategoriName: "Kaplama" },
    { label: "Malzeme Türü", kategoriName: "Malzeme Türü" },
  ],
  "Makine ve Yedek Parça": [
    { label: "Makine Kullanım Alanı", kategoriName: "Makine Kullanım Alanı" },
    { label: "Motor Tipi", kategoriName: "Motor Tipi" },
    { label: "Motor Gücü", kategoriName: "Motor Gücü" },
  ],
  "Kimyasal ve Boya Malzemeleri": [
    { label: "Kimyasal Kullanım Alanı", kategoriName: "Kimyasal Kullanım Alanı" },
    { label: "Kimyasal Türü", kategoriName: "Kimyasal Türü" },
    { label: "Fiziksel Formu", kategoriName: "Fiziksel Formu" },
  ],
};

// Fields that are stored in urun_varyasyonlar, not teknik_detaylar
const VARYANT_FIELDS = ["Renk", "Beden"];

// teknik_detaylar key mapping (label used as key in JSONB)
const TEKNIK_KEY_MAP: Record<string, string> = {
  "Sezon": "Sezon",
  "Cinsiyet": "Cinsiyet",
  "Yaş Grubu": "Yaş Grubu",
  "Kumaş Grubu": "Kumaş Grubu",
  "Kumaş Türü": "Kumaş Türü",
  "Desen": "Desen",
  "Kalıp": "Kalıp",
  "İplik Numarası": "İplik Numarası",
  "İplik Kullanım Alanı": "İplik Kullanım Alanı",
  "Büküm Tipi": "Büküm Tipi",
  "Mukavemet": "Mukavemet",
  "Aksesuar Kullanım Alanı": "Aksesuar Kullanım Alanı",
  "Kaplama": "Kaplama",
  "Malzeme Türü": "Malzeme Türü",
  "Ambalaj Kullanım Alanı": "Ambalaj Kullanım Alanı",
  "Makine Kullanım Alanı": "Makine Kullanım Alanı",
  "Motor Tipi": "Motor Tipi",
  "Motor Gücü": "Motor Gücü",
  "Kimyasal Kullanım Alanı": "Kimyasal Kullanım Alanı",
  "Kimyasal Türü": "Kimyasal Türü",
  "Fiziksel Formu": "Fiziksel Formu",
};

interface FilterOption {
  id: string;
  name: string;
}

interface GrupOption {
  id: string;
  name: string;
}

export interface FilterState {
  grupId: string | null;
  turId: string | null;
  minFiyat: string;
  maxFiyat: string;
  teknikFiltreler: Record<string, string[]>; // kategoriName -> selected option IDs
  renkFiltreler: string[]; // selected renk names
  bedenFiltreler: string[]; // selected beden names
}

interface Props {
  selectedKategori: string;
  selectedGrupId: string | null;
  selectedTurId: string | null;
  onFilterChange: (filters: FilterState) => void;
  onGrupChange: (grupId: string | null) => void;
  onTurChange: (turId: string | null) => void;
}

// Cache for filter options
const filterOptionsCache: Record<string, FilterOption[]> = {};

export default function UrunFiltreler({
  selectedKategori,
  selectedGrupId,
  selectedTurId,
  onFilterChange,
  onGrupChange,
  onTurChange,
}: Props) {
  const [gruplar, setGruplar] = useState<GrupOption[]>([]);
  const [turler, setTurler] = useState<GrupOption[]>([]);
  const [filterOptions, setFilterOptions] = useState<Record<string, FilterOption[]>>({});
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [minFiyat, setMinFiyat] = useState("");
  const [maxFiyat, setMaxFiyat] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [katMap, setKatMap] = useState<Record<string, string>>({});

  const filtreler = KATEGORI_FILTRELER[selectedKategori] || [];

  // Load category name -> id map
  useEffect(() => {
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_ID)
      .is("parent_id", null)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((d) => { map[d.name] = d.id; });
          setKatMap(map);
        }
      });
  }, []);

  // Load groups for the selected category
  useEffect(() => {
    const katId = katMap[selectedKategori];
    if (!katId) { setGruplar([]); return; }
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("parent_id", katId)
      .order("name")
      .then(({ data }) => setGruplar(data || []));
  }, [selectedKategori, katMap]);

  // Load types when group changes
  useEffect(() => {
    if (!selectedGrupId) { setTurler([]); return; }
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("parent_id", selectedGrupId)
      .order("name")
      .then(({ data }) => setTurler(data || []));
  }, [selectedGrupId]);

  // Load filter options for each category-specific filter
  useEffect(() => {
    if (filtreler.length === 0) return;

    const kategoriNames = filtreler.map((f) => f.kategoriName);
    const uncached = kategoriNames.filter((n) => !filterOptionsCache[n]);

    if (uncached.length === 0) {
      // All cached
      const opts: Record<string, FilterOption[]> = {};
      kategoriNames.forEach((n) => { opts[n] = filterOptionsCache[n] || []; });
      setFilterOptions(opts);
      return;
    }

    // Fetch kategori IDs for uncached
    supabase
      .from("firma_bilgi_kategorileri")
      .select("id, name")
      .in("name", uncached)
      .then(async ({ data: kats }) => {
        if (!kats) return;
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
              if (!filterOptionsCache[catName]) filterOptionsCache[catName] = [];
              filterOptionsCache[catName].push({ id: o.id, name: o.name });
            }
          });
        }

        // Set all options
        const allOpts: Record<string, FilterOption[]> = {};
        kategoriNames.forEach((n) => { allOpts[n] = filterOptionsCache[n] || []; });
        setFilterOptions(allOpts);
      });
  }, [selectedKategori]);

  // Reset filters when category changes
  useEffect(() => {
    setSelections({});
    setMinFiyat("");
    setMaxFiyat("");
    setSearchTerms({});
    setExpandedSections({});
  }, [selectedKategori]);

  // Emit filter changes
  useEffect(() => {
    const teknikFiltreler: Record<string, string[]> = {};
    let renkFiltreler: string[] = [];
    let bedenFiltreler: string[] = [];

    Object.entries(selections).forEach(([key, values]) => {
      if (values.length === 0) return;
      if (key === "Renk") {
        // For Renk, we need names not IDs (varyasyonlar store names)
        const opts = filterOptions["Renk"] || [];
        renkFiltreler = values.map((id) => opts.find((o) => o.id === id)?.name || "").filter(Boolean);
      } else if (key === "Beden") {
        const opts = filterOptions["Beden"] || [];
        bedenFiltreler = values.map((id) => opts.find((o) => o.id === id)?.name || "").filter(Boolean);
      } else {
        const teknikKey = TEKNIK_KEY_MAP[key];
        if (teknikKey) {
          teknikFiltreler[teknikKey] = values;
        }
      }
    });

    onFilterChange({
      grupId: selectedGrupId,
      turId: selectedTurId,
      minFiyat,
      maxFiyat,
      teknikFiltreler,
      renkFiltreler,
      bedenFiltreler,
    });
  }, [selections, minFiyat, maxFiyat, selectedGrupId, selectedTurId]);

  const toggleSelection = (kategoriName: string, optionId: string) => {
    setSelections((prev) => {
      const current = prev[kategoriName] || [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [kategoriName]: next };
    });
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getFilteredOptions = (kategoriName: string) => {
    const opts = filterOptions[kategoriName] || [];
    const term = searchTerms[kategoriName] || "";
    if (!term) return opts;
    return opts.filter((o) => o.name.toLowerCase().includes(term.toLowerCase()));
  };

  const activeFilterCount = Object.values(selections).reduce((acc, v) => acc + v.length, 0)
    + (minFiyat ? 1 : 0) + (maxFiyat ? 1 : 0);

  const clearAllFilters = () => {
    setSelections({});
    setMinFiyat("");
    setMaxFiyat("");
    onGrupChange(null);
    onTurChange(null);
  };

  return (
    <div className="w-72 shrink-0 space-y-4 hidden lg:block">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-lg">Filtreler</h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground h-auto py-1">
            <X className="w-3 h-3 mr-1" /> Temizle
          </Button>
        )}
      </div>

      {/* Grup filter */}
      {gruplar.length > 0 && (
        <FilterSection
          title="Ürün Grubu"
          isExpanded={expandedSections["_grup"] !== false}
          onToggle={() => toggleSection("_grup")}
          selectedCount={(selectedGrupId ? 1 : 0)}
        >
          <FilterSearchInput
            value={searchTerms["_grup"] || ""}
            onChange={(v) => setSearchTerms((p) => ({ ...p, "_grup": v }))}
            placeholder="Grup ara..."
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {gruplar
              .filter((g) => {
                const term = searchTerms["_grup"] || "";
                return !term || g.name.toLowerCase().includes(term.toLowerCase());
              })
              .map((g) => (
                <label key={g.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50">
                  <Checkbox
                    checked={selectedGrupId === g.id}
                    onCheckedChange={() => {
                      onGrupChange(selectedGrupId === g.id ? null : g.id);
                      onTurChange(null);
                    }}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-sm text-foreground">{g.name}</span>
                </label>
              ))}
          </div>
        </FilterSection>
      )}

      {/* Tür filter */}
      {turler.length > 0 && selectedGrupId && (
        <FilterSection
          title="Ürün Türü"
          isExpanded={expandedSections["_tur"] !== false}
          onToggle={() => toggleSection("_tur")}
          selectedCount={(selectedTurId ? 1 : 0)}
        >
          <FilterSearchInput
            value={searchTerms["_tur"] || ""}
            onChange={(v) => setSearchTerms((p) => ({ ...p, "_tur": v }))}
            placeholder="Tür ara..."
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {turler
              .filter((t) => {
                const term = searchTerms["_tur"] || "";
                return !term || t.name.toLowerCase().includes(term.toLowerCase());
              })
              .map((t) => (
                <label key={t.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50">
                  <Checkbox
                    checked={selectedTurId === t.id}
                    onCheckedChange={() => onTurChange(selectedTurId === t.id ? null : t.id)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-sm text-foreground">{t.name}</span>
                </label>
              ))}
          </div>
        </FilterSection>
      )}

      {/* Price range */}
      <FilterSection
        title="Fiyat Aralığı"
        isExpanded={expandedSections["_fiyat"] !== false}
        onToggle={() => toggleSection("_fiyat")}
        selectedCount={(minFiyat ? 1 : 0) + (maxFiyat ? 1 : 0)}
      >
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minFiyat}
            onChange={(e) => setMinFiyat(e.target.value)}
            className="h-8 text-sm"
          />
          <span className="text-muted-foreground text-sm">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxFiyat}
            onChange={(e) => setMaxFiyat(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </FilterSection>

      {/* Category-specific filters */}
      {filtreler.map((filtre) => {
        const opts = getFilteredOptions(filtre.kategoriName);
        const selected = selections[filtre.kategoriName] || [];

        return (
          <FilterSection
            key={filtre.kategoriName}
            title={filtre.label}
            isExpanded={expandedSections[filtre.kategoriName] !== false}
            onToggle={() => toggleSection(filtre.kategoriName)}
            selectedCount={selected.length}
          >
            <FilterSearchInput
              value={searchTerms[filtre.kategoriName] || ""}
              onChange={(v) => setSearchTerms((p) => ({ ...p, [filtre.kategoriName]: v }))}
              placeholder={`${filtre.label} ara...`}
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {opts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">Sonuç yok</p>
              ) : (
                opts.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={selected.includes(opt.id)}
                      onCheckedChange={() => toggleSelection(filtre.kategoriName, opt.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-sm text-foreground">{opt.name}</span>
                  </label>
                ))
              )}
            </div>
          </FilterSection>
        );
      })}
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
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm text-foreground">{title}</h4>
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {selectedCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && <div className="mt-3 space-y-2">{children}</div>}
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
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-xs pl-7 bg-muted/50"
      />
    </div>
  );
}

export { KATEGORI_FILTRELER, VARYANT_FIELDS, TEKNIK_KEY_MAP };
