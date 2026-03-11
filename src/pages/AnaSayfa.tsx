import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/tekstil-as-logo.png";
import PazarHeader from "@/components/PazarHeader";
import KategoriMegaMenu from "@/components/anasayfa/KategoriMegaMenu";
import HeroSearchSection from "@/components/anasayfa/HeroSearchSection";
import UrunFiltreler, { type FilterState } from "@/components/anasayfa/UrunFiltreler";
import Footer from "@/components/Footer";
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
import {
  Search,
  ImageIcon,
  Heart,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import bannerKomisyon from "@/assets/banner-komisyon.jpg";
import bannerStoktan from "@/assets/banner-stoktan.jpg";
import bannerSatis from "@/assets/banner-satis.jpg";
import bannerIplik from "@/assets/banner-iplik.jpg";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";
const ITEMS_PER_PAGE = 24;

const HIDDEN_KATEGORILER = ["Hazır Giyim (Üretim)"];

const URUN_KATEGORILERI = [
  "Hazır Giyim (Satış)",
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
  type: "Kategori" | "Grup" | "Tür" | "Ürün";
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
  teknik_detaylar: Record<string, string> | null;
}

interface UrunWithExtra extends UrunListItem {
  firma_unvani?: string;
  firma_logo_url?: string | null;
  min_varyant_fiyat?: number | null;
  max_varyant_fiyat?: number | null;
  is_favorited?: boolean;
  effective_price?: number | null;
}

const paraBirimiSymbol: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export default function AnaSayfa() {
  const navigate = useNavigate();
  const location = useLocation();
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [firmaLogoUrl, setFirmaLogoUrl] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/giris-kayit"); return; }
      setCurrentUserId(user.id);
      const { data: firma } = await supabase.from("firmalar").select("firma_unvani, logo_url").eq("user_id", user.id).single();
      if (firma) { setFirmaUnvani(firma.firma_unvani); setFirmaLogoUrl(firma.logo_url); }
      setAuthLoading(false);
    };
    check();
  }, [navigate]);

  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SearchResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Product state
  const [allUrunler, setAllUrunler] = useState<UrunWithExtra[]>([]);
  const [urunLoading, setUrunLoading] = useState(true);
  const [selectedKategori, setSelectedKategori] = useState<string | null>(null);
  const [selectedGrupId, setSelectedGrupId] = useState<string | null>(null);
  const [selectedTurId, setSelectedTurId] = useState<string | null>(null);

  // Read location.state for breadcrumb navigation from detail pages
  useEffect(() => {
    const state = location.state as { kategori?: string; kategoriId?: string; grupId?: string; turId?: string } | null;
    if (state?.kategori) {
      setSelectedKategori(state.kategori);
      setSelectedGrupId(state.grupId || null);
      setSelectedTurId(state.turId || null);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Filter state from sidebar
  const [filterState, setFilterState] = useState<FilterState | null>(null);

  // Varyasyon data for client-side filtering
  const [varyasyonMap, setVaryasyonMap] = useState<Record<string, { renk: string[]; beden: string[] }>>({});

  // Sorting
  const [sortBy, setSortBy] = useState<string>("newest");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Name maps
  const [kategoriSecenekler, setKategoriSecenekler] = useState<{ id: string; name: string }[]>([]);

  // Determine if we're in "filtered" mode (category selected)
  const isFiltered = !!selectedKategori || !!activeFilter || !!appliedSearchTerm;

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch kategori seçenekleri
  useEffect(() => {
    supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KATEGORI_ID).is("parent_id", null).order("name").then(({ data }) => {
      if (data) setKategoriSecenekler(data);
    });
  }, []);

  // Fetch products
  const fetchUrunler = useCallback(async () => {
    setUrunLoading(true);
    let query = supabase
      .from("urunler")
      .select("id, baslik, foto_url, fiyat, fiyat_tipi, para_birimi, urun_no, urun_kategori_id, urun_grup_id, urun_tur_id, min_siparis_miktari, user_id, teknik_detaylar")
      .eq("durum", "aktif")
      .order("created_at", { ascending: false })
      .limit(200);

    // Apply search filter
    if (activeFilter) {
      if (activeFilter.type === "Ürün") {
        query = query.ilike("baslik", `%${activeFilter.name}%`);
      } else if (activeFilter.type === "Kategori") {
        query = query.eq("urun_kategori_id", activeFilter.id);
      } else if (activeFilter.type === "Grup") {
        query = query.eq("urun_grup_id", activeFilter.id);
      } else if (activeFilter.type === "Tür") {
        query = query.eq("urun_tur_id", activeFilter.id);
      }
    } else if (appliedSearchTerm) {
      query = query.ilike("baslik", `%${appliedSearchTerm}%`);
    }

    // Apply mega-menu / sidebar category filters
    if (selectedTurId) {
      query = query.eq("urun_tur_id", selectedTurId);
    } else if (selectedGrupId) {
      query = query.eq("urun_grup_id", selectedGrupId);
    } else if (selectedKategori) {
      const match = kategoriSecenekler.find(
        (k) => k.name.toLowerCase() === selectedKategori.toLowerCase()
      );
      if (match) query = query.eq("urun_kategori_id", match.id);
    }

    // Apply price range (server-side for tek_fiyat only)
    if (filterState?.minFiyat) {
      query = query.gte("fiyat", parseFloat(filterState.minFiyat));
    }
    if (filterState?.maxFiyat) {
      query = query.lte("fiyat", parseFloat(filterState.maxFiyat));
    }

    const { data } = await query;
    if (!data) { setUrunLoading(false); return; }

    // Fetch firma info for all user_ids
    const userIds = [...new Set(data.map((u) => u.user_id))];
    const firmaMap: Record<string, { firma_unvani: string; logo_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: firmalarData } = await supabase.from("firmalar").select("user_id, firma_unvani, logo_url").in("user_id", userIds);
      if (firmalarData) firmalarData.forEach((f) => { firmaMap[f.user_id] = f; });
    }

    // Fetch varyasyonlar for varyasyonlu products
    const varyasyonluIds = data.filter((u) => u.fiyat_tipi === "varyasyonlu").map((u) => u.id);
    const varyantPriceMap: Record<string, { min: number; max: number }> = {};
    const varyantDataMap: Record<string, { renk: Set<string>; beden: Set<string> }> = {};
    const varyantFotoMap: Record<string, string> = {};

    if (varyasyonluIds.length > 0) {
      const { data: varyantlar } = await supabase
        .from("urun_varyasyonlar")
        .select("urun_id, birim_fiyat, foto_url, varyant_1_label, varyant_1_value, varyant_2_label, varyant_2_value")
        .in("urun_id", varyasyonluIds);
      if (varyantlar) {
        varyantlar.forEach((v) => {
          if (!varyantFotoMap[v.urun_id] && v.foto_url) varyantFotoMap[v.urun_id] = v.foto_url;
          if (!varyantPriceMap[v.urun_id]) {
            varyantPriceMap[v.urun_id] = { min: v.birim_fiyat, max: v.birim_fiyat };
          } else {
            if (v.birim_fiyat < varyantPriceMap[v.urun_id].min) varyantPriceMap[v.urun_id].min = v.birim_fiyat;
            if (v.birim_fiyat > varyantPriceMap[v.urun_id].max) varyantPriceMap[v.urun_id].max = v.birim_fiyat;
          }
          if (!varyantDataMap[v.urun_id]) varyantDataMap[v.urun_id] = { renk: new Set(), beden: new Set() };
          if (v.varyant_2_label === "Renk" && v.varyant_2_value) varyantDataMap[v.urun_id].renk.add(v.varyant_2_value);
          if (v.varyant_1_label === "Beden" && v.varyant_1_value) varyantDataMap[v.urun_id].beden.add(v.varyant_1_value);
          if (v.varyant_1_label === "Renk" && v.varyant_1_value) varyantDataMap[v.urun_id].renk.add(v.varyant_1_value);
          if (v.varyant_2_label === "Beden" && v.varyant_2_value) varyantDataMap[v.urun_id].beden.add(v.varyant_2_value);
        });
      }
    }

    // Also fetch varyasyonlar for non-varyasyonlu products for filtering
    const nonVaryIds = data.filter((u) => u.fiyat_tipi !== "varyasyonlu").map((u) => u.id);
    if (nonVaryIds.length > 0 && isFiltered) {
      const { data: otherVaryants } = await supabase
        .from("urun_varyasyonlar")
        .select("urun_id, varyant_1_label, varyant_1_value, varyant_2_label, varyant_2_value")
        .in("urun_id", nonVaryIds);
      if (otherVaryants) {
        otherVaryants.forEach((v) => {
          if (!varyantDataMap[v.urun_id]) varyantDataMap[v.urun_id] = { renk: new Set(), beden: new Set() };
          if (v.varyant_2_label === "Renk" && v.varyant_2_value) varyantDataMap[v.urun_id].renk.add(v.varyant_2_value);
          if (v.varyant_1_label === "Beden" && v.varyant_1_value) varyantDataMap[v.urun_id].beden.add(v.varyant_1_value);
          if (v.varyant_1_label === "Renk" && v.varyant_1_value) varyantDataMap[v.urun_id].renk.add(v.varyant_1_value);
          if (v.varyant_2_label === "Beden" && v.varyant_2_value) varyantDataMap[v.urun_id].beden.add(v.varyant_2_value);
        });
      }
    }

    const vMap: Record<string, { renk: string[]; beden: string[] }> = {};
    Object.entries(varyantDataMap).forEach(([id, d]) => {
      vMap[id] = { renk: [...d.renk], beden: [...d.beden] };
    });
    setVaryasyonMap(vMap);

    // Fetch favorites
    let favSet = new Set<string>();
    if (currentUserId) {
      const { data: favs } = await supabase.from("urun_favoriler").select("urun_id").eq("user_id", currentUserId);
      if (favs) favs.forEach((f) => favSet.add(f.urun_id));
    }

    const enriched: UrunWithExtra[] = data.map((u) => {
      const minV = varyantPriceMap[u.id]?.min ?? null;
      const maxV = varyantPriceMap[u.id]?.max ?? null;
      const effective = u.fiyat_tipi === "varyasyonlu" ? (minV ?? null) : (u.fiyat ?? null);
      return {
        ...u,
        foto_url: u.foto_url || varyantFotoMap[u.id] || null,
        teknik_detaylar: (u.teknik_detaylar as Record<string, string>) || null,
        firma_unvani: firmaMap[u.user_id]?.firma_unvani,
        firma_logo_url: firmaMap[u.user_id]?.logo_url,
        min_varyant_fiyat: minV,
        max_varyant_fiyat: maxV,
        is_favorited: favSet.has(u.id),
        effective_price: effective,
      };
    });

    setAllUrunler(enriched);
    setUrunLoading(false);
  }, [activeFilter, appliedSearchTerm, selectedKategori, selectedGrupId, selectedTurId, kategoriSecenekler, currentUserId, isFiltered, filterState?.minFiyat, filterState?.maxFiyat]);

  // Client-side filtering
  const filteredUrunler = useMemo(() => {
    let result = [...allUrunler];

    if (filterState && isFiltered) {
      Object.entries(filterState.teknikFiltreler).forEach(([key, values]) => {
        if (values.length === 0) return;
        result = result.filter((u) => {
          if (!u.teknik_detaylar) return false;
          const val = u.teknik_detaylar[key];
          return val && values.includes(val);
        });
      });

      if (filterState.renkFiltreler.length > 0) {
        result = result.filter((u) => {
          const renkler = varyasyonMap[u.id]?.renk || [];
          return filterState.renkFiltreler.some((r) => renkler.includes(r));
        });
      }

      if (filterState.bedenFiltreler.length > 0) {
        result = result.filter((u) => {
          const bedenler = varyasyonMap[u.id]?.beden || [];
          return filterState.bedenFiltreler.some((b) => bedenler.includes(b));
        });
      }

      if (filterState.minFiyat) {
        const min = parseFloat(filterState.minFiyat);
        result = result.filter((u) => {
          if (u.fiyat_tipi === "varyasyonlu") return (u.max_varyant_fiyat ?? 0) >= min;
          return true;
        });
      }
      if (filterState.maxFiyat) {
        const max = parseFloat(filterState.maxFiyat);
        result = result.filter((u) => {
          if (u.fiyat_tipi === "varyasyonlu") return (u.min_varyant_fiyat ?? Infinity) <= max;
          return true;
        });
      }
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => (a.effective_price ?? Infinity) - (b.effective_price ?? Infinity));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => (b.effective_price ?? 0) - (a.effective_price ?? 0));
    }

    return result;
  }, [allUrunler, filterState, varyasyonMap, sortBy, isFiltered]);

  // Pagination
  const totalItems = filteredUrunler.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedUrunler = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUrunler.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUrunler, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [filterState, sortBy, selectedKategori, selectedGrupId, selectedTurId, activeFilter]);

  useEffect(() => {
    fetchUrunler();
  }, [fetchUrunler]);

  // Search autocomplete
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results: SearchResult[] = [];

      // Run both queries in parallel
      const [seceneklerRes, urunRes] = await Promise.all([
        supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name, parent_id")
          .eq("kategori_id", KATEGORI_ID)
          .ilike("name", `%${searchTerm}%`)
          .limit(10),
        supabase
          .from("urunler")
          .select("id, baslik")
          .eq("durum", "aktif")
          .ilike("baslik", `%${searchTerm}%`)
          .limit(5),
      ]);

      const secenekler = seceneklerRes.data;
      if (secenekler) {
        const unknownParentIds = secenekler
          .filter((s) => s.parent_id && !secenekler.find((p) => p.id === s.parent_id))
          .map((s) => s.parent_id!);
        let parentMap: Record<string, { parent_id: string | null }> = {};
        if (unknownParentIds.length > 0) {
          const { data: parents } = await supabase
            .from("firma_bilgi_secenekleri")
            .select("id, parent_id")
            .in("id", unknownParentIds);
          if (parents) parents.forEach((p) => { parentMap[p.id] = p; });
        }
        secenekler.forEach((s) => {
          if (HIDDEN_KATEGORILER.some((h) => s.name.toLowerCase() === h.toLowerCase())) return;
          let type: SearchResult["type"] = "Tür";
          if (!s.parent_id) type = "Kategori";
          else {
            const inResults = secenekler.find((p) => p.id === s.parent_id);
            if (inResults && !inResults.parent_id) type = "Grup";
            else if (!inResults) {
              const parent = parentMap[s.parent_id!];
              if (parent) type = parent.parent_id ? "Tür" : "Grup";
            }
          }
          results.push({ id: s.id, name: s.name, type });
        });
      }

      if (urunRes.data) urunRes.data.forEach((u) => results.push({ id: u.id, name: u.baslik, type: "Ürün" }));
      setSearchResults(results);
      setShowDropdown(results.length > 0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchResultClick = (result: SearchResult) => {
    setActiveFilter(result);
    setSearchTerm(result.name);
    setShowDropdown(false);
    if (result.type === "Kategori") {
      const match = URUN_KATEGORILERI.find((k) => k.toLowerCase() === result.name.toLowerCase());
      if (match) { setSelectedKategori(match); setSelectedGrupId(null); setSelectedTurId(null); }
    }
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setSearchTerm("");
    setSelectedKategori(null);
    setSelectedGrupId(null);
    setSelectedTurId(null);
    setFilterState(null);
    setSortBy("newest");
  };

  const handleMegaMenuSelect = (katName: string, grupId?: string, turId?: string) => {
    setActiveFilter(null);
    setSearchTerm("");
    setSelectedKategori(katName);
    setSelectedGrupId(grupId || null);
    setSelectedTurId(turId || null);
  };

  const toggleFavorite = async (urunId: string, isFav: boolean) => {
    if (!currentUserId) return;
    if (isFav) {
      await supabase.from("urun_favoriler").delete().eq("user_id", currentUserId).eq("urun_id", urunId);
    } else {
      await supabase.from("urun_favoriler").insert({ user_id: currentUserId, urun_id: urunId });
    }
    setAllUrunler((prev) => prev.map((u) => u.id === urunId ? { ...u, is_favorited: !isFav } : u));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const renderProductCard = (urun: UrunWithExtra) => {
    const sym = paraBirimiSymbol[urun.para_birimi || "TRY"] || urun.para_birimi || "₺";
    let priceDisplay: React.ReactNode = <span className="text-sm text-muted-foreground">—</span>;
    if (urun.fiyat_tipi === "varyasyonlu" && urun.min_varyant_fiyat != null && urun.max_varyant_fiyat != null) {
      if (urun.min_varyant_fiyat === urun.max_varyant_fiyat) {
        priceDisplay = <span className="text-sm font-bold text-foreground">{sym}{urun.min_varyant_fiyat.toFixed(2)}</span>;
      } else {
        priceDisplay = <span className="text-sm font-bold text-foreground">{sym}{urun.min_varyant_fiyat.toFixed(2)} - {sym}{urun.max_varyant_fiyat.toFixed(2)}</span>;
      }
    } else if (urun.fiyat != null) {
      priceDisplay = <span className="text-sm font-bold text-foreground">{sym}{urun.fiyat.toFixed(2)}</span>;
    }

    return (
      <Card key={urun.id} className="overflow-hidden hover:shadow-lg transition-shadow group flex flex-col cursor-pointer" onClick={() => navigate(`/urun/${urun.id}`)}>
        <div className="aspect-square bg-muted relative overflow-hidden">
          {urun.foto_url ? (
            <img src={urun.foto_url} alt={urun.baslik} className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(urun.id, !!urun.is_favorited); }}
            className="absolute top-2 right-2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
          >
            <Heart className={`w-4 h-4 ${urun.is_favorited ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        </div>
        <div className="p-3 flex flex-col flex-1">
          <p className="text-sm font-medium text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">{urun.baslik}</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
              {urun.firma_logo_url ? (
                <img src={urun.firma_logo_url} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[8px] font-bold text-muted-foreground">{urun.firma_unvani?.charAt(0) || "?"}</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate">{urun.firma_unvani || ""}</span>
          </div>
          <div className="mb-3">{priceDisplay}</div>
          <Button size="sm" className="w-full mt-auto bg-primary text-primary-foreground hover:bg-primary/90">Ürünü Göster</Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-muted/30 font-sans">
      <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Search Header */}
        <HeroSearchSection
          label="ÜRÜNLER"
          placeholder="Ürün ara... (kumaş, iplik, aksesuar)"
          searchTerm={searchTerm}
          onSearchTermChange={(val) => { setSearchTerm(val); if (!val) setActiveFilter(null); }}
          onSearch={() => {}}
          searchResults={searchResults}
          showDropdown={showDropdown}
          onShowDropdown={setShowDropdown}
          onSearchResultClick={handleSearchResultClick}
          searchRef={searchRef as React.RefObject<HTMLDivElement>}
        />

        {/* Category Tabs */}
        <div className="bg-background rounded-xl px-6 border border-border">
          <KategoriMegaMenu
            kategoriler={URUN_KATEGORILERI}
            selectedKategori={selectedKategori}
            onSelect={handleMegaMenuSelect}
          />
        </div>

        {/* Active filter badge */}
        {(activeFilter || selectedKategori) && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedKategori && (
              <Badge variant="secondary" className="gap-1 px-3 py-1.5">
                Kategori: {selectedKategori}
                <button onClick={clearFilter} className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground">×</button>
              </Badge>
            )}
            {activeFilter && activeFilter.type !== "Kategori" && (
              <Badge variant="secondary" className="gap-1 px-3 py-1.5">
                {activeFilter.type}: {activeFilter.name}
                <button onClick={clearFilter} className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground">×</button>
              </Badge>
            )}
          </div>
        )}

        {/* Content Area */}
        {isFiltered ? (
          <div className="flex gap-6">
            {selectedKategori && (
              <UrunFiltreler
                selectedKategori={selectedKategori}
                selectedGrupId={selectedGrupId}
                selectedTurId={selectedTurId}
                onFilterChange={setFilterState}
                onGrupChange={(gId) => { setSelectedGrupId(gId); setSelectedTurId(null); }}
                onTurChange={setSelectedTurId}
              />
            )}

            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalItems}</span> ürün bulundu
                </p>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="newest">En Yeni</SelectItem>
                      <SelectItem value="price_asc">Fiyat (Artan)</SelectItem>
                      <SelectItem value="price_desc">Fiyat (Azalan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {urunLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : paginatedUrunler.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Bu filtrelere uygun ürün bulunmamaktadır.
                </div>
              ) : (
                <>
                  <div className={`grid gap-4 ${selectedKategori ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}`}>
                    {paginatedUrunler.map(renderProductCard)}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let page: number;
                        if (totalPages <= 7) page = i + 1;
                        else if (currentPage <= 4) page = i + 1;
                        else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                        else page = currentPage - 3 + i;
                        return (
                          <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(page)} className="w-9">
                            {page}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
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

            <h2 className="text-xl font-bold text-foreground">Popüler Ürünler</h2>
            {urunLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : allUrunler.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Henüz aktif ürün bulunmamaktadır.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {allUrunler.slice(0, 24).map(renderProductCard)}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
