import { CSSProperties } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, Clock, User, Building2, FileText, Tag, CheckCircle, XCircle, Package } from "lucide-react";
import { TUR_CONFIG } from "@/lib/aksiyon-config";

const s = {
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
};

export interface AksiyonDetay {
  id: string;
  baslik: string;
  aciklama?: string | null;
  tur: string;
  tarih: string;
  durum?: string;
  admin_ad?: string;
  firma_unvani?: string;
  created_at?: string;
  yetkili_ad?: string;
  sonuc?: string | null;
  sonuc_neden?: string | null;
  sonuc_paket_id?: string | null;
  sonuc_paket_ad?: string | null;
}

interface AksiyonDetayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aksiyon: AksiyonDetay | null;
}

export default function AksiyonDetayDialog({ open, onOpenChange, aksiyon }: AksiyonDetayDialogProps) {
  if (!aksiyon) return null;

  const turConfig = TUR_CONFIG[aksiyon.tur] || TUR_CONFIG.diger;
  const Icon = turConfig.icon;

  const rows: { icon: typeof Calendar; label: string; value: string }[] = [
    {
      icon: Calendar,
      label: "Tarih",
      value: format(new Date(aksiyon.tarih), "dd MMMM yyyy, HH:mm", { locale: tr }),
    },
    {
      icon: Tag,
      label: "Tür",
      value: turConfig.label,
    },
  ];

  if (aksiyon.firma_unvani) {
    rows.push({ icon: Building2, label: "Firma", value: aksiyon.firma_unvani });
  }

  if (aksiyon.admin_ad) {
    rows.push({ icon: User, label: "Personel", value: aksiyon.admin_ad });
  }

  if (aksiyon.yetkili_ad) {
    rows.push({ icon: User, label: "Yetkili Kişi", value: aksiyon.yetkili_ad });
  }

  if (aksiyon.created_at) {
    rows.push({
      icon: Clock,
      label: "Oluşturulma",
      value: format(new Date(aksiyon.created_at), "dd MMM yyyy, HH:mm", { locale: tr }),
    });
  }

  // Sonuc row
  const sonucLabel = aksiyon.sonuc === "satis_kapatildi" ? "Satış Kapatıldı" : aksiyon.sonuc === "satis_kapanmadi" ? "Satış Kapanmadı" : null;
  if (sonucLabel) {
    rows.push({ icon: aksiyon.sonuc === "satis_kapatildi" ? CheckCircle : XCircle, label: "Sonuç", value: sonucLabel });
  }

  if (aksiyon.sonuc === "satis_kapatildi" && aksiyon.sonuc_paket_ad) {
    rows.push({ icon: Package, label: "Paket", value: aksiyon.sonuc_paket_ad });
  }

  if (aksiyon.sonuc === "satis_kapanmadi" && aksiyon.sonuc_neden) {
    rows.push({ icon: XCircle, label: "Neden", value: aksiyon.sonuc_neden });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div
              className="rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${turConfig.color}15`, width: 32, height: 32 }}
            >
              <Icon className="w-4 h-4" style={{ color: turConfig.color }} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold leading-tight" style={s.text}>
                {aksiyon.baslik}
              </DialogTitle>
              <Badge
                className="text-[9px] px-1.5 py-0 mt-1"
                style={{
                  background: `${turConfig.color}20`,
                  color: turConfig.color,
                  borderColor: `${turConfig.color}40`,
                }}
              >
                {turConfig.label}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Detail rows */}
          <div className="rounded-lg divide-y" style={{ background: "hsl(var(--admin-hover))" }}>
            {rows.map((row, i) => {
              const RowIcon = row.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{ borderColor: "hsl(var(--admin-border))" }}
                >
                  <RowIcon className="w-3.5 h-3.5 flex-shrink-0" style={s.muted} />
                  <span className="text-[11px] flex-shrink-0 w-24" style={s.muted}>
                    {row.label}
                  </span>
                  <span className="text-xs font-medium" style={s.text}>
                    {row.value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Aksiyon Notu */}
          {aksiyon.aciklama && (
            <div className="rounded-lg p-3" style={{ background: "hsl(var(--admin-hover))" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="w-3.5 h-3.5" style={s.muted} />
                <span className="text-[11px] font-medium" style={s.muted}>
                  Aksiyon Notu
                </span>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={s.text}>
                {aksiyon.aciklama}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
