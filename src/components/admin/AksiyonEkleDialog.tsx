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
import { CalendarIcon, Clock, Loader2, Plus, UserPlus, Mail, CreditCard, Bell } from "lucide-react";
import { getAksiyonTurleriForDepartman } from "@/lib/aksiyon-config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const SATIS_KAPANMADI_NEDENLERI = [
  "Düşünmek istiyor.",
  "Fiyatı yüksek buldu.",
  "İhtiyaç duymuyor.",
  "İşine yaramayacağını düşünüyor.",
  "Denemiş memnun kalmamış.",
  "Yetkiliye ulaşılamadı.",
  "Yönetim karar verecek.",
  "Yönetim onaylamadı.",
  "Telefona bakmadı.",
  "Ücretsiz üyelikte kalmak istiyor.",
  "Zamanlama uygun değil.",
  "Diğer",
];

interface YetkiliOption {
  id: string;
  ad: string;
  soyad: string;
  pozisyon: string | null;
}

interface PaketOption {
  id: string;
  ad: string;
  slug: string;
}

export interface EditAksiyonData {
  id: string;
  baslik: string;
  aciklama: string | null;
  tur: string;
  tarih: string;
  durum: string;
  sonuc?: string | null;
  sonuc_neden?: string | null;
  sonuc_paket_id?: string | null;
  yetkili_id?: string | null;
  admin_id?: string;
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
  editData?: EditAksiyonData | null;
}

