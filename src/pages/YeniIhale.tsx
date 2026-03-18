import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRestrictions } from "@/hooks/use-restrictions";
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
  birim: string;
  para_birimi: string;
  kdv_durumu: string;
  odeme_secenekleri: string[];
  odeme_vadesi: string[];
  kargo_masrafi: string;
  kargo_sirketi_anlasmasi: string;
  teslimat_tarihi: string;
  teslimat_yeri: string;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  foto_url: string | null;
  fotograflar: string[];
  ek_dosya_url: string | null;
  ek_dosyalar: { url: string; adi: string }[];
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
  birim: "",
  para_birimi: "TRY",
  kdv_durumu: "",
  odeme_secenekleri: [],
  odeme_vadesi: [],
  kargo_masrafi: "",
  kargo_sirketi_anlasmasi: "",
  teslimat_tarihi: "",
  teslimat_yeri: "",
  baslangic_tarihi: "",
  bitis_tarihi: "",
  foto_url: null,
  fotograflar: [],
  ek_dosya_url: null,
  ek_dosyalar: [],
  ozel_filtreleme: false,
  firma_adi_gizle: false,
  min_teklif_degisim: null,
  teknik_detaylar: {},
  filtreler: [],
  stoklar: [],
};

const ALL_STEPS = ["İhale Türü", "Teklif Usulü", "Kategori", "İhale Bilgileri", "Teknik Detaylar", "Stok", "Onay"];

