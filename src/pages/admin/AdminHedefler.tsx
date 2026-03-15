import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Plus, Loader2, Calendar, TrendingUp, Users, Trophy, Trash2, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const s = {
  card: { background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))", borderRadius: "0.75rem" } as CSSProperties,
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
  input: { background: "hsl(var(--admin-input-bg))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" } as CSSProperties,
};

interface Hedef {
  id: string;
  atayan_admin_id: string;
  hedef_admin_id: string;
  hedef_turu: string;
  baslik: string;
  aciklama: string | null;
  hedef_miktar: number;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  durum: string;
  gerceklesen_miktar: number;
  created_at: string;
  hedef_admin_ad?: string;
  hedef_admin_soyad?: string;
  hedef_admin_departman?: string;
  kademeler?: Kademe[];
}

interface Kademe {
  id: string;
  kademe_yuzdesi: number;
  prim_tutari: number;
}

interface AdminUser {
  id: string;
  ad: string;
  soyad: string;
  departman: string;
  pozisyon: string;
}

const HEDEF_TURLERI = [
  { value: "ziyaret", label: "Ziyaret Sayısı", icon: "📍" },
  { value: "aksiyon", label: "Aksiyon Sayısı", icon: "📋" },
  { value: "paket_satis", label: "Paket Satışı", icon: "💰" },
  { value: "firma_kaydi", label: "Firma Kaydı", icon: "🏢" },
];

