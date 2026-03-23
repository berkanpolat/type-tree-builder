import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Cog, Cpu, Pencil, Trash2, Plus, X, Check } from "lucide-react";

const KAT = {
  MAKINE: "a0000001-0000-0000-0000-000000000016",
  TEKNOLOJI: "a0000001-0000-0000-0000-000000000017",
};

interface Option { id: string; name: string; }

interface Makine {
  id: string;
  makine_kategori_id: string;
  makine_tur_id: string;
  makine_sayisi: string;
  tesis_id: string | null;
}

interface Teknoloji {
  id: string;
  teknoloji_kategori_id: string;
  teknoloji_tur_id: string;
}

interface MakineParkuruTabProps {
  userId: string;
}

export default function MakineParkuruTab({ userId }: MakineParkuruTabProps) {
  const [firmaId, setFirmaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [optionsMap, setOptionsMap] = useState<Record<string, string>>({});

  // Makine state
  const [makineler, setMakineler] = useState<Makine[]>([]);
  const [makineKategorileri, setMakineKategorileri] = useState<Option[]>([]);
  const [makineTurleri, setMakineTurleri] = useState<Option[]>([]);
  const [tesisler, setTesisler] = useState<Option[]>([]);
  const [mkKategoriId, setMkKategoriId] = useState("");
  const [mkTurId, setMkTurId] = useState("");
  const [mkSayisi, setMkSayisi] = useState("");
  const [mkTesisId, setMkTesisId] = useState("");
  const [mkEditingId, setMkEditingId] = useState<string | null>(null);

  // Teknoloji state
  const [teknolojiler, setTeknolojiler] = useState<Teknoloji[]>([]);
  const [tekKategorileri, setTekKategorileri] = useState<Option[]>([]);
  const [tekTurleri, setTekTurleri] = useState<Option[]>([]);
  const [tkKategoriId, setTkKategoriId] = useState("");
  const [tkTurId, setTkTurId] = useState("");
  const [tkEditingId, setTkEditingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [firmaRes, mkKatRes, tkKatRes] = await Promise.all([
        supabase.from("firmalar").select("id").eq("user_id", userId).single(),
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT.MAKINE).is("parent_id", null).order("name"),
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT.TEKNOLOJI).is("parent_id", null).order("name"),
      ]);

      const map: Record<string, string> = {};
      [mkKatRes.data, tkKatRes.data].forEach(arr => arr?.forEach(o => { map[o.id] = o.name; }));

      if (mkKatRes.data) setMakineKategorileri(mkKatRes.data);
      if (tkKatRes.data) setTekKategorileri(tkKatRes.data);

      if (firmaRes.data) {
        const fId = firmaRes.data.id;
        setFirmaId(fId);

        const [makinelerRes, teknolojilerRes, tesislerRes] = await Promise.all([
          supabase.from("firma_makineler").select("*").eq("firma_id", fId).order("created_at"),
          supabase.from("firma_teknolojiler").select("*").eq("firma_id", fId).order("created_at"),
          supabase.from("firma_tesisler").select("id, tesis_adi_id").eq("firma_id", fId).order("created_at"),
        ]);

        if (makinelerRes.data) {
          setMakineler(makinelerRes.data.map(m => ({
            id: m.id,
            makine_kategori_id: m.makine_kategori_id,
            makine_tur_id: m.makine_tur_id,
            makine_sayisi: m.makine_sayisi || "",
            tesis_id: m.tesis_id,
          })));
          // Load tur names
          const turIds = [...new Set(makinelerRes.data.map(m => m.makine_tur_id))];
          if (turIds.length > 0) {
            const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", turIds);
            data?.forEach(o => { map[o.id] = o.name; });
          }
        }

        if (teknolojilerRes.data) {
          setTeknolojiler(teknolojilerRes.data.map(t => ({
            id: t.id,
            teknoloji_kategori_id: t.teknoloji_kategori_id,
            teknoloji_tur_id: t.teknoloji_tur_id,
          })));
          const turIds = [...new Set(teknolojilerRes.data.map(t => t.teknoloji_tur_id))];
          if (turIds.length > 0) {
            const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", turIds);
            data?.forEach(o => { map[o.id] = o.name; });
          }
        }

        if (tesislerRes.data) {
          // Need tesis adi names
          const tesisAdiIds = tesislerRes.data.map(t => t.tesis_adi_id);
          if (tesisAdiIds.length > 0) {
            const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", tesisAdiIds);
            data?.forEach(o => { map[o.id] = o.name; });
          }
          setTesisler(tesislerRes.data.map(t => ({ id: t.id, name: map[t.tesis_adi_id] || t.tesis_adi_id })));
        }
      }

      setOptionsMap(map);
      setLoading(false);
    };
    if (userId) load();
  }, [userId]);

  // Load makine türleri when kategori changes
  const loadMakineTurleri = async (kategoriId: string) => {
    setMkTurId("");
    setMakineTurleri([]);
    if (!kategoriId) return;
    const { data } = await supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KAT.MAKINE)
      .eq("parent_id", kategoriId)
      .order("name");
    if (data) {
      setMakineTurleri(data);
      data.forEach(o => { setOptionsMap(prev => ({ ...prev, [o.id]: o.name })); });
    }
  };

  // Load teknoloji türleri when kategori changes
  const loadTekTurleri = async (kategoriId: string) => {
    setTkTurId("");
    setTekTurleri([]);
    if (!kategoriId) return;
    const { data } = await supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KAT.TEKNOLOJI)
      .eq("parent_id", kategoriId)
      .order("name");
    if (data) {
      setTekTurleri(data);
      data.forEach(o => { setOptionsMap(prev => ({ ...prev, [o.id]: o.name })); });
    }
  };

  // ---- MAKINE CRUD ----
  const resetMkForm = () => {
    setMkKategoriId(""); setMkTurId(""); setMkSayisi(""); setMkTesisId(""); setMkEditingId(null); setMakineTurleri([]);
  };

  const handleMkSave = async () => {
    if (!mkKategoriId || !mkTurId) {
      toast({ title: "Hata", description: "Makine kategorisi ve türü seçiniz.", variant: "destructive" });
      return;
    }
    const payload = {
      firma_id: firmaId,
      makine_kategori_id: mkKategoriId,
      makine_tur_id: mkTurId,
      makine_sayisi: mkSayisi || null,
      tesis_id: mkTesisId || null,
    };

    if (mkEditingId) {
      const { error } = await supabase.from("firma_makineler").update(payload).eq("id", mkEditingId);
      if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
      setMakineler(prev => prev.map(m => m.id === mkEditingId ? { ...m, ...payload, makine_sayisi: mkSayisi, tesis_id: mkTesisId || null } : m));
      toast({ title: "Güncellendi" });
    } else {
      const { data, error } = await supabase.from("firma_makineler").insert(payload).select().single();
      if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
      setMakineler(prev => [...prev, { id: data.id, makine_kategori_id: mkKategoriId, makine_tur_id: mkTurId, makine_sayisi: mkSayisi, tesis_id: mkTesisId || null }]);
      toast({ title: "Makine eklendi" });
    }
    resetMkForm();
  };

  const handleMkEdit = async (m: Makine) => {
    setMkEditingId(m.id);
    setMkKategoriId(m.makine_kategori_id);
    setMkSayisi(m.makine_sayisi);
    setMkTesisId(m.tesis_id || "");
    // Load türleri for this kategori
    const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT.MAKINE).eq("parent_id", m.makine_kategori_id).order("name");
    if (data) {
      setMakineTurleri(data);
      data.forEach(o => { setOptionsMap(prev => ({ ...prev, [o.id]: o.name })); });
    }
    setMkTurId(m.makine_tur_id);
  };

  const handleMkDelete = async (id: string) => {
    const { error } = await supabase.from("firma_makineler").delete().eq("id", id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    setMakineler(prev => prev.filter(m => m.id !== id));
    if (mkEditingId === id) resetMkForm();
    toast({ title: "Makine silindi" });
  };

  // ---- TEKNOLOJİ CRUD ----
  const resetTkForm = () => {
    setTkKategoriId(""); setTkTurId(""); setTkEditingId(null); setTekTurleri([]);
  };

  const handleTkSave = async () => {
    if (!tkKategoriId || !tkTurId) {
      toast({ title: "Hata", description: "Teknoloji kategorisi ve türü seçiniz.", variant: "destructive" });
      return;
    }
    const payload = {
      firma_id: firmaId,
      teknoloji_kategori_id: tkKategoriId,
      teknoloji_tur_id: tkTurId,
    };

    if (tkEditingId) {
      const { error } = await supabase.from("firma_teknolojiler").update(payload).eq("id", tkEditingId);
      if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
      setTeknolojiler(prev => prev.map(t => t.id === tkEditingId ? { ...t, ...payload } : t));
      toast({ title: "Güncellendi" });
    } else {
      const { data, error } = await supabase.from("firma_teknolojiler").insert(payload).select().single();
      if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
      setTeknolojiler(prev => [...prev, { id: data.id, teknoloji_kategori_id: tkKategoriId, teknoloji_tur_id: tkTurId }]);
      toast({ title: "Teknoloji eklendi" });
    }
    resetTkForm();
  };

  const handleTkEdit = async (t: Teknoloji) => {
    setTkEditingId(t.id);
    setTkKategoriId(t.teknoloji_kategori_id);
    const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT.TEKNOLOJI).eq("parent_id", t.teknoloji_kategori_id).order("name");
    if (data) {
      setTekTurleri(data);
      data.forEach(o => { setOptionsMap(prev => ({ ...prev, [o.id]: o.name })); });
    }
    setTkTurId(t.teknoloji_tur_id);
  };

  const handleTkDelete = async (id: string) => {
    const { error } = await supabase.from("firma_teknolojiler").delete().eq("id", id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    setTeknolojiler(prev => prev.filter(t => t.id !== id));
    if (tkEditingId === id) resetTkForm();
    toast({ title: "Teknoloji silindi" });
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-8">
      {/* ===== MAKİNE BÖLÜMÜ ===== */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Cog className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Makine Parkuru</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">Makine Kategorisi</Label>
            <Select value={mkKategoriId} onValueChange={v => { setMkKategoriId(v); loadMakineTurleri(v); }}>
              <SelectTrigger><SelectValue placeholder="Makine Kategorisi" /></SelectTrigger>
              <SelectContent>
                {makineKategorileri.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">Makine Türü</Label>
            <Select value={mkTurId} onValueChange={setMkTurId} disabled={!mkKategoriId}>
              <SelectTrigger><SelectValue placeholder="Makine Türü" /></SelectTrigger>
              <SelectContent>
                {makineTurleri.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">Makine Sayısı</Label>
            <Input placeholder="Makine Sayısı" value={mkSayisi} onChange={e => setMkSayisi(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">Tesis</Label>
            <Select value={mkTesisId} onValueChange={setMkTesisId}>
              <SelectTrigger><SelectValue placeholder="Tesis Adı" /></SelectTrigger>
              <SelectContent>
                {tesisler.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleMkSave} className="gap-1.5">
            {mkEditingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {mkEditingId ? "Güncelle" : "Makina Ekle"}
          </Button>
          {mkEditingId && (
            <Button variant="outline" onClick={resetMkForm} className="gap-1.5">
              <X className="w-4 h-4" /> İptal
            </Button>
          )}
        </div>

        {makineler.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Makine Kategorisi</TableHead>
                  <TableHead>Makine Türü</TableHead>
                  <TableHead>Makine Sayısı</TableHead>
                  <TableHead>Tesis</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {makineler.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{optionsMap[m.makine_kategori_id] || "-"}</TableCell>
                    <TableCell>{optionsMap[m.makine_tur_id] || "-"}</TableCell>
                    <TableCell>{m.makine_sayisi || "-"}</TableCell>
                    <TableCell>{m.tesis_id ? tesisler.find(t => t.id === m.tesis_id)?.name || "-" : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleMkEdit(m)} className="h-8 w-8">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleMkDelete(m.id)} className="h-8 w-8 text-destructive hover:text-destructive">
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

      {/* ===== TEKNOLOJİ BÖLÜMÜ ===== */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Teknoloji ve Yazılım Kullanımı</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">Teknoloji ve Yazılım Kullanımı</Label>
            <Select value={tkKategoriId} onValueChange={v => { setTkKategoriId(v); loadTekTurleri(v); }}>
              <SelectTrigger><SelectValue placeholder="Teknoloji ve Yazılım Kullanımı" /></SelectTrigger>
              <SelectContent>
                {tekKategorileri.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">Teknoloji ve Yazılım Kullanımı Türü</Label>
            <Select value={tkTurId} onValueChange={setTkTurId} disabled={!tkKategoriId}>
              <SelectTrigger><SelectValue placeholder="Teknoloji ve Yazılım Kullanımı Türü" /></SelectTrigger>
              <SelectContent>
                {tekTurleri.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleTkSave} className="gap-1.5">
            {tkEditingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {tkEditingId ? "Güncelle" : "Teknoloji Ekle"}
          </Button>
          {tkEditingId && (
            <Button variant="outline" onClick={resetTkForm} className="gap-1.5">
              <X className="w-4 h-4" /> İptal
            </Button>
          )}
        </div>

        {teknolojiler.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Teknoloji ve Yazılım Kullanımı</TableHead>
                  <TableHead>Teknoloji ve Yazılım Kullanımı Türü</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teknolojiler.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{optionsMap[t.teknoloji_kategori_id] || "-"}</TableCell>
                    <TableCell>{optionsMap[t.teknoloji_tur_id] || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleTkEdit(t)} className="h-8 w-8">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleTkDelete(t.id)} className="h-8 w-8 text-destructive hover:text-destructive">
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
    </div>
  );
}
