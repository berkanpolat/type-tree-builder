import { useEffect, useState, useRef, useCallback } from "react";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import FirmaAvatar from "@/components/FirmaAvatar";
import { useSessionState } from "@/hooks/use-session-state";
import HeroSearchSection from "@/components/anasayfa/HeroSearchSection";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sortFirmaTurleri } from "@/lib/sort-utils";
import { useBanner } from "@/hooks/use-banner";
import PazarHeader from "@/components/PazarHeader";
import PublicHeader from "@/components/PublicHeader";
import FirmaFiltreler, { type FirmaFilterState } from "@/components/anasayfa/FirmaFiltreler";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import VerifiedBadge from "@/components/VerifiedBadge";
import { usePackageQuota, canPerformAction } from "@/hooks/use-package-quota";
import UpgradeDialog from "@/components/UpgradeDialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  MapPin,
  Users,
  Globe,
  CalendarDays,
  MessageSquare,
  ArrowRight,
  Bookmark,
  Factory,
  ExternalLink,
  Package,
  Building2,
} from "lucide-react";

const PER_PAGE = 20;
const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1"; // Ana Ürün Kategorileri

interface SearchResult {
  id: string;
  name: string;
  type: "Firma" | "Tür" | "Kategori" | "Grup" | "Ürün Türü";
}

interface UrunTaxNode {
  id: string;
  name: string;
  parent_id: string | null;
}

interface UretimSatisItem {
  tip: string; // "uretim" | "satis"
  turName: string;
}

interface FirmaWithExtra {
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
  belge_onayli: boolean;
  slug: string | null;
  firma_hakkinda: string | null;
  uretim_satis_rolu: string | null;
  firma_turu_name?: string;
  firma_tipi_name?: string;
  faaliyet_alani?: string;
  is_favorited?: boolean;
  uretimSatisItems?: UretimSatisItem[];
  profile_score?: number;
}

