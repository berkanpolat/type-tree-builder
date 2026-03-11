import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import type { IhaleFormData } from "@/pages/YeniIhale";
import HizmetTeknikFields from "./HizmetTeknikFields";
import MultiSelectDropdown from "@/components/firma-bilgileri/MultiSelectDropdown";
import SearchableSelect from "@/components/ui/searchable-select";
import { sortSecenekler } from "@/lib/sort-utils";

interface Props {
  formData: IhaleFormData;
  updateForm: (u: Partial<IhaleFormData>) => void;
}

const normalizeText = (value: string) =>
  value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

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

function useKategoriSecenekler(kategoriName: string | string[]) {
  return useQuery({
    queryKey: ["teknik_secenekler", ...(Array.isArray(kategoriName) ? kategoriName : [kategoriName])],
    queryFn: async () => {
      const names = Array.isArray(kategoriName) ? kategoriName : [kategoriName];
      const normalizedNames = names.map((name) => normalizeText(name));

      const { data: tumKategoriler } = await supabase
        .from("firma_bilgi_kategorileri")
        .select("id, name");

      if (!tumKategoriler?.length) return [];

      const seciliKategori = names
        .map((name) =>
          tumKategoriler.find((k) => normalizeText(k.name) === normalizeText(name))
        )
        .find(Boolean) || tumKategoriler.find((k) => normalizedNames.includes(normalizeText(k.name)));

      if (!seciliKategori) return [];

      const { data } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .eq("kategori_id", seciliKategori.id)
        .is("parent_id", null)
        .order("name");

      return sortSecenekler(data || []);
    },
  });
}

function useChildOptions(parentId: string | null) {
  return useQuery({
    queryKey: ["dependent_options", parentId],
    queryFn: async () => {
      if (!parentId) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("parent_id", parentId).order("name");
      return sortSecenekler(data || []);
    },
    enabled: !!parentId,
  });
}

function useMultiChildOptions(parentIds: string[], kategoriName?: string | string[]) {
  return useQuery({
    queryKey: ["multi_dependent_options", parentIds, ...(Array.isArray(kategoriName) ? kategoriName : kategoriName ? [kategoriName] : [])],
    queryFn: async () => {
      if (!parentIds.length) return [];

      let kategoriIds: string[] | null = null;
      if (kategoriName) {
        const names = Array.isArray(kategoriName) ? kategoriName : [kategoriName];
        const normalizedNames = names.map((name) => normalizeText(name));

        const { data: tumKategoriler } = await supabase
          .from("firma_bilgi_kategorileri")
          .select("id, name");

        kategoriIds = (tumKategoriler || [])
          .filter((k) => normalizedNames.includes(normalizeText(k.name)))
          .map((k) => k.id);

        if (!kategoriIds.length) return [];
      }

      let query = supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name, parent_id, kategori_id")
        .in("parent_id", parentIds);

      if (kategoriIds?.length) {
        query = query.in("kategori_id", kategoriIds);
      }

      const { data } = await query.order("name");
      return sortSecenekler(data || []);
    },
    enabled: parentIds.length > 0,
  });
}

// Multi-select dependent dropdown supporting multiple parents
function MultiDependentMultiParentField({ label, parentIds, value, onChange, disabled, kategoriName }: { label: string; parentIds: string[]; value: string[]; onChange: (v: string[]) => void; disabled?: boolean; kategoriName?: string | string[] }) {
  const { data: options } = useMultiChildOptions(parentIds, kategoriName);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <MultiSelectDropdown
        options={(options || []).map(o => ({ id: o.id, name: o.name }))}
        selected={value || []}
        onChange={onChange}
        disabled={disabled || !parentIds.length}
        placeholder={parentIds.length ? `${label} seçiniz` : "Önce üst seçimi yapınız"}
      />
    </div>
  );
}

