import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import MultiSelectDropdown from "@/components/firma-bilgileri/MultiSelectDropdown";

interface Props {
  td: Record<string, any>;
  setTD: (key: string, value: any) => void;
  kategoriName: string;
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

function useChildOptions(parentIds: string[]) {
  return useQuery({
    queryKey: ["multi_child_options", parentIds],
    queryFn: async () => {
      if (!parentIds.length) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").in("parent_id", parentIds).order("name");
      return data || [];
    },
    enabled: parentIds.length > 0,
  });
}

function MultiSelectField({ label, kategoriName, value, onChange }: { label: string; kategoriName: string; value: string[]; onChange: (v: string[]) => void }) {
  const { data: options } = useKategoriSecenekler(kategoriName);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <MultiSelectDropdown options={options || []} selected={value || []} onChange={onChange} placeholder={`${label} seçiniz`} />
    </div>
  );
}

function MultiSelectUrunKategoriSecimi({ label, td, setTD, prefixKey }: { label: string; td: Record<string, any>; setTD: (k: string, v: any) => void; prefixKey: string }) {
  const { data: kategoriler } = useQuery({
    queryKey: ["teknik_urun_kategoriler"],
    queryFn: async () => {
      const { data: kat } = await supabase.from("firma_bilgi_kategorileri").select("id").eq("name", "Ana Ürün Kategorileri").single();
      if (!kat) return [];
      const { data } = await supabase.from("firma_bilgi_secenekleri").select("*").eq("kategori_id", kat.id).is("parent_id", null).order("name");
      return data || [];
    },
  });

  const selectedKats: string[] = td[`${prefixKey}_kategori`] || [];
  const { data: gruplar } = useChildOptions(selectedKats);

  const selectedGrups: string[] = td[`${prefixKey}_grup`] || [];
  const { data: turler } = useChildOptions(selectedGrups);

  return (
    <div className="space-y-3 border rounded-lg p-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="space-y-2">
        <Label className="text-xs">Ana Kategori</Label>
        <MultiSelectDropdown
          options={kategoriler || []}
          selected={selectedKats}
          onChange={(v) => {
            setTD(`${prefixKey}_kategori`, v);
            // Clear child selections whose parent is no longer selected
            const validGrups = (gruplar || []).filter(g => v.includes(g.parent_id!)).map(g => g.id);
            const newGrups = (td[`${prefixKey}_grup`] || []).filter((id: string) => validGrups.includes(id));
            setTD(`${prefixKey}_grup`, newGrups);
            setTD(`${prefixKey}_tur`, []);
          }}
          placeholder="Kategori seçiniz"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Grup</Label>
        <MultiSelectDropdown
          options={gruplar || []}
          selected={selectedGrups}
          onChange={(v) => {
            setTD(`${prefixKey}_grup`, v);
            const validTurs = (turler || []).filter(t => v.includes(t.parent_id!)).map(t => t.id);
            const newTurs = (td[`${prefixKey}_tur`] || []).filter((id: string) => validTurs.includes(id));
            setTD(`${prefixKey}_tur`, newTurs);
          }}
          disabled={!selectedKats.length}
          placeholder={selectedKats.length ? "Grup seçiniz" : "Önce kategori seçiniz"}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Tür</Label>
        <MultiSelectDropdown
          options={turler || []}
          selected={td[`${prefixKey}_tur`] || []}
          onChange={(v) => setTD(`${prefixKey}_tur`, v)}
          disabled={!selectedGrups.length}
          placeholder={selectedGrups.length ? "Tür seçiniz" : "Önce grup seçiniz"}
        />
      </div>
    </div>
  );
}

export default function HizmetTeknikFields({ td, setTD, kategoriName }: Props) {
  const hizmetName = kategoriName?.toLowerCase() || "";

  if (hizmetName.includes("ürün hizmeti") || hizmetName.includes("üretim hizmeti")) {
    return (
      <>
        <MultiSelectUrunKategoriSecimi label="Ürün Kategorisi / Grubu / Türü" td={td} setTD={setTD} prefixKey="hizmet_urun" />
        <MultiSelectField label="Desen Bilgisi" kategoriName="Desen" value={td.desen || []} onChange={(v) => setTD("desen", v)} />
        <MultiSelectField label="Baskı Bilgisi" kategoriName="Baskı" value={td.baski || []} onChange={(v) => setTD("baski", v)} />
        <MultiSelectField label="Renk" kategoriName="Renk" value={td.renk || []} onChange={(v) => setTD("renk", v)} />
      </>
    );
  }

  if (hizmetName.includes("teknik") || hizmetName.includes("tasarım")) {
    return (
      <>
        <MultiSelectUrunKategoriSecimi label="Hedef Ürün Grubu" td={td} setTD={setTD} prefixKey="hedef_urun" />
        <MultiSelectField label="Tasarım Türü" kategoriName="Tasarım Türü" value={td.tasarim_turu || []} onChange={(v) => setTD("tasarim_turu", v)} />
        <MultiSelectField label="Dosya Teslim Formatı" kategoriName="Dosya Teslim Formatı" value={td.dosya_format || []} onChange={(v) => setTD("dosya_format", v)} />
        <MultiSelectField label="Kalıp Bilgisi" kategoriName="Kalıp" value={td.kalip || []} onChange={(v) => setTD("kalip", v)} />
        <MultiSelectField label="Revizyon Hakkı" kategoriName="Revizyon Hakkı" value={td.revizyon_hakki || []} onChange={(v) => setTD("revizyon_hakki", v)} />
      </>
    );
  }

  if (hizmetName.includes("mümessil") || hizmetName.includes("sipariş")) {
    return (
      <>
        <MultiSelectField label="Hedeflenen Pazar" kategoriName="Hedeflenen Pazarlar" value={td.hedeflenen_pazar || []} onChange={(v) => setTD("hedeflenen_pazar", v)} />
        <MultiSelectField label="Sipariş Türü" kategoriName="Sipariş Türü" value={td.siparis_turu || []} onChange={(v) => setTD("siparis_turu", v)} />
        <MultiSelectUrunKategoriSecimi label="Hedef Ürün Grubu" td={td} setTD={setTD} prefixKey="mumessil_urun" />
        <MultiSelectField label="Ürün Segmenti" kategoriName="Ürün Segmenti" value={td.urun_segmenti || []} onChange={(v) => setTD("urun_segmenti", v)} />
      </>
    );
  }

  return <p className="text-muted-foreground">Bu hizmet kategorisi için teknik detay alanı bulunmamaktadır.</p>;
}
