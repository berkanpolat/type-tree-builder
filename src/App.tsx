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
import Tekliflerim from "./pages/Tekliflerim";
import ManuPazar from "./pages/ManuPazar";
import YeniUrun from "./pages/YeniUrun";
import Favoriler from "./pages/Favoriler";
import Mesajlar from "./pages/Mesajlar";
import UrunDetay from "./pages/UrunDetay";
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
          <Route path="/manuihale/duzenle/:id" element={<YeniIhale />} />
          <Route path="/tekliflerim" element={<Tekliflerim />} />
          <Route path="/manupazar" element={<ManuPazar />} />
          <Route path="/manupazar/yeni" element={<YeniUrun />} />
          <Route path="/manupazar/duzenle/:id" element={<YeniUrun />} />
          <Route path="/favoriler" element={<Favoriler />} />
          <Route path="/mesajlar" element={<Mesajlar />} />
          <Route path="/hizmet-bilgileri" element={<HizmetBilgileri />} />
          <Route path="/urun-bilgileri" element={<UrunBilgileri />} />
          <Route path="/urun-kategorisi" element={<UrunKategorisi />} />
          <Route path="/giris-kayit" element={<GirisKayit />} />
          <Route path="/urun/:id" element={<UrunDetay />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
