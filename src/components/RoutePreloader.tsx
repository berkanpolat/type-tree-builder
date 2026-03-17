import { useEffect } from "react";

const PRELOAD_ROUTES = [
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
  () => import("@/pages/ProfilAyarlari"),
  () => import("@/pages/Paketim"),
];

const shouldPreloadRoutes = () => {
  if (document.visibilityState !== "visible") return false;

  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;

  if (connection?.saveData) return false;
  if (connection?.effectiveType?.includes("2g")) return false;

  return true;
};

const preloadRoutes = () => {
  let index = 0;

  const loadNext = () => {
    if (index >= PRELOAD_ROUTES.length) return;

    void PRELOAD_ROUTES[index]().finally(() => {
      index += 1;
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(loadNext, { timeout: 4000 });
      } else {
        window.setTimeout(loadNext, 250);
      }
    });
  };

  loadNext();
};

const RoutePreloader = () => {
  useEffect(() => {
    if (!shouldPreloadRoutes()) return;

    const startPreloading = () => preloadRoutes();

    const timer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(startPreloading, { timeout: 6000 });
      } else {
        startPreloading();
      }
    }, 3500);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
};

export default RoutePreloader;
