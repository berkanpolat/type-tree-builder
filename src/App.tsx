import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import AnaSayfa from "./pages/AnaSayfa";
import HizmetBilgileri from "./pages/HizmetBilgileri";
import UrunBilgileri from "./pages/UrunBilgileri";
import UrunKategorisi from "./pages/UrunKategorisi";
import GirisKayit from "./pages/GirisKayit";
import FirmaBilgilerim from "./pages/FirmaBilgilerim";
import ManuIhale from "./pages/ManuIhale";
import YeniIhale from "./pages/YeniIhale";
import TekIhale from "./pages/TekIhale";
import IhaleDetay from "./pages/IhaleDetay";
import IhaleTakip from "./pages/IhaleTakip";
import Tekliflerim from "./pages/Tekliflerim";
import ManuPazar from "./pages/ManuPazar";
import YeniUrun from "./pages/YeniUrun";
import Favoriler from "./pages/Favoriler";
import Mesajlar from "./pages/Mesajlar";
import Bildirimler from "./pages/Bildirimler";
import UrunDetay from "./pages/UrunDetay";
import FirmaDetay from "./pages/FirmaDetay";
import ProfilAyarlari from "./pages/ProfilAyarlari";
import TekRehber from "./pages/TekRehber";
import Hakkimizda from "./pages/Hakkimizda";
import Iletisim from "./pages/Iletisim";
import UreticiTedarikciKesfi from "./pages/UreticiTedarikciKesfi";
import TekIhaleTanitim from "./pages/TekIhaleTanitim";
import TekPazarTanitim from "./pages/TekPazarTanitim";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/test-index" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/anasayfa" element={<AnaSayfa />} />
          <Route path="/firma-bilgilerim" element={<FirmaBilgilerim />} />
          <Route path="/manuihale" element={<ManuIhale />} />
          <Route path="/manuihale/yeni" element={<YeniIhale />} />
          <Route path="/tekihale" element={<TekIhale />} />
          <Route path="/tekihale/:id" element={<IhaleDetay />} />
          <Route path="/ihale/:id" element={<IhaleDetay />} />
          <Route path="/manuihale/duzenle/:id" element={<YeniIhale />} />
          <Route path="/manuihale/takip/:id" element={<IhaleTakip />} />
          <Route path="/tekliflerim" element={<Tekliflerim />} />
          <Route path="/manupazar" element={<ManuPazar />} />
          <Route path="/manupazar/yeni" element={<YeniUrun />} />
          <Route path="/manupazar/duzenle/:id" element={<YeniUrun />} />
          <Route path="/favoriler" element={<Favoriler />} />
          <Route path="/mesajlar" element={<Mesajlar />} />
          <Route path="/bildirimler" element={<Bildirimler />} />
          <Route path="/hizmet-bilgileri" element={<HizmetBilgileri />} />
          <Route path="/urun-bilgileri" element={<UrunBilgileri />} />
          <Route path="/urun-kategorisi" element={<UrunKategorisi />} />
          <Route path="/giris-kayit" element={<GirisKayit />} />
          <Route path="/urun/:id" element={<UrunDetay />} />
          <Route path="/firma/:id" element={<FirmaDetay />} />
          <Route path="/tekrehber" element={<TekRehber />} />
          <Route path="/ayarlar" element={<ProfilAyarlari />} />
          <Route path="/hakkimizda" element={<Hakkimizda />} />
          <Route path="/iletisim" element={<Iletisim />} />
          <Route path="/uretici-tedarikci-kesfi" element={<UreticiTedarikciKesfi />} />
          <Route path="/tekihale-tanitim" element={<TekIhaleTanitim />} />
          <Route path="/tekpazar-tanitim" element={<TekPazarTanitim />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
