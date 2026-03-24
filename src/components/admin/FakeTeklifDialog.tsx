import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminApi } from "@/hooks/use-admin-api";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Send } from "lucide-react";

interface FakeTeklif {
  firma_adi: string;
  tutar: string;
  tarih: string;
  saat: string;
}

interface ExistingFakeTeklif {
  id: string;
  tutar: number;
  created_at: string;
  fake_firma_adi: string;
}

interface FakeTeklifDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ihaleId: string;
  ihaleBaslik: string;
  onSuccess?: () => void;
}

const s = {
  text: { color: "hsl(var(--admin-text))" } as React.CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as React.CSSProperties,
  input: {
    background: "hsl(var(--admin-input-bg))",
    borderColor: "hsl(var(--admin-border))",
    color: "hsl(var(--admin-text))",
  } as React.CSSProperties,
};

const emptyTeklif = (): FakeTeklif => {
  const now = new Date();
  return {
    firma_adi: "",
    tutar: "",
    tarih: now.toISOString().split("T")[0],
    saat: now.toTimeString().slice(0, 5),
  };
};

export default function FakeTeklifDialog({ open, onOpenChange, ihaleId, ihaleBaslik, onSuccess }: FakeTeklifDialogProps) {
  const { token } = useAdminAuth();
  const callApi = useAdminApi();
  const { toast } = useToast();

  const [teklifler, setTeklifler] = useState<FakeTeklif[]>([emptyTeklif()]);
  const [existing, setExisting] = useState<ExistingFakeTeklif[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && ihaleId) {
      fetchExisting();
      setTeklifler([emptyTeklif()]);
    }
  }, [open, ihaleId]);

  const fetchExisting = async () => {
    setLoadingExisting(true);
    try {
      const data = await callApi("list-fake-teklifler", { token, ihaleId });
      setExisting(data?.teklifler || []);
    } catch {
      // silent
    } finally {
      setLoadingExisting(false);
    }
  };

  const addRow = () => setTeklifler([...teklifler, emptyTeklif()]);

  const removeRow = (idx: number) => {
    if (teklifler.length <= 1) return;
    setTeklifler(teklifler.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof FakeTeklif, value: string) => {
    const updated = [...teklifler];
    updated[idx] = { ...updated[idx], [field]: value };
    setTeklifler(updated);
  };

  const handleSubmit = async () => {
    const valid = teklifler.filter(t => t.firma_adi.trim() && t.tutar && Number(t.tutar) > 0);
    if (valid.length === 0) {
      toast({ title: "Hata", description: "En az bir geçerli teklif girin", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await callApi("add-fake-teklif", {
        token,
        ihaleId,
        teklifler: valid.map(t => ({
          firma_adi: t.firma_adi.trim(),
          tutar: Number(t.tutar),
          tarih: new Date(`${t.tarih}T${t.saat}:00`).toISOString(),
        })),
      });
      toast({ title: "Başarılı", description: `${valid.length} yapay teklif eklendi` });
      setTeklifler([emptyTeklif()]);
      fetchExisting();
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await callApi("delete-fake-teklif", { token, teklifId: id });
      setExisting(prev => prev.filter(t => t.id !== id));
      toast({ title: "Silindi" });
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Silinemedi", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto" style={{ backgroundColor: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))" }}>
        <DialogHeader>
          <DialogTitle style={s.text}>Yapay Teklif Oluştur</DialogTitle>
          <DialogDescription style={s.muted} className="text-xs">{ihaleBaslik}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label className="text-xs font-semibold" style={s.text}>Yeni Teklifler</Label>
          {teklifler.map((t, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_auto] gap-2 p-3 rounded-lg" style={{ background: "hsl(var(--admin-bg))", border: "1px solid hsl(var(--admin-border))" }}>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-[11px]" style={s.muted}>Firma Ünvanı</Label>
                  <Input
                    value={t.firma_adi}
                    onChange={e => updateRow(idx, "firma_adi", e.target.value)}
                    placeholder="Firma adı girin"
                    className="h-8 text-xs mt-1"
                    style={s.input}
                  />
                </div>
                <div>
                  <Label className="text-[11px]" style={s.muted}>Tutar (₺)</Label>
                  <Input
                    type="number"
                    value={t.tutar}
                    onChange={e => updateRow(idx, "tutar", e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs mt-1"
                    style={s.input}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <Label className="text-[11px]" style={s.muted}>Tarih</Label>
                    <Input
                      type="date"
                      value={t.tarih}
                      onChange={e => updateRow(idx, "tarih", e.target.value)}
                      className="h-8 text-xs mt-1"
                      style={s.input}
                    />
                  </div>
                  <div className="w-20">
                    <Label className="text-[11px]" style={s.muted}>Saat</Label>
                    <Input
                      type="time"
                      value={t.saat}
                      onChange={e => updateRow(idx, "saat", e.target.value)}
                      className="h-8 text-xs mt-1"
                      style={s.input}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-end">
                {teklifler.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeRow(idx)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow} className="text-xs h-8 gap-1" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text-secondary))" }}>
              <Plus className="w-3.5 h-3.5" /> Teklif Ekle
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={loading} className="text-xs h-8 gap-1 bg-amber-500 hover:bg-amber-600 text-white ml-auto">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Gönder
            </Button>
          </div>
        </div>

        {(existing.length > 0 || loadingExisting) && (
          <div className="mt-4 space-y-2">
            <Label className="text-xs font-semibold" style={s.text}>Mevcut Yapay Teklifler ({existing.length})</Label>
            {loadingExisting ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" style={s.muted} /></div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {existing.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg text-xs" style={{ background: "hsl(var(--admin-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium" style={s.text}>{t.fake_firma_adi}</span>
                      <div className="flex items-center gap-3 mt-0.5" style={s.muted}>
                        <span>₺{Number(t.tutar).toLocaleString("tr-TR")}</span>
                        <span>{formatDate(t.created_at)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 flex-shrink-0"
                    >
                      {deletingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
