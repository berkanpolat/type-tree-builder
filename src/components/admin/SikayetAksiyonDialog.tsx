import { useState, CSSProperties } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { toast } from "sonner";
import { ShieldAlert, Clock, Ban, AlertTriangle, Loader2 } from "lucide-react";

const s = {
  text: { color: "hsl(var(--foreground))" } as CSSProperties,
  muted: { color: "hsl(var(--muted-foreground))" } as CSSProperties,
  input: {
    backgroundColor: "hsl(var(--background))",
    borderColor: "hsl(var(--border))",
    color: "hsl(var(--foreground))",
  } as CSSProperties,
};

interface SikayetItem {
  id: string;
  sikayet_no: string;
  sikayet_edilen_firma: string;
  sikayet_edilen_user_id: string | null;
  tur: string;
}

type AksiyonTab = "kisitla" | "uzaklastir" | "yasakla";

const KISITLAMA_ALANLARI = [
  { key: "ihale_acamaz", label: "Kullanıcı İhale Açamaz" },
  { key: "teklif_veremez", label: "Kullanıcı Teklif Veremez" },
  { key: "urun_aktif_edemez", label: "Kullanıcı Pazarında Aktif Ürün Bulunduramaz" },
  { key: "mesaj_gonderemez", label: "Kullanıcı Mesaj Gönderemez" },
  { key: "mesaj_alamaz", label: "Kullanıcı Mesaj Alamaz" },
  { key: "profil_goruntuleyemez", label: "Kullanıcı Firma Profili Görüntüleyemez" },
  { key: "ihale_goruntuleyemez", label: "Kullanıcı İhale Görüntüleyemez" },
  { key: "urun_goruntuleyemez", label: "Kullanıcı Ürün Görüntüleyemez" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  item: SikayetItem | null;
  onSuccess: () => void;
}

export default function SikayetAksiyonDialog({ open, onClose, item, onSuccess }: Props) {
  const { token } = useAdminAuth();
  const [tab, setTab] = useState<AksiyonTab>("kisitla");
  const [loading, setLoading] = useState(false);

  // Kısıtla state
  const [kSebep, setKSebep] = useState("");
  const [kAlanlar, setKAlanlar] = useState<Record<string, boolean>>({});
  const [kBitisTarihi, setKBitisTarihi] = useState("");
  const [kBitisSaati, setKBitisSaati] = useState("23:59");

  // Uzaklaştır state
  const [uSebep, setUSebep] = useState("");
  const [uBitisTarihi, setUBitisTarihi] = useState("");
  const [uBitisSaati, setUBitisSaati] = useState("23:59");

  // Yasakla state
  const [ySebep, setYSebep] = useState("");
  const [yOnay, setYOnay] = useState(false);

  const resetForm = () => {
    setKSebep(""); setKAlanlar({}); setKBitisTarihi(""); setKBitisSaati("23:59");
    setUSebep(""); setUBitisTarihi(""); setUBitisSaati("23:59");
    setYSebep(""); setYOnay(false);
    setTab("kisitla");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!item || !item.sikayet_edilen_user_id) return null;

  const handleKisitla = async () => {
    if (!kSebep.trim()) return toast.error("Kısıt sebebi giriniz");
    const selected = Object.entries(kAlanlar).filter(([_, v]) => v);
    if (selected.length === 0) return toast.error("En az bir kısıtlama alanı seçiniz");
    if (!kBitisTarihi) return toast.error("Kısıtlama bitiş tarihi seçiniz");

    setLoading(true);
    try {
      const bitisTarihi = new Date(`${kBitisTarihi}T${kBitisSaati}`).toISOString();
      const { error } = await supabase.functions.invoke("admin-auth/kisitla", {
        body: {
          token,
          userId: item.sikayet_edilen_user_id,
          sikayetId: item.id,
          sikayetNo: item.sikayet_no,
          sebep: kSebep,
          kisitlamaAlanlari: kAlanlar,
          bitisTarihi,
        },
      });
      if (error) throw error;
      toast.success("Kısıtlama başarıyla uygulandı");
      handleClose();
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Kısıtlama uygulanamadı");
    } finally {
      setLoading(false);
    }
  };

  const handleUzaklastir = async () => {
    if (!uBitisTarihi) return toast.error("Uzaklaştırma bitiş tarihi seçiniz");

    setLoading(true);
    try {
      const bitisTarihi = new Date(`${uBitisTarihi}T${uBitisSaati}`).toISOString();
      const { error } = await supabase.functions.invoke("admin-auth/uzaklastir", {
        body: {
          token,
          userId: item.sikayet_edilen_user_id,
          sikayetId: item.id,
          sikayetNo: item.sikayet_no,
          sebep: uSebep,
          bitisTarihi,
        },
      });
      if (error) throw error;
      toast.success("Uzaklaştırma başarıyla uygulandı");
      handleClose();
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Uzaklaştırma uygulanamadı");
    } finally {
      setLoading(false);
    }
  };

  const handleYasakla = async () => {
    if (!yOnay) return toast.error("Yasaklama onayını işaretleyiniz");

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-auth/yasakla", {
        body: {
          token,
          userId: item.sikayet_edilen_user_id,
          sikayetId: item.id,
          sebep: ySebep,
        },
      });
      if (error) throw error;
      toast.success("Kullanıcı yasaklandı ve hesabı silindi");
      handleClose();
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Yasaklama uygulanamadı");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: AksiyonTab; label: string; icon: typeof ShieldAlert; color: string }[] = [
    { key: "kisitla", label: "Kısıtla", icon: ShieldAlert, color: "text-amber-500" },
    { key: "uzaklastir", label: "Uzaklaştır", icon: Clock, color: "text-orange-500" },
    { key: "yasakla", label: "Yasakla", icon: Ban, color: "text-red-500" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto !bg-card" style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
        <DialogHeader>
          <DialogTitle style={s.text}>İşlem Yap — {item.sikayet_no}</DialogTitle>
          <p className="text-xs mt-1" style={s.muted}>
            Şikayet edilen firma: <span className="font-medium" style={s.text}>{item.sikayet_edilen_firma}</span>
          </p>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--admin-input-bg))" }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                tab === t.key ? "shadow-sm" : "opacity-60 hover:opacity-80"
              }`}
              style={{
                background: tab === t.key ? "hsl(var(--admin-card-bg))" : "transparent",
                color: tab === t.key ? undefined : "hsl(var(--admin-muted))",
              }}
            >
              <t.icon className={`w-3.5 h-3.5 ${tab === t.key ? t.color : ""}`} />
              <span style={tab === t.key ? s.text : undefined}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Kısıtla Tab */}
        {tab === "kisitla" && (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={s.muted}>Kısıt Sebebi *</label>
              <Textarea
                value={kSebep}
                onChange={e => setKSebep(e.target.value)}
                placeholder="Kısıtlama sebebini yazınız..."
                rows={2}
                style={s.input}
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-2 block" style={s.muted}>Kısıtlama Alanları *</label>
              <div className="space-y-2">
                {KISITLAMA_ALANLARI.map(alan => (
                  <label key={alan.key} className="flex items-center gap-2.5 cursor-pointer group">
                    <Checkbox
                      checked={!!kAlanlar[alan.key]}
                      onCheckedChange={(checked) =>
                        setKAlanlar(prev => ({ ...prev, [alan.key]: !!checked }))
                      }
                      className="border-amber-500/40 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <span className="text-xs group-hover:opacity-100 opacity-80 transition-opacity" style={s.text}>
                      {alan.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={s.muted}>Bitiş Tarihi *</label>
                <Input type="date" value={kBitisTarihi} onChange={e => setKBitisTarihi(e.target.value)} style={s.input} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={s.muted}>Bitiş Saati</label>
                <Input type="time" value={kBitisSaati} onChange={e => setKBitisSaati(e.target.value)} style={s.input} />
              </div>
            </div>

            <Button
              onClick={handleKisitla}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
              Kısıtlamayı Uygula
            </Button>
          </div>
        )}

        {/* Uzaklaştır Tab */}
        {tab === "uzaklastir" && (
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-xs" style={s.muted}>
                  Uzaklaştırılan kullanıcı seçilen tarihe kadar hesabına giriş yapamaz, ürünleri ve ihaleleri listelenmez, platformda görünmez olur.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={s.muted}>Uzaklaştırma Sebebi</label>
              <Textarea
                value={uSebep}
                onChange={e => setUSebep(e.target.value)}
                placeholder="Uzaklaştırma sebebini yazınız..."
                rows={2}
                style={s.input}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={s.muted}>Bitiş Tarihi *</label>
                <Input type="date" value={uBitisTarihi} onChange={e => setUBitisTarihi(e.target.value)} style={s.input} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={s.muted}>Bitiş Saati</label>
                <Input type="time" value={uBitisSaati} onChange={e => setUBitisSaati(e.target.value)} style={s.input} />
              </div>
            </div>

            <Button
              onClick={handleUzaklastir}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
              Uzaklaştırmayı Uygula
            </Button>
          </div>
        )}

        {/* Yasakla Tab */}
        {tab === "yasakla" && (
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-500 mb-1">Dikkat! Bu işlem geri alınamaz.</p>
                  <p className="text-xs" style={s.muted}>
                    Kullanıcının hesabı sistemden kalıcı olarak silinir. Aynı bilgilerle yeni hesap oluşturulamaz. Tüm ürünleri, ihaleleri ve firma bilgileri silinir.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={s.muted}>Yasaklama Sebebi</label>
              <Textarea
                value={ySebep}
                onChange={e => setYSebep(e.target.value)}
                placeholder="Yasaklama sebebini yazınız..."
                rows={2}
                style={s.input}
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={yOnay}
                onCheckedChange={(checked) => setYOnay(!!checked)}
                className="border-red-500/40 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
              />
              <span className="text-xs" style={s.text}>
                Bu kullanıcının kalıcı olarak yasaklanmasını ve hesabının silinmesini onaylıyorum.
              </span>
            </label>

            <Button
              onClick={handleYasakla}
              disabled={loading || !yOnay}
              className="w-full bg-red-500 hover:bg-red-600 text-white disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
              Kalıcı Olarak Yasakla
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
