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

const KATEGORI_SIRASI = [
  "Ana Hizmet Kategorileri",
  "KDV Durumu",
  "Ödeme Seçenekleri",
  "Ödeme Vadeleri",
  "Kargo Masrafı Ödemesi",
  "Kargo Şirketi Anlaşması",
  "Birim Türleri",
  "İl",
];

const ALT_LABEL_MAP: Record<string, string> = {
  "İl": "İlçe",
};

const HizmetBilgileri = () => {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [subSelections, setSubSelections] = useState<Record<string, string>>({});

  const { data: kategoriler } = useQuery({
    queryKey: ["hizmet_kategorileri"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firma_bilgi_kategorileri")
        .select("*")
        .in("name", KATEGORI_SIRASI);
      if (error) throw error;
      return data;
    },
  });

  const { data: allSecenekler } = useQuery({
    queryKey: ["hizmet_secenekleri", kategoriler?.map((k) => k.id)],
    queryFn: async () => {
      const ids = kategoriler!.map((k) => k.id);
      const { data, error } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("*")
        .in("kategori_id", ids)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!kategoriler?.length,
  });

  const sortedKategoriler = kategoriler
    ? [...kategoriler].sort(
        (a, b) => KATEGORI_SIRASI.indexOf(a.name) - KATEGORI_SIRASI.indexOf(b.name)
      )
    : [];

  const getSecenekler = (kategoriId: string) =>
    allSecenekler?.filter((s) => s.kategori_id === kategoriId && s.parent_id === null) || [];

  const getAltSecenekler = (parentId: string) =>
    allSecenekler?.filter((s) => s.parent_id === parentId) || [];

  const handleSelect = (kategoriId: string, value: string) => {
    setSelections((prev) => ({ ...prev, [kategoriId]: value }));
    setSubSelections((prev) => {
      const next = { ...prev };
      delete next[kategoriId];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-center text-foreground">Hizmet Bilgileri</h1>

        {sortedKategoriler.map((kat) => {
          const secenekler = getSecenekler(kat.id);
          const selectedId = selections[kat.id];
          const altSecenekler = selectedId ? getAltSecenekler(selectedId) : [];

          return (
            <div key={kat.id} className="space-y-2">
              <Label>{kat.name}</Label>
              <Select
                value={selectedId || ""}
                onValueChange={(v) => handleSelect(kat.id, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`${kat.name} seçiniz`} />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {secenekler.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {altSecenekler.length > 0 && (
                <div className="ml-4 space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    {ALT_LABEL_MAP[kat.name] || `${secenekler.find((s) => s.id === selectedId)?.name} Türleri`}
                  </Label>
                  <Select
                    value={subSelections[kat.id] || ""}
                    onValueChange={(v) => setSubSelections((prev) => ({ ...prev, [kat.id]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Alt seçenek seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {altSecenekler.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HizmetBilgileri;
