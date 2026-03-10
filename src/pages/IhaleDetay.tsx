import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  ImageIcon,
  Building2,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  X,
  Phone,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Download,
  CheckCircle2,
  Wifi,
  FileText,
  Send,
  Upload,
} from "lucide-react";
import {
  SiInstagram,
  SiFacebook,
  SiTiktok,
} from "react-icons/si";
import { SiLinkerd } from "react-icons/si";
import { RiTwitterXFill } from "react-icons/ri";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const paraBirimiSymbol: Record<string, string> = {
  TRY: "₺", USD: "$", EUR: "€", GBP: "£",
};

const ihaleTuruLabel: Record<string, string> = {
  urun_alis: "Ürün Alış İhalesi",
  urun_satis: "Ürün Satış İhalesi",
  hizmet_alim: "Hizmet İhalesi",
};

const teklifUsuluLabel: Record<string, string> = {
  acik_arttirma: "Açık Artırma",
  acik_indirme: "Açık İndirme",
  kapali_teklif: "Kapalı Teklif",
};

function useCountdown(targetDate: string | null) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!targetDate) { setRemaining(""); return; }
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Süre doldu"); return; }
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

interface TeklifForList {
  id: string;
  tutar: number;
  created_at: string;
  teklif_veren_user_id: string;
  firma_unvani?: string;
}

