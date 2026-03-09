import { ShoppingCart, Store, Wrench } from "lucide-react";
import type { IhaleFormData } from "@/pages/YeniIhale";

const IHALE_TURLERI = [
  {
    value: "urun_alis",
    label: "Ürün Alış İhalesi",
    description: "Alıcı, almak istediği ürünü ve detaylarını girer, tedarikçiler teklif verir.",
    icon: ShoppingCart,
  },
  {
    value: "urun_satis",
    label: "Ürün Satış İhalesi",
    description: "Satıcı, elindeki ürünleri listeler, alıcılar teklif verir.",
    icon: Store,
  },
  {
    value: "hizmet_alim",
    label: "Hizmet İhalesi",
    description: "Nakliye, kalite kontrol, fason gibi hizmetler için açılır.",
    icon: Wrench,
  },
];

interface Props {
  formData: IhaleFormData;
  updateForm: (u: Partial<IhaleFormData>) => void;
}

export default function IhaleTuruStep({ formData, updateForm }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">İhale Türü Seçin</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Oluşturmak istediğiniz ihale türünü seçin</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {IHALE_TURLERI.map((t) => {
          const Icon = t.icon;
          const selected = formData.ihale_turu === t.value;
          return (
            <button
              key={t.value}
              onClick={() => updateForm({ ihale_turu: t.value, teklif_usulu: "", urun_kategori_id: "", urun_grup_id: "", urun_tur_id: "", hizmet_kategori_id: "", hizmet_tur_id: "" })}
              className={`p-6 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-foreground text-center mb-2">{t.label}</h4>
              <p className="text-xs text-muted-foreground text-center">{t.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
