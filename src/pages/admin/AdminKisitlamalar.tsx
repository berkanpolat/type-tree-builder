import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

interface UserResult {
  user_id: string;
  firma_unvani: string;
  kullanici_ad: string;
  kullanici_email: string;
}

export default function AdminKisitlamalar() {
  const { token } = useAdminAuth();
  const { toast } = useToast();

  const callApi = useCallback(async (action: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, { body: { ...body, token } });
    if (error) throw error;
    return data;
  }, [token]);
  const [kisitlamalar, setKisitlamalar] = useState<Kisitlama[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAktif, setFilterAktif] = useState<"all" | "aktif" | "pasif">("all");

  // Dialog states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedKisitlama, setSelectedKisitlama] = useState<Kisitlama | null>(null);

  // Create/Edit form
  const [formUserId, setFormUserId] = useState("");
  const [formUserLabel, setFormUserLabel] = useState("");
  const [formSebep, setFormSebep] = useState("");
  const [formAlanlari, setFormAlanlari] = useState<Record<string, boolean>>({});
  const [formBitis, setFormBitis] = useState("");
  const [formAktif, setFormAktif] = useState(true);

  // User search
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callApi("list-kisitlamalar", {});
      if (res?.kisitlamalar) setKisitlamalar(res.kisitlamalar);
    } catch {
      toast({ title: "Veri yüklenemedi", variant: "destructive" });
    }
    setLoading(false);
  }, [callApi, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchUsers = useCallback(async () => {
    if (userSearch.length < 2) return;
    setSearchingUsers(true);
    try {
      const res = await callApi("search-users-for-kisitlama", { query: userSearch });
      setUserResults(res?.users || []);
    } catch {}
    setSearchingUsers(false);
  }, [callApi, userSearch]);

  const selectUser = (u: UserResult) => {
    setFormUserId(u.user_id);
    setFormUserLabel(`${u.firma_unvani} — ${u.kullanici_ad}`);
    setUserResults([]);
    setUserSearch("");
  };

  const openCreate = () => {
    setFormUserId("");
    setFormUserLabel("");
    setFormSebep("");
    setFormAlanlari({});
    setFormBitis("");
    setFormAktif(true);
    setUserSearch("");
    setUserResults([]);
    setShowCreate(true);
  };

  const openEdit = (k: Kisitlama) => {
    setSelectedKisitlama(k);
    setFormUserId(k.user_id);
    setFormUserLabel(`${k.firma_unvani} — ${k.kullanici_ad}`);
    setFormSebep(k.sebep);
    setFormAlanlari(k.kisitlama_alanlari);
    setFormBitis(k.bitis_tarihi ? k.bitis_tarihi.slice(0, 16) : "");
    setFormAktif(k.aktif);
    setShowEdit(true);
  };

  const handleCreate = async () => {
    if (!formUserId || !formSebep || !formBitis || Object.values(formAlanlari).every(v => !v)) {
      toast({ title: "Tüm alanları doldurun ve en az bir kısıtlama alanı seçin", variant: "destructive" });
      return;
    }
    try {
      await callApi("kisitla", {
        userId: formUserId,
        sikayetId: null,
        sebep: formSebep,
        kisitlamaAlanlari: formAlanlari,
        bitisTarihi: new Date(formBitis).toISOString(),
        sikayetNo: null,
      });
      toast({ title: "Kısıtlama oluşturuldu" });
      setShowCreate(false);
      fetchData();
    } catch {
      toast({ title: "Hata oluştu", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!selectedKisitlama) return;
    try {
      await callApi("update-kisitlama", {
        kisitlamaId: selectedKisitlama.id,
        sebep: formSebep,
        kisitlamaAlanlari: formAlanlari,
        bitisTarihi: new Date(formBitis).toISOString(),
        aktif: formAktif,
      });
      toast({ title: "Kısıtlama güncellendi" });
      setShowEdit(false);
      fetchData();
    } catch {
      toast({ title: "Hata oluştu", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedKisitlama) return;
    try {
      await callApi("delete-kisitlama", { kisitlamaId: selectedKisitlama.id });
      toast({ title: "Kısıtlama kaldırıldı" });
      setShowDelete(false);
      fetchData();
    } catch {
      toast({ title: "Hata oluştu", variant: "destructive" });
    }
  };

  const toggleAlan = (key: string) => {
    setFormAlanlari(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filtered = kisitlamalar.filter(k => {
    if (search && !k.firma_unvani.toLowerCase().includes(search.toLowerCase()) && !k.kullanici_ad.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAktif === "aktif" && !k.aktif) return false;
    if (filterAktif === "pasif" && k.aktif) return false;
    return true;
  });

  const isExpired = (k: Kisitlama) => new Date(k.bitis_tarihi) < new Date();

  const formDialog = (isEdit: boolean) => (
    <Dialog open={isEdit ? showEdit : showCreate} onOpenChange={isEdit ? setShowEdit : setShowCreate}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ ...s.card, background: "hsl(var(--admin-card-bg))" }}>
        <DialogHeader>
          <DialogTitle style={s.text}>{isEdit ? "Kısıtlamayı Düzenle" : "Yeni Kısıtlama"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User selection - only for create */}
          {!isEdit ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" style={s.text}>Firma / Kullanıcı</label>
              {formUserId ? (
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "hsl(var(--admin-input-bg))" }}>
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span className="text-sm flex-1" style={s.text}>{formUserLabel}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setFormUserId(""); setFormUserLabel(""); }}>
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Firma adı ile ara..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSearchUsers()}
                      style={s.input}
                    />
                    <Button onClick={handleSearchUsers} disabled={searchingUsers} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  {userResults.length > 0 && (
                    <div className="border rounded-lg max-h-40 overflow-y-auto" style={{ borderColor: "hsl(var(--admin-border))" }}>
                      {userResults.map(u => (
                        <button
                          key={u.user_id}
                          onClick={() => selectUser(u)}
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
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium" style={s.text}>Firma</label>
              <p className="text-sm" style={s.muted}>{formUserLabel}</p>
            </div>
          )}

          {/* Sebep */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={s.text}>Sebep</label>
            <Textarea
              value={formSebep}
              onChange={e => setFormSebep(e.target.value)}
              placeholder="Kısıtlama sebebini yazın..."
              style={s.input}
              rows={3}
            />
          </div>

          {/* Bitiş Tarihi */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={s.text}>Bitiş Tarihi</label>
            <Input
              type="datetime-local"
              value={formBitis}
              onChange={e => setFormBitis(e.target.value)}
              style={s.input}
            />
          </div>

          {/* Kısıtlama Alanları */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={s.text}>Kısıtlama Alanları</label>
            <div className="grid grid-cols-2 gap-2">
              {ALAN_OPTIONS.map(opt => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-amber-500/5"
                  style={{ background: formAlanlari[opt.key] ? "hsl(var(--admin-input-bg))" : "transparent" }}
                >
                  <Checkbox
                    checked={!!formAlanlari[opt.key]}
                    onCheckedChange={() => toggleAlan(opt.key)}
                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <span className="text-sm" style={s.text}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Aktif/Pasif - only for edit */}
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formAktif}
                onCheckedChange={(v) => setFormAktif(!!v)}
                className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
              />
              <span className="text-sm font-medium" style={s.text}>Aktif</span>
            </label>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => isEdit ? setShowEdit(false) : setShowCreate(false)} style={s.input}>
            İptal
          </Button>
          <Button onClick={isEdit ? handleUpdate : handleCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
            {isEdit ? "Güncelle" : "Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <AdminLayout title="Kısıtlamalar">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={s.text}>Kısıtlama Yönetimi</h2>
              <p className="text-sm" style={s.muted}>{kisitlamalar.length} kayıt</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Yeni Kısıtlama
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl" style={s.card}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
            <Input
              placeholder="Firma veya kullanıcı ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              style={s.input}
            />
          </div>
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
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={s.card}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12" style={s.muted}>Kayıt bulunamadı</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "hsl(var(--admin-border))" }}>
                  <TableHead style={s.muted}>Firma</TableHead>
                  <TableHead style={s.muted}>Kısıtlama Alanları</TableHead>
                  <TableHead style={s.muted}>Sebep</TableHead>
                  <TableHead style={s.muted}>Bitiş</TableHead>
                  <TableHead style={s.muted}>Durum</TableHead>
                  <TableHead style={s.muted}>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(k => {
                  const expired = isExpired(k);
                  const activeAreas = Object.entries(k.kisitlama_alanlari)
                    .filter(([_, v]) => v)
                    .map(([key]) => ALAN_OPTIONS.find(o => o.key === key)?.label || key);

                  return (
                    <TableRow key={k.id} style={{ borderColor: "hsl(var(--admin-border))" }}>
                      <TableCell>
                        <div className="text-sm font-medium" style={s.text}>{k.firma_unvani}</div>
                        <div className="text-xs" style={s.muted}>{k.kullanici_ad}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {activeAreas.map(a => (
                            <Badge key={a} variant="outline" className="text-xs border-red-500/30 text-red-500">{a}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm max-w-[200px] truncate" style={s.text} title={k.sebep}>{k.sebep}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm" style={s.text}>
                          <Calendar className="w-3.5 h-3.5" style={s.muted} />
                          {format(new Date(k.bitis_tarihi), "dd MMM yyyy HH:mm", { locale: tr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!k.aktif ? (
                          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Pasif</Badge>
                        ) : expired ? (
                          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Süresi Dolmuş</Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(k)} className="h-8 w-8 hover:bg-amber-500/10">
                            <Pencil className="w-4 h-4 text-amber-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedKisitlama(k); setShowDelete(true); }} className="h-8 w-8 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create & Edit Dialogs */}
      {formDialog(false)}
      {formDialog(true)}

      {/* Delete Confirmation */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent style={{ ...s.card, background: "hsl(var(--admin-card-bg))" }}>
          <DialogHeader>
            <DialogTitle style={s.text}>Kısıtlamayı Kaldır</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={s.muted}>
            <strong>{selectedKisitlama?.firma_unvani}</strong> firmasına uygulanan kısıtlamayı tamamen kaldırmak istediğinize emin misiniz?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDelete(false)} style={s.input}>İptal</Button>
            <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Kaldır</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
