import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Trash2, X, Plus } from "lucide-react";
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
    queryKey: ["stok_secenekler", kategoriName],
    queryFn: async () => {
      const { data: kat } = await supabase.from("firma_bilgi_kategorileri").select("id").eq("name", kategoriName).single();
      if (!kat) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("kategori_id", kat.id).is("parent_id", null).order("name");
      return data || [];
    },
  });
}

export default function StokStep({ formData, updateForm }: Props) {
  const { data: kategoriName } = useCategoryName(formData.urun_kategori_id || formData.hizmet_kategori_id);
  const isHazirGiyim = kategoriName?.toLowerCase().includes("hazır giyim");

  const varyant1Label = isHazirGiyim ? "Beden" : "Birim";
  const varyant1KategoriName = isHazirGiyim ? "Beden" : "Birim Türleri";
  const varyant2Label = "Renk";

  const { data: varyant1Options } = useKategoriSecenekler(varyant1KategoriName);
  const { data: renkOptions } = useKategoriSecenekler("Renk");

  const [selectedV1, setSelectedV1] = useState<string[]>([]);
  const [selectedV2, setSelectedV2] = useState<string[]>([]);

  const getOptionName = (options: any[] | undefined, id: string) => options?.find((o) => o.id === id)?.name || id;

  const handleGenerate = () => {
    const newStoklar: IhaleFormData["stoklar"] = [];
    for (const v1 of selectedV1) {
      for (const v2 of selectedV2) {
        // Check if already exists
        if (!formData.stoklar.some((s) => s.varyant_1_value === getOptionName(varyant1Options, v1) && s.varyant_2_value === getOptionName(renkOptions, v2))) {
          newStoklar.push({
            varyant_1_label: varyant1Label,
            varyant_1_value: getOptionName(varyant1Options, v1),
            varyant_2_label: varyant2Label,
            varyant_2_value: getOptionName(renkOptions, v2),
            miktar_tipi: "Adet",
            stok_sayisi: 0,
          });
        }
      }
    }
    updateForm({ stoklar: [...formData.stoklar, ...newStoklar] });
  };

  const removeStok = (index: number) => {
    updateForm({ stoklar: formData.stoklar.filter((_, i) => i !== index) });
  };

  const updateStokSayisi = (index: number, value: number) => {
    const updated = [...formData.stoklar];
    updated[index] = { ...updated[index], stok_sayisi: value };
    updateForm({ stoklar: updated });
  };

  const toggleSelection = (list: string[], setList: (l: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((i) => i !== id) : [...list, id]);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Package className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Stok</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{kategoriName} Stok</p>

      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Varyant 1 selection */}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm mb-2 block">{varyant1Label}</Label>
            <div className="flex flex-wrap gap-1 border rounded-lg p-2 min-h-[40px]">
              {selectedV1.map((id) => (
                <Badge key={id} variant="secondary" className="gap-1">
                  {getOptionName(varyant1Options, id)}
                  <button onClick={() => toggleSelection(selectedV1, setSelectedV1, id)}><X className="w-3 h-3" /></button>
                </Badge>
              ))}
              <select
                className="border-0 bg-transparent text-sm outline-none flex-1 min-w-[100px]"
                value=""
                onChange={(e) => {
                  if (e.target.value) toggleSelection(selectedV1, setSelectedV1, e.target.value);
                }}
              >
                <option value="">Ekle...</option>
                {(varyant1Options || []).filter((o) => !selectedV1.includes(o.id)).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Varyant 2 (Renk) selection */}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm mb-2 block">{varyant2Label}</Label>
            <div className="flex flex-wrap gap-1 border rounded-lg p-2 min-h-[40px]">
              {selectedV2.map((id) => (
                <Badge key={id} variant="secondary" className="gap-1">
                  {getOptionName(renkOptions, id)}
                  <button onClick={() => toggleSelection(selectedV2, setSelectedV2, id)}><X className="w-3 h-3" /></button>
                </Badge>
              ))}
              <select
                className="border-0 bg-transparent text-sm outline-none flex-1 min-w-[100px]"
                value=""
                onChange={(e) => {
                  if (e.target.value) toggleSelection(selectedV2, setSelectedV2, e.target.value);
                }}
              >
                <option value="">Ekle...</option>
                {(renkOptions || []).filter((o) => !selectedV2.includes(o.id)).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={selectedV1.length === 0 || selectedV2.length === 0} className="mt-6">
            <Plus className="w-4 h-4 mr-1" /> Ekle
          </Button>
        </div>

        {formData.stoklar.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{varyant1Label}</TableHead>
                <TableHead>{varyant2Label}</TableHead>
                <TableHead>Miktar Tipi</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Sil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.stoklar.map((stok, i) => (
                <TableRow key={i}>
                  <TableCell>{stok.varyant_1_value}</TableCell>
                  <TableCell>{stok.varyant_2_value}</TableCell>
                  <TableCell>{stok.miktar_tipi}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={stok.stok_sayisi || ""}
                      onChange={(e) => updateStokSayisi(i, Number(e.target.value))}
                      className="w-24"
                      placeholder="Stok"
                      min={0}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeStok(i)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
