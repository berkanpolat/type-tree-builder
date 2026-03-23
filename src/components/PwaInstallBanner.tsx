import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

const PwaInstallBanner = () => {
  const { isInstallable, isIos, install, dismiss } = usePwaInstall();

  if (!isInstallable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] animate-in slide-in-from-top-4 duration-300">
      <div className="bg-primary text-primary-foreground p-3 flex items-center gap-3 shadow-lg">
        <div className="p-1.5 bg-primary-foreground/20 rounded-lg shrink-0">
          <Download className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {isIos ? (
            <p className="text-xs">
              <Share className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
              Paylaş → Ana Ekrana Ekle ile uygulamayı yükle
            </p>
          ) : (
            <p className="text-xs font-medium">Tekstil A.Ş. uygulamasını ana ekranına ekle!</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isIos && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs px-3"
              onClick={install}
            >
              Yükle
            </Button>
          )}
          <button
            onClick={dismiss}
            className="p-1.5 rounded-md hover:bg-primary-foreground/20 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
