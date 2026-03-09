import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Layers } from "lucide-react";
import type { IhaleFormData } from "@/pages/YeniIhale";

interface Props {
  formData: IhaleFormData;
  updateForm: (u: Partial<IhaleFormData>) => void;
}

export default function KategoriStep({ formData, updateForm }: Props) {
  const isHizmet = formData.ihale_turu === "hizmet_alim";

  // Fetch categories
  const { data: kategoriler } = useQuery({
    queryKey: ["ihale_kategoriler", isHizmet ? "hizmet" : "urun"],
    queryFn: async () => {
      const categoryName = isHizmet ? "Ana Hizmet Kategorileri" : "Ana Ürün Kategorileri";
      const { data } = await supabase
        .from("firma_bilgi_kategorileri")
        .select("*")
        .eq("name", categoryName)
        .single();
      if (!data) return [];
      const { data: secenekler } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("*")
        .eq("kategori_id", data.id)
        .is("parent_id", null)
        .order("name");
      return secenekler || [];
    },
  });

  // Fetch groups (children of selected category)
  const selectedKategoriId = isHizmet ? formData.hizmet_kategori_id : formData.urun_kategori_id;
  
  const { data: gruplar } = useQuery({
    queryKey: ["ihale_gruplar", selectedKategoriId],
    queryFn: async () => {
      if (!selectedKategoriId) return [];
      const { data } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("*")
        .eq("parent_id", selectedKategoriId)
        .order("name");
      return data || [];
    },
    enabled: !!selectedKategoriId,
  });

  // Fetch types (children of selected group) - only for ürün
  const { data: turler } = useQuery({
    queryKey: ["ihale_turler", formData.urun_grup_id],
    queryFn: async () => {
      if (!formData.urun_grup_id) return [];
      const { data } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("*")
        .eq("parent_id", formData.urun_grup_id)
        .order("name");
      return data || [];
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
            <Select
              value={formData.hizmet_kategori_id}
              onValueChange={(v) => updateForm({ hizmet_kategori_id: v, hizmet_tur_id: "" })}
            >
              <SelectTrigger><SelectValue placeholder="Kategori seçiniz" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {kategoriler?.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hizmet Türü</Label>
            <Select
              value={formData.hizmet_tur_id}
              onValueChange={(v) => updateForm({ hizmet_tur_id: v })}
              disabled={!formData.hizmet_kategori_id}
            >
              <SelectTrigger><SelectValue placeholder="Tür seçiniz" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {gruplar?.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Select
            value={formData.urun_kategori_id}
            onValueChange={(v) => updateForm({ urun_kategori_id: v, urun_grup_id: "", urun_tur_id: "" })}
          >
            <SelectTrigger><SelectValue placeholder="Kategori seçiniz" /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {kategoriler?.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ürün Grubu</Label>
          <Select
            value={formData.urun_grup_id}
            onValueChange={(v) => updateForm({ urun_grup_id: v, urun_tur_id: "" })}
            disabled={!formData.urun_kategori_id}
          >
            <SelectTrigger><SelectValue placeholder="Grup seçiniz" /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {gruplar?.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ürün Türü</Label>
          <Select
            value={formData.urun_tur_id}
            onValueChange={(v) => updateForm({ urun_tur_id: v })}
            disabled={!formData.urun_grup_id}
          >
            <SelectTrigger><SelectValue placeholder="Tür seçiniz" /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {turler?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
