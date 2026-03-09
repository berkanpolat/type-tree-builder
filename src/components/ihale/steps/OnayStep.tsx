import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { IhaleFormData } from "@/pages/YeniIhale";

interface Props {
  formData: IhaleFormData;
}

const IHALE_TURU_LABELS: Record<string, string> = {
  urun_alis: "Ürün Alış İhalesi",
  urun_satis: "Ürün Satış İhalesi",
  hizmet_alim: "Hizmet İhalesi",
};

const TEKLIF_USULU_LABELS: Record<string, string> = {
  kapali_teklif: "Kapalı Teklif",
  acik_indirme: "Açık İndirme",
  acik_arttirma: "Açık Arttırma",
};

export default function OnayStep({ formData }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Onay</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">İhale bilgilerinizi kontrol edin ve onaya gönderin</p>

      <div className="space-y-4 max-w-2xl">
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-foreground">Genel Bilgiler</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">İhale Türü:</span>
            <span className="text-foreground">{IHALE_TURU_LABELS[formData.ihale_turu]}</span>
            <span className="text-muted-foreground">Teklif Usulü:</span>
            <span className="text-foreground">{TEKLIF_USULU_LABELS[formData.teklif_usulu]}</span>
            <span className="text-muted-foreground">Başlık:</span>
            <span className="text-foreground font-medium">{formData.baslik}</span>
            <span className="text-muted-foreground">Başlangıç Fiyatı:</span>
            <span className="text-foreground">{formData.baslangic_fiyati?.toLocaleString("tr-TR")} {formData.para_birimi}</span>
            <span className="text-muted-foreground">KDV:</span>
            <span className="text-foreground">{formData.kdv_durumu}</span>
            <span className="text-muted-foreground">Ödeme:</span>
            <span className="text-foreground">{formData.odeme_secenekleri} - {formData.odeme_vadesi}</span>
          </div>
        </div>

        {formData.aciklama && (
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2">Açıklama</h4>
            <p className="text-sm text-muted-foreground">{formData.aciklama}</p>
          </div>
        )}

        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-foreground">Tarihler</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Başlangıç:</span>
            <span className="text-foreground">{formData.baslangic_tarihi}</span>
            <span className="text-muted-foreground">Bitiş:</span>
            <span className="text-foreground">{formData.bitis_tarihi}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {formData.ozel_filtreleme && <Badge variant="secondary">Özel Filtreleme Aktif</Badge>}
          {formData.firma_adi_gizle && <Badge variant="secondary">Firma Adı Gizli</Badge>}
          {formData.foto_url && <Badge variant="secondary">Fotoğraf Yüklendi</Badge>}
          {formData.ek_dosya_url && <Badge variant="secondary">Ek Dosya Yüklendi</Badge>}
          {formData.stoklar.length > 0 && <Badge variant="secondary">{formData.stoklar.length} Stok Varyasyonu</Badge>}
        </div>
      </div>
    </div>
  );
}
