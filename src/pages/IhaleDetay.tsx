import { useEffect, useState, useCallback, useRef } from "react";
import ihaleDefaultCover from "@/assets/ihale-default-cover.png";
import FirmaAvatar from "@/components/FirmaAvatar";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBanner } from "@/hooks/use-banner";
import PazarHeader from "@/components/PazarHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import SearchableSelect from "@/components/ui/searchable-select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Trash2,
  Flag,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Instagram, Facebook, Linkedin, Twitter } from "lucide-react";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.17v-3.44a4.85 4.85 0 01-2-.71v-4.53z"/></svg>
);
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import BildirDialog from "@/components/BildirDialog";
import { usePackageQuota, canPerformAction } from "@/hooks/use-package-quota";
import UpgradeDialog from "@/components/UpgradeDialog";

// Check if a value looks like a UUID
const isUUID = (val: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// Format key to readable Turkish label
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
    hedeflenen_pazar: "Hedeflenen Pazar", siparis_turu: "Sipariş Türü", urun_segmenti: "Ürün Segmenti",
    tasarim_turu: "Tasarım Türü", dosya_format: "Dosya Teslim Formatı", revizyon_hakki: "Revizyon Hakkı",
    hizmet_urun_kategori: "Hizmet Ürün Kategorisi", hizmet_urun_grup: "Hizmet Ürün Grubu",
    hizmet_urun_tur: "Hizmet Ürün Türü", hedef_urun_kategori: "Hedef Ürün Kategorisi",
    hedef_urun_grup: "Hedef Ürün Grubu", hedef_urun_tur: "Hedef Ürün Türü",
    mumessil_urun_kategori: "Mümessil Ürün Kategorisi", mumessil_urun_grup: "Mümessil Ürün Grubu",
    mumessil_urun_tur: "Mümessil Ürün Türü",
  };
  if (turkishMap[key]) return turkishMap[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

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

const IHALE_RED_SEBEPLERI = [
  "Eksik ihale bilgisi",
  "Yetersiz veya belirsiz ihale açıklaması",
  "Yanlış kategori seçimi",
  "Yanlış ihale türü seçimi",
  "Teknik şartnamenin eksik olması",
  "Teslimat veya termin bilgilerinin eksik olması",
  "Miktar bilgisinin belirtilmemesi",
  "Platform kurallarına aykırı içerik",
  "Platform dışı iletişim bilgisi paylaşımı",
  "Reklam veya yönlendirme içerikleri",
  "Tekstil kapsamı dışı ihale",
  "Yasaklı ürün veya hizmet talebi",
  "Sahte veya yanıltıcı ihale",
  "Gerçekçi olmayan fiyat veya bütçe bilgisi",
  "Yinelenen (duplicate) ihale",
  "Yanıltıcı veya yanlış bilgi içeren ihale",
  "Spam amaçlı ihale açılması",
  "Telif veya marka ihlali içeren ihale talebi",
  "Platform standartlarına uygun olmayan ihale başlığı",
  "Eksik teknik detaylar",
  "İhale başlangıç veya bitiş tarihinin kurallara uygun olmaması",
  "Platform güvenliği açısından riskli ihale",
  "Doğrulanmamış veya şüpheli kullanıcı tarafından açılan ihale",
];

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
  odeme_secenekleri?: string | null;
  kargo_masrafi?: string | null;
  odeme_vadesi?: string | null;
  ek_dosya_url?: string | null;
  ek_dosya_adi?: string | null;
}

