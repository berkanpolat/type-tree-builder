import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BildirDialog from "@/components/BildirDialog";
import {
  Heart,
  MessageSquare,
  Phone,
  Globe,
  Mail,
  MapPin,
  ChevronDown,
  ImageIcon,
  Package,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Pencil,
  XCircle,
  CheckCircle,
  Flag,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import {
  
  SiInstagram,
  SiFacebook,
  SiTiktok,
} from "react-icons/si";
import { RiTwitterXFill } from "react-icons/ri";
import { FaLinkedinIn } from "react-icons/fa";

const paraBirimiSymbol: Record<string, string> = {
  TRY: "₺", USD: "$", EUR: "€", GBP: "£",
};

const isUUID = (val: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const RED_SEBEPLERI = [
  "Eksik veya yetersiz ürün bilgisi",
  "Yanlış kategori seçimi",
  "Yanlış ürün tipi seçimi",
  "Düşük kaliteli görseller",
  "Uygunsuz görseller",
  "Platform kurallarına aykırı içerik",
  "Platform dışı iletişim bilgisi paylaşımı",
  "Reklam veya yönlendirme içerikleri",
  "Tekstil kapsamı dışı ürün",
  "Yasaklı ürün",
  "Sahte veya marka ihlali içeren ürün",
  "Telif hakkı ihlali",
  "Gerçekçi olmayan fiyatlandırma",
  "Fiyat bilgisinin eksik olması",
  "Yinelenen (duplicate) ürün",
  "Yanıltıcı ürün bilgisi",
  "Doğrulanmamış veya şüpheli satıcı davranışı",
  "Spam ürün yükleme",
  "Eksik teknik özellik bilgileri",
  "Platform standartlarına uygun olmayan ürün başlığı",
  "Platform kalite standartlarına uymayan içerik",
];

const formatLabel = (key: string): string => {
  const turkishMap: Record<string, string> = {
    kumas_kompozisyonu: "Kumaş Kompozisyonu", kumas_grubu: "Kumaş Grubu", kumas_turu: "Kumaş Türü",
    sezon: "Sezon", cinsiyet: "Cinsiyet", yas_grubu: "Yaş Grubu", desen: "Desen", kalip: "Kalıp",
    aksesuar_kullanim_alani: "Aksesuar Kullanım Alanı", malzeme_turu: "Malzeme Türü", kaplama: "Kaplama",
    ebat_olcu: "Ebat Ölçü", ambalaj_kullanim_alani: "Ambalaj Kullanım Alanı", baski: "Baskı",
    gramaj: "Gramaj", kalinlik: "Kalınlık Bilgisi", iplik_kompozisyonu: "İplik Kompozisyonu",
    iplik_kullanim_alani: "İplik Kullanım Alanı", bukum_tipi: "Büküm Tipi", mukavemet: "Mukavemet",
    paket_tipi: "Paket Tipi", iplik_numarasi: "İplik Numarası", kimyasal_kullanim_alani: "Kimyasal Kullanım Alanı",
    marka: "Marka", model: "Model", kimyasal_turu: "Kimyasal Türü", fiziksel_formu: "Fiziksel Formu",
    depolama_kosulu: "Depolama Koşulu", yogunluk: "Yoğunluk / Viskozite", ph: "pH",
    stt: "Son Tüketim Tarihi", en: "En (cm)", boy: "Boy (cm)", esneklik_orani: "Esneklik Oranı",
    makine_kullanim_alani: "Makine Kullanım Alanı", kullanim_durumu: "Kullanım Durumu",
    uretim_yili: "Üretim Yılı", motor_tipi: "Motor Tipi", motor_gucu: "Motor Gücü",
  };
  if (turkishMap[key]) return turkishMap[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

interface UrunData {
  id: string;
  baslik: string;
  aciklama: string | null;
  foto_url: string | null;
  fiyat: number | null;
  fiyat_tipi: string;
  para_birimi: string | null;
  urun_no: string;
  min_siparis_miktari: number | null;
  teknik_detaylar: Record<string, string> | null;
  urun_kategori_id: string | null;
  urun_grup_id: string | null;
  urun_tur_id: string | null;
  user_id: string;
  durum: string;
}

interface VaryasyonData {
  id: string;
  foto_url: string;
  birim_fiyat: number;
  varyant_1_label: string;
  varyant_1_value: string;
  varyant_2_label: string | null;
  varyant_2_value: string | null;
}

interface FirmaData {
  firma_unvani: string;
  logo_url: string | null;
  firma_iletisim_numarasi: string | null;
  firma_iletisim_email: string | null;
  web_sitesi: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  x_twitter: string | null;
  tiktok: string | null;
  kurulus_il_id: string | null;
  kurulus_ilce_id: string | null;
  user_id: string;
}

interface BenzerUrun {
  id: string;
  baslik: string;
  foto_url: string | null;
  fiyat: number | null;
  fiyat_tipi: string;
  para_birimi: string | null;
  urun_no: string;
  user_id: string;
  firma_unvani?: string;
  firma_logo_url?: string | null;
  min_varyant_fiyat?: number | null;
  max_varyant_fiyat?: number | null;
}

export default function UrunDetay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [firmaLogoUrl, setFirmaLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [urun, setUrun] = useState<UrunData | null>(null);
  const [varyasyonlar, setVaryasyonlar] = useState<VaryasyonData[]>([]);
  const [firma, setFirma] = useState<FirmaData | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [bildirOpen, setBildirOpen] = useState(false);
  const [benzerUrunler, setBenzerUrunler] = useState<BenzerUrun[]>([]);
  const [secenekMap, setSecenekMap] = useState<Record<string, string>>({});
  const [resolvedTeknikDetaylar, setResolvedTeknikDetaylar] = useState<Record<string, string>>({});

  // Image gallery
  const [allImages, setAllImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Breadcrumb names
  const [breadcrumbKategori, setBreadcrumbKategori] = useState("");
  const [breadcrumbGrup, setBreadcrumbGrup] = useState("");
  const [breadcrumbTur, setBreadcrumbTur] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/giris-kayit"); return; }
      setCurrentUserId(user.id);
      const { data: f } = await supabase.from("firmalar").select("firma_unvani, logo_url").eq("user_id", user.id).single();
      if (f) { setFirmaUnvani(f.firma_unvani); setFirmaLogoUrl(f.logo_url); }
    };
    init();
  }, [navigate]);

  const fetchUrun = useCallback(async () => {
    if (!id || !currentUserId) return;
    setLoading(true);

    const { data: urunData } = await supabase
      .from("urunler")
      .select("id, baslik, aciklama, foto_url, fiyat, fiyat_tipi, para_birimi, urun_no, min_siparis_miktari, teknik_detaylar, urun_kategori_id, urun_grup_id, urun_tur_id, user_id, durum")
      .eq("id", id)
      .single();

    if (!urunData) { setLoading(false); return; }
    setUrun({ ...urunData, teknik_detaylar: (urunData.teknik_detaylar as Record<string, string>) || null });

    // Fetch varyasyonlar - deduplicate by combo key (varyasyonlu pricing creates multiple rows per combo)
    const { data: varyantlar } = await supabase
      .from("urun_varyasyonlar")
      .select("id, foto_url, birim_fiyat, varyant_1_label, varyant_1_value, varyant_2_label, varyant_2_value, min_adet, max_adet")
      .eq("urun_id", id)
      .order("created_at");
    if (varyantlar && varyantlar.length > 0) {
      const seen = new Set<string>();
      const unique: typeof varyantlar = [];
      for (const v of varyantlar) {
        const key = `${v.varyant_1_value}|${v.varyant_2_value}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(v);
        }
      }
      setVaryasyonlar(unique);
    } else {
      setVaryasyonlar([]);
    }

    // Build image list
    const imgs: string[] = [];
    if (urunData.foto_url) imgs.push(urunData.foto_url);
    varyantlar?.forEach(v => {
      if (v.foto_url && !imgs.includes(v.foto_url)) imgs.push(v.foto_url);
    });
    setAllImages(imgs);
    setSelectedImageIndex(0);

    // Fetch firma
    const { data: firmaData } = await supabase
      .from("firmalar")
      .select("firma_unvani, logo_url, firma_iletisim_numarasi, firma_iletisim_email, web_sitesi, instagram, facebook, linkedin, x_twitter, tiktok, kurulus_il_id, kurulus_ilce_id, user_id")
      .eq("user_id", urunData.user_id)
      .single();
    setFirma(firmaData);

    // Resolve location names + teknik detaylar UUIDs
    const idsToResolve: string[] = [];
    if (firmaData?.kurulus_il_id) idsToResolve.push(firmaData.kurulus_il_id);
    if (firmaData?.kurulus_ilce_id) idsToResolve.push(firmaData.kurulus_ilce_id);
    if (urunData.urun_kategori_id) idsToResolve.push(urunData.urun_kategori_id);
    if (urunData.urun_grup_id) idsToResolve.push(urunData.urun_grup_id);
    if (urunData.urun_tur_id) idsToResolve.push(urunData.urun_tur_id);

    const teknikData = (urunData.teknik_detaylar as Record<string, any>) || {};
    Object.values(teknikData).forEach(val => {
      if (typeof val === "string" && isUUID(val)) idsToResolve.push(val);
    });

    if (idsToResolve.length > 0) {
      const { data: names } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", [...new Set(idsToResolve)]);
      if (names) {
        const map: Record<string, string> = {};
        names.forEach(n => { map[n.id] = n.name; });
        setSecenekMap(map);
        if (urunData.urun_kategori_id) setBreadcrumbKategori(map[urunData.urun_kategori_id] || "");
        if (urunData.urun_grup_id) setBreadcrumbGrup(map[urunData.urun_grup_id] || "");
        if (urunData.urun_tur_id) setBreadcrumbTur(map[urunData.urun_tur_id] || "");

        const resolved: Record<string, string> = {};
        Object.entries(teknikData).forEach(([key, val]) => {
          if (typeof val === "string" && isUUID(val)) resolved[key] = map[val] || String(val);
          else resolved[key] = val ? String(val) : "";
        });
        setResolvedTeknikDetaylar(resolved);
      }
    } else {
      const resolved: Record<string, string> = {};
      Object.entries(teknikData).forEach(([key, val]) => {
        resolved[key] = val ? String(val) : "";
      });
      setResolvedTeknikDetaylar(resolved);
    }

    // Favorite check
    const { data: fav } = await supabase.from("urun_favoriler").select("id").eq("user_id", currentUserId).eq("urun_id", id).maybeSingle();
    setIsFavorited(!!fav);

    // Similar products
    if (urunData.urun_kategori_id) {
      const { data: benzer } = await supabase
        .from("urunler")
        .select("id, baslik, foto_url, fiyat, fiyat_tipi, para_birimi, urun_no, user_id")
        .eq("durum", "aktif")
        .eq("urun_kategori_id", urunData.urun_kategori_id)
        .neq("id", id)
        .limit(8);

      if (benzer && benzer.length > 0) {
        const userIds = [...new Set(benzer.map(b => b.user_id))];
        const { data: firmalarData } = await supabase.from("firmalar").select("user_id, firma_unvani, logo_url").in("user_id", userIds);
        const fMap: Record<string, { firma_unvani: string; logo_url: string | null }> = {};
        firmalarData?.forEach(f => { fMap[f.user_id] = f; });

        const varyIds = benzer.filter(b => b.fiyat_tipi === "varyasyonlu").map(b => b.id);
        const vPriceMap: Record<string, { min: number; max: number }> = {};
        if (varyIds.length > 0) {
          const { data: vp } = await supabase.from("urun_varyasyonlar").select("urun_id, birim_fiyat").in("urun_id", varyIds);
          vp?.forEach(v => {
            if (!vPriceMap[v.urun_id]) vPriceMap[v.urun_id] = { min: v.birim_fiyat, max: v.birim_fiyat };
            else {
              if (v.birim_fiyat < vPriceMap[v.urun_id].min) vPriceMap[v.urun_id].min = v.birim_fiyat;
              if (v.birim_fiyat > vPriceMap[v.urun_id].max) vPriceMap[v.urun_id].max = v.birim_fiyat;
            }
          });
        }

        setBenzerUrunler(benzer.map(b => ({
          ...b,
          firma_unvani: fMap[b.user_id]?.firma_unvani,
          firma_logo_url: fMap[b.user_id]?.logo_url,
          min_varyant_fiyat: vPriceMap[b.id]?.min ?? null,
          max_varyant_fiyat: vPriceMap[b.id]?.max ?? null,
        })));
      }
    }

    setLoading(false);
  }, [id, currentUserId]);

  useEffect(() => { fetchUrun(); }, [fetchUrun]);

  const toggleFavorite = async () => {
    if (!currentUserId || !id) return;
    if (isFavorited) {
      await supabase.from("urun_favoriler").delete().eq("user_id", currentUserId).eq("urun_id", id);
    } else {
      await supabase.from("urun_favoriler").insert({ user_id: currentUserId, urun_id: id });
    }
    setIsFavorited(!isFavorited);
  };

  const handleSaticiyaSor = async () => {
    if (!currentUserId || !firma || !urun) return;
    const { data: convId } = await supabase.rpc("get_or_create_conversation", {
      p_user1: currentUserId,
      p_user2: firma.user_id,
    });
    if (!convId) return;

    const sym = paraBirimiSymbol[urun.para_birimi || "TRY"] || "₺";
    let priceText = "";
    if (urun.fiyat_tipi === "varyasyonlu" && varyasyonlar.length > 0) {
      const prices = varyasyonlar.map(v => v.birim_fiyat);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      priceText = minP === maxP ? `${sym}${minP.toFixed(2)}` : `${sym}${minP.toFixed(2)} - ${sym}${maxP.toFixed(2)}`;
    } else if (urun.fiyat != null) {
      priceText = `${sym}${urun.fiyat.toFixed(2)}`;
    }

    // Navigate to mesajlar with quote data instead of sending directly
    navigate("/mesajlar", {
      state: {
        openConversationId: convId,
        otherUserId: firma.user_id,
        quote: {
          urunBaslik: urun.baslik,
          urunNo: urun.urun_no,
          fiyat: priceText,
          moq: urun.min_siparis_miktari,
          fotoUrl: urun.foto_url,
        },
      },
    });
  };

  const handleImageZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!urun) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Ürün bulunamadı.</p>
        <Button onClick={() => navigate("/anasayfa")}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  const sym = paraBirimiSymbol[urun.para_birimi || "TRY"] || "₺";
  let priceDisplay: React.ReactNode;
  if (urun.fiyat_tipi === "varyasyonlu" && varyasyonlar.length > 0) {
    const prices = varyasyonlar.map(v => v.birim_fiyat);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    priceDisplay = minP === maxP
      ? <span className="text-2xl font-bold text-foreground">{sym} {minP.toFixed(2)}</span>
      : <span className="text-2xl font-bold text-foreground">{sym} {minP.toFixed(2)} - {sym} {maxP.toFixed(2)}</span>;
  } else if (urun.fiyat != null) {
    priceDisplay = <span className="text-2xl font-bold text-foreground">{sym} {urun.fiyat.toFixed(2)}</span>;
  } else {
    priceDisplay = <span className="text-lg text-muted-foreground">Fiyat bilgisi yok</span>;
  }

  const ilName = firma?.kurulus_il_id ? secenekMap[firma.kurulus_il_id] || "" : "";
  const ilceName = firma?.kurulus_ilce_id ? secenekMap[firma.kurulus_ilce_id] || "" : "";
  const locationText = [ilName, ilceName].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-muted/30 font-sans">
      {/* Header */}
      <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link to="/anasayfa" className="hover:text-foreground transition-colors">Pazar Anasayfa</Link>
          {breadcrumbKategori && (
            <>
              <span>/</span>
              <button
                onClick={() => navigate("/anasayfa", { state: { kategori: breadcrumbKategori, kategoriId: urun.urun_kategori_id } })}
                className="hover:text-foreground transition-colors"
              >
                {breadcrumbKategori}
              </button>
            </>
          )}
          {breadcrumbGrup && (
            <>
              <span>/</span>
              <button
                onClick={() => navigate("/anasayfa", { state: { kategori: breadcrumbKategori, kategoriId: urun.urun_kategori_id, grupId: urun.urun_grup_id } })}
                className="hover:text-foreground transition-colors"
              >
                {breadcrumbGrup}
              </button>
            </>
          )}
          {breadcrumbTur && (
            <>
              <span>/</span>
              <button
                onClick={() => navigate("/anasayfa", { state: { kategori: breadcrumbKategori, kategoriId: urun.urun_kategori_id, grupId: urun.urun_grup_id, turId: urun.urun_tur_id } })}
                className="hover:text-foreground transition-colors"
              >
                {breadcrumbTur}
              </button>
            </>
          )}
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">{urun.baslik}</span>
        </nav>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
          {/* Left: Image Gallery */}
          <div className="lg:col-span-3 flex gap-4">
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex flex-col gap-2 shrink-0">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === i ? "border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain p-0.5" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image */}
            <div className="flex-1 relative">
              <div
                ref={imageContainerRef}
                className="aspect-square bg-background rounded-xl overflow-hidden border border-border relative group"
                onMouseMove={(e) => { handleImageZoomMove(e); setIsZoomed(true); }}
                onMouseLeave={() => setIsZoomed(false)}
                style={{ cursor: "crosshair" }}
              >
                {allImages.length > 0 ? (
                  <img
                    src={allImages[selectedImageIndex]}
                    alt={urun.baslik}
                    className="w-full h-full object-contain transition-transform duration-200"
                    style={isZoomed ? {
                      transform: "scale(2.5)",
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    } : undefined}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}

                {/* Zoom icon overlay */}
                {!isZoomed && (
                  <div className="absolute bottom-3 right-3 p-2 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}

                {/* Favorite button */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(); }}
                  className="absolute top-3 right-3 p-2.5 bg-background/80 rounded-full hover:bg-background transition-colors"
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                </button>
              </div>

              {/* Image nav arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImageIndex(i => i > 0 ? i - 1 : allImages.length - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-background/80 rounded-full hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </button>
                  <button
                    onClick={() => setSelectedImageIndex(i => i < allImages.length - 1 ? i + 1 : 0)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-background/80 rounded-full hover:bg-background transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right: Product Info + Seller */}
          <div className="lg:col-span-2 space-y-4">
            {/* Onay Bloğu - sadece sahip ve duzenleniyor/onay_bekliyor durumunda */}
            {urun.user_id === currentUserId && (urun.durum === "duzenleniyor" || urun.durum === "onay_bekliyor") && (
              <Card className="p-5 border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">
                    {urun.durum === "onay_bekliyor" ? "Onay Bekliyor" : "Önizleme"}
                  </h3>
                  <Badge className={urun.durum === "onay_bekliyor" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}>
                    {urun.durum === "onay_bekliyor" ? "İnceleniyor" : "Taslak"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {urun.durum === "onay_bekliyor"
                    ? "Bu ilan yayına alınmak için onayınızı beklemektedir. Lütfen ilanı inceleyip karar veriniz."
                    : "Ürününüzün önizlemesini kontrol edin. Bilgiler doğruysa onaya gönderin veya düzenlemeye devam edin."}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => navigate(`/manupazar/duzenle/${urun.id}`)}
                  >
                    <Pencil className="w-4 h-4" />
                    Düzenle
                  </Button>
                  {urun.durum === "duzenleniyor" && (
                    <Button
                      className="flex-1 gap-2"
                      onClick={async () => {
                        await supabase.from("urunler").update({ durum: "onay_bekliyor" } as any).eq("id", urun.id);
                        toast({ title: "Ürün onaya gönderildi!" });
                        navigate("/manupazar");
                      }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Onayla
                    </Button>
                  )}
                </div>
              </Card>
            )}
            {/* Product Info Card */}
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">#{urun.urun_no.replace("#", "")}</p>
              <h1 className="text-xl font-bold text-foreground mb-3">{urun.baslik}</h1>
              <div className="mb-4">{priceDisplay}</div>

              {urun.min_siparis_miktari && (
                <div className="flex items-center gap-3 bg-muted rounded-lg px-4 py-3 mb-4">
                  <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground">
                    Minimum Sipariş Miktarı: <strong>{urun.min_siparis_miktari} Adet</strong>
                  </span>
                </div>
              )}

              {/* Renk Seçenekleri */}
              {(() => {
                const uniqueColors = [...new Set(varyasyonlar.filter(v => v.varyant_2_value).map(v => v.varyant_2_value!))];
                if (uniqueColors.length === 0) return null;
                return (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Renk Seçenekleri</h3>
                    <div className="flex flex-wrap gap-2">
                      {uniqueColors.map(color => (
                        <Badge key={color} variant="outline" className="px-3 py-1.5 text-sm font-normal">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <Button
                onClick={handleSaticiyaSor}
                className="w-full h-12 gap-2 text-base"
                disabled={urun.user_id === currentUserId}
              >
                <MessageSquare className="w-5 h-5" />
                Satıcıya Soru Sor
              </Button>
              {urun.user_id !== currentUserId && (
                <Button variant="outline" className="w-full gap-2 text-muted-foreground" onClick={() => setBildirOpen(true)}>
                  <Flag className="w-4 h-4" />
                  Ürünü Bildir
                </Button>
              )}
            </Card>
            {/* Seller Info Card */}
            {firma && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Satıcı Bilgileri</h3>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
                    {firma.logo_url ? (
                      <img src={firma.logo_url} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">{firma.firma_unvani.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600 font-medium">Doğrulanmış</span>
                    </div>
                    <p className="font-semibold text-foreground">{firma.firma_unvani}</p>
                    {locationText && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{locationText}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  {firma.firma_iletisim_numarasi && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Telefon</p>
                        <p className="text-sm font-medium text-foreground">{firma.firma_iletisim_numarasi}</p>
                      </div>
                    </div>
                  )}

                  {firma.web_sitesi && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Website</p>
                        <a href={firma.web_sitesi.startsWith("http") ? firma.web_sitesi : `https://${firma.web_sitesi}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                          {firma.web_sitesi.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    </div>
                  )}

                  {firma.firma_iletisim_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">E-Posta</p>
                        <a href={`mailto:${firma.firma_iletisim_email}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                          {firma.firma_iletisim_email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Social Media */}
                {(firma.linkedin || firma.instagram || firma.facebook || firma.x_twitter || firma.tiktok) && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-2 gap-2">
                      {firma.linkedin && (
                        <a href={firma.linkedin.startsWith("http") ? firma.linkedin : `https://${firma.linkedin}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 border border-border rounded-lg py-2.5 hover:bg-muted transition-colors text-sm text-foreground">
                          <FaLinkedinIn className="w-4 h-4" /> LinkedIn
                        </a>
                      )}
                      {firma.instagram && (
                        <a href={firma.instagram.startsWith("http") ? firma.instagram : `https://instagram.com/${firma.instagram}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 border border-border rounded-lg py-2.5 hover:bg-muted transition-colors text-sm text-foreground">
                          <SiInstagram className="w-4 h-4" /> Instagram
                        </a>
                      )}
                      {firma.facebook && (
                        <a href={firma.facebook.startsWith("http") ? firma.facebook : `https://${firma.facebook}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 border border-border rounded-lg py-2.5 hover:bg-muted transition-colors text-sm text-foreground">
                          <SiFacebook className="w-4 h-4" /> Facebook
                        </a>
                      )}
                      {firma.x_twitter && (
                        <a href={firma.x_twitter.startsWith("http") ? firma.x_twitter : `https://x.com/${firma.x_twitter}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 border border-border rounded-lg py-2.5 hover:bg-muted transition-colors text-sm text-foreground">
                          <RiTwitterXFill className="w-4 h-4" /> X
                        </a>
                      )}
                      {firma.tiktok && (
                        <a href={firma.tiktok.startsWith("http") ? firma.tiktok : `https://tiktok.com/@${firma.tiktok}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 border border-border rounded-lg py-2.5 hover:bg-muted transition-colors text-sm text-foreground">
                          <SiTiktok className="w-4 h-4" /> TikTok
                        </a>
                      )}
                    </div>
                  </>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* Description & Technical Details */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
          <div className="lg:col-span-3 space-y-6">
            {urun.aciklama && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-3">Ürün Açıklaması</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{urun.aciklama}</p>
              </Card>
            )}

            {Object.keys(resolvedTeknikDetaylar).length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Teknik Özellikler</h2>
                <div className="space-y-4">
                  {Object.entries(resolvedTeknikDetaylar).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-sm font-semibold text-foreground">{formatLabel(key)}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{value || "Belirtilmedi"}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Varyasyonlar */}
            {varyasyonlar.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Varyasyonlar</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Görsel</th>
                        <th className="text-left py-2 pr-4 text-muted-foreground font-medium">{varyasyonlar[0]?.varyant_1_label}</th>
                        {varyasyonlar[0]?.varyant_2_label && (
                          <th className="text-left py-2 pr-4 text-muted-foreground font-medium">{varyasyonlar[0].varyant_2_label}</th>
                        )}
                        <th className="text-right py-2 text-muted-foreground font-medium">Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varyasyonlar.map(v => (
                        <tr key={v.id} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4">
                            <img src={v.foto_url} alt="" className="w-10 h-10 rounded object-cover" />
                          </td>
                          <td className="py-2 pr-4 text-foreground">{v.varyant_1_value}</td>
                          {v.varyant_2_label && <td className="py-2 pr-4 text-foreground">{v.varyant_2_value}</td>}
                          <td className="py-2 text-right font-semibold text-foreground">{sym}{v.birim_fiyat.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
          <div className="lg:col-span-2" />
        </div>

        {/* Banner */}
        <div className="rounded-xl overflow-hidden mb-12 h-32 bg-gradient-to-r from-primary to-primary/80 flex items-center px-8">
          <div>
            <p className="text-primary-foreground text-xl font-bold">Tekstil A.Ş. ile Güvenle Alışveriş Yapın</p>
            <p className="text-primary-foreground/70 text-sm mt-1">Binlerce doğrulanmış tedarikçi, rekabetçi fiyatlar</p>
          </div>
        </div>

        {/* Similar Products */}
        {benzerUrunler.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-6">Benzer Ürünlere Göz Atın</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {benzerUrunler.map(b => {
                const bSym = paraBirimiSymbol[b.para_birimi || "TRY"] || "₺";
                let bPrice: React.ReactNode = <span className="text-sm text-muted-foreground">—</span>;
                if (b.fiyat_tipi === "varyasyonlu" && b.min_varyant_fiyat != null && b.max_varyant_fiyat != null) {
                  bPrice = b.min_varyant_fiyat === b.max_varyant_fiyat
                    ? <span className="text-sm font-bold text-foreground">{bSym}{b.min_varyant_fiyat.toFixed(2)}</span>
                    : <span className="text-sm font-bold text-foreground">{bSym}{b.min_varyant_fiyat.toFixed(2)} - {bSym}{b.max_varyant_fiyat.toFixed(2)}</span>;
                } else if (b.fiyat != null) {
                  bPrice = <span className="text-sm font-bold text-foreground">{bSym}{b.fiyat.toFixed(2)}</span>;
                }

                return (
                  <Card key={b.id} className="overflow-hidden hover:shadow-lg transition-shadow group flex flex-col cursor-pointer" onClick={() => navigate(`/urun/${b.id}`)}>
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {b.foto_url ? (
                        <img src={b.foto_url} alt={b.baslik} className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground/40" /></div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <p className="text-sm font-medium text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">{b.baslik}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                          {b.firma_logo_url ? (
                            <img src={b.firma_logo_url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[8px] font-bold text-muted-foreground">{b.firma_unvani?.charAt(0) || "?"}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{b.firma_unvani || ""}</span>
                      </div>
                      <div className="mb-3">{bPrice}</div>
                      <Button size="sm" className="w-full mt-auto">Ürünü Göster</Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>
      {urun && (
        <BildirDialog open={bildirOpen} onOpenChange={setBildirOpen} tur="urun" referansId={urun.id} />
      )}
      <Footer />
    </div>
  );
}
