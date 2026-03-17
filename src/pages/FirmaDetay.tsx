import { useEffect, useState, useRef } from "react";
import FirmaAvatar from "@/components/FirmaAvatar";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { usePackageQuota, canPerformAction } from "@/hooks/use-package-quota";
import UpgradeDialog from "@/components/UpgradeDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import adBannerImg from "@/assets/ad-banner.jpg";
import { useBanner } from "@/hooks/use-banner";
import BildirDialog from "@/components/BildirDialog";
import VerifiedBadge from "@/components/VerifiedBadge";
import {
  MessageSquare,
  Phone,
  Globe,
  Mail,
  MapPin,
  ImageIcon,
  Bookmark,
  Award,
  ChevronDown,
  ChevronUp,
  Flag,
  Eye,
  Lock,
} from "lucide-react";
import { Instagram, Facebook, Linkedin, Twitter, Youtube } from "lucide-react";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.17v-3.44a4.85 4.85 0 01-2-.71v-4.53z"/></svg>
);

interface FirmaData {
  id: string;
  user_id: string;
  firma_unvani: string;
  firma_turu_id: string;
  firma_tipi_id: string;
  firma_hakkinda: string | null;
  logo_url: string | null;
  kapak_fotografi_url: string | null;
  web_sitesi: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  x_twitter: string | null;
  tiktok: string | null;
  youtube: string | null;
  firma_iletisim_email: string | null;
  firma_iletisim_numarasi: string | null;
  firma_olcegi_id: string | null;
  kurulus_il_id: string | null;
  kurulus_ilce_id: string | null;
  kurulus_tarihi: string | null;
  moq: number | null;
  aylik_uretim_kapasitesi: number | null;
  uretim_satis_rolu: string | null;
  uretim_vardiyasi_id: string | null;
  bagimsiz_denetim_id: string | null;
  hizli_numune_id: string | null;
  fiziksel_magaza_sayisi: number | null;
  aylik_tedarik_sayisi: number | null;
  aylik_tedarik_birim_id: string | null;
}

interface Tesis {
  id: string;
  tesis_adi: string;
  il: string;
  ilce: string;
  adres: string;
  makine_gucu: string;
  is_gucu: string;
}

interface Sertifika {
  id: string;
  kategori: string;
  tur: string;
  verilis: string | null;
  gecerlilik: string | null;
}

interface Referans {
  id: string;
  referans_adi: string;
  logo_url: string | null;
}

interface GaleriFoto {
  id: string;
  foto_url: string;
  foto_adi: string | null;
}

interface Urun {
  id: string;
  baslik: string;
  foto_url: string | null;
  fiyat: number | null;
  para_birimi: string | null;
  urun_no: string;
  durum: string;
}

interface Makine {
  id: string;
  kategori: string;
  tur: string;
  sayisi: string;
  tesis: string;
}

interface Teknoloji {
  id: string;
  kategori: string;
  tur: string;
}

const paraBirimiSymbol: Record<string, string> = {
  TRY: "₺", USD: "$", EUR: "€", GBP: "£",
};

const URETIM_MODEL_LABELS: Record<string, string> = {
  uretici: "Üretici",
  satici: "Satıcı",
  her_ikisi: "Üretici, Satıcı",
};

const MENU_ITEMS = [
  { id: "hakkinda", label: "Hakkında" },
  { id: "urun-hizmet", label: "Ürün/Hizmet" },
  { id: "tesis", label: "Tesis Bilgileri" },
  { id: "makine", label: "Makine Gücü" },
  { id: "referanslar", label: "Referanslar" },
  { id: "sertifikalar", label: "Sertifikalar" },
  { id: "galeri", label: "Galeri" },
  { id: "urunler", label: "Ürünler" },
];

const textOrBelirtilmedi = (value: string | null | undefined) => {
  const cleaned = value?.trim();
  return cleaned ? cleaned : "Belirtilmedi";
};

const normalizeText = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .trim();

// Collapsible block component
function CollapsibleBlock({ title, children, maxHeight = 160 }: { title: string; children: React.ReactNode; maxHeight?: number }) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [needsExpand, setNeedsExpand] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsExpand(contentRef.current.scrollHeight > maxHeight);
    }
  }, [children, maxHeight]);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold text-foreground mb-3">{title}</h2>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded || !needsExpand ? "none" : `${maxHeight}px` }}
      >
        {children}
      </div>
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-secondary font-medium mt-3 hover:underline"
        >
          {expanded ? (
            <>Daha Az Gör <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Daha Fazla Gör <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </Card>
  );
}

