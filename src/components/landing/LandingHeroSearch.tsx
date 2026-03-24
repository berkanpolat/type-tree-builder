import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Building2, ShoppingBag } from "lucide-react";

interface Suggestion {
  id: string;
  name: string;
  subtitle?: string;
}

type TabType = "firma" | "urun";

export default function LandingHeroSearch() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("firma");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const searchFirma = useCallback(async (term: string) => {
    const { data } = await supabase
      .from("firmalar")
      .select("id, firma_unvani, slug")
      .ilike("firma_unvani", `%${term}%`)
      .limit(8);
    return (data || []).map((f) => ({
      id: f.id,
      name: f.firma_unvani,
      subtitle: undefined,
    }));
  }, []);

  const searchUrun = useCallback(async (term: string) => {
    const { data } = await supabase
      .from("urunler")
      .select("id, baslik, slug, urun_no")
      .ilike("baslik", `%${term}%`)
      .eq("durum", "aktif")
      .limit(8);
    return (data || []).map((u) => ({
      id: u.id,
      name: u.baslik,
      subtitle: u.urun_no || undefined,
    }));
  }, []);

  const handleSearch = useCallback(
    async (term: string) => {
      if (term.length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      setLoading(true);
      try {
        const results = tab === "firma" ? await searchFirma(term) : await searchUrun(term);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } finally {
        setLoading(false);
      }
    },
    [tab, searchFirma, searchUrun]
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 250);
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
      // Get slug for navigation
      const { data } = await supabase
        .from("firmalar")
        .select("slug")
        .eq("id", item.id)
        .single();
      if (data?.slug) {
        navigate(`/${data.slug}`);
      }
    } else {
      const { data } = await supabase
        .from("urunler")
        .select("slug")
        .eq("id", item.id)
        .single();
      if (data?.slug) {
        navigate(`/urun/${data.slug}`);
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
                : "Ürün adı ile arayın..."
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
                  {tab === "firma" ? (
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                  ) : (
                    <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                  )}
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
                {item.subtitle && (
                  <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
