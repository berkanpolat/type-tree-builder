import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/tekstil-as-logo.png";
import PazarHeader from "@/components/PazarHeader";
import KategoriMegaMenu from "@/components/anasayfa/KategoriMegaMenu";
import UrunFiltreler, { type FilterState } from "@/components/anasayfa/UrunFiltreler";
import FirmaFiltreler, { type FirmaFilterState } from "@/components/anasayfa/FirmaFiltreler";
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
  Heart,
  Bookmark,
  ChevronDown,
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
  teknik_detaylar: Record<string, string> | null;
}

interface UrunWithExtra extends UrunListItem {
  firma_unvani?: string;
  firma_logo_url?: string | null;
  min_varyant_fiyat?: number | null;
  max_varyant_fiyat?: number | null;
  is_favorited?: boolean;
  effective_price?: number | null; // for sorting
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
  moq: number | null;
  user_id: string;
}

interface FirmaWithExtra extends FirmaListItem {
  firma_turu_name?: string;
  firma_tipi_name?: string;
  faaliyet_alani?: string;
  is_favorited?: boolean;
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

  const [activeTab, setActiveTab] = useState<"urunler" | "firma">("urunler");
  const [searchTerm, setSearchTerm] = useState("");
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

  // Filter state from sidebar
  const [filterState, setFilterState] = useState<FilterState | null>(null);

  // Varyasyon data for client-side filtering
  const [varyasyonMap, setVaryasyonMap] = useState<Record<string, { renk: string[]; beden: string[] }>>({});

  // Sorting
  const [sortBy, setSortBy] = useState<string>("newest");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Firma state
  const [firmalar, setFirmalar] = useState<FirmaWithExtra[]>([]);
  const [firmaLoading, setFirmaLoading] = useState(false);
  const [firmaTurleri, setFirmaTurleri] = useState<{ id: string; name: string }[]>([]);
  const [selectedFirmaTuru, setSelectedFirmaTuru] = useState<string>("");
  const [selectedFirmaTuruName, setSelectedFirmaTuruName] = useState<string>("");
  const [firmaFilterState, setFirmaFilterState] = useState<FirmaFilterState | null>(null);
  const [firmaFavSet, setFirmaFavSet] = useState<Set<string>>(new Set());

  // Name maps
  const [secenekMap, setSecenekMap] = useState<Record<string, string>>({});
  const [kategoriSecenekler, setKategoriSecenekler] = useState<{ id: string; name: string }[]>([]);

  // Determine if we're in "filtered" mode (category selected)
  const isFiltered = !!selectedKategori || !!activeFilter;

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch firma türleri
  useEffect(() => {
    supabase.from("firma_turleri").select("id, name").order("name").then(({ data }) => {
      if (data) {
        setFirmaTurleri(data);
        const tedarikci = data.find((t) => t.name.toLowerCase().includes("tedarikçi"));
        if (tedarikci) { setSelectedFirmaTuru(tedarikci.id); setSelectedFirmaTuruName(tedarikci.name); }
        else if (data.length > 0) { setSelectedFirmaTuru(data[0].id); setSelectedFirmaTuruName(data[0].name); }
      }
    });
  }, []);

  // Fetch kategori seçenekleri (for ürün tab)
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
    if (!data || data.length === 0) {
      setAllUrunler([]);
      setVaryasyonMap({});
      setUrunLoading(false);
      return;
    }

    // Resolve category names
    const catIds = new Set<string>();
    data.forEach((u) => {
      if (u.urun_kategori_id) catIds.add(u.urun_kategori_id);
      if (u.urun_grup_id) catIds.add(u.urun_grup_id);
    });
    if (catIds.size > 0) {
      const { data: names } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", Array.from(catIds));
      if (names) {
        const map: Record<string, string> = { ...secenekMap };
        names.forEach((n) => { map[n.id] = n.name; });
        setSecenekMap(map);
      }
    }

    // Fetch firma info
    const userIds = [...new Set(data.map((u) => u.user_id))];
    const { data: firmalarData } = await supabase.from("firmalar").select("user_id, firma_unvani, logo_url").in("user_id", userIds);
    const firmaMap: Record<string, { firma_unvani: string; logo_url: string | null }> = {};
    firmalarData?.forEach((f) => { firmaMap[f.user_id] = f; });

