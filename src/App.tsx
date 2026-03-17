import { lazy, Suspense } from "react";
import { useVisitorSource } from "@/hooks/use-visitor-source";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import RouteStateManager from "./components/RouteStateManager";
import RoutePreloader from "./components/RoutePreloader";
import AuthRedirectHandler from "./components/AuthRedirectHandler";

// GirisKayit is now also lazy-loaded
const GirisKayit = lazy(() => import("./pages/GirisKayit"));

// All pages lazy-loaded for optimal code splitting
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Index = lazy(() => import("./pages/Index"));
const AnaSayfa = lazy(() => import("./pages/AnaSayfa"));
const FirmaBilgilerim = lazy(() => import("./pages/FirmaBilgilerim"));
const ManuIhale = lazy(() => import("./pages/ManuIhale"));
const YeniIhale = lazy(() => import("./pages/YeniIhale"));
const TekIhale = lazy(() => import("./pages/TekIhale"));
const IhaleDetay = lazy(() => import("./pages/IhaleDetay"));
const IhaleTakip = lazy(() => import("./pages/IhaleTakip"));
const Tekliflerim = lazy(() => import("./pages/Tekliflerim"));
const ManuPazar = lazy(() => import("./pages/ManuPazar"));
const YeniUrun = lazy(() => import("./pages/YeniUrun"));
const Favoriler = lazy(() => import("./pages/Favoriler"));
const Mesajlar = lazy(() => import("./pages/Mesajlar"));
const Bildirimler = lazy(() => import("./pages/Bildirimler"));
const UrunDetay = lazy(() => import("./pages/UrunDetay"));
const FirmaDetay = lazy(() => import("./pages/FirmaDetay"));
const ProfilAyarlari = lazy(() => import("./pages/ProfilAyarlari"));
const TekRehber = lazy(() => import("./pages/TekRehber"));
const Hakkimizda = lazy(() => import("./pages/Hakkimizda"));
const Iletisim = lazy(() => import("./pages/Iletisim"));
const UreticiTedarikciKesfi = lazy(() => import("./pages/UreticiTedarikciKesfi"));
const TekIhaleTanitim = lazy(() => import("./pages/TekIhaleTanitim"));
const TekPazarTanitim = lazy(() => import("./pages/TekPazarTanitim"));
const SSS = lazy(() => import("./pages/SSS"));
const GizlilikKosullari = lazy(() => import("./pages/GizlilikKosullari"));
const KVKKAydinlatma = lazy(() => import("./pages/KVKKAydinlatma"));
const KullanimKosullari = lazy(() => import("./pages/KullanimKosullari"));
const MesafeliSatisSozlesmesi = lazy(() => import("./pages/MesafeliSatisSozlesmesi"));
const SifreSifirla = lazy(() => import("./pages/SifreSifirla"));
const TelefonDogrulama = lazy(() => import("./pages/TelefonDogrulama"));
const Paketim = lazy(() => import("./pages/Paketim"));
const DashboardDestek = lazy(() => import("./pages/DashboardDestek"));
const DashboardDestekDetay = lazy(() => import("./pages/DashboardDestekDetay"));
const HizmetBilgileri = lazy(() => import("./pages/HizmetBilgileri"));
const UrunBilgileri = lazy(() => import("./pages/UrunBilgileri"));
const UrunKategorisi = lazy(() => import("./pages/UrunKategorisi"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Chatbot = lazy(() => import("./components/Chatbot"));

// Admin pages
const AdminGiris = lazy(() => import("./pages/admin/AdminGiris"));
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const AdminKullanicilar = lazy(() => import("./pages/admin/AdminKullanicilar"));
const AdminFirmalar = lazy(() => import("./pages/admin/AdminFirmalar"));
const AdminFirmalarV2 = lazy(() => import("./pages/admin/AdminFirmalarV2"));
const AdminIhaleler = lazy(() => import("./pages/admin/AdminIhaleler"));
const AdminUrunler = lazy(() => import("./pages/admin/AdminUrunler"));
const AdminSikayetler = lazy(() => import("./pages/admin/AdminSikayetler"));
const AdminDestek = lazy(() => import("./pages/admin/AdminDestek"));
const AdminPaketler = lazy(() => import("./pages/admin/AdminPaketler"));
const AdminIslemler = lazy(() => import("./pages/admin/AdminIslemler"));
const AdminKisitlamalar = lazy(() => import("./pages/admin/AdminKisitlamalar"));
const AdminReklam = lazy(() => import("./pages/admin/AdminReklam"));
const AdminTekBot = lazy(() => import("./pages/admin/AdminTekBot"));
const AdminPortfoy = lazy(() => import("./pages/admin/AdminPortfoy"));
const AdminAksiyonlar = lazy(() => import("./pages/admin/AdminAksiyonlar"));
const AdminZiyaretPlanlari = lazy(() => import("./pages/admin/AdminZiyaretPlanlari"));
const AdminHedefler = lazy(() => import("./pages/admin/AdminHedefler"));
const AdminAjanda = lazy(() => import("./pages/admin/AdminAjanda"));
const AdminCanliHarita = lazy(() => import("./pages/admin/AdminCanliHarita"));
const AdminYetkilendirme = lazy(() => import("./pages/admin/AdminYetkilendirme"));
const AdminKaynakRaporu = lazy(() => import("./pages/admin/AdminKaynakRaporu"));
const AdminRaporlar = lazy(() => import("./pages/admin/AdminRaporlar"));
const AdminPerformans = lazy(() => import("./pages/admin/AdminPerformans"));
const AdminTestMerkezi = lazy(() => import("./pages/admin/AdminTestMerkezi"));
const OdemeTest = lazy(() => import("./pages/OdemeTest"));
const RaporSatisKanali = lazy(() => import("./pages/admin/reports/RaporSatisKanali"));
const RaporMusteriTipi = lazy(() => import("./pages/admin/reports/RaporMusteriTipi"));
const RaporPersonelPerformans = lazy(() => import("./pages/admin/reports/RaporPersonelPerformans"));
const RaporAksiyonTuru = lazy(() => import("./pages/admin/reports/RaporAksiyonTuru"));
const RaporHedefPrim = lazy(() => import("./pages/admin/reports/RaporHedefPrim"));

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

      <Suspense fallback={<PageLoader />}>
        <Routes>
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
          <Route path="/tekliflerim" element={<Tekliflerim />} />
          <Route path="/urunlerim" element={<ManuPazar />} />
          <Route path="/urunlerim/yeni" element={<YeniUrun />} />
          <Route path="/urunlerim/duzenle/:id" element={<YeniUrun />} />
          <Route path="/favoriler" element={<Favoriler />} />
          <Route path="/mesajlar" element={<Mesajlar />} />
          <Route path="/bildirimler" element={<Bildirimler />} />
          <Route path="/paketim" element={<Paketim />} />
          <Route path="/destek" element={<DashboardDestek />} />
          <Route path="/destek/:id" element={<DashboardDestekDetay />} />
          <Route path="/hizmet-bilgileri" element={<HizmetBilgileri />} />
          <Route path="/urun-bilgileri" element={<UrunBilgileri />} />
          <Route path="/urun-kategorisi" element={<UrunKategorisi />} />
          <Route path="/giris-kayit" element={<GirisKayit />} />
          <Route path="/urunler/:slug" element={<UrunDetay />} />
          <Route path="/firma/:slug" element={<FirmaDetay />} />
          <Route path="/firmalar" element={<TekRehber />} />
          <Route path="/ayarlar" element={<ProfilAyarlari />} />
          <Route path="/profil-ayarlari" element={<ProfilAyarlari />} />
          <Route path="/hakkimizda" element={<Hakkimizda />} />
          <Route path="/iletisim" element={<Iletisim />} />
          <Route path="/uretici-tedarikci-kesfi" element={<UreticiTedarikciKesfi />} />
          <Route path="/tekihale-tanitim" element={<TekIhaleTanitim />} />
          <Route path="/tekpazar-tanitim" element={<TekPazarTanitim />} />
          <Route path="/sss" element={<SSS />} />
          <Route path="/gizlilik-kosullari" element={<GizlilikKosullari />} />
          <Route path="/kvkk-aydinlatma" element={<KVKKAydinlatma />} />
          <Route path="/kullanim-kosullari" element={<KullanimKosullari />} />
          <Route path="/mesafeli-satis-sozlesmesi" element={<MesafeliSatisSozlesmesi />} />
          <Route path="/sifre-sifirla" element={<SifreSifirla />} />
          <Route path="/telefon-dogrulama" element={<TelefonDogrulama />} />
          <Route path="/odeme-test" element={<OdemeTest />} />
          <Route path="/odeme-test-yillik" element={<OdemeTestYillik />} />

          <Route path="/yonetim" element={<AdminRoute />}>
            <Route index element={<AdminGiris />} />
            <Route path="panel" element={<AdminPanel />} />
            <Route path="kullanicilar" element={<AdminKullanicilar />} />
            <Route path="firmalar" element={<AdminFirmalar />} />
            <Route path="firmalar-v2" element={<AdminFirmalarV2 />} />
            <Route path="ihaleler" element={<AdminIhaleler />} />
            <Route path="urunler" element={<AdminUrunler />} />
            <Route path="sikayetler" element={<AdminSikayetler />} />
            <Route path="paketler" element={<AdminPaketler />} />
            <Route path="destek" element={<AdminDestek />} />
            <Route path="islemler" element={<AdminIslemler />} />
            <Route path="kisitlamalar" element={<AdminKisitlamalar />} />
            <Route path="reklam" element={<AdminReklam />} />
            <Route path="tekbot" element={<AdminTekBot />} />
            <Route path="portfolyo" element={<AdminPortfoy />} />
            <Route path="aksiyonlar" element={<AdminAksiyonlar />} />
            <Route path="ziyaret-planlari" element={<AdminZiyaretPlanlari />} />
            <Route path="hedefler" element={<AdminHedefler />} />
            <Route path="ajanda" element={<AdminAjanda />} />
            <Route path="canli-harita" element={<AdminCanliHarita />} />
            <Route path="yetkilendirme" element={<AdminYetkilendirme />} />
            <Route path="kaynak-raporu" element={<AdminKaynakRaporu />} />
            <Route path="raporlar" element={<AdminRaporlar />} />
            <Route path="raporlar/satis-kanali" element={<RaporSatisKanali />} />
            <Route path="raporlar/musteri-tipi" element={<RaporMusteriTipi />} />
            <Route path="raporlar/personel-performans" element={<RaporPersonelPerformans />} />
            <Route path="raporlar/aksiyon-turu" element={<RaporAksiyonTuru />} />
            <Route path="raporlar/hedef-prim" element={<RaporHedefPrim />} />
            <Route path="performans" element={<AdminPerformans />} />
            <Route path="test-merkezi" element={<AdminTestMerkezi />} />
          </Route>

          <Route path="/:slug" element={<FirmaDetay />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {showPublicChrome && (
        <Suspense fallback={null}>
          <Chatbot />
        </Suspense>
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
