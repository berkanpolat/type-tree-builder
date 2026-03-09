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
import {
  Zap,
  BarChart3,
  Settings,
  UserPlus,
  Megaphone,
  Users,
  FileSearch,
  MessageCircle,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
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

  const isoNumbers = ["27001", "20000-1", "27017", "27018", "27701", "9001", "22301"];

  const advantages = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Hızlı ve Kolay İş Birliği",
      desc: "Doğru firmaları filtreleyin, kısa sürede bağlantı kurun ve görüşmeleri tek yerden yönetin.",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Anlık Takip ve Kontrol",
      desc: "Taleplerinizi, teklifleri ve mesajlaşmaları tek panelden izleyin; süreçler dağılmasın.",
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "Verimli ve Ölçülebilir Süreç",
      desc: "Teklifleri kriterlere göre karşılaştırın; daha hızlı karar alın ve operasyonu optimize edin.",
    },
  ];

  const howItWorks = [
    { icon: <UserPlus className="h-7 w-7" />, title: "Ücretsiz Kayıt Ol", desc: "Tekstil A.Ş.'ye saniyeler içinde kayıt ol. Firma türünü seç (Üretici, Marka, Tedarikçi...)", color: "border-t-blue-600" },
    { icon: <Megaphone className="h-7 w-7" />, title: "İhtiyacını Yayınla", desc: "İhtiyacını Yayınla Talebini paylaş, doğru firmalar seni bulsun.", color: "border-t-cyan-500" },
    { icon: <Users className="h-7 w-7" />, title: "Doğru Firmalarla Eşleş", desc: "Gelişmiş filtreleme ile sana uygun firmalarla hızlıca eşleş. Zaman kaybı yok.", color: "border-t-purple-500" },
    { icon: <FileSearch className="h-7 w-7" />, title: "Teklifleri Karşılaştır, Karar Ver", desc: "Gelen teklifleri tek ekranda görüntüle. Fiyat, teslim süresi ve firma profillerini karşılaştır.", color: "border-t-pink-500" },
    { icon: <MessageCircle className="h-7 w-7" />, title: "Güvenle İletişime Geç", desc: "Platform üzerinden doğrudan iletişim kur, süreci hızlandır. İster platform içinde kal...", color: "border-t-indigo-500" },
    { icon: <RefreshCw className="h-7 w-7" />, title: "Sürekli Aktif Sürekli Güncel", desc: "Tekstil A.Ş. yaşayan bir platformdur. Her gün yeni firmalar, yeni talepler ve yeni fırsatlar.", color: "border-t-green-500" },
  ];

  const products = [
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

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <img src={logoImg} alt="Tekstil A.Ş." className="h-10 object-contain" />
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
              Tekstilin Akıllı Şirketlerinin Platformu
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
              <button className="px-10 py-3.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-base hover:bg-secondary/90 transition-colors">
                Tanıtım PDF İndir
              </button>
            </div>
          </div>
          <div className="relative">
            {/* Chart overlay top-left */}
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
            {/* Chart overlay bottom-right */}
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
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-8 flex-wrap">
          {isoNumbers.map((num) => (
            <div key={num} className="flex flex-col items-center gap-1 opacity-60">
              <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">ISO</span>
              </div>
              <span className="text-xs text-muted-foreground">{num}</span>
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
              İşinizi İleri Taşıyan Avantajlar
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Tekstil A.Ş.'nin en cazip özelliklerinden biri, satışlarda %0 satıcı komisyonu sunmasıdır. Bu,
              ürünlerinizi ek maliyet olmadan satmanıza ve kâr marjınızı korumanıza olanak tanır.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {advantages.map((a, i) => (
              <div key={i} className="bg-background rounded-xl p-8 border border-border">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-4">
                  {a.icon}
                </div>
                <h3 className="font-semibold text-secondary text-lg mb-3">{a.title}</h3>
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

      {/* Product Features */}
      {products.map((product, idx) => (
        <section key={idx} className="bg-muted py-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-background rounded-2xl p-8 lg:p-12 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-foreground">
                  Tek<span className="text-secondary">{product.highlight}</span>
                </h3>
                <div className="w-10 h-10 rounded-full border-2 border-secondary flex items-center justify-center text-secondary">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="flex justify-center">
                  <img
                    src={product.img}
                    alt={product.name}
                    className="max-h-80 object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-foreground mb-4">{product.title}</h4>
                  <p className="text-muted-foreground mb-6 leading-relaxed">{product.desc}</p>
                  <div className="space-y-4 mb-8">
                    {product.bullets.map((bullet, bi) => (
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
                    {product.cta}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* For You Section */}
      <section className="bg-background py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-8">
            Sizin İçin Neler Var?
          </h2>
          {/* Tabs */}
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
          {/* Tab Content */}
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

      {/* Footer */}
      <footer className="bg-primary py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoImg} alt="Tekstil A.Ş." className="h-8 brightness-0 invert" />
          <p className="text-primary-foreground/70 text-sm">
            © 2026 Tekstil A.Ş. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
