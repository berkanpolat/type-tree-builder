import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * Lightweight page rendered inside the 3D Secure iframe after PayTR redirects.
 * Sends a postMessage to the parent window so the landing form can react.
 */
export default function OdemeSonuc() {
  const [params] = useSearchParams();
  const result = params.get("odeme"); // "basarili" | "basarisiz"

  useEffect(() => {
    if (!result) return;
    // Notify parent (landing page) about payment result
    try {
      window.parent.postMessage(
        { type: "PAYTR_PAYMENT_RESULT", result },
        "*"
      );
    } catch {
      // If postMessage fails, user will see the UI below
    }
  }, [result]);

  if (result === "basarili") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h1 className="text-xl font-bold text-foreground">Ödeme Başarılı!</h1>
        <p className="text-sm text-muted-foreground">Yönlendiriliyorsunuz...</p>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (result === "basarisiz") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
        <XCircle className="w-16 h-16 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">Ödeme Başarısız</h1>
        <p className="text-sm text-muted-foreground">Ödeme işlemi tamamlanamadı.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">İşleniyor...</p>
    </div>
  );
}
