import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { Search, Handshake, Clock, Target, Factory, Users, MessageSquare, Briefcase, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UreticiTedarikcikesfi() {
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

  const kazanimlar = [
    { icon: Handshake, title: "Yeni İş Birlikleri", color: "text-secondary" },
    { icon: Target, title: "Doğru Eşleşme", color: "text-secondary" },
    { icon: Clock, title: "Zaman Kaybı Yok", color: "text-secondary" },
  ];

  const farklar = [
    {
      icon: Factory,
      title: "Sadece Tekstil Sektörüne Odaklıdır",
      description: "Genel iş platformlarından farklı olarak yalnızca tekstil endüstrisine hizmet eder.",
    },
    {
      icon: Target,
      title: "Gerçek İhtiyaca Göre Eşleşme",
      description: "Gelişmiş filtrelerle tam olarak aradığınız kapasiteye ve uzmanlığa sahip firmaları bulun.",
    },
    {
      icon: MessageSquare,
      title: "Doğrudan İletişim",
      description: "Aracıya gerek kalmadan platform üzerinden anında iletişim kurun.",
    },
    {
      icon: Briefcase,
      title: "Gerçek İş Fırsatları",
      description: "Aktif ve doğrulanmış firma profilleriyle gerçek iş ortaklarına ulaşın.",
    },
    {
      icon: ShieldCheck,
      title: "Detaylı Firma Profilleri",
      description: "Kapasite, tesis, sertifika ve referans bilgileriyle firmaları derinlemesine tanıyın.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isLoggedIn && <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />}

      {/* Hero */}
      <section className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-secondary rounded-full" />
          <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-secondary rounded-full" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
          <p className="text-secondary font-semibold text-sm tracking-wide uppercase mb-3">
            TekRehber
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground leading-tight">
            Tekstilin Profesyonel İş Ağı!
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-primary-foreground/80 font-medium">
            İnternette görünür ol, yeni iş fırsatları bul
          </p>
          <p className="mt-6 text-primary-foreground/60 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            TekRehber, tekstil sektöründeki tüm kurumsal kullanıcıları detaylı profillerle bir araya getirir.
            Üreticileri, markaları, tedarikçileri, atölyeleri ve mümessil ofisleri kısaca tekstil sektöründeki tüm firmaları;
            uzmanlık, kapasite, tesis bilgileri, sertifikaları ve referans bilgileriyle listeler.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-8"
              onClick={() => navigate("/tekrehber")}
            >
              <Search className="w-4 h-4 mr-2" />
              Firmaları Keşfet
            </Button>
          </div>
        </div>
      </section>

      {/* Açıklama */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20 text-center">
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-3xl mx-auto">
          Görünür olun, bulunur olun ve doğru iş ortakları ile yeni iş fırsatları yakalayın.
          Gelişmiş arama ve filtreleme sistemi sayesinde; ihtiyacınıza en uygun iş ortağını saniyeler içinde bulun,
          iletişimi doğrudan başlatın, süreci hızlandırın.
        </p>
      </section>

      {/* Kazanımlar */}
      <section className="bg-muted/50">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {kazanimlar.map((k) => (
              <div key={k.title} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <k.icon className={`w-7 h-7 ${k.color}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{k.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Neyi Farklı Yapar */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            TekRehber Neyi Farklı Yapar?
          </h2>
          <div className="w-16 h-1 bg-secondary mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farklar.map((f, i) => (
            <div
              key={f.title}
              className={`bg-background rounded-2xl p-6 border border-border hover:shadow-lg hover:border-secondary/30 transition-all duration-300 group ${
                i >= 3 ? "md:col-span-1 lg:col-start-auto" : ""
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/10 transition-colors">
                <f.icon className="w-6 h-6 text-primary group-hover:text-secondary transition-colors" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <p className="text-xl md:text-2xl font-bold text-primary-foreground mb-6">
            Tekstil sektöründe doğru iş ortağınızı bugün bulun.
          </p>
          <Button
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-8"
            onClick={() => navigate("/tekrehber")}
          >
            Hemen Başla
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