const DURUM_BADGE: Record<string, { label: string; color: string }> = {
  aktif: { label: "Aktif", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  tamamlandi: { label: "Tamamlandı", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  iptal: { label: "İptal", color: "bg-red-500/10 text-red-500 border-red-500/20" },
};

export default function AdminHedefler() {
  const { user } = useAdminAuth();
  const { toast } = useToast();
  const [hedefler, setHedefler] = useState<Hedef[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Hedef | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterDurum, setFilterDurum] = useState("aktif");

  // Form
  const [formAdmin, setFormAdmin] = useState("");
  const [formTur, setFormTur] = useState("ziyaret");
  const [formBaslik, setFormBaslik] = useState("");
  const [formAciklama, setFormAciklama] = useState("");
  const [formMiktar, setFormMiktar] = useState("");
  const [formBaslangic, setFormBaslangic] = useState("");
  const [formBitis, setFormBitis] = useState("");
  const [formKademeler, setFormKademeler] = useState<{ yuzde: string; tutar: string }[]>([
    { yuzde: "50", tutar: "" },
    { yuzde: "75", tutar: "" },
    { yuzde: "100", tutar: "" },
  ]);

  const token = user ? localStorage.getItem("admin_token") || "" : "";
  const isYK = user?.departman === "Yönetim Kurulu";

  const callApi = useCallback(async (action: string, body: Record<string, unknown>) => {
    const res = await supabase.functions.invoke(`admin-auth/${action}`, { body });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  }, []);

  const loadHedefler = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await callApi("list-hedefler", { token, adminId: isYK ? undefined : user.id, durum: filterDurum });
      setHedefler(data.hedefler || []);
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, token, filterDurum, isYK, callApi, toast]);

  const loadAdminUsers = useCallback(async () => {
    if (!isYK) return;
    try {
      const data = await callApi("list-admin-users", { token });
      setAdminUsers((data.users || []).filter((u: AdminUser) => u.departman !== "Yönetim Kurulu"));
    } catch {}
  }, [isYK, token, callApi]);

  useEffect(() => { loadHedefler(); }, [loadHedefler]);
  useEffect(() => { loadAdminUsers(); }, [loadAdminUsers]);

  const handleCreate = async () => {
    if (!formAdmin || !formBaslik || !formMiktar || !formBaslangic || !formBitis) {
      toast({ title: "Hata", description: "Tüm alanları doldurun.", variant: "destructive" });
      return;
    }
    const validKademeler = formKademeler.filter(k => k.yuzde && k.tutar);
    if (validKademeler.length === 0) {
      toast({ title: "Hata", description: "En az bir kademe girin.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await callApi("create-hedef", {
        token,
        hedefAdminId: formAdmin,
        hedefTuru: formTur,
        baslik: formBaslik,
        aciklama: formAciklama || null,
        hedefMiktar: parseInt(formMiktar),
        baslangicTarihi: formBaslangic,
        bitisTarihi: formBitis,
        kademeler: validKademeler.map(k => ({ kademe_yuzdesi: parseInt(k.yuzde), prim_tutari: parseFloat(k.tutar) })),
      });
      toast({ title: "Başarılı", description: "Hedef oluşturuldu." });
      setShowCreate(false);
      resetForm();
      loadHedefler();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu hedefi silmek istediğinize emin misiniz?")) return;
    try {
      await callApi("delete-hedef", { token, hedefId: id });
      toast({ title: "Silindi" });
      loadHedefler();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormAdmin(""); setFormTur("ziyaret"); setFormBaslik(""); setFormAciklama("");
    setFormMiktar(""); setFormBaslangic(""); setFormBitis("");
    setFormKademeler([{ yuzde: "50", tutar: "" }, { yuzde: "75", tutar: "" }, { yuzde: "100", tutar: "" }]);
  };

  const addKademe = () => setFormKademeler(prev => [...prev, { yuzde: "", tutar: "" }]);
  const removeKademe = (i: number) => setFormKademeler(prev => prev.filter((_, idx) => idx !== i));
  const updateKademe = (i: number, field: "yuzde" | "tutar", val: string) =>
    setFormKademeler(prev => prev.map((k, idx) => idx === i ? { ...k, [field]: val } : k));

  return (
    <AdminLayout title={isYK ? "Hedef Yönetimi" : "Hedeflerim"}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={s.text}>{isYK ? "Hedef Yönetimi" : "Hedeflerim"}</h1>
              <p className="text-sm" style={s.muted}>{isYK ? "Personellere hedef atayın ve takip edin" : "Atanmış hedeflerinizi takip edin"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterDurum} onValueChange={setFilterDurum}>
              <SelectTrigger className="w-32" style={s.input}><SelectValue /></SelectTrigger>
              <SelectContent style={s.card}>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="tamamlandi">Tamamlandı</SelectItem>
                <SelectItem value="iptal">İptal</SelectItem>
                <SelectItem value="tumu">Tümü</SelectItem>
              </SelectContent>
            </Select>
            {isYK && (
              <Button onClick={() => { resetForm(); setShowCreate(true); }} className="bg-amber-600 hover:bg-amber-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Hedef Ata
              </Button>
            )}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : hedefler.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={s.card}>
            <Trophy className="w-12 h-12 mx-auto mb-3 text-amber-500/30" />
            <p style={s.muted}>Henüz hedef bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {hedefler.map(h => {
              const yuzde = h.hedef_miktar > 0 ? Math.min(100, Math.round((h.gerceklesen_miktar / h.hedef_miktar) * 100)) : 0;
              const durumInfo = DURUM_BADGE[h.durum] || DURUM_BADGE.aktif;
              const turInfo = HEDEF_TURLERI.find(t => t.value === h.hedef_turu);
              const kazanilanKademe = (h.kademeler || [])
                .filter(k => yuzde >= k.kademe_yuzdesi)
                .sort((a, b) => b.kademe_yuzdesi - a.kademe_yuzdesi)[0];
              return (
                <div key={h.id} className="p-4 rounded-xl" style={s.card}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{turInfo?.icon || "🎯"}</span>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate" style={s.text}>{h.baslik}</h3>
                        <p className="text-xs" style={s.muted}>
                          {isYK && h.hedef_admin_ad && `${h.hedef_admin_ad} ${h.hedef_admin_soyad} • `}
                          {turInfo?.label} • {format(new Date(h.baslangic_tarihi), "dd MMM", { locale: tr })} - {format(new Date(h.bitis_tarihi), "dd MMM yyyy", { locale: tr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("text-xs", durumInfo.color)}>{durumInfo.label}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowDetail(h)}>
                        <Eye className="w-4 h-4" style={s.muted} />
                      </Button>
                      {isYK && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(h.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span style={s.muted}>{h.gerceklesen_miktar} / {h.hedef_miktar}</span>
                      <span className="font-bold" style={{ color: yuzde >= 100 ? "#22c55e" : yuzde >= 75 ? "#f59e0b" : "hsl(var(--admin-text))" }}>%{yuzde}</span>
                    </div>
                    <Progress value={yuzde} className="h-2" />
                    {kazanilanKademe && (
                      <p className="text-xs text-emerald-400">🏆 %{kazanilanKademe.kademe_yuzdesi} kademe - {kazanilanKademe.prim_tutari.toLocaleString("tr-TR")} ₺ prim</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detay Dialog */}
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent style={s.card} className="max-w-lg">
            <DialogHeader>
              <DialogTitle style={s.text}>Hedef Detayı</DialogTitle>
            </DialogHeader>
            {showDetail && (() => {
              const h = showDetail;
              const yuzde = h.hedef_miktar > 0 ? Math.min(100, Math.round((h.gerceklesen_miktar / h.hedef_miktar) * 100)) : 0;
              const turInfo = HEDEF_TURLERI.find(t => t.value === h.hedef_turu);
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{turInfo?.icon || "🎯"}</span>
                    <div>
                      <h3 className="font-bold text-lg" style={s.text}>{h.baslik}</h3>
                      <p className="text-sm" style={s.muted}>{turInfo?.label}</p>
                    </div>
                  </div>
                  {h.aciklama && <p className="text-sm" style={s.muted}>{h.aciklama}</p>}
                  {isYK && h.hedef_admin_ad && (
                    <div className="flex items-center gap-2 text-sm" style={s.muted}>
                      <Users className="w-4 h-4" /> {h.hedef_admin_ad} {h.hedef_admin_soyad} ({h.hedef_admin_departman})
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm" style={s.muted}>
                    <Calendar className="w-4 h-4" />
                    {format(new Date(h.baslangic_tarihi), "dd MMMM yyyy", { locale: tr })} - {format(new Date(h.bitis_tarihi), "dd MMMM yyyy", { locale: tr })}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={s.text}>{h.gerceklesen_miktar} / {h.hedef_miktar}</span>
                      <span className="text-sm font-bold" style={{ color: yuzde >= 100 ? "#22c55e" : "#f59e0b" }}>%{yuzde}</span>
                    </div>
                    <Progress value={yuzde} className="h-3" />
                  </div>
                  {(h.kademeler || []).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2" style={s.text}>Prim Kademeleri</h4>
                      <div className="space-y-1">
                        {(h.kademeler || []).sort((a, b) => a.kademe_yuzdesi - b.kademe_yuzdesi).map(k => {
                          const reached = yuzde >= k.kademe_yuzdesi;
                          return (
                            <div key={k.id} className={cn("flex justify-between items-center px-3 py-2 rounded-lg text-sm", reached ? "bg-emerald-500/10" : "bg-white/5")} style={s.text}>
                              <span>%{k.kademe_yuzdesi} {reached ? "✅" : ""}</span>
                              <span className="font-semibold">{k.prim_tutari.toLocaleString("tr-TR")} ₺</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Oluştur Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent style={{ ...s.card, maxHeight: "90vh", overflowY: "auto" }} className="max-w-lg [&_[data-radix-popper-content-wrapper]]:!z-[9999]">
            <DialogHeader>
              <DialogTitle style={s.text}>Yeni Hedef Ata</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block" style={s.text}>Personel</label>
                <Select value={formAdmin} onValueChange={setFormAdmin}>
                  <SelectTrigger style={s.input}><SelectValue placeholder="Personel seçin" /></SelectTrigger>
                   <SelectContent style={{ ...s.card, zIndex: 9999 }} position="popper" sideOffset={4}>
                    {adminUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.ad} {u.soyad} ({u.departman})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" style={s.text}>Hedef Türü</label>
                <Select value={formTur} onValueChange={setFormTur}>
                  <SelectTrigger style={s.input}><SelectValue /></SelectTrigger>
                  <SelectContent style={s.card}>
                    {HEDEF_TURLERI.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" style={s.text}>Başlık</label>
                <Input value={formBaslik} onChange={e => setFormBaslik(e.target.value)} placeholder="Örn: Mart ayı ziyaret hedefi" style={s.input} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" style={s.text}>Açıklama (opsiyonel)</label>
                <Textarea value={formAciklama} onChange={e => setFormAciklama(e.target.value)} style={s.input} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block" style={s.text}>Hedef Miktar</label>
                  <Input type="number" value={formMiktar} onChange={e => setFormMiktar(e.target.value)} style={s.input} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block" style={s.text}>Başlangıç</label>
                  <Input type="date" value={formBaslangic} onChange={e => setFormBaslangic(e.target.value)} style={s.input} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block" style={s.text}>Bitiş</label>
                  <Input type="date" value={formBitis} onChange={e => setFormBitis(e.target.value)} style={s.input} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold" style={s.text}>Prim Kademeleri</label>
                  <Button variant="ghost" size="sm" onClick={addKademe} className="text-amber-500 text-xs"><Plus className="w-3 h-3 mr-1" /> Kademe Ekle</Button>
                </div>
                <div className="space-y-2">
                  {formKademeler.map((k, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="number" placeholder="% oran" value={k.yuzde} onChange={e => updateKademe(i, "yuzde", e.target.value)} className="w-24" style={s.input} />
                      <Input type="number" placeholder="Prim tutarı (₺)" value={k.tutar} onChange={e => updateKademe(i, "tutar", e.target.value)} className="flex-1" style={s.input} />
                      {formKademeler.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeKademe(i)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} style={s.input}>Vazgeç</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Target className="w-4 h-4 mr-2" />}
                Hedef Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
