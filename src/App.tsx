import { lazy, Suspense } from "react";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import { useVisitorSource } from "@/hooks/use-visitor-source";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { initErrorTracker } from "@/lib/error-tracker";

// Initialize global error tracking
initErrorTracker();
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./components/PageTransition";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import RouteStateManager from "./components/RouteStateManager";
import RoutePreloader from "./components/RoutePreloader";
import AuthRedirectHandler from "./components/AuthRedirectHandler";

// Retry wrapper: on chunk load failure, reload the page once to get fresh assets
const lazyRetry = (factory: () => Promise<any>) =>
  lazy(() =>
    factory().catch((err) => {
      const key = "chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise(() => {}); // never resolves, page reloads
      }
      sessionStorage.removeItem(key);
      throw err;
    })
  );

// GirisKayit is now also lazy-loaded
const GirisKayit = lazyRetry(() => import("./pages/GirisKayit"));

// All pages lazy-loaded for optimal code splitting
const LandingPage = lazyRetry(() => import("./pages/LandingPage"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const Index = lazyRetry(() => import("./pages/Index"));
const AnaSayfa = lazyRetry(() => import("./pages/AnaSayfa"));
const FirmaBilgilerim = lazyRetry(() => import("./pages/FirmaBilgilerim"));
const ManuIhale = lazyRetry(() => import("./pages/ManuIhale"));
const YeniIhale = lazyRetry(() => import("./pages/YeniIhale"));
const TekIhale = lazyRetry(() => import("./pages/TekIhale"));
const IhaleDetay = lazyRetry(() => import("./pages/IhaleDetay"));
const IhaleTakip = lazyRetry(() => import("./pages/IhaleTakip"));
const Tekliflerim = lazyRetry(() => import("./pages/Tekliflerim"));
const ManuPazar = lazyRetry(() => import("./pages/ManuPazar"));
const YeniUrun = lazyRetry(() => import("./pages/YeniUrun"));
const Favoriler = lazyRetry(() => import("./pages/Favoriler"));
const Mesajlar = lazyRetry(() => import("./pages/Mesajlar"));
const Bildirimler = lazyRetry(() => import("./pages/Bildirimler"));
const UrunDetay = lazyRetry(() => import("./pages/UrunDetay"));
const FirmaDetay = lazyRetry(() => import("./pages/FirmaDetay"));
const ProfilAyarlari = lazyRetry(() => import("./pages/ProfilAyarlari"));
const TekRehber = lazyRetry(() => import("./pages/TekRehber"));
const Hakkimizda = lazyRetry(() => import("./pages/Hakkimizda"));
const Iletisim = lazyRetry(() => import("./pages/Iletisim"));
const UreticiTedarikciKesfi = lazyRetry(() => import("./pages/UreticiTedarikciKesfi"));
const TekIhaleTanitim = lazyRetry(() => import("./pages/TekIhaleTanitim"));
const TekPazarTanitim = lazyRetry(() => import("./pages/TekPazarTanitim"));
const SSS = lazyRetry(() => import("./pages/SSS"));
const GizlilikKosullari = lazyRetry(() => import("./pages/GizlilikKosullari"));
const KVKKAydinlatma = lazyRetry(() => import("./pages/KVKKAydinlatma"));
const KullanimKosullari = lazyRetry(() => import("./pages/KullanimKosullari"));
const MesafeliSatisSozlesmesi = lazyRetry(() => import("./pages/MesafeliSatisSozlesmesi"));
const SifreSifirla = lazyRetry(() => import("./pages/SifreSifirla"));
const TelefonDogrulama = lazyRetry(() => import("./pages/TelefonDogrulama"));
const Paketim = lazyRetry(() => import("./pages/Paketim"));
const DashboardDestek = lazyRetry(() => import("./pages/DashboardDestek"));
const DashboardDestekDetay = lazyRetry(() => import("./pages/DashboardDestekDetay"));
const HizmetBilgileri = lazyRetry(() => import("./pages/HizmetBilgileri"));
const UrunBilgileri = lazyRetry(() => import("./pages/UrunBilgileri"));
const UrunKategorisi = lazyRetry(() => import("./pages/UrunKategorisi"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const Chatbot = lazyRetry(() => import("./components/Chatbot"));
const MobileBottomNav = lazyRetry(() => import("./components/MobileBottomNav"));

// Admin pages
const AdminGiris = lazyRetry(() => import("./pages/admin/AdminGiris"));
const AdminPanel = lazyRetry(() => import("./pages/admin/AdminPanel"));
const AdminKullanicilar = lazyRetry(() => import("./pages/admin/AdminKullanicilar"));
const AdminFirmalar = lazyRetry(() => import("./pages/admin/AdminFirmalar"));
const AdminFirmalarV2 = lazyRetry(() => import("./pages/admin/AdminFirmalarV2"));
const AdminIhaleler = lazyRetry(() => import("./pages/admin/AdminIhaleler"));
const AdminUrunler = lazyRetry(() => import("./pages/admin/AdminUrunler"));
const AdminSikayetler = lazyRetry(() => import("./pages/admin/AdminSikayetler"));
const AdminDestek = lazyRetry(() => import("./pages/admin/AdminDestek"));
const AdminPaketler = lazyRetry(() => import("./pages/admin/AdminPaketler"));
const AdminIslemler = lazyRetry(() => import("./pages/admin/AdminIslemler"));
const AdminKisitlamalar = lazyRetry(() => import("./pages/admin/AdminKisitlamalar"));
const AdminReklam = lazyRetry(() => import("./pages/admin/AdminReklam"));
const AdminTekBot = lazyRetry(() => import("./pages/admin/AdminTekBot"));
const AdminPortfoy = lazyRetry(() => import("./pages/admin/AdminPortfoy"));
const AdminAksiyonlar = lazyRetry(() => import("./pages/admin/AdminAksiyonlar"));
const AdminZiyaretPlanlari = lazyRetry(() => import("./pages/admin/AdminZiyaretPlanlari"));
const AdminHedefler = lazyRetry(() => import("./pages/admin/AdminHedefler"));
const AdminAjanda = lazyRetry(() => import("./pages/admin/AdminAjanda"));
const AdminCanliHarita = lazyRetry(() => import("./pages/admin/AdminCanliHarita"));
const AdminYetkilendirme = lazyRetry(() => import("./pages/admin/AdminYetkilendirme"));
const AdminKaynakRaporu = lazyRetry(() => import("./pages/admin/AdminKaynakRaporu"));
const AdminRaporlar = lazyRetry(() => import("./pages/admin/AdminRaporlar"));
const AdminPerformans = lazyRetry(() => import("./pages/admin/AdminPerformans"));
const AdminTestMerkezi = lazyRetry(() => import("./pages/admin/AdminTestMerkezi"));
const AdminSistemLoglari = lazyRetry(() => import("./pages/admin/AdminSistemLoglari"));
const AdminSeo = lazyRetry(() => import("./pages/admin/AdminSeo"));
const OdemeTest = lazyRetry(() => import("./pages/OdemeTest"));
const OdemeTestYillik = lazyRetry(() => import("./pages/OdemeTestYillik"));
const OdemeSonuc = lazyRetry(() => import("./pages/OdemeSonuc"));
const RaporSatisKanali = lazyRetry(() => import("./pages/admin/reports/RaporSatisKanali"));
const RaporMusteriTipi = lazyRetry(() => import("./pages/admin/reports/RaporMusteriTipi"));
const RaporPersonelPerformans = lazyRetry(() => import("./pages/admin/reports/RaporPersonelPerformans"));
const RaporAksiyonTuru = lazyRetry(() => import("./pages/admin/reports/RaporAksiyonTuru"));
const RaporHedefPrim = lazyRetry(() => import("./pages/admin/reports/RaporHedefPrim"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

const AdminRoute = () => (
  <AdminAuthProvider>
    <Outlet />
  </AdminAuthProvider>
);

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const VisitorTracker = () => {
  useVisitorSource();
  return null;
};

const AppContent = () => {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/yonetim");
  const showPublicChrome = !isAdminPath;

  return (
    <>
      {showPublicChrome && <VisitorTracker />}
      <RouteStateManager />
      {showPublicChrome && <RoutePreloader />}
      {showPublicChrome && <AuthRedirectHandler />}

      <div className={showPublicChrome ? "pb-20 md:pb-0 h-[100dvh] md:h-auto overflow-y-auto md:overflow-visible overscroll-none" : ""}>
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence initial={false}>
            <PageTransition key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/test-index" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tekpazar" element={<AnaSayfa />} />
                <Route path="/firma-bilgilerim" element={<FirmaBilgilerim />} />
                <Route path="/ihalelerim" element={<ManuIhale />} />
                <Route path="/ihalelerim/yeni" element={<YeniIhale />} />
                <Route path="/ihaleler" element={<TekIhale />} />
                <Route path="/ihaleler/:slug" element={<IhaleDetay />} />
                <Route path="/ihalelerim/duzenle/:id" element={<YeniIhale />} />
                <Route path="/ihalelerim/takip/:id" element={<IhaleTakip />} />
                <Route path="/manuihale/takip/:id" element={<IhaleTakip />} />
                <Route path="/tekliflerim" element={<Tekliflerim />} />
                <Route path="/urunlerim" element={<ManuPazar />} />
                <Route path="/urunlerim/yeni" element={<YeniUrun />} />
                <Route path="/urunlerim/duzenle/:id" element={<YeniUrun />} />
                <Route path="/urun-kategorisi/:categoryId" element={<UrunKategorisi />} />
                <Route path="/urun/:slug" element={<UrunDetay />} />
                <Route path="/urunler/:slug" element={<UrunDetay />} />
                <Route path="/firmalar" element={<TekRehber />} />
                <Route path="/firma/:slug" element={<FirmaDetay />} />
                <Route path="/mesajlar" element={<Mesajlar />} />
                <Route path="/favoriler" element={<Favoriler />} />
                <Route path="/bildirimler" element={<Bildirimler />} />
                <Route path="/ayarlar" element={<ProfilAyarlari />} />
                <Route path="/profil-ayarlari" element={<ProfilAyarlari />} />
                <Route path="/paketim" element={<Paketim />} />
                <Route path="/destek" element={<DashboardDestek />} />
                <Route path="/destek/:id" element={<DashboardDestekDetay />} />
                <Route path="/giris-kayit" element={<GirisKayit />} />
                <Route path="/sifre-sifirla" element={<SifreSifirla />} />
                <Route path="/telefon-dogrulama" element={<TelefonDogrulama />} />
                <Route path="/hakkimizda" element={<Hakkimizda />} />
                <Route path="/sss" element={<SSS />} />
                <Route path="/iletisim" element={<Iletisim />} />
                <Route path="/gizlilik-kosullari" element={<GizlilikKosullari />} />
                <Route path="/kullanim-kosullari" element={<KullanimKosullari />} />
                <Route path="/kvkk-aydinlatma" element={<KVKKAydinlatma />} />
                <Route path="/mesafeli-satis-sozlesmesi" element={<MesafeliSatisSozlesmesi />} />
                <Route path="/odeme-sonuc" element={<OdemeSonuc />} />
                <Route path="/odeme-test" element={<OdemeTest />} />
                <Route path="/odeme-test-yillik" element={<OdemeTestYillik />} />
                <Route path="/uretici-ve-tedarikci-kesfi" element={<UreticiTedarikciKesfi />} />
                <Route path="/online-ihale-platformu" element={<TekIhaleTanitim />} />
                <Route path="/online-pazar-yeri" element={<TekPazarTanitim />} />
                <Route path="/tekihale/:slug" element={<IhaleDetay />} />

                <Route path="/yonetim" element={<AdminRoute />}>
                  <Route path="giris" element={<AdminGiris />} />
                  <Route index element={<AdminPanel />} />
                  <Route path="panel" element={<AdminPanel />} />
                  <Route path="firmalar" element={<AdminFirmalarV2 />} />
                  <Route path="firmalar-v2" element={<AdminFirmalarV2 />} />
                  <Route path="kullanicilar" element={<AdminKullanicilar />} />
                  <Route path="urunler" element={<AdminUrunler />} />
                  <Route path="ihaleler" element={<AdminIhaleler />} />
                  <Route path="destek" element={<AdminDestek />} />
                  <Route path="islemler" element={<AdminIslemler />} />
                  <Route path="paketler" element={<AdminPaketler />} />
                  <Route path="reklam" element={<AdminReklam />} />
                  <Route path="yetkilendirme" element={<AdminYetkilendirme />} />
                  <Route path="kisitlamalar" element={<AdminKisitlamalar />} />
                  <Route path="sikayetler" element={<AdminSikayetler />} />
                  <Route path="aksiyonlar" element={<AdminAksiyonlar />} />
                  <Route path="ajanda" element={<AdminAjanda />} />
                  <Route path="hedefler" element={<AdminHedefler />} />
                  <Route path="portfolyo" element={<AdminPortfoy />} />
                  <Route path="ziyaret-planlari" element={<AdminZiyaretPlanlari />} />
                  <Route path="canli-harita" element={<AdminCanliHarita />} />
                  <Route path="kaynak-raporu" element={<AdminKaynakRaporu />} />
                  <Route path="tekbot" element={<AdminTekBot />} />
                  <Route path="raporlar" element={<AdminRaporlar />} />
                  <Route path="raporlar/satis-kanali" element={<RaporSatisKanali />} />
                  <Route path="raporlar/musteri-tipi" element={<RaporMusteriTipi />} />
                  <Route path="raporlar/personel-performans" element={<RaporPersonelPerformans />} />
                  <Route path="raporlar/aksiyon-turu" element={<RaporAksiyonTuru />} />
                  <Route path="raporlar/hedef-prim" element={<RaporHedefPrim />} />
                  <Route path="performans" element={<AdminPerformans />} />
                  <Route path="test-merkezi" element={<AdminTestMerkezi />} />
                  <Route path="sistem-loglari" element={<AdminSistemLoglari />} />
                  <Route path="seo" element={<AdminSeo />} />
                </Route>

                <Route path="/:slug" element={<FirmaDetay />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </AnimatePresence>
        </Suspense>
      </div>

      {showPublicChrome && (
        <Suspense fallback={null}>
          <MobileBottomNav />
          <Chatbot />
        </Suspense>
      )}
      <PwaInstallBanner />
    </>
  );
};

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
