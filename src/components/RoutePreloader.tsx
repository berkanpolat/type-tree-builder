import { useEffect } from "react";

/**
 * Preloads frequently visited route chunks after initial page load
 * so that navigation between them is instant (no Suspense fallback).
 */
const preloadRoutes = () => {
  const routes = [
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
    () => import("@/pages/UrunDetay"),
    () => import("@/pages/IhaleDetay"),
    () => import("@/pages/FirmaDetay"),
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
