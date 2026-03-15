import { useState, CSSProperties } from "react";
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
import { CalendarIcon, Loader2 } from "lucide-react";
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
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [tur, setTur] = useState<string>(turler[0]?.value || "diger");
  const [digerText, setDigerText] = useState("");
  const [tarih, setTarih] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const finalBaslik = tur === "diger" ? (digerText.trim() || baslik.trim()) : baslik.trim();
    if (!finalBaslik) return;
    setLoading(true);
    try {
      await callApi("create-aksiyon", {
        token,
        firmaId,
        baslik: finalBaslik,
        aciklama: aciklama.trim() || null,
        tur,
        tarih: tarih.toISOString(),
      });
      setBaslik("");
      setAciklama("");
      setDigerText("");
      setTur(turler[0]?.value || "diger");
      setTarih(new Date());
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
          {/* Tür */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={s.muted}>Aksiyon Türü</label>
            <Select value={tur} onValueChange={setTur}>
              <SelectTrigger className="h-9 text-sm" style={s.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={s.card}>
                {turler.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Diğer - serbest metin */}
          {tur === "diger" && (
            <div>
              <label className="text-xs font-medium mb-1 block" style={s.muted}>Aksiyon Adı</label>
              <Input
                value={digerText}
                onChange={e => setDigerText(e.target.value)}
                placeholder="Aksiyonu yazın..."
                className="h-9 text-sm"
                style={s.input}
              />
            </div>
          )}

          {/* Başlık */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={s.muted}>Başlık</label>
            <Input
              value={baslik}
              onChange={e => setBaslik(e.target.value)}
              placeholder="Aksiyon başlığı..."
              className="h-9 text-sm"
              style={s.input}
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={s.muted}>Açıklama (opsiyonel)</label>
            <Textarea
              value={aciklama}
              onChange={e => setAciklama(e.target.value)}
              placeholder="Detaylar..."
              className="text-sm min-h-[60px]"
              style={s.input}
            />
          </div>

          {/* Tarih */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={s.muted}>Tarih</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !tarih && "text-muted-foreground")} style={s.input}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {tarih ? format(tarih, "dd MMM yyyy", { locale: tr }) : "Tarih seçin"}
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

          <Button
            onClick={handleSubmit}
            disabled={loading || (tur === "diger" ? !digerText.trim() && !baslik.trim() : !baslik.trim())}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white h-9 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aksiyon Ekle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
