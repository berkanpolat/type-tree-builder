import { useState, useEffect, CSSProperties } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Clock, Loader2, Plus, UserPlus, User } from "lucide-react";
import { getAksiyonTurleriForDepartman } from "@/lib/aksiyon-config";

const s = {
  card: {
    background: "hsl(var(--admin-card-bg))",
    border: "1px solid hsl(var(--admin-border))",
  } as CSSProperties,
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
  input: {
    background: "hsl(var(--admin-input-bg))",
    borderColor: "hsl(var(--admin-border))",
    color: "hsl(var(--admin-text))",
  } as CSSProperties,
};

interface YetkiliOption {
  id: string;
  ad: string;
  soyad: string;
  pozisyon: string | null;
}

interface AksiyonEkleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firmaId: string;
  firmaUnvani: string;
  onSuccess: () => void;
  callApi: (action: string, body: Record<string, unknown>) => Promise<any>;
  token: string;
  adminDepartman: string;
  adminIsPrimary: boolean;
}

export default function AksiyonEkleDialog({ open, onOpenChange, firmaId, firmaUnvani, onSuccess, callApi, token, adminDepartman, adminIsPrimary }: AksiyonEkleDialogProps) {
  const turler = getAksiyonTurleriForDepartman(adminDepartman, adminIsPrimary);

  const now = new Date();
  const [tur, setTur] = useState<string>(turler[0]?.value || "diger");
  const [yetkiliId, setYetkiliId] = useState<string>("none");
  const [tarih, setTarih] = useState<Date>(now);
  const [saat, setSaat] = useState(format(now, "HH:mm"));
  const [not, setNot] = useState("");
  const [loading, setLoading] = useState(false);

  // Yetkili list
  const [yetkililer, setYetkililer] = useState<YetkiliOption[]>([]);
  const [yetkililerLoading, setYetkililerLoading] = useState(false);

  // Inline yetkili add
  const [showYetkiliForm, setShowYetkiliForm] = useState(false);
  const [yetkiliAd, setYetkiliAd] = useState("");
  const [yetkiliSoyad, setYetkiliSoyad] = useState("");
  const [yetkiliSaving, setYetkiliSaving] = useState(false);

  const fetchYetkililer = async () => {
    setYetkililerLoading(true);
    try {
      const data = await callApi("list-yetkililer", { token, firmaId });
      setYetkililer((data.yetkililer || []).map((y: any) => ({ id: y.id, ad: y.ad, soyad: y.soyad, pozisyon: y.pozisyon })));
    } catch {
      setYetkililer([]);
    } finally {
      setYetkililerLoading(false);
    }
  };

  useEffect(() => {
    if (open && firmaId) {
      fetchYetkililer();
      const n = new Date();
      setTur(turler[0]?.value || "diger");
      setYetkiliId("none");
      setTarih(n);
      setSaat(format(n, "HH:mm"));
      setNot("");
      setShowYetkiliForm(false);
    }
  }, [open, firmaId]);

  const handleAddYetkili = async () => {
    if (!yetkiliAd.trim() || !yetkiliSoyad.trim()) return;
    setYetkiliSaving(true);
    try {
      const res = await callApi("create-yetkili", { token, firmaId, ad: yetkiliAd.trim(), soyad: yetkiliSoyad.trim() });
      await fetchYetkililer();
      // Auto-select the newly added yetkili
      if (res?.yetkili?.id) setYetkiliId(res.yetkili.id);
      setYetkiliAd("");
      setYetkiliSoyad("");
      setShowYetkiliForm(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setYetkiliSaving(false);
    }
  };

  const handleSubmit = async () => {
    const turLabel = turler.find(t => t.value === tur)?.label || tur;
    // Combine date + time
    const [h, m] = saat.split(":").map(Number);
    const combined = new Date(tarih);
    combined.setHours(h || 0, m || 0, 0, 0);

    setLoading(true);
    try {
      await callApi("create-aksiyon", {
        token,
        firmaId,
        baslik: turLabel,
        aciklama: not.trim() || null,
        tur,
        tarih: combined.toISOString(),
        yetkiliId: yetkiliId !== "none" ? yetkiliId : null,
      });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold" style={s.text}>Aksiyon Ekle</DialogTitle>
          <p className="text-xs" style={s.muted}>{firmaUnvani}</p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Aksiyon Türü */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={s.muted}>Aksiyon Türü</label>
            <Select value={tur} onValueChange={setTur}>
              <SelectTrigger className="h-9 text-sm" style={s.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ ...s.card, zIndex: 9999 }} className="pointer-events-auto">
                {turler.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Yetkili Kişi */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium" style={s.muted}>Yetkili Kişi</label>
              <button
                type="button"
                onClick={() => setShowYetkiliForm(!showYetkiliForm)}
                className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 transition-colors"
              >
                <UserPlus className="w-3 h-3" />
                Yetkili Ekle
              </button>
            </div>

            {showYetkiliForm && (
              <div className="flex items-end gap-1.5 mb-2 p-2 rounded-md" style={{ background: "hsl(var(--admin-hover))" }}>
                <div className="flex-1">
                  <label className="text-[10px] mb-0.5 block" style={s.muted}>Ad *</label>
                  <Input value={yetkiliAd} onChange={e => setYetkiliAd(e.target.value)} className="h-7 text-xs" style={s.input} placeholder="Ad" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] mb-0.5 block" style={s.muted}>Soyad *</label>
                  <Input value={yetkiliSoyad} onChange={e => setYetkiliSoyad(e.target.value)} className="h-7 text-xs" style={s.input} placeholder="Soyad" />
                </div>
                <Button
                  size="sm"
                  onClick={handleAddYetkili}
                  disabled={yetkiliSaving || !yetkiliAd.trim() || !yetkiliSoyad.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white h-7 px-2 text-xs"
                >
                  {yetkiliSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                </Button>
              </div>
            )}

            <Select value={yetkiliId} onValueChange={setYetkiliId}>
              <SelectTrigger className="h-9 text-sm" style={s.input}>
                <SelectValue placeholder="Seçiniz (opsiyonel)" />
              </SelectTrigger>
              <SelectContent style={{ ...s.card, zIndex: 9999 }} className="pointer-events-auto">
                <SelectItem value="none" className="text-sm">Seçilmedi</SelectItem>
                {yetkililerLoading ? (
                  <div className="flex justify-center py-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /></div>
                ) : yetkililer.map(y => (
                  <SelectItem key={y.id} value={y.id} className="text-sm">
                    {y.ad} {y.soyad}{y.pozisyon ? ` — ${y.pozisyon}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tarih & Saat */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={s.muted}>Tarih</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm")} style={s.input}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(tarih, "dd MMM yyyy", { locale: tr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" style={s.card}>
                  <Calendar
                    mode="single"
                    selected={tarih}
                    onSelect={d => d && setTarih(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={s.muted}>Saat</label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50 pointer-events-none" style={{ color: "hsl(var(--admin-muted))" }} />
                <Input
                  type="time"
                  value={saat}
                  onChange={e => setSaat(e.target.value)}
                  className="h-9 text-sm pl-8"
                  style={s.input}
                />
              </div>
            </div>
          </div>

          {/* Aksiyon Notu */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={s.muted}>Aksiyon Notu (opsiyonel)</label>
            <Textarea
              value={not}
              onChange={e => setNot(e.target.value)}
              placeholder="Notlarınızı yazın..."
              className="text-sm min-h-[60px]"
              style={s.input}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white h-9 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aksiyon Ekle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
