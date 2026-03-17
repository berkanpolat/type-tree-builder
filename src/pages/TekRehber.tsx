import { useEffect, useState, useRef, useCallback } from "react";
import { useSessionState } from "@/hooks/use-session-state";
import HeroSearchSection from "@/components/anasayfa/HeroSearchSection";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sortFirmaTurleri } from "@/lib/sort-utils";
import { useBanner } from "@/hooks/use-banner";
import PazarHeader from "@/components/PazarHeader";
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
} from "lucide-react";

const PER_PAGE = 20;

interface SearchResult {
  id: string;
  name: string;
  type: "Firma" | "Tür";
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
  firma_turu_name?: string;
  firma_tipi_name?: string;
  faaliyet_alani?: string;
  is_favorited?: boolean;
}

export default function TekRehber() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [firmaLogoUrl, setFirmaLogoUrl] = useState<string | null>(null);
  const rehberSidebarBanner = useBanner("tekrehber-sidebar");
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [selectedFirmaTuru, firmaFilterState, appliedSearchTerm]);

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
        const sorted = sortFirmaTurleri(data);
        setFirmaTurleri(sorted);
        const tedarikci = sorted.find((t) => t.name.toLowerCase().includes("tedarikçi"));
        if (tedarikci) { setSelectedFirmaTuru(tedarikci.id); setSelectedFirmaTuruName(tedarikci.name); }
        else if (sorted.length > 0) { setSelectedFirmaTuru(sorted[0].id); setSelectedFirmaTuruName(sorted[0].name); }
      }
    });
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
      .select("id, firma_unvani, logo_url, firma_tipi_id, firma_turu_id, firma_olcegi_id, kurulus_il_id, kurulus_ilce_id, web_sitesi, kurulus_tarihi, moq, user_id, belge_onayli, slug")
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
    const [secenekRes, tipRes, faaliyetRes, favsRes] = await Promise.all([
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
      }));

    setFirmalar(enriched);
    setFirmaLoading(false);
  }, [selectedFirmaTuru, firmaFilterState, appliedSearchTerm, firmaTurleri, currentUserId, currentPage]);

  useEffect(() => {
    if (currentUserId && selectedFirmaTuru) fetchFirmalar();
  }, [fetchFirmalar, currentUserId, selectedFirmaTuru]);

  // Trigger search on Enter or Ara button
  const handleSearch = useCallback(async () => {
    const term = searchTerm.trim();
    if (!term) return;
    setShowDropdown(false);
    const matchedTur = firmaTurleri.find((t) => t.name.toLowerCase().includes(term.toLowerCase()));
    if (matchedTur) {
      setSelectedFirmaTuru(matchedTur.id);
      setSelectedFirmaTuruName(matchedTur.name);
      setAppliedSearchTerm("");
      return;
    }
    setAppliedSearchTerm(term);
  }, [searchTerm, firmaTurleri]);

  // Autocomplete
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      const results: SearchResult[] = [];
      firmaTurleri.forEach((t) => {
        if (t.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({ id: t.id, name: t.name, type: "Tür" });
        }
      });
      const { data } = await supabase
        .from("firmalar")
        .select("id, firma_unvani")
        .ilike("firma_unvani", `%${searchTerm}%`)
        .limit(6);
      if (data) data.forEach((f) => results.push({ id: f.id, name: f.firma_unvani, type: "Firma" }));
      setSearchResults(results);
      setShowDropdown(results.length > 0);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, firmaTurleri]);

  const handleSearchResultClick = (result: SearchResult) => {
    setSearchTerm(result.name);
    setShowDropdown(false);
    if (result.type === "Tür") {
      setSelectedFirmaTuru(result.id);
      setSelectedFirmaTuruName(result.name);
      setAppliedSearchTerm("");
    } else {
      setAppliedSearchTerm(result.name);
    }
  };

  const handleFirmaTuruChange = (value: string) => {
    setSelectedFirmaTuru(value);
    const turName = firmaTurleri.find((t) => t.id === value)?.name || "";
    setSelectedFirmaTuruName(turName);
  };

  const toggleFirmaFavorite = async (firmaId: string, isFav: boolean) => {
    if (!currentUserId) return;
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
    if (!currentUserId || firmaUserId === currentUserId) return;
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${firmaUserId}),and(user1_id.eq.${firmaUserId},user2_id.eq.${currentUserId})`)
      .maybeSingle();
    if (!existingConv) {
      const check = canPerformAction(packageInfo.limits, packageInfo.usage, "mesaj");
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
      <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <HeroSearchSection
          label="ÜRETİCİ / TEDARİKÇİ"
          placeholder="Üretici veya tedarikçi ara..."
          searchTerm={searchTerm}
          onSearchTermChange={(val) => { setSearchTerm(val); if (!val) setAppliedSearchTerm(""); }}
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

        {appliedSearchTerm && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1 px-3 py-1.5">
              Arama: {appliedSearchTerm}
              <button onClick={() => { setAppliedSearchTerm(""); setSearchTerm(""); }} className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground">×</button>
            </Badge>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <FirmaFiltreler
            firmaTuruId={selectedFirmaTuru}
            firmaTuruName={selectedFirmaTuruName}
            onFilterChange={setFirmaFilterState}
          />

          <div className="flex-1 min-w-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totalCount}</span> firma bulundu
              {totalPages > 1 && (
                <span className="ml-1">
                  (Sayfa {currentPage}/{totalPages})
                </span>
              )}
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
                    className="p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/${firma.slug || firma.id}`)}
                  >
                    <div className="flex items-start gap-3 sm:gap-4 overflow-hidden">
                      <div className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                        {firma.logo_url ? (
                          <img src={firma.logo_url} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-lg sm:text-xl font-bold text-muted-foreground">{firma.firma_unvani.charAt(0)}</span>
                        )}
                      </div>

                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-base sm:text-lg leading-tight flex items-center gap-1.5 truncate">
                            {firma.firma_unvani}
                            {firma.belge_onayli && <VerifiedBadge />}
                          </h3>
                          {(firma.firma_turu_name || firma.firma_tipi_name) && (
                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] sm:text-xs font-medium hidden sm:inline-flex">
                              {[firma.firma_turu_name, firma.firma_tipi_name].filter(Boolean).join(" / ")}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mt-2">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">
                              {firma.kurulus_il_id && secenekMap[firma.kurulus_il_id]
                                ? `${secenekMap[firma.kurulus_il_id]}${firma.kurulus_ilce_id && secenekMap[firma.kurulus_ilce_id] ? `, ${secenekMap[firma.kurulus_ilce_id]}` : ""}`
                                : "Bilinmiyor"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Users className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">{(firma.firma_olcegi_id && secenekMap[firma.firma_olcegi_id]) || "Bilinmiyor"}</span>
                          </div>
                          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">{firma.faaliyet_alani || "Bilinmiyor"}</span>
                          </div>
                          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                            <span>{firma.kurulus_tarihi || "Bilinmiyor"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 sm:hidden" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs flex-1" onClick={() => handleMessageFirma(firma.user_id)}>
                            <MessageSquare className="w-3.5 h-3.5" /> Mesaj
                          </Button>
                          <button onClick={() => toggleFirmaFavorite(firma.id, !!firma.is_favorited)} className="p-1.5">
                            <Bookmark className={`w-5 h-5 ${firma.is_favorited ? "fill-primary text-primary" : "text-muted-foreground/50"}`} />
                          </button>
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleFirmaFavorite(firma.id, !!firma.is_favorited)} className="p-1">
                          <Bookmark className={`w-6 h-6 ${firma.is_favorited ? "fill-primary text-primary" : "text-muted-foreground/50"}`} />
                        </button>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => handleMessageFirma(firma.user_id)}>
                          <MessageSquare className="w-4 h-4" /> Mesaj
                        </Button>
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => navigate(`/${firma.slug || firma.id}`)}
                        >
                          <ArrowRight className="w-3 h-3" /> Profili Gör
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}

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
