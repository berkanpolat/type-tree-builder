import { useEffect } from "react";

/**
 * Preloads frequently visited route chunks after initial page load
 * so that navigation between them is instant (no Suspense fallback).
 */
const preloadRoutes = () => {
  const routes = [
    // Main pages
    () => import("@/pages/AnaSayfa"),
    () => import("@/pages/TekIhale"),
    () => import("@/pages/Dashboard"),
    () => import("@/pages/TekRehber"),
    () => import("@/pages/ManuPazar"),
    () => import("@/pages/ManuIhale"),
    () => import("@/pages/Favoriler"),
    () => import("@/pages/Mesajlar"),
    () => import("@/pages/Bildirimler"),
    () => import("@/pages/FirmaBilgilerim"),
    () => import("@/pages/Tekliflerim"),
    // Detail pages
    () => import("@/pages/UrunDetay"),
    () => import("@/pages/IhaleDetay"),
    () => import("@/pages/FirmaDetay"),
    () => import("@/pages/IhaleTakip"),
    () => import("@/pages/YeniIhale"),
    () => import("@/pages/YeniUrun"),
    // Other pages
    () => import("@/pages/ProfilAyarlari"),
    () => import("@/pages/Paketim"),
    () => import("@/pages/DashboardDestek"),
    () => import("@/pages/DashboardDestekDetay"),
    () => import("@/pages/HizmetBilgileri"),
    () => import("@/pages/UrunBilgileri"),
    () => import("@/pages/UrunKategorisi"),
    () => import("@/pages/LandingPage"),
    () => import("@/pages/Hakkimizda"),
    () => import("@/pages/Iletisim"),
    () => import("@/pages/SSS"),
    () => import("@/pages/UreticiTedarikciKesfi"),
    () => import("@/pages/TekIhaleTanitim"),
    () => import("@/pages/TekPazarTanitim"),
  ];

  let i = 0;
  const loadNext = () => {
    if (i >= routes.length) return;
    routes[i]().finally(() => {
      i++;
      // Stagger loads to avoid blocking main thread
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(loadNext, { timeout: 3000 });
      } else {
        setTimeout(loadNext, 100);
      }
    });
  };
  loadNext();
};

const RoutePreloader = () => {
  useEffect(() => {
    // Wait for initial page to fully render, then start preloading
    const timer = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => preloadRoutes(), { timeout: 5000 });
      } else {
        preloadRoutes();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return null;
};

export default RoutePreloader;