    // Fetch variant prices
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
          // Prices
          if (!varyantPriceMap[v.urun_id]) {
            varyantPriceMap[v.urun_id] = { min: v.birim_fiyat, max: v.birim_fiyat };
          } else {
            if (v.birim_fiyat < varyantPriceMap[v.urun_id].min) varyantPriceMap[v.urun_id].min = v.birim_fiyat;
            if (v.birim_fiyat > varyantPriceMap[v.urun_id].max) varyantPriceMap[v.urun_id].max = v.birim_fiyat;
          }
          // Varyant attributes for filtering
          if (!varyantDataMap[v.urun_id]) varyantDataMap[v.urun_id] = { renk: new Set(), beden: new Set() };
          if (v.varyant_2_label === "Renk" && v.varyant_2_value) varyantDataMap[v.urun_id].renk.add(v.varyant_2_value);
          if (v.varyant_1_label === "Beden" && v.varyant_1_value) varyantDataMap[v.urun_id].beden.add(v.varyant_1_value);
          if (v.varyant_1_label === "Renk" && v.varyant_1_value) varyantDataMap[v.urun_id].renk.add(v.varyant_1_value);
          if (v.varyant_2_label === "Beden" && v.varyant_2_value) varyantDataMap[v.urun_id].beden.add(v.varyant_2_value);
        });
      }
    }

    // Also fetch varyasyonlar for non-varyasyonlu products that might have renk/beden data
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

    // Convert sets to arrays for state
    const vMap: Record<string, { renk: string[]; beden: string[] }> = {};
    Object.entries(varyantDataMap).forEach(([id, data]) => {
      vMap[id] = { renk: [...data.renk], beden: [...data.beden] };
    });
    setVaryasyonMap(vMap);

    // Fetch favorites
    let favSet = new Set<string>();
    if (currentUserId) {
      const { data: favs } = await supabase.from("urun_favoriler").select("urun_id").eq("user_id", currentUserId);
      if (favs) favs.forEach((f) => favSet.add(f.urun_id));
    }

    // Enrich
    const enriched: UrunWithExtra[] = data.map((u) => {
      const minV = varyantPriceMap[u.id]?.min ?? null;
      const maxV = varyantPriceMap[u.id]?.max ?? null;
      const effective = u.fiyat_tipi === "varyasyonlu" ? (minV ?? null) : (u.fiyat ?? null);
      return {
        ...u,
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
  }, [activeFilter, selectedKategori, selectedGrupId, selectedTurId, kategoriSecenekler, activeTab, currentUserId, isFiltered, filterState?.minFiyat, filterState?.maxFiyat]);

  // Client-side filtering for teknik_detaylar and varyasyonlar
  const filteredUrunler = useMemo(() => {
    let result = [...allUrunler];

    if (filterState && isFiltered) {
      // Teknik detaylar filters
      Object.entries(filterState.teknikFiltreler).forEach(([key, values]) => {
        if (values.length === 0) return;
        result = result.filter((u) => {
          if (!u.teknik_detaylar) return false;
          const val = u.teknik_detaylar[key];
          return val && values.includes(val);
        });
      });

      // Renk filter (from varyasyonlar)
      if (filterState.renkFiltreler.length > 0) {
        result = result.filter((u) => {
          const renkler = varyasyonMap[u.id]?.renk || [];
          return filterState.renkFiltreler.some((r) => renkler.includes(r));
        });
      }

      // Beden filter (from varyasyonlar)
      if (filterState.bedenFiltreler.length > 0) {
        result = result.filter((u) => {
          const bedenler = varyasyonMap[u.id]?.beden || [];
          return filterState.bedenFiltreler.some((b) => bedenler.includes(b));
        });
      }

      // Price range for varyasyonlu products (server-side only handles tek_fiyat)
      if (filterState.minFiyat) {
        const min = parseFloat(filterState.minFiyat);
        result = result.filter((u) => {
          if (u.fiyat_tipi === "varyasyonlu") {
            return (u.max_varyant_fiyat ?? 0) >= min;
          }
          return true; // already filtered server-side
        });
      }
      if (filterState.maxFiyat) {
        const max = parseFloat(filterState.maxFiyat);
        result = result.filter((u) => {
          if (u.fiyat_tipi === "varyasyonlu") {
            return (u.min_varyant_fiyat ?? Infinity) <= max;
          }
          return true;
        });
      }
    }

    // Sorting
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

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filterState, sortBy, selectedKategori, selectedGrupId, selectedTurId, activeFilter]);

  // Fetch companies
  const fetchFirmalar = useCallback(async () => {
    setFirmaLoading(true);
    const fs = firmaFilterState;

    // Step 1: Resolve junction table filters to firma IDs
    let junctionFirmaIds: string[] | null = null;
    if (fs) {
      const allJunctionIds = Object.values(fs.junctionFilters).flat();
      if (allJunctionIds.length > 0) {
        const { data: junctionData } = await supabase
          .from("firma_urun_hizmet_secimler")
          .select("firma_id, secenek_id")
          .in("secenek_id", allJunctionIds);

        if (junctionData) {
          let matchSet: Set<string> | null = null;
          for (const [, ids] of Object.entries(fs.junctionFilters)) {
            if (ids.length === 0) continue;
            const groupIds = new Set(junctionData.filter((d) => ids.includes(d.secenek_id)).map((d) => d.firma_id));
            if (matchSet === null) matchSet = groupIds;
            else matchSet = new Set([...matchSet].filter((id) => groupIds.has(id)));
          }
          if (matchSet !== null) junctionFirmaIds = [...matchSet];
        }
      }

      // Üretim/Satış filter
      const usTurIds = fs.uretimSatisTurIds;
      const usGrupIds = fs.uretimSatisGrupIds;
      const usKatIds = fs.uretimSatisKategoriIds;
      if (usTurIds.length > 0 || usGrupIds.length > 0 || usKatIds.length > 0) {
        let usQuery = supabase.from("firma_uretim_satis").select("firma_id");
        if (usTurIds.length > 0) usQuery = usQuery.in("tur_id", usTurIds);
        else if (usGrupIds.length > 0) usQuery = usQuery.in("grup_id", usGrupIds);
        else if (usKatIds.length > 0) usQuery = usQuery.in("kategori_id", usKatIds);
        const { data: usData } = await usQuery;
        if (usData) {
          const usFirmaIds = new Set(usData.map((d) => d.firma_id));
          if (junctionFirmaIds === null) junctionFirmaIds = [...usFirmaIds];
          else junctionFirmaIds = junctionFirmaIds.filter((id) => usFirmaIds.has(id));
        }
      }
    }

    // Step 2: Build main query
    let query = supabase.from("firmalar")
      .select("id, firma_unvani, logo_url, firma_tipi_id, firma_turu_id, firma_olcegi_id, kurulus_il_id, kurulus_ilce_id, web_sitesi, kurulus_tarihi, moq, user_id")
      .order("firma_unvani").limit(100);

    if (selectedFirmaTuru) query = query.eq("firma_turu_id", selectedFirmaTuru);
    if (activeFilter && activeTab === "firma") query = query.ilike("firma_unvani", `%${activeFilter.name}%`);

    if (fs) {
      if (fs.firmaTipleri.length > 0) query = query.in("firma_tipi_id", fs.firmaTipleri);
      if (fs.firmaOlcekleri.length > 0) query = query.in("firma_olcegi_id", fs.firmaOlcekleri);
      if (fs.iller.length > 0) query = query.in("kurulus_il_id", fs.iller);
      if (fs.moq) query = query.gte("moq", parseInt(fs.moq));
    }

    if (junctionFirmaIds !== null) {
      if (junctionFirmaIds.length === 0) { setFirmalar([]); setFirmaLoading(false); return; }
      query = query.in("id", junctionFirmaIds);
    }

    const { data } = await query;
    if (data) {
      // Resolve all IDs (secenek names)
      const ids = new Set<string>();
      data.forEach((f) => {
        if (f.firma_tipi_id) ids.add(f.firma_tipi_id);
        if (f.firma_olcegi_id) ids.add(f.firma_olcegi_id);
        if (f.kurulus_il_id) ids.add(f.kurulus_il_id);
        if (f.kurulus_ilce_id) ids.add(f.kurulus_ilce_id);
      });
      const allIds = [...ids];
      let newSecenekMap = { ...secenekMap };
      if (allIds.length > 0) {
        const { data: names } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", allIds);
        if (names) names.forEach((n) => { newSecenekMap[n.id] = n.name; });
      }

      // Firma tipleri names
      const tipIds = [...new Set(data.map((f) => f.firma_tipi_id))];
      if (tipIds.length > 0) {
        const { data: tipNames } = await supabase.from("firma_tipleri").select("id, name").in("id", tipIds);
        if (tipNames) tipNames.forEach((n) => { newSecenekMap[n.id] = n.name; });
      }

      // Firma türü names map
      const turNameMap: Record<string, string> = {};
      firmaTurleri.forEach((t) => { turNameMap[t.id] = t.name; });

      // Fetch faaliyet alanı for listed firms
      const firmaIds = data.map((f) => f.id);
      const faaliyetMap: Record<string, string> = {};
      if (firmaIds.length > 0) {
        const { data: faaliyetData } = await supabase
          .from("firma_urun_hizmet_secimler")
          .select("firma_id, secenek_id")
          .in("firma_id", firmaIds);
        if (faaliyetData && faaliyetData.length > 0) {
          const faaliyetSecIds = [...new Set(faaliyetData.map((f) => f.secenek_id))];
          const { data: faaliyetNames } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", faaliyetSecIds);
          const fNameMap: Record<string, string> = {};
          if (faaliyetNames) faaliyetNames.forEach((n) => { fNameMap[n.id] = n.name; });
          // Take first faaliyet per firma
          const seen = new Set<string>();
          faaliyetData.forEach((f) => {
            if (!seen.has(f.firma_id) && fNameMap[f.secenek_id]) {
              faaliyetMap[f.firma_id] = fNameMap[f.secenek_id];
              seen.add(f.firma_id);
            }
          });
        }
      }

      // Fetch firma favorites
      let favSet = new Set<string>();
      if (currentUserId) {
        const { data: favs } = await supabase.from("firma_favoriler").select("firma_id").eq("user_id", currentUserId);
        if (favs) favs.forEach((f) => favSet.add(f.firma_id));
      }
      setFirmaFavSet(favSet);

      setSecenekMap(newSecenekMap);

      // Enrich firmalar
      const enriched: FirmaWithExtra[] = data.map((f) => ({
        ...f,
        firma_turu_name: turNameMap[f.firma_turu_id] || "",
        firma_tipi_name: newSecenekMap[f.firma_tipi_id] || "",
        faaliyet_alani: faaliyetMap[f.id] || "",
        is_favorited: favSet.has(f.id),
      }));

      setFirmalar(enriched);
    }
    setFirmaLoading(false);
  }, [selectedFirmaTuru, firmaFilterState, activeFilter, activeTab, firmaTurleri, currentUserId]);

  useEffect(() => {
    if (activeTab === "urunler") fetchUrunler();
  }, [activeTab, fetchUrunler]);

  useEffect(() => {
    if (activeTab === "firma") fetchFirmalar();
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
        const { data: secenekler } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name, parent_id")
          .eq("kategori_id", KATEGORI_ID)
          .ilike("name", `%${searchTerm}%`)
          .limit(10);
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
            // Hide categories that should not appear in search
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
        const { data: urunResults } = await supabase
          .from("urunler").select("id, baslik").eq("durum", "aktif").ilike("baslik", `%${searchTerm}%`).limit(5);
        if (urunResults) urunResults.forEach((u) => results.push({ id: u.id, name: u.baslik, type: "Ürün" }));
      } else {
        const { data: firmaResults } = await supabase
          .from("firmalar").select("id, firma_unvani").ilike("firma_unvani", `%${searchTerm}%`).limit(5);
        if (firmaResults) firmaResults.forEach((f) => results.push({ id: f.id, name: f.firma_unvani, type: "Firma" }));
        const { data: turMatches } = await supabase
          .from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KATEGORI_ID).ilike("name", `%${searchTerm}%`).limit(5);
        if (turMatches) turMatches.forEach((t) => results.push({ id: t.id, name: t.name, type: "Tür" }));
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
    // Determine category from result for filter sidebar
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

  const handleFirmaTuruChange = (value: string) => {
    setSelectedFirmaTuru(value);
    const turName = firmaTurleri.find((t) => t.id === value)?.name || "";
    setSelectedFirmaTuruName(turName);
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

  const toggleFirmaFavorite = async (firmaId: string, isFav: boolean) => {
    if (!currentUserId) return;
    if (isFav) {
      await supabase.from("firma_favoriler").delete().eq("user_id", currentUserId).eq("firma_id", firmaId);
    } else {
      await supabase.from("firma_favoriler").insert({ user_id: currentUserId, firma_id: firmaId });
    }
    setFirmaFavSet((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(firmaId); else next.add(firmaId);
      return next;
    });
    setFirmalar((prev) => prev.map((f) => f.id === firmaId ? { ...f, is_favorited: !isFav } : f));
  };

  const handleMessageFirma = async (firmaUserId: string) => {
    if (!currentUserId || firmaUserId === currentUserId) return;
    navigate("/mesajlar", { state: { targetUserId: firmaUserId } });
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
      {/* Header */}
      <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Search Header */}
        <div className="bg-primary rounded-xl p-6 pb-0">
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

          <div className="relative max-w-2xl mx-auto mb-6" ref={searchRef}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder={activeTab === "urunler" ? "Ürün ara..." : "Üretici / tedarikçi ara...."}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); if (!e.target.value) setActiveFilter(null); }}
                  onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                  className="pl-12 h-12 bg-background text-foreground border-0 text-base"
                />
              </div>
              {activeTab === "firma" && (
                <Select value={selectedFirmaTuru} onValueChange={handleFirmaTuruChange}>
                  <SelectTrigger className="w-[180px] h-12 bg-muted border-0">
                    <SelectValue placeholder="Firma Türü" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {firmaTurleri.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

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

          {activeTab === "urunler" && (
            <div className="bg-background rounded-t-xl -mx-6 px-6">
              <KategoriMegaMenu
                kategoriler={URUN_KATEGORILERI}
                selectedKategori={selectedKategori}
                onSelect={handleMegaMenuSelect}
              />
            </div>
          )}
          {activeTab === "firma" && <div className="h-4" />}
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
        {activeTab === "urunler" ? (
          isFiltered ? (
            /* Filtered view with sidebar */
            <div className="flex gap-6">
              {/* Filter sidebar */}
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

              {/* Product grid */}
              <div className="flex-1 space-y-4">
                {/* Toolbar: count + sorting */}
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => p - 1)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          let page: number;
                          if (totalPages <= 7) {
                            page = i + 1;
                          } else if (currentPage <= 4) {
                            page = i + 1;
                          } else if (currentPage >= totalPages - 3) {
                            page = totalPages - 6 + i;
                          } else {
                            page = currentPage - 3 + i;
                          }
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-9"
                            >
                              {page}
                            </Button>
                          );
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => p + 1)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Default popular view - no filters */
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
          )
        ) : (
          /* Firma Tab */
          <div className="flex gap-6">
            <FirmaFiltreler
              firmaTuruId={selectedFirmaTuru}
              firmaTuruName={selectedFirmaTuruName}
              onFilterChange={setFirmaFilterState}
            />

            <div className="flex-1 space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{firmalar.length}</span> firma bulundu
              </p>
              {firmaLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : firmalar.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Henüz kayıtlı firma bulunmamaktadır.
                </div>
              ) : (
                <div className="space-y-3">
                {firmalar.map((firma) => (
                  <Card
                    key={firma.id}
                    className="p-5 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/firma/${firma.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div className="w-[72px] h-[72px] rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                        {firma.logo_url ? (
                          <img src={firma.logo_url} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-xl font-bold text-muted-foreground">{firma.firma_unvani.charAt(0)}</span>
                        )}
                      </div>

                      {/* Middle: title + badges on top, 4 icons in 2x2 grid below */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Title + Badge */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-foreground text-lg leading-tight">{firma.firma_unvani}</h3>
                          {(firma.firma_turu_name || firma.firma_tipi_name) && (
                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                              {[firma.firma_turu_name, firma.firma_tipi_name].filter(Boolean).join(" / ")}
                            </Badge>
                          )}
                        </div>

                        {/* Row 2-3: 4 icons in 2-column grid */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2.5">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                            <span>
                              {firma.kurulus_il_id && secenekMap[firma.kurulus_il_id]
                                ? `${secenekMap[firma.kurulus_il_id]}${firma.kurulus_ilce_id && secenekMap[firma.kurulus_ilce_id] ? `, ${secenekMap[firma.kurulus_ilce_id]}` : ""}`
                                : "Bilinmiyor"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                            <span>{(firma.firma_olcegi_id && secenekMap[firma.firma_olcegi_id]) || "Bilinmiyor"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                            <span>{firma.faaliyet_alani || "Bilinmiyor"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                            <span>{firma.kurulus_tarihi || "Bilinmiyor"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Bookmark + Mesaj + Profili Gör */}
                      <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleFirmaFavorite(firma.id, !!firma.is_favorited)}
                          className="p-1"
                        >
                          <Bookmark className={`w-6 h-6 ${firma.is_favorited ? "fill-primary text-primary" : "text-muted-foreground/50"}`} />
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleMessageFirma(firma.user_id)}
                        >
                          <MessageSquare className="w-4 h-4" /> Mesaj
                        </Button>
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => navigate(`/firma/${firma.id}`)}
                        >
                          <ArrowRight className="w-3 h-3" /> Profili Gör
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
