import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import RouteStateManager from "./components/RouteStateManager";
import RoutePreloader from "./components/RoutePreloader";
import AuthRedirectHandler from "./components/AuthRedirectHandler";
import Chatbot from "./components/Chatbot";

// Only GirisKayit is eagerly loaded (auth gate)
import GirisKayit from "./pages/GirisKayit";

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
const AdminCanliHarita = lazy(() => import("./pages/admin/AdminCanliHarita"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 min - reduce unnecessary refetches
      gcTime: 30 * 60 * 1000,    // 30 min garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,      // Don't refetch if data is still fresh
      refetchOnReconnect: false,  // Prevent refetch storms on reconnect
    },
  },
});

const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <AdminAuthProvider>{children}</AdminAuthProvider>
);

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteStateManager />
        <RoutePreloader />
        <AuthRedirectHandler />
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
            
            {/* Admin Panel Routes */}
            <Route path="/yonetim" element={<AdminRoute><AdminGiris /></AdminRoute>} />
            <Route path="/yonetim/panel" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="/yonetim/kullanicilar" element={<AdminRoute><AdminKullanicilar /></AdminRoute>} />
            <Route path="/yonetim/firmalar" element={<AdminRoute><AdminFirmalar /></AdminRoute>} />
            <Route path="/yonetim/firmalar-v2" element={<AdminRoute><AdminFirmalarV2 /></AdminRoute>} />
            <Route path="/yonetim/ihaleler" element={<AdminRoute><AdminIhaleler /></AdminRoute>} />
            <Route path="/yonetim/urunler" element={<AdminRoute><AdminUrunler /></AdminRoute>} />
            <Route path="/yonetim/sikayetler" element={<AdminRoute><AdminSikayetler /></AdminRoute>} />
            <Route path="/yonetim/paketler" element={<AdminRoute><AdminPaketler /></AdminRoute>} />
            <Route path="/yonetim/destek" element={<AdminRoute><AdminDestek /></AdminRoute>} />
            <Route path="/yonetim/islemler" element={<AdminRoute><AdminIslemler /></AdminRoute>} />
            <Route path="/yonetim/kisitlamalar" element={<AdminRoute><AdminKisitlamalar /></AdminRoute>} />
            <Route path="/yonetim/reklam" element={<AdminRoute><AdminReklam /></AdminRoute>} />
            <Route path="/yonetim/tekbot" element={<AdminRoute><AdminTekBot /></AdminRoute>} />
            <Route path="/yonetim/portfolyo" element={<AdminRoute><AdminPortfoy /></AdminRoute>} />
            <Route path="/yonetim/aksiyonlar" element={<AdminRoute><AdminAksiyonlar /></AdminRoute>} />
            <Route path="/yonetim/ziyaret-planlari" element={<AdminRoute><AdminZiyaretPlanlari /></AdminRoute>} />
            <Route path="/yonetim/hedefler" element={<AdminRoute><AdminHedefler /></AdminRoute>} />
            <Route path="/yonetim/canli-harita" element={<AdminRoute><AdminCanliHarita /></AdminRoute>} />

            {/* Catch-all: try firma slug at root level */}
            <Route path="/:slug" element={<FirmaDetay />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Chatbot />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
