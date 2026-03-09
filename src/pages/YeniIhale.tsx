import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import IhaleWizardStepper from "@/components/ihale/IhaleWizardStepper";
import IhaleTuruStep from "@/components/ihale/steps/IhaleTuruStep";
import TeklifUsuluStep from "@/components/ihale/steps/TeklifUsuluStep";
import KategoriStep from "@/components/ihale/steps/KategoriStep";
import IhaleBilgileriStep from "@/components/ihale/steps/IhaleBilgileriStep";
import TeknikDetaylarStep from "@/components/ihale/steps/TeknikDetaylarStep";
import StokStep from "@/components/ihale/steps/StokStep";
import OnayStep from "@/components/ihale/steps/OnayStep";

export interface IhaleFormData {
  id?: string;
  ihale_no?: string;
  ihale_turu: string;
  teklif_usulu: string;
  urun_kategori_id: string;
  urun_grup_id: string;
  urun_tur_id: string;
  hizmet_kategori_id: string;
  hizmet_tur_id: string;
  baslik: string;
  aciklama: string;
  baslangic_fiyati: number | null;
  para_birimi: string;
  kdv_durumu: string;
  odeme_secenekleri: string;
  odeme_vadesi: string;
  kargo_masrafi: string;
  kargo_sirketi_anlasmasi: string;
  teslimat_tarihi: string;
  teslimat_yeri: string;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  foto_url: string | null;
  ek_dosya_url: string | null;
  ozel_filtreleme: boolean;
  firma_adi_gizle: boolean;
  min_teklif_degisim: number | null;
  teknik_detaylar: Record<string, any>;
  filtreler: { filtre_tipi: string; secenek_id: string }[];
  stoklar: { varyant_1_label: string; varyant_1_value: string; varyant_2_label?: string; varyant_2_value?: string; miktar_tipi: string; stok_sayisi: number }[];
}

const INITIAL_FORM: IhaleFormData = {
  ihale_turu: "",
  teklif_usulu: "",
  urun_kategori_id: "",
  urun_grup_id: "",
  urun_tur_id: "",
  hizmet_kategori_id: "",
  hizmet_tur_id: "",
  baslik: "",
  aciklama: "",
  baslangic_fiyati: null,
  para_birimi: "TRY",
  kdv_durumu: "",
  odeme_secenekleri: "",
  odeme_vadesi: "",
  kargo_masrafi: "",
  kargo_sirketi_anlasmasi: "",
  teslimat_tarihi: "",
  teslimat_yeri: "",
  baslangic_tarihi: "",
  bitis_tarihi: "",
  foto_url: null,
  ek_dosya_url: null,
  ozel_filtreleme: false,
  firma_adi_gizle: false,
  min_teklif_degisim: null,
  teknik_detaylar: {},
  filtreler: [],
  stoklar: [],
};

const STEPS = ["İhale Türü", "Teklif Usulü", "Kategori", "İhale Bilgileri", "Teknik Detaylar", "Stok", "Onay"];

