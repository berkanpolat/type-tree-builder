import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";
import type { IhaleFormData } from "@/pages/YeniIhale";

interface Props {
  formData: IhaleFormData;
  updateForm: (u: Partial<IhaleFormData>) => void;
}

function useCategoryName(id: string) {
  return useQuery({
    queryKey: ["secenek_name", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("name").eq("id", id).single();
      return data?.name || null;
    },
    enabled: !!id,
  });
}

function useKategoriSecenekler(kategoriName: string) {
  return useQuery({
    queryKey: ["teknik_secenekler", kategoriName],
    queryFn: async () => {
      const { data: kat } = await supabase.from("firma_bilgi_kategorileri").select("id").eq("name", kategoriName).single();
      if (!kat) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("kategori_id", kat.id).is("parent_id", null).order("name");
      return data || [];
    },
  });
}

function DropdownField({ label, kategoriName, value, onChange }: { label: string; kategoriName: string; value: string; onChange: (v: string) => void }) {
  const { data: options } = useKategoriSecenekler(kategoriName);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`${label} seçiniz`} /></SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {(options || []).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || label} />
    </div>
  );
}

// Kategori seçimi component for hizmet teknik detaylarında ürün kategori/grup/tür seçimi
function UrunKategoriSecimi({ label, td, setTD, prefixKey }: { label: string; td: Record<string, any>; setTD: (k: string, v: any) => void; prefixKey: string }) {
  const { data: kategoriler } = useQuery({
    queryKey: ["teknik_urun_kategoriler"],
    queryFn: async () => {
      const { data: kat } = await supabase.from("firma_bilgi_kategorileri").select("id").eq("name", "Ana Ürün Kategorileri").single();
      if (!kat) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("kategori_id", kat.id).is("parent_id", null).order("name");
      return data || [];
    },
  });

  const selectedKat = td[`${prefixKey}_kategori`];
  const { data: gruplar } = useQuery({
    queryKey: ["teknik_urun_gruplar", selectedKat],
    queryFn: async () => {
      if (!selectedKat) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("parent_id", selectedKat).order("name");
      return data || [];
    },
    enabled: !!selectedKat,
  });

  const selectedGrup = td[`${prefixKey}_grup`];
  const { data: turler } = useQuery({
    queryKey: ["teknik_urun_turler", selectedGrup],
    queryFn: async () => {
      if (!selectedGrup) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("parent_id", selectedGrup).order("name");
      return data || [];
    },
    enabled: !!selectedGrup,
  });

  return (
    <div className="space-y-3 border rounded-lg p-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="space-y-2">
        <Label className="text-xs">Ana Kategori</Label>
        <Select value={selectedKat || ""} onValueChange={(v) => { setTD(`${prefixKey}_kategori`, v); setTD(`${prefixKey}_grup`, ""); setTD(`${prefixKey}_tur`, ""); }}>
          <SelectTrigger><SelectValue placeholder="Kategori seçiniz" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {(kategoriler || []).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Grup</Label>
        <Select value={selectedGrup || ""} onValueChange={(v) => { setTD(`${prefixKey}_grup`, v); setTD(`${prefixKey}_tur`, ""); }} disabled={!selectedKat}>
          <SelectTrigger><SelectValue placeholder="Grup seçiniz" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {(gruplar || []).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Tür</Label>
        <Select value={td[`${prefixKey}_tur`] || ""} onValueChange={(v) => setTD(`${prefixKey}_tur`, v)} disabled={!selectedGrup}>
          <SelectTrigger><SelectValue placeholder="Tür seçiniz" /></SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {(turler || []).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function TeknikDetaylarStep({ formData, updateForm }: Props) {
  const { data: kategoriName } = useCategoryName(formData.urun_kategori_id || formData.hizmet_kategori_id);
  const { data: grupName } = useCategoryName(formData.urun_grup_id || formData.hizmet_tur_id);

  const td = formData.teknik_detaylar;
  const setTD = (key: string, value: any) => {
    updateForm({ teknik_detaylar: { ...formData.teknik_detaylar, [key]: value } });
  };

  const isHizmet = formData.ihale_turu === "hizmet_alim";

  const renderUrunFields = () => {
    const cat = kategoriName?.toLowerCase() || "";

    if (cat.includes("hazır giyim")) {
      return (
        <>
          <TextField label="Kumaş Kompozisyonu" value={td.kumas_kompozisyonu} onChange={(v) => setTD("kumas_kompozisyonu", v)} />
          <DropdownField label="Kumaş Grubu" kategoriName="Kumaş Grubu" value={td.kumas_grubu} onChange={(v) => setTD("kumas_grubu", v)} />
          <DropdownField label="Kumaş Türü" kategoriName="Kumaş Türü" value={td.kumas_turu} onChange={(v) => setTD("kumas_turu", v)} />
          <DropdownField label="Sezon" kategoriName="Sezon" value={td.sezon} onChange={(v) => setTD("sezon", v)} />
          <DropdownField label="Cinsiyet" kategoriName="Cinsiyet" value={td.cinsiyet} onChange={(v) => setTD("cinsiyet", v)} />
          <DropdownField label="Yaş Grubu" kategoriName="Yaş Grubu" value={td.yas_grubu} onChange={(v) => setTD("yas_grubu", v)} />
          <DropdownField label="Desen" kategoriName="Desen" value={td.desen} onChange={(v) => setTD("desen", v)} />
          <DropdownField label="Kalıp" kategoriName="Kalıp" value={td.kalip} onChange={(v) => setTD("kalip", v)} />
        </>
      );
    }

    if (cat.includes("aksesuar")) {
      return (
        <>
          <DropdownField label="Aksesuar Kullanım Alanı" kategoriName="Aksesuar Kullanım Alanı" value={td.aksesuar_kullanim_alani} onChange={(v) => setTD("aksesuar_kullanim_alani", v)} />
          <DropdownField label="Malzeme Türü" kategoriName="Malzeme Türü" value={td.malzeme_turu} onChange={(v) => setTD("malzeme_turu", v)} />
          <DropdownField label="Kaplama" kategoriName="Kaplama" value={td.kaplama} onChange={(v) => setTD("kaplama", v)} />
          <TextField label="Ebat Ölçü (cm)" value={td.ebat_olcu} onChange={(v) => setTD("ebat_olcu", v)} />
        </>
      );
    }

    if (cat.includes("ambalaj")) {
      return (
        <>
          <DropdownField label="Ambalaj Kullanım Alanı" kategoriName="Ambalaj Kullanım Alanı" value={td.ambalaj_kullanim_alani} onChange={(v) => setTD("ambalaj_kullanim_alani", v)} />
          <DropdownField label="Malzeme Türü" kategoriName="Malzeme Türü" value={td.malzeme_turu} onChange={(v) => setTD("malzeme_turu", v)} />
          <DropdownField label="Baskı" kategoriName="Baskı" value={td.baski} onChange={(v) => setTD("baski", v)} />
          <TextField label="Ebat Ölçü (cm)" value={td.ebat_olcu} onChange={(v) => setTD("ebat_olcu", v)} />
          <TextField label="Gramaj (gram)" value={td.gramaj} onChange={(v) => setTD("gramaj", v)} />
          <TextField label="Kalınlık Bilgisi" value={td.kalinlik} onChange={(v) => setTD("kalinlik", v)} />
          <DropdownField label="Kaplama" kategoriName="Kaplama" value={td.kaplama} onChange={(v) => setTD("kaplama", v)} />
        </>
      );
    }

    if (cat.includes("iplik")) {
      return (
        <>
          <TextField label="İplik Kompozisyonu" value={td.iplik_kompozisyonu} onChange={(v) => setTD("iplik_kompozisyonu", v)} />
          <DropdownField label="İplik Kullanım Alanı" kategoriName="İplik Kullanım Alanı" value={td.iplik_kullanim_alani} onChange={(v) => setTD("iplik_kullanim_alani", v)} />
          <DropdownField label="Büküm Tipi" kategoriName="Büküm Tipi" value={td.bukum_tipi} onChange={(v) => setTD("bukum_tipi", v)} />
          <DropdownField label="Mukavemet" kategoriName="Mukavemet" value={td.mukavemet} onChange={(v) => setTD("mukavemet", v)} />
          <DropdownField label="Paket Tipi" kategoriName="Paket Tipi" value={td.paket_tipi} onChange={(v) => setTD("paket_tipi", v)} />
          <DropdownField label="İplik Numarası" kategoriName="İplik Numarası" value={td.iplik_numarasi} onChange={(v) => setTD("iplik_numarasi", v)} />
        </>
      );
    }

    if (cat.includes("boya") || cat.includes("kimyasal")) {
      return (
        <>
          <DropdownField label="Kimyasal Kullanım Alanı" kategoriName="Kimyasal Kullanım Alanı" value={td.kimyasal_kullanim_alani} onChange={(v) => setTD("kimyasal_kullanim_alani", v)} />
          <TextField label="Marka" value={td.marka} onChange={(v) => setTD("marka", v)} />
          <TextField label="Model" value={td.model} onChange={(v) => setTD("model", v)} />
          <DropdownField label="Kimyasal Türü" kategoriName="Kimyasal Türü" value={td.kimyasal_turu} onChange={(v) => setTD("kimyasal_turu", v)} />
          <DropdownField label="Fiziksel Formu" kategoriName="Fiziksel Formu" value={td.fiziksel_formu} onChange={(v) => setTD("fiziksel_formu", v)} />
          <DropdownField label="Depolama Koşulu" kategoriName="Depolama Koşulu" value={td.depolama_kosulu} onChange={(v) => setTD("depolama_kosulu", v)} />
          <TextField label="Yoğunluk / Viskozite" value={td.yogunluk} onChange={(v) => setTD("yogunluk", v)} />
          <TextField label="pH" value={td.ph} onChange={(v) => setTD("ph", v)} />
          <div className="space-y-2">
            <Label>Son Tüketim Tarihi (STT)</Label>
            <Input type="date" value={td.stt || ""} onChange={(e) => setTD("stt", e.target.value)} />
          </div>
        </>
      );
    }

    if (cat.includes("kumaş")) {
      return (
        <>
          <TextField label="Kumaş Kompozisyonu" value={td.kumas_kompozisyonu} onChange={(v) => setTD("kumas_kompozisyonu", v)} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="En (cm)" value={td.en} onChange={(v) => setTD("en", v)} />
            <TextField label="Boy (cm)" value={td.boy} onChange={(v) => setTD("boy", v)} />
          </div>
          <TextField label="Gramaj (gram)" value={td.gramaj} onChange={(v) => setTD("gramaj", v)} />
          <DropdownField label="Desen" kategoriName="Desen" value={td.desen} onChange={(v) => setTD("desen", v)} />
          <TextField label="Esneklik Oranı" value={td.esneklik_orani} onChange={(v) => setTD("esneklik_orani", v)} />
          <DropdownField label="İplik Numarası" kategoriName="İplik Numarası" value={td.iplik_numarasi} onChange={(v) => setTD("iplik_numarasi", v)} />
        </>
      );
    }

    if (cat.includes("makine") || cat.includes("yedek parça")) {
      const years = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i).toString());
      return (
        <>
          <DropdownField label="Makine Kullanım Alanı" kategoriName="Makine Kullanım Alanı" value={td.makine_kullanim_alani} onChange={(v) => setTD("makine_kullanim_alani", v)} />
          <DropdownField label="Kullanım Durumu" kategoriName="Kullanım Durumu" value={td.kullanim_durumu} onChange={(v) => setTD("kullanim_durumu", v)} />
          <TextField label="Marka" value={td.marka} onChange={(v) => setTD("marka", v)} />
          <TextField label="Model" value={td.model} onChange={(v) => setTD("model", v)} />
          <div className="space-y-2">
            <Label>Üretim Yılı</Label>
            <Select value={td.uretim_yili || ""} onValueChange={(v) => setTD("uretim_yili", v)}>
              <SelectTrigger><SelectValue placeholder="Yıl seçiniz" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DropdownField label="Motor Tipi" kategoriName="Motor Tipi" value={td.motor_tipi} onChange={(v) => setTD("motor_tipi", v)} />
          <DropdownField label="Motor Gücü" kategoriName="Motor Gücü" value={td.motor_gucu} onChange={(v) => setTD("motor_gucu", v)} />
        </>
      );
    }

    return <p className="text-muted-foreground">Bu kategori için teknik detay alanı bulunmamaktadır.</p>;
  };

  const renderHizmetFields = () => {
    const hizmetName = grupName?.toLowerCase() || "";

    if (hizmetName.includes("ürün hizmeti") || hizmetName.includes("üretim hizmeti")) {
      return (
        <>
          <UrunKategoriSecimi label="Ürün Kategorisi / Grubu / Türü" td={td} setTD={setTD} prefixKey="hizmet_urun" />
          <DropdownField label="Kumaş Grubu" kategoriName="Kumaş Grubu" value={td.kumas_grubu} onChange={(v) => setTD("kumas_grubu", v)} />
          <DropdownField label="Kumaş Türü" kategoriName="Kumaş Türü" value={td.kumas_turu} onChange={(v) => setTD("kumas_turu", v)} />
          <TextField label="Kumaş Kompozisyonu" value={td.kumas_kompozisyonu} onChange={(v) => setTD("kumas_kompozisyonu", v)} />
          <DropdownField label="Desen" kategoriName="Desen" value={td.desen} onChange={(v) => setTD("desen", v)} />
          <DropdownField label="Baskı" kategoriName="Baskı" value={td.baski} onChange={(v) => setTD("baski", v)} />
        </>
      );
    }

    if (hizmetName.includes("teknik") || hizmetName.includes("tasarım")) {
      return (
        <>
          <UrunKategoriSecimi label="Hedef Ürün Grubu" td={td} setTD={setTD} prefixKey="hedef_urun" />
          <DropdownField label="Tasarım Türü" kategoriName="Tasarım Türü" value={td.tasarim_turu} onChange={(v) => setTD("tasarim_turu", v)} />
          <DropdownField label="Dosya Teslim Formatı" kategoriName="Dosya Teslim Formatı" value={td.dosya_format} onChange={(v) => setTD("dosya_format", v)} />
          <DropdownField label="Revizyon Hakkı" kategoriName="Revizyon Hakkı" value={td.revizyon_hakki} onChange={(v) => setTD("revizyon_hakki", v)} />
          <DropdownField label="Kalıp" kategoriName="Kalıp" value={td.kalip} onChange={(v) => setTD("kalip", v)} />
        </>
      );
    }

    if (hizmetName.includes("mümessil") || hizmetName.includes("sipariş")) {
      return (
        <>
          <DropdownField label="Hedeflenen Pazar" kategoriName="Hedeflenen Pazarlar" value={td.hedeflenen_pazar} onChange={(v) => setTD("hedeflenen_pazar", v)} />
          <DropdownField label="Sipariş Türü" kategoriName="Sipariş Türü" value={td.siparis_turu} onChange={(v) => setTD("siparis_turu", v)} />
          <UrunKategoriSecimi label="Ürün Kategorisi / Grubu / Türü" td={td} setTD={setTD} prefixKey="mumessil_urun" />
          <DropdownField label="Ürün Segmenti" kategoriName="Ürün Segmenti" value={td.urun_segmenti} onChange={(v) => setTD("urun_segmenti", v)} />
        </>
      );
    }

    return <p className="text-muted-foreground">Bu hizmet kategorisi için teknik detay alanı bulunmamaktadır.</p>;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Settings className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          {isHizmet ? "Hizmet Teknik Detayları" : "Ürün Teknik Detayları"}
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {kategoriName && <span>Kategori: <strong>{kategoriName}</strong></span>}
        {grupName && <span> / {grupName}</span>}
      </p>

      <div className="space-y-4 max-w-2xl">
        {isHizmet ? renderHizmetFields() : renderUrunFields()}
      </div>
    </div>
  );
}
