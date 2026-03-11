import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Layers } from "lucide-react";
import type { IhaleFormData } from "@/pages/YeniIhale";
import SearchableSelect from "@/components/ui/searchable-select";
import { sortSecenekler } from "@/lib/sort-utils";

interface Props {
  formData: IhaleFormData;
  updateForm: (u: Partial<IhaleFormData>) => void;
}

export default function KategoriStep({ formData, updateForm }: Props) {
  const isHizmet = formData.ihale_turu === "hizmet_alim";

  const { data: kategoriler } = useQuery({
    queryKey: ["ihale_kategoriler", isHizmet ? "hizmet" : "urun"],
    queryFn: async () => {
      const categoryName = isHizmet ? "Ana Hizmet Kategorileri" : "Ana Ürün Kategorileri";
      const { data } = await supabase.from("firma_bilgi_kategorileri").select("*").eq("name", categoryName).single();
      if (!data) return [];
      const { data: secenekler } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("kategori_id", data.id).is("parent_id", null).order("name");
      return sortSecenekler(secenekler || []);
    },
  });

  const selectedKategoriId = isHizmet ? formData.hizmet_kategori_id : formData.urun_kategori_id;

  const { data: gruplar } = useQuery({
    queryKey: ["ihale_gruplar", selectedKategoriId],
    queryFn: async () => {
      if (!selectedKategoriId) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("parent_id", selectedKategoriId).order("name");
      return sortSecenekler(data || []);
    },
    enabled: !!selectedKategoriId,
  });

  const { data: turler } = useQuery({
    queryKey: ["ihale_turler", formData.urun_grup_id],
    queryFn: async () => {
      if (!formData.urun_grup_id) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("parent_id", formData.urun_grup_id).order("name");
      return sortSecenekler(data || []);
    },
    enabled: !!formData.urun_grup_id && !isHizmet,
  });

  if (isHizmet) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Hizmet Kategorisi</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">İhaleniz için hizmet kategorisi ve türünü seçin</p>

        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Hizmet Kategorisi</Label>
            <SearchableSelect
              options={(kategoriler || []).map(k => ({ value: k.id, label: k.name }))}
              value={formData.hizmet_kategori_id}
              onValueChange={(v) => updateForm({ hizmet_kategori_id: v, hizmet_tur_id: "" })}
              placeholder="Kategori seçiniz"
              searchPlaceholder="Kategori ara..."
            />
          </div>

          <div className="space-y-2">
            <Label>Hizmet Türü</Label>
            <SearchableSelect
              options={(gruplar || []).map(g => ({ value: g.id, label: g.name }))}
              value={formData.hizmet_tur_id}
              onValueChange={(v) => updateForm({ hizmet_tur_id: v })}
              disabled={!formData.hizmet_kategori_id}
              placeholder="Tür seçiniz"
              searchPlaceholder="Tür ara..."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Ürün Kategorisi</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">İhaleniz için ürün kategorisi, grubu ve türünü seçin</p>

      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label>Ana Ürün Kategorisi</Label>
          <SearchableSelect
            options={(kategoriler || []).map(k => ({ value: k.id, label: k.name }))}
            value={formData.urun_kategori_id}
            onValueChange={(v) => updateForm({ urun_kategori_id: v, urun_grup_id: "", urun_tur_id: "" })}
            placeholder="Kategori seçiniz"
            searchPlaceholder="Kategori ara..."
          />
        </div>

        <div className="space-y-2">
          <Label>Ürün Grubu</Label>
          <SearchableSelect
            options={(gruplar || []).map(g => ({ value: g.id, label: g.name }))}
            value={formData.urun_grup_id}
            onValueChange={(v) => updateForm({ urun_grup_id: v, urun_tur_id: "" })}
            disabled={!formData.urun_kategori_id}
            placeholder="Grup seçiniz"
            searchPlaceholder="Grup ara..."
          />
        </div>

        <div className="space-y-2">
          <Label>Ürün Türü</Label>
          <SearchableSelect
            options={(turler || []).map(t => ({ value: t.id, label: t.name }))}
            value={formData.urun_tur_id}
            onValueChange={(v) => updateForm({ urun_tur_id: v })}
            disabled={!formData.urun_grup_id}
            placeholder="Tür seçiniz"
            searchPlaceholder="Tür ara..."
          />
        </div>
      </div>
    </div>
  );
}