export default function YeniIhale() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<IhaleFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [ihaleId, setIhaleId] = useState<string | null>(null);

  // Determine if stok step should be shown
  const shouldShowStok = () => {
    if (formData.ihale_turu === "hizmet_alim") {
      // Hizmet alım - check if it's "Teknik ve Tasarım Hizmeti" category
      // If so, no stok
      return true; // We'll refine this based on selected hizmet category
    }
    return true;
  };

  const updateForm = (updates: Partial<IhaleFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return !!formData.ihale_turu;
      case 1: return !!formData.teklif_usulu;
      case 2:
        if (formData.ihale_turu === "hizmet_alim") {
          return !!formData.hizmet_kategori_id && !!formData.hizmet_tur_id;
        }
        return !!formData.urun_kategori_id && !!formData.urun_grup_id && !!formData.urun_tur_id;
      case 3:
        return !!(formData.baslik && formData.aciklama && formData.baslangic_fiyati && formData.para_birimi && formData.kdv_durumu && formData.odeme_secenekleri && formData.odeme_vadesi && formData.baslangic_tarihi && formData.bitis_tarihi);
      default: return true;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && !ihaleId) {
      // Create ihale in DB after step 2 (teklif usulü selected)
      await createIhale();
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const createIhale = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from("ihaleler").insert({
      user_id: user.id,
      ihale_turu: formData.ihale_turu,
      teklif_usulu: formData.teklif_usulu,
      baslik: "Taslak İhale",
      durum: "duzenleniyor",
    } as any).select().single();

    if (error) {
      toast({ title: "Hata", description: "İhale oluşturulamadı.", variant: "destructive" });
      return;
    }
    if (data) {
      setIhaleId((data as any).id);
      setFormData((prev) => ({ ...prev, id: (data as any).id, ihale_no: (data as any).ihale_no }));
    }
  };

  const handleSave = async () => {
    if (!ihaleId) return;
    setSaving(true);

    const { error } = await supabase.from("ihaleler").update({
      ihale_turu: formData.ihale_turu,
      teklif_usulu: formData.teklif_usulu,
      baslik: formData.baslik,
      aciklama: formData.aciklama,
      baslangic_fiyati: formData.baslangic_fiyati,
      para_birimi: formData.para_birimi,
      kdv_durumu: formData.kdv_durumu,
      odeme_secenekleri: formData.odeme_secenekleri,
      odeme_vadesi: formData.odeme_vadesi,
      kargo_masrafi: formData.kargo_masrafi,
      kargo_sirketi_anlasmasi: formData.kargo_sirketi_anlasmasi,
      teslimat_tarihi: formData.teslimat_tarihi || null,
      teslimat_yeri: formData.teslimat_yeri,
      baslangic_tarihi: formData.baslangic_tarihi || null,
      bitis_tarihi: formData.bitis_tarihi || null,
      foto_url: formData.foto_url,
      ek_dosya_url: formData.ek_dosya_url,
      ozel_filtreleme: formData.ozel_filtreleme,
      firma_adi_gizle: formData.firma_adi_gizle,
      min_teklif_degisim: formData.min_teklif_degisim,
      urun_kategori_id: formData.urun_kategori_id || null,
      urun_grup_id: formData.urun_grup_id || null,
      urun_tur_id: formData.urun_tur_id || null,
      hizmet_kategori_id: formData.hizmet_kategori_id || null,
      hizmet_tur_id: formData.hizmet_tur_id || null,
      teknik_detaylar: formData.teknik_detaylar,
      durum: "duzenleniyor",
    } as any).eq("id", ihaleId);

    if (error) {
      toast({ title: "Hata", description: "Kayıt başarısız.", variant: "destructive" });
    }

    // Save filtreler
    if (formData.ozel_filtreleme && formData.filtreler.length > 0) {
      await supabase.from("ihale_filtreler" as any).delete().eq("ihale_id", ihaleId);
      await supabase.from("ihale_filtreler" as any).insert(
        formData.filtreler.map((f) => ({ ihale_id: ihaleId, ...f }))
      );
    }

    // Save stok
    if (formData.stoklar.length > 0) {
      await supabase.from("ihale_stok" as any).delete().eq("ihale_id", ihaleId);
      await supabase.from("ihale_stok" as any).insert(
        formData.stoklar.map((s) => ({ ihale_id: ihaleId, ...s }))
      );
    }

    setSaving(false);
  };

  const handlePublish = async () => {
    await handleSave();
    if (!ihaleId) return;

    // Update status to onay_bekliyor
    await supabase.from("ihaleler").update({ durum: "onay_bekliyor" } as any).eq("id", ihaleId);
    toast({ title: "İhale onaya gönderildi" });
    navigate("/manuihale");
  };

  return (
    <DashboardLayout title="Yeni İhale">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Yeni ihale</h2>
            {formData.ihale_no && (
              <p className="text-sm text-muted-foreground mt-1">#{formData.ihale_no}</p>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{currentStep + 1}</span>
        </div>

        <IhaleWizardStepper steps={STEPS} currentStep={currentStep} />

        <Card>
          <CardContent className="p-6">
            {currentStep === 0 && <IhaleTuruStep formData={formData} updateForm={updateForm} />}
            {currentStep === 1 && <TeklifUsuluStep formData={formData} updateForm={updateForm} />}
            {currentStep === 2 && <KategoriStep formData={formData} updateForm={updateForm} />}
            {currentStep === 3 && <IhaleBilgileriStep formData={formData} updateForm={updateForm} ihaleId={ihaleId} />}
            {currentStep === 4 && <TeknikDetaylarStep formData={formData} updateForm={updateForm} />}
            {currentStep === 5 && <StokStep formData={formData} updateForm={updateForm} />}
            {currentStep === 6 && <OnayStep formData={formData} />}

            <div className="flex justify-between mt-8 pt-6 border-t">
              {currentStep > 0 ? (
                <Button variant="outline" onClick={handleBack}>Geri</Button>
              ) : <div />}
              
              {currentStep < STEPS.length - 1 ? (
                <Button onClick={handleNext} disabled={!canProceed()}>İleri</Button>
              ) : (
                <Button onClick={handlePublish} disabled={saving}>
                  {saving ? "Kaydediliyor..." : "Onaya Gönder"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
