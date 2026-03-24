import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Building2, ShoppingBag } from "lucide-react";

interface Suggestion {
  id: string;
  name: string;
  type: string;
}

interface KategoriNode {
  id: string;
  name: string;
  parent_id: string | null;
}

type TabType = "firma" | "urun";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";
const HIDDEN_KATEGORILER = ["Hazır Giyim (Üretim)"];

const FIRMA_POPULER = [
  { label: "Kumaş Tedarikçisi", state: { firmaTurId: "a1000000-0000-0000-0000-000000000002", firmaTipId: "81220f45-77c8-4d00-b978-da9741839e60", firmaTurName: "Tedarikçi" } },
  { label: "Örme Penye Giyim Üreticisi", state: { firmaTurId: "a1000000-0000-0000-0000-000000000001", firmaTipId: "6ad25a72-ba78-41c2-aa20-2ea982a4fc43", firmaTurName: "Hazır Giyim Üreticisi" } },
  { label: "Dokuma Giyim Üreticisi", state: { firmaTurId: "a1000000-0000-0000-0000-000000000001", firmaTipId: "bf8ec378-c8bc-4e86-88fe-031cfc9d932e", firmaTurName: "Hazır Giyim Üreticisi" } },
  { label: "Denim Giyim Üreticisi", state: { firmaTurId: "a1000000-0000-0000-0000-000000000001", firmaTipId: "bed607a7-4c2d-4263-a441-b20603963b6b", firmaTurName: "Hazır Giyim Üreticisi" } },
  { label: "Kumaş Hazırlık Atölyesi", state: { firmaTurId: "a1000000-0000-0000-0000-000000000003", firmaTipId: "8658b0e4-210e-4d6f-856d-81f15f4bb818", firmaTurName: "Fason Atölye" } },
];

const URUN_POPULER = [
  { label: "Hazır Giyim", state: { kategori: "Hazır Giyim (Satış)" } },
  { label: "İplik", state: { kategori: "İplik" } },
  { label: "Kumaş", state: { kategori: "Kumaş" } },
  { label: "Makine ve Yedek Parça", state: { kategori: "Makine ve Yedek Parça" } },
  { label: "Aksesuar", state: { kategori: "Aksesuar" } },
];

