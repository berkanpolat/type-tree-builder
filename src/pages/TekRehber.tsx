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
import VerifiedBadge from "@/components/VerifiedBadge";
import { usePackageQuota, canPerformAction } from "@/hooks/use-package-quota";
import UpgradeDialog from "@/components/UpgradeDialog";
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
  MapPin,
  Users,
  Globe,
  CalendarDays,
  MessageSquare,
  ArrowRight,
  Bookmark,
} from "lucide-react";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";

interface SearchResult {
  id: string;
  name: string;
  type: "Firma" | "Tür";
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

export default function TekRehber() {
  const navigate = useNavigate();
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

  // Firma state
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

  // Fetch companies
  const fetchFirmalar = useCallback(async () => {
    setFirmaLoading(true);
    const fs = firmaFilterState;

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

    let query = supabase.from("firmalar")
      .select("id, firma_unvani, logo_url, firma_tipi_id, firma_turu_id, firma_olcegi_id, kurulus_il_id, kurulus_ilce_id, web_sitesi, kurulus_tarihi, moq, user_id, belge_onayli")
      .order("firma_unvani").limit(100);

    if (selectedFirmaTuru) query = query.eq("firma_turu_id", selectedFirmaTuru);
    if (appliedSearchTerm) query = query.ilike("firma_unvani", `%${appliedSearchTerm}%`);

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

      const tipIds = [...new Set(data.map((f) => f.firma_tipi_id))];
      if (tipIds.length > 0) {
        const { data: tipNames } = await supabase.from("firma_tipleri").select("id, name").in("id", tipIds);
        if (tipNames) tipNames.forEach((n) => { newSecenekMap[n.id] = n.name; });
      }

      const turNameMap: Record<string, string> = {};
      firmaTurleri.forEach((t) => { turNameMap[t.id] = t.name; });

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
          const seen = new Set<string>();
          faaliyetData.forEach((f) => {
            if (!seen.has(f.firma_id) && fNameMap[f.secenek_id]) {
              faaliyetMap[f.firma_id] = fNameMap[f.secenek_id];
              seen.add(f.firma_id);
            }
          });
        }
      }

      let favSet = new Set<string>();
      if (currentUserId) {
        const { data: favs } = await supabase.from("firma_favoriler").select("firma_id").eq("user_id", currentUserId);
        if (favs) favs.forEach((f) => favSet.add(f.firma_id));
      }
      setFirmaFavSet(favSet);
      setSecenekMap(newSecenekMap);

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
  }, [selectedFirmaTuru, firmaFilterState, appliedSearchTerm, firmaTurleri, currentUserId]);

  useEffect(() => {
    if (currentUserId && selectedFirmaTuru) fetchFirmalar();
  }, [fetchFirmalar, currentUserId, selectedFirmaTuru]);

  // Trigger search on Enter or Ara button — detect firma türü match
  const handleSearch = useCallback(async () => {
    const term = searchTerm.trim();
    if (!term) return;
    setShowDropdown(false);

    // Check if term matches a firma türü
    const matchedTur = firmaTurleri.find((t) => t.name.toLowerCase().includes(term.toLowerCase()));
    if (matchedTur) {
      setSelectedFirmaTuru(matchedTur.id);
      setSelectedFirmaTuruName(matchedTur.name);
      setAppliedSearchTerm("");
      return;
    }

    setAppliedSearchTerm(term);
  }, [searchTerm, firmaTurleri]);

  // Lightweight autocomplete - firma names + firma türleri
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      const results: SearchResult[] = [];

      // Check firma türü matches
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
      // It's a firma türü — select it
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
    // Check if conversation already exists
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
    // Create or get conversation via RPC
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 font-sans">
      <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Search Header */}
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

        {/* Active search badge */}
        {appliedSearchTerm && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1 px-3 py-1.5">
              Arama: {appliedSearchTerm}
              <button onClick={() => { setAppliedSearchTerm(""); setSearchTerm(""); }} className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground">×</button>
            </Badge>
          </div>
        )}

        {/* Firma Content */}
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
                      <div className="w-[72px] h-[72px] rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                        {firma.logo_url ? (
                          <img src={firma.logo_url} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-xl font-bold text-muted-foreground">{firma.firma_unvani.charAt(0)}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-lg leading-tight flex items-center gap-1.5">
                            {firma.firma_unvani}
                            {(firma as any).belge_onayli && <VerifiedBadge />}
                          </h3>
                          {(firma.firma_turu_name || firma.firma_tipi_name) && (
                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                              {[firma.firma_turu_name, firma.firma_tipi_name].filter(Boolean).join(" / ")}
                            </Badge>
                          )}
                        </div>

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

                      <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleFirmaFavorite(firma.id, !!firma.is_favorited)} className="p-1">
                          <Bookmark className={`w-6 h-6 ${firma.is_favorited ? "fill-primary text-primary" : "text-muted-foreground/50"}`} />
                        </button>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => handleMessageFirma(firma.user_id)}>
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

        {/* Full-width banner */}
        <div
          className="rounded-xl overflow-hidden cursor-pointer mx-auto"
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
