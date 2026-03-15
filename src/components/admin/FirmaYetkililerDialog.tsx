import { useState, useEffect, CSSProperties } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Loader2, Plus, Trash2, User, Phone, Mail, MapPin, Linkedin, ChevronDown, ChevronUp, Edit2, X, Check } from "lucide-react";

const s = {
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
  card: {
    background: "hsl(var(--admin-card-bg))",
    border: "1px solid hsl(var(--admin-border))",
  } as CSSProperties,
  input: {
    background: "hsl(var(--admin-input-bg))",
    borderColor: "hsl(var(--admin-border))",
    color: "hsl(var(--admin-text))",
  } as CSSProperties,
};

interface Yetkili {
  id: string;
  ad: string;
  soyad: string;
  pozisyon: string | null;
  email: string | null;
  telefon: string | null;
  dahili_no: string | null;
  il: string | null;
  ilce: string | null;
  linkedin: string | null;
  aciklama: string | null;
  admin_ad: string;
  created_at: string;
}

interface FirmaYetkililerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firmaId: string;
  firmaUnvani: string;
  callApi: (action: string, body: Record<string, unknown>) => Promise<any>;
  token: string;
}

const emptyForm = { ad: "", soyad: "", pozisyon: "", email: "", telefon: "", dahili_no: "", il: "", ilce: "", linkedin: "", aciklama: "" };

