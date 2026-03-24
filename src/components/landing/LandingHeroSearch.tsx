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

  // --- Firma search ---
  const searchFirma = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("firmalar")
        .select("id, firma_unvani, slug")
        .ilike("firma_unvani", `%${term}%`)
        .limit(8);
      return (data || []).map((f) => ({
        id: f.id,
        name: f.firma_unvani,
        type: "Firma",
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Ürün search (taxonomy + products, same as TekPazar) ---
  const searchUrun = useCallback((term: string): Suggestion[] => {
    if (kategoriNodes.length === 0) return [];
    const minScore = getMinMatchScore(term);

    // Taxonomy results (Kategori > Grup > Tür)
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
      const { data } = await supabase
        .from("firmalar")
        .select("slug")
        .eq("id", item.id)
        .single();
      if (data?.slug) navigate(`/${data.slug}`);
    } else {
      // Navigate to TekPazar with the selected taxonomy
      if (item.type === "Kategori") {
        navigate("/tekpazar", { state: { kategori: item.name } });
      } else if (item.type === "Grup") {
        const node = kategoriById[item.id];
        const parentName = node?.parent_id ? kategoriById[node.parent_id]?.name : null;
        const rootName = getRootCategoryName(item.id);
        navigate("/tekpazar", { state: { kategori: rootName, grupId: item.id } });
      } else if (item.type === "Tür") {
        const node = kategoriById[item.id];
        const rootName = getRootCategoryName(item.id);
        navigate("/tekpazar", { state: { kategori: rootName, grupId: node?.parent_id, turId: item.id } });
      }
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-xl mx-auto mb-6">
      {/* Tabs */}
      <div className="flex justify-center mb-3">
        <div className="inline-flex bg-muted/50 rounded-lg p-0.5 border border-border">
          <button
            onClick={() => handleTabChange("firma")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "firma"
                ? "bg-background text-secondary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Firma
          </button>
          <button
            onClick={() => handleTabChange("urun")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "urun"
                ? "bg-background text-secondary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Ürün
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center bg-background rounded-xl border border-border shadow-lg px-4 py-1 focus-within:border-secondary focus-within:shadow-[0_0_0_3px_rgba(245,154,35,0.12)] transition-all">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
                ? "Firma adı ile arayın..."
                : "Ürün kategorisi, grubu veya türü arayın..."
            }
            className="flex-1 min-w-0 bg-transparent text-foreground text-sm h-10 px-2 outline-none placeholder:text-muted-foreground/50"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setShowDropdown(false);
              }}
              className="text-muted-foreground text-xs bg-muted rounded px-1.5 py-0.5 hover:bg-muted-foreground/20 flex-shrink-0"
            >
              ✕
            </button>
          )}
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary flex-shrink-0 ml-1" />
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
                <span className="text-xs text-muted-foreground">{item.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