export default function YeniIhale() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<IhaleFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [ihaleId, setIhaleId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const { isRestricted, getRestrictionMessage } = useRestrictions();

  // Check if selected hizmet category is "Teknik & Tasarım" (no birim/stok needed)
  const { data: hizmetKatName } = useQuery({
    queryKey: ["hizmet_kat_name", formData.hizmet_kategori_id],
    queryFn: async () => {
      if (!formData.hizmet_kategori_id) return null;
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("name").eq("id", formData.hizmet_kategori_id).single();
      return data?.name || null;
    },
    enabled: !!formData.hizmet_kategori_id,
  });

  const isTeknikTasarim = !!(hizmetKatName && hizmetKatName.toLowerCase().includes("teknik") && hizmetKatName.toLowerCase().includes("tasarım"));
  const skipStokStep = formData.ihale_turu === "hizmet_alim" && isTeknikTasarim;
  const STEPS = useMemo(() => skipStokStep ? ALL_STEPS.filter(s => s !== "Stok") : ALL_STEPS, [skipStokStep]);

  // Check restriction before allowing ihale creation
  useEffect(() => {
    if (!editId && !isAdminMode && isRestricted("ihale_acamaz")) {
      const msg = getRestrictionMessage("ihale_acamaz");
      toast({
        title: "İşlem Kısıtlandı",
        description: msg || "İhale açma işleminiz kısıtlanmıştır.",
        variant: "destructive",
      });
      navigate("/ihalelerim");
    }
  }, [isRestricted, editId, isAdminMode]);
  // Load existing ihale for editing
  useEffect(() => {
    if (!editId) return;
    const loadIhale = async () => {
      setLoadingEdit(true);
      const adminToken = localStorage.getItem("admin_token");
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      let ihale: any = null;
      let filtreData: any[] = [];
      let stokData: any[] = [];
      let fotoData: string[] = [];
      let ekDosyaData: { url: string; adi: string }[] = [];

      // First try normal user mode (to check ownership)
      if (currentUser) {
        const { data, error } = await supabase.from("ihaleler").select("*").eq("id", editId).single();
        if (!error && data) {
          // If the logged-in user owns this ihale, always use normal mode (not admin)
          if (data.user_id === currentUser.id) {
            ihale = data;

            // Normal users can only edit duzenleniyor or onay_bekliyor
            if (ihale.durum !== "duzenleniyor" && ihale.durum !== "onay_bekliyor") {
              toast({ title: "Hata", description: "Bu ihale düzenlenemez.", variant: "destructive" });
              navigate("/ihalelerim");
              return;
            }

            const [filtreRes, stokRes, fotoRes, ekDosyaRes] = await Promise.all([
              supabase.from("ihale_filtreler").select("filtre_tipi, secenek_id").eq("ihale_id", editId),
              supabase.from("ihale_stok").select("varyant_1_label, varyant_1_value, varyant_2_label, varyant_2_value, miktar_tipi, stok_sayisi").eq("ihale_id", editId),
              supabase.from("ihale_fotograflar" as any).select("foto_url, sira").eq("ihale_id", editId).order("sira"),
              supabase.from("ihale_ek_dosyalar" as any).select("dosya_url, dosya_adi, sira").eq("ihale_id", editId).order("sira"),
            ]);
            filtreData = filtreRes.data || [];
            stokData = stokRes.data || [];
            fotoData = (fotoRes.data || []).map((f: any) => f.foto_url);
            ekDosyaData = (ekDosyaRes.data || []).map((f: any) => ({ url: f.dosya_url, adi: f.dosya_adi }));
          }
        }
      }

      // If not loaded as owner, try admin mode
      if (!ihale && adminToken) {
        try {
          const { data, error } = await supabase.functions.invoke("admin-auth/get-ihale-edit-data", {
            body: { token: adminToken, ihaleId: editId },
          });
          if (!error && data?.ihale) {
            ihale = data.ihale;
            filtreData = data.filtreler || [];
            stokData = data.stoklar || [];
            fotoData = (data.fotograflar || []).map((f: any) => f.foto_url || f);
            ekDosyaData = (data.ek_dosyalar || []).map((f: any) => ({ url: f.dosya_url || f.url, adi: f.dosya_adi || f.adi }));
            setIsAdminMode(true);
          }
        } catch {}
      }

      if (!ihale) {
        toast({ title: "Hata", description: "İhale bulunamadı.", variant: "destructive" });
        navigate("/ihalelerim");
        return;
      }

      const formatDatetime = (val: string | null) => {
        if (!val) return "";
        try {
          return new Date(val).toISOString().slice(0, 16);
        } catch { return ""; }
      };

      setFormData({
        id: ihale.id,
        ihale_no: ihale.ihale_no,
        ihale_turu: ihale.ihale_turu || "",
        teklif_usulu: ihale.teklif_usulu || "",
        urun_kategori_id: ihale.urun_kategori_id || "",
        urun_grup_id: ihale.urun_grup_id || "",
        urun_tur_id: ihale.urun_tur_id || "",
        hizmet_kategori_id: ihale.hizmet_kategori_id || "",
        hizmet_tur_id: ihale.hizmet_tur_id || "",
        baslik: ihale.baslik || "",
        aciklama: ihale.aciklama || "",
        baslangic_fiyati: ihale.baslangic_fiyati ? Number(ihale.baslangic_fiyati) : null,
        para_birimi: ihale.para_birimi || "TRY",
        birim: (ihale as any).birim || "",
        kdv_durumu: ihale.kdv_durumu || "",
        odeme_secenekleri: ihale.odeme_secenekleri ? (ihale.odeme_secenekleri as string).split(",").map(s => s.trim()).filter(Boolean) : [],
        odeme_vadesi: ihale.odeme_vadesi ? (ihale.odeme_vadesi as string).split(",").map(s => s.trim()).filter(Boolean) : [],
        kargo_masrafi: ihale.kargo_masrafi || "",
        kargo_sirketi_anlasmasi: ihale.kargo_sirketi_anlasmasi || "",
        teslimat_tarihi: formatDatetime(ihale.teslimat_tarihi),
        teslimat_yeri: ihale.teslimat_yeri || "",
        baslangic_tarihi: formatDatetime(ihale.baslangic_tarihi),
        bitis_tarihi: formatDatetime(ihale.bitis_tarihi),
        foto_url: ihale.foto_url,
        fotograflar: fotoData.length > 0 ? fotoData : (ihale.foto_url ? [ihale.foto_url] : []),
        ek_dosya_url: ihale.ek_dosya_url,
        ek_dosyalar: ekDosyaData.length > 0 ? ekDosyaData : (ihale.ek_dosya_url ? [{ url: ihale.ek_dosya_url, adi: "Ek Dosya" }] : []),
        ozel_filtreleme: ihale.ozel_filtreleme || false,
        firma_adi_gizle: ihale.firma_adi_gizle || false,
        min_teklif_degisim: ihale.min_teklif_degisim ? Number(ihale.min_teklif_degisim) : null,
        teknik_detaylar: (ihale.teknik_detaylar as Record<string, any>) || {},
        filtreler: filtreData.map((f: any) => ({ filtre_tipi: f.filtre_tipi, secenek_id: f.secenek_id })),
        stoklar: stokData.map((s: any) => ({
          varyant_1_label: s.varyant_1_label,
          varyant_1_value: s.varyant_1_value,
          varyant_2_label: s.varyant_2_label || undefined,
          varyant_2_value: s.varyant_2_value || undefined,
          miktar_tipi: s.miktar_tipi,
          stok_sayisi: s.stok_sayisi,
        })),
      });

      setIhaleId(editId);
      setLoadingEdit(false);
    };

    loadIhale();
  }, [editId]);

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
      case 3: {
        const birimRequired = !skipStokStep;
        return !!(formData.baslik && formData.aciklama && formData.baslangic_fiyati && (birimRequired ? formData.birim : true) && formData.kdv_durumu && formData.odeme_secenekleri.length > 0 && formData.odeme_vadesi.length > 0 && formData.baslangic_tarihi && formData.bitis_tarihi);
      }
      default: return true;
    }
  };

  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    switch (currentStep) {
      case 0:
        if (!formData.ihale_turu) missing.push("İhale Türü");
        break;
      case 1:
        if (!formData.teklif_usulu) missing.push("Teklif Usulü");
        break;
      case 2:
        if (formData.ihale_turu === "hizmet_alim") {
          if (!formData.hizmet_kategori_id) missing.push("Hizmet Kategorisi");
          if (!formData.hizmet_tur_id) missing.push("Hizmet Türü");
        } else {
          if (!formData.urun_kategori_id) missing.push("Ürün Kategorisi");
          if (!formData.urun_grup_id) missing.push("Ürün Grubu");
          if (!formData.urun_tur_id) missing.push("Ürün Türü");
        }
        break;
      case 3:
        if (!formData.baslik) missing.push("İhale Başlığı");
        if (!formData.aciklama) missing.push("Açıklama");
        if (!formData.baslangic_fiyati) missing.push("Başlangıç Fiyatı");
        if (!skipStokStep && !formData.birim) missing.push("Birim");
        if (!formData.kdv_durumu) missing.push("KDV Durumu");
        if (formData.odeme_secenekleri.length === 0) missing.push("Ödeme Seçenekleri");
        if (formData.odeme_vadesi.length === 0) missing.push("Ödeme Vadesi");
        if (!formData.baslangic_tarihi) missing.push("Başlangıç Tarihi");
        if (!formData.bitis_tarihi) missing.push("Bitiş Tarihi");
        break;
    }
    return missing;
  };

  const handleNext = async () => {
    if (!canProceed()) {
      const missing = getMissingFields();
      toast({
        title: "Eksik Alanlar",
        description: `Lütfen şu alanları doldurun: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Date validations on İhale Bilgileri step
    if (STEPS[currentStep] === "İhale Bilgileri") {
      const now = new Date();
      const minStart = new Date(now.getTime() + 30 * 60 * 1000);
      const maxEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const start = formData.baslangic_tarihi ? new Date(formData.baslangic_tarihi) : null;
      const end = formData.bitis_tarihi ? new Date(formData.bitis_tarihi) : null;

      if (start && start < minStart) {
        toast({ title: "Tarih Hatası", description: "Başlangıç tarihi en erken 30 dakika sonrası olabilir.", variant: "destructive" });
        return;
      }
      if (end && end > maxEnd) {
        toast({ title: "Tarih Hatası", description: "Bitiş tarihi en geç 30 gün sonrası olabilir.", variant: "destructive" });
        return;
      }
      if (start && end && end <= start) {
        toast({ title: "Tarih Hatası", description: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.", variant: "destructive" });
        return;
      }
    }

    if (STEPS[currentStep] === "Teklif Usulü" && !ihaleId) {
      await createIhale();
    } else if (ihaleId) {
      // Auto-save on every step transition for draft persistence
      await handleSave();
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = async () => {
    if (ihaleId) await handleSave();
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
      console.error("İhale oluşturma hatası:", error);
      toast({ title: "Hata", description: `İhale oluşturulamadı: ${error.message}`, variant: "destructive" });
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

    const ihaleUpdateData = {
      ihale_turu: formData.ihale_turu,
      teklif_usulu: formData.teklif_usulu,
      baslik: formData.baslik || "Taslak İhale",
      aciklama: formData.aciklama || null,
      baslangic_fiyati: formData.baslangic_fiyati,
      birim: formData.birim || null,
      para_birimi: formData.para_birimi,
      kdv_durumu: formData.kdv_durumu || null,
      odeme_secenekleri: formData.odeme_secenekleri.length > 0 ? formData.odeme_secenekleri.join(", ") : null,
      odeme_vadesi: formData.odeme_vadesi.length > 0 ? formData.odeme_vadesi.join(", ") : null,
      kargo_masrafi: formData.kargo_masrafi,
      kargo_sirketi_anlasmasi: formData.kargo_sirketi_anlasmasi,
      teslimat_tarihi: formData.teslimat_tarihi || null,
      teslimat_yeri: formData.teslimat_yeri,
      baslangic_tarihi: formData.baslangic_tarihi || null,
      bitis_tarihi: formData.bitis_tarihi || null,
      foto_url: formData.fotograflar[0] || formData.foto_url,
      ek_dosya_url: formData.ek_dosyalar[0]?.url || formData.ek_dosya_url,
      ozel_filtreleme: formData.ozel_filtreleme,
      firma_adi_gizle: formData.firma_adi_gizle,
      min_teklif_degisim: formData.min_teklif_degisim,
      urun_kategori_id: formData.urun_kategori_id || null,
      urun_grup_id: formData.urun_grup_id || null,
      urun_tur_id: formData.urun_tur_id || null,
      hizmet_kategori_id: formData.hizmet_kategori_id || null,
      hizmet_tur_id: formData.hizmet_tur_id || null,
      teknik_detaylar: formData.teknik_detaylar,
    };

    if (isAdminMode) {
      // Admin mode: save via edge function (bypasses RLS)
      const adminToken = localStorage.getItem("admin_token");
      const { data, error } = await supabase.functions.invoke("admin-auth/admin-save-ihale", {
        body: {
          token: adminToken,
          ihaleId,
          ihaleData: ihaleUpdateData,
          filtreler: formData.ozel_filtreleme ? formData.filtreler : [],
          stoklar: formData.stoklar,
          fotograflar: formData.fotograflar,
          ek_dosyalar: formData.ek_dosyalar,
        },
      });
      if (error || !data?.success) {
        toast({ title: "Hata", description: "Kayıt başarısız.", variant: "destructive" });
      }
    } else {
      // Normal user mode
      const { error } = await supabase.from("ihaleler").update({
        ...ihaleUpdateData,
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

      // Save fotograflar
      await supabase.from("ihale_fotograflar" as any).delete().eq("ihale_id", ihaleId);
      if (formData.fotograflar.length > 0) {
        await supabase.from("ihale_fotograflar" as any).insert(
          formData.fotograflar.map((url, i) => ({ ihale_id: ihaleId, foto_url: url, sira: i }))
        );
      }

      // Save ek dosyalar
      await supabase.from("ihale_ek_dosyalar" as any).delete().eq("ihale_id", ihaleId);
      if (formData.ek_dosyalar.length > 0) {
        await supabase.from("ihale_ek_dosyalar" as any).insert(
          formData.ek_dosyalar.map((d, i) => ({ ihale_id: ihaleId, dosya_url: d.url, dosya_adi: d.adi, sira: i }))
        );
      }
    }

    setSaving(false);
  };

  const handlePreview = async () => {
    await handleSave();
    if (!ihaleId) return;
    // Fetch slug for navigation
    const { data: ihaleRow } = await supabase.from("ihaleler").select("slug").eq("id", ihaleId).maybeSingle();
    const target = ihaleRow?.slug || ihaleId;
    if (isAdminMode) {
      window.open(`/ihaleler/${target}`, "_blank");
    } else {
      navigate(`/ihaleler/${target}`);
    }
  };

  if (loadingEdit) {
    return (
      <DashboardLayout title="İhale Düzenle">
        <div className="flex items-center justify-center py-20 text-muted-foreground">Yükleniyor...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={editId ? "İhale Düzenle" : "Yeni İhale"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{editId ? "İhale Düzenle" : "Yeni ihale"}</h2>
            {formData.ihale_no && (
              <p className="text-sm text-muted-foreground mt-1">#{formData.ihale_no}</p>
            )}
          </div>
          <span className="text-sm text-muted-foreground">Adım {currentStep + 1} / {STEPS.length}</span>
        </div>

        <IhaleWizardStepper steps={STEPS} currentStep={currentStep} onStepClick={(step) => setCurrentStep(step)} freeNavigation={isAdminMode} />

        <Card>
          <CardContent className="p-4 sm:p-6">
            {STEPS[currentStep] === "İhale Türü" && <IhaleTuruStep formData={formData} updateForm={updateForm} />}
            {STEPS[currentStep] === "Teklif Usulü" && <TeklifUsuluStep formData={formData} updateForm={updateForm} />}
            {STEPS[currentStep] === "Kategori" && <KategoriStep formData={formData} updateForm={updateForm} />}
            {STEPS[currentStep] === "İhale Bilgileri" && <IhaleBilgileriStep formData={formData} updateForm={updateForm} ihaleId={ihaleId} skipBirim={skipStokStep} />}
            {STEPS[currentStep] === "Teknik Detaylar" && <TeknikDetaylarStep formData={formData} updateForm={updateForm} />}
            {STEPS[currentStep] === "Stok" && <StokStep formData={formData} updateForm={updateForm} />}
          </CardContent>
        </Card>

        <div className="flex justify-between sticky bottom-0 bg-background py-3 border-t z-10">
          {currentStep > 0 ? (
            <Button variant="outline" onClick={handleBack}>Geri</Button>
          ) : <div />}
          
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext}>İleri</Button>
          ) : (
            <Button onClick={handlePreview} disabled={saving}>
              {saving ? "Kaydediliyor..." : "İlerle ve Önizle"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
