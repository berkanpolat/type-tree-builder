import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import PazarHeader from "@/components/PazarHeader";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";

export default function KullanimKosullari() {
  useSeoMeta({ slug: "/kullanim-kosullari", fallbackTitle: "Kullanım Koşulları | Tekstil A.Ş." });
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
      {isLoggedIn ? <PazarHeader firmaUnvani={firmaUnvani} firmaLogoUrl={firmaLogoUrl} /> : <PublicHeader />}
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 flex-1 w-full">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">MANUFIXO KULLANIM KOŞULLARI VE ÜYELİK SÖZLEŞMESİ</h1>
        <p className="text-sm text-muted-foreground mb-10">Son Güncelleme Tarihi: 16/01/2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">1. TARAFLAR VE KONU</h2>
            <p className="text-muted-foreground">
              İşbu Kullanım Koşulları ve Üyelik Sözleşmesi ("Sözleşme"); Manufixo Teknoloji A.Ş. ("Manufixo") ile www.tekstilas.com web sitesine ve mobil uygulamalarına ("Platform") üye olan Kullanıcı (Kurumsal veya Bireysel) arasında akdedilmiştir. Sözleşme, Platform üzerinden sunulan modüllerin (TekRehber, Tekİhale, TekPazar, TekKariyer) kullanım şartlarını ve tarafların hak ve yükümlülüklerini belirler.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">2. ÜYELİK SİSTEMİ VE HESAP GÜVENLİĞİ</h2>
            <h3 className="text-base font-bold text-foreground mb-2">2.1. Üyelik Tipleri</h3>
            <p className="text-muted-foreground mb-3">Platform'da "Kurumsal" ve "Bireysel" olmak üzere iki tip üyelik bulunmaktadır.</p>

            <h3 className="text-base font-bold text-foreground mb-2">2.2. Ön Onay Süreci</h3>
            <p className="text-muted-foreground mb-3">Kurumsal üyelikler, Manufixo tarafından belirlenen kriterlere göre bir "Ön Onay" sürecine tabidir. Manufixo, herhangi bir gerekçe göstermeksizin kurumsal üyelik talebini reddetme hakkını saklı tutar.</p>

            <h3 className="text-base font-bold text-foreground mb-2">2.3. Bireysel Üyelik</h3>
            <p className="text-muted-foreground mb-3">Bireysel kullanıcılar doğrudan veya Google Login gibi üçüncü taraf servislerle platforma dahil olabilirler.</p>

            <h3 className="text-base font-bold text-foreground mb-2">2.4. Şifre Güvenliği</h3>
            <p className="text-muted-foreground">Kullanıcı, hesap güvenliğinden bizzat sorumludur. Hesabın yetkisiz kullanımı durumunda sorumluluk Kullanıcı'ya aittir.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">3. MODÜL KULLANIM KOŞULLARI</h2>

            <h3 className="text-base font-bold text-foreground mb-2 mt-4">3.1. TekRehber (Dijital Network)</h3>
            <p className="text-muted-foreground mb-3">Kullanıcılar tarafından oluşturulan profil içerikleri, teknik veriler ve makine parkuru bilgilerinin doğruluğu Kullanıcı'nın taahhüdü altındadır. Linkedin tarzı mesajlaşma sisteminde; spam gönderimi, taciz edici içerik veya ticari etiğe aykırı iletişim yasaktır.</p>

            <h3 className="text-base font-bold text-foreground mb-2 mt-4">3.2. Tekİhale (İhale Ortamı)</h3>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">İhale Kuralları:</strong> İhale açan kullanıcı; teknik detayları, ödeme ve kargo şartlarını eksiksiz belirtmek zorundadır.</li>
              <li><strong className="text-foreground">Teklif Bağlayıcılığı:</strong> İhaleye verilen teklifler, ihale süresi boyunca teklif veren kullanıcı için bağlayıcıdır.</li>
              <li><strong className="text-foreground">Sorumluluk Reddi:</strong> Manufixo bir "Yer Sağlayıcı" olup; ihaleye konu olan mal veya hizmetin kalitesinden, teslimatından veya ödemenin yapılmamasından sorumlu tutulamaz.</li>
            </ul>

            <h3 className="text-base font-bold text-foreground mb-2 mt-4">3.3. TekPazar (Toptan Pazaryeri)</h3>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">B2B Odaklılık:</strong> TekPazar sadece toptan ticarete odaklıdır. Alıcılar satıcılardan teklif isteyebilir ve dijital ödeme bağlantısı üzerinden satın alım gerçekleştirebilir.</li>
              <li><strong className="text-foreground">Fiyatlandırma:</strong> Satıcılar kendi mağazalarını yönetmekle ve yasal mevzuata (Fiyat Etiketi Yönetmeliği vb.) uygun hareket etmekle yükümlüdür.</li>
            </ul>

            <h3 className="text-base font-bold text-foreground mb-2 mt-4">3.4. TekKariyer (İş ve Yetenek Yönetimi)</h3>
            <p className="text-muted-foreground">İş ilanlarında 4857 sayılı İş Kanunu ve ayrımcılık yasağına aykırı ifadeler kullanılamaz. Manufixo, ilan sahiplerinin sunduğu çalışma koşullarının doğruluğunu veya adayların yetkinliğini garanti etmez.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">4. FİNANSAL HÜKÜMLER VE ÜYELİK PAKETLERİ</h2>
            <h3 className="text-base font-bold text-foreground mb-2">4.1. Ücretli Servisler</h3>
            <p className="text-muted-foreground mb-3">Bazı modüllerin kullanımı veya ilanların "Öne Çıkarılması" ücrete tabi olabilir. Güncel tarifeler Platform'da yayınlanır.</p>

            <h3 className="text-base font-bold text-foreground mb-2">4.2. İade Koşulları</h3>
            <p className="text-muted-foreground">Üyelik paketi tanımlandıktan ve dijital hizmetler kullanılmaya başlandıktan sonra iade talepleri, mesafeli sözleşmeler yönetmeliğindeki "anında ifa edilen hizmetler" kapsamında değerlendirilir.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">5. YER SAĞLAYICI VE SORUMLULUK SINIRLAMASI</h2>
            <p className="text-muted-foreground">Manufixo, 5651 sayılı Kanun uyarınca "Yer Sağlayıcı" sıfatına sahiptir. Kullanıcılar tarafından yüklenen içeriklerin (İhale, İlan, Ürün) hukuka aykırılığından Manufixo sorumlu değildir. Manufixo, Platform üzerindeki ticari işlemlerin tarafı değildir; alıcı ve satıcı arasındaki uyuşmazlıklarda arabulucu sıfatı taşımaz.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">6. FİKRİ MÜLKİYET HAKLARI</h2>
            <p className="text-muted-foreground">Platformun yazılımı, tasarımı, "Manufixo" markası ve logosu üzerindeki tüm haklar Manufixo'ya aittir. İzinsiz kopyalanamaz veya tersine mühendislik yapılamaz.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">7. SÖZLEŞMENİN FESHİ</h2>
            <p className="text-muted-foreground">Kullanıcı'nın işbu Sözleşme'ye, etik kurallara veya hukuka aykırı davranması durumunda Manufixo, Kullanıcı hesabını geçici veya kalıcı olarak askıya alma/feshetme hakkına sahiptir.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">8. UYGULANACAK HUKUK VE YETKİLİ MAHKEME</h2>
            <p className="text-muted-foreground">İşbu Sözleşme Türkiye Cumhuriyeti kanunlarına tabidir. Sözleşmeden doğan uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}