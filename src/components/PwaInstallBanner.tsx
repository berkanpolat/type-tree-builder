import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PwaInstallBanner = () => {
  const { isInstallable, install, dismiss } = usePwaInstall();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:bottom-6 md:max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-primary text-primary-foreground rounded-xl shadow-lg p-4 flex items-center gap-3">
        <div className="p-2 bg-primary-foreground/20 rounded-lg shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Uygulamayı Yükle</p>
          <p className="text-xs opacity-80">Ana ekranına ekle, daha hızlı eriş.</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={install}
          >
            Yükle
          </Button>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-md hover:bg-primary-foreground/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
