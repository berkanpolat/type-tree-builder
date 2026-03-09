import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string;
  onFirmaTuruChange?: (turuId: string) => void;
}

interface FirmaRow {
  id: string;
  firma_turu_id: string;
  firma_tipi_id: string;
  firma_unvani: string;
  vergi_numarasi: string;
  vergi_dairesi: string;
}

interface ProfileRow {
  id: string;
  ad: string;
  soyad: string;
  iletisim_email: string;
  iletisim_numarasi: string | null;
}

interface SelectOption { id: string; name: string; }

export default function GenelFirmaBilgileri({ userId, onFirmaTuruChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [firma, setFirma] = useState<FirmaRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  // Form fields
  const [firmaTuruId, setFirmaTuruId] = useState("");
  const [firmaTipiId, setFirmaTipiId] = useState("");
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [vergiNumarasi, setVergiNumarasi] = useState("");
  const [vergiDairesi, setVergiDairesi] = useState("");
  const [iletisimNumarasi, setIletisimNumarasi] = useState("");
  const [iletisimEmail, setIletisimEmail] = useState("");

  // Dropdown options
  const [firmaTurleri, setFirmaTurleri] = useState<SelectOption[]>([]);
  const [firmaTipleri, setFirmaTipleri] = useState<SelectOption[]>([]);
  const [filteredTipleri, setFilteredTipleri] = useState<SelectOption[]>([]);

  // All firma_tipleri for filtering
  const [allTipleri, setAllTipleri] = useState<{ id: string; name: string; firma_turu_id: string }[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [firmaRes, profileRes, turleriRes, tipleriRes] = await Promise.all([
        supabase.from("firmalar").select("*").eq("user_id", userId).single(),
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("firma_turleri").select("id, name"),
        supabase.from("firma_tipleri").select("id, name, firma_turu_id"),
      ]);

      if (turleriRes.data) setFirmaTurleri(turleriRes.data);
      if (tipleriRes.data) setAllTipleri(tipleriRes.data);

      if (firmaRes.data) {
        const f = firmaRes.data;
        setFirma(f);
        setFirmaTuruId(f.firma_turu_id);
        setFirmaTipiId(f.firma_tipi_id);
        setFirmaUnvani(f.firma_unvani);
        setVergiNumarasi(f.vergi_numarasi);
        setVergiDairesi(f.vergi_dairesi);
      }
      if (profileRes.data) {
        const p = profileRes.data;
        setProfile(p);
        setIletisimEmail(p.iletisim_email);
        setIletisimNumarasi(p.iletisim_numarasi || "");
      }

      setLoading(false);
    };
    if (userId) fetchAll();
  }, [userId]);

  // Filter firma tipleri based on selected firma türü
  useEffect(() => {
    if (firmaTuruId) {
      setFilteredTipleri(allTipleri.filter(t => t.firma_turu_id === firmaTuruId));
    } else {
      setFilteredTipleri([]);
    }
  }, [firmaTuruId, allTipleri]);

  const handleSave = async () => {
    setSaving(true);
    const [firmaUpdate, profileUpdate] = await Promise.all([
      supabase.from("firmalar").update({
        firma_turu_id: firmaTuruId,
        firma_tipi_id: firmaTipiId,
        firma_unvani: firmaUnvani,
        vergi_numarasi: vergiNumarasi,
        vergi_dairesi: vergiDairesi,
      }).eq("user_id", userId),
      supabase.from("profiles").update({
        iletisim_email: iletisimEmail,
        iletisim_numarasi: iletisimNumarasi || null,
      }).eq("user_id", userId),
    ]);

    if (firmaUpdate.error || profileUpdate.error) {
      toast({ title: "Hata", description: "Bilgiler kaydedilemedi.", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Firma bilgileri güncellendi." });
    }
    setSaving(false);
  };

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">Yükleniyor...</p>;
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Section header */}
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Genel Firma Bilgileri</h2>
        </div>

        {/* Form grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Firma Türü */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Firma Türü</Label>
            <Select value={firmaTuruId} onValueChange={(v) => { setFirmaTuruId(v); setFirmaTipiId(""); onFirmaTuruChange?.(v); }}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Firma Türü Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {firmaTurleri.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Firma Tipi */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Firma Tipi</Label>
            <Select value={firmaTipiId} onValueChange={setFirmaTipiId} disabled={!firmaTuruId}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Firma Tipi Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {filteredTipleri.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Firma Ünvanı */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Firma Ünvanı</Label>
            <Input value={firmaUnvani} onChange={e => setFirmaUnvani(e.target.value)} className="bg-muted/50" />
          </div>

          {/* Vergi Numarası */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Vergi Numarası</Label>
            <Input value={vergiNumarasi} onChange={e => setVergiNumarasi(e.target.value)} className="bg-muted/50" />
          </div>

          {/* Vergi Dairesi */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Vergi Dairesi</Label>
            <Input value={vergiDairesi} onChange={e => setVergiDairesi(e.target.value)} className="bg-muted/50" />
          </div>

          {/* İletişim Numarası */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">İletişim Numarası</Label>
            <Input value={iletisimNumarasi} onChange={e => setIletisimNumarasi(e.target.value)} className="bg-muted/50" />
          </div>

          {/* İletişim Email */}
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm font-medium text-foreground">İletişim Email</Label>
            <Input value={iletisimEmail} onChange={e => setIletisimEmail(e.target.value)} className="bg-muted/50" />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
