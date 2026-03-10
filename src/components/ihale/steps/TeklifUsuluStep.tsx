import { Lock, TrendingDown, TrendingUp } from "lucide-react";
import type { IhaleFormData } from "@/pages/YeniIhale";

interface Props {
  formData: IhaleFormData;
  updateForm: (u: Partial<IhaleFormData>) => void;
}

const USUL_LIST = [
  {
    value: "kapali_teklif",
    label: "Kapalı Teklif",
    description: "Kullanıcılar yalnızca kendi tekliflerini görür. Diğer teklifler gizlidir.",
    icon: Lock,
  },
  {
    value: "acik_indirme",
    label: "Açık İndirme",
    description: "Teklifler canlı olarak görüntülenir. Yeni teklif son teklife eşit veya daha düşük olmalıdır.",
    icon: TrendingDown,
  },
  {
    value: "acik_arttirma",
    label: "Açık Arttırma",
    description: "Teklifler canlı olarak görüntülenir. Yeni teklif son teklife eşit veya daha yüksek olmalıdır.",
    icon: TrendingUp,
  },
];

export default function TeklifUsuluStep({ formData, updateForm }: Props) {
  // Ürün Alış → açık arttırma seçilemez
  // Ürün Satış → açık indirme seçilemez
  const isDisabled = (value: string) => {
    if (formData.ihale_turu === "urun_alis" && value === "acik_arttirma") return true;
    if (formData.ihale_turu === "urun_satis" && value === "acik_indirme") return true;
    return false;
  };

  const getDisabledReason = (value: string) => {
    if (formData.ihale_turu === "urun_alis" && value === "acik_arttirma")
      return "Ürün Alış ihalelerinde açık arttırma kullanılamaz.";
    if (formData.ihale_turu === "urun_satis" && value === "acik_indirme")
      return "Ürün Satış ihalelerinde açık indirme kullanılamaz.";
    return "";
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Teklif Usulü Seçin</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">İhaleniz için teklif usulünü belirleyin</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {USUL_LIST.map((u) => {
          const Icon = u.icon;
          const disabled = isDisabled(u.value);
          const selected = formData.teklif_usulu === u.value;
          return (
            <button
              key={u.value}
              disabled={disabled}
              onClick={() => !disabled && updateForm({ teklif_usulu: u.value })}
              className={`p-6 rounded-lg border-2 text-left transition-all relative flex flex-col items-center ${
                disabled
                  ? "border-border bg-muted/50 opacity-50 cursor-not-allowed"
                  : selected
                  ? "border-primary bg-primary/5 hover:shadow-md"
                  : "border-border hover:border-muted-foreground/40 hover:shadow-md"
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-foreground text-center mb-2 h-6 flex items-center">{u.label}</h4>
              <p className="text-xs text-muted-foreground text-center h-10 flex items-center">{u.description}</p>
              {disabled && (
                <p className="text-xs text-destructive text-center mt-2">{getDisabledReason(u.value)}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
