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
  "Sezon",
  "Cinsiyet",
  "Yaş Grubu",
  "Renk",
  "Desen",
  "Beden",
  "Kalıp",
  "İplik Numarası",
  "İplik Kullanım Alanı",
  "Büküm Tipi",
  "Mukavemet",
  "Paket Tipi",
  "Makine Kullanım Alanı",
  "Motor Gücü",
  "Motor Tipi",
  "Kullanım Durumu",
  "Kimyasal Kullanım Alanı",
  "Kimyasal Türü",
  "Fiziksel Formu",
  "Depolama Koşulu",
  "Aksesuar Kullanım Alanı",
  "Malzeme Türü",
  "Kaplama",
  "Ambalaj Kullanım Alanı",
  "Baskı",
];

const UrunBilgileri = () => {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const { data: kategoriler } = useQuery({
    queryKey: ["urun_kategorileri"],
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
    queryKey: ["urun_secenekleri", kategoriler?.map((k) => k.id)],
    queryFn: async () => {
      const ids = kategoriler!.map((k) => k.id);
      const { data, error } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("*")
        .in("kategori_id", ids)
        .is("parent_id", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!kategoriler?.length,
  });

  const sortedKategoriler = kategoriler
    ? [...kategoriler].sort(
        (a, b) =>
          KATEGORI_SIRASI.indexOf(a.name) - KATEGORI_SIRASI.indexOf(b.name)
      )
    : [];

  const getSecenekler = (kategoriId: string) =>
    allSecenekler?.filter((s) => s.kategori_id === kategoriId) || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-center text-foreground">
          Ürün Bilgileri
        </h1>

        {sortedKategoriler.map((kat) => {
          const secenekler = getSecenekler(kat.id);

          return (
            <div key={kat.id} className="space-y-2">
              <Label>{kat.name}</Label>
              <Select
                value={selections[kat.id] || ""}
                onValueChange={(v) =>
                  setSelections((prev) => ({ ...prev, [kat.id]: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`${kat.name} seçiniz`} />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {secenekler.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UrunBilgileri;
