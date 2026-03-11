import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/tekstil-as-logo.png";
import heroImg from "@/assets/landing-hero.jpg";
import tekihaleImg from "@/assets/landing-tekihale.png";
import tekrehberImg from "@/assets/landing-tekrehber.png";
import tekpazarImg from "@/assets/landing-tekpazar.png";
import fabricImg from "@/assets/landing-fabric.jpg";
import warehouseImg from "@/assets/landing-warehouse.jpg";
import iso27001Img from "@/assets/iso-27001.png";
import iso20000Img from "@/assets/iso-20000.png";
import iso27017Img from "@/assets/iso-27017.png";
import iso27018Img from "@/assets/iso-27018.png";
import iso27701Img from "@/assets/iso-27701.png";
import iso9001Img from "@/assets/iso-9001.png";
import iso22301Img from "@/assets/iso-22301.png";
import kosgebImg from "@/assets/kosgeb.png";
import Footer from "@/components/Footer";
import { PAKET_OZELLIKLERI, STRIPE_CONFIG } from "@/lib/package-config";
import { Mail, Phone, MapPin } from "lucide-react";
import {
  BadgeDollarSign,
  Globe,
  ShoppingBag,
  UserPlus,
  Megaphone,
  Users,
  FileSearch,
  MessageCircle,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Package,
  Briefcase,
  Pen,
  Building2,
  Scissors,
} from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tedarikci");
  const [productSlide, setProductSlide] = useState(0);
  const [billingYearly, setBillingYearly] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/anasayfa", { replace: true });
      } else {
        setLoading(false);
      }
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isoBadges = [
    { label: "27001", img: iso27001Img, scale: "scale-[1.15]" },
    { label: "20000-1", img: iso20000Img, scale: "" },
    { label: "27017", img: iso27017Img, scale: "" },
    { label: "27018", img: iso27018Img, scale: "" },
    { label: "27701", img: iso27701Img, scale: "" },
    { label: "9001", img: iso9001Img, scale: "scale-[1.15]" },
    { label: "22301", img: iso22301Img, scale: "scale-[1.15]" },
    { label: "KOSGEB", img: kosgebImg, scale: "scale-[1.15]" },
  ];

  const advantages = [
    {
      icon: <BadgeDollarSign className="h-6 w-6" />,
      title: "Sıfır Maliyet!",
      desc: "Ücretsiz üyelik ile hemen başlarsınız. Satışlarından ve anlaşmalarınızdan Komisyon ve Kesinti alınmaz",
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "İnternette Görünür olun!",
      desc: "Profesyonel pazarlama ekibimiz ile sizin için SEO hizmeti sunarız ve reklam harcamaları yaparak sosyal medya hesaplarından iletişim sağlarız.",
    },
    {
      icon: <ShoppingBag className="h-6 w-6" />,
      title: "Toptan Pazar Yeri",
      desc: "Atıl Stoklarınızı ve yeni ürünlerinizi nakite çevirirsiniz.",
    },
  ];

  const howItWorks = [
    { icon: <UserPlus className="h-7 w-7" />, title: "Ücretsiz Kayıt Ol", desc: "Tekstil A.Ş.'ye saniyeler içinde kayıt ol. Firma türünü seç (Üretici, Marka, Tedarikçi...)", color: "border-t-blue-600" },
    { icon: <Megaphone className="h-7 w-7" />, title: "İhtiyacını Yayınla", desc: "Talebini paylaş, doğru firmalar seni bulsun, onlarca teklifi tek tıkla topla.", color: "border-t-cyan-500" },
    { icon: <Users className="h-7 w-7" />, title: "Doğru Firmalarla Eşleş", desc: "Gelişmiş filtreleme ile sana uygun firmalarla hızlıca eşleş. Zaman kaybı yok.", color: "border-t-purple-500" },
    { icon: <FileSearch className="h-7 w-7" />, title: "Teklifleri Karşılaştır, Karar Ver", desc: "Gelen teklifleri tek ekranda görüntüle. Fiyat, teslim süresi ve firma profillerini karşılaştır.", color: "border-t-pink-500" },
    { icon: <MessageCircle className="h-7 w-7" />, title: "Güvenle İletişime Geç", desc: "Platform üzerinden doğrudan iletişim kur, süreci hızlandır.", color: "border-t-indigo-500" },
    { icon: <RefreshCw className="h-7 w-7" />, title: "Sürekli Aktif, Sürekli Güncel", desc: "Tekstil A.Ş. yaşayan bir platformdur. Her gün yeni firmalar, yeni talepler ve yeni fırsatlar...", color: "border-t-green-500" },
  ];

  const products = [
    {
      name: "TekRehber",
      highlight: "Rehber",
      img: tekrehberImg,
      title: "Tekstilin Profesyonel İş Ağı",
      desc: "TekRehber, tekstil sektöründeki firmaları detaylı profillerle tek bir dijital rehberde toplar. İhtiyacınıza göre filtreleyin, doğru iş ortağını bulun ve iletişimi doğrudan başlatın.",
      bullets: [
        "Detaylı firma profilleri: uzmanlık, kapasite, tesis, sertifika ve referanslar.",
        "Gelişmiş filtreleme ile saniyeler içinde doğru eşleşme.",
        "Doğrudan iletişim kurun; yeni iş fırsatları yakalayın.",
      ],
      cta: "Ücretsiz Başlayın",
    },
    {
      name: "TekPazar",
      highlight: "Pazar",
      img: tekpazarImg,
      title: "Tekstilde Toptan Ticaret İçin Tek Panel Yönetim",
      desc: "Üreticiler ve tedarikçiler ürünlerini sergiler; markalar ve alıcılar doğru ürüne, doğru koşullarla ulaşır. Tüm toptan ticaret süreci tek panelden, kontrollü şekilde yönetilir",
      bullets: [
        "Ürünlerinizi vitrine çıkarın, yeni müşteri ve yeni satış kanalı kazanın.",
        "Ürün bazlı arama ve filtreleme ile doğru ürüne/doğru satıcıya hızlıca ulaşın",
        "Talep–teklif akışı ve mesajlaşma ile süreci kontrollü ve şeffaf şekilde yönetin.",
      ],
      cta: "Ücretsiz Ürün Yükleyin",
    },
    {
      name: "Tekİhale",
      highlight: "İhale",
      img: tekihaleImg,
      title: "Teklif Toplamanın ve Vermenin En Verimli Yolu",
      desc: "Tekİhale, talep sahipleri ile teklif verenleri şeffaf ve kontrollü bir ortamda buluşturur. İhalenizi kriterlere göre oluşturun, teklifleri karşılaştırın ve tüm süreci tek panelden canlı yönetin.",
      bullets: [
        "Gelen yüzlerce teklifi karşılaştırın, rekabetçi fiyatlarla maksimum kar elde edin.",
        "Stok fazlası ürünlerinizi açık arttırma ile nakite çevirin ya da ihtiyacınız olan ürünlere en uygun fiyatlarla ulaşın",
        "Üretim ihalesi açın; siz üreticilere değil, üreticiler size gelsin ya da boş kapasitenizi değerlendirmek için teklif verin.",
      ],
      cta: "Ücretsiz İhale Başlat",
    },
  ];

  const tabData: Record<string, { title: string; desc: string; bullets: string[] }> = {
    tedarikci: {
      title: "TekRehber ile doğru alıcıları bulun, siz de görünürlüğünüzü artırın.",
      desc: "Tekstil A.Ş., kumaş/aksesuar/yan sanayi tedarikçilerini doğru alıcılarla buluşturur; hızlı teklif ve düzenli sipariş akışı sağlar.",
      bullets: [
        "TekRehber ile doğru alıcılar tarafından daha kolay bulun, görünürlüğünü artır.",
        "Tekİhale üzerinden taleplere hızlı teklif ver, satış sürecini kısalt.",
        "Aracı karmaşası olmadan doğrudan temas.",
      ],
    },
    uretici: {
      title: "Üretici Firmalar İçin Yeni İş Fırsatları",
      desc: "Tekstil A.Ş., üretici firmaları markalar ve alıcılarla buluşturarak kapasite kullanımını artırır.",
      bullets: [
        "Boş kapasitenizi değerlendirin, yeni müşteriler kazanın.",
        "Tekİhale ile üretim taleplerine hızlıca teklif verin.",
        "TekRehber'de detaylı firma profilinizi oluşturun, görünür olun.",
      ],
    },
    marka: {
      title: "Markalar İçin Doğru Üretici ve Tedarik Ağı",
      desc: "Tekstil A.Ş., markaları doğrulanmış üreticiler ve tedarikçilerle buluşturarak sourcing süreçlerini hızlandırır, maliyetleri kontrol altına alır.",
      bullets: [
        "Kapasitesi ve uzmanlığı net üreticilere erişim",
        "Sertifika, referans ve tesis bilgileriyle şeffaf seçim",
        "Tedarik riskini dağıtan güçlü bir network",
      ],
    },
    mumessil: {
      title: "Mümessil Ofisler İçin Daha Fazla Sipariş ve Daha Hızlı Eşleşme",
      desc: "Tekstil A.Ş. ile üretim kapasitenizi doğru markalarla buluşturun ve satın alma süreçleriniz daha karlı ve şeffaf hale getirin.",
      bullets: [
        "Geniş ağdan doğru firmaları filtreleyin; doğru eşleşme ile zaman kazanın.",
        "Teklif süreçlerini Tekİhale üzerinden yöneterek şeffaflık sağlayın",
        "Marka–üretici–tedarikçi iletişimini tek noktada toplayın, operasyonu hızlandırın.",
      ],
    },
    fason: {
      title: "Fason Atölyeler İçin Sürekli İş ve Güvenilir Bağlantılar",
      desc: "Tekstil A.Ş. ile üretici firmalar ve markalar tarafından fark edilin. TekIhale ile açılan üretim taleplerine teklif verin ve kapasitenizi doldurun.",
      bullets: [
        "Uzmanlık alanınızı öne çıkarın, kapasitenizi ve referanslarınızı tüm üreticilere gösterin.",
        "10.000+ üreticiye ulaşın, iş çevrenizi genişletin.",
        "Tekstilde Toptan Ticaretin Adresi",
      ],
    },
  };

  const tabs = [
    { key: "tedarikci", label: "Tedarikçi", icon: <Package className="h-4 w-4" /> },
    { key: "uretici", label: "Üretici Firma", icon: <Briefcase className="h-4 w-4" /> },
    { key: "marka", label: "Marka", icon: <Pen className="h-4 w-4" /> },
    { key: "mumessil", label: "Mümessil Ofis", icon: <Building2 className="h-4 w-4" /> },
    { key: "fason", label: "Fason Atölye", icon: <Scissors className="h-4 w-4" /> },
  ];

  const handlePrevSlide = () => {
    setProductSlide((prev) => (prev === 0 ? products.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setProductSlide((prev) => (prev === products.length - 1 ? 0 : prev + 1));
  };

  const currentProduct = products[productSlide];

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Top Info Strip */}
      <div className="bg-primary text-primary-foreground text-xs">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-6 flex-wrap">
            <a href="mailto:info@tekstilas.com" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <Mail className="h-3.5 w-3.5" /> info@tekstilas.com
            </a>
            <a href="tel:+908502425700" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <Phone className="h-3.5 w-3.5" /> +90 (850) 242 5700
            </a>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Ataşehir, İstanbul
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://www.instagram.com/tekstilascom/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://www.linkedin.com/company/tekstilas" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <span className="opacity-40 cursor-default" title="Yakında">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </span>
            <a href="https://www.facebook.com/tekstilas" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <img src={logoImg} alt="Tekstil A.Ş." className="h-7 object-contain" />
          <Link
            to="/giris-kayit"
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Giriş Yap / Kayıt Ol
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-background via-background to-muted">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
              İşiniz Tekstilse, Yeriniz <span className="text-secondary">Tekstil A.Ş.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Markalar, üreticiler, tedarikçiler, mümessil ofisler ve fason atölyeler tek panelde
              buluşuyor. Doğru firmaya hızlıca ulaşın, teklif alın, teklif verin, yeni iş fırsatlarını
              yakalayın!
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/giris-kayit"
                className="px-10 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors"
              >
                Ücretsiz Kayıt Ol
              </Link>
              <a href="/Tekstil_AS_Kurumsal_Sunum_v2.pdf" download className="px-10 py-3.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-base hover:bg-secondary/90 transition-colors">
                Tanıtım PDF İndir
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-6 -left-2 z-10 bg-background rounded-xl shadow-lg p-4 hidden lg:block">
              <div className="flex items-center gap-4 mb-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> 2024</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary inline-block" /> 2025</span>
              </div>
              <div className="flex items-end gap-2 h-20">
                {[3, 5, 8, 6, 10, 12].map((h, i) => (
                  <div key={i} className="flex gap-0.5">
                    <div className="w-3 rounded-t bg-primary/60" style={{ height: `${h * 5}px` }} />
                    <div className="w-3 rounded-t bg-secondary/70" style={{ height: `${(h + 2) * 5}px` }} />
                  </div>
                ))}
              </div>
            </div>
            <img
              src={heroImg}
              alt="Tekstil sektörü profesyonelleri"
              className="rounded-2xl shadow-xl w-full object-cover aspect-[4/3]"
            />
            <div className="absolute -bottom-6 -right-2 z-10 bg-background rounded-xl shadow-lg p-4 hidden lg:block">
              <div className="h-16 w-40 flex items-end">
                <svg viewBox="0 0 160 60" className="w-full h-full">
                  <polyline
                    fill="none"
                    stroke="hsl(190, 70%, 55%)"
                    strokeWidth="2"
                    points="0,50 30,40 60,42 90,30 120,28 150,15"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ISO Banner */}
      <section className="bg-background py-10 border-y border-border overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-center gap-8 md:gap-12 flex-wrap">
          {isoBadges.map((badge) => (
            <div key={badge.label} className="w-[72px] h-[72px] flex-shrink-0 flex items-center justify-center">
              <img
                src={badge.img}
                alt={badge.label}
                className={`w-[72px] h-[72px] object-contain opacity-60 hover:opacity-100 transition-opacity ${badge.scale}`}
                style={{ imageRendering: "crisp-edges" }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Advantages */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(224,50%,18%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground">
              Tekstil A.Ş. Üyesi Olmanın Avantajları:
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Tedarikçi veya müşteri aramaya son. Aradığınız üretim kapasitesine, sertifikalara ve ürün
              grubuna sahip onaylı firmalarla tek tıkla eşleşin, zaman kazanın.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {advantages.map((a, i) => (
              <div key={i} className="bg-background rounded-xl p-8 border border-border">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-4">
                  {a.icon}
                </div>
                <h3 className="font-bold text-secondary text-lg mb-3">{a.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Nasıl Çalışır?</h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-2xl">
            Tekstil sektörünün tüm paydaşlarını tek platformda buluşturan Tekstil A.Ş.
            iş yapmayı hızlandırır, süreci sadeleştirir ve doğru bağlantıyı kurmanı sağlar.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((item, i) => (
              <div key={i} className={`bg-background rounded-xl p-8 border-t-4 ${item.color} shadow-sm`}>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-primary mb-5">
                  {item.icon}
                </div>
                <h3 className="font-bold text-foreground text-lg mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Features - Slider */}
      <section className="bg-muted py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-background rounded-2xl p-8 lg:p-12 shadow-sm relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-foreground">
                Tek<span className="text-secondary">{currentProduct.highlight}</span>
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevSlide}
                  className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:border-secondary hover:text-secondary transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-1.5">
                  {products.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setProductSlide(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === productSlide ? "bg-secondary" : "bg-border"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleNextSlide}
                  className="w-10 h-10 rounded-full border-2 border-secondary flex items-center justify-center text-secondary hover:bg-secondary hover:text-secondary-foreground transition-colors"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-12 items-center transition-all duration-500">
              <div className="flex justify-center">
                <img
                  key={productSlide}
                  src={currentProduct.img}
                  alt={currentProduct.name}
                  className="max-h-80 object-contain animate-fade-in"
                />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-foreground mb-4">{currentProduct.title}</h4>
                <p className="text-muted-foreground mb-6 leading-relaxed">{currentProduct.desc}</p>
                <div className="space-y-4 mb-8">
                  {currentProduct.bullets.map((bullet, bi) => (
                    <div key={bi} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground font-medium text-sm">{bullet}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/giris-kayit"
                  className="inline-block px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  {currentProduct.cta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For You Section */}
      <section className="bg-background py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-8">
            Sizin İçin Neler Var?
          </h2>
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center bg-muted rounded-full p-1 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src={fabricImg}
                alt="Tekstil kumaşları"
                className="rounded-2xl shadow-lg w-full max-w-md object-cover aspect-[4/3]"
              />
              <img
                src={warehouseImg}
                alt="Tekstil deposu"
                className="rounded-2xl shadow-lg w-72 object-cover aspect-[4/3] absolute -bottom-8 right-0 border-4 border-background"
              />
            </div>
            <div>
              <h3 className="text-2xl lg:text-3xl font-bold text-primary mb-4">
                {tabData[activeTab].title}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {tabData[activeTab].desc}
              </p>
              <div className="space-y-4 mb-8">
                {tabData[activeTab].bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground font-medium">{b}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/giris-kayit"
                className="inline-block px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Hemen Kayıt Ol
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-muted/40 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="inline-block px-5 py-2 rounded-full bg-secondary text-secondary-foreground font-semibold text-sm mb-4">
              Tekstil Profesyonellerine Özel
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Sektör Liderlerinin Arasına<br />Girmeye Hazırsan
            </h2>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-sm font-medium ${!billingYearly ? "text-foreground" : "text-muted-foreground"}`}>Aylık</span>
            <button
              onClick={() => setBillingYearly(!billingYearly)}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors ${billingYearly ? "bg-secondary" : "bg-border"}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${billingYearly ? "translate-x-8" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm font-medium ${billingYearly ? "text-foreground" : "text-muted-foreground"}`}>Yıllık</span>
            {billingYearly && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">%45+ İndirim</span>}
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Ücretsiz */}
            <div className="bg-background rounded-2xl border border-border p-6 flex flex-col">
              <span className="inline-block w-fit px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold mb-2">Üye</span>
              <p className="text-sm text-muted-foreground mb-3">İnternette Görünür Ol!</p>
              <p className="text-4xl font-extrabold text-foreground mb-6">$0</p>
              <div className="border-t border-border pt-4 space-y-3 flex-1">
                {[
                  ["İhale Açma", PAKET_OZELLIKLERI.ucretsiz.ihale_acma],
                  ["Teklif Verme", PAKET_OZELLIKLERI.ucretsiz.teklif_verme],
                  ["Pazar Yeri", PAKET_OZELLIKLERI.ucretsiz.aktif_urun],
                  ["Mesaj", PAKET_OZELLIKLERI.ucretsiz.mesaj],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{label}</span>
                    </div>
                    <span className="text-muted-foreground font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/giris-kayit"
                className="mt-6 block text-center px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Hemen Kayıt Ol
              </Link>
            </div>

            {/* PRO */}
            <div className="bg-background rounded-2xl border-2 border-secondary p-6 flex flex-col relative">
              <div className="absolute -top-3 right-4 w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                <span className="text-lg">⭐</span>
              </div>
              <span className="inline-block w-fit px-3 py-1 rounded-full bg-secondary/20 text-secondary font-bold text-xs mb-2">PRO</span>
              <p className="text-sm text-muted-foreground mb-3">Profesyonel Ol!</p>
              <div className="mb-6 flex items-baseline gap-2">
                {billingYearly ? (
                  <>
                    <span className="text-sm text-destructive line-through">${STRIPE_CONFIG.pro.aylik.fiyat * 12}</span>
                    <span className="text-4xl font-extrabold text-foreground">${STRIPE_CONFIG.pro.yillik.fiyat}</span>
                    <span className="text-muted-foreground text-sm">/ Yıl</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-extrabold text-foreground">${STRIPE_CONFIG.pro.aylik.fiyat}</span>
                    <span className="text-muted-foreground text-sm">/ Ay</span>
                  </>
                )}
              </div>
              <div className="border-t border-border pt-4 space-y-3 flex-1">
                {[
                  ["İhale Açma", PAKET_OZELLIKLERI.pro.ihale_acma],
                  ["Teklif Verme", PAKET_OZELLIKLERI.pro.teklif_verme],
                  ["Pazar Yeri", PAKET_OZELLIKLERI.pro.aktif_urun],
                  ["Mesaj", PAKET_OZELLIKLERI.pro.mesaj],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-secondary" />
                      <span className="text-foreground">{label}</span>
                    </div>
                    <span className="font-bold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/giris-kayit"
                className="mt-6 block text-center px-6 py-3 rounded-full bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/90 transition-colors"
              >
                Hemen Kayıt Ol
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
