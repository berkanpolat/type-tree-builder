import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PazarHeader from "@/components/PazarHeader";
import Footer from "@/components/Footer";

export default function KVKKAydinlatma() {
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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-10">KVKK Aydınlatma Metni</h1>

        <div className="prose prose-sm max-w-none text-foreground space-y-10">
          {/* Kişisel Verilerin Korunması Politikası */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">MANUFIXO KİŞİSEL VERİLERİN KORUNMASI POLİTİKASI</h2>

            <h3 className="text-lg font-bold text-foreground mb-3">1.1. Amaç ve Kapsam</h3>
            <p className="text-muted-foreground mb-3">
              Bu Politika, Manufixo Teknoloji A.Ş. ("Manufixo") tarafından işletilen www.manufixo.com platformu üzerinden elde edilen kişisel verilerin; 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve ilgili mevzuata uygun olarak işlenmesi, korunması ve yönetilmesi amacıyla hazırlanmıştır.
            </p>
            <p className="text-muted-foreground mb-1">Politika;</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-4">
              <li>Kullanıcılar</li>
              <li>Üyeler</li>
              <li>Ziyaretçiler</li>
              <li>İş ortakları</li>
              <li>Tedarikçiler</li>
              <li>Çalışan adayları</li>
            </ul>
            <p className="text-muted-foreground">tarafından paylaşılan tüm kişisel verileri kapsar.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">1.2. Temel İlkeler</h3>
            <p className="text-muted-foreground mb-2">Manufixo, kişisel verileri işlerken aşağıdaki ilkelere uyar:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Hukuka ve dürüstlük kurallarına uygunluk</li>
              <li>Doğru ve güncel olma</li>
              <li>Belirli, açık ve meşru amaçlar için işleme</li>
              <li>İşlendikleri amaçla bağlantılı, sınırlı ve ölçülü olma</li>
              <li>İlgili mevzuatta öngörülen süre kadar muhafaza edilme</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">1.3. Kişisel Verilerin İşlenme Amaçları</h3>
            <p className="text-muted-foreground mb-2">Kişisel veriler aşağıdaki amaçlarla işlenmektedir:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Üyelik ve kullanıcı kayıt süreçlerinin yürütülmesi</li>
              <li>Platform modüllerinin (ManuConnect, Manuİhale, ManuPazar, ManuKariyer) çalıştırılması</li>
              <li>Teklif, ihale, ticaret ve iletişim süreçlerinin yönetimi</li>
              <li>Hukuki yükümlülüklerin yerine getirilmesi</li>
              <li>Finansal ve muhasebesel işlemler</li>
              <li>Destek ve müşteri hizmetleri</li>
              <li>Sistem güvenliğinin sağlanması</li>
              <li>Yetkili kurumlara karşı yükümlülüklerin yerine getirilmesi</li>
            </ul>
          </section>

          {/* Saklama ve İmha */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">MANUFIXO KİŞİSEL VERİ SAKLAMA VE İMHA POLİTİKASI</h2>

            <h3 className="text-lg font-bold text-foreground mb-3">2.1. Amaç</h3>
            <p className="text-muted-foreground">Bu Politika, Manufixo tarafından işlenen kişisel verilerin; saklama sürelerinin belirlenmesi ve süresi dolan verilerin imhasına ilişkin usul ve esasları düzenler.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">2.2. Saklama Süreleri</h3>
            <p className="text-muted-foreground mb-2">Kişisel veriler; ilgili mevzuatta öngörülen süreler boyunca ve işleme amacının gerektirdiği süre kadar saklanır.</p>
            <p className="text-muted-foreground mb-1">Örnek süreler:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Üyelik verileri: Üyelik devam ettiği sürece</li>
              <li>Finansal veriler: 10 yıl</li>
              <li>Hukuki ihtilaflara ilişkin veriler: Zamanaşımı süresi boyunca</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">2.3. İmha Yöntemleri</h3>
            <p className="text-muted-foreground mb-2">Saklama süresi sona eren kişisel veriler;</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Silme</li>
              <li>Yok etme</li>
              <li>Anonim hale getirme</li>
            </ul>
            <p className="text-muted-foreground mt-2">yöntemlerinden uygun olanı ile imha edilir. İmha işlemleri periyodik olarak gerçekleştirilir.</p>
          </section>

          {/* KVKK Aydınlatma */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">3. KVKK AYDINLATMA METNİ</h2>

            <h3 className="text-lg font-bold text-foreground mb-3">3.1. Veri Sorumlusu</h3>
            <p className="text-muted-foreground">KVKK uyarınca kişisel verileriniz; Manufixo Teknoloji A.Ş. tarafından, veri sorumlusu sıfatıyla işlenmektedir.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">3.2. İşlenen Kişisel Veriler</h3>
            <p className="text-muted-foreground mb-2">İşlenen kişisel veri kategorileri şunlardır:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Kimlik bilgileri</li>
              <li>İletişim bilgileri</li>
              <li>Firma ve yetkili bilgileri</li>
              <li>Kullanıcı işlem bilgileri</li>
              <li>Finansal bilgiler</li>
              <li>Mesleki ve özlük bilgileri</li>
              <li>IP ve log kayıtları</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">3.3. Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebep</h3>
            <p className="text-muted-foreground mb-2">Kişisel veriler;</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Web sitesi</li>
              <li>Mobil platformlar</li>
              <li>Elektronik formlar</li>
              <li>Sözleşmeler</li>
              <li>Çerezler</li>
            </ul>
            <p className="text-muted-foreground mt-2">aracılığıyla; KVKK'nın 5. ve 6. maddelerinde belirtilen hukuki sebepler kapsamında işlenmektedir.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">3.4. Kişisel Verilerin Aktarılması</h3>
            <p className="text-muted-foreground mb-2">Kişisel veriler;</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Yetkili kamu kurumları</li>
              <li>Hukuki ve mali danışmanlar</li>
              <li>Teknik altyapı ve hosting hizmeti sağlayıcıları</li>
            </ul>
            <p className="text-muted-foreground mt-2">ile, mevzuata uygun şekilde paylaşılabilir.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">3.5. İlgili Kişinin Hakları</h3>
            <p className="text-muted-foreground mb-2">KVKK'nın 11. maddesi uyarınca ilgili kişi olarak;</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>İşlenmişse buna ilişkin bilgi talep etme</li>
              <li>Amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
              <li>Silinmesini veya yok edilmesini talep etme</li>
              <li>İşlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
              <li>Zarara uğramanız hâlinde tazminat talep etme</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              haklarına sahipsiniz. Başvurular:{" "}
              <a href="mailto:info@manufixo.com" className="text-primary underline hover:text-primary/80">info@manufixo.com</a>{" "}
              üzerinden yapılabilir.
            </p>
          </section>

          {/* Çerez Politikası */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">4. ÇEREZ (COOKIE) POLİTİKASI</h2>

            <h3 className="text-lg font-bold text-foreground mb-3">4.1. Çerez Nedir?</h3>
            <p className="text-muted-foreground">Çerezler, web sitesi ziyaret edildiğinde cihazınıza kaydedilen küçük metin dosyalarıdır.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">4.2. Kullanılan Çerez Türleri</h3>
            <p className="text-muted-foreground mb-2">Manufixo'da kullanılan çerezler:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Zorunlu Çerezler</li>
              <li>Performans ve Analitik Çerezler</li>
              <li>Fonksiyonel Çerezler</li>
            </ul>
            <p className="text-muted-foreground mt-2">Reklam ve pazarlama çerezleri, açık rıza alınmaksızın kullanılmaz.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">4.3. Çerezlerin Kullanım Amaçları</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Platformun düzgün çalışması</li>
              <li>Kullanıcı deneyiminin geliştirilmesi</li>
              <li>Güvenliğin sağlanması</li>
              <li>Analiz ve performans ölçümü</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-foreground mb-3">4.4. Çerez Yönetimi</h3>
            <p className="text-muted-foreground">Kullanıcılar, tarayıcı ayarları üzerinden çerez tercihlerini değiştirebilir veya çerezleri silebilir.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
