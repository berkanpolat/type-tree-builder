import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { IhaleFormData } from "@/pages/YeniIhale";

interface Props {
  formData: IhaleFormData;
  updateForm: (u: Partial<IhaleFormData>) => void;
  ihaleId: string | null;
}

const PARA_BIRIMLERI = ["TRY", "USD", "EUR", "GBP"];

function useKategoriSecenekler(kategoriName: string, enabled = true) {
  return useQuery({
    queryKey: ["ihale_bilgi_secenekler", kategoriName],
    queryFn: async () => {
      const { data: kat } = await supabase.from("firma_bilgi_kategorileri").select("id").eq("name", kategoriName).single();
      if (!kat) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("kategori_id", kat.id).is("parent_id", null).order("name");
      return data || [];
    },
    enabled,
  });
}

function useAltSecenekler(parentId: string | null) {
  return useQuery({
    queryKey: ["alt_secenekler", parentId],
    queryFn: async () => {
      if (!parentId) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("parent_id", parentId).order("name");
      return data || [];
    },
    enabled: !!parentId,
  });
}

export default function IhaleBilgileriStep({ formData, updateForm, ihaleId }: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedSertifikaKat, setSelectedSertifikaKat] = useState<string | null>(null);

  // DB-sourced dropdown options
  const { data: kdvOptions } = useKategoriSecenekler("KDV Durumu");
  const { data: odemeSecenekleriOptions } = useKategoriSecenekler("Ödeme Seçenekleri");
  const { data: odemeVadesiOptions } = useKategoriSecenekler("Ödeme Vadeleri");
  const { data: kargoMasrafiOptions } = useKategoriSecenekler("Kargo Masrafı Ödemesi");
  const { data: kargoSirketiOptions } = useKategoriSecenekler("Kargo Şirketi Anlaşması");

  // Fetch firma türleri, tipleri, ölçekleri for filtering
  const { data: firmaTurleri } = useQuery({
    queryKey: ["firma_turleri_filter"],
    queryFn: async () => {
      const { data } = await supabase.from("firma_turleri").select("*").order("name");
      return data || [];
    },
    enabled: formData.ozel_filtreleme,
  });

  // Firma tipi filtered by selected firma türü
  const selectedFirmaTuruIds = formData.filtreler.filter(f => f.filtre_tipi === "firma_turu").map(f => f.secenek_id);

  const { data: firmaTipleri } = useQuery({
    queryKey: ["firma_tipleri_filter", selectedFirmaTuruIds],
    queryFn: async () => {
      let query = supabase.from("firma_tipleri").select("*").order("name");
      if (selectedFirmaTuruIds.length > 0) {
        query = query.in("firma_turu_id", selectedFirmaTuruIds);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: formData.ozel_filtreleme,
  });

  const { data: firmaOlcekleri } = useKategoriSecenekler("Firma Ölçeği", formData.ozel_filtreleme);
  const { data: sertifikaKategorileri } = useKategoriSecenekler("Sertifika Kategorisi", formData.ozel_filtreleme);
  const { data: sertifikaTurleri } = useAltSecenekler(selectedSertifikaKat);
  const { data: iller } = useKategoriSecenekler("İl", formData.ozel_filtreleme);

  const addFilter = (filtre_tipi: string, secenek_id: string) => {
    if (formData.filtreler.some((f) => f.filtre_tipi === filtre_tipi && f.secenek_id === secenek_id)) return;
    updateForm({ filtreler: [...formData.filtreler, { filtre_tipi, secenek_id }] });
  };

  const removeFilter = (filtre_tipi: string, secenek_id: string) => {
    updateForm({ filtreler: formData.filtreler.filter((f) => !(f.filtre_tipi === filtre_tipi && f.secenek_id === secenek_id)) });
  };

  const getFilterName = (filtre_tipi: string, secenek_id: string) => {
    let list: any[] = [];
    if (filtre_tipi === "firma_turu") list = firmaTurleri || [];
    else if (filtre_tipi === "firma_tipi") list = firmaTipleri || [];
    else if (filtre_tipi === "firma_olcegi") list = firmaOlcekleri || [];
    else if (filtre_tipi === "sertifika") list = [...(sertifikaKategorileri || []), ...(sertifikaTurleri || [])];
    else if (filtre_tipi === "il") list = iller || [];
    return list.find((i) => i.id === secenek_id)?.name || secenek_id;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "foto" | "ek") => {
    const file = e.target.files?.[0];
    if (!file || !ihaleId) return;
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${ihaleId}/${type}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("ihale-files").upload(path, file);

    if (error) {
      toast({ title: "Hata", description: "Dosya yüklenemedi.", variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("ihale-files").getPublicUrl(path);
      if (type === "foto") updateForm({ foto_url: urlData.publicUrl });
      else updateForm({ ek_dosya_url: urlData.publicUrl });
    }
    setUploading(false);
  };

  const showMinTeklifDegisim = formData.teklif_usulu === "acik_indirme" || formData.teklif_usulu === "acik_arttirma";

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">İhale Bilgileri</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">İhale detaylarını doldurun</p>

      <div className="space-y-4 max-w-2xl">
        <div className="space-y-2">
          <Label>İhale Başlığı *</Label>
          <Input value={formData.baslik} onChange={(e) => updateForm({ baslik: e.target.value })} placeholder="İhale başlığı giriniz" maxLength={200} />
        </div>

        <div className="space-y-2">
          <Label>İhale Açıklaması *</Label>
          <Textarea value={formData.aciklama} onChange={(e) => updateForm({ aciklama: e.target.value })} placeholder="İhale açıklaması giriniz" rows={4} maxLength={2000} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>İhale Başlangıç Fiyatı (Birim Fiyat) *</Label>
            <Input type="number" value={formData.baslangic_fiyati ?? ""} onChange={(e) => updateForm({ baslangic_fiyati: e.target.value ? Number(e.target.value) : null })} placeholder="0.00" min={0} />
          </div>
          <div className="space-y-2">
            <Label>Para Birimi</Label>
            <Select value={formData.para_birimi} onValueChange={(v) => updateForm({ para_birimi: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {PARA_BIRIMLERI.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showMinTeklifDegisim && (
          <div className="space-y-2">
            <Label>Minimum {formData.teklif_usulu === "acik_indirme" ? "İndirme" : "Arttırma"} Miktarı</Label>
            <Input type="number" value={formData.min_teklif_degisim ?? ""} onChange={(e) => updateForm({ min_teklif_degisim: e.target.value ? Number(e.target.value) : null })} placeholder="Opsiyonel" min={0} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>KDV Durumu *</Label>
            <Select value={formData.kdv_durumu} onValueChange={(v) => updateForm({ kdv_durumu: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {(kdvOptions || []).map((o) => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ödeme Seçenekleri *</Label>
            <Select value={formData.odeme_secenekleri} onValueChange={(v) => updateForm({ odeme_secenekleri: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {(odemeSecenekleriOptions || []).map((o) => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ödeme Vadesi *</Label>
            <Select value={formData.odeme_vadesi} onValueChange={(v) => updateForm({ odeme_vadesi: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {(odemeVadesiOptions || []).map((o) => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Kargo Masrafı Ödemesi *</Label>
            <Select value={formData.kargo_masrafi} onValueChange={(v) => updateForm({ kargo_masrafi: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {(kargoMasrafiOptions || []).map((o) => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Kargo Şirketi Anlaşması *</Label>
            <Select value={formData.kargo_sirketi_anlasmasi} onValueChange={(v) => updateForm({ kargo_sirketi_anlasmasi: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {(kargoSirketiOptions || []).map((o) => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Teslimat Yeri</Label>
            <Input value={formData.teslimat_yeri} onChange={(e) => updateForm({ teslimat_yeri: e.target.value })} placeholder="Teslimat yeri giriniz" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Teslimat Tarihi</Label>
            <Input type="date" value={formData.teslimat_tarihi?.split("T")[0] || ""} onChange={(e) => updateForm({ teslimat_tarihi: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>İhale Başlangıç Tarihi ve Saati *</Label>
            <Input type="datetime-local" value={formData.baslangic_tarihi} onChange={(e) => updateForm({ baslangic_tarihi: e.target.value })} />
            <p className="text-xs text-muted-foreground">Min. 3 saat sonrası</p>
          </div>
          <div className="space-y-2">
            <Label>İhale Bitiş Tarihi ve Saati *</Label>
            <Input type="datetime-local" value={formData.bitis_tarihi} onChange={(e) => updateForm({ bitis_tarihi: e.target.value })} />
            <p className="text-xs text-muted-foreground">Maks. 30 gün</p>
          </div>
        </div>

        {/* File Uploads */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fotoğraf Yükleme {formData.ihale_turu === "urun_satis" && "*"}</Label>
            <div className="border rounded-lg p-4 text-center">
              {formData.foto_url ? (
                <div className="relative">
                  <img src={formData.foto_url} alt="" className="w-full h-32 object-cover rounded" />
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => updateForm({ foto_url: null })}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm">Fotoğraf yükle</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "foto")} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ek Dosya Yükleme</Label>
            <div className="border rounded-lg p-4 text-center">
              {formData.ek_dosya_url ? (
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-sm text-foreground">Dosya yüklendi</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateForm({ ek_dosya_url: null })}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm">Ek dosya yükle</span>
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, "ek")} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Özel Filtreleme */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Özel Filtrelendirme</Label>
              <p className="text-xs text-muted-foreground">Şartları sağlamayan firmalar teklif veremez. Tüm alanları doldurmak zorunlu değildir.</p>
            </div>
            <Switch checked={formData.ozel_filtreleme} onCheckedChange={(v) => updateForm({ ozel_filtreleme: v, filtreler: v ? formData.filtreler : [] })} />
          </div>

          {formData.ozel_filtreleme && (
            <div className="space-y-3 pt-2 border-t">
              {/* Firma Türü */}
              {[
                { label: "Firma Türü", tipi: "firma_turu", options: firmaTurleri },
                { label: "Firma Tipi", tipi: "firma_tipi", options: firmaTipleri },
                { label: "Firma Ölçeği", tipi: "firma_olcegi", options: firmaOlcekleri },
              ].map(({ label, tipi, options }) => (
                <div key={tipi} className="space-y-1">
                  <Label className="text-sm">{label}</Label>
                  {tipi === "firma_tipi" && selectedFirmaTuruIds.length === 0 && (
                    <p className="text-xs text-muted-foreground">Önce firma türü seçiniz</p>
                  )}
                  <Select onValueChange={(v) => addFilter(tipi, v)} disabled={tipi === "firma_tipi" && selectedFirmaTuruIds.length === 0}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={`${label} seçiniz`} /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {(options || []).map((o: any) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.filtreler.filter((f) => f.filtre_tipi === tipi).map((f) => (
                      <Badge key={f.secenek_id} variant="secondary" className="gap-1">
                        {getFilterName(tipi, f.secenek_id)}
                        <button onClick={() => removeFilter(tipi, f.secenek_id)}><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}

              {/* Sertifika with Kategori -> Tür hierarchy */}
              <div className="space-y-1">
                <Label className="text-sm">Sertifika</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={selectedSertifikaKat || ""} onValueChange={(v) => setSelectedSertifikaKat(v)}>
                    <SelectTrigger><SelectValue placeholder="Sertifika Kategorisi" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {(sertifikaKategorileri || []).map((o: any) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(v) => addFilter("sertifika", v)} disabled={!selectedSertifikaKat}>
                    <SelectTrigger><SelectValue placeholder="Sertifika Türü" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {(sertifikaTurleri || []).map((o: any) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.filtreler.filter((f) => f.filtre_tipi === "sertifika").map((f) => (
                    <Badge key={f.secenek_id} variant="secondary" className="gap-1">
                      {getFilterName("sertifika", f.secenek_id)}
                      <button onClick={() => removeFilter("sertifika", f.secenek_id)}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* İhale Bölgesi (İl) */}
              <div className="space-y-1">
                <Label className="text-sm">İhale Bölgesi</Label>
                <Select onValueChange={(v) => addFilter("il", v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="İl seçiniz" /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {(iller || []).map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.filtreler.filter((f) => f.filtre_tipi === "il").map((f) => (
                    <Badge key={f.secenek_id} variant="secondary" className="gap-1">
                      {getFilterName("il", f.secenek_id)}
                      <button onClick={() => removeFilter("il", f.secenek_id)}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Firma Adını Gizle */}
        <div className="flex items-center justify-between border rounded-lg p-4">
          <div>
            <Label>Firma Adını Gizle</Label>
            <p className="text-xs text-muted-foreground">Kullanıcılar ihaleyi hangi firmanın açtığını göremez</p>
          </div>
          <Switch checked={formData.firma_adi_gizle} onCheckedChange={(v) => updateForm({ firma_adi_gizle: v })} />
        </div>
      </div>
    </div>
  );
}