// Multi-select dropdown field that fetches from DB category
function MultiDropdownField({ label, kategoriName, value, onChange }: { label: string; kategoriName: string | string[]; value: string[]; onChange: (v: string[]) => void }) {
  const { data: options } = useKategoriSecenekler(kategoriName);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <MultiSelectDropdown
        options={(options || []).map(o => ({ id: o.id, name: o.name }))}
        selected={value || []}
        onChange={onChange}
        placeholder={`${label} seçiniz`}
      />
    </div>
  );
}

// Multi-select dependent dropdown (children of a parent)
function MultiDependentDropdownField({ label, parentId, value, onChange, disabled }: { label: string; parentId: string | null; value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  const { data: options } = useChildOptions(parentId);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <MultiSelectDropdown
        options={(options || []).map(o => ({ id: o.id, name: o.name }))}
        selected={value || []}
        onChange={onChange}
        disabled={disabled || !parentId}
        placeholder={parentId ? `${label} seçiniz` : "Önce üst seçimi yapınız"}
      />
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

function SearchableDropdownField({ label, kategoriName, value, onChange }: { label: string; kategoriName: string | string[]; value: string; onChange: (v: string) => void }) {
  const { data: options } = useKategoriSecenekler(kategoriName);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <SearchableSelect
        options={(options || []).map(o => ({ value: o.id, label: o.name }))}
        value={value || ""}
        onValueChange={onChange}
        placeholder={`${label} seçiniz`}
        searchPlaceholder="Ara..."
      />
    </div>
  );
}

export default function TeknikDetaylarStep({ formData, updateForm }: Props) {
  const isHizmet = formData.ihale_turu === "hizmet_alim";
  const categoryId = isHizmet ? formData.hizmet_kategori_id : formData.urun_kategori_id;
  const groupId = isHizmet ? formData.hizmet_tur_id : formData.urun_grup_id;

  const { data: kategoriName } = useCategoryName(categoryId);
  const { data: grupName } = useCategoryName(groupId);
  const { data: turName } = useCategoryName(formData.urun_tur_id);

  const td = formData.teknik_detaylar;
  const setTD = (key: string, value: any) => {
    updateForm({ teknik_detaylar: { ...formData.teknik_detaylar, [key]: value } });
  };


  // Helper: ensure value is always string[] for multi-select fields
  const toArr = (v: any): string[] => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string" && v) return [v];
    return [];
  };

  const renderUrunFields = () => {
    const catNorm = normalizeText(kategoriName || "");
    const taxonomy = [kategoriName, grupName, turName].filter(Boolean).join(" ");
    const cat = normalizeText(taxonomy);

    if (catNorm.includes("hazir giyim")) {
      return (
        <>
          <TextField label="Kumaş Kompozisyonu" value={td.kumas_kompozisyonu} onChange={(v) => setTD("kumas_kompozisyonu", v)} />
          <MultiDropdownField label="Kumaş Grubu" kategoriName="Kumaş Grubu" value={toArr(td.kumas_grubu)} onChange={(v) => updateForm({ teknik_detaylar: { ...formData.teknik_detaylar, kumas_grubu: v, kumas_turu: [] } })} />
          <MultiDependentMultiParentField label="Kumaş Türü" parentIds={toArr(td.kumas_grubu)} value={toArr(td.kumas_turu)} onChange={(v) => setTD("kumas_turu", v)} disabled={!toArr(td.kumas_grubu).length} />
          <MultiDropdownField label="Sezon" kategoriName="Sezon" value={toArr(td.sezon)} onChange={(v) => setTD("sezon", v)} />
          <MultiDropdownField label="Cinsiyet" kategoriName="Cinsiyet" value={toArr(td.cinsiyet)} onChange={(v) => setTD("cinsiyet", v)} />
          <MultiDropdownField label="Yaş Grubu" kategoriName="Yaş Grubu" value={toArr(td.yas_grubu)} onChange={(v) => setTD("yas_grubu", v)} />
          <MultiDropdownField label="Desen" kategoriName="Desen" value={toArr(td.desen)} onChange={(v) => setTD("desen", v)} />
          <MultiDropdownField label="Kalıp" kategoriName="Kalıp" value={toArr(td.kalip)} onChange={(v) => setTD("kalip", v)} />
        </>
      );
    }

    if (catNorm.includes("aksesuar")) {
      return (
        <>
          <MultiDropdownField label="Aksesuar Kullanım Alanı" kategoriName="Aksesuar Kullanım Alanı" value={toArr(td.aksesuar_kullanim_alani)} onChange={(v) => setTD("aksesuar_kullanim_alani", v)} />
          <MultiDropdownField label="Malzeme Türü" kategoriName="Malzeme Türü" value={toArr(td.malzeme_turu)} onChange={(v) => setTD("malzeme_turu", v)} />
          <MultiDropdownField label="Kaplama" kategoriName="Kaplama" value={toArr(td.kaplama)} onChange={(v) => setTD("kaplama", v)} />
          <TextField label="Ebat Ölçü (cm)" value={td.ebat_olcu} onChange={(v) => setTD("ebat_olcu", v)} />
        </>
      );
    }

    if (catNorm.includes("ambalaj")) {
      return (
        <>
          <MultiDropdownField label="Ambalaj Kullanım Alanı" kategoriName="Ambalaj Kullanım Alanı" value={toArr(td.ambalaj_kullanim_alani)} onChange={(v) => setTD("ambalaj_kullanim_alani", v)} />
          <MultiDropdownField label="Malzeme Türü" kategoriName="Malzeme Türü" value={toArr(td.malzeme_turu)} onChange={(v) => setTD("malzeme_turu", v)} />
          <MultiDropdownField label="Baskı" kategoriName="Baskı" value={toArr(td.baski)} onChange={(v) => setTD("baski", v)} />
          <TextField label="Ebat Ölçü (cm)" value={td.ebat_olcu} onChange={(v) => setTD("ebat_olcu", v)} />
          <TextField label="Gramaj (gram)" value={td.gramaj} onChange={(v) => setTD("gramaj", v)} />
          <TextField label="Kalınlık Bilgisi" value={td.kalinlik} onChange={(v) => setTD("kalinlik", v)} />
          <MultiDropdownField label="Kaplama" kategoriName="Kaplama" value={toArr(td.kaplama)} onChange={(v) => setTD("kaplama", v)} />
        </>
      );
    }

    if (catNorm.includes("iplik")) {
      return (
        <>
          <MultiDropdownField label="İplik Kullanım Alanı" kategoriName="İplik Kullanım Alanı" value={toArr(td.iplik_kullanim_alani)} onChange={(v) => setTD("iplik_kullanim_alani", v)} />
          <TextField label="İplik Kompozisyonu" value={td.iplik_kompozisyonu} onChange={(v) => setTD("iplik_kompozisyonu", v)} />
          <MultiDropdownField label="Büküm Tipi" kategoriName="Büküm Tipi" value={toArr(td.bukum_tipi)} onChange={(v) => setTD("bukum_tipi", v)} />
          <MultiDropdownField label="Mukavemet" kategoriName="Mukavemet" value={toArr(td.mukavemet)} onChange={(v) => setTD("mukavemet", v)} />
          <MultiDropdownField label="İplik Numara Bilgisi" kategoriName={["İplik Numara Bilgisi", "İplik Numarası"]} value={toArr(td.iplik_numarasi)} onChange={(v) => setTD("iplik_numarasi", v)} />
          <MultiDropdownField label="Paket Tipi" kategoriName="Paket Tipi" value={toArr(td.paket_tipi)} onChange={(v) => setTD("paket_tipi", v)} />
        </>
      );
    }

    if (catNorm.includes("boya") || catNorm.includes("kimyasal")) {
      return (
        <>
          <MultiDropdownField label="Kimyasal Kullanım Alanı" kategoriName="Kimyasal Kullanım Alanı" value={toArr(td.kimyasal_kullanim_alani)} onChange={(v) => setTD("kimyasal_kullanim_alani", v)} />
          <TextField label="Marka" value={td.marka} onChange={(v) => setTD("marka", v)} />
          <TextField label="Model" value={td.model} onChange={(v) => setTD("model", v)} />
          <MultiDropdownField label="Kimyasal Türü" kategoriName="Kimyasal Türü" value={toArr(td.kimyasal_turu)} onChange={(v) => setTD("kimyasal_turu", v)} />
          <MultiDropdownField label="Fiziksel Formu" kategoriName="Fiziksel Formu" value={toArr(td.fiziksel_formu)} onChange={(v) => setTD("fiziksel_formu", v)} />
          <MultiDropdownField label="Depolama Koşulu" kategoriName="Depolama Koşulu" value={toArr(td.depolama_kosulu)} onChange={(v) => setTD("depolama_kosulu", v)} />
          <TextField label="Yoğunluk / Viskozite" value={td.yogunluk} onChange={(v) => setTD("yogunluk", v)} />
          <TextField label="pH" value={td.ph} onChange={(v) => setTD("ph", v)} />
          <div className="space-y-2">
            <Label>Son Tüketim Tarihi (STT)</Label>
            <Input type="date" value={td.stt || ""} onChange={(e) => setTD("stt", e.target.value)} />
          </div>
        </>
      );
    }

    if (catNorm.includes("kumas")) {
      return (
        <>
          <TextField label="Kumaş Kompozisyonu" value={td.kumas_kompozisyonu} onChange={(v) => setTD("kumas_kompozisyonu", v)} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="En (cm)" value={td.en} onChange={(v) => setTD("en", v)} />
            <TextField label="Boy (cm)" value={td.boy} onChange={(v) => setTD("boy", v)} />
          </div>
          <TextField label="Gramaj (gram)" value={td.gramaj} onChange={(v) => setTD("gramaj", v)} />
          <MultiDropdownField label="Desen" kategoriName="Desen" value={toArr(td.desen)} onChange={(v) => setTD("desen", v)} />
          <TextField label="Esneklik Oranı" value={td.esneklik_orani} onChange={(v) => setTD("esneklik_orani", v)} />
          <MultiDropdownField label="İplik Numarası" kategoriName="İplik Numarası" value={toArr(td.iplik_numarasi)} onChange={(v) => setTD("iplik_numarasi", v)} />
        </>
      );
    }

    if (catNorm.includes("makine") || catNorm.includes("yedek parca")) {
      const years = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i).toString());
      return (
        <>
          <MultiDropdownField label="Makine Kullanım Alanı" kategoriName="Makine Kullanım Alanı" value={toArr(td.makine_kullanim_alani)} onChange={(v) => setTD("makine_kullanim_alani", v)} />
          <MultiDropdownField label="Kullanım Durumu" kategoriName="Kullanım Durumu" value={toArr(td.kullanim_durumu)} onChange={(v) => setTD("kullanim_durumu", v)} />
          <TextField label="Marka" value={td.marka} onChange={(v) => setTD("marka", v)} />
          <TextField label="Model" value={td.model} onChange={(v) => setTD("model", v)} />
          <div className="space-y-2">
            <Label>Üretim Yılı</Label>
            <SearchableSelect
              options={years.map(y => ({ value: y, label: y }))}
              value={td.uretim_yili || ""}
              onValueChange={(v) => setTD("uretim_yili", v)}
              placeholder="Yıl seçiniz"
              searchPlaceholder="Yıl ara..."
            />
          </div>
          <MultiDropdownField label="Motor Tipi" kategoriName="Motor Tipi" value={toArr(td.motor_tipi)} onChange={(v) => setTD("motor_tipi", v)} />
          <MultiDropdownField label="Motor Gücü" kategoriName="Motor Gücü" value={toArr(td.motor_gucu)} onChange={(v) => setTD("motor_gucu", v)} />
        </>
      );
    }

    return <p className="text-muted-foreground">Bu kategori için teknik detay alanı bulunmamaktadır.</p>;
  };

  const renderHizmetFields = () => {
    return <HizmetTeknikFields td={td} setTD={setTD} kategoriName={kategoriName || ""} />;
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
        {turName && <span> / {turName}</span>}
      </p>

      <div className="space-y-4 max-w-2xl">
        {isHizmet ? renderHizmetFields() : renderUrunFields()}
      </div>
    </div>
  );
}
