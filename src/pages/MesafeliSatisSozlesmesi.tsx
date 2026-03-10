import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import Footer from "@/components/Footer";

export default function MesafeliSatisSozlesmesi() {
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-10">MANUFIXO MESAFELİ SATIŞ SÖZLEŞMESİ</h1>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">1. TARAFLAR</h2>

            <h3 className="text-base font-bold text-foreground mb-2">1.1. SATICI:</h3>
            <ul className="list-none pl-0 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Unvan:</strong> Manufixo Teknoloji A.Ş.</li>
              <li><strong className="text-foreground">Adres:</strong> Çobançeşme mah. Bilge 1 sk. No:9/11 K:2 Bahçelievler / İstanbul</li>
              <li><strong className="text-foreground">E-posta:</strong>{" "}<a href="mailto:info@tekstilas.com" className="text-primary underline hover:text-primary/80">info@tekstilas.com</a></li>
              <li><strong className="text-foreground">Mersis No:</strong> 0612181102800001</li>
            </ul>

            <h3 className="text-base font-bold text-foreground mb-2 mt-4">1.2. ALICI (KULLANICI):</h3>
            <p className="text-muted-foreground">Manufixo platformuna üye olan, bilgileri üyelik formunda ve ödeme sayfasında belirtilen, kurumsal veya bireysel kullanıcıdır.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">2. SÖZLEŞMENİN KONUSU</h2>
            <p className="text-muted-foreground">
              İşbu Sözleşme'nin konusu, Alıcı'nın Satıcı'ya ait www.manufixo.com web sitesi ("Platform") üzerinden elektronik ortamda siparişini verdiği, aşağıda nitelikleri ve satış fiyatı belirtilen hizmetin ("Üyelik Paketleri", "Öne Çıkarma Hizmetleri", "İlan Yayınlama Hakları") satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca tarafların hak ve yükümlülüklerinin saptanmasıdır.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">3. SÖZLEŞME KONUSU HİZMET VE ÖDEME BİLGİLERİ</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Hizmetin Adı:</strong> [Seçilen Üyelik Paketi / Öne Çıkarma Bedeli]</li>
              <li><strong className="text-foreground">Hizmet İçeriği:</strong> [Paket Detayları - Örn: 1 Yıllık Elite Üyelik, 5 Adet İhale Öne Çıkarma vb.]</li>
              <li><strong className="text-foreground">Satış Bedeli:</strong> [KDV Dahil Toplam Tutar]</li>
              <li><strong className="text-foreground">Ödeme Şekli:</strong> Kredi Kartı / Banka Kartı / Havale-EFT</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">4. HİZMETİN İFASI VE TESLİMAT ŞEKLİ</h2>
            <p className="text-muted-foreground">
              Sözleşme konusu hizmet, dijital bir içerik/hizmet olması sebebiyle, ödemenin onaylanmasını müteakip Alıcı'nın hesabına anında tanımlanır. Alıcı, satın aldığı hizmeti (üyelik haklarını veya öne çıkarma özelliğini) Platform üzerinden anında kullanmaya başlayabilir. Herhangi bir fiziksel teslimat yapılmayacaktır.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">5. CAYMA HAKKI VE İSTİSNALARI</h2>
            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-3">
              <p className="text-sm font-semibold text-foreground">
                Önemli Bilgilendirme: Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin (ğ) bendi uyarınca; "Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallara ilişkin sözleşmelerde" tüketici cayma hakkını kullanamaz.
              </p>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Alıcı, satın aldığı hizmetin (Üyelik, Öne Çıkarma vb.) ödeme onayı ile birlikte dijital ortamda anında ifa edildiğini kabul eder.</li>
              <li>Bu kapsamda, hizmetin Alıcı'nın hesabına tanımlanması ve kullanımına sunulması ile birlikte cayma hakkı sona ermektedir. Hizmetin kullanılmamış olması cayma hakkını doğurmaz.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">6. GENEL HÜKÜMLER</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">6.1.</strong> Alıcı, Platform üzerinde sözleşme konusu hizmetin temel nitelikleri, satış fiyatı ve ödeme şekli ile teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli teyidi verdiğini beyan eder.</li>
              <li><strong className="text-foreground">6.2.</strong> Satıcı, sözleşme konusu hizmetin ayıpsız, eksiksiz ve siparişte belirtilen niteliklere uygun olarak Alıcı'nın hesabına tanımlanmasından sorumludur.</li>
              <li><strong className="text-foreground">6.3.</strong> Hizmetin sunulabilmesi için Alıcı'nın "Kurumsal Üyelik Ön Onay" sürecinden başarıyla geçmiş olması şarttır. Ön onayı iptal edilen veya askıya alınan hesaplar için yapılan ödemeler, hizmet ifa edilmemişse iade edilir.</li>
              <li><strong className="text-foreground">6.4.</strong> ManuPazar üzerinden yapılan üçüncü taraf ürün satışlarında Manufixo sadece bir aracı olup, ürünün ayıplı çıkması veya teslim edilmemesi durumunda asıl muhatap satıcı kullanıcıdır.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">7. YETKİLİ MAHKEME</h2>
            <p className="text-muted-foreground">
              İşbu Sözleşme'den doğan uyuşmazlıklarda, T.C. Ticaret Bakanlığı'nca her yıl ilan edilen değere kadar İl veya İlçe Tüketici Hakem Heyetleri; bu değerin üzerindeki uyuşmazlıklarda ise İstanbul Tüketici Mahkemeleri veya Asliye Ticaret Mahkemeleri yetkilidir.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
