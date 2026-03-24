import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Building2, Pencil, Trash2, Plus, X, Check } from "lucide-react";

const KAT = {
  TESIS_TURU: "a0000001-0000-0000-0000-000000000014",
  IS_GUCU: "a0000001-0000-0000-0000-000000000015",
  IL: "61fbe0a7-638f-4900-97a0-c2c8310e01af",
};

interface Option { id: string; name: string; }

interface Tesis {
  id: string;
  tesis_adi_id: string;
  tesis_adresi: string;
  il_id: string | null;
  ilce_id: string | null;
  is_gucu_id: string | null;
  makine_gucu: string;
}

interface TesisBilgileriTabProps {
  userId: string;
  onDataChange?: () => void;
}

export default function TesisBilgileriTab({ userId, onDataChange }: TesisBilgileriTabProps) {
  const [firmaId, setFirmaId] = useState("");
  const [tesisler, setTesisler] = useState<Tesis[]>([]);
  const [tesisAdlari, setTesisAdlari] = useState<Option[]>([]);
  const [isGucuOptions, setIsGucuOptions] = useState<Option[]>([]);
  const [iller, setIller] = useState<Option[]>([]);
  const [ilceler, setIlceler] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [tesisAdiId, setTesisAdiId] = useState("");
  const [tesisAdresi, setTesisAdresi] = useState("");
  const [ilId, setIlId] = useState("");
  const [ilceId, setIlceId] = useState("");
  const [isGucuId, setIsGucuId] = useState("");
  const [makineGucu, setMakineGucu] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  // All options map for display
  const [optionsMap, setOptionsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const [firmaRes, tesisAdRes, isGucuRes, ilRes] = await Promise.all([
        supabase.from("firmalar").select("id").eq("user_id", userId).single(),
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT.TESIS_TURU).is("parent_id", null).order("name"),
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT.IS_GUCU).is("parent_id", null).order("name"),
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT.IL).is("parent_id", null).order("name"),
      ]);

      const map: Record<string, string> = {};
      [tesisAdRes.data, isGucuRes.data, ilRes.data].forEach(arr =>
        arr?.forEach(o => { map[o.id] = o.name; })
      );

      if (tesisAdRes.data) setTesisAdlari(tesisAdRes.data);
      if (isGucuRes.data) setIsGucuOptions(isGucuRes.data);
      if (ilRes.data) setIller(ilRes.data);

      if (firmaRes.data) {
        setFirmaId(firmaRes.data.id);
        const { data: tesisData } = await supabase
          .from("firma_tesisler")
          .select("*")
          .eq("firma_id", firmaRes.data.id)
          .order("created_at");

        if (tesisData) {
          setTesisler(tesisData.map(t => ({
            id: t.id,
            tesis_adi_id: t.tesis_adi_id,
            tesis_adresi: t.tesis_adresi || "",
            il_id: t.il_id,
            ilce_id: t.ilce_id,
            is_gucu_id: t.is_gucu_id,
            makine_gucu: t.makine_gucu || "",
          })));

          // Load ilçe names for existing records
          const ilceIds = tesisData.filter(t => t.ilce_id).map(t => t.ilce_id!);
          const ilIds = tesisData.filter(t => t.il_id).map(t => t.il_id!);
          if (ilceIds.length > 0 || ilIds.length > 0) {
            const allIds = [...new Set([...ilceIds, ...ilIds])];
            const { data: extraOpts } = await supabase
              .from("firma_bilgi_secenekleri")
              .select("id, name")
              .in("id", allIds);
            extraOpts?.forEach(o => { map[o.id] = o.name; });
          }
        }
      }

      setOptionsMap(map);
      setLoading(false);
    };
    if (userId) load();
  }, [userId]);

  const loadIlceler = async (selectedIlId: string) => {
    setIlceId("");
    if (!selectedIlId) { setIlceler([]); return; }
    const { data } = await supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KAT.IL)
      .eq("parent_id", selectedIlId)
      .order("name");
    if (data) {
      setIlceler(data);
      data.forEach(o => { setOptionsMap(prev => ({ ...prev, [o.id]: o.name })); });
    }
  };

  const resetForm = () => {
    setTesisAdiId("");
    setTesisAdresi("");
    setIlId("");
    setIlceId("");
    setIsGucuId("");
    setMakineGucu("");
    setIlceler([]);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!tesisAdiId) {
      toast({ title: "Hata", description: "Tesis adı seçiniz.", variant: "destructive" });
      return;
    }

    const payload = {
      firma_id: firmaId,
      tesis_adi_id: tesisAdiId,
      tesis_adresi: tesisAdresi || null,
      il_id: ilId || null,
      ilce_id: ilceId || null,
      is_gucu_id: isGucuId || null,
      makine_gucu: makineGucu || null,
    };

    if (editingId) {
      const { error } = await supabase.from("firma_tesisler").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
      setTesisler(prev => prev.map(t => t.id === editingId ? { ...t, ...payload, tesis_adresi: tesisAdresi, makine_gucu: makineGucu } : t));
      toast({ title: "Güncellendi" });
      onDataChange?.();
    } else {
      const { data, error } = await supabase.from("firma_tesisler").insert(payload).select().single();
      if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
      setTesisler(prev => [...prev, {
        id: data.id,
        tesis_adi_id: tesisAdiId,
        tesis_adresi: tesisAdresi,
        il_id: ilId || null,
        ilce_id: ilceId || null,
        is_gucu_id: isGucuId || null,
        makine_gucu: makineGucu,
      }]);
      toast({ title: "Tesis eklendi" });
    }

    // Update optionsMap for il/ilce
    if (ilId) setOptionsMap(prev => ({ ...prev, [ilId]: iller.find(i => i.id === ilId)?.name || "" }));
    if (ilceId) setOptionsMap(prev => ({ ...prev, [ilceId]: ilceler.find(i => i.id === ilceId)?.name || "" }));

    resetForm();
  };

  const handleEdit = async (tesis: Tesis) => {
    setEditingId(tesis.id);
    setTesisAdiId(tesis.tesis_adi_id);
    setTesisAdresi(tesis.tesis_adresi);
    setIsGucuId(tesis.is_gucu_id || "");
    setMakineGucu(tesis.makine_gucu);
    setIlId(tesis.il_id || "");

    if (tesis.il_id) {
      const { data } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .eq("kategori_id", KAT.IL)
        .eq("parent_id", tesis.il_id)
        .order("name");
      if (data) {
        setIlceler(data);
        data.forEach(o => { setOptionsMap(prev => ({ ...prev, [o.id]: o.name })); });
      }
    }
    setIlceId(tesis.ilce_id || "");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("firma_tesisler").delete().eq("id", id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    setTesisler(prev => prev.filter(t => t.id !== id));
    if (editingId === id) resetForm();
    toast({ title: "Tesis silindi" });
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Tesis Bilgileri</h2>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Tesis Adı</Label>
          <Select value={tesisAdiId} onValueChange={setTesisAdiId}>
            <SelectTrigger><SelectValue placeholder="Tesis Adı" /></SelectTrigger>
            <SelectContent>
              {tesisAdlari.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Tesis Adresi</Label>
          <Input placeholder="Tesis Adresi" value={tesisAdresi} onChange={e => setTesisAdresi(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">İl</Label>
          <Select value={ilId} onValueChange={v => { setIlId(v); loadIlceler(v); }}>
            <SelectTrigger><SelectValue placeholder="İl" /></SelectTrigger>
            <SelectContent>
              {iller.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">İlçe</Label>
          <Select value={ilceId} onValueChange={setIlceId} disabled={!ilId}>
            <SelectTrigger><SelectValue placeholder="İlçe" /></SelectTrigger>
            <SelectContent>
              {ilceler.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">İş Gücü</Label>
          <Select value={isGucuId} onValueChange={setIsGucuId}>
            <SelectTrigger><SelectValue placeholder="İş Gücü" /></SelectTrigger>
            <SelectContent>
              {isGucuOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Makine Gücü</Label>
          <Input placeholder="Ör: 100 Makine" value={makineGucu} onChange={e => setMakineGucu(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} className="gap-1.5">
          {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {editingId ? "Güncelle" : "Ekle"}
        </Button>
        {editingId && (
          <Button variant="outline" onClick={resetForm} className="gap-1.5">
            <X className="w-4 h-4" /> İptal
          </Button>
        )}
      </div>

      {/* Table */}
      {tesisler.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Tesis Adı</TableHead>
                <TableHead>İl</TableHead>
                <TableHead>İlçe</TableHead>
                <TableHead>Tesis Adresi</TableHead>
                <TableHead>İş Gücü</TableHead>
                <TableHead>Makine Gücü</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tesisler.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{optionsMap[t.tesis_adi_id] || "-"}</TableCell>
                  <TableCell>{t.il_id ? optionsMap[t.il_id] || "-" : "-"}</TableCell>
                  <TableCell>{t.ilce_id ? optionsMap[t.ilce_id] || "-" : "-"}</TableCell>
                  <TableCell>{t.tesis_adresi || "-"}</TableCell>
                  <TableCell>{t.is_gucu_id ? optionsMap[t.is_gucu_id] || "-" : "-"}</TableCell>
                  <TableCell>{t.makine_gucu || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(t)} className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
