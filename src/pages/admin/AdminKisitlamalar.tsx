import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminApi } from "@/hooks/use-admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Shield, Plus, Pencil, Trash2, Search, RotateCcw, Building2, Calendar,
  ShieldOff, Ban, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const s = {
  card: {
    background: "hsl(var(--admin-card-bg))",
    border: "1px solid hsl(var(--admin-border))",
    borderRadius: "0.75rem",
  } as CSSProperties,
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
  input: {
    background: "hsl(var(--admin-input-bg))",
    borderColor: "hsl(var(--admin-border))",
    color: "hsl(var(--admin-text))",
  } as CSSProperties,
};

const ALAN_OPTIONS: { key: string; label: string }[] = [
  { key: "ihale_acamaz", label: "İhale Açma" },
  { key: "teklif_veremez", label: "Teklif Verme" },
  { key: "urun_aktif_edemez", label: "Ürün Aktif Etme" },
  { key: "mesaj_gonderemez", label: "Mesaj Gönderme" },
  { key: "mesaj_alamaz", label: "Mesaj Alma" },
  { key: "profil_goruntuleyemez", label: "Profil Görüntüleme" },
  { key: "ihale_goruntuleyemez", label: "İhale Görüntüleme" },
  { key: "urun_goruntuleyemez", label: "Ürün Görüntüleme" },
];

type TabType = "kisitlama" | "uzaklastirma" | "yasak";

interface Kisitlama {
  id: string;
  user_id: string;
  sebep: string;
  kisitlama_alanlari: Record<string, boolean>;
  bitis_tarihi: string;
  aktif: boolean;
  created_at: string;
  created_by: string;
  sikayet_id: string | null;
  firma_unvani: string;
  kullanici_ad: string;
  kullanici_email: string;
}

interface Uzaklastirma {
  id: string;
  user_id: string;
  sebep: string | null;
  bitis_tarihi: string;
  aktif: boolean;
  created_at: string;
  created_by: string;
  sikayet_id: string | null;
  firma_unvani: string;
  kullanici_ad: string;
  kullanici_email: string;
}

interface Yasak {
  id: string;
  user_id: string;
  email: string | null;
  firma_unvani: string | null;
  vergi_numarasi: string | null;
  sebep: string | null;
  created_at: string;
  created_by: string;
  sikayet_id: string | null;
}

interface UserResult {
  user_id: string;
  firma_unvani: string;
  kullanici_ad: string;
  kullanici_email: string;
}

