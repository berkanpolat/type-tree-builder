import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";

const UrunKategorisi = () => {
  const [selectedKategori, setSelectedKategori] = useState("");
  const [selectedGrup, setSelectedGrup] = useState("");
  const [selectedTur, setSelectedTur] = useState("");

  // Level 1: Ana kategoriler (parent_id IS NULL)
  const { data: kategoriler } = useQuery({
    queryKey: ["urun_ana_kategoriler"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("*")
        .eq("kategori_id", KATEGORI_ID)
        .is("parent_id", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Level 2: Gruplar (parent_id = selectedKategori)
  const { data: gruplar } = useQuery({
    queryKey: ["urun_gruplar", selectedKategori],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("*")
        .eq("kategori_id", KATEGORI_ID)
        .eq("parent_id", selectedKategori)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedKategori,
  });

  // Level 3: Türler (parent_id = selectedGrup)
  const { data: turler } = useQuery({
    queryKey: ["urun_turler", selectedGrup],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("*")
        .eq("kategori_id", KATEGORI_ID)
        .eq("parent_id", selectedGrup)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedGrup,
  });

  const handleKategoriChange = (value: string) => {
    setSelectedKategori(value);
    setSelectedGrup("");
    setSelectedTur("");
  };

  const handleGrupChange = (value: string) => {
    setSelectedGrup(value);
    setSelectedTur("");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-center text-foreground">
          Ürün Kategorisi
        </h1>

        {/* Kategori */}
        <div className="space-y-2">
          <Label>Ürün Kategorisi</Label>
          <Select value={selectedKategori} onValueChange={handleKategoriChange}>
            <SelectTrigger>
              <SelectValue placeholder="Kategori seçiniz" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {kategoriler?.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grup */}
        <div className="space-y-2">
          <Label>Ürün Grubu</Label>
          <Select
            value={selectedGrup}
            onValueChange={handleGrupChange}
            disabled={!selectedKategori}
          >
            <SelectTrigger>
              <SelectValue placeholder="Grup seçiniz" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {gruplar?.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tür */}
        <div className="space-y-2">
          <Label>Ürün Türü</Label>
          <Select
            value={selectedTur}
            onValueChange={setSelectedTur}
            disabled={!selectedGrup}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tür seçiniz" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {turler?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default UrunKategorisi;