export default function TekRehber() {
  useSeoMeta({ slug: "/firmalar", fallbackTitle: "TekRehber | Tekstil Firma Rehberi | Tekstil A.Ş." });
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [firmaLogoUrl, setFirmaLogoUrl] = useState<string | null>(null);
  const rehberSidebarBanner = useBanner("tekrehber-sidebar");
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: firma } = await supabase.from("firmalar").select("firma_unvani, logo_url").eq("user_id", user.id).single();
        if (firma) { setFirmaUnvani(firma.firma_unvani); setFirmaLogoUrl(firma.logo_url); }
      }
      setAuthLoading(false);
    };
    check();
  }, []);

  const [searchTerm, setSearchTerm] = useSessionState("searchTerm", "");
  const [appliedSearchTerm, setAppliedSearchTerm] = useSessionState("appliedSearchTerm", "");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [firmalar, setFirmalar] = useState<FirmaWithExtra[]>([]);
  const [firmaLoading, setFirmaLoading] = useState(false);
  const [firmaTurleri, setFirmaTurleri] = useState<{ id: string; name: string }[]>([]);
  const [selectedFirmaTuru, setSelectedFirmaTuru] = useSessionState("selectedFirmaTuru", "");
  const [selectedFirmaTuruName, setSelectedFirmaTuruName] = useSessionState("selectedFirmaTuruName", "");
  const [firmaFilterState, setFirmaFilterState] = useSessionState<FirmaFilterState | null>("firmaFilterState", null);
  const [firmaFavSet, setFirmaFavSet] = useState<Set<string>>(new Set());

  const [secenekMap, setSecenekMap] = useState<Record<string, string>>({});
  const packageInfo = usePackageQuota();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  

  // Product taxonomy for search
  const [urunTaxNodes, setUrunTaxNodes] = useState<UrunTaxNode[]>([]);
  const [uretimSatisFilter, setUretimSatisFilter] = useState<{ column: string; ids: string[] } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [selectedFirmaTuru, firmaFilterState, appliedSearchTerm, uretimSatisFilter]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Read location.state for pre-applied filters (from landing popüler aramalar)
  const locationState = location.state as { firmaTurId?: string; firmaTipId?: string; firmaTurName?: string } | null;
  const hasIncomingState = !!(locationState?.firmaTurId);

  // Fetch firma türleri
  useEffect(() => {
    supabase.from("firma_turleri").select("id, name").order("name").then(({ data }) => {
      if (data) {
        const sorted = sortFirmaTurleri(data);
        setFirmaTurleri(sorted);
        // Only set default if no incoming state
        if (!hasIncomingState) {
          const tedarikci = sorted.find((t) => t.name.toLowerCase().includes("tedarikçi"));
          if (tedarikci) { setSelectedFirmaTuru(tedarikci.id); setSelectedFirmaTuruName(tedarikci.name); }
          else if (sorted.length > 0) { setSelectedFirmaTuru(sorted[0].id); setSelectedFirmaTuruName(sorted[0].name); }
        }
      }
    });
  }, []);

  // Apply incoming state filters
  useEffect(() => {
    if (locationState?.firmaTurId) {
      setSelectedFirmaTuru(locationState.firmaTurId);
      if (locationState.firmaTurName) setSelectedFirmaTuruName(locationState.firmaTurName);
      if (locationState.firmaTipId) {
        setFirmaFilterState((prev: FirmaFilterState | null) => ({
          ...(prev || { firmaOlcekleri: [], iller: [], moq: "", junctionFilters: {}, uretimSatisTurIds: [], uretimSatisGrupIds: [], uretimSatisKategoriIds: [] }),
          firmaTipleri: [locationState.firmaTipId!],
        }));
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    supabase.from("firma_bilgi_secenekleri")
      .select("id, name, parent_id")
      .eq("kategori_id", KATEGORI_ID)
      .order("name")
      .then(({ data }) => setUrunTaxNodes(data || []));
  }, []);

  // Fetch companies with pagination
  const fetchFirmalar = useCallback(async () => {
    setFirmaLoading(true);
    const fs = firmaFilterState;

    // Pre-filter junction IDs
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

      const usTurIds = fs.uretimSatisTurIds || [];
      const usGrupIds = fs.uretimSatisGrupIds || [];
      const usKatIds = fs.uretimSatisKategoriIds || [];
      if (usTurIds.length > 0 || usGrupIds.length > 0 || usKatIds.length > 0) {
        // Build OR filter: most specific level takes priority
        // If türler selected → filter by tür; else if gruplar → filter by grup; else kategori
        const filterColumn = usTurIds.length > 0 ? "tur_id" : usGrupIds.length > 0 ? "grup_id" : "kategori_id";
        const filterValues = usTurIds.length > 0 ? usTurIds : usGrupIds.length > 0 ? usGrupIds : usKatIds;
        
        console.log("[FirmaFilter] Üretim/Satış filter:", { filterColumn, filterValues, usTurIds, usGrupIds, usKatIds });
        
        const { data: usData, error: usError } = await supabase
          .from("firma_uretim_satis")
          .select("firma_id")
          .in(filterColumn, filterValues);
        
        if (usError) {
          console.error("[FirmaFilter] Üretim/Satış query error:", usError);
        }
        
        if (usData) {
          const usFirmaIds = new Set(usData.map((d) => d.firma_id));
          console.log("[FirmaFilter] Üretim/Satış matched firma count:", usFirmaIds.size, [...usFirmaIds]);
          if (junctionFirmaIds === null) junctionFirmaIds = [...usFirmaIds];
          else junctionFirmaIds = junctionFirmaIds.filter((id) => usFirmaIds.has(id));
        }
      }
    }

    // Apply search-based uretimSatisFilter (from autocomplete selection)
    if (uretimSatisFilter) {
      let usQuery = supabase.from("firma_uretim_satis").select("firma_id");
      if (uretimSatisFilter.column === "kategori_id") usQuery = usQuery.in("kategori_id", uretimSatisFilter.ids);
      else if (uretimSatisFilter.column === "grup_id") usQuery = usQuery.in("grup_id", uretimSatisFilter.ids);
      else usQuery = usQuery.in("tur_id", uretimSatisFilter.ids);
      const { data: usSearchData } = await usQuery;
      if (usSearchData) {
        const usFirmaIds = new Set(usSearchData.map((d) => d.firma_id));
        if (junctionFirmaIds === null) junctionFirmaIds = [...usFirmaIds];
        else junctionFirmaIds = junctionFirmaIds.filter((id) => usFirmaIds.has(id));
      }
    }

    if (junctionFirmaIds !== null && junctionFirmaIds.length === 0) {
      setFirmalar([]);
      setTotalCount(0);
      setFirmaLoading(false);
      return;
    }

    // Call RPC for sorted + paginated firma IDs
    const rpcParams: Record<string, unknown> = {
      p_page: currentPage,
      p_per_page: PER_PAGE,
    };
    if (selectedFirmaTuru) rpcParams.p_firma_turu_id = selectedFirmaTuru;
    if (appliedSearchTerm) rpcParams.p_search = appliedSearchTerm;
    if (fs?.firmaTipleri?.length) rpcParams.p_firma_tipi_ids = fs.firmaTipleri;
    if (fs?.firmaOlcekleri?.length) rpcParams.p_firma_olcegi_ids = fs.firmaOlcekleri;
    if (fs?.iller?.length) rpcParams.p_il_ids = fs.iller;
    if (fs?.moq) rpcParams.p_moq = parseInt(fs.moq);
    if (junctionFirmaIds) rpcParams.p_firma_ids = junctionFirmaIds;

    const { data: sortedData } = await supabase.rpc("get_sorted_firmalar", rpcParams as any);

    if (!sortedData || !Array.isArray(sortedData) || sortedData.length === 0) {
      setFirmalar([]);
      setTotalCount(0);
      setFirmaLoading(false);
      return;
    }

    const sortedIds = (sortedData as any[]).map((s: any) => s.firma_id);
    const newTotalCount = Number((sortedData as any[])[0]?.total_count || 0);
    setTotalCount(newTotalCount);

    // Fetch actual firma data for the sorted IDs
    const { data } = await supabase.from("firmalar")
      .select("id, firma_unvani, logo_url, firma_tipi_id, firma_turu_id, firma_olcegi_id, kurulus_il_id, kurulus_ilce_id, web_sitesi, kurulus_tarihi, moq, user_id, belge_onayli, slug, firma_hakkinda, uretim_satis_rolu")
      .in("id", sortedIds);

    if (!data) {
      setFirmalar([]);
      setFirmaLoading(false);
      return;
    }

    // Collect all IDs needed for lookups
    const secenekIds = new Set<string>();
    data.forEach((f) => {
      if (f.firma_tipi_id) secenekIds.add(f.firma_tipi_id);
      if (f.firma_olcegi_id) secenekIds.add(f.firma_olcegi_id);
      if (f.kurulus_il_id) secenekIds.add(f.kurulus_il_id);
      if (f.kurulus_ilce_id) secenekIds.add(f.kurulus_ilce_id);
    });
    const tipIds = [...new Set(data.map((f) => f.firma_tipi_id))];
    const firmaIds = data.map((f) => f.id);

    // Run ALL lookup queries in parallel instead of sequentially
    const [secenekRes, tipRes, faaliyetRes, favsRes, uretimSatisRes] = await Promise.all([
      secenekIds.size > 0
        ? supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", [...secenekIds])
        : Promise.resolve({ data: null }),
      tipIds.length > 0
        ? supabase.from("firma_tipleri").select("id, name").in("id", tipIds)
        : Promise.resolve({ data: null }),
      firmaIds.length > 0
        ? supabase.from("firma_urun_hizmet_secimler").select("firma_id, secenek_id").in("firma_id", firmaIds)
        : Promise.resolve({ data: null }),
      currentUserId
        ? supabase.from("firma_favoriler").select("firma_id").eq("user_id", currentUserId)
        : Promise.resolve({ data: null }),
      firmaIds.length > 0
        ? supabase.from("firma_uretim_satis").select("firma_id, tip, tur_id").in("firma_id", firmaIds)
        : Promise.resolve({ data: null }),
    ]);

    let newSecenekMap = { ...secenekMap };
    (secenekRes.data || []).forEach((n: any) => { newSecenekMap[n.id] = n.name; });
    (tipRes.data || []).forEach((n: any) => { newSecenekMap[n.id] = n.name; });

    const turNameMap: Record<string, string> = {};
    firmaTurleri.forEach((t) => { turNameMap[t.id] = t.name; });

    // Build faaliyet map - need secondary lookup for secenek names
    const faaliyetMap: Record<string, string> = {};
    const faaliyetData = faaliyetRes.data || [];
    if (faaliyetData.length > 0) {
      const faaliyetSecIds = [...new Set(faaliyetData.map((f: any) => f.secenek_id))];
      // Check if we already have names in secenekMap, only fetch missing ones
      const missingIds = faaliyetSecIds.filter((id) => !newSecenekMap[id as string]) as string[];
      if (missingIds.length > 0) {
        const { data: faaliyetNames } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", missingIds);
        if (faaliyetNames) faaliyetNames.forEach((n) => { newSecenekMap[n.id] = n.name; });
      }
      const seen = new Set<string>();
      faaliyetData.forEach((f: any) => {
        if (!seen.has(f.firma_id) && newSecenekMap[f.secenek_id]) {
          faaliyetMap[f.firma_id] = newSecenekMap[f.secenek_id];
          seen.add(f.firma_id);
        }
      });
    }

    // Build üretim/satış map per firma
    const uretimSatisMap: Record<string, UretimSatisItem[]> = {};
    const usData2 = uretimSatisRes.data || [];
    if (usData2.length > 0) {
      const usTurIds2 = [...new Set(usData2.map((d: any) => d.tur_id))];
      const missingUsTurIds = usTurIds2.filter((id) => !newSecenekMap[id as string]) as string[];
      if (missingUsTurIds.length > 0) {
        const { data: usTurNames } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", missingUsTurIds);
        if (usTurNames) usTurNames.forEach((n) => { newSecenekMap[n.id] = n.name; });
      }
      usData2.forEach((d: any) => {
        if (!uretimSatisMap[d.firma_id]) uretimSatisMap[d.firma_id] = [];
        const turName = newSecenekMap[d.tur_id];
        if (turName) {
          // Avoid duplicates
          const exists = uretimSatisMap[d.firma_id].some((i) => i.turName === turName && i.tip === d.tip);
          if (!exists) uretimSatisMap[d.firma_id].push({ tip: d.tip, turName });
        }
      });
    }

    let favSet = new Set<string>();
    (favsRes.data || []).forEach((f: any) => favSet.add(f.firma_id));
    setFirmaFavSet(favSet);
    setSecenekMap(newSecenekMap);

    // Build firma map and preserve RPC sort order
    const firmaMap = new Map<string, typeof data[0]>();
    data.forEach((f) => firmaMap.set(f.id, f));

    const enriched: FirmaWithExtra[] = sortedIds
      .map((id) => firmaMap.get(id))
      .filter(Boolean)
      .map((f) => ({
        ...f!,
        firma_turu_name: turNameMap[f!.firma_turu_id] || "",
        firma_tipi_name: newSecenekMap[f!.firma_tipi_id] || "",
        faaliyet_alani: faaliyetMap[f!.id] || "",
        is_favorited: favSet.has(f!.id),
        uretimSatisItems: uretimSatisMap[f!.id] || [],
      }));

    setFirmalar(enriched);
    setFirmaLoading(false);
  }, [selectedFirmaTuru, firmaFilterState, appliedSearchTerm, uretimSatisFilter, firmaTurleri, currentUserId, currentPage]);

  useEffect(() => {
    if (selectedFirmaTuru) fetchFirmalar();
  }, [fetchFirmalar, selectedFirmaTuru]);

  // Trigger search on Enter or Ara button — search firma names
  const handleSearch = useCallback(async () => {
    const term = searchTerm.trim();
    if (!term) return;
    setShowDropdown(false);
    // If term matches a taxonomy item exactly, prefer dropdown selection
    // Otherwise treat as firma name search
    setUretimSatisFilter(null);
    setAppliedSearchTerm(term);
  }, [searchTerm]);

  // Autocomplete
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      const results: SearchResult[] = [];
      const lowerTerm = searchTerm.toLowerCase();

      // Firma türleri
      firmaTurleri.forEach((t) => {
        if (t.name.toLowerCase().includes(lowerTerm)) {
          results.push({ id: t.id, name: t.name, type: "Tür" });
        }
      });

      // Product taxonomy: categories, groups, types
      const rootNodes = urunTaxNodes.filter((n) => !n.parent_id);
      const childOf = (parentId: string) => urunTaxNodes.filter((n) => n.parent_id === parentId);

      rootNodes.forEach((kat) => {
        if (kat.name.toLowerCase().includes(lowerTerm)) {
          results.push({ id: kat.id, name: kat.name, type: "Kategori" });
        }
        childOf(kat.id).forEach((grup) => {
          if (grup.name.toLowerCase().includes(lowerTerm)) {
            results.push({ id: grup.id, name: `${grup.name}`, type: "Grup" });
          }
          childOf(grup.id).forEach((tur) => {
            if (tur.name.toLowerCase().includes(lowerTerm)) {
              results.push({ id: tur.id, name: `${tur.name}`, type: "Ürün Türü" });
            }
          });
        });
      });

      // Firma name search
      const { data } = await supabase
        .from("firmalar")
        .select("id, firma_unvani")
        .ilike("firma_unvani", `%${searchTerm}%`)
        .limit(6);
      if (data) data.forEach((f) => results.push({ id: f.id, name: f.firma_unvani, type: "Firma" }));

      // Limit and prioritize: taxonomy first, then firma
      setSearchResults(results.slice(0, 15));
      setShowDropdown(results.length > 0);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, firmaTurleri, urunTaxNodes]);

  const handleSearchResultClick = (result: SearchResult) => {
    setSearchTerm(result.name);
    setShowDropdown(false);
    setAppliedSearchTerm("");

    if (result.type === "Tür") {
      setSelectedFirmaTuru(result.id);
      setSelectedFirmaTuruName(result.name);
      setUretimSatisFilter(null);
    } else if (result.type === "Kategori") {
      setUretimSatisFilter({ column: "kategori_id", ids: [result.id] });
    } else if (result.type === "Grup") {
      setUretimSatisFilter({ column: "grup_id", ids: [result.id] });
    } else if (result.type === "Ürün Türü") {
      setUretimSatisFilter({ column: "tur_id", ids: [result.id] });
    } else if (result.type === "Firma") {
      // Navigate to firma
      setUretimSatisFilter(null);
      setAppliedSearchTerm(result.name);
    }
  };

  const handleFirmaTuruChange = (value: string) => {
    setSelectedFirmaTuru(value);
    const turName = firmaTurleri.find((t) => t.id === value)?.name || "";
    setSelectedFirmaTuruName(turName);
  };

  const toggleFirmaFavorite = async (firmaId: string, isFav: boolean) => {
    if (!currentUserId) { navigate("/giris-kayit"); return; }
    if (isFav) {
      await supabase.from("firma_favoriler").delete().eq("user_id", currentUserId).eq("firma_id", firmaId);
      toast({ title: "Favorilerden çıkarıldı" });
    } else {
      await supabase.from("firma_favoriler").insert({ user_id: currentUserId, firma_id: firmaId });
      toast({ title: "Favorilere eklendi" });
    }
    setFirmaFavSet((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(firmaId); else next.add(firmaId);
      return next;
    });
    setFirmalar((prev) => prev.map((f) => f.id === firmaId ? { ...f, is_favorited: !isFav } : f));
  };

  const handleMessageFirma = async (firmaUserId: string) => {
    if (!currentUserId) { navigate("/giris-kayit"); return; }
    if (firmaUserId === currentUserId) return;
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${firmaUserId}),and(user1_id.eq.${firmaUserId},user2_id.eq.${currentUserId})`)
      .maybeSingle();
    if (!existingConv) {
      const check = canPerformAction(packageInfo.limits, packageInfo.usage, "mesaj", { paketAd: packageInfo.paketAd });
      if (!check.allowed) {
        setUpgradeMessage(check.message || "Mesaj gönderme hakkınız dolmuştur.");
        setUpgradeOpen(true);
        return;
      }
    }
    const { data: convId } = await supabase.rpc("get_or_create_conversation", {
      p_user1: currentUserId,
      p_user2: firmaUserId,
    });
    navigate("/mesajlar", {
      state: {
        openConversationId: convId,
        otherUserId: firmaUserId,
      },
    });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 font-sans overflow-x-hidden">
      {currentUserId ? <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} /> : <PublicHeader />}

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <HeroSearchSection
          label="ÜRETİCİ / TEDARİKÇİ"
          placeholder="Üretici veya tedarikçi ara..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => { setSearchTerm(val); if (!val) { setAppliedSearchTerm(""); setUretimSatisFilter(null); } }}
          onSearch={handleSearch}
          searchResults={searchResults}
          showDropdown={showDropdown}
          onShowDropdown={setShowDropdown}
          onSearchResultClick={handleSearchResultClick}
          searchRef={searchRef as React.RefObject<HTMLDivElement>}
          firmaTuruOptions={firmaTurleri}
          selectedFirmaTuru={selectedFirmaTuru}
          onFirmaTuruChange={handleFirmaTuruChange}
        />

        {(appliedSearchTerm || uretimSatisFilter) && (
          <div className="flex items-center gap-2 flex-wrap">
            {appliedSearchTerm && (
              <Badge variant="secondary" className="gap-1 px-3 py-1.5">
                Arama: {appliedSearchTerm}
                <button onClick={() => { setAppliedSearchTerm(""); setSearchTerm(""); }} className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground">×</button>
              </Badge>
            )}
            {uretimSatisFilter && (
              <Badge variant="secondary" className="gap-1 px-3 py-1.5">
                {searchTerm || "Ürün Filtresi"}
                <button onClick={() => { setUretimSatisFilter(null); setSearchTerm(""); }} className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground">×</button>
              </Badge>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <FirmaFiltreler
            firmaTuruId={selectedFirmaTuru}
            firmaTuruName={selectedFirmaTuruName}
            onFilterChange={setFirmaFilterState}
            initialSelections={firmaFilterState?.firmaTipleri?.length ? { firmaTipi: firmaFilterState.firmaTipleri } : undefined}
          />

          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{totalCount}</span> firma bulundu
                {totalPages > 1 && (
                  <span className="ml-1">
                    (Sayfa {currentPage}/{totalPages})
                  </span>
                )}
              </p>
            </div>
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
                {firmalar.map((firma) => {
                  const firmaUrl = `/${firma.slug || firma.id}`;
                  const locationText = firma.kurulus_il_id && secenekMap[firma.kurulus_il_id]
                    ? `${secenekMap[firma.kurulus_il_id]}${firma.kurulus_ilce_id && secenekMap[firma.kurulus_ilce_id] ? `, ${secenekMap[firma.kurulus_ilce_id]}` : ""}`
                    : null;
                  const scaleText = (firma.firma_olcegi_id && secenekMap[firma.firma_olcegi_id]) || null;

                  // JSON-LD structured data for each firm
                  const jsonLd = {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": firma.firma_unvani,
                    ...(firma.logo_url ? { "logo": firma.logo_url } : {}),
                    "url": `https://tekstilas.com${firmaUrl}`,
                    ...(locationText ? {
                      "address": {
                        "@type": "PostalAddress",
                        "addressLocality": locationText,
                        "addressCountry": "TR",
                      }
                    } : {}),
                    ...(firma.web_sitesi ? { "sameAs": [firma.web_sitesi] } : {}),
                    ...(firma.kurulus_tarihi ? { "foundingDate": firma.kurulus_tarihi } : {}),
                  };

                  {
                    // ─── V3: 3-COLUMN CARD DESIGN ───
                    const descriptionExcerptV3 = firma.firma_hakkinda
                      ? firma.firma_hakkinda.length > 200
                        ? firma.firma_hakkinda.slice(0, 200) + "…"
                        : firma.firma_hakkinda
                      : null;

                    const uretimItems = (firma.uretimSatisItems || []).filter((i) => i.tip === "uretim");
                    const satisItems = (firma.uretimSatisItems || []).filter((i) => i.tip === "satis");

                    return (
                      <article
                        key={firma.id}
                        className="group rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-200 overflow-hidden"
                        itemScope
                        itemType="https://schema.org/Organization"
                      >
                        <script
                          type="application/ld+json"
                          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                        />

                        {/* Header: Logo + Name + Badges */}
                        <div className="flex items-center gap-3 px-4 pt-4 pb-3 sm:px-5">
                          <div className="relative shrink-0">
                            {firma.logo_url ? (
                              <img
                                src={firma.logo_url}
                                alt={`${firma.firma_unvani} logosu`}
                                title={firma.firma_unvani}
                                loading="lazy"
                                width={56}
                                height={56}
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-border object-contain bg-muted p-1"
                                itemProp="logo"
                              />
                            ) : (
                              <FirmaAvatar firmaUnvani={firma.firma_unvani} logoUrl={null} size="lg" className="w-12 h-12 sm:w-14 sm:h-14 border border-border" />
                            )}
                            {firma.belge_onayli && (
                              <div className="absolute -bottom-1 -right-1">
                                <VerifiedBadge />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="font-bold text-foreground text-base sm:text-lg leading-tight truncate" itemProp="name">
                              <Link
                                to={firmaUrl}
                                title={`${firma.firma_unvani} - Firma Profili`}
                                aria-label={`${firma.firma_unvani} firma profilini görüntüle`}
                                className="hover:text-primary transition-colors"
                              >
                                {firma.firma_unvani}
                              </Link>
                            </h2>
                            {(firma.firma_turu_name || firma.firma_tipi_name) && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                                  {[firma.firma_turu_name, firma.firma_tipi_name].filter(Boolean).join(" / ")}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3-Column Body (desktop) / stacked (mobile) */}
                        <div className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr] gap-0 border-t border-border/50">
                          {/* LEFT: Info fields */}
                          <div className="px-4 py-3 sm:px-5 sm:border-r border-border/50 space-y-2">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground" itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/60" aria-hidden="true" />
                              <span className="truncate" itemProp="addressLocality">{locationText || "Belirtilmemiş"}</span>
                            </div>
                            {scaleText && (
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <Users className="w-3.5 h-3.5 shrink-0 text-primary/60" aria-hidden="true" />
                                <span className="truncate">{scaleText}</span>
                              </div>
                            )}
                            {firma.kurulus_tarihi && (
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <CalendarDays className="w-3.5 h-3.5 shrink-0 text-primary/60" aria-hidden="true" />
                                <span>Kuruluş: {firma.kurulus_tarihi}</span>
                              </div>
                            )}
                            {firma.web_sitesi && (
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-primary/60" aria-hidden="true" />
                                <a
                                  href={firma.web_sitesi.startsWith("http") ? firma.web_sitesi : `https://${firma.web_sitesi}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="truncate hover:text-primary transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {firma.web_sitesi.replace(/^https?:\/\/(www\.)?/, "")}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* MIDDLE: Firma Hakkında */}
                          <div className="px-4 py-3 sm:px-5 sm:border-r border-border/50 border-t sm:border-t-0">
                            {firma.firma_hakkinda ? (
                              <>
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed" itemProp="description">
                                  {descriptionExcerptV3}
                                </p>
                                {/* Full description for SEO crawlers, visually hidden */}
                                {firma.firma_hakkinda.length > 200 && (
                                  <span className="sr-only" aria-hidden="true">{firma.firma_hakkinda}</span>
                                )}
                              </>
                            ) : (
                              <p className="text-xs sm:text-sm text-muted-foreground/50 italic">Firma hakkında bilgi eklenmemiş.</p>
                            )}
                          </div>

                          {/* RIGHT: Actions */}
                          <div className="px-4 py-3 sm:px-5 flex flex-row sm:flex-col items-center sm:items-stretch gap-2 border-t sm:border-t-0" onClick={(e) => e.stopPropagation()}>
                            <Link
                              to={firmaUrl}
                              className="flex-1 sm:flex-none"
                              title={`${firma.firma_unvani} firma profilini görüntüle`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button size="sm" className="w-full gap-1.5 h-8 text-xs">
                                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /> Firmayı İncele
                              </Button>
                            </Link>
                            <Button size="sm" variant="outline" className="flex-1 sm:flex-none gap-1.5 h-8 text-xs" onClick={() => handleMessageFirma(firma.user_id)} aria-label={`${firma.firma_unvani} firmasına mesaj gönder`}>
                              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Mesaj
                            </Button>
                            <Button
                              size="sm"
                              variant={firma.is_favorited ? "secondary" : "outline"}
                              className="flex-1 sm:flex-none gap-1.5 h-8 text-xs"
                              onClick={() => toggleFirmaFavorite(firma.id, !!firma.is_favorited)}
                              aria-label={firma.is_favorited ? "Favorilerden çıkar" : "Favorilere ekle"}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${firma.is_favorited ? "fill-primary text-primary" : ""}`} aria-hidden="true" />
                              {firma.is_favorited ? "Favorilerde" : "Favorilere Ekle"}
                            </Button>
                          </div>
                        </div>

                        {/* Bottom bar: Üretim/Satış ürünleri */}
                        {uretimItems.length > 0 && (
                          <div className="border-t border-border/50 px-4 py-2.5 sm:px-5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-wide flex items-center gap-1">
                              <Factory className="w-3 h-3" aria-hidden="true" /> Üretici:
                            </span>
                            {uretimItems.slice(0, 4).map((item, i) => (
                              <button
                                key={`u-${i}`}
                                type="button"
                                className="inline-flex items-center rounded-md border border-border bg-transparent px-1.5 py-0 text-[10px] font-normal text-foreground cursor-default"
                                tabIndex={-1}
                              >
                                {item.turName}
                              </button>
                            ))}
                            {uretimItems.length > 4 && (
                              <button
                                type="button"
                                className="inline-flex items-center rounded-md border border-border bg-transparent px-1.5 py-0 text-[10px] font-normal text-muted-foreground cursor-default"
                                tabIndex={-1}
                              >
                                +{uretimItems.length - 4}
                              </button>
                            )}
                            {/* All items in DOM for SEO, visually hidden beyond visible limit */}
                            {uretimItems.length > 4 && uretimItems.slice(4).map((item, i) => (
                              <button
                                key={`uh-${i}`}
                                type="button"
                                className="sr-only"
                                tabIndex={-1}
                                aria-hidden="true"
                              >
                                {item.turName}
                              </button>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  }
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>

                        {getPageNumbers().map((page, i) =>
                          page === "ellipsis" ? (
                            <PaginationItem key={`ellipsis-${i}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={page}>
                              <PaginationLink
                                isActive={currentPage === page}
                                onClick={() => handlePageChange(page)}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => handlePageChange(currentPage + 1)}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Full-width banner */}
        <div
          className="hidden md:block rounded-xl overflow-hidden cursor-pointer mx-auto"
          style={{
            maxWidth: 1200,
            height: 128,
            ...(rehberSidebarBanner.url ? {} : { background: "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }),
          }}
          onClick={() => rehberSidebarBanner.linkUrl && window.open(rehberSidebarBanner.linkUrl, "_blank")}
        >
          {rehberSidebarBanner.url ? (
            <img src={rehberSidebarBanner.url} alt="Reklam" className="w-full h-full object-contain" style={{ imageRendering: "auto" }} />
          ) : (
            <div className="flex items-center px-8 h-full">
              <div>
                <p className="text-primary-foreground text-lg font-bold">Tekstil A.Ş. ile Doğru Tedarikçiyi Bulun</p>
                <p className="text-primary-foreground/70 text-sm mt-1">Binlerce doğrulanmış üretici ve tedarikçi, tek platformda</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Mesaj Hakkınız Doldu"
        message={upgradeMessage}
      />
    </div>
  );
}