export default function IhaleDetay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUserId, setCurrentUserId] = useState("");
  const [headerFirmaUnvani, setHeaderFirmaUnvani] = useState("");
  const [headerFirmaLogoUrl, setHeaderFirmaLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Ihale data
  const [ihale, setIhale] = useState<any>(null);
  const [secenekMap, setSecenekMap] = useState<Record<string, string>>({});

  // Firma (owner)
  const [firma, setFirma] = useState<any>(null);

  // Images
  const [allImages, setAllImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Teklifler
  const [teklifler, setTeklifler] = useState<TeklifForList[]>([]);
  const [myTeklif, setMyTeklif] = useState<TeklifForList | null>(null);
  const [minTeklif, setMinTeklif] = useState<number | null>(null);
  const [maxTeklif, setMaxTeklif] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  // Teklif form
  const [teklifTutar, setTeklifTutar] = useState("");
  const [teklifOdemeSecenekleri, setTeklifOdemeSecenekleri] = useState("");
  const [teklifKargoMasrafi, setTeklifKargoMasrafi] = useState("");
  const [teklifOdemeVadesi, setTeklifOdemeVadesi] = useState("");
  const [teklifDosyaUrl, setTeklifDosyaUrl] = useState<string | null>(null);
  const [teklifDosyaName, setTeklifDosyaName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Stoklar
  const [stoklar, setStoklar] = useState<any[]>([]);

  // Filtreler
  const [ihaleFiltreler, setIhaleFiltreler] = useState<{ filtre_tipi: string; secenek_id: string }[]>([]);

  // Benzer ihaleler
  const [benzerIhaleler, setBenzerIhaleler] = useState<any[]>([]);

  // Breadcrumbs
  const [breadcrumbKategori, setBreadcrumbKategori] = useState("");
  const [breadcrumbGrup, setBreadcrumbGrup] = useState("");
  const [breadcrumbTur, setBreadcrumbTur] = useState("");

  const countdown = useCountdown(ihale?.bitis_tarihi);
  const isOwner = currentUserId && ihale?.user_id === currentUserId;
  const sym = paraBirimiSymbol[ihale?.para_birimi || "TRY"] || "₺";

  // Init user
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/giris-kayit"); return; }
      setCurrentUserId(user.id);
      const { data: f } = await supabase.from("firmalar").select("firma_unvani, logo_url").eq("user_id", user.id).maybeSingle();
      if (f) { setHeaderFirmaUnvani(f.firma_unvani); setHeaderFirmaLogoUrl(f.logo_url); }
    })();
  }, [navigate]);

  // Fetch ihale
  const fetchIhale = useCallback(async () => {
    if (!id || !currentUserId) return;
    setLoading(true);

    const { data: ihaleData, error } = await supabase
      .from("ihaleler")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !ihaleData) { setLoading(false); return; }
    setIhale(ihaleData);

    // Images
    const imgs: string[] = [];
    if (ihaleData.foto_url) imgs.push(ihaleData.foto_url);
    setAllImages(imgs);

    // Resolve all secenek IDs
    const idsToResolve: string[] = [];
    if (ihaleData.urun_kategori_id) idsToResolve.push(ihaleData.urun_kategori_id);
    if (ihaleData.urun_grup_id) idsToResolve.push(ihaleData.urun_grup_id);
    if (ihaleData.urun_tur_id) idsToResolve.push(ihaleData.urun_tur_id);
    if (ihaleData.hizmet_kategori_id) idsToResolve.push(ihaleData.hizmet_kategori_id);
    if (ihaleData.hizmet_tur_id) idsToResolve.push(ihaleData.hizmet_tur_id);

    // Fetch firma, stok, filtreler, teklifler in parallel
    const [firmaRes, stokRes, filtreRes, teklifRes] = await Promise.all([
      supabase.from("firmalar").select("firma_unvani, logo_url, firma_iletisim_numarasi, firma_iletisim_email, web_sitesi, instagram, facebook, linkedin, x_twitter, tiktok, kurulus_il_id, kurulus_ilce_id, user_id").eq("user_id", ihaleData.user_id).maybeSingle(),
      supabase.from("ihale_stok").select("*").eq("ihale_id", id),
      supabase.from("ihale_filtreler").select("filtre_tipi, secenek_id").eq("ihale_id", id),
      supabase.from("ihale_teklifler").select("id, tutar, created_at, teklif_veren_user_id").eq("ihale_id", id).order("created_at", { ascending: false }),
    ]);

    setFirma(firmaRes.data);
    setStoklar(stokRes.data || []);

    // Resolve firma location IDs
    if (firmaRes.data?.kurulus_il_id) idsToResolve.push(firmaRes.data.kurulus_il_id);
    if (firmaRes.data?.kurulus_ilce_id) idsToResolve.push(firmaRes.data.kurulus_ilce_id);

    // Filtreler
    const filtreData = filtreRes.data || [];
    setIhaleFiltreler(filtreData);
    filtreData.forEach(f => idsToResolve.push(f.secenek_id));

    // Resolve names
    if (idsToResolve.length > 0) {
      const { data: names } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", [...new Set(idsToResolve)]);
      if (names) {
        const map: Record<string, string> = {};
        names.forEach(n => { map[n.id] = n.name; });
        setSecenekMap(map);
        if (ihaleData.urun_kategori_id) setBreadcrumbKategori(map[ihaleData.urun_kategori_id] || "");
        if (ihaleData.urun_grup_id) setBreadcrumbGrup(map[ihaleData.urun_grup_id] || "");
        if (ihaleData.urun_tur_id) setBreadcrumbTur(map[ihaleData.urun_tur_id] || "");
        if (ihaleData.hizmet_kategori_id) setBreadcrumbKategori(map[ihaleData.hizmet_kategori_id] || "");
        if (ihaleData.hizmet_tur_id) setBreadcrumbGrup(map[ihaleData.hizmet_tur_id] || "");
      }
    }

    // Teklifler
    const allTeklifler = teklifRes.data || [];
    if (allTeklifler.length > 0) {
      // Get firma names for teklif owners (only if current user is ihale owner)
      const teklifUserIds = [...new Set(allTeklifler.map(t => t.teklif_veren_user_id))];
      let firmaNameMap: Record<string, string> = {};
      if (ihaleData.user_id === currentUserId) {
        const { data: fData } = await supabase.from("firmalar").select("user_id, firma_unvani").in("user_id", teklifUserIds);
        fData?.forEach(f => { firmaNameMap[f.user_id] = f.firma_unvani; });
      }

      const enriched: TeklifForList[] = allTeklifler.map(t => ({
        ...t,
        firma_unvani: firmaNameMap[t.teklif_veren_user_id] || "",
      }));

      setTeklifler(enriched);

      const tutarlar = allTeklifler.map(t => t.tutar);
      setMinTeklif(Math.min(...tutarlar));
      setMaxTeklif(Math.max(...tutarlar));

      // My teklif
      const mine = allTeklifler.filter(t => t.teklif_veren_user_id === currentUserId);
      if (mine.length > 0) {
        setMyTeklif({ ...mine[0], firma_unvani: "" });
      }

      // Rank
      const bestPerUser = new Map<string, number>();
      for (const t of allTeklifler) {
        const existing = bestPerUser.get(t.teklif_veren_user_id);
        if (existing === undefined) {
          bestPerUser.set(t.teklif_veren_user_id, t.tutar);
        } else {
          if (ihaleData.teklif_usulu === "acik_indirme") {
            bestPerUser.set(t.teklif_veren_user_id, Math.min(existing, t.tutar));
          } else {
            bestPerUser.set(t.teklif_veren_user_id, Math.max(existing, t.tutar));
          }
        }
      }
      const sorted = Array.from(bestPerUser.entries()).sort((a, b) => {
        if (ihaleData.teklif_usulu === "acik_indirme") return a[1] - b[1];
        return b[1] - a[1];
      });
      const myIndex = sorted.findIndex(([uid]) => uid === currentUserId);
      if (myIndex >= 0) setMyRank(myIndex + 1);
    }

    // Benzer ihaleler
    const katId = ihaleData.urun_kategori_id || ihaleData.hizmet_kategori_id;
    if (katId) {
      const { data: benzer } = await supabase
        .from("ihaleler")
        .select("id, baslik, foto_url, baslangic_fiyati, para_birimi")
        .eq("durum", "devam_ediyor")
        .neq("id", id)
        .or(`urun_kategori_id.eq.${katId},hizmet_kategori_id.eq.${katId}`)
        .limit(4);
      setBenzerIhaleler(benzer || []);
    }

    // Increment view count
    await supabase.from("ihaleler").update({
      goruntuleme_sayisi: (ihaleData.goruntuleme_sayisi || 0) + 1,
    } as any).eq("id", id);

    setLoading(false);
  }, [id, currentUserId]);

  useEffect(() => { fetchIhale(); }, [fetchIhale]);

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `teklif-docs/${currentUserId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("ihale-files").upload(path, file);
    if (error) {
      toast({ title: "Hata", description: "Dosya yüklenemedi.", variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("ihale-files").getPublicUrl(path);
      setTeklifDosyaUrl(urlData.publicUrl);
      setTeklifDosyaName(file.name);
    }
    setUploading(false);
  };

  // Submit teklif
  const handleTeklifSubmit = () => {
    const tutar = parseFloat(teklifTutar);
    if (!tutar || tutar <= 0) {
      toast({ title: "Hata", description: "Geçerli bir miktar giriniz.", variant: "destructive" });
      return;
    }
    // Check min teklif degisim
    if (ihale?.min_teklif_degisim && myTeklif) {
      const diff = Math.abs(tutar - myTeklif.tutar);
      if (diff < ihale.min_teklif_degisim) {
        toast({ title: "Hata", description: `Minimum teklif değişim tutarı: ${sym}${ihale.min_teklif_degisim}`, variant: "destructive" });
        return;
      }
    }
    setConfirmOpen(true);
  };

  const confirmTeklif = async () => {
    setSubmitting(true);
    const tutar = parseFloat(teklifTutar);
    const { error } = await supabase.from("ihale_teklifler").insert({
      ihale_id: id!,
      teklif_veren_user_id: currentUserId,
      tutar,
    });
    if (error) {
      toast({ title: "Hata", description: "Teklif gönderilemedi.", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Teklifiniz başarıyla gönderildi." });
      setTeklifTutar("");
      setTeklifOdemeSecenekleri("");
      setTeklifKargoMasrafi("");
      setTeklifOdemeVadesi("");
      setTeklifDosyaUrl(null);
      setTeklifDosyaName(null);
      setConfirmOpen(false);
      fetchIhale();
    }
    setSubmitting(false);
  };

  const handleMesajGonder = async () => {
    if (!currentUserId || !firma) return;
    const { data: convId } = await supabase.rpc("get_or_create_conversation", {
      p_user1: currentUserId,
      p_user2: firma.user_id,
    });
    if (convId) navigate("/mesajlar", { state: { openConversationId: convId, otherUserId: firma.user_id } });
  };

  const handleImageZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    setZoomPosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  // Mask firma name: first 2 chars + ***
  const maskName = (name: string) => {
    if (name.length <= 2) return name + "***";
    return name.substring(0, 2) + "***";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!ihale) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">İhale bulunamadı.</p>
        <Button onClick={() => navigate("/tekihale")}>İhalelere Dön</Button>
      </div>
    );
  }

  const ilName = firma?.kurulus_il_id ? secenekMap[firma.kurulus_il_id] || "" : "";
  const ilceName = firma?.kurulus_ilce_id ? secenekMap[firma.kurulus_ilce_id] || "" : "";
  const locationText = [ilName, ilceName].filter(Boolean).join(", ");

  const teknikDetaylar = (ihale.teknik_detaylar as Record<string, any>) || {};

  // Sort teklifler by best
  const sortedTeklifler = [...teklifler].sort((a, b) => {
    if (ihale.teklif_usulu === "acik_indirme") return a.tutar - b.tutar;
    return b.tutar - a.tutar;
  });

  // Group filters by type
  const filtreByType: Record<string, string[]> = {};
  ihaleFiltreler.forEach(f => {
    if (!filtreByType[f.filtre_tipi]) filtreByType[f.filtre_tipi] = [];
    filtreByType[f.filtre_tipi].push(secenekMap[f.secenek_id] || f.secenek_id);
  });

  const kategoriLabel = ihale.ihale_turu === "hizmet_alim"
    ? (ihale.hizmet_kategori_id ? secenekMap[ihale.hizmet_kategori_id] || "" : "")
    : (ihale.urun_kategori_id ? secenekMap[ihale.urun_kategori_id] || "" : "");

  return (
    <div className="min-h-screen bg-muted/30 font-sans">
      <PazarHeader firmaUnvani={headerFirmaUnvani} firmaLogoUrl={headerFirmaLogoUrl} />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link to="/tekihale" className="hover:text-foreground transition-colors">İhale Anasayfa</Link>
          {breadcrumbKategori && <><span>/</span><span>{breadcrumbKategori}</span></>}
          {breadcrumbGrup && <><span>/</span><span>{breadcrumbGrup}</span></>}
          {breadcrumbTur && <><span>/</span><span>{breadcrumbTur}</span></>}
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[300px]">{ihale.baslik}</span>
        </nav>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
          {/* Left: Image + Details */}
          <div className="lg:col-span-3 space-y-6">
            {/* Image Gallery */}
            <div className="flex gap-4">
              {allImages.length > 1 && (
                <div className="flex flex-col gap-2 shrink-0">
                  {allImages.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImageIndex(i)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImageIndex === i ? "border-primary" : "border-border hover:border-primary/50"}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain p-0.5" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 relative">
                <div ref={imageContainerRef}
                  className="aspect-[4/3] bg-background rounded-xl overflow-hidden border border-border relative group cursor-zoom-in"
                  onMouseMove={handleImageZoomMove}
                  onClick={() => allImages.length > 0 && setZoomOpen(true)}
                >
                  {allImages.length > 0 ? (
                    <img src={allImages[selectedImageIndex]} alt={ihale.baslik}
                      className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 p-2 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                {allImages.length > 1 && (
                  <>
                    <button onClick={() => setSelectedImageIndex(i => i > 0 ? i - 1 : allImages.length - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-background/80 rounded-full hover:bg-background">
                      <ChevronLeft className="w-5 h-5 text-foreground" />
                    </button>
                    <button onClick={() => setSelectedImageIndex(i => i < allImages.length - 1 ? i + 1 : 0)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-background/80 rounded-full hover:bg-background">
                      <ChevronRight className="w-5 h-5 text-foreground" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* İhale Açıklaması */}
            {ihale.aciklama && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">İhale Açıklaması</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{ihale.aciklama}</p>
              </Card>
            )}

            {/* İhale Bilgileri */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">İhale Bilgileri</h3>
              <div className="divide-y divide-border">
                <InfoRow label="İhale Türü" value={ihaleTuruLabel[ihale.ihale_turu] || ihale.ihale_turu} />
                <InfoRow label="Teklif Usulü" value={teklifUsuluLabel[ihale.teklif_usulu] || ihale.teklif_usulu} />
                <InfoRow label="İhale Kategorisi" value={kategoriLabel} />
                <InfoRow label="Başlangıç Tarihi" value={ihale.baslangic_tarihi ? format(new Date(ihale.baslangic_tarihi), "dd/MM/yyyy", { locale: tr }) : "-"} />
                <InfoRow label="Bitiş Tarihi" value={ihale.bitis_tarihi ? format(new Date(ihale.bitis_tarihi), "dd/MM/yyyy", { locale: tr }) : "-"} />
                {ihale.teslimat_yeri && <InfoRow label="İhale Bölgesi" value={ihale.teslimat_yeri} />}
                {ihale.firma_adi_gizle !== null && <InfoRow label="Mesaj Durumu" value={ihale.firma_adi_gizle ? "Hayır" : "Evet"} />}
                {Object.keys(filtreByType).length > 0 && (
                  <>
                    {Object.entries(filtreByType).map(([type, values]) => (
                      <InfoRow key={type} label={`İstenen ${type}`} value={values.join(", ")} />
                    ))}
                  </>
                )}
                {ihale.ek_dosya_url && (
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-muted-foreground">İhale Ek Dosyası</span>
                    <a href={ihale.ek_dosya_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Download className="w-4 h-4" /> İndir
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {/* Ödeme Bilgileri */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Ödeme Bilgileri</h3>
              <div className="divide-y divide-border">
                <InfoRow label="İhale Başlangıç Fiyatı (Birim Fiyat)"
                  value={ihale.baslangic_fiyati != null ? `${sym}${Number(ihale.baslangic_fiyati).toLocaleString("tr-TR")}` : "-"} />
                <InfoRow label="KDV Durum Bilgisi" value={ihale.kdv_durumu || "-"} />
                <InfoRow label="Ödeme Seçenekleri" value={ihale.odeme_secenekleri || "-"} />
                <InfoRow label="Tercih Edilen Ödeme Vadeleri" value={ihale.odeme_vadesi || "-"} />
              </div>
            </Card>

            {/* Teslimat & Kargo */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Teslimat & Kargo Bilgileri</h3>
              <div className="divide-y divide-border">
                <InfoRow label="Kargo Masrafı Ödemesi" value={ihale.kargo_masrafi || "-"} />
                <InfoRow label="Kargo Şirketi Anlaşması" value={ihale.kargo_sirketi_anlasmasi || "-"} />
                {ihale.teslimat_tarihi && (
                  <InfoRow label="Teslimat Tarihi" value={format(new Date(ihale.teslimat_tarihi), "dd/MM/yyyy", { locale: tr })} />
                )}
                {ihale.teslimat_yeri && <InfoRow label="Teslimat Yeri" value={ihale.teslimat_yeri} />}
              </div>
            </Card>

            {/* Teknik Detaylar */}
            {Object.keys(teknikDetaylar).length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Ürün/Hizmet Teknik Detaylar</h3>
                <div className="divide-y divide-border">
                  {Object.entries(teknikDetaylar).map(([key, value]) => (
                    <InfoRow key={key} label={key} value={String(value || "-")} />
                  ))}
                </div>
              </Card>
            )}

            {/* Stok Tablosu */}
            {stoklar.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Stok / Varyasyonlar</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{stoklar[0]?.varyant_1_label || "Varyant 1"}</TableHead>
                      {stoklar[0]?.varyant_2_label && <TableHead>{stoklar[0].varyant_2_label}</TableHead>}
                      <TableHead>Miktar Tipi</TableHead>
                      <TableHead className="text-right">Stok</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stoklar.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.varyant_1_value}</TableCell>
                        {stoklar[0]?.varyant_2_label && <TableCell>{s.varyant_2_value || "-"}</TableCell>}
                        <TableCell>{s.miktar_tipi}</TableCell>
                        <TableCell className="text-right font-medium">{s.stok_sayisi}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title & Countdown */}
            <Card className="p-6">
              <h1 className="text-xl font-bold text-foreground mb-2">{ihale.baslik}</h1>
              <p className="text-sm text-muted-foreground mb-3">#{ihale.ihale_no}</p>
              {countdown && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-2.5 mb-4">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{countdown}</span>
                </div>
              )}

              {/* Teklif Formu - sadece ihale sahibi değilse */}
              {!isOwner && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Miktar</label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder={`Min ${sym}${ihale.baslangic_fiyati ? Number(ihale.baslangic_fiyati).toFixed(2) : "0.00"}`}
                        value={teklifTutar}
                        onChange={(e) => setTeklifTutar(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Ödeme Seçenekleri</label>
                    <Input
                      placeholder="Ödeme Seçenekleri"
                      value={teklifOdemeSecenekleri}
                      onChange={(e) => setTeklifOdemeSecenekleri(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Kargo masrafı ödemesi</label>
                    <Select value={teklifKargoMasrafi} onValueChange={setTeklifKargoMasrafi}>
                      <SelectTrigger><SelectValue placeholder="Kargo masrafı ödemesi" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alıcı Öder">Alıcı Öder</SelectItem>
                        <SelectItem value="Satıcı Öder">Satıcı Öder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Ödeme Vadesi</label>
                    <Input
                      placeholder="Ödeme Vadesi"
                      value={teklifOdemeVadesi}
                      onChange={(e) => setTeklifOdemeVadesi(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="relative flex items-center justify-center gap-2 h-12 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploading ? "Yükleniyor..." : teklifDosyaName || "Belge yükle"}
                      </span>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                  </div>
                  <Button className="w-full h-12 gap-2 text-base" onClick={handleTeklifSubmit}>
                    <Send className="w-4 h-4" /> Teklif Ver
                  </Button>
                </div>
              )}
            </Card>

            {/* Teklifler Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-foreground">Teklifler</h3>
                </div>
                <Badge className="bg-destructive text-destructive-foreground text-xs">Canlı</Badge>
              </div>

              {/* Min / Max / My */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Min Teklif</p>
                  <p className="font-bold text-foreground text-sm">
                    {minTeklif != null ? `${sym}${minTeklif.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Maks Teklif</p>
                  <p className="font-bold text-foreground text-sm">
                    {maxTeklif != null ? `${sym}${maxTeklif.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sizin Teklifiniz</p>
                  <p className="font-bold text-foreground text-sm">
                    {myTeklif ? `${sym}${myTeklif.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}
                  </p>
                </div>
              </div>

              {myRank && (
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Teklif sıranız: <strong className="text-foreground">{myRank}.</strong>
                </p>
              )}

              {/* Teklif list */}
              {sortedTeklifler.length > 0 ? (
                <div className="space-y-0">
                  <div className="grid grid-cols-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium py-2 border-b border-border">
                    <span>Teklif Veren</span>
                    <span className="text-center">Zaman</span>
                    <span className="text-right">Teklif</span>
                  </div>
                  {sortedTeklifler.map((t, i) => (
                    <div key={t.id} className={`grid grid-cols-3 py-2.5 text-sm border-b border-border/50 ${t.teklif_veren_user_id === currentUserId ? "bg-primary/5 rounded" : ""}`}>
                      <span className="text-muted-foreground">
                        {isOwner ? (t.firma_unvani || "Anonim") : maskName(t.firma_unvani || `Firma ${i + 1}`)}
                      </span>
                      <span className="text-center text-muted-foreground text-xs">
                        {format(new Date(t.created_at), "dd/MM HH:mm")}
                      </span>
                      <span className="text-right font-medium text-foreground">
                        {isOwner ? `${sym}${t.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : `${sym}***`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz teklif yok.</p>
              )}
            </Card>

            {/* İhale Sahibi Firma */}
            {!ihale.firma_adi_gizle && firma && (
              <Card className="p-6">
                <h3 className="font-bold text-foreground mb-4">İhale Sahibi Firma</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
                    {firma.logo_url ? (
                      <img src={firma.logo_url} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{firma.firma_unvani}</p>
                    {locationText && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" /> {locationText}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {firma.firma_iletisim_numarasi && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div><p className="text-xs text-muted-foreground">Telefon</p><p className="text-sm font-medium">{firma.firma_iletisim_numarasi}</p></div>
                    </div>
                  )}
                  {firma.web_sitesi && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <div><p className="text-xs text-muted-foreground">Website</p><p className="text-sm font-medium">{firma.web_sitesi}</p></div>
                    </div>
                  )}
                  {firma.firma_iletisim_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div><p className="text-xs text-muted-foreground">E-Posta</p><p className="text-sm font-medium">{firma.firma_iletisim_email}</p></div>
                    </div>
                  )}

                  {/* Social */}
                  {(firma.instagram || firma.facebook || firma.linkedin || firma.x_twitter || firma.tiktok) && (
                    <div className="flex items-center gap-3 pt-2">
                      {firma.instagram && <a href={firma.instagram} target="_blank" rel="noopener noreferrer"><SiInstagram className="w-4 h-4 text-muted-foreground hover:text-foreground" /></a>}
                      {firma.facebook && <a href={firma.facebook} target="_blank" rel="noopener noreferrer"><SiFacebook className="w-4 h-4 text-muted-foreground hover:text-foreground" /></a>}
                      {firma.linkedin && <a href={firma.linkedin} target="_blank" rel="noopener noreferrer"><SiLinkerd className="w-4 h-4 text-muted-foreground hover:text-foreground" /></a>}
                      {firma.x_twitter && <a href={firma.x_twitter} target="_blank" rel="noopener noreferrer"><RiTwitterXFill className="w-4 h-4 text-muted-foreground hover:text-foreground" /></a>}
                      {firma.tiktok && <a href={firma.tiktok} target="_blank" rel="noopener noreferrer"><SiTiktok className="w-4 h-4 text-muted-foreground hover:text-foreground" /></a>}
                    </div>
                  )}
                </div>

                {!isOwner && (
                  <Button className="w-full mt-4 gap-2" onClick={handleMesajGonder}>
                    <MessageSquare className="w-4 h-4" /> Mesaj Gönder
                  </Button>
                )}
              </Card>
            )}

            {/* Benzer İhaleler */}
            {benzerIhaleler.length > 0 && (
              <Card className="p-6">
                <h3 className="font-bold text-foreground mb-4">Benzer İhaleler</h3>
                <div className="space-y-3">
                  {benzerIhaleler.map((b) => (
                    <div key={b.id} className="flex gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                      onClick={() => navigate(`/tekihale/${b.id}`)}>
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {b.foto_url ? (
                          <img src={b.foto_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2">{b.baslik}</p>
                        {b.baslangic_fiyati && (
                          <p className="text-sm font-bold text-foreground mt-1">
                            {paraBirimiSymbol[b.para_birimi || "TRY"] || "₺"}{Number(b.baslangic_fiyati).toLocaleString("tr-TR")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Zoom Modal */}
      {zoomOpen && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setZoomOpen(false)}>
          <button className="absolute top-4 right-4 p-2 bg-background/20 rounded-full hover:bg-background/40">
            <X className="w-6 h-6 text-white" />
          </button>
          <img src={allImages[selectedImageIndex]} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Teklif Onay Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Teklifini Onayla
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Ürün</p>
                <p className="font-semibold text-foreground text-sm">{ihale.baslik}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Teklifiniz</p>
                <p className="font-semibold text-foreground text-sm">{sym}{parseFloat(teklifTutar || "0").toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="space-y-2">
              {teklifKargoMasrafi && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kargo masrafı ödemesi</span>
                  <span className="font-medium">{teklifKargoMasrafi}</span>
                </div>
              )}
              {teklifOdemeSecenekleri && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ödeme Seçenekleri</span>
                  <span className="font-medium">{teklifOdemeSecenekleri}</span>
                </div>
              )}
              {teklifOdemeVadesi && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ödeme Vadesi</span>
                  <span className="font-medium">{teklifOdemeVadesi}</span>
                </div>
              )}
              {teklifDosyaName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dosya</span>
                  <span className="font-medium">{teklifDosyaName}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => setConfirmOpen(false)}>
                <ChevronLeft className="w-4 h-4" /> Teklifi Düzenle
              </Button>
              <Button className="flex-1 gap-2" onClick={confirmTeklif} disabled={submitting}>
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? "Gönderiliyor..." : "Hemen Teklif Ver"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value || "-"}</span>
    </div>
  );
}
