import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  MessageSquare,
  Phone,
  Globe,
  Mail,
  MapPin,
  ImageIcon,
  Bookmark,
  CalendarDays,
  Factory,
  Users,
  Briefcase,
  Award,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  SiLinkedin,
  SiInstagram,
  SiFacebook,
  SiTiktok,
} from "react-icons/si";
import { RiTwitterXFill } from "react-icons/ri";

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

export default function FirmaDetay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [firma, setFirma] = useState<FirmaData | null>(null);
  const [secenekMap, setSecenekMap] = useState<Record<string, string>>({});
  const [firmaTuruName, setFirmaTuruName] = useState("");
  const [firmaTipiName, setFirmaTipiName] = useState("");
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  // Related data
  const [tesisler, setTesisler] = useState<Tesis[]>([]);
  const [sertifikalar, setSertifikalar] = useState<Sertifika[]>([]);
  const [referanslar, setReferanslar] = useState<Referans[]>([]);
  const [galeri, setGaleri] = useState<GaleriFoto[]>([]);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [makineler, setMakineler] = useState<Makine[]>([]);
  const [teknolojiler, setTeknolojiler] = useState<Teknoloji[]>([]);
  const [uretimSatisItems, setUretimSatisItems] = useState<{ tip: string; kategori: string; grup: string; tur: string }[]>([]);
  const [urunHizmetItems, setUrunHizmetItems] = useState<{ kategori: string; secenek: string }[]>([]);

  const [activeMenu, setActiveMenu] = useState("hakkinda");
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
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Fetch firma
      const { data: firmaData } = await supabase
        .from("firmalar")
        .select("*")
        .eq("id", id)
        .single();

      if (!firmaData) {
        toast({ title: "Firma bulunamadı", variant: "destructive" });
        navigate("/anasayfa");
        return;
      }
      setFirma(firmaData as FirmaData);

      // All parallel fetches
      const [
        secenekRes, turleriRes, tipleriRes, favRes,
        tesisRes, sertRes, refRes, galRes, urunRes, makRes, tekRes,
        uretimSatisRes, urunHizmetRes,
      ] = await Promise.all([
        supabase.from("firma_bilgi_secenekleri").select("id, name"),
        supabase.from("firma_turleri").select("id, name"),
        supabase.from("firma_tipleri").select("id, name"),
        user ? supabase.from("firma_favoriler").select("id").eq("user_id", user.id).eq("firma_id", id) : Promise.resolve({ data: [] }),
        supabase.from("firma_tesisler").select("*").eq("firma_id", id),
        supabase.from("firma_sertifikalar").select("*").eq("firma_id", id),
        supabase.from("firma_referanslar").select("*").eq("firma_id", id),
        supabase.from("firma_galeri").select("*").eq("firma_id", id),
        supabase.from("urunler").select("id, baslik, foto_url, fiyat, para_birimi, urun_no, durum").eq("user_id", firmaData.user_id).eq("durum", "aktif"),
        supabase.from("firma_makineler").select("*").eq("firma_id", id),
        supabase.from("firma_teknolojiler").select("*").eq("firma_id", id),
        supabase.from("firma_uretim_satis").select("*").eq("firma_id", id),
        supabase.from("firma_urun_hizmet_secimler").select("*").eq("firma_id", id),
      ]);

      // Build secenek map
      const sMap: Record<string, string> = {};
      secenekRes.data?.forEach((s: any) => { sMap[s.id] = s.name; });
      setSecenekMap(sMap);

      // Firma turu/tipi
      const turu = turleriRes.data?.find((t: any) => t.id === firmaData.firma_turu_id);
      setFirmaTuruName(turu?.name || "Belirtilmedi");
      const tipi = tipleriRes.data?.find((t: any) => t.id === firmaData.firma_tipi_id);
      setFirmaTipiName(tipi?.name || "Belirtilmedi");

      // Fav
      setIsFavorited((favRes.data || []).length > 0);

      // Tesisler
      setTesisler((tesisRes.data || []).map((t: any) => ({
        id: t.id,
        tesis_adi: sMap[t.tesis_adi_id] || "Belirtilmedi",
        il: sMap[t.il_id] || "Belirtilmedi",
        ilce: sMap[t.ilce_id] || "Belirtilmedi",
        adres: t.tesis_adresi || "",
        makine_gucu: t.makine_gucu || "Belirtilmedi",
        is_gucu: sMap[t.is_gucu_id] || "Belirtilmedi",
      })));

      // Sertifikalar
      setSertifikalar((sertRes.data || []).map((s: any) => ({
        id: s.id,
        kategori: sMap[s.sertifika_kategori_id] || "",
        tur: sMap[s.sertifika_tur_id] || "",
        verilis: s.verilis_tarihi,
        gecerlilik: s.gecerlilik_tarihi,
      })));

      // Referanslar
      setReferanslar((refRes.data || []).map((r: any) => ({
        id: r.id,
        referans_adi: r.referans_adi,
        logo_url: r.logo_url,
      })));

      // Galeri
      setGaleri((galRes.data || []).map((g: any) => ({
        id: g.id,
        foto_url: g.foto_url,
        foto_adi: g.foto_adi,
      })));

      // Ürünler
      setUrunler((urunRes.data || []) as Urun[]);

      // Makineler
      setMakineler((makRes.data || []).map((m: any) => ({
        id: m.id,
        kategori: sMap[m.makine_kategori_id] || "",
        tur: sMap[m.makine_tur_id] || "",
        sayisi: m.makine_sayisi || "Belirtilmedi",
        tesis: sMap[(tesisRes.data || []).find((t: any) => t.id === m.tesis_id)?.tesis_adi_id] || "Belirtilmedi",
      })));

      // Teknolojiler
      setTeknolojiler((tekRes.data || []).map((t: any) => ({
        id: t.id,
        kategori: sMap[t.teknoloji_kategori_id] || "",
        tur: sMap[t.teknoloji_tur_id] || "",
      })));

      // Üretim/Satış
      setUretimSatisItems((uretimSatisRes.data || []).map((u: any) => ({
        tip: u.tip,
        kategori: sMap[u.kategori_id] || "",
        grup: sMap[u.grup_id] || "",
        tur: sMap[u.tur_id] || "",
      })));

      // Ürün/Hizmet seçimleri
      setUrunHizmetItems((urunHizmetRes.data || []).map((u: any) => ({
        kategori: sMap[u.kategori_id] || u.kategori_id,
        secenek: sMap[u.secenek_id] || "",
      })));

      setLoading(false);
    };
    fetchAll();
  }, [id, navigate, toast]);

  const toggleFavorite = async () => {
    if (!currentUserId || !id) {
      navigate("/giris-kayit");
      return;
    }
    if (isFavorited) {
      await supabase.from("firma_favoriler").delete().eq("user_id", currentUserId).eq("firma_id", id);
      setIsFavorited(false);
      toast({ title: "Favorilerden çıkarıldı" });
    } else {
      await supabase.from("firma_favoriler").insert({ user_id: currentUserId, firma_id: id });
      setIsFavorited(true);
      toast({ title: "Favorilere eklendi" });
    }
  };

  const handleMessage = async () => {
    if (!currentUserId || !firma) {
      navigate("/giris-kayit");
      return;
    }
    navigate(`/mesajlar?userId=${firma.user_id}`);
  };

  // Resolve helper
  const resolve = (idVal: string | null) => {
    if (!idVal) return "Belirtilmedi";
    return secenekMap[idVal] || "Belirtilmedi";
  };

  const kurulusYili = firma?.kurulus_tarihi || "Belirtilmedi";
  const ilIlce = firma ? `${resolve(firma.kurulus_il_id)}${firma.kurulus_ilce_id ? `, ${resolve(firma.kurulus_ilce_id)}` : ""}` : "Belirtilmedi";

  // Faaliyet alanı from üretim/satış
  const faaliyetAlani = uretimSatisItems.length > 0
    ? [...new Set(uretimSatisItems.map(u => u.kategori))].join(", ")
    : "Belirtilmedi";

  // Üretim modeli
  const uretimModeli = firma?.uretim_satis_rolu || "Belirtilmedi";

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PazarHeader />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!firma) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <PazarHeader />

      {/* ===== HEADER / BANNER ===== */}
      <div className="relative">
        {/* Banner image */}
        <div className="w-full h-48 md:h-56 bg-muted overflow-hidden">
          {firma.kapak_fotografi_url ? (
            <img src={firma.kapak_fotografi_url} alt="Kapak" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/5" />
          )}
        </div>

        {/* Info bar overlapping banner */}
        <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <div className="flex flex-col md:flex-row items-start gap-4">
              {/* Logo */}
              <div className="w-20 h-20 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                {firma.logo_url ? (
                  <img src={firma.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              {/* Title & badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">{firma.firma_unvani}</h1>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge className="bg-secondary text-secondary-foreground text-xs">{firmaTuruName}</Badge>
                  <Badge variant="outline" className="text-xs border-secondary text-secondary">{firmaTipiName}</Badge>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {ilIlce}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={toggleFavorite}
                >
                  <Bookmark className={`w-4 h-4 ${isFavorited ? "fill-secondary text-secondary" : ""}`} />
                  Kaydet
                </Button>
                <Button className="gap-1.5 bg-primary" onClick={handleMessage}>
                  <MessageSquare className="w-4 h-4" />
                  Mesaj
                </Button>
              </div>
            </div>

            {/* 4 stats row */}
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
      </div>

      {/* ===== STICKY TAB MENU ===== */}
      <div className="sticky top-0 z-30 bg-background border-b border-border mt-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-6 overflow-x-auto py-3">
            {MENU_ITEMS.map((item) => (
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
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-3">Firma Hakkında</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {firma.firma_hakkinda || "Henüz firma hakkında bilgi girilmemiştir."}
                </p>
              </Card>
            </div>

            {/* Ürün/Hizmet */}
            <div ref={el => { sectionRefs.current["urun-hizmet"] = el; }}>
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Ürün/Hizmet</h2>
                <div className="space-y-3 text-sm">
                  {uretimSatisItems.length > 0 && (
                    <>
                      <div>
                        <span className="font-semibold text-foreground">Üretim Yetkinlikleri: </span>
                        <span className="text-muted-foreground">
                          {[...new Set(uretimSatisItems.filter(u => u.tip === "uretim").map(u => u.tur))].join(", ") || "Belirtilmedi"}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Satıcısı Olduğu Ürünler: </span>
                        <span className="text-muted-foreground">
                          {[...new Set(uretimSatisItems.filter(u => u.tip === "satis").map(u => u.tur))].join(", ") || "Belirtilmedi"}
                        </span>
                      </div>
                    </>
                  )}
                  {uretimSatisItems.length === 0 && urunHizmetItems.length === 0 && (
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
              </Card>
            </div>

            {/* Tesis Bilgileri */}
            <div ref={el => { sectionRefs.current["tesis"] = el; }}>
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Tesis Bilgileri</h2>
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
              </Card>
            </div>

            {/* Makine Gücü ve Teknoloji */}
            <div ref={el => { sectionRefs.current["makine"] = el; }}>
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Makine Gücü ve Teknoloji</h2>
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
                  <p className="text-sm text-muted-foreground">Henüz makine bilgisi girilmemiştir.</p>
                )}
                {teknolojiler.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-foreground mt-4 mb-2">Yazılım ve Teknoloji</h3>
                    <div className="flex flex-wrap gap-2">
                      {teknolojiler.map(t => (
                        <Badge key={t.id} variant="outline" className="text-xs">
                          {t.kategori} - {t.tur}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </div>

            {/* Ürünler */}
            <div ref={el => { sectionRefs.current["urunler"] = el; }}>
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Ürünler</h2>
                {urunler.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
          </div>

          {/* RIGHT COLUMN (1/3) */}
          <div className="space-y-6">
            {/* İletişim */}
            <Card className="p-5">
              <h3 className="text-base font-bold text-foreground mb-4">İletişim</h3>
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

              {/* Social media */}
              <Separator className="my-4" />
              <div className="flex items-center justify-center gap-3">
                {firma.linkedin && (
                  <a href={firma.linkedin.startsWith("http") ? firma.linkedin : `https://${firma.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <SiLinkedin className="w-4 h-4" /> LinkedIn
                  </a>
                )}
                {firma.instagram && (
                  <a href={firma.instagram.startsWith("http") ? firma.instagram : `https://${firma.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <SiInstagram className="w-4 h-4" /> Instagram
                  </a>
                )}
                {firma.facebook && (
                  <a href={firma.facebook.startsWith("http") ? firma.facebook : `https://${firma.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <SiFacebook className="w-4 h-4" /> Facebook
                  </a>
                )}
                {firma.x_twitter && (
                  <a href={firma.x_twitter.startsWith("http") ? firma.x_twitter : `https://${firma.x_twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <RiTwitterXFill className="w-4 h-4" /> X
                  </a>
                )}
                {firma.tiktok && (
                  <a href={firma.tiktok.startsWith("http") ? firma.tiktok : `https://${firma.tiktok}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <SiTiktok className="w-4 h-4" /> TikTok
                  </a>
                )}
                {!firma.linkedin && !firma.instagram && !firma.facebook && !firma.x_twitter && !firma.tiktok && (
                  <p className="text-sm text-muted-foreground">Sosyal medya hesabı belirtilmemiştir.</p>
                )}
              </div>
            </Card>

            {/* Sertifikalar */}
            <div ref={el => { sectionRefs.current["sertifikalar"] = el; }}>
              <Card className="p-5">
                <h3 className="text-base font-bold text-foreground mb-4">Sertifikalar</h3>
                {sertifikalar.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {sertifikalar.slice(0, 6).map(s => (
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
                {sertifikalar.length > 6 && (
                  <button onClick={() => scrollToSection("sertifikalar")} className="text-xs text-secondary mt-3 hover:underline">
                    Tümünü Gör
                  </button>
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
            <div className="rounded-xl overflow-hidden border border-border bg-gradient-to-b from-secondary/10 to-secondary/5 flex items-center justify-center h-64">
              <p className="text-sm text-muted-foreground font-medium">Reklam Alanı</p>
            </div>
          </div>
        </div>

        {/* Galeri - Full width */}
        <div ref={el => { sectionRefs.current["galeri"] = el; }} className="mt-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Galeri</h2>
            {galeri.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {galeri.map(g => (
                  <div key={g.id} className="aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={g.foto_url} alt={g.foto_adi || "Galeri"} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Henüz galeri fotoğrafı eklenmemiştir.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
