import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [nativePromptAvailable, setNativePromptAvailable] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [showMobileTip, setShowMobileTip] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("pwa_install_dismissed") === "1";
  });

  useEffect(() => {
    if (isStandalone()) return;

    // Native prompt (Chrome, Edge, Samsung Internet)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setNativePromptAvailable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS fallback: show tip after 2 seconds
    if (isIos()) {
      const timer = setTimeout(() => setShowIosTip(true), 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    // Android Chrome fallback: if beforeinstallprompt doesn't fire within 3s, show manual tip
    if (isMobileDevice() && !isIos()) {
      const fallbackTimer = setTimeout(() => {
        if (!nativePromptAvailable) {
          setShowMobileTip(true);
        }
      }, 3000);
      return () => {
        clearTimeout(fallbackTimer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setNativePromptAvailable(false);
        setShowMobileTip(false);
      }
    } catch (err) {
      console.warn("PWA install prompt failed:", err);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem("pwa_install_dismissed", "1");
  }, []);

  const isInstallable = !isDismissed && !isStandalone() && (nativePromptAvailable || showIosTip || showMobileTip);

  return {
    isInstallable,
    isIos: isIos(),
    hasNativePrompt: nativePromptAvailable,
    install,
    dismiss,
  };
}
