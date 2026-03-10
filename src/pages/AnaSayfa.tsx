import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/tekstil-as-logo.png";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  MapPin,
  Users,
  Globe,
  CalendarDays,
  MessageSquare,
  ArrowRight,
  ImageIcon,
  Bookmark,
  Heart,
  ChevronDown,
} from "lucide-react";
import bannerKomisyon from "@/assets/banner-komisyon.jpg";
import bannerStoktan from "@/assets/banner-stoktan.jpg";
import bannerSatis from "@/assets/banner-satis.jpg";
import bannerIplik from "@/assets/banner-iplik.jpg";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";

// Product categories for the horizontal bar
const URUN_KATEGORILERI = [
  "Hazır Giyim",
  "Kumaş",
  "İplik",
  "Aksesuar",
  "Ambalaj",
  "Makine ve Yedek Parça",
  "Kimyasal ve Boya Malzemeleri",
];

interface SearchResult {
  id: string;
  name: string;
  type: "Kategori" | "Grup" | "Tür" | "Ürün" | "Firma";
}

interface UrunListItem {
  id: string;
  baslik: string;
  foto_url: string | null;
  fiyat: number | null;
  fiyat_tipi: string;
  para_birimi: string | null;
  urun_no: string;
  urun_kategori_id: string | null;
  urun_grup_id: string | null;
  urun_tur_id: string | null;
  min_siparis_miktari: number | null;
  user_id: string;
}

interface UrunWithExtra extends UrunListItem {
  firma_unvani?: string;
  firma_logo_url?: string | null;
  min_varyant_fiyat?: number | null;
  max_varyant_fiyat?: number | null;
  is_favorited?: boolean;
}

interface FirmaListItem {
  id: string;
  firma_unvani: string;
  logo_url: string | null;
  firma_tipi_id: string;
  firma_turu_id: string;
  firma_olcegi_id: string | null;
  kurulus_il_id: string | null;
  kurulus_ilce_id: string | null;
  web_sitesi: string | null;
  kurulus_tarihi: string | null;
}

