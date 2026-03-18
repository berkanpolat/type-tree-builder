import { CheckCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { IhaleFormData } from "@/pages/YeniIhale";

interface Props {
  formData: IhaleFormData;
  onSubmit: () => void;
  onPreview: () => void;
  submitting: boolean;
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

export default function OnayStep({ formData, onSubmit, onPreview, submitting }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Önizleme ve Onay</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">İhale bilgilerinizi kontrol edin ve onaya gönderin</p>

      <div className="space-y-4 max-w-2xl">
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-foreground">Genel Bilgiler</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">İhale Türü:</span>
            <span className="text-foreground">{IHALE_TURU_LABELS[formData.ihale_turu] || formData.ihale_turu}</span>
            <span className="text-muted-foreground">Teklif Usulü:</span>
            <span className="text-foreground">{TEKLIF_USULU_LABELS[formData.teklif_usulu] || formData.teklif_usulu}</span>
            <span className="text-muted-foreground">Başlık:</span>
            <span className="text-foreground font-medium">{formData.baslik}</span>
            <span className="text-muted-foreground">Başlangıç Fiyatı:</span>
            <span className="text-foreground">{formData.baslangic_fiyati?.toLocaleString("tr-TR")} {formData.para_birimi}</span>
            {formData.birim && (
              <>
                <span className="text-muted-foreground">Birim:</span>
                <span className="text-foreground">{formData.birim}</span>
              </>
            )}
            <span className="text-muted-foreground">KDV:</span>
            <span className="text-foreground">{formData.kdv_durumu}</span>
            <span className="text-muted-foreground">Ödeme:</span>
            <span className="text-foreground">{formData.odeme_secenekleri.join(", ")} - {formData.odeme_vadesi.join(", ")}</span>
          </div>
        </div>

        {formData.aciklama && (
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2">Açıklama</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.aciklama}</p>
          </div>
        )}

        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-foreground">Tarihler</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Başlangıç:</span>
            <span className="text-foreground">{formData.baslangic_tarihi ? new Date(formData.baslangic_tarihi).toLocaleString("tr-TR") : "-"}</span>
            <span className="text-muted-foreground">Bitiş:</span>
            <span className="text-foreground">{formData.bitis_tarihi ? new Date(formData.bitis_tarihi).toLocaleString("tr-TR") : "-"}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {formData.ozel_filtreleme && <Badge variant="secondary">Özel Filtreleme Aktif</Badge>}
          {formData.firma_adi_gizle && <Badge variant="secondary">Firma Adı Gizli</Badge>}
          {formData.fotograflar.length > 0 && <Badge variant="secondary">{formData.fotograflar.length} Fotoğraf</Badge>}
          {formData.ek_dosyalar.length > 0 && <Badge variant="secondary">{formData.ek_dosyalar.length} Ek Dosya</Badge>}
          {formData.stoklar.length > 0 && <Badge variant="secondary">{formData.stoklar.length} Stok Varyasyonu</Badge>}
        </div>

        <Separator />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onPreview}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Yeni Sekmede Önizle
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {submitting ? "Gönderiliyor..." : "Onaya Gönder"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Onaya gönderdikten sonra ihaleniz ekibimiz tarafından incelenecek ve uygunsa yayına alınacaktır.
        </p>
      </div>
    </div>
  );
}