export default function FirmaYetkililerDialog({ open, onOpenChange, firmaId, firmaUnvani, callApi, token }: FirmaYetkililerDialogProps) {
  const [yetkililer, setYetkililer] = useState<Yetkili[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchYetkililer = async () => {
    setLoading(true);
    try {
      const data = await callApi("list-yetkililer", { token, firmaId });
      setYetkililer(data.yetkililer || []);
    } catch {
      setYetkililer([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && firmaId) fetchYetkililer();
    if (!open) { setShowForm(false); setForm(emptyForm); setExpandedId(null); }
  }, [open, firmaId]);

  const handleSubmit = async () => {
    if (!form.ad.trim() || !form.soyad.trim()) return;
    setSaving(true);
    try {
      await callApi("create-yetkili", { token, firmaId, ...form });
      setForm(emptyForm);
      setShowForm(false);
      fetchYetkililer();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await callApi("delete-yetkili", { token, yetkiliId: id });
    fetchYetkililer();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-semibold" style={s.text}>Yetkili Kişiler</DialogTitle>
              <p className="text-xs mt-0.5" style={s.muted}>{firmaUnvani}</p>
            </div>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-7 text-xs" onClick={() => setShowForm(!showForm)}>
              {showForm ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
              {showForm ? "İptal" : "Ekle"}
            </Button>
          </div>
        </DialogHeader>

        {/* Add form */}
        {showForm && (
          <div className="space-y-2 p-3 rounded-lg mt-2" style={{ background: "hsl(var(--admin-hover))" }}>
            <p className="text-xs font-semibold mb-2" style={s.text}>Yeni Yetkili Kişi</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={s.muted}>Ad *</label>
                <Input value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} className="h-8 text-xs" style={s.input} placeholder="Ad" />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={s.muted}>Soyad *</label>
                <Input value={form.soyad} onChange={e => setForm(f => ({ ...f, soyad: e.target.value }))} className="h-8 text-xs" style={s.input} placeholder="Soyad" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={s.muted}>Pozisyon</label>
              <Input value={form.pozisyon} onChange={e => setForm(f => ({ ...f, pozisyon: e.target.value }))} className="h-8 text-xs" style={s.input} placeholder="Örn: Satın Alma Müdürü" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={s.muted}>E-posta</label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-xs" style={s.input} placeholder="E-posta" />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={s.muted}>Telefon</label>
                <Input value={form.telefon} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))} className="h-8 text-xs" style={s.input} placeholder="Telefon" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={s.muted}>Dahili No</label>
                <Input value={form.dahili_no} onChange={e => setForm(f => ({ ...f, dahili_no: e.target.value }))} className="h-8 text-xs" style={s.input} placeholder="Dahili" />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={s.muted}>İl</label>
                <Input value={form.il} onChange={e => setForm(f => ({ ...f, il: e.target.value }))} className="h-8 text-xs" style={s.input} placeholder="İl" />
              </div>
              <div>
                <label className="text-[10px] font-medium mb-0.5 block" style={s.muted}>İlçe</label>
                <Input value={form.ilce} onChange={e => setForm(f => ({ ...f, ilce: e.target.value }))} className="h-8 text-xs" style={s.input} placeholder="İlçe" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={s.muted}>LinkedIn</label>
              <Input value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} className="h-8 text-xs" style={s.input} placeholder="LinkedIn profil URL" />
            </div>
            <div>
              <label className="text-[10px] font-medium mb-0.5 block" style={s.muted}>Açıklama</label>
              <Textarea value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} className="text-xs min-h-[50px]" style={s.input} placeholder="Notlar..." />
            </div>
            <Button onClick={handleSubmit} disabled={saving || !form.ad.trim() || !form.soyad.trim()} className="w-full bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs mt-1">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Kaydet"}
            </Button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          </div>
        ) : yetkililer.length === 0 && !showForm ? (
          <div className="text-center py-8">
            <User className="w-8 h-8 mx-auto mb-2 opacity-20" style={s.muted} />
            <p className="text-xs" style={s.muted}>Henüz yetkili kişi eklenmemiş</p>
          </div>
        ) : (
          <div className="space-y-1.5 mt-2">
            {yetkililer.map(y => (
              <YetkiliCard key={y.id} yetkili={y} expanded={expandedId === y.id} onToggle={() => setExpandedId(expandedId === y.id ? null : y.id)} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function YetkiliCard({ yetkili, expanded, onToggle, onDelete }: { yetkili: Yetkili; expanded: boolean; onToggle: () => void; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-lg transition-colors" style={{ background: "hsl(var(--admin-hover))" }}>
      <div className="flex items-center gap-2.5 p-2.5 cursor-pointer" onClick={onToggle}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
          <User className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate" style={{ color: "hsl(var(--admin-text))" }}>{yetkili.ad} {yetkili.soyad}</span>
            {yetkili.pozisyon && (
              <Badge className="text-[9px] px-1 py-0" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", borderColor: "rgba(59,130,246,0.3)" }}>{yetkili.pozisyon}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {yetkili.email && <span className="text-[10px] truncate" style={{ color: "hsl(var(--admin-muted))" }}>{yetkili.email}</span>}
            {yetkili.telefon && <span className="text-[10px]" style={{ color: "hsl(var(--admin-muted))" }}>{yetkili.telefon}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onDelete(yetkili.id); }} className="opacity-40 hover:opacity-100 transition-opacity p-1">
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "hsl(var(--admin-muted))" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "hsl(var(--admin-muted))" }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-1 border-t" style={{ borderColor: "hsl(var(--admin-border))" }}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2">
            {yetkili.email && <DetailRow icon={Mail} label="E-posta" value={yetkili.email} />}
            {yetkili.telefon && <DetailRow icon={Phone} label="Telefon" value={yetkili.telefon} />}
            {yetkili.dahili_no && <DetailRow icon={Phone} label="Dahili" value={yetkili.dahili_no} />}
            {(yetkili.il || yetkili.ilce) && <DetailRow icon={MapPin} label="Konum" value={[yetkili.ilce, yetkili.il].filter(Boolean).join(", ")} />}
            {yetkili.linkedin && <DetailRow icon={Linkedin} label="LinkedIn" value={yetkili.linkedin} isLink />}
          </div>
          {yetkili.aciklama && (
            <p className="text-[11px] mt-1 p-1.5 rounded" style={{ color: "hsl(var(--admin-muted))", background: "hsl(var(--admin-card-bg))" }}>{yetkili.aciklama}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px]" style={{ color: "hsl(var(--admin-muted))" }}>Ekleyen: {yetkili.admin_ad}</span>
            <span className="text-[10px]" style={{ color: "hsl(var(--admin-muted))" }}>• {format(new Date(yetkili.created_at), "dd MMM yyyy", { locale: tr })}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, isLink }: { icon: typeof Mail; label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(var(--admin-muted))" }} />
      <span className="text-[10px]" style={{ color: "hsl(var(--admin-muted))" }}>{label}:</span>
      {isLink ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-500 hover:underline truncate">{value}</a>
      ) : (
        <span className="text-[10px] truncate" style={{ color: "hsl(var(--admin-text))" }}>{value}</span>
      )}
    </div>
  );
}