// Gallery Lightbox component
function GalleryLightbox({ images, initialIndex, onClose }: { images: GaleriFoto[]; initialIndex: number; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const img = images[currentIndex];
  
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrentIndex(i => i > 0 ? i - 1 : images.length - 1);
      if (e.key === "ArrowRight") setCurrentIndex(i => i < images.length - 1 ? i + 1 : 0);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white z-10">
        <ChevronUp className="w-8 h-8 rotate-45" />
      </button>
      <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <img src={img.foto_url} alt={img.foto_adi || "Galeri"} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
        {images.length > 1 && (
          <>
            <button onClick={() => setCurrentIndex(i => i > 0 ? i - 1 : images.length - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70">
              <ChevronDown className="w-6 h-6 rotate-90" />
            </button>
            <button onClick={() => setCurrentIndex(i => i < images.length - 1 ? i + 1 : 0)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70">
              <ChevronDown className="w-6 h-6 -rotate-90" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

export default function FirmaDetay() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const sidebarBanner = useBanner("firma-detay-sidebar", adBannerImg);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [firma, setFirma] = useState<FirmaData | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState("");
  const packageInfo = usePackageQuota();
  const [contactRevealed, setContactRevealed] = useState(false);
  const [contactRevealLoading, setContactRevealLoading] = useState(false);
  const [msgUpgradeOpen, setMsgUpgradeOpen] = useState(false);
  const [msgUpgradeMessage, setMsgUpgradeMessage] = useState("");
  const [secenekMap, setSecenekMap] = useState<Record<string, string>>({});
  const [kategoriMap, setKategoriMap] = useState<Record<string, string>>({});
  const [firmaTuruName, setFirmaTuruName] = useState("");
  const [firmaTipiName, setFirmaTipiName] = useState("");
  const [isFavorited, setIsFavorited] = useState(false);
  const [bildirOpen, setBildirOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  const [tesisler, setTesisler] = useState<Tesis[]>([]);
  const [sertifikalar, setSertifikalar] = useState<Sertifika[]>([]);
  const [referanslar, setReferanslar] = useState<Referans[]>([]);
  const [galeri, setGaleri] = useState<GaleriFoto[]>([]);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [makineler, setMakineler] = useState<Makine[]>([]);
  const [teknolojiler, setTeknolojiler] = useState<Teknoloji[]>([]);
  const [uretimSatisItems, setUretimSatisItems] = useState<{ tip: string; kategori: string; grup: string; tur: string }[]>([]);
  const [urunHizmetItems, setUrunHizmetItems] = useState<{ kategoriId: string; kategoriName: string; secenek: string }[]>([]);

  const [activeMenu, setActiveMenu] = useState("hakkinda");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (sectionId: string) => {
    setActiveMenu(sectionId);
    const el = sectionRefs.current[sectionId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!slug || packageInfo.loading) return;

    const fetchAll = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
      }

      // Support both UUID and slug lookup
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const { data: firmaData } = await supabase
        .from("firmalar")
        .select("*")
        .eq(isUuid ? "id" : "slug", slug)
        .single();

      if (!firmaData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const firmaId = firmaData.id;

      // Kendi firması ise iletişim otomatik açık
      if (user && firmaData.user_id === user.id) {
        setContactRevealed(true);
      } else if (user) {
        // Daha önce iletişim görüntülenmiş mi kontrol et
        const { data: existingView } = await supabase
          .from("profil_goruntulemeler" as any)
          .select("id")
          .eq("user_id", user.id)
          .eq("firma_id", firmaId)
          .maybeSingle();
        if (existingView) {
          setContactRevealed(true);
        }
      }

      setFirma(firmaData as FirmaData);

      const [
        favRes,
        tesisRes,
        sertRes,
        refRes,
        galRes,
        urunRes,
        makRes,
        tekRes,
        uretimSatisRes,
        urunHizmetRes,
      ] = await Promise.all([
        user
          ? supabase
              .from("firma_favoriler")
              .select("id")
              .eq("user_id", user.id)
              .eq("firma_id", firmaId)
          : Promise.resolve({ data: [] }),
        supabase.from("firma_tesisler").select("*").eq("firma_id", firmaId),
        supabase.from("firma_sertifikalar").select("*").eq("firma_id", firmaId),
        supabase.from("firma_referanslar").select("*").eq("firma_id", firmaId),
        supabase.from("firma_galeri").select("*").eq("firma_id", firmaId),
        supabase
          .from("urunler")
          .select("id, baslik, foto_url, fiyat, para_birimi, urun_no, durum")
          .eq("user_id", firmaData.user_id)
          .eq("durum", "aktif"),
        supabase.from("firma_makineler").select("*").eq("firma_id", firmaId),
        supabase.from("firma_teknolojiler").select("*").eq("firma_id", firmaId),
        supabase.from("firma_uretim_satis").select("*").eq("firma_id", firmaId),
        supabase
          .from("firma_urun_hizmet_secimler")
          .select("*")
          .eq("firma_id", firmaId),
      ]);

      const tesisRows = tesisRes.data || [];
      const sertifikaRows = sertRes.data || [];
      const makineRows = makRes.data || [];
      const teknolojiRows = tekRes.data || [];
      const uretimSatisRows = uretimSatisRes.data || [];
      const urunHizmetRows = urunHizmetRes.data || [];

      const secenekIdSet = new Set<string>();
      const addSecenekId = (value: string | null | undefined) => {
        if (value) secenekIdSet.add(value);
      };

      addSecenekId(firmaData.firma_olcegi_id);
      addSecenekId(firmaData.kurulus_il_id);
      addSecenekId(firmaData.kurulus_ilce_id);
      addSecenekId(firmaData.uretim_vardiyasi_id);
      addSecenekId(firmaData.bagimsiz_denetim_id);
      addSecenekId(firmaData.hizli_numune_id);
      addSecenekId(firmaData.aylik_tedarik_birim_id);

      tesisRows.forEach((t: any) => {
        addSecenekId(t.tesis_adi_id);
        addSecenekId(t.il_id);
        addSecenekId(t.ilce_id);
        addSecenekId(t.is_gucu_id);
      });

      sertifikaRows.forEach((s: any) => {
        addSecenekId(s.sertifika_kategori_id);
        addSecenekId(s.sertifika_tur_id);
      });

      makineRows.forEach((m: any) => {
        addSecenekId(m.makine_kategori_id);
        addSecenekId(m.makine_tur_id);
      });

      teknolojiRows.forEach((t: any) => {
        addSecenekId(t.teknoloji_kategori_id);
        addSecenekId(t.teknoloji_tur_id);
      });

      uretimSatisRows.forEach((u: any) => {
        addSecenekId(u.kategori_id);
        addSecenekId(u.grup_id);
        addSecenekId(u.tur_id);
      });

      urunHizmetRows.forEach((u: any) => {
        addSecenekId(u.secenek_id);
      });

      const kategoriIds = [
        ...new Set(
          urunHizmetRows
            .map((u: any) => u.kategori_id)
            .filter((value: string | null) => Boolean(value))
        ),
      ];

      const secenekIds = Array.from(secenekIdSet);

      const [secenekRes, kategoriRes, turleriRes, tipleriRes] = await Promise.all([
        secenekIds.length > 0
          ? supabase
              .from("firma_bilgi_secenekleri")
              .select("id, name")
              .in("id", secenekIds)
          : Promise.resolve({ data: [] }),
        kategoriIds.length > 0
          ? supabase
              .from("firma_bilgi_kategorileri")
              .select("id, name")
              .in("id", kategoriIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from("firma_turleri")
          .select("name")
          .eq("id", firmaData.firma_turu_id)
          .maybeSingle(),
        supabase
          .from("firma_tipleri")
          .select("name")
          .eq("id", firmaData.firma_tipi_id)
          .maybeSingle(),
      ]);

      const sMap: Record<string, string> = {};
      (secenekRes.data || []).forEach((s: any) => {
        sMap[s.id] = s.name;
      });
      setSecenekMap(sMap);

      const kMap: Record<string, string> = {};
      (kategoriRes.data || []).forEach((k: any) => {
        kMap[k.id] = k.name;
      });
      setKategoriMap(kMap);

      setFirmaTuruName(turleriRes.data?.name || "Belirtilmedi");
      setFirmaTipiName(tipleriRes.data?.name || "Belirtilmedi");
      setIsFavorited((favRes.data || []).length > 0);

      setTesisler(
        tesisRows.map((t: any) => ({
          id: t.id,
          tesis_adi: textOrBelirtilmedi(sMap[t.tesis_adi_id]),
          il: textOrBelirtilmedi(sMap[t.il_id]),
          ilce: textOrBelirtilmedi(sMap[t.ilce_id]),
          adres: t.tesis_adresi || "",
          makine_gucu: textOrBelirtilmedi(t.makine_gucu),
          is_gucu: textOrBelirtilmedi(sMap[t.is_gucu_id]),
        }))
      );

      setSertifikalar(
        sertifikaRows.map((s: any) => ({
          id: s.id,
          kategori: textOrBelirtilmedi(sMap[s.sertifika_kategori_id]),
          tur: textOrBelirtilmedi(sMap[s.sertifika_tur_id]),
          verilis: s.verilis_tarihi,
          gecerlilik: s.gecerlilik_tarihi,
        }))
      );

      setReferanslar(
        (refRes.data || []).map((r: any) => ({
          id: r.id,
          referans_adi: r.referans_adi,
          logo_url: r.logo_url,
        }))
      );

      setGaleri(
        (galRes.data || []).map((g: any) => ({
          id: g.id,
          foto_url: g.foto_url,
          foto_adi: g.foto_adi,
        }))
      );

      setUrunler((urunRes.data || []) as Urun[]);

      setMakineler(
        makineRows.map((m: any) => ({
          id: m.id,
          kategori: textOrBelirtilmedi(sMap[m.makine_kategori_id]),
          tur: textOrBelirtilmedi(sMap[m.makine_tur_id]),
          sayisi: textOrBelirtilmedi(m.makine_sayisi),
          tesis: textOrBelirtilmedi(
            sMap[tesisRows.find((t: any) => t.id === m.tesis_id)?.tesis_adi_id]
          ),
        }))
      );

      setTeknolojiler(
        teknolojiRows.map((t: any) => ({
          id: t.id,
          kategori: textOrBelirtilmedi(sMap[t.teknoloji_kategori_id]),
          tur: textOrBelirtilmedi(sMap[t.teknoloji_tur_id]),
        }))
      );

      setUretimSatisItems(
        uretimSatisRows.map((u: any) => ({
          tip: u.tip,
          kategori: textOrBelirtilmedi(sMap[u.kategori_id]),
          grup: textOrBelirtilmedi(sMap[u.grup_id]),
          tur: textOrBelirtilmedi(sMap[u.tur_id]),
        }))
      );

      setUrunHizmetItems(
        urunHizmetRows.map((u: any) => ({
          kategoriId: u.kategori_id,
          kategoriName: textOrBelirtilmedi(kMap[u.kategori_id]),
          secenek: textOrBelirtilmedi(sMap[u.secenek_id]),
        }))
      );

      setLoading(false);
    };

    fetchAll();
  }, [slug, navigate, toast, packageInfo.loading]);

  const toggleFavorite = async () => {
    if (!currentUserId || !firma) {
      navigate("/giris-kayit");
      return;
    }
    if (isFavorited) {
      await supabase.from("firma_favoriler").delete().eq("user_id", currentUserId).eq("firma_id", firma.id);
      setIsFavorited(false);
      toast({ title: "Favorilerden çıkarıldı" });
    } else {
      await supabase.from("firma_favoriler").insert({ user_id: currentUserId, firma_id: firma.id });
      setIsFavorited(true);
      toast({ title: "Favorilere eklendi" });
    }
  };

  const handleRevealContact = async () => {
    if (!currentUserId || !firma) {
      navigate("/giris-kayit");
      return;
    }
    setContactRevealLoading(true);
    // Check quota
    const check = canPerformAction(packageInfo.limits, packageInfo.usage, "profil_goruntuleme", { paketAd: packageInfo.paketAd });
    if (!check.allowed) {
      setMsgUpgradeMessage(check.message || "İletişim bilgisi görüntüleme hakkınız dolmuştur.");
      setMsgUpgradeOpen(true);
      setContactRevealLoading(false);
      return;
    }
    // Record the view
    await supabase
      .from("profil_goruntulemeler" as any)
      .insert({ user_id: currentUserId, firma_id: firma.id });
    setContactRevealed(true);
    setContactRevealLoading(false);
  };

  const handleMessage = async () => {
    if (!currentUserId || !firma) {
      navigate("/giris-kayit");
      return;
    }
    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${firma.user_id}),and(user1_id.eq.${firma.user_id},user2_id.eq.${currentUserId})`)
      .maybeSingle();
    if (!existingConv) {
      // New conversation - check quota
      const check = canPerformAction(packageInfo.limits, packageInfo.usage, "mesaj", { paketAd: packageInfo.paketAd });
      if (!check.allowed) {
        setMsgUpgradeMessage(check.message || "Mesaj gönderme hakkınız dolmuştur.");
        setMsgUpgradeOpen(true);
        return;
      }
    }
    // Create or get conversation via RPC
    const { data: convId, error: rpcError } = await supabase.rpc("get_or_create_conversation", {
      p_user1: currentUserId,
      p_user2: firma.user_id,
    });
    if (rpcError || !convId) {
      console.error("[FirmaDetay] RPC error:", rpcError);
      return;
    }
    navigate("/mesajlar", {
      state: {
        openConversationId: convId,
        otherUserId: firma.user_id,
      },
    });
  };

  const resolve = (idVal: string | null) => {
    if (!idVal) return "Belirtilmedi";
    return secenekMap[idVal] || "Belirtilmedi";
  };

  const kurulusYili = textOrBelirtilmedi(firma?.kurulus_tarihi);
  const ilName = firma?.kurulus_il_id ? resolve(firma.kurulus_il_id) : "";
  const ilceName = firma?.kurulus_ilce_id ? resolve(firma.kurulus_ilce_id) : "";
  const ilIlce = [ilName, ilceName].filter(Boolean).join(", ") || "Belirtilmedi";

  const faaliyetAlaniFromUrunHizmet = [
    ...new Set(
      urunHizmetItems
        .filter((item) => normalizeText(item.kategoriName).includes("faaliyet"))
        .map((item) => item.secenek)
        .filter((item) => item && item !== "Belirtilmedi")
    ),
  ];

  const faaliyetAlaniFallback = [
    ...new Set(
      uretimSatisItems
        .map((item) => item.kategori)
        .filter((item) => item && item !== "Belirtilmedi")
    ),
  ];

  const faaliyetAlani =
    (faaliyetAlaniFromUrunHizmet.length > 0
      ? faaliyetAlaniFromUrunHizmet
      : faaliyetAlaniFallback
    ).join(", ") || "Belirtilmedi";

  // Üretim modeli: map uretim_satis_rolu to readable labels
  const uretimModeli = firma?.uretim_satis_rolu
    ? URETIM_MODEL_LABELS[firma.uretim_satis_rolu] || firma.uretim_satis_rolu
    : "Belirtilmedi";

  // Group ürün/hizmet by category
  const urunHizmetGrouped = urunHizmetItems.reduce<Record<string, string[]>>((acc, item) => {
    if (!item.secenek || item.secenek === "Belirtilmedi") return acc;
    if (!acc[item.kategoriName]) acc[item.kategoriName] = [];
    if (!acc[item.kategoriName].includes(item.secenek)) {
      acc[item.kategoriName].push(item.secenek);
    }
    return acc;
  }, {});

  const uretimItems = uretimSatisItems.filter((item) => item.tip === "uretim");
  const satisItems = uretimSatisItems.filter((item) => item.tip === "satis");

  const groupByGrup = (items: typeof uretimItems) => {
    const grouped: Record<string, string[]> = {};

    items.forEach((item) => {
      const grupName = item.grup && item.grup !== "Belirtilmedi" ? item.grup : "Diğer";
      if (!grouped[grupName]) grouped[grupName] = [];

      if (item.tur && item.tur !== "Belirtilmedi" && !grouped[grupName].includes(item.tur)) {
        grouped[grupName].push(item.tur);
      }
    });

    return grouped;
  };

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Sayfa bulunamadı</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            Ana Sayfaya Dön
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        {currentUserId ? <PazarHeader firmaUnvani="" /> : <PublicHeader />}
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (quotaBlocked) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PazarHeader firmaUnvani="" />
        <div className="flex flex-col items-center justify-center h-96 gap-4 px-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Flag className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground text-center">Profil Görüntüleme Hakkınız Doldu</h2>
          <p className="text-muted-foreground text-center max-w-md">{quotaMessage}</p>
          <Button onClick={() => navigate("/paketim")} variant="default">PRO Pakete Yükselt</Button>
          <Button onClick={() => navigate("/dashboard")} variant="ghost">Dashboard'a Dön</Button>
        </div>
        <UpgradeDialog
          open={quotaBlocked}
          onOpenChange={(open) => { if (!open) navigate("/tekpazar"); }}
          title="Profil Görüntüleme Hakkınız Doldu"
          message={quotaMessage}
        />
        <Footer />
      </div>
    );
  }

  if (!firma) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      {currentUserId ? <PazarHeader firmaUnvani="" /> : <PublicHeader />}

      {/* ===== HEADER / BANNER ===== */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        {/* Banner */}
        <div className="w-full h-[140px] md:h-[160px] bg-muted overflow-hidden rounded-t-xl">
          {firma.kapak_fotografi_url ? (
            <img src={firma.kapak_fotografi_url} alt="Kapak" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/5" />
          )}
        </div>

        {/* Header Card */}
        <div className="bg-card border border-t-0 border-border rounded-b-xl shadow-sm p-5">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <FirmaAvatar firmaUnvani={firma.firma_unvani} logoUrl={firma.logo_url} size="xl" className="w-20 h-20 text-2xl -mt-14 border border-border" />

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground flex items-center gap-1.5">
                {firma.firma_unvani}
                {(firma as any).belge_onayli && <VerifiedBadge size="md" />}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge className="bg-secondary text-secondary-foreground text-xs">{firmaTuruName}</Badge>
                <Badge variant="outline" className="text-xs border-secondary text-secondary">{firmaTipiName}</Badge>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  {ilIlce}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 mt-3 md:mt-0">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={toggleFavorite}>
                <Bookmark className={`w-4 h-4 ${isFavorited ? "fill-secondary text-secondary" : ""}`} />
                <span className="hidden sm:inline">Kaydet</span>
              </Button>
              <Button size="sm" className="gap-1.5 bg-primary" onClick={handleMessage}>
                <MessageSquare className="w-4 h-4" />
                Mesaj
              </Button>
              {currentUserId && (
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setBildirOpen(true)} title="Bildir">
                  <Flag className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Kuruluş</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{kurulusYili}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Üretim Modeli</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{uretimModeli}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Şirket Ölçeği</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{resolve(firma.firma_olcegi_id)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Faaliyet Alanı</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{faaliyetAlani}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== STICKY TAB MENU ===== */}
      <div className="sticky top-14 z-30 mt-4 max-w-7xl mx-auto px-4">
        <div className="bg-background border border-border rounded-lg">
          <div className="flex items-center gap-6 overflow-x-auto py-2 px-4">
            {MENU_ITEMS.filter(item => currentUserId || item.id !== "urunler").map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-medium whitespace-nowrap pb-1 border-b-2 transition-colors ${
                  activeMenu === item.id
                    ? "text-secondary border-secondary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hakkında */}
            <div ref={el => { sectionRefs.current["hakkinda"] = el; }}>
              <CollapsibleBlock title="Firma Hakkında" maxHeight={120}>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {firma.firma_hakkinda || "Henüz firma hakkında bilgi girilmemiştir."}
                </p>
              </CollapsibleBlock>
            </div>

            {/* Ürün/Hizmet */}
            <div ref={el => { sectionRefs.current["urun-hizmet"] = el; }}>
              <CollapsibleBlock title="Ürün/Hizmet" maxHeight={200}>
                <div className="space-y-4 text-sm">
                  {/* Ürün/Hizmet seçimleri grouped by category */}
                  {Object.keys(urunHizmetGrouped).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(urunHizmetGrouped).map(([katName, secenekler]) => (
                        <div key={katName}>
                          <span className="font-semibold text-foreground">{katName}: </span>
                          <span className="text-muted-foreground">{secenekler.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Üretim items */}
                  {uretimItems.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Üreticisi Olduğu Ürünler</h3>
                      {Object.entries(groupByGrup(uretimItems)).map(([grup, turler]) => (
                        <div key={grup} className="ml-2">
                          <span className="font-medium text-foreground">{grup}: </span>
                          <span className="text-muted-foreground">{turler.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Satış items */}
                  {satisItems.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Satıcısı Olduğu Ürünler</h3>
                      {Object.entries(groupByGrup(satisItems)).map(([grup, turler]) => (
                        <div key={grup} className="ml-2">
                          <span className="font-medium text-foreground">{grup}: </span>
                          <span className="text-muted-foreground">{turler.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {uretimItems.length === 0 && satisItems.length === 0 && Object.keys(urunHizmetGrouped).length === 0 && (
                    <p className="text-muted-foreground">Henüz ürün/hizmet bilgisi girilmemiştir.</p>
                  )}

                  {firma.moq != null && (
                    <div>
                      <span className="font-semibold text-foreground">Minimum Sipariş Miktarı (MOQ): </span>
                      <span className="text-muted-foreground">{firma.moq.toLocaleString("tr-TR")} Adet</span>
                    </div>
                  )}
                  {firma.aylik_uretim_kapasitesi != null && (
                    <div>
                      <span className="font-semibold text-foreground">Aylık Üretim Kapasitesi: </span>
                      <span className="text-muted-foreground">{firma.aylik_uretim_kapasitesi.toLocaleString("tr-TR")} Adet</span>
                    </div>
                  )}
                </div>
              </CollapsibleBlock>
            </div>

            {/* Tesis Bilgileri */}
            <div ref={el => { sectionRefs.current["tesis"] = el; }}>
              <CollapsibleBlock title="Tesis Bilgileri" maxHeight={200}>
                {tesisler.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 font-semibold text-foreground">Tesis Adı</th>
                          <th className="pb-2 font-semibold text-foreground">Tesis Adresi</th>
                          <th className="pb-2 font-semibold text-foreground">Makine Gücü</th>
                          <th className="pb-2 font-semibold text-foreground">İş Gücü</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tesisler.map(t => (
                          <tr key={t.id} className="border-b border-border/50">
                            <td className="py-2.5 text-muted-foreground">{t.tesis_adi}</td>
                            <td className="py-2.5 text-muted-foreground">{t.il}/{t.ilce}</td>
                            <td className="py-2.5 text-muted-foreground">{t.makine_gucu}</td>
                            <td className="py-2.5 text-muted-foreground">{t.is_gucu}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Henüz tesis bilgisi girilmemiştir.</p>
                )}
              </CollapsibleBlock>
            </div>

            {/* Makine Gücü ve Teknoloji */}
            <div ref={el => { sectionRefs.current["makine"] = el; }}>
              <CollapsibleBlock title="Makine Gücü ve Teknoloji" maxHeight={200}>
                {makineler.length > 0 ? (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 font-semibold text-foreground">Makine Kategorisi</th>
                          <th className="pb-2 font-semibold text-foreground">Makine Türü</th>
                          <th className="pb-2 font-semibold text-foreground">Adet</th>
                          <th className="pb-2 font-semibold text-foreground">Tesis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {makineler.map(m => (
                          <tr key={m.id} className="border-b border-border/50">
                            <td className="py-2.5 text-muted-foreground">{m.kategori}</td>
                            <td className="py-2.5 text-muted-foreground">{m.tur}</td>
                            <td className="py-2.5 text-muted-foreground">{m.sayisi}</td>
                            <td className="py-2.5 text-muted-foreground">{m.tesis}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">Henüz makine bilgisi girilmemiştir.</p>
                )}
                {teknolojiler.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-foreground mt-2 mb-2">Yazılım ve Teknoloji</h3>
                    <div className="flex flex-wrap gap-2">
                      {teknolojiler.map(t => (
                        <Badge key={t.id} variant="outline" className="text-xs">
                          {t.kategori} - {t.tur}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CollapsibleBlock>
            </div>

            {/* Galeri */}
            <div ref={el => { sectionRefs.current["galeri"] = el; }}>
              <CollapsibleBlock title="Galeri" maxHeight={300}>
                {galeri.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {galeri.map((g, idx) => (
                      <div key={g.id} className="aspect-square rounded-lg overflow-hidden border border-border bg-muted cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxIndex(idx)}>
                        <img src={g.foto_url} alt={g.foto_adi || "Galeri"} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Henüz galeri fotoğrafı eklenmemiştir.</p>
                )}
              </CollapsibleBlock>
            </div>

            {/* Ürünler - only for logged-in users */}
            {currentUserId && (
              <div ref={el => { sectionRefs.current["urunler"] = el; }}>
                <Card className="p-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">Ürünler</h2>
                  {urunler.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {urunler.map(u => (
                        <Link
                          key={u.id}
                          to={`/urun/${u.id}`}
                          className="group border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-background"
                        >
                          <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                            {u.foto_url ? (
                              <img src={u.foto_url} alt={u.baslik} className="w-full h-full object-contain" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-medium text-foreground truncate">{u.baslik}</p>
                            {u.fiyat != null && (
                              <p className="text-xs font-bold text-secondary mt-0.5">
                                {paraBirimiSymbol[u.para_birimi || "TRY"]}{u.fiyat.toLocaleString("tr-TR")}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Henüz ürün eklenmemiştir.</p>
                  )}
                </Card>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN (1/3) */}
          <div className="space-y-6">
            {/* İletişim */}
            <Card className="p-5">
              <h3 className="text-base font-bold text-foreground mb-4">İletişim</h3>
              {contactRevealed ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Telefon</p>
                        <p className="text-sm font-medium text-foreground">{firma.firma_iletisim_numarasi || "Belirtilmedi"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">E-Posta</p>
                        <p className="text-sm font-medium text-foreground">{firma.firma_iletisim_email || "Belirtilmedi"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Website</p>
                        {firma.web_sitesi ? (
                          <a href={firma.web_sitesi.startsWith("http") ? firma.web_sitesi : `https://${firma.web_sitesi}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-secondary hover:underline">
                            {firma.web_sitesi}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-foreground">Belirtilmedi</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {firma.linkedin && (
                      <a href={firma.linkedin.startsWith("http") ? firma.linkedin : `https://${firma.linkedin}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {firma.instagram && (
                      <a href={firma.instagram.startsWith("http") ? firma.instagram : `https://${firma.instagram}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {firma.facebook && (
                      <a href={firma.facebook.startsWith("http") ? firma.facebook : `https://${firma.facebook}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {firma.x_twitter && (
                      <a href={firma.x_twitter.startsWith("http") ? firma.x_twitter : `https://${firma.x_twitter}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {firma.tiktok && (
                      <a href={firma.tiktok.startsWith("http") ? firma.tiktok : `https://${firma.tiktok}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <TikTokIcon className="w-4 h-4" />
                      </a>
                    )}
                    {firma.youtube && (
                      <a href={firma.youtube.startsWith("http") ? firma.youtube : `https://youtube.com/${firma.youtube}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Youtube className="w-4 h-4" />
                      </a>
                    )}
                    {!firma.linkedin && !firma.instagram && !firma.facebook && !firma.x_twitter && !firma.tiktok && !firma.youtube && (
                      <p className="text-sm text-muted-foreground">Sosyal medya hesabı belirtilmemiştir.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="relative">
                  {/* Blurred/censored preview */}
                  <div className="space-y-3 blur-sm select-none pointer-events-none" aria-hidden="true">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Telefon</p>
                        <p className="text-sm font-medium text-foreground">+90 5XX XXX XX XX</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">E-Posta</p>
                        <p className="text-sm font-medium text-foreground">info@example.com</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Website</p>
                        <p className="text-sm font-medium text-foreground">www.example.com</p>
                      </div>
                    </div>
                  </div>
                  {/* Overlay button */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 rounded-lg">
                    <Lock className="w-6 h-6 text-muted-foreground mb-2" />
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handleRevealContact}
                      disabled={contactRevealLoading}
                    >
                      <Eye className="w-4 h-4" />
                      {contactRevealLoading ? "Yükleniyor..." : "İletişim Bilgisini Gör"}
                    </Button>
                    {!currentUserId && (
                      <p className="text-xs text-muted-foreground mt-2">Görüntülemek için giriş yapın</p>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Sertifikalar */}
            <div ref={el => { sectionRefs.current["sertifikalar"] = el; }}>
              <Card className="p-5">
                <h3 className="text-base font-bold text-foreground mb-4">Sertifikalar</h3>
                {sertifikalar.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {sertifikalar.map(s => (
                      <div key={s.id} className="flex flex-col items-center gap-1.5 text-center">
                        <div className="w-14 h-14 rounded-lg border border-border flex items-center justify-center bg-muted/50">
                          <Award className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <span className="text-[10px] leading-tight text-muted-foreground font-medium">{s.tur}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Henüz sertifika eklenmemiştir.</p>
                )}
              </Card>
            </div>

            {/* Referanslar */}
            <div ref={el => { sectionRefs.current["referanslar"] = el; }}>
              <Card className="p-5">
                <h3 className="text-base font-bold text-foreground mb-4">Referanslar</h3>
                {referanslar.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {referanslar.map(r => (
                      <div key={r.id} className="aspect-square border border-border rounded-lg flex items-center justify-center p-2 bg-background overflow-hidden">
                        {r.logo_url ? (
                          <img src={r.logo_url} alt={r.referans_adi} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <span className="text-xs text-muted-foreground text-center font-medium">{r.referans_adi}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Henüz referans eklenmemiştir.</p>
                )}
              </Card>
            </div>

            {/* Reklam alanı */}
            <div
              className="hidden md:block rounded-xl overflow-hidden border border-border cursor-pointer mx-auto"
              style={{ maxWidth: 300, height: 250 }}
              onClick={() => sidebarBanner.linkUrl && window.open(sidebarBanner.linkUrl, "_blank")}
            >
              <img src={sidebarBanner.url || adBannerImg} alt="Reklam" className="w-full h-full object-contain" style={{ imageRendering: "auto" }} />
            </div>
          </div>
        </div>

      </div>
      {firma && (
        <BildirDialog open={bildirOpen} onOpenChange={setBildirOpen} tur="profil" referansId={firma.id} />
      )}
      {lightboxIndex !== null && galeri.length > 0 && (
        <GalleryLightbox images={galeri} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
      <Footer />
      <UpgradeDialog
        open={msgUpgradeOpen}
        onOpenChange={setMsgUpgradeOpen}
        title="Mesaj Hakkınız Doldu"
        message={msgUpgradeMessage}
      />
    </div>
  );
}
