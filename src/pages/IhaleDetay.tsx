import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
      // Don't redirect to login if admin token exists
      if (!user) {
        const adminToken = localStorage.getItem("admin_token");
        if (!adminToken) { navigate("/giris-kayit"); return; }
        setIsAdminViewing(true);
        return;
      }
      setCurrentUserId(user.id);
      const { data: f } = await supabase.from("firmalar").select("firma_unvani, logo_url").eq("user_id", user.id).maybeSingle();
      if (f) { setHeaderFirmaUnvani(f.firma_unvani); setHeaderFirmaLogoUrl(f.logo_url); }
    })();
  }, [navigate]);

  // Fetch ihale
  const fetchIhale = useCallback(async () => {
    if (!id) return;
    const adminToken = localStorage.getItem("admin_token");
    // Allow fetch if user is logged in OR admin token exists
    if (!currentUserId && !adminToken) return;
    setLoading(true);

    let ihaleData: any = null;

    const { data: directData, error } = await supabase
      .from("ihaleler")
      .select("*")
      .eq("id", id)
      .single();

    if (directData) {
      ihaleData = directData;
    } else {
      // Fallback: try admin edge function if admin token exists
      const adminToken = localStorage.getItem("admin_token");
      if (adminToken) {
        try {
          const { data: adminRes, error: adminErr } = await supabase.functions.invoke("admin-auth/get-ihale-detail", {
            body: { token: adminToken, ihaleId: id },
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
      supabase.from("ihale_teklifler").select("id, tutar, created_at, teklif_veren_user_id, odeme_secenekleri, kargo_masrafi, odeme_vadesi, ek_dosya_url, ek_dosya_adi").eq("ihale_id", id).order("created_at", { ascending: false }),
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
      ihale_id: id!,
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
    }
    setSubmitting(false);
  };

  const handleTeklifGeriCek = async () => {
    if (!myTeklif) return;
    // Delete all of user's bids for this ihale
    const { error } = await supabase.from("ihale_teklifler").delete().eq("ihale_id", id!).eq("teklif_veren_user_id", currentUserId);
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

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link to="/tekihale" className="hover:text-foreground transition-colors">İhale Anasayfa</Link>
          {breadcrumbKategori && (
            <>
              <span>/</span>
              <button
                onClick={() => navigate("/tekihale", { state: { kategoriId: ihale.urun_kategori_id || ihale.hizmet_kategori_id, isHizmet: !!ihale.hizmet_kategori_id } })}
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
                onClick={() => navigate("/tekihale", { state: { kategoriId: ihale.urun_kategori_id || ihale.hizmet_kategori_id, grupId: ihale.urun_grup_id || ihale.hizmet_tur_id, isHizmet: !!ihale.hizmet_kategori_id } })}
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
                onClick={() => navigate("/tekihale", { state: { kategoriId: ihale.urun_kategori_id, grupId: ihale.urun_grup_id, turId: ihale.urun_tur_id } })}
                className="hover:text-foreground transition-colors"
              >
                {breadcrumbTur}
              </button>
            </>
          )}
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[300px]">{ihale.baslik}</span>
        </nav>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
          {/* Left: Image + Details */}
          <div className="lg:col-span-3 space-y-6">
            {/* Image Gallery with inline zoom */}
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
                      <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
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
                <InfoRow label="İhale Kategorisi" value={kategoriDisplayLabel} />
                <InfoRow label="Başlangıç Fiyatı" value={ihale.baslangic_fiyati != null ? `${sym}${Number(ihale.baslangic_fiyati).toLocaleString("tr-TR")}` : null} />
                <InfoRow label="Başlangıç Tarihi" value={ihale.baslangic_tarihi ? format(new Date(ihale.baslangic_tarihi), "dd/MM/yyyy", { locale: tr }) : null} />
                <InfoRow label="Bitiş Tarihi" value={ihale.bitis_tarihi ? format(new Date(ihale.bitis_tarihi), "dd/MM/yyyy", { locale: tr }) : null} />
                <InfoRow label="Mesaj Durumu" value={ihale.firma_adi_gizle ? "Hayır" : "Evet"} />
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
                  value={ihale.baslangic_fiyati != null ? `${sym}${Number(ihale.baslangic_fiyati).toLocaleString("tr-TR")}` : null} />
                <InfoRow label="KDV Durum Bilgisi" value={ihale.kdv_durumu} />
                <InfoRow label="Ödeme Seçenekleri" value={ihale.odeme_secenekleri} />
                <InfoRow label="Tercih Edilen Ödeme Vadeleri" value={ihale.odeme_vadesi} />
              </div>
            </Card>

            {/* Teslimat & Kargo */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Teslimat & Kargo Bilgileri</h3>
              <div className="divide-y divide-border">
                <InfoRow label="Kargo Masrafı Ödemesi" value={ihale.kargo_masrafi} />
                <InfoRow label="Kargo Şirketi Anlaşması" value={ihale.kargo_sirketi_anlasmasi} />
                <InfoRow label="Teslimat Tarihi" value={ihale.teslimat_tarihi ? format(new Date(ihale.teslimat_tarihi), "dd/MM/yyyy", { locale: tr }) : null} />
                <InfoRow label="Teslimat Yeri" value={ihale.teslimat_yeri} />
              </div>
            </Card>

            {/* Teknik Detaylar */}
            {Object.keys(resolvedTeknikDetaylar).length > 0 && (
              <Card className="p-6">
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
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={adminActionLoading}
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
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      disabled={!redSebebi || adminActionLoading}
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
            {/* Onay Bloğu - sahip: duzenleniyor/onay_bekliyor/reddedildi/devam_ediyor(karar bilgisi) */}
            {!isAdminViewing && isOwner && (ihale.durum === "duzenleniyor" || ihale.durum === "onay_bekliyor" || ihale.durum === "reddedildi") && (
              <Card className={`p-5 border-2 ${ihale.durum === "reddedildi" ? "border-red-400 bg-red-50 dark:bg-red-950/20" : "border-amber-300 bg-amber-50 dark:bg-amber-950/20"}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">
                    {ihale.durum === "onay_bekliyor" ? "Onay Bekliyor" : ihale.durum === "reddedildi" ? "Reddedildi" : "Önizleme"}
                  </h3>
                  <Badge className={
                    ihale.durum === "onay_bekliyor" ? "bg-amber-500 text-white"
                    : ihale.durum === "reddedildi" ? "bg-red-500 text-white"
                    : "bg-blue-500 text-white"
                  }>
                    {ihale.durum === "onay_bekliyor" ? "İnceleniyor" : ihale.durum === "reddedildi" ? "Reddedildi" : "Taslak"}
                  </Badge>
                </div>
                {/* Admin karar bilgisi */}
                {ihale.admin_karar_veren && (ihale.durum === "reddedildi" || ihale.durum === "devam_ediyor") && (
                  <div className="mb-4 p-3 rounded-lg bg-background border border-border space-y-1.5">
                    <p className="text-sm font-medium text-foreground">
                      Verilen Karar: <span className={ihale.durum === "reddedildi" ? "text-destructive" : "text-emerald-600"}>{ihale.durum === "reddedildi" ? "Reddedildi" : "Onaylandı"}</span>
                    </p>
                    {ihale.admin_karar_sebebi && (
                      <p className="text-sm text-destructive">Sebep: {ihale.admin_karar_sebebi}</p>
                    )}
                    <p className="text-xs text-muted-foreground">İşlemi yapan: {ihale.admin_karar_veren}</p>
                    {ihale.admin_karar_tarihi && (
                      <p className="text-xs text-muted-foreground">Tarih: {format(new Date(ihale.admin_karar_tarihi), "dd/MM/yyyy HH:mm", { locale: tr })}</p>
                    )}
                  </div>
                )}
                {!ihale.admin_karar_veren && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {ihale.durum === "onay_bekliyor"
                      ? "İhaleniz şu anda incelenmektedir. Onay sürecinde düzenleme yapamazsınız."
                      : ihale.durum === "reddedildi"
                      ? "İhaleniz reddedilmiştir. Düzenleyerek yeniden onaya gönderebilirsiniz."
                      : "İhalenizin önizlemesini kontrol edin. Bilgiler doğruysa onaya gönderin veya düzenlemeye devam edin."}
                  </p>
                )}
                <div className="flex gap-3">
                  {(ihale.durum === "duzenleniyor" || ihale.durum === "reddedildi") && (
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => navigate(`/manuihale/duzenle/${ihale.id}`)}
                    >
                      <FileText className="w-4 h-4" />
                      Düzenle
                    </Button>
                  )}
                  {(ihale.durum === "duzenleniyor" || ihale.durum === "reddedildi") && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="flex-1 gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          {ihale.durum === "reddedildi" ? "Yeniden Onaya Gönder" : "Onayla"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>İhaleyi Onaya Göndermek İstediğinize Emin Misiniz?</AlertDialogTitle>
                          <AlertDialogDescription>
                            İhaleniz süper admin onayına gönderilecektir. Onay sürecinde düzenleme yapamazsınız.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await supabase.from("ihaleler").update({ durum: "onay_bekliyor" } as any).eq("id", ihale.id);
                              toast({ title: "İhale onaya gönderildi!" });
                              navigate("/manuihale");
                            }}
                          >
                            Evet, Gönder
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </Card>
            )}
            {/* Onaylandıktan sonra karar bilgisi gösterimi */}
            {!isAdminViewing && isOwner && ihale.durum === "devam_ediyor" && ihale.admin_karar_veren && (
              <Card className="p-5 border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Onaylandı
                  </h3>
                  <Badge className="bg-emerald-500 text-white">Yayında</Badge>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border space-y-1.5">
                  <p className="text-sm font-medium text-foreground">
                    Verilen Karar: <span className="text-emerald-600">Onaylandı</span>
                  </p>
                  <p className="text-xs text-muted-foreground">İşlemi yapan: {ihale.admin_karar_veren}</p>
                  {ihale.admin_karar_tarihi && (
                    <p className="text-xs text-muted-foreground">Tarih: {format(new Date(ihale.admin_karar_tarihi), "dd/MM/yyyy HH:mm", { locale: tr })}</p>
                  )}
                </div>
              </Card>
            )}
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

              {/* Teklif Formu - sadece ihale sahibi değilse ve ihale devam ediyorsa */}
              {!isOwner && ihale.durum === "devam_ediyor" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Teklif Tutarı ({sym})</label>
                    <Input
                      type="number"
                      placeholder={`${sym}${ihale.baslangic_fiyati ? Number(ihale.baslangic_fiyati).toFixed(2) : "0.00"}`}
                      value={teklifTutar}
                      onChange={(e) => setTeklifTutar(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Ödeme Seçenekleri</label>
                    <Select value={teklifOdemeSecenekleri} onValueChange={setTeklifOdemeSecenekleri}>
                      <SelectTrigger><SelectValue placeholder="Ödeme Seçenekleri" /></SelectTrigger>
                      <SelectContent>
                        {dbOdemeSecenekleri.map(o => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Kargo Masrafı Ödemesi</label>
                    <Select value={teklifKargoMasrafi} onValueChange={setTeklifKargoMasrafi}>
                      <SelectTrigger><SelectValue placeholder="Kargo Masrafı Ödemesi" /></SelectTrigger>
                      <SelectContent>
                        {dbKargoMasrafi.map(o => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Ödeme Vadesi</label>
                    <Select value={teklifOdemeVadesi} onValueChange={setTeklifOdemeVadesi}>
                      <SelectTrigger><SelectValue placeholder="Ödeme Vadesi" /></SelectTrigger>
                      <SelectContent>
                        {dbOdemeVadeleri.map(o => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            {/* Bildir button */}
            {!isOwner && (
              <Button variant="outline" className="w-full gap-2 text-muted-foreground" onClick={() => setBildirOpen(true)}>
                <Flag className="w-4 h-4" />
                İhaleyi Bildir
              </Button>
            )}

            {/* Teklifler Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-foreground">Teklifler ({visibleTeklifler.length})</h3>
                </div>
                {!isKapaliTeklif && (
                  <Badge className="bg-destructive text-destructive-foreground text-xs">Canlı</Badge>
                )}
              </div>

              {/* Min / Max / My */}
              {!isKapaliTeklif && (
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
              )}

              {isKapaliTeklif && !isOwner && myTeklif && (
                <div className="text-center p-3 bg-muted rounded-lg mb-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sizin Teklifiniz</p>
                  <p className="font-bold text-foreground text-sm">
                    {`${sym}${myTeklif.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
              )}

              {isKapaliTeklif && !isOwner && (
                <p className="text-xs text-muted-foreground text-center mb-4">
                  Kapalı teklif usulünde yalnızca kendi teklifinizi görebilirsiniz.
                </p>
              )}

              {myRank && !isKapaliTeklif && (
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Teklif sıranız: <strong className="text-foreground">{myRank}.</strong>
                </p>
              )}

              {/* Teklif list */}
              {visibleTeklifler.length > 0 ? (
                <div className="space-y-0">
                  <div className="grid grid-cols-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium py-2 border-b border-border">
                    <span>Teklif Veren</span>
                    <span className="text-center">Zaman</span>
                    <span className="text-right">Teklif</span>
                  </div>
                  {visibleTeklifler.map((t, i) => (
                    <div key={t.id} className={`grid grid-cols-3 py-2.5 text-sm border-b border-border/50 ${t.teklif_veren_user_id === currentUserId ? "bg-primary/5 rounded" : ""}`}>
                      <span className="text-muted-foreground">
                        {isOwner ? (t.firma_unvani || "Anonim") : maskName(t.firma_unvani || `Firma ${i + 1}`)}
                      </span>
                      <span className="text-center text-muted-foreground text-xs">
                        {format(new Date(t.created_at), "dd/MM HH:mm")}
                      </span>
                      <span className="text-right font-medium text-foreground">
                        {`${sym}${t.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz teklif yok.</p>
              )}
            </Card>

            {/* İhale Sahibi Firma */}
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
