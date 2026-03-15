import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Plus, Loader2, Calendar, TrendingUp, Users, Trophy, Trash2, Eye, Coins,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface PaketOption {
  id: string;
  ad: string;
  slug: string;
}

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
  birim_basi_prim: number;
  created_at: string;
  hedef_admin_ad?: string;
  hedef_admin_soyad?: string;
  hedef_admin_departman?: string;
  pkl_asim?: number;
  kazanilan_prim?: number;
}

interface AdminUser {
  id: string;
  ad: string;
  soyad: string;
  departman: string;
  pozisyon: string;
}

const HEDEF_TURLERI = [
  { value: "paket_uyeligi", label: "Paket Üyeliği", icon: "💳" },
  { value: "ciro", label: "Ciro", icon: "💰" },
  { value: "dis_arama", label: "Dış Arama", icon: "📞" },
  { value: "ziyaret", label: "Ziyaret", icon: "📍" },
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
  const [showPrim, setShowPrim] = useState<Hedef | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterDurum, setFilterDurum] = useState("aktif");

  // Create Form
  const [formAdmin, setFormAdmin] = useState("");
  const [formTur, setFormTur] = useState("paket_uyeligi");
  const [formBaslik, setFormBaslik] = useState("");
  const [formAciklama, setFormAciklama] = useState("");
  const [formMiktar, setFormMiktar] = useState("");
  const [formBaslangic, setFormBaslangic] = useState("");
  const [formBitis, setFormBitis] = useState("");
  const [formPaketler, setFormPaketler] = useState<string[]>([]);
  const [paketOptions, setPaketOptions] = useState<PaketOption[]>([]);

  // Prim Form
  const [primTutar, setPrimTutar] = useState("");

  const token = user ? localStorage.getItem("admin_token") || "" : "";
  const isYK = user?.departman === "Yönetim Kurulu";

  const callApi = useCallback(async (action: string, body: Record<string, unknown>) => {
    const res = await supabase.functions.invoke(`admin-auth/${action}`, { body });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  }, []);

  const loadPaketler = useCallback(async () => {
    const { data } = await supabase.from("paketler").select("id, ad, slug").eq("aktif", true).order("fiyat_aylik", { ascending: true });
    setPaketOptions((data || []).map((p: any) => ({ id: p.id, ad: p.ad, slug: p.slug || "" })));
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
  useEffect(() => { loadPaketler(); }, [loadPaketler]);

  const handleCreate = async () => {
    if (!formAdmin || !formBaslik || !formMiktar || !formBaslangic || !formBitis) {
      toast({ title: "Hata", description: "Tüm alanları doldurun.", variant: "destructive" });
      return;
    }
    if (formTur === "paket_uyeligi" && formPaketler.length === 0) {
      toast({ title: "Hata", description: "En az bir paket seçmelisiniz.", variant: "destructive" });
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
        hedefMiktar: formTur === "ciro" ? parseFloat(formMiktar) : parseInt(formMiktar),
        baslangicTarihi: formBaslangic,
        bitisTarihi: formBitis,
        hedefDetay: formTur === "paket_uyeligi" ? { paket_ids: formPaketler } : {},
      });
      toast({ title: "Başarılı", description: "PKL oluşturuldu." });
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
    if (!confirm("Bu PKL'yi silmek istediğinize emin misiniz?")) return;
    try {
      await callApi("delete-hedef", { token, hedefId: id });
      toast({ title: "Silindi" });
      loadHedefler();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
  };

  const handlePrimKaydet = async () => {
    if (!showPrim || !primTutar) return;
    setSaving(true);
    try {
      await callApi("update-pkl-prim", {
        token,
        hedefId: showPrim.id,
        birimBasiPrim: parseFloat(primTutar),
      });
      toast({ title: "Başarılı", description: "Prim tutarı güncellendi." });
      setShowPrim(null);
      setPrimTutar("");
      loadHedefler();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormAdmin(""); setFormTur("paket_uyeligi"); setFormBaslik(""); setFormAciklama("");
    setFormMiktar(""); setFormBaslangic(""); setFormBitis(""); setFormPaketler([]);
  };

  return (
    <AdminLayout title={isYK ? "PKL Yönetimi" : "PKL Hedeflerim"}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={s.text}>{isYK ? "PKL Yönetimi" : "PKL Hedeflerim"}</h1>
              <p className="text-sm" style={s.muted}>
                {isYK ? "Prim Kazanma Limiti belirleyin ve takip edin" : "Prim Kazanma Limitlerini takip edin"}
              </p>
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
                <Plus className="w-4 h-4 mr-2" /> PKL Ata
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
            <p style={s.muted}>Henüz PKL bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {hedefler.map(h => {
              const yuzde = h.hedef_miktar > 0 ? Math.min(100, Math.round((h.gerceklesen_miktar / h.hedef_miktar) * 100)) : 0;
              const pklAsildi = h.gerceklesen_miktar >= h.hedef_miktar;
              const pklAsim = h.pkl_asim || 0;
              const kazanilanPrim = h.kazanilan_prim || 0;
              const durumInfo = DURUM_BADGE[h.durum] || DURUM_BADGE.aktif;
              const turInfo = HEDEF_TURLERI.find(t => t.value === h.hedef_turu);
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={cn("text-xs", durumInfo.color)}>{durumInfo.label}</Badge>
                      {isYK && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 gap-1 text-amber-500 hover:text-amber-400 text-xs"
                          onClick={() => { setShowPrim(h); setPrimTutar(String(h.birim_basi_prim || "")); }}
                        >
                          <Coins className="w-3.5 h-3.5" /> Prim
                        </Button>
                      )}
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
                      <span style={s.muted}>
                        {h.hedef_turu === "ciro" ? `${h.gerceklesen_miktar.toLocaleString("tr-TR")} ₺ / ${h.hedef_miktar.toLocaleString("tr-TR")} ₺` : `${h.gerceklesen_miktar} / ${h.hedef_miktar} PKL`}
                      </span>
                      <span className="font-bold" style={{ color: pklAsildi ? "#22c55e" : "hsl(var(--admin-text))" }}>
                        {pklAsildi ? "✅ PKL Aşıldı" : `%${yuzde}`}
                      </span>
                    </div>
                    <Progress value={yuzde} className="h-2" />
                    {pklAsildi && (
                      <div className="flex items-center justify-between mt-1 px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--admin-input-bg))" }}>
                        <span className="text-xs" style={s.muted}>
                          PKL üzeri: <strong className="text-emerald-400">{pklAsim}</strong> işlem × {h.birim_basi_prim || 0} ₺
                        </span>
                        <span className="text-sm font-bold text-emerald-400">
                          🏆 {kazanilanPrim.toLocaleString("tr-TR")} ₺
                        </span>
                      </div>
                    )}
                    {!pklAsildi && h.birim_basi_prim > 0 && (
                      <p className="text-xs" style={s.muted}>
                        PKL sonrası her işlem için {h.birim_basi_prim} ₺ prim
                      </p>
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
              <DialogTitle style={s.text}>PKL Detayı</DialogTitle>
              <DialogDescription style={s.muted}>Prim Kazanma Limiti detay bilgileri</DialogDescription>
            </DialogHeader>
            {showDetail && (() => {
              const h = showDetail;
              const yuzde = h.hedef_miktar > 0 ? Math.min(100, Math.round((h.gerceklesen_miktar / h.hedef_miktar) * 100)) : 0;
              const pklAsildi = h.gerceklesen_miktar >= h.hedef_miktar;
              const pklAsim = h.pkl_asim || 0;
              const kazanilanPrim = h.kazanilan_prim || 0;
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
                      <span className="text-sm font-medium" style={s.text}>{h.gerceklesen_miktar} / {h.hedef_miktar} PKL</span>
                      <span className="text-sm font-bold" style={{ color: pklAsildi ? "#22c55e" : "#f59e0b" }}>
                        {pklAsildi ? "PKL Aşıldı ✅" : `%${yuzde}`}
                      </span>
                    </div>
                    <Progress value={yuzde} className="h-3" />
                  </div>

                  {/* Prim Bilgisi */}
                  <div className="p-3 rounded-lg" style={{ background: "hsl(var(--admin-input-bg))" }}>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={s.text}>
                      <Coins className="w-4 h-4 text-amber-500" /> Prim Bilgisi
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span style={s.muted}>Birim başı prim:</span>
                        <span style={s.text}>{h.birim_basi_prim || 0} ₺</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={s.muted}>PKL üzeri işlem:</span>
                        <span style={s.text}>{pklAsim}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1" style={{ borderColor: "hsl(var(--admin-border))" }}>
                        <span className="font-semibold" style={s.text}>Toplam kazanılan:</span>
                        <span className="font-bold text-emerald-400">{kazanilanPrim.toLocaleString("tr-TR")} ₺</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Prim Ayarla Dialog */}
        <Dialog open={!!showPrim} onOpenChange={() => { setShowPrim(null); setPrimTutar(""); }}>
          <DialogContent style={s.card} className="max-w-sm">
            <DialogHeader>
              <DialogTitle style={s.text}>Prim Ayarla</DialogTitle>
              <DialogDescription style={s.muted}>
                PKL aşıldıktan sonra her işlem için verilecek prim tutarını belirleyin
              </DialogDescription>
            </DialogHeader>
            {showPrim && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg" style={{ background: "hsl(var(--admin-input-bg))" }}>
                  <p className="text-sm font-medium" style={s.text}>{showPrim.baslik}</p>
                  <p className="text-xs mt-1" style={s.muted}>
                    PKL: {showPrim.hedef_miktar} {HEDEF_TURLERI.find(t => t.value === showPrim.hedef_turu)?.label}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block" style={s.text}>
                    Birim Başı Prim (₺)
                  </label>
                  <Input
                    type="number"
                    value={primTutar}
                    onChange={e => setPrimTutar(e.target.value)}
                    placeholder="Örn: 25"
                    style={s.input}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs mt-1.5" style={s.muted}>
                    PKL ({showPrim.hedef_miktar}) aşıldıktan sonra her ek işlem bu tutarla ödüllendirilir.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowPrim(null); setPrimTutar(""); }} style={s.input}>
                Vazgeç
              </Button>
              <Button onClick={handlePrimKaydet} disabled={saving || !primTutar} className="bg-amber-600 hover:bg-amber-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />}
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* PKL Oluştur Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent style={{ ...s.card, maxHeight: "90vh", overflowY: "auto" }} className="max-w-lg [&_[data-radix-popper-content-wrapper]]:!z-[9999]">
            <DialogHeader>
              <DialogTitle style={s.text}>Yeni PKL Ata</DialogTitle>
              <DialogDescription style={s.muted}>Personele Prim Kazanma Limiti belirleyin</DialogDescription>
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
                <label className="text-sm font-medium mb-1 block" style={s.text}>PKL Türü</label>
                <Select value={formTur} onValueChange={(v) => { setFormTur(v); setFormPaketler([]); }}>
                  <SelectTrigger style={s.input}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ ...s.card, zIndex: 9999 }} position="popper" sideOffset={4}>
                    {HEDEF_TURLERI.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Paket Üyeliği → Çoklu Paket Seçimi */}
              {formTur === "paket_uyeligi" && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block" style={s.text}>Hedeflenen Paketler *</label>
                  <div className="p-3 rounded-lg space-y-2" style={{ background: "hsl(var(--admin-input-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                    {paketOptions.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={formPaketler.includes(p.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setFormPaketler(prev => [...prev, p.id]);
                            else setFormPaketler(prev => prev.filter(id => id !== p.id));
                          }}
                        />
                        <span className="text-sm" style={s.text}>{p.ad}</span>
                      </label>
                    ))}
                    {paketOptions.length === 0 && <p className="text-xs" style={s.muted}>Paket bulunamadı.</p>}
                  </div>
                  <p className="text-xs mt-1" style={s.muted}>Seçilen paketlerle kapanan satışlar bu PKL'ye işlenecektir.</p>
                </div>
              )}

              {/* Ciro bilgi notu */}
              {formTur === "ciro" && (
                <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--admin-input-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                  <p style={s.muted}>
                    💡 Ciro hedefinde, PRO üyelik satışlarından elde edilen KDV'siz tutar otomatik olarak PKL'ye işlenir.
                  </p>
                </div>
              )}

              {/* Dış Arama bilgi notu */}
              {formTur === "dis_arama" && (
                <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--admin-input-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                  <p style={s.muted}>
                    💡 "Dış Arama (İlk)" ve "Dış Arama (Tekrar)" aksiyon türleri bu PKL'ye sayılacaktır.
                  </p>
                </div>
              )}

              {/* Ziyaret bilgi notu */}
              {formTur === "ziyaret" && (
                <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--admin-input-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                  <p style={s.muted}>
                    💡 "Ziyaret (İlk)" ve "Ziyaret (Tekrar)" aksiyon türleri bu PKL'ye sayılacaktır.
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block" style={s.text}>Başlık</label>
                <Input value={formBaslik} onChange={e => setFormBaslik(e.target.value)} placeholder="Örn: Mart ayı dış arama PKL" style={s.input} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" style={s.text}>Açıklama (opsiyonel)</label>
                <Textarea value={formAciklama} onChange={e => setFormAciklama(e.target.value)} style={s.input} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block" style={s.text}>
                    {formTur === "ciro" ? "Ciro Hedefi (₺)" : "PKL Limiti"}
                  </label>
                  <Input type="number" value={formMiktar} onChange={e => setFormMiktar(e.target.value)} placeholder={formTur === "ciro" ? "50000" : "100"} style={s.input} />
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
              <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--admin-input-bg))" }}>
                <p style={s.muted}>
                  💡 PKL oluşturduktan sonra kartın üzerindeki <strong>"Prim"</strong> butonuyla birim başı prim tutarını tanımlayabilirsiniz.
                  {formTur === "ciro" && " Ciro hedefinde prim, PKL üzeri ciro tutarı × birim başı prim oranı ile hesaplanır."}
                </p>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} style={s.input}>Vazgeç</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Target className="w-4 h-4 mr-2" />}
                PKL Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