export default function LandingHeroSearch() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("firma");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Taxonomy tree for ürün tab
  const [kategoriNodes, setKategoriNodes] = useState<KategoriNode[]>([]);
  const kategoriById = useMemo(
    () => Object.fromEntries(kategoriNodes.map((n) => [n.id, n])),
    [kategoriNodes]
  );

  // Load taxonomy tree once
  useEffect(() => {
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name, parent_id")
      .eq("kategori_id", KATEGORI_ID)
      .order("name")
      .then(({ data }) => setKategoriNodes((data || []) as KategoriNode[]));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- Text helpers ---
  const normalizeText = useCallback((text: string) => {
    return text
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
      .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/\s+/g, " ").trim();
  }, []);

  const getLevenshteinDistance = useCallback((aRaw: string, bRaw: string) => {
    const a = normalizeText(aRaw);
    const b = normalizeText(bRaw);
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[a.length][b.length];
  }, [normalizeText]);

  const getSimilarityScore = useCallback((queryRaw: string, candidateRaw: string) => {
    const q = normalizeText(queryRaw);
    const c = normalizeText(candidateRaw);
    if (!q || !c) return 0;
    if (q === c) return 1200;
    let score = 0;
    if (c.startsWith(q)) score += 800;
    if (c.includes(q)) score += 550;
    const qWords = q.split(" ").filter(Boolean);
    const cWords = c.split(" ").filter(Boolean);
    const matched = qWords.filter((w) => cWords.some((cw) => cw.startsWith(w) || cw.includes(w))).length;
    if (matched > 0) score += matched * 160;
    const maxLen = Math.max(q.length, c.length);
    const editDist = getLevenshteinDistance(q, c);
    score += Math.round((maxLen > 0 ? 1 - editDist / maxLen : 0) * 260);
    const wordFuzzy = qWords.reduce((acc, w) => {
      const best = cWords.reduce((b, cw) => {
        const wm = Math.max(w.length, cw.length);
        return Math.max(b, wm > 0 ? 1 - getLevenshteinDistance(w, cw) / wm : 0);
      }, 0);
      return acc + best;
    }, 0);
    if (qWords.length > 0) score += Math.round((wordFuzzy / qWords.length) * 200);
    return score;
  }, [normalizeText, getLevenshteinDistance]);

  const getMinMatchScore = useCallback((termRaw: string) => {
    const len = normalizeText(termRaw).length;
    if (len <= 2) return 90;
    if (len <= 4) return 130;
    if (len <= 7) return 160;
    return 185;
  }, [normalizeText]);

  const getRootCategoryName = useCallback((nodeId: string): string | null => {
    let current = kategoriById[nodeId];
    let guard = 0;
    while (current?.parent_id && guard < 10) {
      current = kategoriById[current.parent_id];
      guard++;
    }
    if (!current) return null;
    if (HIDDEN_KATEGORILER.some((h) => normalizeText(h) === normalizeText(current.name))) return null;
    return current.name;
  }, [kategoriById, normalizeText]);

  const getNodeType = useCallback((node: KategoriNode): string => {
    if (!node.parent_id) return "Kategori";
    const parent = kategoriById[node.parent_id];
    if (parent && !parent.parent_id) return "Grup";
    return "Tür";
  }, [kategoriById]);

  // --- Firma search: firma adı + üretim/satış bilgisi ---
  const searchFirma = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const results: Suggestion[] = [];
      const seen = new Set<string>();

      // 1) Search firma_turleri first — if term matches a türü, show its tipleri
      const { data: matchingTurleri } = await supabase
        .from("firma_turleri")
        .select("id, name")
        .ilike("name", `%${term}%`)
        .limit(5);

      if (matchingTurleri && matchingTurleri.length > 0) {
        for (const tur of matchingTurleri) {
          const { data: tipleri } = await supabase
            .from("firma_tipleri")
            .select("id, name")
            .eq("firma_turu_id", tur.id)
            .order("name")
            .limit(10);

          if (tipleri) {
            for (const tip of tipleri) {
              const key = `tip-${tip.id}`;
              if (!seen.has(key)) {
                seen.add(key);
                results.push({
                  id: `tip:${tip.id}:${tur.id}`,
                  name: tip.name,
                  type: `${tur.name} › Firma Tipi`,
                });
              }
            }
          }
        }
      }

      // 2) Search firma_tipleri directly (e.g. "Kumaş Tedarikçisi")
      const { data: matchingTipleri } = await supabase
        .from("firma_tipleri")
        .select("id, name, firma_turu_id, firma_turleri!inner(name)")
        .ilike("name", `%${term}%`)
        .limit(8);

      if (matchingTipleri && matchingTipleri.length > 0) {
        for (const tip of matchingTipleri) {
          const key = `tip-${tip.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            const turName = (tip.firma_turleri as any)?.name || "";
            results.push({
              id: `tip:${tip.id}:${tip.firma_turu_id}`,
              name: tip.name,
              type: `${turName} › Firma Tipi`,
            });
          }
        }
      }

      // 3) Search by firma name
      const { data: firmaByName } = await supabase
        .from("firmalar")
        .select("id, firma_unvani, slug")
        .ilike("firma_unvani", `%${term}%`)
        .limit(6);

      for (const f of firmaByName || []) {
        if (!seen.has(f.id)) {
          seen.add(f.id);
          results.push({ id: f.id, name: f.firma_unvani, type: "Firma" });
        }
      }

      // 4) Search in üretim/satış taxonomy
      const { data: matchingOptions } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .ilike("name", `%${term}%`)
        .limit(50);

      if (matchingOptions && matchingOptions.length > 0) {
        const optionIds = matchingOptions.map((o) => o.id);
        const optionMap = Object.fromEntries(matchingOptions.map((o) => [o.id, o.name]));

        const [{ data: turMatches }, { data: grupMatches }, { data: katMatches }] = await Promise.all([
          supabase
            .from("firma_uretim_satis")
            .select("firma_id, tip, tur_id, firmalar!inner(id, firma_unvani, slug)")
            .in("tur_id", optionIds)
            .limit(10),
          supabase
            .from("firma_uretim_satis")
            .select("firma_id, tip, grup_id, firmalar!inner(id, firma_unvani, slug)")
            .in("grup_id", optionIds)
            .limit(10),
          supabase
            .from("firma_uretim_satis")
            .select("firma_id, tip, kategori_id, firmalar!inner(id, firma_unvani, slug)")
            .in("kategori_id", optionIds)
            .limit(10),
        ]);

        const addMatches = (matches: any[] | null, field: string, levelLabel: string) => {
          if (!matches) return;
          for (const match of matches) {
            const firma = match.firmalar as any;
            if (firma && !seen.has(firma.id)) {
              seen.add(firma.id);
              const matchName = optionMap[match[field]] || "";
              const tipLabel = match.tip === "uretim" ? "Ürettiği" : "Sattığı";
              results.push({
                id: firma.id,
                name: firma.firma_unvani,
                type: `${tipLabel} ${levelLabel}: ${matchName}`,
              });
            }
          }
        };

        addMatches(turMatches, "tur_id", "Tür");
        addMatches(grupMatches, "grup_id", "Grup");
        addMatches(katMatches, "kategori_id", "Kategori");
      }

      return results.slice(0, 10);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Ürün search (taxonomy) ---
  const searchUrun = useCallback((term: string): Suggestion[] => {
    if (kategoriNodes.length === 0) return [];
    const minScore = getMinMatchScore(term);

    const taxonomyResults = kategoriNodes
      .map((node) => {
        const rootName = getRootCategoryName(node.id);
        if (!rootName) return null;
        const score = getSimilarityScore(term, node.name);
        if (score < minScore) return null;
        return { id: node.id, name: node.name, type: getNodeType(node), score };
      })
      .filter((item): item is Suggestion & { score: number } => !!item)
      .sort((a, b) => {
        const order: Record<string, number> = { Kategori: 0, Grup: 1, Tür: 2 };
        const ta = order[a.type] ?? 3;
        const tb = order[b.type] ?? 3;
        if (ta !== tb) return ta - tb;
        return b.score - a.score;
      })
      .slice(0, 8);

    return taxonomyResults;
  }, [kategoriNodes, getMinMatchScore, getRootCategoryName, getSimilarityScore, getNodeType]);

  // --- Handle input ---
  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const term = value.trim();
      if (term.length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      if (tab === "firma") {
        searchFirma(term).then((results) => {
          setSuggestions(results);
          setShowDropdown(results.length > 0);
        });
      } else {
        const results = searchUrun(term);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setLoading(false);
      }
    }, 250);
  };

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleSelect = async (item: Suggestion) => {
    setShowDropdown(false);
    if (tab === "firma") {
      // Check if it's a firma tipi result (tip:tipId:turId)
      if (item.id.startsWith("tip:")) {
        const [, tipId, turId] = item.id.split(":");
        navigate("/firmalar", { state: { firmaTipId: tipId, firmaTurId: turId } });
      } else {
        const { data } = await supabase
          .from("firmalar")
          .select("slug")
          .eq("id", item.id)
          .single();
        if (data?.slug) navigate(`/${data.slug}`);
      }
    } else {
      if (item.type === "Kategori") {
        navigate("/tekpazar", { state: { kategori: item.name } });
      } else if (item.type === "Grup") {
        const rootName = getRootCategoryName(item.id);
        navigate("/tekpazar", { state: { kategori: rootName, grupId: item.id } });
      } else if (item.type === "Tür") {
        const node = kategoriById[item.id];
        const rootName = getRootCategoryName(item.id);
        navigate("/tekpazar", { state: { kategori: rootName, grupId: node?.parent_id, turId: item.id } });
      }
    }
  };

  const populerItems = tab === "firma" ? FIRMA_POPULER : URUN_POPULER;

  return (
    <div ref={containerRef} className="w-full max-w-2xl mb-6">
      {/* Tabs - pill style */}
      <div className="flex mb-4">
        <div className="inline-flex bg-muted rounded-full p-1 border border-border">
          <button
            onClick={() => handleTabChange("firma")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              tab === "firma"
                ? "bg-secondary text-secondary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Firma Ara
          </button>
          <button
            onClick={() => handleTabChange("urun")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              tab === "urun"
                ? "bg-secondary text-secondary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Ürün Ara
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center bg-background rounded-2xl border-2 border-border shadow-xl px-5 py-1.5 focus-within:border-secondary focus-within:shadow-[0_0_0_4px_rgba(245,154,35,0.12)] transition-all">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder={
              tab === "firma"
                ? "Firma adı, ürettiği veya sattığı ürün ile arayın..."
                : "Ürün kategorisi, grubu veya türü arayın..."
            }
            className="flex-1 min-w-0 bg-transparent text-foreground text-base h-12 px-3 outline-none placeholder:text-muted-foreground/50"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setShowDropdown(false);
              }}
              className="text-muted-foreground text-xs bg-muted rounded-full px-2 py-1 hover:bg-muted-foreground/20 flex-shrink-0"
            >
              ✕
            </button>
          )}
          {loading && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-secondary flex-shrink-0 ml-1" />
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] z-50 max-h-72 overflow-y-auto">
            {suggestions.map((item, i) => (
              <button
                key={`${item.id}-${i}`}
                onMouseDown={() => handleSelect(item)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/40 last:border-b-0"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                  {item.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular searches as buttons */}
      <div className="mt-4">
        <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2 block">
          Popüler Aramalar
        </span>
        <div className="flex flex-wrap gap-2">
          {populerItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (tab === "firma") {
                  navigate("/firmalar", { state: (item as typeof FIRMA_POPULER[0]).state });
                } else {
                  navigate("/tekpazar", { state: (item as typeof URUN_POPULER[0]).state });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-secondary/10 hover:border-secondary/40 text-foreground text-sm rounded-full border border-border transition-colors cursor-pointer"
            >
              <Search className="w-3 h-3 text-muted-foreground" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
