import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [nativePromptAvailable, setNativePromptAvailable] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
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

    // iOS fallback: show tip after 3 seconds
    if (isIos()) {
      const timer = setTimeout(() => setShowIosTip(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setNativePromptAvailable(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem("pwa_install_dismissed", "1");
  }, []);

  const isInstallable = !isDismissed && !isStandalone() && (nativePromptAvailable || showIosTip);

  return {
    isInstallable,
    isIos: isIos(),
    install,
    dismiss,
  };
}
