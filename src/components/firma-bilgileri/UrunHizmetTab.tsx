import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MultiSelectDropdown from "./MultiSelectDropdown";

interface Props {
  userId: string;
  firmaTuruName: string;
}

interface SelectOption {
  id: string;
  name: string;
}

// Category IDs
const KAT = {
  FAALIYET_ALANI: "a0000001-0000-0000-0000-000000000002",
  URETIM_MODELI: "a0000001-0000-0000-0000-000000000003",
  URUN_SEGMENTI: "a0000001-0000-0000-0000-000000000004",
  URETIM_YETKINLIKLERI: "a0000001-0000-0000-0000-000000000005",
  UZMAN_URUN_GRUPLARI: "a0000001-0000-0000-0000-000000000007",
  TEMSIL_TIPI: "a0000001-0000-0000-0000-000000000008",
  BAGIMSIZ_DENETIM: "a0000001-0000-0000-0000-000000000009",
  HIZLI_NUMUNE: "a0000001-0000-0000-0000-000000000010",
  URETIM_VARDIYASI: "a0000001-0000-0000-0000-000000000011",
  TEDARIK_HIZMET_TIPI: "a0000001-0000-0000-0000-000000000012",
  FAALIYET_ALANI_TEDARIKCI: "a0000001-0000-0000-0000-000000000013",
  MEVCUT_PAZARLAR: "a0000001-0000-0000-0000-000000000019",
  HEDEFLENEN_PAZARLAR: "a0000001-0000-0000-0000-000000000020",
  ONLINE_SATIS_PLATFORMLARI: "a0000001-0000-0000-0000-000000000021",
  URETICI_TEDARIKCI_SECIM_KRITERLERI: "a0000001-0000-0000-0000-000000000022",
  IL: "61fbe0a7-638f-4900-97a0-c2c8310e01af",
  BIRIM_TURLERI: "ef259cd0-d622-46f9-8e58-ce5e0d846650",
};

// Special category ID used for storing "Tercih Edilen Bölgeler" in firma_urun_hizmet_secimler
const TERCIH_BOLGE_PSEUDO_KAT = "a0000001-0000-0000-0000-000000000099";

// Which multi-select categories each firma türü uses
const MULTI_FIELDS: Record<string, { kategoriId: string; label: string }[]> = {
  "Hazır Giyim Üreticisi": [
    { kategoriId: KAT.FAALIYET_ALANI, label: "Faaliyet Alanı" },
    { kategoriId: KAT.URETIM_MODELI, label: "Üretim Modeli" },
    { kategoriId: KAT.URUN_SEGMENTI, label: "Ürün Segmenti" },
    { kategoriId: KAT.URETIM_YETKINLIKLERI, label: "Üretim Yetkinlikleri" },
  ],
  "Marka": [
    { kategoriId: KAT.FAALIYET_ALANI, label: "Faaliyet Alanı" },
    { kategoriId: KAT.URUN_SEGMENTI, label: "Ürün Segmenti" },
    { kategoriId: KAT.URETIM_MODELI, label: "Üretim Modeli" },
    { kategoriId: KAT.MEVCUT_PAZARLAR, label: "Mevcut Pazarlar" },
    { kategoriId: KAT.HEDEFLENEN_PAZARLAR, label: "Hedeflenen Pazarlar" },
    { kategoriId: KAT.ONLINE_SATIS_PLATFORMLARI, label: "Online Satış Platformları" },
    { kategoriId: KAT.URETICI_TEDARIKCI_SECIM_KRITERLERI, label: "Üretici / Tedarikçi Seçim Kriterleri" },
  ],
  "Mümessil Ofis": [
    { kategoriId: KAT.FAALIYET_ALANI, label: "Faaliyet Alanı" },
    { kategoriId: KAT.URUN_SEGMENTI, label: "Ürün Segmenti" },
    { kategoriId: KAT.TEMSIL_TIPI, label: "Temsil Tipi" },
    { kategoriId: KAT.TEDARIK_HIZMET_TIPI, label: "Tedarik Hizmet Tipi" },
    { kategoriId: KAT.UZMAN_URUN_GRUPLARI, label: "Uzman Olunan Ürün Grupları" },
  ],
  "Fason Atölye": [
    { kategoriId: KAT.FAALIYET_ALANI, label: "Faaliyet Alanı" },
    { kategoriId: KAT.URUN_SEGMENTI, label: "Ürün Segmenti" },
    { kategoriId: KAT.URETIM_MODELI, label: "Üretim Modeli" },
    { kategoriId: KAT.UZMAN_URUN_GRUPLARI, label: "Uzman Olunan Ürün Grupları" },
  ],
  "Tedarikçi": [
    { kategoriId: KAT.FAALIYET_ALANI_TEDARIKCI, label: "Faaliyet Alanı (Tedarikçi)" },
    { kategoriId: KAT.TEDARIK_HIZMET_TIPI, label: "Tedarik Hizmet Tipi" },
  ],
};

