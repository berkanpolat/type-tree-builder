import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { HelpCircle, Mail, Phone, MessageSquare } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const sssData = [
  {
    q: "Tekstil A.Ş. nedir?",
    a: "Tekstil A.Ş.; markaları, üreticileri, tedarikçileri, fason atölyeleri, mümessil ofisleri ve bireysel tekstil profesyonellerini tek bir platformda buluşturan, sektöre özel bir B2B yazılım platformudur.",
  },
  {
    q: "Tekstil A.Ş.'ya kimler üye olabilir?",
    a: "• Markalar\n• Üreticiler\n• Tedarikçiler\n• Fason atölyeler\n• Mümessil ofisler\n• Bireysel tekstil profesyonelleri",
  },
  {
    q: "Tekstil A.Ş.'ya kayıt olmak ücretsiz mi?",
    a: "Kayıt olmak ücretsizdir.\nAncak gelişmiş özellikler, görünürlük, teklif alma/verme ve iş fırsatlarına erişim için paket seçenekleri bulunmaktadır.",
  },
  {
    q: "Üyelik başvurusu ne kadar sürede onaylanır?",
    a: "Kurumsal başvurular haftaiçi çalışma saatleri içinde (09:00-18:00) kontrol edilerek onaylanır.\nAmaç; platformda güvenilir ve gerçek firmaların yer almasını sağlamaktır.",
  },
  {
    q: "Tekstil A.Ş.'yu diğer pazar yerlerinden ayıran fark nedir?",
    a: "Tekstil A.Ş. sadece bir satış sitesi değil, sektöre özel bir iş ağıdır. En büyük farkı, B2B ve B2C satışlarda %0 komisyon uygulaması ve tekstil odaklı \"TekRehber\" gibi gelişmiş filtreleme ve eşleştirme araçlarına sahip olmasıdır.",
    link: { text: "Daha detaylı bilgi için lütfen tıklayınız", href: "/hakkimizda" },
  },
  {
    q: "Tekstil A.Ş.'da neler yapabilirim?",
    a: "Tekstil A.Ş. ile;\n• Firma profilinizi oluşturabilir\n• Kapasite, uzmanlık ve sertifikalarınızı sergileyebilir\n• Teklif alabilir veya teklif verebilir\n• Satın alma ve satış süreçlerinizi yönetebilir\n• İş ilanı yayınlayabilir\n• Yeni iş ortaklarıyla doğrudan iletişime geçebilirsiniz",
  },
  {
    q: "Tekstil A.Ş. genel bir sosyal ağ mı?",
    a: "Hayır.\nTekstil A.Ş., LinkedIn gibi genel bir platform değil; yalnızca tekstil sektörüne özel, iş ve ticaret odaklı bir profesyonel ağdır.",
  },
  {
    q: "Satışlardan komisyon alıyor musunuz?",
    a: "Hayır. Tekstil A.Ş., \"Sıfır Komisyon\" modelini benimser. Tekstil A.Ş.'nun en cazip özelliklerinden biri, satışlarda %0 satıcı komisyonu sunmasıdır. Bu, ürünlerinizi ek maliyet olmadan satmanıza ve kâr marjınızı korumanıza olanak tanır.",
  },
  {
    q: "Üyelik ücretli mi?",
    a: "Platformda farklı ihtiyaçlara yönelik üyelik paketleri bulunmaktadır. Temel özelliklerden yararlanabileceğiniz ücretsiz başlangıç paketinin yanı sıra, daha geniş görünürlük ve gelişmiş araçlar sunan Premium paket seçeneklerimiz mevcuttur.",
  },
  {
    q: "Paket almadan Tekstil A.Ş.'yu kullanabilir miyim?",
    a: "Temel profil oluşturma mümkündür.\nAncak iş fırsatlarına erişim, teklif süreçleri ve görünürlük için paket gereklidir.",
  },
  {
    q: "Tekstil A.Ş.'da firmalar nasıl birbirini bulur?",
    a: "Gelişmiş arama ve filtreleme sistemi sayesinde; ürün grubu, kapasite, lokasyon, sertifikalar ve uzmanlık alanlarına göre doğru firmalar kolayca bulunur.",
  },
  {
    q: "Teklif süreçleri nasıl işler?",
    a: "Markalar veya satın alma yapan firmalar ihtiyaçlarını platformda paylaşır. Uygun firmalar teklif verebilir, teklifler tek panelden karşılaştırılabilir.",
  },
  {
    q: "Tekstil A.Ş. güvenli mi?",
    a: "Evet. Tekstil A.Ş., sektör içi güveni korumak için kurumsal doğrulama süreçleri uygular ve spam veya alakasız kullanımlara izin vermez.",
  },
  {
    q: "Firmalar doğrulanıyor mu?",
    a: "Kurumsal firmalar ve mümessil ofisler, platforma alınmadan önce kontrol edilir.",
  },
  {
    q: "Profilimi nasıl daha görünür hale getirebilirim?",
    a: "Profil doluluk oranınızı %100 yapmanız, platformu aktif kullanmanız, ve paket seçenekleri ve ek paketler ile mümkün olur. Örn. makine parkurunuzu, referans projelerinizi, sahip olduğunuz sertifikaları ve üretim alanınızdan yüksek kaliteli görselleri paylaşmanız, algoritma tarafından daha üst sıralara çıkarılmanızı sağlar.",
  },
];

export default function SSS() {
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isLoggedIn && <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />}

      {/* Hero */}
      <section className="bg-primary">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/20 text-secondary text-sm font-medium mb-5">
            <HelpCircle className="w-4 h-4" />
            SSS
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
            Sıkça Sorulan Sorular
          </h1>
          <p className="mt-4 text-primary-foreground/60 text-base max-w-xl mx-auto">
            Tekstil A.Ş. hakkında merak ettiklerinizin cevaplarını burada bulabilirsiniz.
          </p>
        </div>
      </section>

      {/* SSS Accordion */}
      <section className="max-w-3xl mx-auto px-6 py-14 md:py-20 w-full">
        <Accordion type="single" collapsible className="space-y-3">
          {sssData.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-border rounded-xl px-5 data-[state=open]:border-secondary/40 data-[state=open]:shadow-sm transition-all"
            >
              <AccordionTrigger className="text-left text-sm md:text-base font-semibold text-foreground hover:no-underline py-4">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 whitespace-pre-line">
                {item.a}
                {item.link && (
                  <>
                    {" "}
                    <button
                      onClick={() => { navigate(item.link!.href); window.scrollTo(0, 0); }}
                      className="text-primary underline hover:text-primary/80 transition-colors"
                    >
                      {item.link.text}
                    </button>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Destek CTA */}
      <section className="bg-muted/50">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            Başka bir sorunuz mu var?
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Destek ekibimize her zaman ulaşabilirsiniz.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a
              href="mailto:destek@manufixo.com"
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-secondary transition-colors"
            >
              <Mail className="w-4 h-4 text-secondary" />
              destek@manufixo.com
            </a>
            <a
              href="tel:08502425700"
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-secondary transition-colors"
            >
              <Phone className="w-4 h-4 text-secondary" />
              0850 242 57 00
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