export default function AksiyonEkleDialog({ open, onOpenChange, firmaId, firmaUnvani, onSuccess, callApi, token, adminDepartman, adminIsPrimary, editData }: AksiyonEkleDialogProps) {
  const isEditMode = !!editData;
  const turler = getAksiyonTurleriForDepartman(adminDepartman, adminIsPrimary);

  const now = new Date();
  const [tur, setTur] = useState<string>(turler[0]?.value || "diger");
  const [yetkiliId, setYetkiliId] = useState<string>("none");
  const [tarih, setTarih] = useState<Date>(now);
  const [saat, setSaat] = useState(format(now, "HH:mm"));
  const [not, setNot] = useState("");
  const [loading, setLoading] = useState(false);

  // Sonuc fields
  const [sonuc, setSonuc] = useState<string>("");
  const [sonucPaketId, setSonucPaketId] = useState<string>("");
  const [sonucNeden, setSonucNeden] = useState<string>("");
  const [sonucNedenDiger, setSonucNedenDiger] = useState<string>("");
  const [paketler, setPaketler] = useState<PaketOption[]>([]);

  // PRO package specific fields
  const [proPeriod, setProPeriod] = useState<string>("aylik");
  const [emailSecim, setEmailSecim] = useState<string>("default");
  const [customEmail, setCustomEmail] = useState("");
  const [firmaEmail, setFirmaEmail] = useState("");

  // Yetkili list
  const [yetkililer, setYetkililer] = useState<YetkiliOption[]>([]);
  const [yetkililerLoading, setYetkililerLoading] = useState(false);

  // Inline yetkili add
  const [showYetkiliForm, setShowYetkiliForm] = useState(false);
  const [yetkiliAd, setYetkiliAd] = useState("");
  const [yetkiliSoyad, setYetkiliSoyad] = useState("");
  const [yetkiliSaving, setYetkiliSaving] = useState(false);

  // Hatırlatıcı fields
  const [hatirlaticiAktif, setHatirlaticiAktif] = useState(false);
  const [hatirlaticiTarih, setHatirlaticiTarih] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [hatirlaticiSaat, setHatirlaticiSaat] = useState("09:00");
  const [hatirlaticiNot, setHatirlaticiNot] = useState("");


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

  const fetchPaketler = async () => {
    const { data } = await supabase.from("paketler").select("id, ad, slug").eq("aktif", true).order("fiyat_aylik", { ascending: true });
    setPaketler((data || []).map((p: any) => ({ id: p.id, ad: p.ad, slug: p.slug || "" })));
  };

  const fetchFirmaEmail = async () => {
    try {
      const data = await callApi("get-firma-email", { token, firmaId });
      setFirmaEmail(data.email || "");
    } catch {
      setFirmaEmail("");
    }
  };

  useEffect(() => {
    if (open && firmaId) {
      fetchYetkililer();
      fetchPaketler();
      fetchFirmaEmail();
      if (editData) {
        // Pre-fill from edit data
        setTur(editData.tur || turler[0]?.value || "diger");
        setYetkiliId(editData.yetkili_id || "none");
        const editDate = new Date(editData.tarih);
        setTarih(editDate);
        setSaat(format(editDate, "HH:mm"));
        setNot(editData.aciklama || "");
        setSonuc(editData.sonuc || "");
        setSonucPaketId(editData.sonuc_paket_id || "");
        setSonucNeden(editData.sonuc_neden || "");
        setSonucNedenDiger("");
        // Check if sonuc_neden is a custom "Diğer" value
        if (editData.sonuc === "satis_kapanmadi" && editData.sonuc_neden && !SATIS_KAPANMADI_NEDENLERI.includes(editData.sonuc_neden)) {
          setSonucNeden("Diğer");
          setSonucNedenDiger(editData.sonuc_neden);
        }
      } else {
        const n = new Date();
        setTur(turler[0]?.value || "diger");
        setYetkiliId("none");
        setTarih(n);
        setSaat(format(n, "HH:mm"));
        setNot("");
        setSonuc("");
        setSonucPaketId("");
        setSonucNeden("");
        setSonucNedenDiger("");
      }
      setProPeriod("aylik");
      setEmailSecim("default");
      setCustomEmail("");
      setShowYetkiliForm(false);
    }
  }, [open, firmaId]);

  const handleAddYetkili = async () => {
    if (!yetkiliAd.trim() || !yetkiliSoyad.trim()) return;
    setYetkiliSaving(true);
    try {
      const res = await callApi("create-yetkili", { token, firmaId, ad: yetkiliAd.trim(), soyad: yetkiliSoyad.trim() });
      await fetchYetkililer();
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

  const selectedPaket = paketler.find(p => p.id === sonucPaketId);
  const isProPaket = selectedPaket?.slug === "pro";

  const getOdemeMail = () => {
    if (emailSecim === "default") return firmaEmail;
    return customEmail.trim();
  };

  const isFormValid = () => {
    if (!sonuc) return false;
    if (sonuc === "satis_kapatildi" && !sonucPaketId) return false;
    if (sonuc === "satis_kapatildi" && isProPaket) {
      if (!proPeriod) return false;
      const mail = getOdemeMail();
      if (!mail || !mail.includes("@")) return false;
    }
    if (sonuc === "satis_kapanmadi" && !sonucNeden) return false;
    if (sonuc === "satis_kapanmadi" && sonucNeden === "Diğer" && !sonucNedenDiger.trim()) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    const turLabel = turler.find(t => t.value === tur)?.label || tur;
    const [h, m] = saat.split(":").map(Number);
    const combined = new Date(tarih);
    combined.setHours(h || 0, m || 0, 0, 0);

    const finalNeden = sonuc === "satis_kapanmadi"
      ? (sonucNeden === "Diğer" ? sonucNedenDiger.trim() : sonucNeden)
      : null;

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        token,
        firmaId,
        baslik: turLabel,
        aciklama: not.trim() || null,
        tur,
        tarih: combined.toISOString(),
        yetkiliId: yetkiliId !== "none" ? yetkiliId : null,
        sonuc,
        sonucNeden: finalNeden,
        sonucPaketId: sonuc === "satis_kapatildi" ? sonucPaketId : null,
      };

      // Add PRO-specific fields
      if (sonuc === "satis_kapatildi" && isProPaket) {
        payload.periyot = proPeriod;
        payload.odemeMail = getOdemeMail();
        payload.clientOrigin = window.location.origin;
        payload.forceTestMode = window.location.origin.includes("lovable.app") || window.location.origin.includes("localhost");
      }

      if (isEditMode && editData) {
        // Update existing aksiyon
        await callApi("update-aksiyon", {
          token,
          aksiyonId: editData.id,
          updates: {
            baslik: turLabel,
            aciklama: not.trim() || null,
            tur,
            tarih: combined.toISOString(),
            yetkili_id: yetkiliId !== "none" ? yetkiliId : null,
            sonuc,
            sonuc_neden: finalNeden,
            sonuc_paket_id: sonuc === "satis_kapatildi" ? sonucPaketId || null : null,
          },
        });
        toast.success("Aksiyon güncellendi");
      } else {
        const result = await callApi("create-aksiyon", payload);
        console.log("[AksiyonEkle] create-aksiyon result:", result);

        if (result?.paymentLinkSent) {
          toast.success(`Ödeme linki ${getOdemeMail()} adresine gönderildi`);
        } else if (result?.packageAssigned) {
          toast.success(`${selectedPaket?.ad} paketi firmaya atandı`);
        } else if (sonuc === "satis_kapatildi") {
          toast.success("Aksiyon eklendi");
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(isEditMode ? "Aksiyon güncellenirken hata oluştu" : "Aksiyon eklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold" style={s.text}>{isEditMode ? "Aksiyonu Düzenle" : "Aksiyon Ekle"}</DialogTitle>
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
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm")} style={s.input}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(tarih, "dd MMM yyyy", { locale: tr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start" style={{ ...s.card, zIndex: 9999 }}>
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

          {/* Aksiyon Sonucu */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={s.muted}>Aksiyon Sonucu *</label>
            <Select value={sonuc} onValueChange={(v) => { setSonuc(v); setSonucPaketId(""); setSonucNeden(""); setSonucNedenDiger(""); }}>
              <SelectTrigger className={cn("h-9 text-sm", !sonuc && "text-muted-foreground")} style={s.input}>
                <SelectValue placeholder="Seçiniz..." />
              </SelectTrigger>
              <SelectContent style={{ ...s.card, zIndex: 9999 }} className="pointer-events-auto">
                <SelectItem value="satis_kapatildi" className="text-sm">Satış Kapatıldı</SelectItem>
                <SelectItem value="satis_kapanmadi" className="text-sm">Satış Kapanmadı</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Satış Kapatıldı → Paket Seçimi */}
          {sonuc === "satis_kapatildi" && (
            <div>
              <label className="text-xs font-medium mb-1 block" style={s.muted}>Paket *</label>
              <Select value={sonucPaketId} onValueChange={(v) => { setSonucPaketId(v); setProPeriod("aylik"); setEmailSecim("default"); setCustomEmail(""); }}>
                <SelectTrigger className={cn("h-9 text-sm", !sonucPaketId && "text-muted-foreground")} style={s.input}>
                  <SelectValue placeholder="Paket seçiniz..." />
                </SelectTrigger>
                <SelectContent style={{ ...s.card, zIndex: 9999 }} className="pointer-events-auto">
                  {paketler.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">{p.ad}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* PRO Paket → Periyot & Email */}
          {sonuc === "satis_kapatildi" && isProPaket && (
            <div className="space-y-3 p-3 rounded-lg" style={{ background: "hsl(var(--admin-hover))", border: "1px solid hsl(var(--admin-border))" }}>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium" style={s.text}>Ödeme Detayları</span>
              </div>

              {/* Periyot */}
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={s.muted}>Periyot *</label>
                <Select value={proPeriod} onValueChange={setProPeriod}>
                  <SelectTrigger className="h-9 text-sm" style={s.input}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ ...s.card, zIndex: 9999 }} className="pointer-events-auto">
                    <SelectItem value="aylik" className="text-sm">Aylık — $199/ay</SelectItem>
                    <SelectItem value="yillik" className="text-sm">Yıllık — $1.299/yıl</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={s.muted}>
                  <Mail className="w-3 h-3 inline mr-1" />
                  Ödeme Linki Gönderilecek E-posta *
                </label>
                <Select value={emailSecim} onValueChange={(v) => { setEmailSecim(v); if (v === "default") setCustomEmail(""); }}>
                  <SelectTrigger className="h-9 text-sm" style={s.input}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ ...s.card, zIndex: 9999 }} className="pointer-events-auto">
                    <SelectItem value="default" className="text-sm">
                      {firmaEmail || "Firma e-postası yükleniyor..."}
                    </SelectItem>
                    <SelectItem value="diger" className="text-sm">Diğer</SelectItem>
                  </SelectContent>
                </Select>
                {emailSecim === "diger" && (
                  <Input
                    type="email"
                    value={customEmail}
                    onChange={e => setCustomEmail(e.target.value)}
                    placeholder="E-posta adresi yazınız..."
                    className="h-9 text-sm mt-2"
                    style={s.input}
                  />
                )}
              </div>

              <p className="text-[10px] leading-relaxed" style={s.muted}>
                Ödeme linki seçilen e-posta adresine gönderilecek. Ödeme tamamlandığında paket otomatik olarak aktifleştirilecektir.
              </p>
            </div>
          )}

          {/* Satış Kapanmadı → Neden */}
          {sonuc === "satis_kapanmadi" && (
            <div>
              <label className="text-xs font-medium mb-1 block" style={s.muted}>Nedeni *</label>
              <Select value={sonucNeden} onValueChange={(v) => { setSonucNeden(v); if (v !== "Diğer") setSonucNedenDiger(""); }}>
                <SelectTrigger className={cn("h-9 text-sm", !sonucNeden && "text-muted-foreground")} style={s.input}>
                  <SelectValue placeholder="Neden seçiniz..." />
                </SelectTrigger>
                <SelectContent style={{ ...s.card, zIndex: 9999 }} className="pointer-events-auto max-h-[200px]">
                  {SATIS_KAPANMADI_NEDENLERI.map(n => (
                    <SelectItem key={n} value={n} className="text-sm">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {sonucNeden === "Diğer" && (
                <Input
                  value={sonucNedenDiger}
                  onChange={e => setSonucNedenDiger(e.target.value)}
                  placeholder="Nedeni yazınız..."
                  className="h-9 text-sm mt-2"
                  style={s.input}
                />
              )}
            </div>
          )}

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
            disabled={loading || !isFormValid()}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white h-9 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditMode ? "Güncelle" : isProPaket && sonuc === "satis_kapatildi" ? "Aksiyon Ekle & Ödeme Linki Gönder" : "Aksiyon Ekle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