// Which firma türü has number fields
const HAS_NUMBER_FIELDS: Record<string, boolean> = {
  "Hazır Giyim Üreticisi": true,
  "Fason Atölye": true,
};

// Which firma türü has single-select fields (Fason Atölye only)
const HAS_SINGLE_SELECTS = ["Fason Atölye"];

// Marka-specific extras
const IS_MARKA = (name: string) => name === "Marka";
const IS_TEDARIKCI = (name: string) => name === "Tedarikçi";

export default function UrunHizmetTab({ userId, firmaTuruName }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firmaId, setFirmaId] = useState("");

  // Multi-select state: kategoriId -> selected option ids
  const [multiSelections, setMultiSelections] = useState<Record<string, string[]>>({});
  // Options per category
  const [optionsMap, setOptionsMap] = useState<Record<string, SelectOption[]>>({});

  // Number fields
  const [moq, setMoq] = useState("");
  const [aylikKapasite, setAylikKapasite] = useState("");

  // Single-select fields (Fason Atölye)
  const [uretimVardiyasiId, setUretimVardiyasiId] = useState("");
  const [bagimsizDenetimId, setBagimsizDenetimId] = useState("");
  const [hizliNumuneId, setHizliNumuneId] = useState("");
  const [singleOptions, setSingleOptions] = useState<Record<string, SelectOption[]>>({});

  // Marka-specific
  const [fizikselMagazaSayisi, setFizikselMagazaSayisi] = useState("");
  const [tercihBolgeler, setTercihBolgeler] = useState<string[]>([]);
  const [iller, setIller] = useState<SelectOption[]>([]);

  // Tedarikçi-specific
  const [aylikTedarikSayisi, setAylikTedarikSayisi] = useState("");
  const [aylikTedarikBirimId, setAylikTedarikBirimId] = useState("");
  const [birimOptions, setBirimOptions] = useState<SelectOption[]>([]);

  const multiFields = MULTI_FIELDS[firmaTuruName] || [];
  const showNumbers = HAS_NUMBER_FIELDS[firmaTuruName] || false;
  const showSingles = HAS_SINGLE_SELECTS.includes(firmaTuruName);
  const isMarka = IS_MARKA(firmaTuruName);
  const isTedarikci = IS_TEDARIKCI(firmaTuruName);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Get firma id
      const { data: firma } = await supabase
        .from("firmalar")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!firma) { setLoading(false); return; }
      setFirmaId(firma.id);
      setMoq((firma as any).moq?.toString() || "");
      setAylikKapasite((firma as any).aylik_uretim_kapasitesi?.toString() || "");
      setUretimVardiyasiId((firma as any).uretim_vardiyasi_id || "");
      setBagimsizDenetimId((firma as any).bagimsiz_denetim_id || "");
      setHizliNumuneId((firma as any).hizli_numune_id || "");
      setFizikselMagazaSayisi((firma as any).fiziksel_magaza_sayisi?.toString() || "");
      setAylikTedarikSayisi((firma as any).aylik_tedarik_sayisi?.toString() || "");
      setAylikTedarikBirimId((firma as any).aylik_tedarik_birim_id || "");

      // Collect all needed category IDs
      const neededCats = multiFields.map(f => f.kategoriId);
      if (showSingles) {
        neededCats.push(KAT.URETIM_VARDIYASI, KAT.BAGIMSIZ_DENETIM, KAT.HIZLI_NUMUNE);
      }
      const uniqueCats = [...new Set(neededCats)];

      // Additional fetches for Marka and Tedarikçi
      const extraPromises: Promise<any>[] = [];

      if (isMarka) {
        extraPromises.push(
          supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT.IL).is("parent_id", null).order("name")
        );
      }
      if (isTedarikci) {
        extraPromises.push(
          supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT.BIRIM_TURLERI).order("name")
        );
      }

      // Fetch options for all categories in parallel
      const optionPromises = uniqueCats.map(catId =>
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", catId).order("name")
      );
      const [optionResults, ...extraResults] = await Promise.all([
        Promise.all(optionPromises),
        ...extraPromises,
      ]);

      const newOptionsMap: Record<string, SelectOption[]> = {};
      const newSingleOptions: Record<string, SelectOption[]> = {};
      uniqueCats.forEach((catId, i) => {
        const data = optionResults[i].data || [];
        if ([KAT.URETIM_VARDIYASI, KAT.BAGIMSIZ_DENETIM, KAT.HIZLI_NUMUNE].includes(catId)) {
          newSingleOptions[catId] = data;
        }
        newOptionsMap[catId] = data;
      });
      setOptionsMap(newOptionsMap);
      setSingleOptions(newSingleOptions);

      // Set Marka-specific data
      let extraIdx = 0;
      if (isMarka && extraResults[extraIdx]) {
        setIller(extraResults[extraIdx].data || []);
        extraIdx++;
      }
      if (isTedarikci && extraResults[extraIdx]) {
        setBirimOptions(extraResults[extraIdx].data || []);
        extraIdx++;
      }

      // Fetch existing multi-select selections (including pseudo-category for bölgeler)
      const { data: existingSelections } = await supabase
        .from("firma_urun_hizmet_secimler")
        .select("kategori_id, secenek_id")
        .eq("firma_id", firma.id);

      const newMulti: Record<string, string[]> = {};
      multiFields.forEach(f => { newMulti[f.kategoriId] = []; });
      const bolgeler: string[] = [];
      existingSelections?.forEach(s => {
        const catId = s.kategori_id;
        if (catId === TERCIH_BOLGE_PSEUDO_KAT) {
          bolgeler.push(s.secenek_id);
        } else {
          if (!newMulti[catId]) newMulti[catId] = [];
          newMulti[catId].push(s.secenek_id);
        }
      });
      setMultiSelections(newMulti);
      setTercihBolgeler(bolgeler);

      setLoading(false);
    };

    if (userId) fetchAll();
  }, [userId, firmaTuruName]);

  const handleMultiChange = (kategoriId: string, selected: string[]) => {
    setMultiSelections(prev => ({ ...prev, [kategoriId]: selected }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // 1. Update number & single-select fields on firmalar
      const updateData: Record<string, any> = {};
      if (showNumbers) {
        updateData.moq = moq ? parseInt(moq) : null;
        updateData.aylik_uretim_kapasitesi = aylikKapasite ? parseInt(aylikKapasite) : null;
      }
      if (showSingles) {
        updateData.uretim_vardiyasi_id = uretimVardiyasiId || null;
        updateData.bagimsiz_denetim_id = bagimsizDenetimId || null;
        updateData.hizli_numune_id = hizliNumuneId || null;
      }
      if (isMarka) {
        updateData.fiziksel_magaza_sayisi = fizikselMagazaSayisi ? parseInt(fizikselMagazaSayisi) : null;
      }
      if (isTedarikci) {
        updateData.aylik_tedarik_sayisi = aylikTedarikSayisi ? parseInt(aylikTedarikSayisi) : null;
        updateData.aylik_tedarik_birim_id = aylikTedarikBirimId || null;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from("firmalar").update(updateData as any).eq("id", firmaId);
        if (error) throw error;
      }

      // 2. Delete existing multi-selections for this firma's relevant categories + pseudo bolge
      const relevantCats = [...multiFields.map(f => f.kategoriId)];
      if (isMarka) relevantCats.push(TERCIH_BOLGE_PSEUDO_KAT);

      for (const catId of relevantCats) {
        await supabase
          .from("firma_urun_hizmet_secimler")
          .delete()
          .eq("firma_id", firmaId)
          .eq("kategori_id", catId);
      }

      // 3. Insert new multi-selections
      const inserts: { firma_id: string; kategori_id: string; secenek_id: string }[] = [];
      for (const field of multiFields) {
        const selected = multiSelections[field.kategoriId] || [];
        for (const secId of selected) {
          inserts.push({ firma_id: firmaId, kategori_id: field.kategoriId, secenek_id: secId });
        }
      }
      // Insert tercih edilen bölgeler
      if (isMarka) {
        for (const ilId of tercihBolgeler) {
          inserts.push({ firma_id: firmaId, kategori_id: TERCIH_BOLGE_PSEUDO_KAT, secenek_id: ilId });
        }
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("firma_urun_hizmet_secimler").insert(inserts as any);
        if (error) throw error;
      }

      toast({ title: "Başarılı", description: "Ürün/Hizmet bilgileri güncellendi." });
    } catch {
      toast({ title: "Hata", description: "Bilgiler kaydedilemedi.", variant: "destructive" });
    }

    setSaving(false);
  };

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">Yükleniyor...</p>;
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Ürün / Hizmet Bilgileri</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Multi-select fields */}
          {multiFields.map(field => (
            <div key={field.kategoriId} className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{field.label}</Label>
              <MultiSelectDropdown
                options={optionsMap[field.kategoriId] || []}
                selected={multiSelections[field.kategoriId] || []}
                onChange={(sel) => handleMultiChange(field.kategoriId, sel)}
                placeholder={`${field.label} Seçiniz`}
              />
            </div>
          ))}

          {/* Marka: Fiziksel Mağaza Sayısı */}
          {isMarka && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Fiziksel Mağaza Sayısı</Label>
              <Input
                type="number"
                value={fizikselMagazaSayisi}
                onChange={e => setFizikselMagazaSayisi(e.target.value)}
                placeholder="Mağaza sayısı giriniz"
                className="bg-muted/50"
              />
            </div>
          )}

          {/* Marka: Tercih Edilen Üretici / Tedarikçi Bölgeleri (multi-select İl) */}
          {isMarka && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Tercih Edilen Üretici / Tedarikçi Bölgeleri</Label>
              <MultiSelectDropdown
                options={iller}
                selected={tercihBolgeler}
                onChange={setTercihBolgeler}
                placeholder="İl Seçiniz"
              />
            </div>
          )}

          {/* Number fields */}
          {showNumbers && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Minimum Sipariş Miktarı (MOQ)</Label>
                <Input
                  type="number"
                  value={moq}
                  onChange={e => setMoq(e.target.value)}
                  placeholder="Adet giriniz"
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Aylık Üretim Kapasitesi</Label>
                <Input
                  type="number"
                  value={aylikKapasite}
                  onChange={e => setAylikKapasite(e.target.value)}
                  placeholder="Adet giriniz"
                  className="bg-muted/50"
                />
              </div>
            </>
          )}

          {/* Tedarikçi: Aylık Tedarik Sayısı + Birim */}
          {isTedarikci && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Aylık Tedarik Sayısı</Label>
                <Input
                  type="number"
                  value={aylikTedarikSayisi}
                  onChange={e => setAylikTedarikSayisi(e.target.value)}
                  placeholder="Sayı giriniz"
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Birim</Label>
                <Select value={aylikTedarikBirimId} onValueChange={setAylikTedarikBirimId}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="Birim Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {birimOptions.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Single-select fields (Fason Atölye only) */}
          {showSingles && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Üretim Vardiyası</Label>
                <Select value={uretimVardiyasiId} onValueChange={setUretimVardiyasiId}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {(singleOptions[KAT.URETIM_VARDIYASI] || []).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Bağımsız Denetimci Firmalar Tarafından Final Organizasyonu</Label>
                <Select value={bagimsizDenetimId} onValueChange={setBagimsizDenetimId}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {(singleOptions[KAT.BAGIMSIZ_DENETIM] || []).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Hızlı Numune Üretimi</Label>
                <Select value={hizliNumuneId} onValueChange={setHizliNumuneId}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {(singleOptions[KAT.HIZLI_NUMUNE] || []).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
