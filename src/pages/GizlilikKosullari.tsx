import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";

export default function GizlilikKosullari() {
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
        if (firma) { setFirmaUnvani(firma.firma_unvani); setFirmaLogoUrl(firma.logo_url); }
      }
    };
    init();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isLoggedIn && <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} />}
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 flex-1 w-full">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">MANUFIXO GİZLİLİK KOŞULLARI</h1>
        <p className="text-sm text-muted-foreground mb-10">Son Güncelleme Tarihi: 16/01/2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">
          <p className="text-muted-foreground">
            Manufixo olarak, platformumuz üzerinden paylaştığınız ticari ve bireysel verilerin gizliliğini en üst seviyede tutmayı taahhüt ediyoruz. İşbu Gizlilik Koşulları, platformun kullanımı sırasında toplanan bilgilerin nasıl korunduğunu ve hangi gizlilik standartlarına tabi olduğunu açıklar.
          </p>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">1. TİCARİ GİZLİLİK VE "TEKİHALE" GÜVENLİĞİ</h2>
            <p className="text-muted-foreground mb-2">Manufixo, bir tekstil ekosistemi olarak ticari sırların öneminin farkındadır.</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">İhale Bilgileri:</strong> Tekİhale modülü üzerinden açılan ihalelerdeki teknik şartnameler, fiyat teklifleri ve özel stok bilgileri, sadece ihaleyi açan ve teklif veren taraflar (ve yetkili Manufixo adminleri) tarafından erişilebilir.</li>
              <li><strong className="text-foreground">Stratejik Veriler:</strong> İhale sonuçları ve verilen en düşük/en yüksek teklifler gibi veriler, "Kapalı Teklif" modelinde tamamen gizli tutulur ve üçüncü taraflarla paylaşılmaz.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">2. İLETİŞİM VE MESAJLAŞMA GİZLİLİĞİ</h2>
            <p className="text-muted-foreground">TekRehber ve diğer modüller üzerinden gerçekleştirilen uygulama içi mesajlaşmalar, taraflar arasında gizlidir. Manufixo, sistem güvenliğini sağlamak ve hukuka aykırı içerik denetimi yapmak (spam, dolandırıcılık, taciz vb.) dışında kullanıcı yazışmalarını izlemez veya içeriğini ticari amaçla kullanmaz.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">3. ÖDEME VE FİNANSAL VERİ GÜVENLİĞİ</h2>
            <p className="text-muted-foreground">TekPazar veya üyelik paketi alımları sırasında kullanılan kredi kartı ve ödeme bilgileri platformumuz tarafından saklanmaz. Tüm ödeme işlemleri, yüksek güvenlik standartlarına sahip (PCI-DSS uyumlu) lisanslı ödeme kuruluşları ve bankalar aracılığıyla, 256-bit SSL sertifikalı güvenli kanallar üzerinden gerçekleştirilir.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">4. TEKKARİYER: ADAY VE İŞVEREN GİZLİLİĞİ</h2>
            <p className="text-muted-foreground">Adayların özgeçmişleri (CV), sadece başvuruda bulundukları ilgili işverenler tarafından görüntülenebilir. İşverenler, aday verilerini sadece işe alım amacıyla kullanmayı ve bu verileri üçüncü şahıslara aktarmamayı kabul ve taahhüt eder.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">5. VERİ GÜVENLİĞİ ÖNLEMLERİ</h2>
            <p className="text-muted-foreground mb-2">Manufixo, yetkisiz erişimi, veri kaybını veya bilgilerin değiştirilmesini önlemek amacıyla aşağıdaki teknik önlemleri uygular:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Şifreleme:</strong> Tüm veri trafiği SSL (Secure Socket Layer) protokolü ile şifrelenir.</li>
              <li><strong className="text-foreground">Erişim Kontrolü:</strong> Verilere erişim, sadece iş tanımları gereği yetkili olan personel ile sınırlandırılmıştır.</li>
              <li><strong className="text-foreground">Güvenlik Duvarları:</strong> Platform, siber saldırılara karşı güncel güvenlik duvarları (Firewall) ve saldırı tespit sistemleri ile korunmaktadır.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">6. ÜÇÜNCÜ TARAF BAĞLANTILARI</h2>
            <p className="text-muted-foreground">Platform içerisinde yer alan reklamlar veya yönlendirilen dış bağlantıların (linklerin) gizlilik politikalarından Manufixo sorumlu değildir. Kullanıcıların, yönlendirildikleri sitelerin gizlilik bildirimlerini okumaları önerilir.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">7. GİZLİLİK KOŞULLARINDA DEĞİŞİKLİK</h2>
            <p className="text-muted-foreground">Manufixo, gelişen teknoloji ve değişen mevzuat çerçevesinde Gizlilik Koşulları'nı güncelleme hakkını saklı tutar. Değişiklikler platformda yayınlandığı andan itibaren geçerlilik kazanır.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">8. İLETİŞİM</h2>
            <p className="text-muted-foreground">
              Gizlilikle ilgili her türlü soru, görüş veya veri silme talebiniz için{" "}
              <a href="mailto:info@tekstilas.com" className="text-primary underline hover:text-primary/80">info@tekstilas.com</a>{" "}
              adresi üzerinden bizimle iletişime geçebilirsiniz.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}