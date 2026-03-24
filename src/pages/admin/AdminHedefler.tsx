import { useAdminTitle } from "@/components/admin/AdminLayout";
import { useState, useEffect, useCallback, CSSProperties } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAdminApi } from "@/hooks/use-admin-api";
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
  Target, Plus, Loader2, Calendar, Users, Trophy, Trash2, Eye, Coins, Layers,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface PaketOption { id: string; ad: string; slug: string; }

const s = {
  card: { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem" } as CSSProperties,
  text: { color: "hsl(var(--foreground))" } as CSSProperties,
  muted: { color: "hsl(var(--muted-foreground))" } as CSSProperties,
  input: { backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" } as CSSProperties,
};

interface Kademe {
  alt: number;
  ust: number;
  oran: number;
  birimi: "tl" | "usd" | "yuzde";
}

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
  kazanilan_prim_birimi?: string;
  kademe_detay?: { kademe: number; miktar: number; prim: number }[];
  hedef_detay?: Record<string, any>;
}

interface AdminUser { id: string; ad: string; soyad: string; departman: string; pozisyon: string; }

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

function birimiSymbol(b: string) {
  if (b === "usd") return "$";
  if (b === "yuzde") return "%";
  return "₺";
}

function formatPrimRate(rate: number, birimi: string): string {
  if (birimi === "yuzde") return `%${rate}`;
  return `${rate} ${birimiSymbol(birimi)}`;
}

function formatPrimValue(value: number, birimi: string): string {
  if (birimi === "yuzde" || birimi === "usd") return `${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} $`;
  return `${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

function getKademeler(h: Hedef): Kademe[] {
  return (h.hedef_detay?.kademeler as Kademe[]) || [];
}

function hasKademeler(h: Hedef): boolean {
  return getKademeler(h).length > 0;
}

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

  const [formAdmin, setFormAdmin] = useState("");
  const [formTur, setFormTur] = useState("paket_uyeligi");
  const [formBaslik, setFormBaslik] = useState("");
  const [formAciklama, setFormAciklama] = useState("");
  const [formMiktar, setFormMiktar] = useState("");
  const [formBaslangic, setFormBaslangic] = useState("");
  const [formBitis, setFormBitis] = useState("");
  const [formPaketler, setFormPaketler] = useState<string[]>([]);
  const [paketOptions, setPaketOptions] = useState<PaketOption[]>([]);

  // Kademe form
  const [primKademeler, setPrimKademeler] = useState<Kademe[]>([]);

  const token = user ? localStorage.getItem("admin_token") || "" : "";
  const isYK = user?.departman === "Yönetim Kurulu";
  useAdminTitle(isYK ? "PKL Yönetimi" : "PKL Hedeflerim");
  const callApi = useAdminApi();

  const loadPaketler = useCallback(async () => {
    const { data } = await supabase.from("paketler").select("id, ad, slug").eq("aktif", true).order("fiyat_aylik", { ascending: true });
    setPaketOptions((data || []).map((p: any) => ({ id: p.id, ad: p.ad, slug: p.slug || "" })));
  }, []);

  const loadHedefler = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_hedefler_v2", {
        p_admin_id: isYK ? undefined : user.id,
        p_durum: filterDurum === "all" ? undefined : filterDurum,
      });
      if (error) throw error;
      setHedefler((data as any) || []);
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, filterDurum, isYK, toast]);

  const loadAdminUsers = useCallback(async () => {
    if (!isYK) return;
    try {
      const { data, error } = await supabase.rpc("admin_list_admin_users_v2");
      if (error) throw error;
      setAdminUsers(((data as any) || []).filter((u: AdminUser) => u.departman !== "Yönetim Kurulu"));
    } catch {}
  }, [isYK]);

  useEffect(() => { loadHedefler(); }, [loadHedefler]);
  useEffect(() => { loadAdminUsers(); }, [loadAdminUsers]);
  useEffect(() => { loadPaketler(); }, [loadPaketler]);

  const handleCreate = async () => {
    if (!formAdmin || !formBaslik || !formMiktar || !formBaslangic || !formBitis) {
      toast({ title: "Hata", description: "Tüm alanları doldurun.", variant: "destructive" }); return;
    }
    if (formTur === "paket_uyeligi" && formPaketler.length === 0) {
      toast({ title: "Hata", description: "En az bir paket seçmelisiniz.", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await callApi("create-hedef", {
        token, hedefAdminId: formAdmin, hedefTuru: formTur, baslik: formBaslik,
        aciklama: formAciklama || null,
        hedefMiktar: formTur === "ciro" ? parseFloat(formMiktar) : parseInt(formMiktar),
        baslangicTarihi: formBaslangic, bitisTarihi: formBitis,
        hedefDetay: formTur === "paket_uyeligi" ? { paket_ids: formPaketler } : {},
      });
      toast({ title: "Başarılı", description: "PKL oluşturuldu." });
      setShowCreate(false); resetForm(); loadHedefler();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu PKL'yi silmek istediğinize emin misiniz?")) return;
    try {
      await callApi("delete-hedef", { token, hedefId: id });
      toast({ title: "Silindi" }); loadHedefler();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
  };

  const handlePrimKaydet = async () => {
    if (!showPrim) return;
    // Validate kademeler
    for (let i = 0; i < primKademeler.length; i++) {
      const k = primKademeler[i];
      if (!k.alt || !k.ust || !k.oran) {
        toast({ title: "Hata", description: `Kademe ${i + 1}: Tüm alanları doldurun.`, variant: "destructive" }); return;
      }
      if (k.ust <= k.alt) {
        toast({ title: "Hata", description: `Kademe ${i + 1}: Üst sınır, alt sınırdan büyük olmalı.`, variant: "destructive" }); return;
      }
      if (k.alt <= showPrim.hedef_miktar && i === 0) {
        // First tier alt should be > PKL
      }
    }
    if (primKademeler.length === 0) {
      toast({ title: "Hata", description: "En az bir kademe ekleyin.", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await callApi("update-pkl-prim", {
        token, hedefId: showPrim.id,
        kademeler: primKademeler,
      });
      toast({ title: "Başarılı", description: "Prim kademeleri güncellendi." });
      setShowPrim(null); setPrimKademeler([]); loadHedefler();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const addKademe = () => {
    if (!showPrim) return;
    const existing = primKademeler;
    const lastUst = existing.length > 0 ? existing[existing.length - 1].ust : showPrim.hedef_miktar;
    const isCiro = showPrim.hedef_turu === "ciro";
    setPrimKademeler([...existing, {
      alt: lastUst + 1,
      ust: isCiro ? lastUst + 5000 : lastUst + 20,
      oran: isCiro ? 10 : 5,
      birimi: isCiro ? "yuzde" : "tl",
    }]);
  };

  const updateKademe = (idx: number, field: keyof Kademe, value: any) => {
    setPrimKademeler(prev => prev.map((k, i) => i === idx ? { ...k, [field]: value } : k));
  };

  const removeKademe = (idx: number) => {
    setPrimKademeler(prev => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setFormAdmin(""); setFormTur("paket_uyeligi"); setFormBaslik(""); setFormAciklama("");
    setFormMiktar(""); setFormBaslangic(""); setFormBitis(""); setFormPaketler([]);
  };

  const openPrimDialog = (h: Hedef) => {
    setShowPrim(h);
    const existing = getKademeler(h);
    if (existing.length > 0) {
      setPrimKademeler(existing.map(k => ({ ...k })));
    } else if (h.birim_basi_prim > 0) {
      // Legacy: convert single prim to one kademe
      const pb = (h.hedef_detay?.prim_birimi as string) || "tl";
      setPrimKademeler([{
        alt: h.hedef_miktar + 1,
        ust: h.hedef_miktar + 99999,
        oran: h.birim_basi_prim,
        birimi: pb as Kademe["birimi"],
      }]);
    } else {
      setPrimKademeler([]);
    }
  };

  return (
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
              const kazanilanBirimi = h.kazanilan_prim_birimi || "tl";
              const durumInfo = DURUM_BADGE[h.durum] || DURUM_BADGE.aktif;
              const turInfo = HEDEF_TURLERI.find(t => t.value === h.hedef_turu);
              const isCiro = h.hedef_turu === "ciro";
              const kademeler = getKademeler(h);
              const kademeDetay = h.kademe_detay || [];
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
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-amber-500 hover:text-amber-400 text-xs"
                          onClick={() => openPrimDialog(h)}>
                          <Layers className="w-3.5 h-3.5" /> Kademe
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
                        {isCiro
                          ? `${h.gerceklesen_miktar.toLocaleString("tr-TR")} $ / ${h.hedef_miktar.toLocaleString("tr-TR")} $`
                          : `${h.gerceklesen_miktar} / ${h.hedef_miktar} PKL`}
                      </span>
                      <span className="font-bold" style={{ color: pklAsildi ? "#22c55e" : "hsl(var(--admin-text))" }}>
                        {pklAsildi ? "✅ PKL Aşıldı" : `%${yuzde}`}
                      </span>
                    </div>
                    <Progress value={yuzde} className="h-2" />
                    {pklAsildi && kademeler.length > 0 && (
                      <div className="mt-1 px-2 py-1.5 rounded-lg space-y-1" style={{ background: "hsl(var(--admin-input-bg))" }}>
                        {kademeDetay.length > 0 ? kademeDetay.map((kd, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span style={s.muted}>
                              {i + 1}. Kademe ({kademeler[i]?.alt}-{kademeler[i]?.ust}): <strong className="text-emerald-400">{kd.miktar} {isCiro ? "$" : "işlem"}</strong> × {formatPrimRate(kademeler[i]?.oran || 0, kademeler[i]?.birimi || "tl")}
                            </span>
                            <span className="font-semibold text-emerald-400">{formatPrimValue(kd.prim, kademeler[i]?.birimi || "tl")}</span>
                          </div>
                        )) : (
                          <div className="flex items-center justify-between text-xs">
                            <span style={s.muted}>PKL üzeri: <strong className="text-emerald-400">{isCiro ? `${pklAsim.toLocaleString("tr-TR")} $` : `${pklAsim} işlem`}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t pt-1" style={{ borderColor: "hsl(var(--admin-border))" }}>
                          <span className="text-xs font-semibold" style={s.text}>Toplam Prim:</span>
                          <span className="text-sm font-bold text-emerald-400">🏆 {formatPrimValue(kazanilanPrim, kazanilanBirimi)}</span>
                        </div>
                      </div>
                    )}
                    {pklAsildi && kademeler.length === 0 && h.birim_basi_prim > 0 && (
                      <div className="flex items-center justify-between mt-1 px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--admin-input-bg))" }}>
                        <span className="text-xs" style={s.muted}>
                          PKL üzeri: <strong className="text-emerald-400">{isCiro ? `${pklAsim.toLocaleString("tr-TR")} $` : `${pklAsim} işlem`}</strong> × {h.birim_basi_prim} ₺
                        </span>
                        <span className="text-sm font-bold text-emerald-400">🏆 {kazanilanPrim.toLocaleString("tr-TR")} ₺</span>
                      </div>
                    )}
                    {!pklAsildi && kademeler.length > 0 && (
                      <p className="text-xs" style={s.muted}>
                        {kademeler.length} kademeli prim tanımlı
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
              const kazanilanBirimi = h.kazanilan_prim_birimi || "tl";
              const turInfo = HEDEF_TURLERI.find(t => t.value === h.hedef_turu);
              const isCiro = h.hedef_turu === "ciro";
              const kademeler = getKademeler(h);
              const kademeDetay = h.kademe_detay || [];
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
                      <span className="text-sm font-medium" style={s.text}>
                        {isCiro
                          ? `${h.gerceklesen_miktar.toLocaleString("tr-TR")} $ / ${h.hedef_miktar.toLocaleString("tr-TR")} $`
                          : `${h.gerceklesen_miktar} / ${h.hedef_miktar} PKL`}
                      </span>
                      <span className="text-sm font-bold" style={{ color: pklAsildi ? "#22c55e" : "#f59e0b" }}>
                        {pklAsildi ? "PKL Aşıldı ✅" : `%${yuzde}`}
                      </span>
                    </div>
                    <Progress value={yuzde} className="h-3" />
                  </div>

                  {/* Kademe Bilgisi */}
                  <div className="p-3 rounded-lg" style={{ background: "hsl(var(--admin-input-bg))" }}>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={s.text}>
                      <Layers className="w-4 h-4 text-amber-500" /> Prim Kademeleri
                    </h4>
                    {kademeler.length > 0 ? (
                      <div className="space-y-2">
                        {kademeler.map((k, i) => {
                          const kd = kademeDetay[i];
                          return (
                            <div key={i} className="flex items-center justify-between text-sm p-2 rounded" style={{ background: "hsl(var(--admin-card-bg))" }}>
                              <div>
                                <span className="font-medium" style={s.text}>{i + 1}. Kademe</span>
                                <span className="text-xs ml-2" style={s.muted}>({k.alt.toLocaleString("tr-TR")} - {k.ust.toLocaleString("tr-TR")})</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold" style={s.text}>{formatPrimRate(k.oran, k.birimi)}</span>
                                {kd && <span className="text-xs text-emerald-400 ml-2">→ {formatPrimValue(kd.prim, k.birimi)}</span>}
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex justify-between border-t pt-2" style={{ borderColor: "hsl(var(--admin-border))" }}>
                          <span className="font-semibold" style={s.text}>Toplam Prim:</span>
                          <span className="font-bold text-emerald-400">{formatPrimValue(kazanilanPrim, kazanilanBirimi)}</span>
                        </div>
                      </div>
                    ) : h.birim_basi_prim > 0 ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span style={s.muted}>Birim başı prim:</span>
                          <span style={s.text}>{h.birim_basi_prim} ₺</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={s.muted}>PKL üzeri:</span>
                          <span style={s.text}>{pklAsim}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1" style={{ borderColor: "hsl(var(--admin-border))" }}>
                          <span className="font-semibold" style={s.text}>Toplam:</span>
                          <span className="font-bold text-emerald-400">{kazanilanPrim.toLocaleString("tr-TR")} ₺</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm" style={s.muted}>Henüz prim kademe tanımlanmamış.</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Kademe Prim Ayarla Dialog */}
        <Dialog open={!!showPrim} onOpenChange={() => { setShowPrim(null); setPrimKademeler([]); }}>
          <DialogContent style={{ ...s.card, maxHeight: "90vh", overflowY: "auto" }} className="max-w-xl [&_[data-radix-popper-content-wrapper]]:!z-[9999]">
            <DialogHeader>
              <DialogTitle style={s.text}>Prim Kademeleri</DialogTitle>
              <DialogDescription style={s.muted}>
                PKL aşıldıktan sonraki kademeli prim oranlarını belirleyin
              </DialogDescription>
            </DialogHeader>
            {showPrim && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg" style={{ background: "hsl(var(--admin-input-bg))" }}>
                  <p className="text-sm font-medium" style={s.text}>{showPrim.baslik}</p>
                  <p className="text-xs mt-1" style={s.muted}>
                    PKL: {showPrim.hedef_miktar.toLocaleString("tr-TR")}{showPrim.hedef_turu === "ciro" ? " $" : ""} • {HEDEF_TURLERI.find(t => t.value === showPrim.hedef_turu)?.label}
                  </p>
                </div>

                {/* Kademe Listesi */}
                <div className="space-y-3">
                  {primKademeler.map((k, i) => (
                    <div key={i} className="p-3 rounded-lg relative" style={{ background: "hsl(var(--admin-input-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold" style={s.text}>{i + 1}. Kademe</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeKademe(i)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs mb-1 block" style={s.muted}>Alt Sınır</label>
                          <Input
                            type="number" value={k.alt} style={s.input} className="h-8 text-sm"
                            onChange={e => updateKademe(i, "alt", Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-xs mb-1 block" style={s.muted}>Üst Sınır</label>
                          <Input
                            type="number" value={k.ust} style={s.input} className="h-8 text-sm"
                            onChange={e => updateKademe(i, "ust", Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-xs mb-1 block" style={s.muted}>Oran/Tutar</label>
                          <Input
                            type="number" value={k.oran} style={s.input} className="h-8 text-sm" step="0.01"
                            onChange={e => updateKademe(i, "oran", Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-xs mb-1 block" style={s.muted}>Birim</label>
                          <Select value={k.birimi} onValueChange={v => updateKademe(i, "birimi", v)}>
                            <SelectTrigger style={s.input} className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent style={{ ...s.card, zIndex: 9999 }} position="popper" sideOffset={4}>
                              <SelectItem value="tl">₺ TL</SelectItem>
                              <SelectItem value="usd">$ USD</SelectItem>
                              <SelectItem value="yuzde">% Yüzde</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={addKademe} className="w-full" style={s.input}>
                  <Plus className="w-4 h-4 mr-2" /> Kademe Ekle
                </Button>

                {/* Örnek Hesaplama */}
                {primKademeler.length > 0 && (
                  <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                    <p className="font-medium mb-1" style={s.text}>💡 Nasıl hesaplanır?</p>
                    <p style={s.muted}>
                      {showPrim.hedef_turu === "ciro"
                        ? `Örneğin ciro ${(showPrim.hedef_miktar + 3000).toLocaleString("tr-TR")} $ olursa, PKL (${showPrim.hedef_miktar.toLocaleString("tr-TR")} $) sonrasındaki her kademe için ayrı ayrı prim hesaplanır ve toplanır.`
                        : `Örneğin ${showPrim.hedef_miktar + 25} işlem yapılırsa, PKL (${showPrim.hedef_miktar}) sonrasındaki her kademe aralığına düşen işlemler için ayrı prim hesaplanır.`
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowPrim(null); setPrimKademeler([]); }} style={s.input}>
                Vazgeç
              </Button>
              <Button onClick={handlePrimKaydet} disabled={saving || primKademeler.length === 0} className="bg-amber-600 hover:bg-amber-700 text-white">
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
                </div>
              )}

              {formTur === "ciro" && (
                <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--admin-input-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                  <p style={s.muted}>💡 Ciro hedefi <strong>dolar ($)</strong> bazlıdır. PRO üyelik satışlarından elde edilen KDV'siz tutar otomatik olarak PKL'ye işlenir.</p>
                </div>
              )}
              {formTur === "dis_arama" && (
                <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--admin-input-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                  <p style={s.muted}>💡 "Dış Arama (İlk)" ve "Dış Arama (Tekrar)" aksiyon türleri bu PKL'ye sayılacaktır.</p>
                </div>
              )}
              {formTur === "ziyaret" && (
                <div className="p-3 rounded-lg text-xs" style={{ background: "hsl(var(--admin-input-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                  <p style={s.muted}>💡 "Ziyaret (İlk)" ve "Ziyaret (Tekrar)" aksiyon türleri bu PKL'ye sayılacaktır.</p>
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
                    {formTur === "ciro" ? "Ciro Hedefi ($)" : "PKL Limiti"}
                  </label>
                  <Input type="number" value={formMiktar} onChange={e => setFormMiktar(e.target.value)} placeholder={formTur === "ciro" ? "4000" : "100"} style={s.input} />
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
                  💡 PKL oluşturduktan sonra kartın üzerindeki <strong>"Kademe"</strong> butonuyla kademeli prim oranlarını tanımlayabilirsiniz.
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
  );
}
