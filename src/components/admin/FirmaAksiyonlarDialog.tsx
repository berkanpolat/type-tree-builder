import { useState, useEffect, CSSProperties } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Check, Loader2, Phone, MapPin, FileText, Eye, Users, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const s = {
  card: {
    background: "hsl(var(--admin-card-bg))",
    border: "1px solid hsl(var(--admin-border))",
  } as CSSProperties,
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
};

const TUR_CONFIG: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  arama: { label: "Arama", icon: Phone, color: "#3b82f6" },
  ziyaret: { label: "Ziyaret", icon: MapPin, color: "#8b5cf6" },
  teklif: { label: "Teklif", icon: FileText, color: "#f59e0b" },
  takip: { label: "Takip", icon: Eye, color: "#22c55e" },
  toplanti: { label: "Toplantı", icon: Users, color: "#ec4899" },
  diger: { label: "Diğer", icon: MoreHorizontal, color: "#94a3b8" },
};

interface Aksiyon {
  id: string;
  baslik: string;
  aciklama: string | null;
  tur: string;
  tarih: string;
  durum: string;
  admin_ad: string;
  created_at: string;
}

interface FirmaAksiyonlarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firmaId: string;
  firmaUnvani: string;
  callApi: (action: string, body: Record<string, unknown>) => Promise<any>;
  token: string;
  onAddClick: () => void;
}

export default function FirmaAksiyonlarDialog({ open, onOpenChange, firmaId, firmaUnvani, callApi, token, onAddClick }: FirmaAksiyonlarDialogProps) {
  const [aksiyonlar, setAksiyonlar] = useState<Aksiyon[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAksiyonlar = async () => {
    setLoading(true);
    try {
      const data = await callApi("list-aksiyonlar", { token, firmaId });
      setAksiyonlar(data.aksiyonlar || []);
    } catch {
      setAksiyonlar([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && firmaId) fetchAksiyonlar();
  }, [open, firmaId]);

  const toggleDurum = async (aksiyon: Aksiyon) => {
    const newDurum = aksiyon.durum === "yapilacak" ? "yapildi" : "yapilacak";
    await callApi("update-aksiyon", { token, aksiyonId: aksiyon.id, updates: { durum: newDurum } });
    fetchAksiyonlar();
  };

  const deleteAksiyon = async (id: string) => {
    await callApi("delete-aksiyon", { token, aksiyonId: id });
    fetchAksiyonlar();
  };

  const yapilacak = aksiyonlar.filter(a => a.durum === "yapilacak");
  const yapildi = aksiyonlar.filter(a => a.durum === "yapildi");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-semibold" style={s.text}>Aksiyonlar</DialogTitle>
              <p className="text-xs mt-0.5" style={s.muted}>{firmaUnvani}</p>
            </div>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-7 text-xs" onClick={onAddClick}>
              <Plus className="w-3 h-3 mr-1" /> Ekle
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          </div>
        ) : aksiyonlar.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs" style={s.muted}>Henüz aksiyon eklenmemiş</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Yapılacak */}
            {yapilacak.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={s.muted}>
                  Yapılacak ({yapilacak.length})
                </p>
                <div className="space-y-1.5">
                  {yapilacak.map(a => <AksiyonRow key={a.id} aksiyon={a} onToggle={toggleDurum} onDelete={deleteAksiyon} />)}
                </div>
              </div>
            )}

            {/* Yapıldı */}
            {yapildi.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={s.muted}>
                  Tamamlanan ({yapildi.length})
                </p>
                <div className="space-y-1.5">
                  {yapildi.map(a => <AksiyonRow key={a.id} aksiyon={a} onToggle={toggleDurum} onDelete={deleteAksiyon} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AksiyonRow({ aksiyon, onToggle, onDelete }: { aksiyon: Aksiyon; onToggle: (a: Aksiyon) => void; onDelete: (id: string) => void }) {
  const turConfig = TUR_CONFIG[aksiyon.tur] || TUR_CONFIG.diger;
  const Icon = turConfig.icon;
  const isDone = aksiyon.durum === "yapildi";
  const isPast = new Date(aksiyon.tarih) < new Date() && !isDone;

  return (
    <div
      className="flex items-start gap-2.5 p-2.5 rounded-lg transition-colors"
      style={{ background: "hsl(var(--admin-hover))", opacity: isDone ? 0.6 : 1 }}
    >
      <button
        onClick={() => onToggle(aksiyon)}
        className="mt-0.5 w-4.5 h-4.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          borderColor: isDone ? "#22c55e" : "hsl(var(--admin-border))",
          background: isDone ? "rgba(34,197,94,0.15)" : "transparent",
          width: 18, height: 18,
        }}
      >
        {isDone && <Check className="w-3 h-3 text-emerald-500" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 flex-shrink-0" style={{ color: turConfig.color }} />
          <span className={`text-xs font-medium truncate ${isDone ? "line-through" : ""}`} style={s.text}>
            {aksiyon.baslik}
          </span>
        </div>
        {aksiyon.aciklama && (
          <p className="text-[11px] mt-0.5 line-clamp-2" style={s.muted}>{aksiyon.aciklama}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Badge className="text-[9px] px-1 py-0" style={{ background: `${turConfig.color}20`, color: turConfig.color, borderColor: `${turConfig.color}40` }}>
            {turConfig.label}
          </Badge>
          <span className={`text-[10px] ${isPast ? "text-red-400" : ""}`} style={!isPast ? s.muted : undefined}>
            {format(new Date(aksiyon.tarih), "dd MMM", { locale: tr })}
          </span>
          <span className="text-[10px]" style={s.muted}>• {aksiyon.admin_ad}</span>
        </div>
      </div>

      <button onClick={() => onDelete(aksiyon.id)} className="mt-0.5 opacity-40 hover:opacity-100 transition-opacity">
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}
