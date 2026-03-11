import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sortFirmaTurleri } from "@/lib/sort-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Kategori {
  id: string;
  name: string;
}

interface Secenek {
  id: string;
  kategori_id: string;
  parent_id: string | null;
  name: string;
}

const Index = () => {
  const [selectedTurId, setSelectedTurId] = useState<string>("");
  const [selectedTipId, setSelectedTipId] = useState<string>("");
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [subSelections, setSubSelections] = useState<Record<string, string>>({});

  // Firma Türü / Tipi queries
  const { data: firmaTurleri, isLoading: turleriLoading } = useQuery({
    queryKey: ["firma_turleri"],
    queryFn: async () => {
      const { data, error } = await supabase.from("firma_turleri").select("*").order("name");
      if (error) throw error;
      return sortFirmaTurleri(data);
    },
  });

  const { data: firmaTipleri, isLoading: tipleriLoading } = useQuery({
    queryKey: ["firma_tipleri", selectedTurId],
    queryFn: async () => {
      const { data, error } = await supabase.from("firma_tipleri").select("*").eq("firma_turu_id", selectedTurId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTurId,
  });

  // Kategoriler
  const { data: kategoriler } = useQuery({
    queryKey: ["firma_bilgi_kategorileri"],
    queryFn: async () => {
      const { data, error } = await supabase.from("firma_bilgi_kategorileri").select("*").order("name");
      if (error) throw error;
      return data as Kategori[];
    },
  });

  // Tüm seçenekler
  const { data: allSecenekler } = useQuery({
    queryKey: ["firma_bilgi_secenekleri"],
    queryFn: async () => {
      const { data, error } = await supabase.from("firma_bilgi_secenekleri").select("*").order("name");
      if (error) throw error;
      return data as Secenek[];
    },
  });

  const handleTurChange = (value: string) => {
    setSelectedTurId(value);
    setSelectedTipId("");
  };

  const handleKategoriSelect = (kategoriId: string, value: string) => {
    setSelections((prev) => ({ ...prev, [kategoriId]: value }));
    // Alt seçenek sıfırla
    setSubSelections((prev) => {
      const next = { ...prev };
      delete next[kategoriId];
      return next;
    });
  };

  const getSecenekler = (kategoriId: string) =>
    allSecenekler?.filter((s) => s.kategori_id === kategoriId && s.parent_id === null) || [];

  const getAltSecenekler = (parentId: string) =>
    allSecenekler?.filter((s) => s.parent_id === parentId) || [];

  const hasAltSecenekler = (secenekId: string) =>
    allSecenekler?.some((s) => s.parent_id === secenekId) || false;

  // Sıralama: CSV'deki orijinal sıraya göre
  const kategoriSirasi = [
    "Firma Ölçeği",
    "Faaliyet Alanı",
    "Üretim Modeli",
    "Ürün Segmenti",
    "Üretim Yetkinlikleri",
    "Hizmet Tipi",
    "Uzman Olunan Ürün Grupları",
    "Temsil Tipi",
    "Bağımsız Denetimci Firmalar Tarafından Final Organizasyonu Yapılabilir",
    "Hızlı Numune Üretimi",
    "Üretim Vardiyası",
    "Tedarik Hizmet Tipi",
    "Tedarikçi Faaliyet Alanı",
    "Tesis Türü",
    "İş Gücü",
    "Makine Kategorisi",
    "Teknoloji ve Yazılım Kategorisi",
    "Sertifika Kategorisi",
    "Ana Hizmet Kategorileri",
    "KDV Durumu",
    "Ödeme Seçenekleri",
    "Ödeme Vadeleri",
    "Kargo Masrafı Ödemesi",
    "Kargo Şirketi Anlaşması",
    "Birim Türleri",
  ];

  const sortedKategoriler = kategoriler
    ? [...kategoriler].sort((a, b) => {
        const ai = kategoriSirasi.indexOf(a.name);
        const bi = kategoriSirasi.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
    : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-center text-foreground">Firma Seçimi</h1>

        {/* Firma Türü */}
        <div className="space-y-2">
          <Label>Firma Türü</Label>
          <Select value={selectedTurId} onValueChange={handleTurChange}>
            <SelectTrigger>
              <SelectValue placeholder={turleriLoading ? "Yükleniyor..." : "Firma türü seçiniz"} />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {firmaTurleri?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Firma Tipi */}
        <div className="space-y-2">
          <Label>Firma Tipi</Label>
          <Select value={selectedTipId} onValueChange={setSelectedTipId} disabled={!selectedTurId}>
            <SelectTrigger>
              <SelectValue placeholder={!selectedTurId ? "Önce firma türü seçiniz" : tipleriLoading ? "Yükleniyor..." : "Firma tipi seçiniz"} />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {firmaTipleri?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 18 Kategori Dropdown */}
        {sortedKategoriler.map((kat) => {
          const secenekler = getSecenekler(kat.id);
          const selectedId = selections[kat.id];
          const altSecenekler = selectedId ? getAltSecenekler(selectedId) : [];
          const showAlt = selectedId && hasAltSecenekler(selectedId);

          return (
            <div key={kat.id} className="space-y-2">
              <Label>{kat.name}</Label>
              <Select
                value={selectedId || ""}
                onValueChange={(v) => handleKategoriSelect(kat.id, v)}
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

              {/* Alt seçenek dropdown */}
              {showAlt && (
                <div className="ml-4 space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    {secenekler.find((s) => s.id === selectedId)?.name} Türleri
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

export default Index;