const paraBirimiSymbol: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export default function AnaSayfa() {
  const navigate = useNavigate();
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/giris-kayit"); return; }
      setCurrentUserId(user.id);
      const { data: firma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", user.id).single();
      if (firma) setFirmaUnvani(firma.firma_unvani);
      setAuthLoading(false);
    };
    check();
  }, [navigate]);
  const [activeTab, setActiveTab] = useState<"urunler" | "firma">("urunler");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SearchResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Ürünler state
  const [urunler, setUrunler] = useState<UrunWithExtra[]>([]);
  const [urunLoading, setUrunLoading] = useState(true);
  const [selectedKategori, setSelectedKategori] = useState<string | null>(null);
  const [selectedGrupId, setSelectedGrupId] = useState<string | null>(null);
  const [selectedTurId, setSelectedTurId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Firma state
  const [firmalar, setFirmalar] = useState<FirmaListItem[]>([]);
  const [firmaLoading, setFirmaLoading] = useState(false);
  const [firmaTurleri, setFirmaTurleri] = useState<{ id: string; name: string }[]>([]);
  const [firmaTipleri, setFirmaTipleri] = useState<{ id: string; name: string }[]>([]);
  const [selectedFirmaTuru, setSelectedFirmaTuru] = useState<string>("");
  const [selectedFirmaTipleri, setSelectedFirmaTipleri] = useState<string[]>([]);
  const [firmaOlcekleri, setFirmaOlcekleri] = useState<{ id: string; name: string }[]>([]);
  const [selectedOlcekler, setSelectedOlcekler] = useState<string[]>([]);

  // Name maps
  const [secenekMap, setSecenekMap] = useState<Record<string, string>>({});
  const [kategoriSecenekler, setKategoriSecenekler] = useState<{ id: string; name: string }[]>([]);

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch firma türleri
  useEffect(() => {
    supabase
      .from("firma_turleri")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) {
          setFirmaTurleri(data);
          // Find Tedarikçi as default
          const tedarikci = data.find((t) => t.name.toLowerCase().includes("tedarikçi"));
          if (tedarikci) setSelectedFirmaTuru(tedarikci.id);
          else if (data.length > 0) setSelectedFirmaTuru(data[0].id);
        }
      });
  }, []);

  // Fetch firma tipleri when firma türü changes
  useEffect(() => {
    if (!selectedFirmaTuru) return;
    supabase
      .from("firma_tipleri")
      .select("id, name")
      .eq("firma_turu_id", selectedFirmaTuru)
      .order("name")
      .then(({ data }) => {
        if (data) setFirmaTipleri(data);
      });
    setSelectedFirmaTipleri([]);
  }, [selectedFirmaTuru]);

  // Fetch kategori seçenekleri for horizontal bar matching
  useEffect(() => {
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_ID)
      .is("parent_id", null)
      .order("name")
      .then(({ data }) => {
        if (data) setKategoriSecenekler(data);
      });
  }, []);

  // Fetch firma ölçekleri
  useEffect(() => {
    supabase
      .from("firma_bilgi_kategorileri")
      .select("id")
      .eq("name", "Firma Ölçeği")
      .single()
      .then(({ data: kat }) => {
        if (kat) {
          supabase
            .from("firma_bilgi_secenekleri")
            .select("id, name")
            .eq("kategori_id", kat.id)
            .is("parent_id", null)
            .order("name")
            .then(({ data }) => {
              if (data) setFirmaOlcekleri(data);
            });
        }
      });
  }, []);

  // Fetch products
  const fetchUrunler = useCallback(async () => {
    setUrunLoading(true);
    let query = supabase
      .from("urunler")
      .select("id, baslik, foto_url, fiyat, fiyat_tipi, para_birimi, urun_no, urun_kategori_id, urun_grup_id, urun_tur_id, min_siparis_miktari, user_id")
      .eq("durum", "aktif")
      .order("created_at", { ascending: false })
      .limit(50);

    if (activeFilter && activeTab === "urunler") {
      if (activeFilter.type === "Ürün") {
        query = query.ilike("baslik", `%${activeFilter.name}%`);
      } else if (activeFilter.type === "Kategori") {
        query = query.eq("urun_kategori_id", activeFilter.id);
      } else if (activeFilter.type === "Grup") {
        query = query.eq("urun_grup_id", activeFilter.id);
      } else if (activeFilter.type === "Tür") {
        query = query.eq("urun_tur_id", activeFilter.id);
      }
    }

    if (selectedKategori) {
      const match = kategoriSecenekler.find(
        (k) => k.name.toLowerCase() === selectedKategori.toLowerCase()
      );
      if (match) {
        query = query.eq("urun_kategori_id", match.id);
      }
    }

    const { data } = await query;
    if (data && data.length > 0) {
      // Resolve category names
      const catIds = new Set<string>();
      data.forEach((u) => {
        if (u.urun_kategori_id) catIds.add(u.urun_kategori_id);
        if (u.urun_grup_id) catIds.add(u.urun_grup_id);
      });
      if (catIds.size > 0) {
        const { data: names } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name")
          .in("id", Array.from(catIds));
        if (names) {
          const map: Record<string, string> = { ...secenekMap };
          names.forEach((n) => { map[n.id] = n.name; });
          setSecenekMap(map);
        }
      }

      // Fetch firma info for product owners
      const userIds = [...new Set(data.map((u) => u.user_id))];
      const { data: firmalarData } = await supabase
        .from("firmalar")
        .select("user_id, firma_unvani, logo_url")
        .in("user_id", userIds);
      const firmaMap: Record<string, { firma_unvani: string; logo_url: string | null }> = {};
      firmalarData?.forEach((f) => { firmaMap[f.user_id] = f; });

      // Fetch variant price ranges for varyasyonlu products
      const varyasyonluIds = data.filter((u) => u.fiyat_tipi === "varyasyonlu").map((u) => u.id);
      const varyantMap: Record<string, { min: number; max: number }> = {};
      if (varyasyonluIds.length > 0) {
        const { data: varyantlar } = await supabase
          .from("urun_varyasyonlar")
          .select("urun_id, birim_fiyat")
          .in("urun_id", varyasyonluIds);
        if (varyantlar) {
          varyantlar.forEach((v) => {
            if (!varyantMap[v.urun_id]) {
              varyantMap[v.urun_id] = { min: v.birim_fiyat, max: v.birim_fiyat };
            } else {
              if (v.birim_fiyat < varyantMap[v.urun_id].min) varyantMap[v.urun_id].min = v.birim_fiyat;
              if (v.birim_fiyat > varyantMap[v.urun_id].max) varyantMap[v.urun_id].max = v.birim_fiyat;
            }
          });
        }
      }

      // Fetch favorites
      let favSet = new Set<string>();
      if (currentUserId) {
        const { data: favs } = await supabase
          .from("urun_favoriler")
          .select("urun_id")
          .eq("user_id", currentUserId);
        if (favs) favs.forEach((f) => favSet.add(f.urun_id));
      }

      // Enrich products
      const enriched: UrunWithExtra[] = data.map((u) => ({
        ...u,
        firma_unvani: firmaMap[u.user_id]?.firma_unvani,
        firma_logo_url: firmaMap[u.user_id]?.logo_url,
        min_varyant_fiyat: varyantMap[u.id]?.min ?? null,
        max_varyant_fiyat: varyantMap[u.id]?.max ?? null,
        is_favorited: favSet.has(u.id),
      }));
      setUrunler(enriched);
    } else {
      setUrunler([]);
    }
    setUrunLoading(false);
  }, [activeFilter, selectedKategori, kategoriSecenekler, activeTab, currentUserId]);

  // Fetch companies
  const fetchFirmalar = useCallback(async () => {
    setFirmaLoading(true);
    let query = supabase
      .from("firmalar")
      .select("id, firma_unvani, logo_url, firma_tipi_id, firma_turu_id, firma_olcegi_id, kurulus_il_id, kurulus_ilce_id, web_sitesi, kurulus_tarihi")
      .order("firma_unvani")
      .limit(50);

    if (selectedFirmaTuru) {
      query = query.eq("firma_turu_id", selectedFirmaTuru);
    }

    if (selectedFirmaTipleri.length > 0) {
      query = query.in("firma_tipi_id", selectedFirmaTipleri);
    }

    if (selectedOlcekler.length > 0) {
      query = query.in("firma_olcegi_id", selectedOlcekler);
    }

    if (activeFilter && activeTab === "firma") {
      query = query.ilike("firma_unvani", `%${activeFilter.name}%`);
    }

    const { data } = await query;
    if (data) {
      setFirmalar(data);
      // Resolve names for tipi, il, ilce, olcek
      const ids = new Set<string>();
      data.forEach((f) => {
        if (f.firma_tipi_id) ids.add(f.firma_tipi_id);
        if (f.firma_olcegi_id) ids.add(f.firma_olcegi_id);
        if (f.kurulus_il_id) ids.add(f.kurulus_il_id);
        if (f.kurulus_ilce_id) ids.add(f.kurulus_ilce_id);
      });
      // Also resolve firma tipleri names
      const tipIds = new Set<string>();
      data.forEach((f) => tipIds.add(f.firma_tipi_id));
      
      const allIds = [...ids];
      if (allIds.length > 0) {
        const { data: names } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name")
          .in("id", allIds);
        if (names) {
          const map: Record<string, string> = { ...secenekMap };
          names.forEach((n) => {
            map[n.id] = n.name;
          });
          setSecenekMap(map);
        }
      }
      // Resolve firma tipleri
      if (tipIds.size > 0) {
        const { data: tipNames } = await supabase
          .from("firma_tipleri")
          .select("id, name")
          .in("id", Array.from(tipIds));
        if (tipNames) {
          const map: Record<string, string> = { ...secenekMap };
          tipNames.forEach((n) => {
            map[n.id] = n.name;
          });
          setSecenekMap(map);
        }
      }
    }
    setFirmaLoading(false);
  }, [selectedFirmaTuru, selectedFirmaTipleri, selectedOlcekler, activeFilter, activeTab]);

  useEffect(() => {
    if (activeTab === "urunler") {
      fetchUrunler();
    }
  }, [activeTab, fetchUrunler]);

  useEffect(() => {
    if (activeTab === "firma") {
      fetchFirmalar();
    }
  }, [activeTab, fetchFirmalar]);

  // Search autocomplete
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results: SearchResult[] = [];

      if (activeTab === "urunler") {
        // Search in categories (firma_bilgi_secenekleri with KATEGORI_ID)
        const { data: secenekler } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name, parent_id")
          .eq("kategori_id", KATEGORI_ID)
          .ilike("name", `%${searchTerm}%`)
          .limit(10);

        if (secenekler) {
          secenekler.forEach((s) => {
            // Determine level: no parent = Kategori, has parent check its parent
            let type: SearchResult["type"] = "Tür";
            if (!s.parent_id) type = "Kategori";
            else {
              const parent = secenekler.find((p) => p.id === s.parent_id);
              if (parent && !parent.parent_id) type = "Grup";
            }
            results.push({ id: s.id, name: s.name, type });
          });
        }

        // Also determine correct types for items with parent not in results
        if (secenekler) {
          const unknownParentIds = secenekler
            .filter((s) => s.parent_id && !secenekler.find((p) => p.id === s.parent_id))
            .map((s) => s.parent_id!);
          
          if (unknownParentIds.length > 0) {
            const { data: parents } = await supabase
              .from("firma_bilgi_secenekleri")
              .select("id, parent_id")
              .in("id", unknownParentIds);
            
            if (parents) {
              // Update types
              results.forEach((r) => {
                const original = secenekler?.find((s) => s.id === r.id);
                if (original?.parent_id) {
                  const parent = parents.find((p) => p.id === original.parent_id);
                  if (parent) {
                    r.type = parent.parent_id ? "Tür" : "Grup";
                  }
                }
              });
            }
          }
        }

        // Search in product titles
        const { data: urunResults } = await supabase
          .from("urunler")
          .select("id, baslik")
          .eq("durum", "aktif")
          .ilike("baslik", `%${searchTerm}%`)
          .limit(5);

        if (urunResults) {
          urunResults.forEach((u) => {
            results.push({ id: u.id, name: u.baslik, type: "Ürün" });
          });
        }
      } else {
        // Search firma ünvanı
        const { data: firmaResults } = await supabase
          .from("firmalar")
          .select("id, firma_unvani")
          .ilike("firma_unvani", `%${searchTerm}%`)
          .limit(5);

        if (firmaResults) {
          firmaResults.forEach((f) => {
            results.push({ id: f.id, name: f.firma_unvani, type: "Firma" });
          });
        }

        // Search in uretim_satis tur names that match
        const { data: turMatches } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name")
          .eq("kategori_id", KATEGORI_ID)
          .ilike("name", `%${searchTerm}%`)
          .limit(5);

        if (turMatches) {
          turMatches.forEach((t) => {
            results.push({ id: t.id, name: t.name, type: "Tür" });
          });
        }
      }

      setSearchResults(results);
      setShowDropdown(results.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  const handleSearchResultClick = (result: SearchResult) => {
    setActiveFilter(result);
    setSearchTerm(result.name);
    setShowDropdown(false);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setSearchTerm("");
    setSelectedKategori(null);
  };

  const handleKategoriClick = (kat: string) => {
    if (selectedKategori === kat) {
      setSelectedKategori(null);
    } else {
      setSelectedKategori(kat);
      setActiveFilter(null);
    }
  };

  const toggleFirmaTipi = (id: string) => {
    setSelectedFirmaTipleri((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleOlcek = (id: string) => {
    setSelectedOlcekler((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleFavorite = async (urunId: string, isFav: boolean) => {
    if (!currentUserId) return;
    if (isFav) {
      await supabase.from("urun_favoriler").delete().eq("user_id", currentUserId).eq("urun_id", urunId);
    } else {
      await supabase.from("urun_favoriler").insert({ user_id: currentUserId, urun_id: urunId });
    }
    setUrunler((prev) =>
      prev.map((u) => u.id === urunId ? { ...u, is_favorited: !isFav } : u)
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/anasayfa">
              <img src={logoImg} alt="Tekstil A.Ş." className="h-9 object-contain" />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/anasayfa" className="text-sm font-medium text-foreground hover:text-secondary transition-colors">TekPazar</Link>
              <Link to="/manuihale" className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors">Tekİhale</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate max-w-[200px]">{firmaUnvani}</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Search Header */}
        <div className="bg-primary rounded-xl p-6 pb-0">
          {/* Tabs */}
          <div className="flex justify-center gap-8 mb-6">
            <button
              onClick={() => { setActiveTab("urunler"); clearFilter(); }}
              className={`text-sm font-semibold tracking-wide pb-2 border-b-2 transition-colors ${
                activeTab === "urunler"
                  ? "text-primary-foreground border-primary-foreground"
                  : "text-primary-foreground/60 border-transparent hover:text-primary-foreground/80"
              }`}
            >
              ÜRÜNLER
            </button>
            <button
              onClick={() => { setActiveTab("firma"); clearFilter(); }}
              className={`text-sm font-semibold tracking-wide pb-2 border-b-2 transition-colors ${
                activeTab === "firma"
                  ? "text-primary-foreground border-primary-foreground"
                  : "text-primary-foreground/60 border-transparent hover:text-primary-foreground/80"
              }`}
            >
              ÜRETİCİ / TEDARİKÇİ
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-6" ref={searchRef}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder={
                    activeTab === "urunler"
                      ? "Ürün ara..."
                      : "Üretici / tedarikçi ara...."
                  }
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (!e.target.value) {
                      setActiveFilter(null);
                    }
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  className="pl-12 h-12 bg-background text-foreground border-0 text-base"
                />
              </div>
              {activeTab === "firma" && (
                <Select value={selectedFirmaTuru} onValueChange={setSelectedFirmaTuru}>
                  <SelectTrigger className="w-[180px] h-12 bg-muted border-0">
                    <SelectValue placeholder="Firma Türü" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {firmaTurleri.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Search Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-50 mt-1 max-h-80 overflow-y-auto">
                {searchResults.map((result, i) => (
                  <button
                    key={`${result.id}-${i}`}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border last:border-b-0"
                  >
                    <span className="text-sm text-foreground">{result.name}</span>
                    <span className="text-xs text-muted-foreground">{result.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category bar (only for urunler) */}
          {activeTab === "urunler" && (
            <div className="bg-background rounded-t-xl -mx-6 px-6">
              <div className="flex items-center justify-center gap-6 overflow-x-auto py-3 scrollbar-hide">
                {URUN_KATEGORILERI.map((kat) => (
                  <button
                    key={kat}
                    onClick={() => handleKategoriClick(kat)}
                    className={`whitespace-nowrap text-sm font-medium transition-colors ${
                      selectedKategori === kat
                        ? "text-secondary border-b-2 border-secondary pb-1"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeTab === "firma" && <div className="h-4" />}
        </div>

        {/* Active filter badge */}
        {activeFilter && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 px-3 py-1.5">
              {activeFilter.type}: {activeFilter.name}
              <button onClick={clearFilter} className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground">×</button>
            </Badge>
          </div>
        )}

        {/* Content Area */}
        {activeTab === "urunler" ? (
          <div className="space-y-6">
            {/* Banners */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-3">
                <div className="relative rounded-xl overflow-hidden h-48">
                  <img src={bannerKomisyon} alt="Komisyon" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center px-8">
                    <div>
                      <p className="text-primary-foreground text-2xl lg:text-3xl font-bold">
                        Kar Ortağınız <span className="font-extrabold">Değil,</span>
                      </p>
                      <p className="text-3xl lg:text-4xl font-extrabold mt-1">
                        <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded">Çözüm</span>{" "}
                        <span className="text-primary-foreground">Ortağınız!</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative rounded-xl overflow-hidden h-36">
                <img src={bannerStoktan} alt="Stoktan Hemen Teslim" className="w-full h-full object-cover" />
              </div>
              <div className="relative rounded-xl overflow-hidden h-36">
                <img src={bannerSatis} alt="Satış Sizin" className="w-full h-full object-cover" />
              </div>
              <div className="relative rounded-xl overflow-hidden h-36">
                <img src={bannerIplik} alt="İplikler" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Popüler Ürünler */}
            <h2 className="text-xl font-bold text-foreground">Popüler Ürünler</h2>
            {urunLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : urunler.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Henüz aktif ürün bulunmamaktadır.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {urunler.map((urun) => {
                  const sym = paraBirimiSymbol[urun.para_birimi || "TRY"] || urun.para_birimi || "₺";
                  let priceDisplay: React.ReactNode = <span className="text-sm text-muted-foreground">—</span>;
                  if (urun.fiyat_tipi === "varyasyonlu" && urun.min_varyant_fiyat != null && urun.max_varyant_fiyat != null) {
                    if (urun.min_varyant_fiyat === urun.max_varyant_fiyat) {
                      priceDisplay = <span className="text-sm font-bold text-foreground">{sym}{urun.min_varyant_fiyat.toFixed(2)}</span>;
                    } else {
                      priceDisplay = <span className="text-sm font-bold text-foreground">{sym}{urun.min_varyant_fiyat.toFixed(2)} - {sym} {urun.max_varyant_fiyat.toFixed(2)}</span>;
                    }
                  } else if (urun.fiyat != null) {
                    priceDisplay = <span className="text-sm font-bold text-foreground">{sym}{urun.fiyat.toFixed(2)}</span>;
                  }

                  return (
                    <Card key={urun.id} className="overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">
                      {/* Image */}
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {urun.foto_url ? (
                          <img
                            src={urun.foto_url}
                            alt={urun.baslik}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(urun.id, !!urun.is_favorited); }}
                          className="absolute top-2 right-2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
                        >
                          <Heart
                            className={`w-4 h-4 ${urun.is_favorited ? "fill-primary text-primary" : "text-muted-foreground"}`}
                          />
                        </button>
                      </div>
                      {/* Info */}
                      <div className="p-3 flex flex-col flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">
                          {urun.baslik}
                        </p>
                        {/* Firma info */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                            {urun.firma_logo_url ? (
                              <img src={urun.firma_logo_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[8px] font-bold text-muted-foreground">
                                {urun.firma_unvani?.charAt(0) || "?"}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">
                            {urun.firma_unvani || ""}
                          </span>
                        </div>
                        {/* Price */}
                        <div className="mb-3">{priceDisplay}</div>
                        {/* CTA */}
                        <Button size="sm" className="w-full mt-auto bg-primary text-primary-foreground hover:bg-primary/90">
                          Ürünü Göster
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Firma Tab */
          <div className="flex gap-6">
            {/* Left sidebar filters */}
            <div className="w-80 shrink-0 space-y-6 hidden lg:block">
              {/* Firma Tipi Filter */}
              <Card className="p-5">
                <h3 className="font-semibold text-foreground mb-4">Firma Tipi</h3>
                <div className="space-y-3">
                  {firmaTipleri.map((tip) => (
                    <label key={tip.id} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={selectedFirmaTipleri.includes(tip.id)}
                        onCheckedChange={() => toggleFirmaTipi(tip.id)}
                      />
                      <span className="text-sm text-foreground">{tip.name}</span>
                    </label>
                  ))}
                </div>
              </Card>

              {/* Firma Ölçeği Filter */}
              <Card className="p-5">
                <h3 className="font-semibold text-foreground mb-4">Firma Ölçeği</h3>
                <div className="space-y-3">
                  {firmaOlcekleri.map((olcek) => (
                    <label key={olcek.id} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={selectedOlcekler.includes(olcek.id)}
                        onCheckedChange={() => toggleOlcek(olcek.id)}
                      />
                      <span className="text-sm text-foreground">{olcek.name}</span>
                    </label>
                  ))}
                </div>
              </Card>
            </div>

            {/* Company list */}
            <div className="flex-1 space-y-4">
              {firmaLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : firmalar.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Henüz kayıtlı firma bulunmamaktadır.
                </div>
              ) : (
                firmalar.map((firma) => (
                  <Card key={firma.id} className="p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                        {firma.logo_url ? (
                          <img src={firma.logo_url} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">
                            {firma.firma_unvani.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <h3 className="font-semibold text-foreground text-lg">
                            {firma.firma_unvani}
                          </h3>
                          <Badge className="bg-secondary/10 text-secondary border-secondary/30 text-xs">
                            {secenekMap[firma.firma_tipi_id] || ""}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2">
                          {(firma.kurulus_il_id || firma.kurulus_ilce_id) && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>
                                {firma.kurulus_il_id ? secenekMap[firma.kurulus_il_id] || "" : ""}
                                {firma.kurulus_ilce_id
                                  ? `, ${secenekMap[firma.kurulus_ilce_id] || ""}`
                                  : ""}
                              </span>
                            </div>
                          )}
                          {firma.firma_olcegi_id && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Users className="w-3.5 h-3.5" />
                              <span>{secenekMap[firma.firma_olcegi_id] || ""}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-1">
                          {firma.web_sitesi && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Globe className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {firma.kurulus_tarihi && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <CalendarDays className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button className="p-2 hover:bg-muted rounded-md transition-colors">
                          <Bookmark className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <Button size="sm" variant="outline" className="gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Mesaj
                        </Button>
                        <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                          <ArrowRight className="w-3.5 h-3.5" />
                          Profili Gör
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
