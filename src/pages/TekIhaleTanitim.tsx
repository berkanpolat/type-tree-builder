import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import Footer from "@/components/Footer";
import { Gavel, TrendingDown, Factory, Clock, Eye, Bell, SlidersHorizontal, Scale, MonitorSmartphone, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TekIhaleTanitim() {
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
    { icon: Rocket, title: "Yeni İş Fırsatları" },
    { icon: TrendingDown, title: "Rekabetçi Fiyatlar" },
    { icon: Factory, title: "Atıl Kapasitenin Değerlendirilmesi" },
    { icon: Clock, title: "Zaman ve Maliyet Avantajı" },
  ];

  const farklar = [
    { icon: Gavel, title: "Açık, kapalı ve açık artırma ihale modelleri" },
    { icon: Eye, title: "Canlı teklif takibi ve anlık bildirimler" },
    { icon: SlidersHorizontal, title: "Teknik detaylı, filtrelenebilir ihale yapısı" },
    { icon: Scale, title: "Talep ve teklif tarafı için dengeli süreç" },
    { icon: MonitorSmartphone, title: "Tek panelden uçtan uca yönetim" },
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
            Tekİhale
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground leading-tight">
            Teklif Toplamanın/Vermenin<br />
            <span className="text-secondary">En Verimli ve En Hızlı Yolu!</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 font-medium">
            İhale Açanında, Teklif Vereninde Kazandığı Tek Platform.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-5 py-2 rounded-full bg-secondary/20 border border-secondary/30">
            <span className="text-2xl font-bold text-secondary">%0</span>
            <span className="text-primary-foreground/80 font-medium">Komisyon</span>
          </div>
          <p className="mt-8 text-primary-foreground/60 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            Tekİhale, tekstil sektöründe talep sahipleri ile teklif verenleri, şeffaf ve kontrollü bir dijital ihale ortamında buluşturur.
            İhale açanlar ihtiyaçlarını net kriterlerle tanımlar; teklif verenler gerçek taleplere doğrudan, adil ve ölçülebilir şekilde teklif sunar.
            Tüm süreç tek panelden, canlı olarak yönetilir.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-8"
              onClick={() => navigate("/tekihale")}
            >
              <Gavel className="w-4 h-4 mr-2" />
              İhaleleri Keşfet
            </Button>
          </div>
        </div>
      </section>

      {/* Kazanımlar */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {kazanimlar.map((k) => (
            <div key={k.title} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <k.icon className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="text-sm md:text-base font-bold text-foreground">{k.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Neyi Farklı Yapar */}
      <section className="bg-muted/50">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Tekİhale Neyi Farklı Yapar?
            </h2>
            <div className="w-16 h-1 bg-secondary mx-auto mt-4 rounded-full" />
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            {farklar.map((f) => (
              <div
                key={f.title}
                className="flex items-center gap-4 bg-background rounded-xl p-5 border border-border hover:shadow-md hover:border-secondary/30 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-secondary/10 transition-colors">
                  <f.icon className="w-5 h-5 text-primary group-hover:text-secondary transition-colors" />
                </div>
                <p className="text-sm md:text-base font-medium text-foreground">{f.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <p className="text-xl md:text-2xl font-bold text-primary-foreground mb-6">
            Tekstil sektöründe ihale süreçlerinizi dijitalleştirin.
          </p>
          <Button
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-8"
            onClick={() => navigate("/tekihale")}
          >
            Hemen Başla
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