export default function IhaleDetay() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const ihaleDetayBanner = useBanner("ihale-detay-alt-banner");

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
  const [ekDosyalar, setEkDosyalar] = useState<any[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
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
  const [bildirOpen, setBildirOpen] = useState(false);
  const packageInfo = usePackageQuota();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  // Admin state
  const [isAdminViewing, setIsAdminViewing] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [redSebebi, setRedSebebi] = useState("");

  // DB dropdown options
  const [dbOdemeSecenekleri, setDbOdemeSecenekleri] = useState<string[]>([]);
  const [dbKargoMasrafi, setDbKargoMasrafi] = useState<string[]>([]);
  const [dbOdemeVadeleri, setDbOdemeVadeleri] = useState<string[]>([]);

  // Stoklar
  const [stoklar, setStoklar] = useState<any[]>([]);

  // Filtreler
  const [ihaleFiltreler, setIhaleFiltreler] = useState<{ filtre_tipi: string; secenek_id: string }[]>([]);
  const [filterBlockMessage, setFilterBlockMessage] = useState<string | null>(null);

  // Benzer ihaleler
  const [benzerIhaleler, setBenzerIhaleler] = useState<any[]>([]);

  // Resolved teknik detaylar (UUID -> name)
  const [resolvedTeknikDetaylar, setResolvedTeknikDetaylar] = useState<Record<string, string>>({});

  // Breadcrumbs
  const [breadcrumbKategori, setBreadcrumbKategori] = useState("");
  const [breadcrumbGrup, setBreadcrumbGrup] = useState("");
  const [breadcrumbTur, setBreadcrumbTur] = useState("");

  const countdown = useCountdown(ihale?.bitis_tarihi);
  const isOwner = currentUserId && ihale?.user_id === currentUserId;
  const sym = paraBirimiSymbol[ihale?.para_birimi || "TRY"] || "₺";

  // Load dropdown options from DB
  useEffect(() => {
    const loadOptions = async () => {
      const { data: cats } = await supabase
        .from("firma_bilgi_kategorileri")
        .select("id, name")
        .in("name", ["Ödeme Seçenekleri", "Kargo Masrafı Ödemesi", "Ödeme Vadeleri"]);

      if (!cats) return;

      const catMap: Record<string, string> = {};
      cats.forEach(c => { catMap[c.name] = c.id; });

      const catIds = cats.map(c => c.id);
      if (catIds.length === 0) return;

      const { data: opts } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("name, kategori_id")
        .in("kategori_id", catIds)
        .is("parent_id", null)
        .order("name");

      if (!opts) return;

      const odeme: string[] = [];
      const kargo: string[] = [];
      const vade: string[] = [];

      opts.forEach(o => {
        if (o.name.toLowerCase().includes("belirtmek")) return; // exclude "Belirtmek İstemiyorum"
        if (o.kategori_id === catMap["Ödeme Seçenekleri"]) odeme.push(o.name);
        else if (o.kategori_id === catMap["Kargo Masrafı Ödemesi"]) kargo.push(o.name);
        else if (o.kategori_id === catMap["Ödeme Vadeleri"]) vade.push(o.name);
      });

      setDbOdemeSecenekleri(odeme);
      setDbKargoMasrafi(kargo);
      setDbOdemeVadeleri(vade);
    };
    loadOptions();
  }, []);

  // Init user
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const adminToken = localStorage.getItem("admin_token");
        if (adminToken) { setIsAdminViewing(true); }
        // Allow anonymous users to view ihale details (no redirect)
        return;
      }
      setCurrentUserId(user.id);
      const { data: f } = await supabase.from("firmalar").select("firma_unvani, logo_url").eq("user_id", user.id).maybeSingle();
      if (f) { setHeaderFirmaUnvani(f.firma_unvani); setHeaderFirmaLogoUrl(f.logo_url); }
    })();
  }, [navigate]);

  // Fetch ihale
  const fetchIhale = useCallback(async () => {
    if (!slugParam) return;
    const adminToken = localStorage.getItem("admin_token");
    // Allow fetch for anonymous users too
    setLoading(true);

    let ihaleData: any = null;
    const isId = isUUID(slugParam);

    const { data: directData, error } = await supabase
      .from("ihaleler")
      .select("*")
      .eq(isId ? "id" : "slug", slugParam)
      .single();

    if (directData) {
      ihaleData = directData;
    } else {
      // Fallback: try admin edge function if admin token exists
      const adminToken = localStorage.getItem("admin_token");
      if (adminToken) {
        try {
          const { data: adminRes, error: adminErr } = await supabase.functions.invoke("admin-auth/get-ihale-detail", {
            body: { token: adminToken, ihaleId: slugParam },
          });
          if (!adminErr && adminRes?.ihale) {
            ihaleData = adminRes.ihale;
            setIsAdminViewing(true);
          }
        } catch {}
      }
    }

    if (!ihaleData) { setLoading(false); return; }
    setIhale(ihaleData);
    const ihaleId = ihaleData.id;

    // Images - load from ihale_fotograflar table, fallback to foto_url
    const { data: fotoRows } = await supabase
      .from("ihale_fotograflar" as any)
      .select("foto_url, sira")
      .eq("ihale_id", ihaleId)
      .order("sira");
    
    const imgs: string[] = (fotoRows || []).map((f: any) => f.foto_url);
    if (imgs.length === 0 && ihaleData.foto_url) imgs.push(ihaleData.foto_url);
    setAllImages(imgs);

    // Load ek dosyalar
    const { data: ekRows } = await supabase
      .from("ihale_ek_dosyalar" as any)
      .select("dosya_url, dosya_adi, sira")
      .eq("ihale_id", ihaleId)
      .order("sira");
    setEkDosyalar(ekRows || []);

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
      supabase.from("ihale_stok").select("*").eq("ihale_id", ihaleId),
      supabase.from("ihale_filtreler").select("filtre_tipi, secenek_id").eq("ihale_id", ihaleId),
      supabase.from("ihale_teklifler").select("id, tutar, created_at, teklif_veren_user_id, odeme_secenekleri, kargo_masrafi, odeme_vadesi, ek_dosya_url, ek_dosya_adi").eq("ihale_id", ihaleId).order("created_at", { ascending: false }),
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

    // Check if current user passes filter requirements
    if (filtreData.length > 0 && currentUserId && ihaleData.user_id !== currentUserId && ihaleData.ozel_filtreleme) {
      try {
        const blockReasons: string[] = [];
        
        // Get current user's firma details
        const { data: myFirma } = await supabase.from("firmalar")
          .select("firma_turu_id, firma_tipi_id, firma_olcegi_id, kurulus_il_id")
          .eq("user_id", currentUserId).maybeSingle();

        // Firma Türü check
        const firmaTuruFilters = filtreData.filter(f => f.filtre_tipi === "firma_turu");
        if (firmaTuruFilters.length > 0 && myFirma) {
          if (!firmaTuruFilters.some(f => f.secenek_id === myFirma.firma_turu_id)) {
            blockReasons.push("Firma Türü");
          }
        }

        // Firma Tipi check
        const firmaTipiFilters = filtreData.filter(f => f.filtre_tipi === "firma_tipi");
        if (firmaTipiFilters.length > 0 && myFirma) {
          if (!firmaTipiFilters.some(f => f.secenek_id === myFirma.firma_tipi_id)) {
            blockReasons.push("Firma Tipi");
          }
        }

        // İl check
        const ilFilters = filtreData.filter(f => f.filtre_tipi === "il");
        if (ilFilters.length > 0 && myFirma) {
          if (!ilFilters.some(f => f.secenek_id === myFirma.kurulus_il_id)) {
            blockReasons.push("İl");
          }
        }

        // Firma Ölçeği check - hierarchical: orta -> orta+büyük, büyük -> sadece büyük
        const olcekFilters = filtreData.filter(f => f.filtre_tipi === "firma_olcegi");
        if (olcekFilters.length > 0 && myFirma) {
          // Get names for comparison
          const olcekIds = olcekFilters.map(f => f.secenek_id);
          const { data: olcekNames } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", olcekIds);
          const requiredOlcekNames = (olcekNames || []).map(o => o.name.toLowerCase());
          
          let userOlcekName = "";
          if (myFirma.firma_olcegi_id) {
            const { data: myOlcek } = await supabase.from("firma_bilgi_secenekleri").select("name").eq("id", myFirma.firma_olcegi_id).single();
            userOlcekName = myOlcek?.name?.toLowerCase() || "";
          }

          // Logic: if "orta" is required -> orta and büyük pass. If "büyük" -> only büyük passes.
          const olcekHierarchy = ["küçük", "orta", "büyük"];
          const userLevel = olcekHierarchy.indexOf(userOlcekName.includes("küçük") ? "küçük" : userOlcekName.includes("orta") ? "orta" : userOlcekName.includes("büyük") ? "büyük" : "");
          const minRequired = Math.min(...requiredOlcekNames.map(n => {
            if (n.includes("küçük")) return 0;
            if (n.includes("orta")) return 1;
            if (n.includes("büyük")) return 2;
            return 0;
          }));
          
          if (userLevel < minRequired) {
            blockReasons.push("Firma Ölçeği");
          }
        }

        // Sertifika check - all required certificates must be present
        const sertifikaFilters = filtreData.filter(f => f.filtre_tipi === "sertifika");
        if (sertifikaFilters.length > 0) {
          const { data: mySertifikalar } = await supabase.from("firma_sertifikalar")
            .select("sertifika_tur_id")
            .eq("firma_id", (await supabase.from("firmalar").select("id").eq("user_id", currentUserId).maybeSingle()).data?.id || "");
          
          const mySertIds = (mySertifikalar || []).map(s => s.sertifika_tur_id);
          const missingCerts = sertifikaFilters.filter(f => !mySertIds.includes(f.secenek_id));
          if (missingCerts.length > 0) {
            blockReasons.push("Sertifika");
          }
        }

        if (blockReasons.length > 0) {
          setFilterBlockMessage(`Bu ihaleye teklif verebilmek için gerekli şartları karşılamıyorsunuz. Eksik kriterler: ${blockReasons.join(", ")}. İhale sahibi bu alanlar için özel filtreleme uygulamıştır.`);
        } else {
          setFilterBlockMessage(null);
        }
      } catch {
        setFilterBlockMessage(null);
      }
    } else {
      setFilterBlockMessage(null);
    }

    // Collect UUID values from teknik_detaylar for resolving (supports both single UUIDs and arrays)
    const teknikData = (ihaleData.teknik_detaylar as Record<string, any>) || {};
    Object.values(teknikData).forEach(val => {
      if (typeof val === "string" && isUUID(val)) {
        idsToResolve.push(val);
      } else if (Array.isArray(val)) {
        val.forEach(v => { if (typeof v === "string" && isUUID(v)) idsToResolve.push(v); });
      }
    });

    // Resolve names
    if (idsToResolve.length > 0) {
      const uniqueIds = [...new Set(idsToResolve)];
      const [secenekRes, turleriRes, tipleriRes] = await Promise.all([
        supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", uniqueIds),
        supabase.from("firma_turleri").select("id, name").in("id", uniqueIds),
        supabase.from("firma_tipleri").select("id, name").in("id", uniqueIds),
      ]);
      const map: Record<string, string> = {};
      secenekRes.data?.forEach(n => { map[n.id] = n.name; });
      turleriRes.data?.forEach(n => { map[n.id] = n.name; });
      tipleriRes.data?.forEach(n => { map[n.id] = n.name; });
      if (Object.keys(map).length > 0) {
        setSecenekMap(map);
        if (ihaleData.urun_kategori_id) setBreadcrumbKategori(map[ihaleData.urun_kategori_id] || "");
        if (ihaleData.urun_grup_id) setBreadcrumbGrup(map[ihaleData.urun_grup_id] || "");
        if (ihaleData.urun_tur_id) setBreadcrumbTur(map[ihaleData.urun_tur_id] || "");
        if (ihaleData.hizmet_kategori_id) setBreadcrumbKategori(map[ihaleData.hizmet_kategori_id] || "");
        if (ihaleData.hizmet_tur_id) setBreadcrumbGrup(map[ihaleData.hizmet_tur_id] || "");

        // Resolve teknik detaylar values (single UUID, array of UUIDs, or plain text)
        const resolved: Record<string, string> = {};
        Object.entries(teknikData).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            const resolvedNames = val
              .map(v => (typeof v === "string" && isUUID(v) ? map[v] : v))
              .filter(Boolean);
            resolved[key] = resolvedNames.length > 0 ? resolvedNames.join(", ") : "";
          } else if (typeof val === "string" && isUUID(val)) {
            resolved[key] = map[val] || String(val);
          } else {
            resolved[key] = val ? String(val) : "";
          }
        });
        setResolvedTeknikDetaylar(resolved);
      }
    } else {
      // No UUIDs to resolve, just use raw values
      const resolved: Record<string, string> = {};
      Object.entries(teknikData).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          resolved[key] = val.filter(Boolean).join(", ");
        } else {
          resolved[key] = val ? String(val) : "";
        }
      });
      setResolvedTeknikDetaylar(resolved);
    }

    // Teklifler - only latest per user counts
    const allTeklifler = (teklifRes.data || []) as any[];
    if (allTeklifler.length > 0) {
      const teklifUserIds = [...new Set(allTeklifler.map(t => t.teklif_veren_user_id))];
      let firmaNameMap: Record<string, string> = {};
      const { data: fData } = await supabase.from("firmalar").select("user_id, firma_unvani").in("user_id", teklifUserIds);
      fData?.forEach(f => { firmaNameMap[f.user_id] = f.firma_unvani; });

      // Deduplicate: keep only latest teklif per user (already sorted desc by created_at)
      const latestPerUser = new Map<string, any>();
      for (const t of allTeklifler) {
        if (!latestPerUser.has(t.teklif_veren_user_id)) {
          latestPerUser.set(t.teklif_veren_user_id, t);
        }
      }
      const uniqueTeklifler = Array.from(latestPerUser.values());

      const enriched: TeklifForList[] = uniqueTeklifler.map(t => ({
        ...t,
        firma_unvani: firmaNameMap[t.teklif_veren_user_id] || "",
      }));

      setTeklifler(enriched);

      // Min/max based on latest per user only
      const tutarlar = uniqueTeklifler.map(t => t.tutar);
      setMinTeklif(Math.min(...tutarlar));
      setMaxTeklif(Math.max(...tutarlar));

      // My teklif - get the latest one and pre-fill form
      const myLatest = latestPerUser.get(currentUserId);
      if (myLatest) {
        setMyTeklif({ ...myLatest, firma_unvani: "" });
        setTeklifTutar(String(myLatest.tutar));
        if (myLatest.odeme_secenekleri) setTeklifOdemeSecenekleri(myLatest.odeme_secenekleri);
        if (myLatest.kargo_masrafi) setTeklifKargoMasrafi(myLatest.kargo_masrafi);
        if (myLatest.odeme_vadesi) setTeklifOdemeVadesi(myLatest.odeme_vadesi);
        if (myLatest.ek_dosya_url) { setTeklifDosyaUrl(myLatest.ek_dosya_url); setTeklifDosyaName(myLatest.ek_dosya_adi || "Dosya"); }
      }

      // Rank based on latest per user
      const sorted = uniqueTeklifler.sort((a: any, b: any) => {
        if (ihaleData.teklif_usulu === "acik_indirme") return a.tutar - b.tutar;
        return b.tutar - a.tutar;
      });
      const myIndex = sorted.findIndex((t: any) => t.teklif_veren_user_id === currentUserId);
      if (myIndex >= 0) setMyRank(myIndex + 1);
    }

    // Benzer ihaleler
    const katId = ihaleData.urun_kategori_id || ihaleData.hizmet_kategori_id;
    if (katId) {
      const { data: benzer } = await supabase
        .from("ihaleler")
        .select("id, baslik, foto_url, baslangic_fiyati, para_birimi, slug")
        .eq("durum", "devam_ediyor")
        .neq("id", ihaleId)
        .or(`urun_kategori_id.eq.${katId},hizmet_kategori_id.eq.${katId}`)
        .limit(4);
      setBenzerIhaleler(benzer || []);
    }

    // Increment view count
    await supabase.from("ihaleler").update({
      goruntuleme_sayisi: (ihaleData.goruntuleme_sayisi || 0) + 1,
    } as any).eq("id", ihaleId);

    setLoading(false);
  }, [slugParam, currentUserId]);

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
    // Quota check - only if this is a NEW ihale (user hasn't bid on this one before)
    if (!myTeklif) {
      const check = canPerformAction(packageInfo.limits, packageInfo.usage, "teklif_verme");
      if (!check.allowed) {
        setUpgradeMessage(check.message || "Teklif verme hakkınız dolmuştur.");
        setUpgradeOpen(true);
        return;
      }
    }

    const tutar = parseFloat(teklifTutar);
    if (!tutar || tutar <= 0) {
      toast({ title: "Hata", description: "Geçerli bir miktar giriniz.", variant: "destructive" });
      return;
    }

    // Aynı tutar verilebilir - kısıtlama yok

    // Hizmet ihalesi + kapalı teklif: başlangıç fiyatından yüksek teklif verilemez
    if (ihale?.ihale_turu === "hizmet_alim" && ihale?.teklif_usulu === "kapali_teklif") {
      const basFiyat = ihale.baslangic_fiyati ? Number(ihale.baslangic_fiyati) : null;
      if (basFiyat !== null && tutar > basFiyat) {
        const sym = ihale.para_birimi === "USD" ? "$" : ihale.para_birimi === "EUR" ? "€" : ihale.para_birimi === "GBP" ? "£" : "₺";
        toast({ title: "Hata", description: `Hizmet ihalelerinde başlangıç fiyatından (${sym}${basFiyat.toLocaleString("tr-TR")}) yüksek teklif verilemez.`, variant: "destructive" });
        return;
      }
    }

    // Açık usullerde: son teklif varsa ona göre, yoksa başlangıç fiyatına göre kontrol
    const otherTeklifler = teklifler.filter(t => t.teklif_veren_user_id !== currentUserId);
    const baslangicFiyati = ihale?.baslangic_fiyati ? Number(ihale.baslangic_fiyati) : null;

    if (ihale?.teklif_usulu === "acik_indirme") {
      // Referans fiyat: diğer tekliflerin en düşüğü, yoksa başlangıç fiyatı
      const referansFiyat = otherTeklifler.length > 0
        ? Math.min(...otherTeklifler.map(t => Number(t.tutar)))
        : baslangicFiyati;

      if (referansFiyat !== null) {
        if (ihale.min_teklif_degisim) {
          if (tutar > referansFiyat - ihale.min_teklif_degisim) {
            toast({ title: "Hata", description: `Yeni teklif, referans fiyattan (${sym}${referansFiyat.toLocaleString("tr-TR")}) en az ${sym}${ihale.min_teklif_degisim} düşük olmalıdır.`, variant: "destructive" });
            return;
          }
        } else {
          if (tutar > referansFiyat) {
            toast({ title: "Hata", description: `Açık indirmede teklif, ${sym}${referansFiyat.toLocaleString("tr-TR")} veya daha düşük olmalıdır.`, variant: "destructive" });
            return;
          }
        }
      }
    }

    if (ihale?.teklif_usulu === "acik_arttirma") {
      // Referans fiyat: diğer tekliflerin en yükseği, yoksa başlangıç fiyatı
      const referansFiyat = otherTeklifler.length > 0
        ? Math.max(...otherTeklifler.map(t => Number(t.tutar)))
        : baslangicFiyati;

      if (referansFiyat !== null) {
        if (ihale.min_teklif_degisim) {
          if (tutar < referansFiyat + ihale.min_teklif_degisim) {
            toast({ title: "Hata", description: `Yeni teklif, referans fiyattan (${sym}${referansFiyat.toLocaleString("tr-TR")}) en az ${sym}${ihale.min_teklif_degisim} yüksek olmalıdır.`, variant: "destructive" });
            return;
          }
        } else {
          if (tutar < referansFiyat) {
            toast({ title: "Hata", description: `Açık arttırmada teklif, ${sym}${referansFiyat.toLocaleString("tr-TR")} veya daha yüksek olmalıdır.`, variant: "destructive" });
            return;
          }
        }
      }
    }

    setConfirmOpen(true);
  };

  const confirmTeklif = async () => {
    setSubmitting(true);
    const tutar = parseFloat(teklifTutar);
    const { error } = await supabase.from("ihale_teklifler").insert({
      ihale_id: ihale.id,
      teklif_veren_user_id: currentUserId,
      tutar,
      odeme_secenekleri: teklifOdemeSecenekleri || null,
      kargo_masrafi: teklifKargoMasrafi || null,
      odeme_vadesi: teklifOdemeVadesi || null,
      ek_dosya_url: teklifDosyaUrl || null,
      ek_dosya_adi: teklifDosyaName || null,
    } as any);
    if (error) {
      toast({ title: "Hata", description: "Teklif gönderilemedi.", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Teklifiniz başarıyla gönderildi." });
      setConfirmOpen(false);
      fetchIhale();
      // Update last seen on action
      import("@/hooks/use-last-seen").then(m => m.updateLastSeen());

      // Send email to ihale owner about new bid
      try {
        const { data: bidderFirma } = await supabase
          .from("firmalar")
          .select("firma_unvani")
          .eq("user_id", currentUserId)
          .single();
        const { data: ownerFirma } = await supabase
          .from("firmalar")
          .select("firma_unvani")
          .eq("user_id", ihale.user_id)
          .single();

        supabase.functions.invoke("send-email", {
          body: {
            type: "yeni_teklif",
            userId: ihale.user_id,
            templateModel: {
              firma_unvani: ownerFirma?.firma_unvani || "",
              ihale_basligi: ihale.baslik,
              teklif_veren_firma_unvani: bidderFirma?.firma_unvani || "Bir firma",
              teklif_linki: `${window.location.origin}/manuihale/takip/${ihale.id}`,
            },
          },
        }).catch(console.error);

        // Send SMS to ihale owner about new bid
        supabase.functions.invoke("send-notification-sms", {
          body: {
            type: "yeni_teklif",
            userId: ihale.user_id,
            firmaUnvani: ownerFirma?.firma_unvani || "",
            ihaleBasligi: ihale.baslik,
            teklifVerenFirma: bidderFirma?.firma_unvani || "Bir firma",
            ihaleTakipLinki: `${window.location.origin}/manuihale/takip/${ihale.id}`,
          },
        }).catch(console.error);
      } catch (e) {
        console.error("[IhaleDetay] Notification error:", e);
      }
    }
    setSubmitting(false);
  };

  const handleTeklifGeriCek = async () => {
    if (!myTeklif) return;
    // Delete all of user's bids for this ihale
    const { error } = await supabase.from("ihale_teklifler").delete().eq("ihale_id", ihale.id).eq("teklif_veren_user_id", currentUserId);
    if (error) {
      toast({ title: "Hata", description: "Teklif geri çekilemedi.", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Teklifiniz geri çekildi." });
      setMyTeklif(null);
      setTeklifTutar("");
      setTeklifOdemeSecenekleri("");
      setTeklifKargoMasrafi("");
      setTeklifOdemeVadesi("");
      setTeklifDosyaUrl(null);
      setTeklifDosyaName(null);
      setMyRank(null);
      fetchIhale();
    }
  };

  const handleMesajGonder = async () => {
    if (!currentUserId || !firma || !ihale) return;
    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${firma.user_id}),and(user1_id.eq.${firma.user_id},user2_id.eq.${currentUserId})`)
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
      p_user2: firma.user_id,
    });
    if (!convId) return;

    const priceText = ihale.baslangic_fiyati
      ? `${sym}${Number(ihale.baslangic_fiyati).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`
      : "";

    navigate("/mesajlar", {
      state: {
        openConversationId: convId,
        otherUserId: firma.user_id,
        quote: {
          urunBaslik: ihale.baslik,
          urunNo: ihale.ihale_no,
          fiyat: priceText,
          moq: null,
          fotoUrl: ihale.foto_url,
        },
      },
    });
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
        <Button onClick={() => navigate("/ihaleler")}>İhalelere Dön</Button>
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

  // For kapalı teklif: only show user's own teklifler + owner sees all
  const isKapaliTeklif = ihale.teklif_usulu === "kapali_teklif";
  const visibleTeklifler = isKapaliTeklif && !isOwner
    ? sortedTeklifler.filter(t => t.teklif_veren_user_id === currentUserId)
    : sortedTeklifler;

  // Group filters by type
  const filtreByType: Record<string, string[]> = {};
  ihaleFiltreler.forEach(f => {
    if (!filtreByType[f.filtre_tipi]) filtreByType[f.filtre_tipi] = [];
    filtreByType[f.filtre_tipi].push(secenekMap[f.secenek_id] || f.secenek_id);
  });

  const kategoriLabel = ihale.ihale_turu === "hizmet_alim"
    ? (ihale.hizmet_kategori_id ? secenekMap[ihale.hizmet_kategori_id] || "" : "")
    : (ihale.urun_kategori_id ? secenekMap[ihale.urun_kategori_id] || "" : "");

  // Build category chain for display
  const kategoriChain: string[] = [];
  if (ihale.ihale_turu === "hizmet_alim") {
    if (ihale.hizmet_kategori_id && secenekMap[ihale.hizmet_kategori_id]) kategoriChain.push(secenekMap[ihale.hizmet_kategori_id]);
    if (ihale.hizmet_tur_id && secenekMap[ihale.hizmet_tur_id]) kategoriChain.push(secenekMap[ihale.hizmet_tur_id]);
  } else {
    if (ihale.urun_kategori_id && secenekMap[ihale.urun_kategori_id]) kategoriChain.push(secenekMap[ihale.urun_kategori_id]);
    if (ihale.urun_grup_id && secenekMap[ihale.urun_grup_id]) kategoriChain.push(secenekMap[ihale.urun_grup_id]);
    if (ihale.urun_tur_id && secenekMap[ihale.urun_tur_id]) kategoriChain.push(secenekMap[ihale.urun_tur_id]);
  }
  const kategoriDisplayLabel = kategoriChain.length > 0 ? kategoriChain.join(" > ") : null;

  return (
    <div className="min-h-screen bg-muted/30 font-sans">
      <PazarHeader firmaUnvani={headerFirmaUnvani} firmaLogoUrl={headerFirmaLogoUrl} />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link to="/ihaleler" className="hover:text-foreground transition-colors">İhale Anasayfa</Link>
          {breadcrumbKategori && (
            <>
              <span>/</span>
              <button
                onClick={() => navigate("/ihaleler", { state: { kategoriId: ihale.urun_kategori_id || ihale.hizmet_kategori_id, isHizmet: !!ihale.hizmet_kategori_id } })}
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
                onClick={() => navigate("/ihaleler", { state: { kategoriId: ihale.urun_kategori_id || ihale.hizmet_kategori_id, grupId: ihale.urun_grup_id || ihale.hizmet_tur_id, isHizmet: !!ihale.hizmet_kategori_id } })}
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
                onClick={() => navigate("/ihaleler", { state: { kategoriId: ihale.urun_kategori_id, grupId: ihale.urun_grup_id, turId: ihale.urun_tur_id } })}
                className="hover:text-foreground transition-colors"
              >
                {breadcrumbTur}
              </button>
            </>
          )}
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[300px]">{ihale.baslik}</span>
        </nav>

        {/* Main Grid - Mobile: single column with specific order, Desktop: 2-column */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 mb-12">
          {/* Left Column */}
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
            {/* Image Gallery - mobile order 2 */}
            <div className="flex flex-col sm:flex-row gap-4 order-2 lg:order-none">
              {allImages.length > 1 && (
                <div className="flex sm:flex-col gap-2 shrink-0 overflow-x-auto sm:overflow-x-visible">
                  {allImages.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImageIndex(i)}
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${selectedImageIndex === i ? "border-primary" : "border-border hover:border-primary/50"}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain p-0.5" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 relative">
                <div ref={imageContainerRef}
                  className="aspect-[4/3] bg-background rounded-xl overflow-hidden border border-border relative group"
                  onMouseMove={(e) => { handleImageZoomMove(e); setIsZoomed(true); }}
                  onMouseLeave={() => setIsZoomed(false)}
                  style={{ cursor: "crosshair" }}
                >
                  {allImages.length > 0 ? (
                    <img src={allImages[selectedImageIndex]} alt={ihale.baslik}
                      className="w-full h-full object-contain transition-transform duration-200"
                      style={isZoomed ? {
                        transform: "scale(2.5)",
                        transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      } : undefined}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img src={ihaleDefaultCover} alt="" className="max-w-[60%] max-h-[60%] object-contain" />
                    </div>
                  )}
                  {!isZoomed && (
                    <div className="absolute bottom-3 right-3 p-2 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
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

            {/* İhale Açıklaması - order 3 */}
            {ihale.aciklama && (
              <Card className="p-6 order-3 lg:order-none">
                <h3 className="text-lg font-bold text-foreground mb-4">İhale Açıklaması</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{ihale.aciklama}</p>
              </Card>
            )}

            {/* MOBILE ONLY: Teklif Verme - order 4 (only for logged-in users) */}
            {currentUserId && (
            <div className="lg:hidden order-4">
              <Card className="p-6">
                <h1 className="text-xl font-bold text-foreground mb-2">{ihale.baslik}</h1>
                <p className="text-sm text-muted-foreground mb-3">#{ihale.ihale_no}</p>
                {countdown && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-2.5 mb-4">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{countdown}</span>
                  </div>
                )}
                {!isOwner && ihale.durum === "devam_ediyor" && filterBlockMessage && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm text-destructive font-medium mb-1">Teklif Veremezsiniz</p>
                    <p className="text-xs text-destructive/80">{filterBlockMessage}</p>
                  </div>
                )}
                {!isOwner && ihale.durum === "devam_ediyor" && !filterBlockMessage && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Teklif Tutarı ({sym})</label>
                      <Input type="number" placeholder={`${sym}${ihale.baslangic_fiyati ? Number(ihale.baslangic_fiyati).toFixed(2) : "0.00"}`} value={teklifTutar} onChange={(e) => setTeklifTutar(e.target.value)} />
                      {ihale.min_teklif_degisim != null && Number(ihale.min_teklif_degisim) > 0 && (ihale.teklif_usulu === "acik_indirme" || ihale.teklif_usulu === "acik_arttirma") && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {ihale.teklif_usulu === "acik_indirme" ? `Minimum indirme bedeli: ${sym}${Number(ihale.min_teklif_degisim).toLocaleString("tr-TR")}` : `Minimum arttırma bedeli: ${sym}${Number(ihale.min_teklif_degisim).toLocaleString("tr-TR")}`}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Ödeme Seçenekleri</label>
                      <SearchableSelect options={dbOdemeSecenekleri.map(o => ({ value: o, label: o }))} value={teklifOdemeSecenekleri} onValueChange={setTeklifOdemeSecenekleri} placeholder="Ödeme Seçenekleri" searchPlaceholder="Ara..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Kargo Masrafı Ödemesi</label>
                      <SearchableSelect options={dbKargoMasrafi.map(o => ({ value: o, label: o }))} value={teklifKargoMasrafi} onValueChange={setTeklifKargoMasrafi} placeholder="Kargo Masrafı Ödemesi" searchPlaceholder="Ara..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Ödeme Vadesi</label>
                      <SearchableSelect options={dbOdemeVadeleri.map(o => ({ value: o, label: o }))} value={teklifOdemeVadesi} onValueChange={setTeklifOdemeVadesi} placeholder="Ödeme Vadesi" searchPlaceholder="Ara..." />
                    </div>
                    <div>
                      <label className="relative flex items-center justify-center gap-2 h-12 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{uploading ? "Yükleniyor..." : teklifDosyaName || "Belge yükle"}</span>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                      </label>
                    </div>
                    <Button className="w-full h-12 gap-2 text-base" onClick={handleTeklifSubmit}>
                      <Send className="w-4 h-4" /> {myTeklif ? "Teklifi Güncelle" : "Teklif Ver"}
                    </Button>
                    {myTeklif && (
                      <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={handleTeklifGeriCek}>
                        <Trash2 className="w-4 h-4" /> Teklifi Geri Çek
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </div>
            )}

            {/* MOBILE ONLY: Teklifler - order 5 (only for logged-in users) */}
            {currentUserId && (
            <div className="lg:hidden order-5">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-foreground">Teklifler ({visibleTeklifler.length})</h3>
                  </div>
                  {!isKapaliTeklif && <Badge className="bg-destructive text-destructive-foreground text-xs">Canlı</Badge>}
                </div>
                {!isKapaliTeklif && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Min Teklif</p>
                      <p className="font-bold text-foreground text-sm">{minTeklif != null ? `${sym}${minTeklif.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Maks Teklif</p>
                      <p className="font-bold text-foreground text-sm">{maxTeklif != null ? `${sym}${maxTeklif.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sizin Teklifiniz</p>
                      <p className="font-bold text-foreground text-sm">{myTeklif ? `${sym}${myTeklif.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}</p>
                    </div>
                  </div>
                )}
                {isKapaliTeklif && !isOwner && myTeklif && (
                  <div className="text-center p-3 bg-muted rounded-lg mb-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sizin Teklifiniz</p>
                    <p className="font-bold text-foreground text-sm">{`${sym}${myTeklif.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`}</p>
                  </div>
                )}
                {isKapaliTeklif && !isOwner && <p className="text-xs text-muted-foreground text-center mb-4">Kapalı teklif usulünde yalnızca kendi teklifinizi görebilirsiniz.</p>}
                {myRank && !isKapaliTeklif && <p className="text-sm text-center text-muted-foreground mb-4">Teklif sıranız: <strong className="text-foreground">{myRank}.</strong></p>}
                {visibleTeklifler.length > 0 ? (
                  <div className="space-y-0">
                    <div className="grid grid-cols-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium py-2 border-b border-border">
                      <span>Teklif Veren</span>
                      <span className="text-center">Zaman</span>
                      <span className="text-right">Teklif</span>
                    </div>
                    {visibleTeklifler.map((t, i) => (
                      <div key={t.id} className={`grid grid-cols-3 py-2.5 text-sm border-b border-border/50 ${t.teklif_veren_user_id === currentUserId ? "bg-primary/5 rounded" : ""}`}>
                        <span className="text-muted-foreground">{isOwner ? (t.firma_unvani || "Anonim") : maskName(t.firma_unvani || `Firma ${i + 1}`)}</span>
                        <span className="text-center text-muted-foreground text-xs">{format(new Date(t.created_at), "dd/MM HH:mm")}</span>
                        <span className="text-right font-medium text-foreground">{`${sym}${t.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz teklif yok.</p>
                )}
              </Card>
            </div>
            )}

            {/* MOBILE ONLY: İhale Sahibi - order 6 (only for logged-in users) */}
            {currentUserId && (
            <div className="lg:hidden order-6">
              {ihale.firma_adi_gizle ? (
                <Card className="p-6">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <EyeOff className="w-5 h-5" />
                    <p className="text-sm">Firma bilgileri gizlenmiştir.</p>
                  </div>
                </Card>
              ) : firma && (
                <Card className="p-6">
                  <h3 className="font-bold text-foreground mb-4">İhale Sahibi Firma</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <FirmaAvatar firmaUnvani={firma.firma_unvani} logoUrl={firma.logo_url} size="lg" className="border border-border" />
                    <div>
                      <p className="font-semibold text-foreground">{firma.firma_unvani}</p>
                      {locationText && <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="w-3.5 h-3.5" /> {locationText}</div>}
                    </div>
                  </div>
                  {!isOwner && (
                    <Button className="w-full gap-2" onClick={handleMesajGonder}>
                      <MessageSquare className="w-4 h-4" /> Mesaj Gönder
                    </Button>
                  )}
                </Card>
              )}
            </div>
            )}

            {/* İhale Bilgileri - order 7 */}
            <Card className="p-6 order-7 lg:order-none">
              <h3 className="text-lg font-bold text-foreground mb-4">İhale Bilgileri</h3>
              <div className="divide-y divide-border">
                <InfoRow label="İhale Türü" value={ihaleTuruLabel[ihale.ihale_turu] || ihale.ihale_turu} />
                <InfoRow label="Teklif Usulü" value={teklifUsuluLabel[ihale.teklif_usulu] || ihale.teklif_usulu} />
                <InfoRow label="İhale Kategorisi" value={kategoriDisplayLabel} />
                <InfoRow label="Başlangıç Fiyatı" value={ihale.baslangic_fiyati != null ? `${sym}${Number(ihale.baslangic_fiyati).toLocaleString("tr-TR")}` : null} />
                {ihale.min_teklif_degisim != null && Number(ihale.min_teklif_degisim) > 0 && (
                  <InfoRow
                    label={ihale.teklif_usulu === "acik_arttirma" ? "Minimum Arttırma Bedeli" : ihale.teklif_usulu === "acik_indirme" ? "Minimum İndirme Bedeli" : "Minimum Teklif Değişim"}
                    value={`${sym}${Number(ihale.min_teklif_degisim).toLocaleString("tr-TR")}`}
                  />
                )}
                <InfoRow label="Başlangıç Tarihi" value={ihale.baslangic_tarihi ? format(new Date(ihale.baslangic_tarihi), "dd/MM/yyyy", { locale: tr }) : null} />
                <InfoRow label="Bitiş Tarihi" value={ihale.bitis_tarihi ? format(new Date(ihale.bitis_tarihi), "dd/MM/yyyy", { locale: tr }) : null} />
                <InfoRow label="Mesaj Durumu" value={ihale.firma_adi_gizle ? "Hayır" : "Evet"} />
                {Object.keys(filtreByType).length > 0 && (
                  <>
                    {Object.entries(filtreByType).map(([type, values]) => {
                      const filtreLabelMap: Record<string, string> = {
                        firma_turu: "Firma Türü", firma_tipi: "Firma Tipi", il: "İl", firma_olcegi: "Firma Ölçeği", sertifika: "Sertifika",
                      };
                      return <InfoRow key={type} label={`İstenen ${filtreLabelMap[type] || type}`} value={values.join(", ")} />;
                    })}
                  </>
                )}
                {ekDosyalar.length > 0 ? (
                  <div className="py-3">
                    <span className="text-sm text-muted-foreground block mb-2">İhale Ek Dosyaları</span>
                    <div className="space-y-1.5">
                      {ekDosyalar.map((d: any, i: number) => (
                        <a key={i} href={d.dosya_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <Download className="w-4 h-4" /> {d.dosya_adi}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : ihale.ek_dosya_url && (
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-muted-foreground">İhale Ek Dosyası</span>
                    <a href={ihale.ek_dosya_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Download className="w-4 h-4" /> İndir
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {/* Teknik Detaylar - order 8 */}
            {Object.keys(resolvedTeknikDetaylar).length > 0 && (
              <Card className="p-6 order-8 lg:order-none">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  {ihale?.ihale_turu === "hizmet_alim" ? "Hizmet Bilgileri" : "Ürün Teknik Detaylar"}
                </h3>
                <div className="divide-y divide-border">
                  {Object.entries(resolvedTeknikDetaylar)
                    .filter(([_, value]) => value && value.trim() !== "")
                    .map(([key, value]) => (
                      <InfoRow key={key} label={formatLabel(key)} value={value} />
                    ))}
                </div>
              </Card>
            )}

            {/* Stok Tablosu - order 9 */}
            {stoklar.length > 0 && (
              <Card className="p-6 order-9 lg:order-none">
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

            {/* Ödeme Bilgileri - order 10 */}
            <Card className="p-6 order-10 lg:order-none">
              <h3 className="text-lg font-bold text-foreground mb-4">Ödeme Bilgileri</h3>
              <div className="divide-y divide-border">
                <InfoRow label="İhale Başlangıç Fiyatı (Birim Fiyat)" value={ihale.baslangic_fiyati != null ? `${sym}${Number(ihale.baslangic_fiyati).toLocaleString("tr-TR")}` : null} />
                <InfoRow label="KDV Durum Bilgisi" value={ihale.kdv_durumu} />
                <InfoRow label="Ödeme Seçenekleri" value={ihale.odeme_secenekleri} />
                <InfoRow label="Tercih Edilen Ödeme Vadeleri" value={ihale.odeme_vadesi} />
              </div>
            </Card>

            {/* Teslimat & Kargo - order 11 */}
            <Card className="p-6 order-11 lg:order-none">
              <h3 className="text-lg font-bold text-foreground mb-4">Teslimat & Kargo Bilgileri</h3>
              <div className="divide-y divide-border">
                <InfoRow label="Kargo Masrafı Ödemesi" value={ihale.kargo_masrafi} />
                <InfoRow label="Kargo Şirketi Anlaşması" value={ihale.kargo_sirketi_anlasmasi} />
                <InfoRow label="Teslimat Tarihi" value={ihale.teslimat_tarihi ? format(new Date(ihale.teslimat_tarihi), "dd/MM/yyyy", { locale: tr }) : null} />
                <InfoRow label="Teslimat Yeri" value={ihale.teslimat_yeri} />
              </div>
            </Card>

            {/* MOBILE ONLY: Benzer İhaleler - order 12 */}
            <div className="lg:hidden order-12">
              {benzerIhaleler.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-bold text-foreground mb-4">Benzer İhaleler</h3>
                  <div className="space-y-3">
                    {benzerIhaleler.map((b) => (
                      <div key={b.id} className="flex gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => navigate(`/ihaleler/${b.slug || b.id}`)}>
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {b.foto_url ? <img src={b.foto_url} alt="" className="w-full h-full object-contain" /> : <img src={ihaleDefaultCover} alt="" className="w-full h-full object-contain p-2" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2">{b.baslik}</p>
                          {b.baslangic_fiyati && <p className="text-sm font-bold text-foreground mt-1">{paraBirimiSymbol[b.para_birimi || "TRY"] || "₺"}{Number(b.baslangic_fiyati).toLocaleString("tr-TR")}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Right Sidebar - desktop only content */}
          <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
            {/* Admin Onay/Red Bloğu */}
            {isAdminViewing && ihale.durum === "onay_bekliyor" && (
              <Card className="p-5 border-2 border-blue-400 bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-500" /> Admin İnceleme
                  </h3>
                  <Badge className="bg-amber-500 text-white">Onay Bekliyor</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Bu ihale yayına alınmak için onay bekliyor. İnceleyin ve karar verin.</p>
                <div className="space-y-3">
                  <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={adminActionLoading}
                    onClick={async () => {
                      setAdminActionLoading(true);
                      try {
                        const adminToken = localStorage.getItem("admin_token");
                        await supabase.functions.invoke("admin-auth/approve-ihale", { body: { token: adminToken, ihaleId: ihale.id } });
                        toast({ title: "İhale onaylandı!" });
                        setIhale({ ...ihale, durum: "devam_ediyor" });
                      } catch { toast({ title: "Hata", variant: "destructive" }); }
                      setAdminActionLoading(false);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Onayla
                  </Button>
                  <div className="space-y-2">
                    <Select value={redSebebi} onValueChange={setRedSebebi}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Red sebebi seçin..." /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {IHALE_RED_SEBEPLERI.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="destructive" className="w-full gap-2" disabled={!redSebebi || adminActionLoading}
                      onClick={async () => {
                        setAdminActionLoading(true);
                        try {
                          const adminToken = localStorage.getItem("admin_token");
                          await supabase.functions.invoke("admin-auth/reject-ihale", { body: { token: adminToken, ihaleId: ihale.id, redSebebi } });
                          toast({ title: "İhale reddedildi" });
                          setIhale({ ...ihale, durum: "reddedildi" });
                        } catch { toast({ title: "Hata", variant: "destructive" }); }
                        setAdminActionLoading(false);
                      }}
                    >
                      <ShieldX className="w-4 h-4" /> Reddet
                    </Button>
                  </div>
                </div>
              </Card>
            )}
            {/* Onay Bloğu - sahip */}
            {!isAdminViewing && isOwner && (ihale.durum === "duzenleniyor" || ihale.durum === "onay_bekliyor" || ihale.durum === "reddedildi") && (
              <Card className={`p-5 border-2 ${ihale.durum === "reddedildi" ? "border-red-400 bg-red-50 dark:bg-red-950/20" : "border-amber-300 bg-amber-50 dark:bg-amber-950/20"}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">
                    {ihale.durum === "onay_bekliyor" ? "Onay Bekliyor" : ihale.durum === "reddedildi" ? "Reddedildi" : "Önizleme"}
                  </h3>
                  <Badge className={ihale.durum === "onay_bekliyor" ? "bg-amber-500 text-white" : ihale.durum === "reddedildi" ? "bg-red-500 text-white" : "bg-blue-500 text-white"}>
                    {ihale.durum === "onay_bekliyor" ? "İnceleniyor" : ihale.durum === "reddedildi" ? "Reddedildi" : "Taslak"}
                  </Badge>
                </div>
                {ihale.admin_karar_veren && (ihale.durum === "reddedildi" || ihale.durum === "devam_ediyor") && (
                  <div className="mb-4 p-3 rounded-lg bg-background border border-border space-y-1.5">
                    <p className="text-sm font-medium text-foreground">Verilen Karar: <span className={ihale.durum === "reddedildi" ? "text-destructive" : "text-emerald-600"}>{ihale.durum === "reddedildi" ? "Reddedildi" : "Onaylandı"}</span></p>
                    {ihale.admin_karar_sebebi && <p className="text-sm text-destructive">Sebep: {ihale.admin_karar_sebebi}</p>}
                    <p className="text-xs text-muted-foreground">İşlemi yapan: {ihale.admin_karar_veren}</p>
                    {ihale.admin_karar_tarihi && <p className="text-xs text-muted-foreground">Tarih: {format(new Date(ihale.admin_karar_tarihi), "dd/MM/yyyy HH:mm", { locale: tr })}</p>}
                  </div>
                )}
                {!ihale.admin_karar_veren && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {ihale.durum === "onay_bekliyor" ? "İhaleniz şu anda incelenmektedir." : ihale.durum === "reddedildi" ? "İhaleniz reddedilmiştir." : "İhalenizin önizlemesini kontrol edin."}
                  </p>
                )}
                <div className="flex gap-3">
                  {(ihale.durum === "duzenleniyor" || ihale.durum === "reddedildi") && (
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate(`/manuihale/duzenle/${ihale.id}`)}>
                      <FileText className="w-4 h-4" /> Düzenle
                    </Button>
                  )}
                  {(ihale.durum === "duzenleniyor" || ihale.durum === "reddedildi") && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="flex-1 gap-2"><CheckCircle2 className="w-4 h-4" /> {ihale.durum === "reddedildi" ? "Yeniden Onaya Gönder" : "Onayla"}</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>İhaleyi Onaya Göndermek İstediğinize Emin Misiniz?</AlertDialogTitle><AlertDialogDescription>İhaleniz süper admin onayına gönderilecektir.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            await supabase.from("ihaleler").update({ durum: "onay_bekliyor" } as any).eq("id", ihale.id);
                            // Send "İhaleniz İnceleniyor" email
                            try {
                              const { data: { user } } = await supabase.auth.getUser();
                              const { data: myFirma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", user?.id || "").single();
                              await supabase.functions.invoke("send-email", {
                                body: {
                                  type: "ihale_inceleniyor",
                                  userId: user?.id,
                                  templateModel: {
                                    firma_unvani: myFirma?.firma_unvani || "",
                                    ihale_basligi: ihale.baslik,
                                  },
                                },
                              });
                            } catch (e) { console.error("Ihale review email failed:", e); }
                            toast({ title: "İhale onaya gönderildi!" });
                            navigate("/ihalelerim");
                          }}>Evet, Gönder</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </Card>
            )}
            {/* Onaylandıktan sonra karar bilgisi */}
            {!isAdminViewing && isOwner && ihale.durum === "devam_ediyor" && ihale.admin_karar_veren && (
              <Card className="p-5 border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Onaylandı</h3>
                  <Badge className="bg-emerald-500 text-white">Yayında</Badge>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border space-y-1.5">
                  <p className="text-sm font-medium text-foreground">Verilen Karar: <span className="text-emerald-600">Onaylandı</span></p>
                  <p className="text-xs text-muted-foreground">İşlemi yapan: {ihale.admin_karar_veren}</p>
                  {ihale.admin_karar_tarihi && <p className="text-xs text-muted-foreground">Tarih: {format(new Date(ihale.admin_karar_tarihi), "dd/MM/yyyy HH:mm", { locale: tr })}</p>}
                </div>
              </Card>
            )}

            {/* Title & Countdown + Teklif Form - desktop only */}
            <div className="hidden lg:block">
              <Card className="p-6">
                <h1 className="text-xl font-bold text-foreground mb-2">{ihale.baslik}</h1>
                <p className="text-sm text-muted-foreground mb-3">#{ihale.ihale_no}</p>
                {countdown && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-2.5 mb-4">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{countdown}</span>
                  </div>
                )}
                {!isOwner && ihale.durum === "devam_ediyor" && filterBlockMessage && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm text-destructive font-medium mb-1">Teklif Veremezsiniz</p>
                    <p className="text-xs text-destructive/80">{filterBlockMessage}</p>
                  </div>
                )}
                {!isOwner && ihale.durum === "devam_ediyor" && !filterBlockMessage && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Teklif Tutarı ({sym})</label>
                      <Input type="number" placeholder={`${sym}${ihale.baslangic_fiyati ? Number(ihale.baslangic_fiyati).toFixed(2) : "0.00"}`} value={teklifTutar} onChange={(e) => setTeklifTutar(e.target.value)} />
                      {ihale.min_teklif_degisim != null && Number(ihale.min_teklif_degisim) > 0 && (ihale.teklif_usulu === "acik_indirme" || ihale.teklif_usulu === "acik_arttirma") && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {ihale.teklif_usulu === "acik_indirme" ? `Minimum indirme bedeli: ${sym}${Number(ihale.min_teklif_degisim).toLocaleString("tr-TR")}` : `Minimum arttırma bedeli: ${sym}${Number(ihale.min_teklif_degisim).toLocaleString("tr-TR")}`}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Ödeme Seçenekleri</label>
                      <SearchableSelect options={dbOdemeSecenekleri.map(o => ({ value: o, label: o }))} value={teklifOdemeSecenekleri} onValueChange={setTeklifOdemeSecenekleri} placeholder="Ödeme Seçenekleri" searchPlaceholder="Ara..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Kargo Masrafı Ödemesi</label>
                      <SearchableSelect options={dbKargoMasrafi.map(o => ({ value: o, label: o }))} value={teklifKargoMasrafi} onValueChange={setTeklifKargoMasrafi} placeholder="Kargo Masrafı Ödemesi" searchPlaceholder="Ara..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Ödeme Vadesi</label>
                      <SearchableSelect options={dbOdemeVadeleri.map(o => ({ value: o, label: o }))} value={teklifOdemeVadesi} onValueChange={setTeklifOdemeVadesi} placeholder="Ödeme Vadesi" searchPlaceholder="Ara..." />
                    </div>
                    <div>
                      <label className="relative flex items-center justify-center gap-2 h-12 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{uploading ? "Yükleniyor..." : teklifDosyaName || "Belge yükle"}</span>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                      </label>
                    </div>
                    <Button className="w-full h-12 gap-2 text-base" onClick={handleTeklifSubmit}>
                      <Send className="w-4 h-4" /> {myTeklif ? "Teklifi Güncelle" : "Teklif Ver"}
                    </Button>
                    {myTeklif && (
                      <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={handleTeklifGeriCek}>
                        <Trash2 className="w-4 h-4" /> Teklifi Geri Çek
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Bildir button - only for logged-in users */}
            {currentUserId && !isOwner && (
              <Button variant="outline" className="w-full gap-2 text-muted-foreground" onClick={() => setBildirOpen(true)}>
                <Flag className="w-4 h-4" /> İhaleyi Bildir
              </Button>
            )}

            {/* Teklifler Card - desktop only */}
            <div className="hidden lg:block">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-foreground">Teklifler ({visibleTeklifler.length})</h3>
                  </div>
                  {!isKapaliTeklif && <Badge className="bg-destructive text-destructive-foreground text-xs">Canlı</Badge>}
                </div>
                {!isKapaliTeklif && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Min Teklif</p>
                      <p className="font-bold text-foreground text-sm">{minTeklif != null ? `${sym}${minTeklif.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Maks Teklif</p>
                      <p className="font-bold text-foreground text-sm">{maxTeklif != null ? `${sym}${maxTeklif.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sizin Teklifiniz</p>
                      <p className="font-bold text-foreground text-sm">{myTeklif ? `${sym}${myTeklif.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "-"}</p>
                    </div>
                  </div>
                )}
                {isKapaliTeklif && !isOwner && myTeklif && (
                  <div className="text-center p-3 bg-muted rounded-lg mb-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sizin Teklifiniz</p>
                    <p className="font-bold text-foreground text-sm">{`${sym}${myTeklif.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`}</p>
                  </div>
                )}
                {isKapaliTeklif && !isOwner && <p className="text-xs text-muted-foreground text-center mb-4">Kapalı teklif usulünde yalnızca kendi teklifinizi görebilirsiniz.</p>}
                {myRank && !isKapaliTeklif && <p className="text-sm text-center text-muted-foreground mb-4">Teklif sıranız: <strong className="text-foreground">{myRank}.</strong></p>}
                {visibleTeklifler.length > 0 ? (
                  <div className="space-y-0">
                    <div className="grid grid-cols-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium py-2 border-b border-border">
                      <span>Teklif Veren</span><span className="text-center">Zaman</span><span className="text-right">Teklif</span>
                    </div>
                    {visibleTeklifler.map((t, i) => (
                      <div key={t.id} className={`grid grid-cols-3 py-2.5 text-sm border-b border-border/50 ${t.teklif_veren_user_id === currentUserId ? "bg-primary/5 rounded" : ""}`}>
                        <span className="text-muted-foreground">{isOwner ? (t.firma_unvani || "Anonim") : maskName(t.firma_unvani || `Firma ${i + 1}`)}</span>
                        <span className="text-center text-muted-foreground text-xs">{format(new Date(t.created_at), "dd/MM HH:mm")}</span>
                        <span className="text-right font-medium text-foreground">{`${sym}${t.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz teklif yok.</p>
                )}
              </Card>
            </div>

            {/* İhale Sahibi Firma - desktop only */}
            <div className="hidden lg:block">
              {ihale.firma_adi_gizle ? (
                <Card className="p-6">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <EyeOff className="w-5 h-5" />
                    <p className="text-sm">Firma bilgileri gizlenmiştir.</p>
                  </div>
                </Card>
              ) : firma && (
                <Card className="p-6">
                  <h3 className="font-bold text-foreground mb-4">İhale Sahibi Firma</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <FirmaAvatar firmaUnvani={firma.firma_unvani} logoUrl={firma.logo_url} size="lg" className="border border-border" />
                    <div>
                      <p className="font-semibold text-foreground">{firma.firma_unvani}</p>
                      {locationText && <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="w-3.5 h-3.5" /> {locationText}</div>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {firma.firma_iletisim_numarasi && (
                      <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Telefon</p><p className="text-sm font-medium">{firma.firma_iletisim_numarasi}</p></div></div>
                    )}
                    {firma.web_sitesi && (
                      <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Website</p><p className="text-sm font-medium">{firma.web_sitesi}</p></div></div>
                    )}
                    {firma.firma_iletisim_email && (
                      <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">E-Posta</p><p className="text-sm font-medium">{firma.firma_iletisim_email}</p></div></div>
                    )}
                    {(firma.instagram || firma.facebook || firma.linkedin || firma.x_twitter || firma.tiktok) && (
                      <div className="flex items-center gap-3 pt-2">
                        {firma.instagram && <a href={firma.instagram.startsWith("http") ? firma.instagram : `https://instagram.com/${firma.instagram}`} target="_blank" rel="noopener noreferrer"><Instagram className="w-4 h-4 text-muted-foreground hover:text-foreground" /></a>}
                        {firma.facebook && <a href={firma.facebook.startsWith("http") ? firma.facebook : `https://${firma.facebook}`} target="_blank" rel="noopener noreferrer"><Facebook className="w-4 h-4 text-muted-foreground hover:text-foreground" /></a>}
                        {firma.linkedin && <a href={firma.linkedin.startsWith("http") ? firma.linkedin : `https://${firma.linkedin}`} target="_blank" rel="noopener noreferrer"><Linkedin className="w-4 h-4 text-muted-foreground hover:text-foreground" /></a>}
                        {firma.x_twitter && <a href={firma.x_twitter.startsWith("http") ? firma.x_twitter : `https://x.com/${firma.x_twitter}`} target="_blank" rel="noopener noreferrer"><Twitter className="w-4 h-4 text-muted-foreground hover:text-foreground" /></a>}
                        {firma.tiktok && <a href={firma.tiktok.startsWith("http") ? firma.tiktok : `https://tiktok.com/@${firma.tiktok}`} target="_blank" rel="noopener noreferrer"><TikTokIcon className="w-4 h-4 text-muted-foreground hover:text-foreground" /></a>}
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
            </div>

            {/* Benzer İhaleler - desktop only */}
            <div className="hidden lg:block">
              {benzerIhaleler.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-bold text-foreground mb-4">Benzer İhaleler</h3>
                  <div className="space-y-3">
                    {benzerIhaleler.map((b) => (
                      <div key={b.id} className="flex gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => navigate(`/ihaleler/${b.slug || b.id}`)}>
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {b.foto_url ? <img src={b.foto_url} alt="" className="w-full h-full object-contain" /> : <img src={ihaleDefaultCover} alt="" className="w-full h-full object-contain p-2" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2">{b.baslik}</p>
                          {b.baslangic_fiyati && <p className="text-sm font-bold text-foreground mt-1">{paraBirimiSymbol[b.para_birimi || "TRY"] || "₺"}{Number(b.baslangic_fiyati).toLocaleString("tr-TR")}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Banner */}
        <div
          className="hidden md:block rounded-xl overflow-hidden mt-8 cursor-pointer mx-auto"
          style={{
            maxWidth: 1060,
            height: 128,
            ...(ihaleDetayBanner.url ? {} : { background: "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.8))" }),
          }}
          onClick={() => ihaleDetayBanner.linkUrl && window.open(ihaleDetayBanner.linkUrl, "_blank")}
        >
          {ihaleDetayBanner.url ? (
            <img src={ihaleDetayBanner.url} alt="Reklam" className="w-full h-full object-contain" style={{ imageRendering: "auto" }} />
          ) : (
            <div className="flex items-center px-8 h-full">
              <div>
                <p className="text-primary-foreground text-lg font-bold">Tekstil A.Ş. ile Güvenle Alışveriş Yapın</p>
                <p className="text-primary-foreground/70 text-sm mt-1">Binlerce doğrulanmış tedarikçi, rekabetçi fiyatlar</p>
              </div>
            </div>
          )}
        </div>
      </main>

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
                <p className="text-xs text-muted-foreground mb-1">İhale</p>
                <p className="font-semibold text-foreground text-sm">{ihale.baslik}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Teklifiniz</p>
                <p className="font-semibold text-foreground text-sm">{sym}{parseFloat(teklifTutar || "0").toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ödeme Seçenekleri</span>
                <span className="font-medium">{teklifOdemeSecenekleri || "Belirtilmedi"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kargo Masrafı Ödemesi</span>
                <span className="font-medium">{teklifKargoMasrafi || "Belirtilmedi"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ödeme Vadesi</span>
                <span className="font-medium">{teklifOdemeVadesi || "Belirtilmedi"}</span>
              </div>
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
      {ihale && (
        <BildirDialog
          open={bildirOpen}
          onOpenChange={setBildirOpen}
          tur="ihale"
          referansId={ihale.id}
        />
      )}
      <Footer />
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Teklif Verme Hakkınız Doldu"
        message={upgradeMessage}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-center py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value || "Belirtilmedi"}</span>
    </div>
  );
}