// ─── User Search Component ───
function UserSearchField({ formUserId, formUserLabel, setFormUserId, setFormUserLabel, callApi }: {
  formUserId: string;
  formUserLabel: string;
  setFormUserId: (v: string) => void;
  setFormUserLabel: (v: string) => void;
  callApi: (action: string, body: Record<string, unknown>) => Promise<any>;
}) {
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (userSearch.length < 2) return;
    setSearching(true);
    try {
      const res = await callApi("search-users-for-kisitlama", { query: userSearch });
      setUserResults(res?.users || []);
    } catch {}
    setSearching(false);
  };

  if (formUserId) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "hsl(var(--admin-input-bg))" }}>
        <Building2 className="w-4 h-4 text-amber-500" />
        <span className="text-sm flex-1" style={s.text}>{formUserLabel}</span>
        <Button variant="ghost" size="sm" onClick={() => { setFormUserId(""); setFormUserLabel(""); }}>
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Firma adı ile ara..."
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          style={s.input}
        />
        <Button onClick={handleSearch} disabled={searching} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
          <Search className="w-4 h-4" />
        </Button>
      </div>
      {userResults.length > 0 && (
        <div className="border rounded-lg max-h-40 overflow-y-auto" style={{ borderColor: "hsl(var(--admin-border))" }}>
          {userResults.map(u => (
            <button
              key={u.user_id}
              onClick={() => {
                setFormUserId(u.user_id);
                setFormUserLabel(`${u.firma_unvani} — ${u.kullanici_ad}`);
                setUserResults([]);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-amber-500/10 transition-colors"
              style={s.text}
            >
              <div className="font-medium">{u.firma_unvani}</div>
              <div className="text-xs" style={s.muted}>{u.kullanici_ad} • {u.kullanici_email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminKisitlamalar() {
  const { token, user: adminUser } = useAdminAuth();
  const { toast } = useToast();

  const baseCallApi = useAdminApi();
  const callApi = useCallback(async (action: string, body: Record<string, unknown>) => {
    return baseCallApi(action, { ...body, token });
  }, [baseCallApi, token]);

  const [activeTab, setActiveTab] = useState<TabType>("kisitlama");
  const [kisitlamalar, setKisitlamalar] = useState<Kisitlama[]>([]);
  const [uzaklastirmalar, setUzaklastirmalar] = useState<Uzaklastirma[]>([]);
  const [yasaklar, setYasaklar] = useState<Yasak[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAktif, setFilterAktif] = useState<"all" | "aktif" | "pasif">("all");

  // Dialog states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form
  const [formUserId, setFormUserId] = useState("");
  const [formUserLabel, setFormUserLabel] = useState("");
  const [formSebep, setFormSebep] = useState("");
  const [formAlanlari, setFormAlanlari] = useState<Record<string, boolean>>({});
  const [formBitis, setFormBitis] = useState("");
  const [formAktif, setFormAktif] = useState(true);
  const [formFirmaUnvani, setFormFirmaUnvani] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kisitRes, uzakRes, yasakRes] = await Promise.all([
        callApi("list-kisitlamalar", {}),
        callApi("list-uzaklastirmalar", {}),
        callApi("list-yasaklar", {}),
      ]);
      if (kisitRes?.kisitlamalar) setKisitlamalar(kisitRes.kisitlamalar);
      if (uzakRes?.uzaklastirmalar) setUzaklastirmalar(uzakRes.uzaklastirmalar);
      if (yasakRes?.yasaklar) setYasaklar(yasakRes.yasaklar);
    } catch {
      toast({ title: "Veri yüklenemedi", variant: "destructive" });
    }
    setLoading(false);
  }, [callApi, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFormUserId("");
    setFormUserLabel("");
    setFormSebep("");
    setFormAlanlari({});
    setFormBitis("");
    setFormAktif(true);
    setFormFirmaUnvani("");
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  // ─── KISITLAMA handlers ───
  const openEditKisitlama = (k: Kisitlama) => {
    setSelectedItem(k);
    setFormUserId(k.user_id);
    setFormUserLabel(`${k.firma_unvani} — ${k.kullanici_ad}`);
    setFormSebep(k.sebep);
    setFormAlanlari(k.kisitlama_alanlari);
    setFormBitis(k.bitis_tarihi ? k.bitis_tarihi.slice(0, 16) : "");
    setFormAktif(k.aktif);
    setShowEdit(true);
  };

  const handleCreateKisitlama = async () => {
    if (!formUserId || !formSebep || !formBitis || Object.values(formAlanlari).every(v => !v)) {
      toast({ title: "Tüm alanları doldurun ve en az bir kısıtlama alanı seçin", variant: "destructive" });
      return;
    }
    try {
      await callApi("kisitla", {
        userId: formUserId, sikayetId: null, sebep: formSebep,
        kisitlamaAlanlari: formAlanlari, bitisTarihi: new Date(formBitis).toISOString(), sikayetNo: null,
      });
      toast({ title: "Kısıtlama oluşturuldu" });
      setShowCreate(false);
      fetchData();
    } catch { toast({ title: "Hata oluştu", variant: "destructive" }); }
  };

  const handleUpdateKisitlama = async () => {
    if (!selectedItem) return;
    try {
      await callApi("update-kisitlama", {
        kisitlamaId: selectedItem.id, sebep: formSebep,
        kisitlamaAlanlari: formAlanlari, bitisTarihi: new Date(formBitis).toISOString(), aktif: formAktif,
      });
      toast({ title: "Kısıtlama güncellendi" });
      setShowEdit(false);
      fetchData();
    } catch { toast({ title: "Hata oluştu", variant: "destructive" }); }
  };

  const handleDeleteKisitlama = async () => {
    if (!selectedItem) return;
    try {
      await callApi("delete-kisitlama", { kisitlamaId: selectedItem.id });
      toast({ title: "Kısıtlama kaldırıldı" });
      setShowDelete(false);
      fetchData();
    } catch { toast({ title: "Hata oluştu", variant: "destructive" }); }
  };

  // ─── UZAKLASTIRMA handlers ───
  const openEditUzaklastirma = (u: Uzaklastirma) => {
    setSelectedItem(u);
    setFormUserId(u.user_id);
    setFormUserLabel(`${u.firma_unvani} — ${u.kullanici_ad}`);
    setFormSebep(u.sebep || "");
    setFormBitis(u.bitis_tarihi ? u.bitis_tarihi.slice(0, 16) : "");
    setFormAktif(u.aktif);
    setShowEdit(true);
  };

  const handleCreateUzaklastirma = async () => {
    if (!formUserId || !formBitis) {
      toast({ title: "Kullanıcı ve bitiş tarihi zorunludur", variant: "destructive" });
      return;
    }
    try {
      await callApi("uzaklastir", {
        userId: formUserId, sikayetId: null, sebep: formSebep,
        bitisTarihi: new Date(formBitis).toISOString(), sikayetNo: null,
      });
      toast({ title: "Uzaklaştırma oluşturuldu" });
      setShowCreate(false);
      fetchData();
    } catch { toast({ title: "Hata oluştu", variant: "destructive" }); }
  };

  const handleUpdateUzaklastirma = async () => {
    if (!selectedItem) return;
    try {
      await callApi("update-uzaklastirma", {
        uzaklastirmaId: selectedItem.id, sebep: formSebep,
        bitisTarihi: new Date(formBitis).toISOString(), aktif: formAktif,
      });
      toast({ title: "Uzaklaştırma güncellendi" });
      setShowEdit(false);
      fetchData();
    } catch { toast({ title: "Hata oluştu", variant: "destructive" }); }
  };

  const handleDeleteUzaklastirma = async () => {
    if (!selectedItem) return;
    try {
      await callApi("delete-uzaklastirma", { uzaklastirmaId: selectedItem.id });
      toast({ title: "Uzaklaştırma kaldırıldı" });
      setShowDelete(false);
      fetchData();
    } catch { toast({ title: "Hata oluştu", variant: "destructive" }); }
  };

  // ─── YASAK handlers ───
  const handleCreateYasak = async () => {
    if (!formUserId) {
      toast({ title: "Kullanıcı seçimi zorunludur", variant: "destructive" });
      return;
    }
    if (!formFirmaUnvani) {
      toast({ title: "Güvenlik için firma ünvanını yazın", variant: "destructive" });
      return;
    }
    try {
      await callApi("yasakla", {
        userId: formUserId, sikayetId: null, sebep: formSebep,
      });
      toast({ title: "Kullanıcı yasaklandı" });
      setShowCreate(false);
      fetchData();
    } catch (e: any) {
      toast({ title: e?.message || "Hata oluştu", variant: "destructive" });
    }
  };

  const handleDeleteYasak = async () => {
    if (!selectedItem) return;
    try {
      await callApi("delete-yasak", { yasakId: selectedItem.id });
      toast({ title: "Yasak kaldırıldı" });
      setShowDelete(false);
      fetchData();
    } catch { toast({ title: "Hata oluştu", variant: "destructive" }); }
  };

  const toggleAlan = (key: string) => {
    setFormAlanlari(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isExpired = (item: { bitis_tarihi: string }) => new Date(item.bitis_tarihi) < new Date();

  const tabs: { key: TabType; label: string; icon: any; count: number; color: string }[] = [
    { key: "kisitlama", label: "Kısıtlamalar", icon: Shield, count: kisitlamalar.length, color: "text-orange-500" },
    { key: "uzaklastirma", label: "Uzaklaştırmalar", icon: ShieldOff, count: uzaklastirmalar.length, color: "text-red-500" },
    { key: "yasak", label: "Yasaklar", icon: Ban, count: yasaklar.length, color: "text-red-700" },
  ];

  // ─── RENDER ───
  return (
    <AdminLayout title="Yaptırım Yönetimi">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={s.text}>Yaptırım Yönetimi</h2>
              <p className="text-sm" style={s.muted}>Kısıtlama, uzaklaştırma ve yasaklama işlemleri</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === "kisitlama" ? "Yeni Kısıtlama" : activeTab === "uzaklastirma" ? "Yeni Uzaklaştırma" : "Yeni Yasak"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl" style={s.card}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(""); setFilterAktif("all"); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : ""
              }`}
              style={activeTab !== tab.key ? { color: "hsl(var(--admin-muted))" } : undefined}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? tab.color : ""}`} />
              <span className="hidden sm:inline">{tab.label}</span>
              <Badge variant="outline" className={`text-xs ${activeTab === tab.key ? "border-amber-500/30 text-amber-600" : ""}`}>
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl" style={s.card}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
            <Input placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" style={s.input} />
          </div>
          {activeTab !== "yasak" && (
            <div className="flex gap-2">
              {(["all", "aktif", "pasif"] as const).map(val => (
                <Button
                  key={val}
                  variant={filterAktif === val ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterAktif(val)}
                  className={filterAktif === val ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                  style={filterAktif !== val ? s.input : undefined}
                >
                  {val === "all" ? "Tümü" : val === "aktif" ? "Aktif" : "Pasif"}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="rounded-xl overflow-hidden" style={s.card}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === "kisitlama" && <KisitlamaTable data={kisitlamalar} search={search} filterAktif={filterAktif} isExpired={isExpired} onEdit={openEditKisitlama} onDelete={(k) => { setSelectedItem(k); setShowDelete(true); }} />}
              {activeTab === "uzaklastirma" && <UzaklastirmaTable data={uzaklastirmalar} search={search} filterAktif={filterAktif} isExpired={isExpired} onEdit={openEditUzaklastirma} onDelete={(u) => { setSelectedItem(u); setShowDelete(true); }} />}
              {activeTab === "yasak" && <YasakTable data={yasaklar} search={search} onDelete={(y) => { setSelectedItem(y); setShowDelete(true); }} />}
            </div>
          )}
        </div>
      </div>

      {/* ─── CREATE DIALOG ─── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ ...s.card, background: "hsl(var(--admin-card-bg))" }}>
          <DialogHeader>
            <DialogTitle style={s.text}>
              {activeTab === "kisitlama" ? "Yeni Kısıtlama" : activeTab === "uzaklastirma" ? "Yeni Uzaklaştırma" : "Yeni Yasak"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={s.text}>Firma / Kullanıcı</label>
              <UserSearchField formUserId={formUserId} formUserLabel={formUserLabel} setFormUserId={setFormUserId} setFormUserLabel={setFormUserLabel} callApi={callApi} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={s.text}>Sebep</label>
              <Textarea value={formSebep} onChange={e => setFormSebep(e.target.value)} placeholder="Sebebi yazın..." style={s.input} rows={3} />
            </div>

            {activeTab !== "yasak" && (
              <div className="space-y-2">
                <label className="text-sm font-medium" style={s.text}>Bitiş Tarihi</label>
                <Input type="datetime-local" value={formBitis} onChange={e => setFormBitis(e.target.value)} style={s.input} />
              </div>
            )}

            {activeTab === "kisitlama" && (
              <div className="space-y-2">
                <label className="text-sm font-medium" style={s.text}>Kısıtlama Alanları</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALAN_OPTIONS.map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-amber-500/5"
                      style={{ background: formAlanlari[opt.key] ? "hsl(var(--admin-input-bg))" : "transparent" }}>
                      <Checkbox checked={!!formAlanlari[opt.key]} onCheckedChange={() => toggleAlan(opt.key)}
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
                      <span className="text-sm" style={s.text}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "yasak" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-red-500">⚠️ Güvenlik Doğrulaması</label>
                <p className="text-xs" style={s.muted}>Bu işlem geri alınamaz. Kullanıcının tüm verileri silinecektir. Onaylamak için firma ünvanını yazın.</p>
                <Input value={formFirmaUnvani} onChange={e => setFormFirmaUnvani(e.target.value)} placeholder="Firma ünvanını yazın..." style={s.input} />
              </div>
            )}

            {activeTab === "uzaklastirma" && (
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <p className="text-xs" style={s.muted}>Uzaklaştırma uygulandığında kullanıcının tüm aktif ürünleri pasife, devam eden ihaleleri iptal durumuna alınır.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)} style={s.input}>İptal</Button>
            <Button
              onClick={activeTab === "kisitlama" ? handleCreateKisitlama : activeTab === "uzaklastirma" ? handleCreateUzaklastirma : handleCreateYasak}
              className={activeTab === "yasak" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}
              disabled={activeTab === "yasak" && formFirmaUnvani !== formUserLabel.split(" — ")[0]}
            >
              {activeTab === "yasak" ? "Yasakla" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT DIALOG (kisitlama & uzaklastirma only) ─── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ ...s.card, background: "hsl(var(--admin-card-bg))" }}>
          <DialogHeader>
            <DialogTitle style={s.text}>{activeTab === "kisitlama" ? "Kısıtlamayı Düzenle" : "Uzaklaştırmayı Düzenle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" style={s.text}>Firma</label>
              <p className="text-sm" style={s.muted}>{formUserLabel}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={s.text}>Sebep</label>
              <Textarea value={formSebep} onChange={e => setFormSebep(e.target.value)} style={s.input} rows={3} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={s.text}>Bitiş Tarihi</label>
              <Input type="datetime-local" value={formBitis} onChange={e => setFormBitis(e.target.value)} style={s.input} />
            </div>

            {activeTab === "kisitlama" && (
              <div className="space-y-2">
                <label className="text-sm font-medium" style={s.text}>Kısıtlama Alanları</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALAN_OPTIONS.map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-amber-500/5"
                      style={{ background: formAlanlari[opt.key] ? "hsl(var(--admin-input-bg))" : "transparent" }}>
                      <Checkbox checked={!!formAlanlari[opt.key]} onCheckedChange={() => toggleAlan(opt.key)}
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
                      <span className="text-sm" style={s.text}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={formAktif} onCheckedChange={(v) => setFormAktif(!!v)}
                className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
              <span className="text-sm font-medium" style={s.text}>Aktif</span>
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEdit(false)} style={s.input}>İptal</Button>
            <Button onClick={activeTab === "kisitlama" ? handleUpdateKisitlama : handleUpdateUzaklastirma} className="bg-amber-500 hover:bg-amber-600 text-white">
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE DIALOG ─── */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent style={{ ...s.card, background: "hsl(var(--admin-card-bg))" }}>
          <DialogHeader>
            <DialogTitle style={s.text}>
              {activeTab === "kisitlama" ? "Kısıtlamayı Kaldır" : activeTab === "uzaklastirma" ? "Uzaklaştırmayı Kaldır" : "Yasağı Kaldır"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={s.muted}>
            <strong>{selectedItem?.firma_unvani}</strong> {activeTab === "yasak" ? "firmasının yasağını" : "firmasına uygulanan yaptırımı"} kaldırmak istediğinize emin misiniz?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDelete(false)} style={s.input}>İptal</Button>
            <Button onClick={activeTab === "kisitlama" ? handleDeleteKisitlama : activeTab === "uzaklastirma" ? handleDeleteUzaklastirma : handleDeleteYasak}
              className="bg-red-500 hover:bg-red-600 text-white">Kaldır</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// ─── Sub-tables ───

function KisitlamaTable({ data, search, filterAktif, isExpired, onEdit, onDelete }: {
  data: Kisitlama[]; search: string; filterAktif: string; isExpired: (k: any) => boolean;
  onEdit: (k: Kisitlama) => void; onDelete: (k: Kisitlama) => void;
}) {
  const filtered = data.filter(k => {
    if (search && !k.firma_unvani.toLowerCase().includes(search.toLowerCase()) && !k.kullanici_ad.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAktif === "aktif" && !k.aktif) return false;
    if (filterAktif === "pasif" && k.aktif) return false;
    return true;
  });

  if (!filtered.length) return <div className="text-center py-12" style={s.muted}>Kayıt bulunamadı</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow style={{ borderColor: "hsl(var(--admin-border))" }}>
          <TableHead style={s.muted}>Firma</TableHead>
          <TableHead style={s.muted}>Alanlar</TableHead>
          <TableHead style={s.muted}>Sebep</TableHead>
          <TableHead style={s.muted}>Bitiş</TableHead>
          <TableHead style={s.muted}>Durum</TableHead>
          <TableHead style={s.muted} className="sticky-action-col">İşlem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map(k => {
          const expired = isExpired(k);
          const areas = Object.entries(k.kisitlama_alanlari).filter(([_, v]) => v).map(([key]) => ALAN_OPTIONS.find(o => o.key === key)?.label || key);
          return (
            <TableRow key={k.id} style={{ borderColor: "hsl(var(--admin-border))" }}>
              <TableCell>
                <div className="text-sm font-medium" style={s.text}>{k.firma_unvani}</div>
                <div className="text-xs" style={s.muted}>{k.kullanici_ad}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {areas.map(a => <Badge key={a} variant="outline" className="text-xs border-red-500/30 text-red-500">{a}</Badge>)}
                </div>
              </TableCell>
              <TableCell><p className="text-sm max-w-[200px] truncate" style={s.text} title={k.sebep}>{k.sebep}</p></TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm" style={s.text}>
                  <Calendar className="w-3.5 h-3.5" style={s.muted} />
                  {format(new Date(k.bitis_tarihi), "dd MMM yyyy HH:mm", { locale: tr })}
                </div>
              </TableCell>
              <TableCell>
                {!k.aktif ? <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Pasif</Badge>
                  : expired ? <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Süresi Dolmuş</Badge>
                  : <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Aktif</Badge>}
              </TableCell>
              <TableCell className="sticky-action-col">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(k)} className="h-8 w-8 hover:bg-amber-500/10"><Pencil className="w-4 h-4 text-amber-500" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(k)} className="h-8 w-8 hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function UzaklastirmaTable({ data, search, filterAktif, isExpired, onEdit, onDelete }: {
  data: Uzaklastirma[]; search: string; filterAktif: string; isExpired: (u: any) => boolean;
  onEdit: (u: Uzaklastirma) => void; onDelete: (u: Uzaklastirma) => void;
}) {
  const filtered = data.filter(u => {
    if (search && !u.firma_unvani.toLowerCase().includes(search.toLowerCase()) && !u.kullanici_ad.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAktif === "aktif" && !u.aktif) return false;
    if (filterAktif === "pasif" && u.aktif) return false;
    return true;
  });

  if (!filtered.length) return <div className="text-center py-12" style={s.muted}>Kayıt bulunamadı</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow style={{ borderColor: "hsl(var(--admin-border))" }}>
          <TableHead style={s.muted}>Firma</TableHead>
          <TableHead style={s.muted}>Sebep</TableHead>
          <TableHead style={s.muted}>Bitiş</TableHead>
          <TableHead style={s.muted}>Durum</TableHead>
          <TableHead style={s.muted}>Oluşturan</TableHead>
          <TableHead style={s.muted} className="sticky-action-col">İşlem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map(u => {
          const expired = isExpired(u);
          return (
            <TableRow key={u.id} style={{ borderColor: "hsl(var(--admin-border))" }}>
              <TableCell>
                <div className="text-sm font-medium" style={s.text}>{u.firma_unvani}</div>
                <div className="text-xs" style={s.muted}>{u.kullanici_ad}</div>
              </TableCell>
              <TableCell><p className="text-sm max-w-[200px] truncate" style={s.text} title={u.sebep || "—"}>{u.sebep || "—"}</p></TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm" style={s.text}>
                  <Calendar className="w-3.5 h-3.5" style={s.muted} />
                  {format(new Date(u.bitis_tarihi), "dd MMM yyyy HH:mm", { locale: tr })}
                </div>
              </TableCell>
              <TableCell>
                {!u.aktif ? <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Pasif</Badge>
                  : expired ? <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Süresi Dolmuş</Badge>
                  : <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Aktif</Badge>}
              </TableCell>
              <TableCell><span className="text-xs" style={s.muted}>{u.created_by}</span></TableCell>
              <TableCell className="sticky-action-col">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(u)} className="h-8 w-8 hover:bg-amber-500/10"><Pencil className="w-4 h-4 text-amber-500" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(u)} className="h-8 w-8 hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function YasakTable({ data, search, onDelete }: {
  data: Yasak[]; search: string; onDelete: (y: Yasak) => void;
}) {
  const filtered = data.filter(y => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (y.firma_unvani?.toLowerCase().includes(q)) || (y.email?.toLowerCase().includes(q)) || (y.vergi_numarasi?.includes(q));
  });

  if (!filtered.length) return <div className="text-center py-12" style={s.muted}>Kayıt bulunamadı</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow style={{ borderColor: "hsl(var(--admin-border))" }}>
          <TableHead style={s.muted}>Firma</TableHead>
          <TableHead style={s.muted}>E-posta</TableHead>
          <TableHead style={s.muted}>Vergi No</TableHead>
          <TableHead style={s.muted}>Sebep</TableHead>
          <TableHead style={s.muted}>Tarih</TableHead>
          <TableHead style={s.muted} className="sticky-action-col">İşlem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map(y => (
          <TableRow key={y.id} style={{ borderColor: "hsl(var(--admin-border))" }}>
            <TableCell><span className="text-sm font-medium" style={s.text}>{y.firma_unvani || "—"}</span></TableCell>
            <TableCell><span className="text-sm" style={s.text}>{y.email || "—"}</span></TableCell>
            <TableCell><span className="text-sm" style={s.text}>{y.vergi_numarasi || "—"}</span></TableCell>
            <TableCell><p className="text-sm max-w-[200px] truncate" style={s.text} title={y.sebep || "—"}>{y.sebep || "—"}</p></TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5 text-sm" style={s.text}>
                <Calendar className="w-3.5 h-3.5" style={s.muted} />
                {format(new Date(y.created_at), "dd MMM yyyy", { locale: tr })}
              </div>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="icon" onClick={() => onDelete(y)} className="h-8 w-8 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
