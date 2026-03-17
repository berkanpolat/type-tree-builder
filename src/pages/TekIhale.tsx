import { useEffect, useState, useMemo, useCallback } from "react";
import ihaleDefaultCover from "@/assets/ihale-default-cover.png";
import { useSessionState } from "@/hooks/use-session-state";
import { useBanner } from "@/hooks/use-banner";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PazarHeader from "@/components/PazarHeader";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Search,
  ImageIcon,
  Clock,
  Building2,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Target,
  Gavel,
  CreditCard,
  CalendarClock,
  Layers,
  SlidersHorizontal,
} from "lucide-react";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";
const HIZMET_KATEGORI_ID = "d6b5e6a0-bbbb-4444-aaaa-111111111111"; // placeholder – will be fetched
const ITEMS_PER_PAGE = 10;

const IHALE_TURU_OPTIONS = [
  { value: "urun_alis", label: "Ürün Alış İhalesi" },
  { value: "urun_satis", label: "Ürün Satış İhalesi" },
  { value: "hizmet_alim", label: "Hizmet İhalesi" },
];

const TEKLIF_USULU_OPTIONS = [
  { value: "acik_arttirma", label: "Açık Artırma" },
  { value: "acik_indirme", label: "Açık İndirme" },
  { value: "kapali_teklif", label: "Kapalı Teklif" },
];

const ODEME_SECENEKLERI_OPTIONS = [
  "Peşin Ödeme (Nakit / Havale / EFT)",
  "Kredi Kartı",
  "Vadeli Çek / Senet",
  "Kripto Para",
];

const ODEME_VADESI_OPTIONS = [
  "Vadesiz",
  "0-30 gün",
  "30-60 gün",
  "60-90 gün",
  "90+gün",
];

interface IhaleRow {
  id: string;
  ihale_no: string;
  baslik: string;
  foto_url: string | null;
  ihale_turu: string;
  teklif_usulu: string;
  baslangic_fiyati: number | null;
  para_birimi: string | null;
  bitis_tarihi: string | null;
  user_id: string;
  firma_adi_gizle: boolean | null;
  urun_kategori_id: string | null;
  urun_grup_id: string | null;
  urun_tur_id: string | null;
  hizmet_kategori_id: string | null;
  hizmet_tur_id: string | null;
  odeme_secenekleri: string | null;
  odeme_vadesi: string | null;
  slug: string | null;
}

interface IhaleWithExtra extends IhaleRow {
  firma_unvani?: string;
  firma_logo_url?: string | null;
  teklif_sayisi: number;
}

const paraBirimiSymbol: Record<string, string> = {
  TRY: "₺", USD: "$", EUR: "€", GBP: "£",
};

