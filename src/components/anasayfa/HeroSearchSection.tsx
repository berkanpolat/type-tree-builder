import { useState, useRef, forwardRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  name: string;
  type: "Kategori" | "Grup" | "Tür" | "Ürün";
}

interface HeroSearchSectionProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  searchResults: SearchResult[];
  showDropdown: boolean;
  onShowDropdown: (show: boolean) => void;
  onSearchResultClick: (result: SearchResult) => void;
  searchRef: React.RefObject<HTMLDivElement>;
}

type SearchTab = "urunler" | "firma";

const HeroSearchSection = ({
  searchTerm,
  onSearchTermChange,
  searchResults,
  showDropdown,
  onShowDropdown,
  onSearchResultClick,
  searchRef,
}: HeroSearchSectionProps) => {
  const [activeTab, setActiveTab] = useState<SearchTab>("urunler");
  const [focused, setFocused] = useState(false);

  const placeholder =
    activeTab === "urunler"
      ? "Ürün ara... (kumaş, iplik, aksesuar)"
      : "Üretici veya tedarikçi ara...";

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(224,60%,8%)] via-[hsl(224,55%,14%)] to-[hsl(224,50%,22%)]" />
      {/* Decorative circles */}
      <div className="absolute -top-36 right-[30%] w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(246,147,33,0.08)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute -bottom-24 -left-10 w-48 h-48 rounded-full bg-[radial-gradient(circle,rgba(60,100,255,0.08)_0%,transparent_65%)] pointer-events-none" />

      <div className="relative z-10 px-6 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_1fr] gap-6 lg:gap-8 items-center">
          {/* LEFT: Slogan */}
          <div className="hidden lg:block text-primary-foreground text-xl font-light leading-relaxed whitespace-nowrap">
            İşiniz Tekstilse,
            <br />
            Yeriniz{" "}
            <span className="inline-block bg-gradient-to-r from-secondary to-[hsl(32,85%,47%)] text-primary-foreground font-bold px-2 py-0.5 rounded-md text-lg">
              Tekstil A.Ş.
            </span>
          </div>

          {/* CENTER: Search */}
          <div ref={searchRef}>
            {/* Tabs */}
            <div className="flex justify-center mb-2">
              <div className="inline-flex items-center bg-white/[0.08] rounded-full p-0.5 border border-white/[0.12]">
                <button
                  onClick={() => setActiveTab("urunler")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all ${
                    activeTab === "urunler"
                      ? "bg-gradient-to-r from-secondary to-[hsl(32,85%,47%)] text-primary-foreground shadow-[0_2px_8px_rgba(245,154,35,0.4)]"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  ÜRÜNLER
                </button>
                <button
                  onClick={() => setActiveTab("firma")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all ${
                    activeTab === "firma"
                      ? "bg-gradient-to-r from-secondary to-[hsl(32,85%,47%)] text-primary-foreground shadow-[0_2px_8px_rgba(245,154,35,0.4)]"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  ÜRETİCİ / TEDARİKÇİ
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <div
                className={`flex items-center bg-white/95 rounded-xl px-4 py-1 shadow-[0_4px_24px_rgba(0,0,0,0.3)] border-2 transition-all ${
                  focused
                    ? "border-secondary shadow-[0_0_0_3px_rgba(245,154,35,0.15),0_4px_24px_rgba(0,0,0,0.3)]"
                    : "border-transparent"
                }`}
              >
                <Search className="w-4 h-4 text-foreground/35 flex-shrink-0" />
                <Input
                  placeholder={placeholder}
                  value={searchTerm}
                  onChange={(e) => {
                    onSearchTermChange(e.target.value);
                  }}
                  onFocus={() => {
                    setFocused(true);
                    if (searchResults.length > 0) onShowDropdown(true);
                  }}
                  onBlur={() => setFocused(false)}
                  className="border-0 bg-transparent text-foreground text-sm h-10 focus-visible:ring-0 shadow-none"
                />
                {searchTerm && (
                  <button
                    onClick={() => onSearchTermChange("")}
                    className="text-muted-foreground text-xs bg-muted rounded px-1.5 py-0.5 mr-1 hover:bg-muted-foreground/20"
                  >
                    ✕
                  </button>
                )}
                <button className="flex items-center gap-1.5 bg-gradient-to-r from-secondary to-[hsl(32,85%,47%)] text-primary-foreground rounded-lg px-4 py-2 text-xs font-semibold shadow-[0_3px_10px_rgba(245,154,35,0.5)] hover:brightness-110 active:scale-95 transition-all whitespace-nowrap">
                  <Search className="w-3 h-3" />
                  Ara
                </button>
              </div>

              {/* Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.15)] z-50 mt-2 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  {searchResults.map((result, i) => (
                    <button
                      key={`${result.id}-${i}`}
                      onMouseDown={() => onSearchResultClick(result)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-[hsl(32,80%,97%)] transition-colors text-left border-b border-border/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-2.5">
                        <Search className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                        <span className="text-sm text-foreground">{result.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{result.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: %0 Badge */}
          <div className="hidden lg:flex items-center justify-end gap-3.5">
            <div className="animate-[floatBadge_4s_ease-in-out_infinite] flex items-center gap-3.5">
              {/* Orbiting rings */}
              <div className="relative w-[90px] h-[90px] flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-secondary/35 animate-[spin_8s_linear_infinite]">
                  <div className="absolute w-[7px] h-[7px] bg-secondary rounded-full -top-[3.5px] left-1/2 -translate-x-1/2" />
                </div>
                <div className="absolute inset-[10px] rounded-full border border-dashed border-secondary/18 animate-[spin_14s_linear_infinite_reverse]">
                  <div className="absolute w-[5px] h-[5px] bg-secondary/60 rounded-full -top-[2.5px] left-1/2 -translate-x-1/2" />
                </div>
                <span className="relative z-10 text-[42px] font-bold leading-none bg-gradient-to-br from-secondary via-[hsl(40,90%,70%)] to-[hsl(32,85%,47%)] bg-clip-text text-transparent drop-shadow-[0_2px_16px_rgba(245,154,35,0.5)]">
                  %0
                </span>
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-primary-foreground tracking-wider">
                  KOMİSYON
                </div>
                <div className="text-[11px] text-white/40 mt-0.5">
                  Tüm kategorilerde
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSearchSection;
