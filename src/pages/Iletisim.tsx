import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import Footer from "@/components/Footer";

export default function Iletisim() {
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isLoggedIn && <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />}

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 flex-1 w-full">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-10">İletişim</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Sol: Bilgiler */}
          <div className="space-y-8">
            <div>
              <p className="font-bold text-foreground">Adres:</p>
              <p className="text-foreground">
                Küçükbakkalköy Mahallesi Dudullu Caddesi Brandium Rezidans R2 Blok
              </p>
              <p className="text-foreground">Kat:7 Daire:75</p>
            </div>

            <div className="space-y-1">
              <p className="text-foreground">
                <span className="font-bold">Tel:</span> 0 850 242 5700{" "}
                <span className="font-bold">(Çağrı Merkezi)</span>
              </p>
              <p className="text-foreground">
                <span className="font-bold">Yenibosna V.D.:</span> 612 181 1028
              </p>
              <p className="text-foreground">
                <span className="font-bold">Ticaret Sicil No:</span> 1091030
              </p>
              <p className="text-foreground">
                <span className="font-bold">Kep Adresi:</span>{" "}
                <a
                  href="mailto:manufixoteknoloji@hs01.kep.tr"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  manufixoteknoloji@hs01.kep.tr
                </a>
              </p>
              <p className="text-foreground">
                <span className="font-bold">Mersis Numarası:</span> 0612181102800001
              </p>
              <p className="text-foreground">
                <span className="font-bold">Sorumlu Kişi:</span> Berkan Polat Çetiner
              </p>
            </div>

            <div className="space-y-3 text-foreground">
              <p>
                Üyesi olduğumuz İstanbul Ticaret Odası'nın üyeleri için geçerli davranış
                kurallarına{" "}
                <a
                  href="https://www.ito.org.tr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  www.ito.org.tr
                </a>{" "}
                adresinden ulaşılabilir.
              </p>
              <p>
                Manufixo Teknoloji A.Ş.'ye yapılacak yasal bildirimler ve arabuluculuk
                başvuruları için Kayıtlı Elektronik Posta (KEP) aracılığıyla{" "}
                <a
                  href="mailto:manufixoteknoloji@hs01.kep.tr"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  manufixoteknoloji@hs01.kep.tr
                </a>{" "}
                adresine gönderimde bulunabilirsiniz.
              </p>
            </div>
          </div>

          {/* Sağ: Harita */}
          <div className="w-full h-[400px] md:h-full min-h-[350px] rounded-lg overflow-hidden border border-border">
            <iframe
              title="Konum"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3011.267!2d29.1286!3d40.9923!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cac79e78560b93%3A0x6e24f3f0e3b5e7a0!2sBrandium%20Rezidans!5e0!3m2!1str!2str!4v1710000000000"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
