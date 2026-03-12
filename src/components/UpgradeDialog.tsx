import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, Eye, Gavel, FileText, ShoppingBag, MessageSquare, AlertTriangle } from "lucide-react";
import { PAKET_OZELLIKLERI, PRO_FIYATLAR } from "@/lib/package-config";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
}

const PRO_FEATURES = [
  { icon: Eye, label: "Firma Profili Görüntüleme", value: PAKET_OZELLIKLERI.pro.profil_goruntuleme },
  { icon: Gavel, label: "İhale Açma", value: PAKET_OZELLIKLERI.pro.ihale_acma },
  { icon: FileText, label: "Teklif Verme", value: PAKET_OZELLIKLERI.pro.teklif_verme },
  { icon: ShoppingBag, label: "Aktif Ürün", value: PAKET_OZELLIKLERI.pro.aktif_urun },
  { icon: MessageSquare, label: "Mesaj Gönderme", value: PAKET_OZELLIKLERI.pro.mesaj },
];

export default function UpgradeDialog({ open, onOpenChange, title, message }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <DialogTitle className="text-center text-lg">
              {title || "Hakkınız Doldu"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground text-center px-2">
          {message || "Bu işlem için hakkınız kalmamıştır. PRO pakete yükselterek sınırsız erişim kazanabilirsiniz."}
        </p>

        {/* PRO features */}
        <div className="bg-muted/50 rounded-lg p-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">PRO Paket Özellikleri</span>
          </div>
          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-foreground">{f.label}:</span>
                <span className="text-muted-foreground font-medium">{f.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              navigate("/paketim");
            }}
          >
            <Crown className="w-4 h-4" />
            PRO Pakete Yükselt — ${STRIPE_CONFIG.pro.aylik.fiyat}/ay
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
