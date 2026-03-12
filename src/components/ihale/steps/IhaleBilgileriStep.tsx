import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sortFirmaTurleri, sortSecenekler } from "@/lib/sort-utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MultiSelectDropdown from "@/components/firma-bilgileri/MultiSelectDropdown";
import SearchableSelect from "@/components/ui/searchable-select";
import type { IhaleFormData } from "@/pages/YeniIhale";

interface Props {
  formData: IhaleFormData;
  updateForm: (u: Partial<IhaleFormData>) => void;
  ihaleId: string | null;
  skipBirim?: boolean;
}

const PARA_BIRIMLERI = ["TRY", "USD", "EUR", "GBP"];

function useKategoriSecenekler(kategoriName: string, enabled = true) {
  return useQuery({
    queryKey: ["ihale_bilgi_secenekler", kategoriName],
    queryFn: async () => {
      const { data: kat } = await supabase.from("firma_bilgi_kategorileri").select("id").eq("name", kategoriName).single();
      if (!kat) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("kategori_id", kat.id).is("parent_id", null).order("name");
      return sortSecenekler(data || []);
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
      return sortSecenekler(data || []);
    },
    enabled: !!parentId,
  });
}

export default function IhaleBilgileriStep({ formData, updateForm, ihaleId, skipBirim }: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedSertifikaKat, setSelectedSertifikaKat] = useState<string | null>(null);

  // DB-sourced dropdown options
  const { data: kdvOptions } = useKategoriSecenekler("KDV Durumu");
  const { data: odemeSecenekleriOptions } = useKategoriSecenekler("Ödeme Seçenekleri");
  const { data: odemeVadesiOptions } = useKategoriSecenekler("Ödeme Vadeleri");
  const { data: kargoMasrafiOptions } = useKategoriSecenekler("Kargo Masrafı Ödemesi");
  const { data: kargoSirketiOptions } = useKategoriSecenekler("Kargo Şirketi Anlaşması");
  const { data: birimOptions } = useKategoriSecenekler("Birim Türleri");

  // Fetch firma türleri, tipleri, ölçekleri for filtering
  const { data: firmaTurleri } = useQuery({
    queryKey: ["firma_turleri_filter"],
    queryFn: async () => {
      const { data } = await supabase.from("firma_turleri").select("*").order("name");
      return sortFirmaTurleri(data || []);
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
      return sortSecenekler(data || []);
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
    if (!ihaleId) return;
    
    if (type === "foto") {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setUploading(false); return; }

      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${ihaleId}/foto_${Date.now()}_${i}.${ext}`;
        const { error } = await supabase.storage.from("ihale-files").upload(path, file);
        if (error) {
          toast({ title: "Hata", description: `${file.name} yüklenemedi.`, variant: "destructive" });
          continue;
        }
        const { data: urlData } = supabase.storage.from("ihale-files").getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
      updateForm({ fotograflar: [...formData.fotograflar, ...newUrls], foto_url: formData.fotograflar[0] || newUrls[0] || null });
      setUploading(false);
    } else {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setUploading(false); return; }

      const newFiles: { url: string; adi: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${ihaleId}/ek_${Date.now()}_${i}.${ext}`;
        const { error } = await supabase.storage.from("ihale-files").upload(path, file);
        if (error) {
          toast({ title: "Hata", description: `${file.name} yüklenemedi.`, variant: "destructive" });
          continue;
        }
        const { data: urlData } = supabase.storage.from("ihale-files").getPublicUrl(path);
        newFiles.push({ url: urlData.publicUrl, adi: file.name });
      }
      updateForm({ ek_dosyalar: [...formData.ek_dosyalar, ...newFiles], ek_dosya_url: formData.ek_dosyalar[0]?.url || newFiles[0]?.url || null });
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const updated = formData.fotograflar.filter((_, i) => i !== index);
    updateForm({ fotograflar: updated, foto_url: updated[0] || null });
  };

  const removeEkDosya = (index: number) => {
    const updated = formData.ek_dosyalar.filter((_, i) => i !== index);
    updateForm({ ek_dosyalar: updated, ek_dosya_url: updated[0]?.url || null });
  };

  const showMinTeklifDegisim = formData.teklif_usulu === "acik_indirme" || formData.teklif_usulu === "acik_arttirma";

  // Convert odeme multi-select: store name values as string[]
  const odemeSecenekleriSelected = (odemeSecenekleriOptions || []).filter(o => formData.odeme_secenekleri.includes(o.name)).map(o => o.id);
  const odemeVadesiSelected = (odemeVadesiOptions || []).filter(o => formData.odeme_vadesi.includes(o.name)).map(o => o.id);

  const handleOdemeSecenekleriChange = (ids: string[]) => {
    const names = (odemeSecenekleriOptions || []).filter(o => ids.includes(o.id)).map(o => o.name);
    updateForm({ odeme_secenekleri: names });
  };

  const handleOdemeVadesiChange = (ids: string[]) => {
    const names = (odemeVadesiOptions || []).filter(o => ids.includes(o.id)).map(o => o.name);
    updateForm({ odeme_vadesi: names });
  };

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

        <div className={`grid grid-cols-1 ${skipBirim ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"} gap-4 items-end`}>
          <div className="space-y-2">
            <Label>İhale Başlangıç Fiyatı (Birim Fiyat) *</Label>
            <Input type="number" value={formData.baslangic_fiyati ?? ""} onChange={(e) => updateForm({ baslangic_fiyati: e.target.value ? Number(e.target.value) : null })} placeholder="0.00" min={0} />
          </div>
          {!skipBirim && (
            <div className="space-y-2">
              <Label>Birim *</Label>
              <SearchableSelect
                options={(birimOptions || []).map(o => ({ value: o.name, label: o.name }))}
                value={formData.birim}
                onValueChange={(v) => updateForm({ birim: v })}
                placeholder="Birim seçiniz"
                searchPlaceholder="Birim ara..."
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Para Birimi</Label>
            <SearchableSelect
              options={PARA_BIRIMLERI.map(p => ({ value: p, label: p }))}
              value={formData.para_birimi}
              onValueChange={(v) => updateForm({ para_birimi: v })}
              placeholder="Para birimi"
              searchPlaceholder="Ara..."
            />
          </div>
        </div>

        {showMinTeklifDegisim && (
          <div className="space-y-2">
            <Label>Minimum {formData.teklif_usulu === "acik_indirme" ? "İndirme" : "Arttırma"} Miktarı</Label>
            <Input type="number" value={formData.min_teklif_degisim ?? ""} onChange={(e) => updateForm({ min_teklif_degisim: e.target.value ? Number(e.target.value) : null })} placeholder="Opsiyonel" min={0} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>KDV Durumu *</Label>
            <SearchableSelect
              options={(kdvOptions || []).map(o => ({ value: o.name, label: o.name }))}
              value={formData.kdv_durumu}
              onValueChange={(v) => updateForm({ kdv_durumu: v })}
              placeholder="Seçiniz"
              searchPlaceholder="Ara..."
            />
          </div>
          <div className="space-y-2">
            <Label>Ödeme Seçenekleri *</Label>
            <MultiSelectDropdown
              options={(odemeSecenekleriOptions || []).map(o => ({ id: o.id, name: o.name }))}
              selected={odemeSecenekleriSelected}
              onChange={handleOdemeSecenekleriChange}
              placeholder="Seçiniz"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ödeme Vadesi *</Label>
            <MultiSelectDropdown
              options={(odemeVadesiOptions || []).map(o => ({ id: o.id, name: o.name }))}
              selected={odemeVadesiSelected}
              onChange={handleOdemeVadesiChange}
              placeholder="Seçiniz"
            />
          </div>
          <div className="space-y-2">
            <Label>Kargo Masrafı Ödemesi</Label>
            <SearchableSelect
              options={(kargoMasrafiOptions || []).map(o => ({ value: o.name, label: o.name }))}
              value={formData.kargo_masrafi}
              onValueChange={(v) => updateForm({ kargo_masrafi: v })}
              placeholder="Seçiniz"
              searchPlaceholder="Ara..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Kargo Şirketi Anlaşması</Label>
            <SearchableSelect
              options={(kargoSirketiOptions || []).map(o => ({ value: o.name, label: o.name }))}
              value={formData.kargo_sirketi_anlasmasi}
              onValueChange={(v) => updateForm({ kargo_sirketi_anlasmasi: v })}
              placeholder="Seçiniz"
              searchPlaceholder="Ara..."
            />
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
            <p className="text-xs text-muted-foreground">Min. 30 dakika sonrası</p>
          </div>
          <div className="space-y-2">
            <Label>İhale Bitiş Tarihi ve Saati *</Label>
            <Input type="datetime-local" value={formData.bitis_tarihi} onChange={(e) => updateForm({ bitis_tarihi: e.target.value })} />
            <p className="text-xs text-muted-foreground">Maks. 30 gün sonrası</p>
          </div>
        </div>

        {/* File Uploads */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fotoğraf Yükleme {formData.ihale_turu === "urun_satis" && "*"}</Label>
            <div className="border rounded-lg p-4 space-y-3">
              {formData.fotograflar.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {formData.fotograflar.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-full h-24 object-cover rounded border" />
                      <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePhoto(i)}>
                        <X className="w-3 h-3" />
                      </Button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">Kapak</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <label className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground border-2 border-dashed rounded-lg p-3">
                <Upload className="w-6 h-6" />
                <span className="text-sm">{formData.fotograflar.length > 0 ? "Daha fazla fotoğraf ekle" : "Fotoğraf yükle"}</span>
                <span className="text-xs">Birden fazla seçebilirsiniz</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, "foto")} disabled={uploading} />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ek Dosya Yükleme</Label>
            <div className="border rounded-lg p-4 space-y-3">
              {formData.ek_dosyalar.length > 0 && (
                <div className="space-y-2">
                  {formData.ek_dosyalar.map((dosya, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 bg-muted/50 rounded px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{dosya.adi}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeEkDosya(i)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <label className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground border-2 border-dashed rounded-lg p-3">
                <Upload className="w-6 h-6" />
                <span className="text-sm">{formData.ek_dosyalar.length > 0 ? "Daha fazla dosya ekle" : "Ek dosya yükle"}</span>
                <span className="text-xs">Birden fazla seçebilirsiniz</span>
                <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, "ek")} disabled={uploading} />
              </label>
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
                  <SearchableSelect
                    options={(options || []).map((o: any) => ({ value: o.id, label: o.name }))}
                    value=""
                    onValueChange={(v) => addFilter(tipi, v)}
                    disabled={tipi === "firma_tipi" && selectedFirmaTuruIds.length === 0}
                    placeholder={`${label} seçiniz`}
                    searchPlaceholder={`${label} ara...`}
                  />
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
                  <SearchableSelect
                    options={(sertifikaKategorileri || []).map((o: any) => ({ value: o.id, label: o.name }))}
                    value={selectedSertifikaKat || ""}
                    onValueChange={(v) => setSelectedSertifikaKat(v)}
                    placeholder="Sertifika Kategorisi"
                    searchPlaceholder="Kategori ara..."
                  />
                  <SearchableSelect
                    options={(sertifikaTurleri || []).map((o: any) => ({ value: o.id, label: o.name }))}
                    value=""
                    onValueChange={(v) => addFilter("sertifika", v)}
                    disabled={!selectedSertifikaKat}
                    placeholder="Sertifika Türü"
                    searchPlaceholder="Tür ara..."
                  />
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
                <SearchableSelect
                  options={(iller || []).map((o: any) => ({ value: o.id, label: o.name }))}
                  value=""
                  onValueChange={(v) => addFilter("il", v)}
                  placeholder="İl seçiniz"
                  searchPlaceholder="İl ara..."
                />
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
