import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { Award, CalendarIcon, Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const KAT_SERTIFIKA = "a0000001-0000-0000-0000-000000000018";

interface Option { id: string; name: string; }

interface Sertifika {
  id: string;
  sertifika_kategori_id: string;
  sertifika_tur_id: string;
  verilis_tarihi: string | null;
  gecerlilik_tarihi: string | null;
}

interface SertifikalarTabProps {
  userId: string;
  onDataChange?: () => void;
}

export default function SertifikalarTab({ userId, onDataChange }: SertifikalarTabProps) {
  const [firmaId, setFirmaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [optionsMap, setOptionsMap] = useState<Record<string, string>>({});

  const [sertifikalar, setSertifikalar] = useState<Sertifika[]>([]);
  const [kategoriler, setKategoriler] = useState<Option[]>([]);
  const [turler, setTurler] = useState<Option[]>([]);

  const [kategoriId, setKategoriId] = useState("");
  const [turId, setTurId] = useState("");
  const [verilisTarihi, setVerilisTarihi] = useState<Date | undefined>();
  const [gecerlilikTarihi, setGecerlilikTarihi] = useState<Date | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [firmaRes, katRes] = await Promise.all([
        supabase.from("firmalar").select("id").eq("user_id", userId).single(),
        supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT_SERTIFIKA).is("parent_id", null).order("name"),
      ]);

      const map: Record<string, string> = {};
      katRes.data?.forEach(o => { map[o.id] = o.name; });
      if (katRes.data) setKategoriler(katRes.data);

      if (firmaRes.data) {
        setFirmaId(firmaRes.data.id);
        const { data: sertData } = await supabase
          .from("firma_sertifikalar")
          .select("*")
          .eq("firma_id", firmaRes.data.id)
          .order("created_at");

        if (sertData) {
          setSertifikalar(sertData.map(s => ({
            id: s.id,
            sertifika_kategori_id: s.sertifika_kategori_id,
            sertifika_tur_id: s.sertifika_tur_id,
            verilis_tarihi: s.verilis_tarihi,
            gecerlilik_tarihi: s.gecerlilik_tarihi,
          })));
          const turIds = [...new Set(sertData.map(s => s.sertifika_tur_id))];
          if (turIds.length > 0) {
            const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").in("id", turIds);
            data?.forEach(o => { map[o.id] = o.name; });
          }
        }
      }

      setOptionsMap(map);
      setLoading(false);
    };
    if (userId) load();
  }, [userId]);

  const loadTurler = async (katId: string) => {
    setTurId("");
    setTurler([]);
    if (!katId) return;
    const { data } = await supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KAT_SERTIFIKA)
      .eq("parent_id", katId)
      .order("name");
    if (data) {
      setTurler(data);
      data.forEach(o => { setOptionsMap(prev => ({ ...prev, [o.id]: o.name })); });
    }
  };

  const resetForm = () => {
    setKategoriId(""); setTurId(""); setVerilisTarihi(undefined); setGecerlilikTarihi(undefined); setEditingId(null); setTurler([]);
  };

  const handleSave = async () => {
    if (!kategoriId || !turId) {
      toast({ title: "Hata", description: "Sertifika kategorisi ve türü seçiniz.", variant: "destructive" });
      return;
    }
    const payload = {
      firma_id: firmaId,
      sertifika_kategori_id: kategoriId,
      sertifika_tur_id: turId,
      verilis_tarihi: verilisTarihi ? format(verilisTarihi, "yyyy-MM-dd") : null,
      gecerlilik_tarihi: gecerlilikTarihi ? format(gecerlilikTarihi, "yyyy-MM-dd") : null,
    };

    if (editingId) {
      const { error } = await supabase.from("firma_sertifikalar").update(payload).eq("id", editingId);
      if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
      setSertifikalar(prev => prev.map(s => s.id === editingId ? {
        ...s, ...payload,
        verilis_tarihi: payload.verilis_tarihi,
        gecerlilik_tarihi: payload.gecerlilik_tarihi,
      } : s));
      toast({ title: "Güncellendi" });
      onDataChange?.();
    } else {
      const { data, error } = await supabase.from("firma_sertifikalar").insert(payload).select().single();
      if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
      setSertifikalar(prev => [...prev, {
        id: data.id,
        sertifika_kategori_id: kategoriId,
        sertifika_tur_id: turId,
        verilis_tarihi: payload.verilis_tarihi,
        gecerlilik_tarihi: payload.gecerlilik_tarihi,
      }]);
      toast({ title: "Sertifika eklendi" });
    }
    resetForm();
  };

  const handleEdit = async (s: Sertifika) => {
    setEditingId(s.id);
    setKategoriId(s.sertifika_kategori_id);
    setVerilisTarihi(s.verilis_tarihi ? new Date(s.verilis_tarihi) : undefined);
    setGecerlilikTarihi(s.gecerlilik_tarihi ? new Date(s.gecerlilik_tarihi) : undefined);
    const { data } = await supabase.from("firma_bilgi_secenekleri").select("id, name").eq("kategori_id", KAT_SERTIFIKA).eq("parent_id", s.sertifika_kategori_id).order("name");
    if (data) {
      setTurler(data);
      data.forEach(o => { setOptionsMap(prev => ({ ...prev, [o.id]: o.name })); });
    }
    setTurId(s.sertifika_tur_id);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("firma_sertifikalar").delete().eq("id", id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    setSertifikalar(prev => prev.filter(s => s.id !== id));
    if (editingId === id) resetForm();
    toast({ title: "Sertifika silindi" });
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Sertifikalar</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Sertifika Kategorisi</Label>
          <Select value={kategoriId} onValueChange={v => { setKategoriId(v); loadTurler(v); }}>
            <SelectTrigger><SelectValue placeholder="Sertifika Kategorisi" /></SelectTrigger>
            <SelectContent>
              {kategoriler.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Sertifika Türü</Label>
          <Select value={turId} onValueChange={setTurId} disabled={!kategoriId}>
            <SelectTrigger><SelectValue placeholder="Sertifika Türü" /></SelectTrigger>
            <SelectContent>
              {turler.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Veriliş Tarihi</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !verilisTarihi && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {verilisTarihi ? format(verilisTarihi, "dd.MM.yyyy") : "Tarih seçin"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={verilisTarihi} onSelect={setVerilisTarihi} locale={tr} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-foreground">Son Geçerlilik Tarihi</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !gecerlilikTarihi && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {gecerlilikTarihi ? format(gecerlilikTarihi, "dd.MM.yyyy") : "Tarih seçin"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={gecerlilikTarihi} onSelect={setGecerlilikTarihi} locale={tr} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} className="gap-1.5">
          {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {editingId ? "Güncelle" : "Sertifika Ekle"}
        </Button>
        {editingId && (
          <Button variant="outline" onClick={resetForm} className="gap-1.5">
            <X className="w-4 h-4" /> İptal
          </Button>
        )}
      </div>

      {sertifikalar.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Sertifika Kategorisi</TableHead>
                <TableHead>Sertifika Türü</TableHead>
                <TableHead>Veriliş Tarihi</TableHead>
                <TableHead>Son Geçerlilik</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sertifikalar.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{optionsMap[s.sertifika_kategori_id] || "-"}</TableCell>
                  <TableCell>{optionsMap[s.sertifika_tur_id] || "-"}</TableCell>
                  <TableCell>{s.verilis_tarihi ? format(new Date(s.verilis_tarihi), "dd.MM.yyyy") : "-"}</TableCell>
                  <TableCell>{s.gecerlilik_tarihi ? format(new Date(s.gecerlilik_tarihi), "dd.MM.yyyy") : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(s)} className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)} className="h-8 w-8 text-destructive hover:text-destructive">
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
