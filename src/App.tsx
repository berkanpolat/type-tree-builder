import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import HizmetBilgileri from "./pages/HizmetBilgileri";
import UrunBilgileri from "./pages/UrunBilgileri";
import UrunKategorisi from "./pages/UrunKategorisi";
import GirisKayit from "./pages/GirisKayit";
import FirmaBilgilerim from "./pages/FirmaBilgilerim";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hizmet-bilgileri" element={<HizmetBilgileri />} />
          <Route path="/urun-bilgileri" element={<UrunBilgileri />} />
          <Route path="/urun-kategorisi" element={<UrunKategorisi />} />
          <Route path="/giris-kayit" element={<GirisKayit />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