function useCountdown(targetDate: string | null) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!targetDate) { setRemaining(""); return; }
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining("0 dakika 0 saniye"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setRemaining(`${d} gün ${h} saat`);
      else if (h > 0) setRemaining(`${h} saat ${m} dakika`);
      else setRemaining(`${m} dakika ${s} saniye`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return remaining;
}

function CountdownBadge({ date }: { date: string | null }) {
  const remaining = useCountdown(date);
  if (!remaining) return null;
  return (
    <div className="flex items-center gap-1.5 text-destructive text-xs font-medium bg-destructive/10 rounded-full px-3 py-1.5">
      <Clock className="w-3.5 h-3.5" />
      {remaining}
    </div>
  );
}

export default function TekIhale() {
  const navigate = useNavigate();
  const location = useLocation();
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [firmaLogoUrl, setFirmaLogoUrl] = useState<string | null>(null);
  const ihaleSidebarBanner = useBanner("tekihale-sidebar");
  const ihaleAltBanner = useBanner("tekihale-alt-banner");
  const [searchTerm, setSearchTerm] = useSessionState("searchTerm", "");
  const [page, setPage] = useSessionState("page", 1);

  // Filters
  const [filterIhaleTuru, setFilterIhaleTuru] = useSessionState<string[]>("filterIhaleTuru", []);
  const [filterTeklifUsulu, setFilterTeklifUsulu] = useSessionState<string[]>("filterTeklifUsulu", []);
  const [filterOdeme, setFilterOdeme] = useSessionState<string[]>("filterOdeme", []);
  const [filterVade, setFilterVade] = useSessionState<string[]>("filterVade", []);

  // Category hierarchy filters
  const [kategoriler, setKategoriler] = useState<{ id: string; name: string }[]>([]);
  const [gruplar, setGruplar] = useState<{ id: string; name: string }[]>([]);
  const [turler, setTurler] = useState<{ id: string; name: string }[]>([]);
  const [filterKategori, setFilterKategori] = useSessionState<string[]>("filterKategori", []);
  const [filterGrup, setFilterGrup] = useSessionState<string[]>("filterGrup", []);
  const [filterTur, setFilterTur] = useSessionState<string[]>("filterTur", []);

  // Hizmet category filters
  const [hizmetKategoriler, setHizmetKategoriler] = useState<{ id: string; name: string }[]>([]);
  const [hizmetTurler, setHizmetTurler] = useState<{ id: string; name: string }[]>([]);
  const [filterHizmetKategori, setFilterHizmetKategori] = useSessionState<string[]>("filterHizmetKategori", []);
  const [filterHizmetTur, setFilterHizmetTur] = useSessionState<string[]>("filterHizmetTur", []);

  const isHizmetMode = filterIhaleTuru.length > 0 && filterIhaleTuru.every(v => v === "hizmet_alim");
  const isUrunMode = filterIhaleTuru.length > 0 && filterIhaleTuru.every(v => v === "urun_alis" || v === "urun_satis");

  // Fetch active ihaleler with react-query for caching (instant on back navigation)
  const { data: queryResult, isLoading: loading } = useQuery({
    queryKey: ["tekihale-list"],
    queryFn: async () => {
      const { data: ihaleData } = await supabase
        .from("ihaleler")
        .select("id, ihale_no, baslik, foto_url, ihale_turu, teklif_usulu, baslangic_fiyati, para_birimi, bitis_tarihi, user_id, firma_adi_gizle, urun_kategori_id, urun_grup_id, urun_tur_id, hizmet_kategori_id, hizmet_tur_id, odeme_secenekleri, odeme_vadesi, slug")
        .eq("durum", "devam_ediyor")
        .order("created_at", { ascending: false });

      if (!ihaleData || ihaleData.length === 0) {
        return { ihaleler: [] as IhaleWithExtra[], secenekMap: {} as Record<string, string> };
      }

      const userIds = [...new Set(ihaleData.map((i) => i.user_id))];
      const ihaleIds = ihaleData.map((i) => i.id);

      const [firmaRes, teklifRes] = await Promise.all([
        supabase.from("firmalar").select("user_id, firma_unvani, logo_url").in("user_id", userIds),
        supabase.from("ihale_teklifler").select("ihale_id").in("ihale_id", ihaleIds),
      ]);

      const firmaMap: Record<string, { unvan: string; logo: string | null }> = {};
      firmaRes.data?.forEach((f) => {
        firmaMap[f.user_id] = { unvan: f.firma_unvani, logo: f.logo_url };
      });

      const teklifCount: Record<string, number> = {};
      teklifRes.data?.forEach((t) => {
        teklifCount[t.ihale_id] = (teklifCount[t.ihale_id] || 0) + 1;
      });

      const enriched: IhaleWithExtra[] = ihaleData.map((i) => ({
        ...i,
        firma_unvani: firmaMap[i.user_id]?.unvan || "",
        firma_logo_url: firmaMap[i.user_id]?.logo || null,
        teklif_sayisi: teklifCount[i.id] || 0,
      }));

      const allIds = ihaleData.flatMap((i) => [i.urun_kategori_id, i.urun_grup_id, i.urun_tur_id, i.hizmet_kategori_id, i.hizmet_tur_id].filter(Boolean)) as string[];
      let sMap: Record<string, string> = {};
      if (allIds.length > 0) {
        const { data: secData } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", [...new Set(allIds)]);
        secData?.forEach((s) => { sMap[s.id] = s.name; });
      }

      return { ihaleler: enriched, secenekMap: sMap };
    },
  });

  const ihaleler = queryResult?.ihaleler ?? [];
  const secenekMap = queryResult?.secenekMap ?? {};

  // Fetch user firm info
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("firmalar").select("firma_unvani, logo_url").eq("user_id", user.id).maybeSingle();
      if (data) { setFirmaUnvani(data.firma_unvani); setFirmaLogoUrl(data.logo_url); }
    })();
  }, []);

  // Read location.state for breadcrumb navigation from detail pages
  useEffect(() => {
    const state = location.state as { kategoriId?: string; grupId?: string; turId?: string; isHizmet?: boolean } | null;
    if (state?.kategoriId) {
      if (state.isHizmet) {
        setFilterHizmetKategori([state.kategoriId]);
        if (state.grupId) setFilterHizmetTur([state.grupId]);
        setFilterIhaleTuru(["hizmet_alim"]);
      } else {
        setFilterKategori([state.kategoriId]);
        if (state.grupId) setFilterGrup([state.grupId]);
        if (state.turId) setFilterTur([state.turId]);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch ürün kategorileri
  useEffect(() => {
    (async () => {
      const { data: katData } = await supabase.from("firma_bilgi_kategorileri").select("id").eq("name", "Ana Ürün Kategorileri").maybeSingle();
      if (!katData) return;
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", katData.id).is("parent_id", null).order("name");
      if (data) setKategoriler(data);
    })();
  }, []);

  // Fetch hizmet kategorileri
  useEffect(() => {
    (async () => {
      const { data: katData } = await supabase.from("firma_bilgi_kategorileri").select("id").eq("name", "Ana Hizmet Kategorileri").maybeSingle();
      if (!katData) return;
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", katData.id).is("parent_id", null).order("name");
      if (data) setHizmetKategoriler(data);
    })();
  }, []);

  // Fetch gruplar when kategori selected
  useEffect(() => {
    if (filterKategori.length === 1) {
      (async () => {
        const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("parent_id", filterKategori[0]).order("name");
        if (data) setGruplar(data);
      })();
    } else {
      setGruplar([]);
      setFilterGrup([]);
      setFilterTur([]);
    }
  }, [filterKategori]);

  // Fetch turler when grup selected
  useEffect(() => {
    if (filterGrup.length === 1) {
      (async () => {
        const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("parent_id", filterGrup[0]).order("name");
        if (data) setTurler(data);
      })();
    } else {
      setTurler([]);
      setFilterTur([]);
    }
  }, [filterGrup]);

  // Fetch hizmet turler
  useEffect(() => {
    if (filterHizmetKategori.length === 1) {
      (async () => {
        const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("parent_id", filterHizmetKategori[0]).order("name");
        if (data) setHizmetTurler(data);
      })();
    } else {
      setHizmetTurler([]);
      setFilterHizmetTur([]);
    }
  }, [filterHizmetKategori]);

  const toggleFilter = useCallback((arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
    setPage(1);
  }, []);

  const filtered = useMemo(() => {
    return ihaleler.filter((ihale) => {
      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const kategoriName = ihale.urun_kategori_id ? (secenekMap[ihale.urun_kategori_id] || "").toLowerCase() : "";
        const hizmetName = ihale.hizmet_kategori_id ? (secenekMap[ihale.hizmet_kategori_id] || "").toLowerCase() : "";
        if (!ihale.baslik.toLowerCase().includes(s) && !ihale.ihale_no.toLowerCase().includes(s) && !kategoriName.includes(s) && !hizmetName.includes(s)) return false;
      }
      if (filterIhaleTuru.length > 0 && !filterIhaleTuru.includes(ihale.ihale_turu)) return false;
      if (filterTeklifUsulu.length > 0 && !filterTeklifUsulu.includes(ihale.teklif_usulu)) return false;
      if (filterKategori.length > 0 && (!ihale.urun_kategori_id || !filterKategori.includes(ihale.urun_kategori_id))) return false;
      if (filterGrup.length > 0 && (!ihale.urun_grup_id || !filterGrup.includes(ihale.urun_grup_id))) return false;
      if (filterTur.length > 0 && (!ihale.urun_tur_id || !filterTur.includes(ihale.urun_tur_id))) return false;
      if (filterHizmetKategori.length > 0 && (!ihale.hizmet_kategori_id || !filterHizmetKategori.includes(ihale.hizmet_kategori_id))) return false;
      if (filterHizmetTur.length > 0 && (!ihale.hizmet_tur_id || !filterHizmetTur.includes(ihale.hizmet_tur_id))) return false;
      if (filterOdeme.length > 0 && (!ihale.odeme_secenekleri || !filterOdeme.includes(ihale.odeme_secenekleri))) return false;
      if (filterVade.length > 0 && (!ihale.odeme_vadesi || !filterVade.includes(ihale.odeme_vadesi))) return false;
      return true;
    });
  }, [ihaleler, searchTerm, filterIhaleTuru, filterTeklifUsulu, filterKategori, filterGrup, filterTur, filterHizmetKategori, filterHizmetTur, filterOdeme, filterVade, secenekMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const ihaleTuruLabel: Record<string, string> = { urun_alis: "Ürün Alış İhalesi", urun_satis: "Ürün Satış İhalesi", hizmet_alim: "Hizmet İhalesi" };
  const teklifUsuluLabel: Record<string, string> = { acik_arttirma: "Açık Artırma", acik_indirme: "Açık İndirme", kapali_teklif: "Kapalı Teklif" };

  const FilterSection = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
      </div>
      <div className="space-y-2.5">{children}</div>
    </Card>
  );

  const CheckboxFilter = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
    </label>
  );

  const isMobile = useIsMobile();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const activeFilterCount = filterIhaleTuru.length + filterTeklifUsulu.length + filterKategori.length + filterGrup.length + filterTur.length + filterHizmetKategori.length + filterHizmetTur.length + filterOdeme.length + filterVade.length;

  const filterSidebarContent = (
    <div className="space-y-4">
      <FilterSection title="İhale Türü" icon={Target}>
        {IHALE_TURU_OPTIONS.map((o) => (
          <CheckboxFilter key={o.value} label={o.label} checked={filterIhaleTuru.includes(o.value)} onChange={() => toggleFilter(filterIhaleTuru, o.value, setFilterIhaleTuru)} />
        ))}
      </FilterSection>

      <FilterSection title="Teklif Usulü" icon={Gavel}>
        {TEKLIF_USULU_OPTIONS.map((o) => (
          <CheckboxFilter key={o.value} label={o.label} checked={filterTeklifUsulu.includes(o.value)} onChange={() => toggleFilter(filterTeklifUsulu, o.value, setFilterTeklifUsulu)} />
        ))}
      </FilterSection>

      {isUrunMode && (
        <FilterSection title="Ürün Kategorisi" icon={Layers}>
          {kategoriler.map((k) => (
            <CheckboxFilter key={k.id} label={k.name} checked={filterKategori.includes(k.id)} onChange={() => toggleFilter(filterKategori, k.id, setFilterKategori)} />
          ))}
          {filterKategori.length === 1 && gruplar.length > 0 && (
            <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Ürün Grubu</p>
              {gruplar.map((g) => (
                <CheckboxFilter key={g.id} label={g.name} checked={filterGrup.includes(g.id)} onChange={() => toggleFilter(filterGrup, g.id, setFilterGrup)} />
              ))}
              {filterGrup.length === 1 && turler.length > 0 && (
                <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ürün Türü</p>
                  {turler.map((t) => (
                    <CheckboxFilter key={t.id} label={t.name} checked={filterTur.includes(t.id)} onChange={() => toggleFilter(filterTur, t.id, setFilterTur)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </FilterSection>
      )}

      {isHizmetMode && hizmetKategoriler.length > 0 && (
        <FilterSection title="Hizmet Kategorisi" icon={Layers}>
          {hizmetKategoriler.map((k) => (
            <CheckboxFilter key={k.id} label={k.name} checked={filterHizmetKategori.includes(k.id)} onChange={() => toggleFilter(filterHizmetKategori, k.id, setFilterHizmetKategori)} />
          ))}
          {filterHizmetKategori.length === 1 && hizmetTurler.length > 0 && (
            <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Hizmet Türü</p>
              {hizmetTurler.map((t) => (
                <CheckboxFilter key={t.id} label={t.name} checked={filterHizmetTur.includes(t.id)} onChange={() => toggleFilter(filterHizmetTur, t.id, setFilterHizmetTur)} />
              ))}
            </div>
          )}
        </FilterSection>
      )}

      <FilterSection title="Ödeme Seçenekleri" icon={CreditCard}>
        {ODEME_SECENEKLERI_OPTIONS.map((o) => (
          <CheckboxFilter key={o} label={o} checked={filterOdeme.includes(o)} onChange={() => toggleFilter(filterOdeme, o, setFilterOdeme)} />
        ))}
      </FilterSection>

      <FilterSection title="Ödeme Vadesi" icon={CalendarClock}>
        {ODEME_VADESI_OPTIONS.map((o) => (
          <CheckboxFilter key={o} label={o} checked={filterVade.includes(o)} onChange={() => toggleFilter(filterVade, o, setFilterVade)} />
        ))}
      </FilterSection>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />

      <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 space-y-5">
        {/* Search + Mobile Filter Button */}
        <div className="flex gap-2">
          <Card className="p-0 flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="İhale Ara"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-10 border-0 h-12 text-sm"
              />
            </div>
          </Card>
          <Button variant="outline" className="lg:hidden h-12 gap-2 shrink-0" onClick={() => setMobileFilterOpen(true)}>
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>
            )}
          </Button>
        </div>

        {/* Mobile Filter Sheet */}
        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetContent side="left" className="w-[300px] overflow-y-auto p-4">
            <SheetHeader className="mb-4">
              <SheetTitle>Filtreler</SheetTitle>
            </SheetHeader>
            {filterSidebarContent}
          </SheetContent>
        </Sheet>

        <div className="flex gap-6">
          {/* Filters sidebar - desktop only */}
          <aside className="w-[300px] shrink-0 space-y-4 hidden lg:block">
            {filterSidebarContent}

            {/* Ürün kategorileri - show only when ürün türü selected */}
            {isUrunMode && (
              <FilterSection title="Ürün Kategorisi" icon={Layers}>
                {kategoriler.map((k) => (
                  <CheckboxFilter key={k.id} label={k.name} checked={filterKategori.includes(k.id)} onChange={() => toggleFilter(filterKategori, k.id, setFilterKategori)} />
                ))}
                {filterKategori.length === 1 && gruplar.length > 0 && (
                  <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Ürün Grubu</p>
                    {gruplar.map((g) => (
                      <CheckboxFilter key={g.id} label={g.name} checked={filterGrup.includes(g.id)} onChange={() => toggleFilter(filterGrup, g.id, setFilterGrup)} />
                    ))}
                    {filterGrup.length === 1 && turler.length > 0 && (
                      <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Ürün Türü</p>
                        {turler.map((t) => (
                          <CheckboxFilter key={t.id} label={t.name} checked={filterTur.includes(t.id)} onChange={() => toggleFilter(filterTur, t.id, setFilterTur)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </FilterSection>
            )}

            {/* Sidebar banner */}
            <div
              className="hidden lg:block rounded-xl overflow-hidden border border-border cursor-pointer"
              onClick={() => ihaleSidebarBanner.linkUrl && window.open(ihaleSidebarBanner.linkUrl, "_blank")}
            >
              {ihaleSidebarBanner.url ? (
                <img src={ihaleSidebarBanner.url} alt="Reklam" className="w-full h-auto object-cover" style={{ imageRendering: "auto" }} />
              ) : (
                <div className="py-10 px-6 flex flex-col items-center justify-center text-center" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))" }}>
                  <p className="text-primary-foreground font-bold text-base">Tekstil A.Ş.</p>
                  <p className="text-primary-foreground/70 text-xs mt-2">Reklam alanınız burada</p>
                  <p className="text-primary-foreground/50 text-[10px] mt-1">300 × 250</p>
                </div>
              )}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 space-y-4">
            {loading ? (
              <div className="text-center py-20 text-muted-foreground">Yükleniyor...</div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">İhale bulunamadı.</div>
            ) : (
              paginated.map((ihale, idx) => {
                const kategoriName = ihale.urun_kategori_id ? secenekMap[ihale.urun_kategori_id] : ihale.hizmet_kategori_id ? secenekMap[ihale.hizmet_kategori_id] : null;
                // Insert banner after 3rd card
                const showBannerAfter = idx === 2 && paginated.length > 3;
                return (
                  <div key={ihale.id}>
                    <Card
                      className="p-5 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/ihaleler/${ihale.slug || ihale.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                        {/* Image */}
                        <div className="w-full sm:w-[140px] h-[140px] rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {ihale.foto_url ? (
                            <img src={ihale.foto_url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <img src={ihaleDefaultCover} alt="" className="w-full h-full object-contain p-2" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="outline" className="text-xs">{ihaleTuruLabel[ihale.ihale_turu] || ihale.ihale_turu}</Badge>
                              <Badge variant="outline" className="text-xs">{teklifUsuluLabel[ihale.teklif_usulu] || ihale.teklif_usulu}</Badge>
                              {kategoriName && <Badge variant="outline" className="text-xs">{kategoriName}</Badge>}
                            </div>
                            <CountdownBadge date={ihale.bitis_tarihi} />
                          </div>

                          <h3 className="font-semibold text-foreground text-base mb-2 line-clamp-1">{ihale.baslik}</h3>

                          {/* Firma */}
                          <div className="flex items-center gap-2 mb-4">
                            {ihale.firma_adi_gizle ? (
                              <>
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground italic">Gizli Firma</span>
                              </>
                            ) : (
                              <>
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
                                  {ihale.firma_logo_url ? (
                                    <img src={ihale.firma_logo_url} alt="" className="w-full h-full object-contain p-0.5" />
                                  ) : (
                                    <Building2 className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground">{ihale.firma_unvani}</span>
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                            <div>
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Başlangıç Fiyatı</p>
                              <p className="font-semibold text-foreground">
                                {ihale.baslangic_fiyati != null
                                  ? `${paraBirimiSymbol[ihale.para_birimi || "TRY"] || "₺"}${ihale.baslangic_fiyati.toLocaleString("tr-TR")}`
                                  : "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Teklif Sayısı</p>
                              <p className="font-semibold text-foreground">{ihale.teklif_sayisi} Teklif</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                    {showBannerAfter && (
                      <div
                        className="hidden md:block rounded-xl overflow-hidden h-28 cursor-pointer mt-4"
                        style={ihaleAltBanner.url ? undefined : { background: "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }}
                        onClick={() => ihaleAltBanner.linkUrl && window.open(ihaleAltBanner.linkUrl, "_blank")}
                      >
                        {ihaleAltBanner.url ? (
                          <img src={ihaleAltBanner.url} alt="Reklam" className="w-full h-full object-cover" style={{ imageRendering: "auto" }} />
                        ) : (
                          <div className="flex items-center px-8 h-full">
                            <div>
                              <p className="text-primary-foreground text-lg font-bold">Tekstil A.Ş. ile Güvenle İhale Açın</p>
                              <p className="text-primary-foreground/70 text-sm mt-1">Binlerce doğrulanmış tedarikçi, rekabetçi fiyatlar</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} ihalede {paginated.length} ihale gösteriliyor
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
