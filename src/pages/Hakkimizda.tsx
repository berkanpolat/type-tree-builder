import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import Footer from "@/components/Footer";
import logoImg from "@/assets/tekstil-as-logo.png";
import { Target, Eye, Layers, ShoppingBag, Gavel, Users, Briefcase } from "lucide-react";

export default function Hakkimizda() {
  const navigate = useNavigate();
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [firmaLogoUrl, setFirmaLogoUrl] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const { data: firma } = await supabase
          .from("firmalar")
          .select("firma_unvani, logo_url")
          .eq("user_id", user.id)
          .single();
        if (firma) {
          setFirmaUnvani(firma.firma_unvani);
          setFirmaLogoUrl(firma.logo_url);
        }
      }
    };
    init();
  }, []);

  const modules = [
    {
      icon: Users,
      title: "TekRehber",
      description: "Tekstil endüstrisindeki markaları, üreticileri, tedarikçileri, atölyeleri ve mümessil ofisleri tek bir dijital rehberde toplayan arama modülüdür.",
    },
    {
      icon: ShoppingBag,
      title: "TekPazar",
      description: "Tekstil sektöründe toptan alım ve satım yapan firmaları; güvenli, şeffaf ve profesyonel bir dijital ticaret ortamında buluşturan bir modüldür.",
    },
    {
      icon: Gavel,
      title: "Tekİhale",
      description: "Satın alma süreçlerini şeffaf ve hızlı bir teklif toplama/verme sistemine dönüştüren bir modüldür.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isLoggedIn && <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />}

      {/* Hero */}
      <section className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-secondary rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
          <img src={logoImg} alt="Tekstil A.Ş." className="h-8 brightness-0 invert mb-6" />
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground leading-tight">
            Tekstil Sektörünün<br />
            <span className="text-secondary">Dijital Buluşma Noktası</span>
          </h1>
          <p className="mt-6 text-primary-foreground/70 text-lg max-w-2xl mx-auto leading-relaxed">
            Üretimden tedariğe, satın almadan satışa kadar tüm süreçlerinizi tek bir platformdan yönetin.
          </p>
        </div>
      </section>

      {/* Hakkımızda */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Hakkımızda</h2>
          <div className="w-16 h-1 bg-secondary mx-auto mt-4 rounded-full" />
        </div>

        <div className="space-y-6 text-muted-foreground leading-relaxed text-[15px]">
          <p>
            Tekstil A.Ş., tekstil endüstrisinin tamamını tek bir dijital platformda buluşturan yeni nesil bir iş platformudur.
          </p>
          <p>
            Tekstil dünyasının üretimden tedariğe, satın almadan satışa kadar tüm kritik süreçlerini dijitalleştiren güçlü bir iş ağı kurar.
          </p>
          <p>
            Bugün tekstil sektörü hâlâ telefon rehberleri, kişisel ilişkiler, WhatsApp grupları ve dağınık kanallar üzerinden ilerliyor. Bu yapı; zamanı boşa harcıyor, verimliliği düşürüyor ve işletmeleri sınırlı network'lere mahkûm ediyor.
          </p>
          <p>
            Tekstil A.Ş., tekstil sektörünü bu dağınık yapıdan çıkarıp tek bir dijital merkezde toplayarak; dijital, şeffaf ve erişilebilir hale getiriyor.
          </p>
          <p>
            Her işletmeye kendini doğru şekilde anlatabileceği bir alan sunar, doğru tarafları bir araya getirir ve sektörün iş yapma biçimini modernleştirir.
          </p>
          <p>
            Tekstil dünyasının üretimden tedariğe, satışa kadar tüm kritik süreçlerini dijitalleştiren güçlü bir iş ağı kurar.
          </p>
        </div>
      </section>

      {/* Modüller */}
      <section className="bg-muted/50">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Yenilikçi Çözümlerimiz</h2>
            <div className="w-16 h-1 bg-secondary mx-auto mt-4 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((mod) => (
              <div
                key={mod.title}
                className="bg-background rounded-2xl p-6 border border-border hover:shadow-lg hover:border-secondary/30 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                  <mod.icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{mod.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{mod.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Misyon & Vizyon */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Misyon */}
          <div className="relative">
            <div className="absolute -left-3 top-0 w-1 h-full bg-gradient-to-b from-secondary to-secondary/20 rounded-full" />
            <div className="pl-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-secondary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Misyonumuz</h2>
              </div>
              <div className="space-y-4 text-muted-foreground text-[15px] leading-relaxed">
                <p className="font-medium text-foreground">
                  Tekstil sektörünün tüm paydaşlarını dijital dünyaya taşıyarak, iş yapma biçimlerini daha hızlı, güvenli ve verimli hale getirmek.
                </p>
                <p>
                  Tekstil A.Ş.'nun misyonu; üretim, tedarik, satın alma, satış ve istihdam gibi sektörün en kritik süreçlerini tek bir platformda birleştirerek işletmelerin zaman ve maliyet kayıplarını ortadan kaldırmaktır.
                </p>
                <p>
                  Küçük atölyelerden büyük üreticilere kadar her işletmenin internet ortamında görünür olmasını, doğru iş ortaklarına kolayca ulaşmasını ve eşit fırsatlarla büyümesini hedefliyoruz.
                </p>
                <p>
                  Telefon rehberlerine, kişisel bağlantılara ve kapalı ağlara bağımlı bir sektörü; veriye dayalı, şeffaf ve sürdürülebilir bir dijital iş ağına dönüştürmek için çalışıyoruz.
                </p>
              </div>
            </div>
          </div>

          {/* Vizyon */}
          <div className="relative">
            <div className="absolute -left-3 top-0 w-1 h-full bg-gradient-to-b from-primary to-primary/20 rounded-full" />
            <div className="pl-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Vizyonumuz</h2>
              </div>
              <div className="space-y-4 text-muted-foreground text-[15px] leading-relaxed">
                <p className="font-medium text-foreground">
                  Hem Türkiye'de hem globalde tekstil sektörünün dijital buluşma noktası olmak.
                </p>
                <p>
                  Tekstil A.Ş.'nun vizyonu; tekstil sektöründeki tüm üretim, tedarik, ticaret, istihdam ve veri akışlarının yönetildiği küresel bir dijital ekosistem inşa etmektir.
                </p>
                <p>
                  Amacımız yalnızca bir yazılım platformu olmak değil; tekstil sektörünün güven standartlarını belirleyen, sektörel veriyi üreten ve geleceğini şekillendiren global bir referans noktası haline gelmektir.
                </p>
                <p>
                  Gelecekte Tekstil A.Ş.; dünyanın en küçük atölyesinin bile global pazarlara erişebildiği, sınırların ortadan kalktığı ve tüm tekstil bilgisinin tek bir dijital çatı altında toplandığı bir yapı olarak konumlanacaktır.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-primary">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <p className="text-xl md:text-2xl font-bold text-primary-foreground">
            Tekstil A.Ş., tekstilin dijital geleceğini bugünden kurar.
          </p>
          <div className="w-16 h-1 bg-secondary mx-auto mt-6 rounded-full" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
