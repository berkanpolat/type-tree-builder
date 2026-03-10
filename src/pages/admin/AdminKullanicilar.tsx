import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Shield, UserCircle } from "lucide-react";

interface AdminUser {
  id: string;
  username: string;
  ad: string;
  soyad: string;
  email: string | null;
  telefon: string | null;
  pozisyon: string;
  is_primary: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
}

const POZISYONLAR = ["Call Center", "Satış Sorumlusu", "Yönetici", "Destek Personel"];

const PERMISSION_LABELS: Record<string, string> = {
  kullanici_ekle: "Kullanıcı ekleyebilir / onaylayabilir",
  kullanici_yonet: "Kullanıcıları yönetebilir",
  destek_talepleri: "Destek talepleri üzerinden işlem yapabilir",
  sikayet_goruntule: "Şikayet talepleri görüntüleyebilir",
  ihale_goruntule: "İhaleleri görüntüleyebilir",
  urun_goruntule: "Ürünleri görüntüleyebilir",
};

const DEFAULT_PERMISSIONS = Object.fromEntries(
  Object.keys(PERMISSION_LABELS).map((k) => [k, false])
);

export default function AdminKullanicilar() {
  const { token, hasPermission, user: currentUser } = useAdminAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [form, setForm] = useState({
    username: "",
    password: "",
    ad: "",
    soyad: "",
    email: "",
    telefon: "",
    pozisyon: "Call Center",
    permissions: { ...DEFAULT_PERMISSIONS },
  });

  const callApi = useCallback(async (action: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, { body });
    if (error) throw error;
    return data;
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const data = await callApi("list-users", { token });
      setUsers(data.users || []);
    } catch {
      toast({ title: "Hata", description: "Kullanıcılar yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, callApi, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = () => {
    setForm({
      username: "", password: "", ad: "", soyad: "",
      email: "", telefon: "", pozisyon: "Call Center",
      permissions: { ...DEFAULT_PERMISSIONS },
    });
    setEditingUser(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      password: "",
      ad: u.ad,
      soyad: u.soyad,
      email: u.email || "",
      telefon: u.telefon || "",
      pozisyon: u.pozisyon,
      permissions: { ...DEFAULT_PERMISSIONS, ...u.permissions },
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.ad || !form.soyad || !form.pozisyon) {
      toast({ title: "Hata", description: "Ad, soyad ve pozisyon zorunludur", variant: "destructive" });
      return;
    }

    try {
      if (editingUser) {
        await callApi("update-user", {
          token,
          userId: editingUser.id,
          updates: {
            ad: form.ad,
            soyad: form.soyad,
            email: form.email,
            telefon: form.telefon,
            pozisyon: form.pozisyon,
            permissions: form.permissions,
            ...(form.password ? { password: form.password } : {}),
          },
        });
        toast({ title: "Başarılı", description: "Kullanıcı güncellendi" });
      } else {
        if (!form.username || !form.password) {
          toast({ title: "Hata", description: "Kullanıcı adı ve şifre zorunludur", variant: "destructive" });
          return;
        }
        await callApi("create-user", {
          token,
          user: {
            username: form.username,
            password: form.password,
            ad: form.ad,
            soyad: form.soyad,
            email: form.email,
            telefon: form.telefon,
            pozisyon: form.pozisyon,
            permissions: form.permissions,
          },
        });
        toast({ title: "Başarılı", description: "Kullanıcı oluşturuldu" });
      }
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (u.is_primary) return;
    if (!confirm(`${u.ad} ${u.soyad} adlı kullanıcıyı silmek istediğinize emin misiniz?`)) return;
    try {
      await callApi("delete-user", { token, userId: u.id });
      toast({ title: "Başarılı", description: "Kullanıcı silindi" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Silinemedi", variant: "destructive" });
    }
  };

  const canManage = hasPermission("kullanici_yonet") || currentUser?.is_primary;
  const canAdd = hasPermission("kullanici_ekle") || currentUser?.is_primary;

  return (
    <AdminLayout title="Panel Kullanıcıları">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">Yönetim paneline erişimi olan kullanıcıları yönetin.</p>
          {canAdd && (
            <Button onClick={openCreate} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kullanıcı
            </Button>
          )}
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400">Kullanıcı</TableHead>
                  <TableHead className="text-slate-400">Kullanıcı No</TableHead>
                  <TableHead className="text-slate-400">Pozisyon</TableHead>
                  <TableHead className="text-slate-400">E-posta</TableHead>
                  <TableHead className="text-slate-400">Telefon</TableHead>
                  <TableHead className="text-slate-400">Rol</TableHead>
                  {canManage && <TableHead className="text-slate-400 text-right">İşlemler</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-slate-700 hover:bg-slate-700/30">
                    <TableCell className="text-white font-medium">
                      <div className="flex items-center gap-2">
                        {u.is_primary ? (
                          <Shield className="w-4 h-4 text-amber-400" />
                        ) : (
                          <UserCircle className="w-4 h-4 text-slate-500" />
                        )}
                        {u.ad} {u.soyad}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300 font-mono">{u.username}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">{u.pozisyon}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">{u.email || "—"}</TableCell>
                    <TableCell className="text-slate-400">{u.telefon || "—"}</TableCell>
                    <TableCell>
                      {u.is_primary ? (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Ana Yönetici</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-700 text-slate-300">Alt Kullanıcı</Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(u)}
                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {!u.is_primary && currentUser?.is_primary && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(u)}
                              className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingUser ? "Kullanıcı bilgilerini güncelleyin." : "Panele erişim sağlayacak yeni bir kullanıcı oluşturun."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingUser && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Kullanıcı Numarası *</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Kullanıcı no"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Şifre *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Şifre"
                  />
                </div>
              </div>
            )}

            {editingUser && (
              <div className="space-y-2">
                <Label className="text-slate-300">Yeni Şifre (opsiyonel)</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  placeholder="Değiştirmek için yeni şifre girin"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Ad *</Label>
                <Input
                  value={form.ad}
                  onChange={(e) => setForm({ ...form, ad: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Soyad *</Label>
                <Input
                  value={form.soyad}
                  onChange={(e) => setForm({ ...form, soyad: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">E-posta</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Telefon Numarası</Label>
                <Input
                  value={form.telefon}
                  onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Pozisyon *</Label>
              <Select value={form.pozisyon} onValueChange={(v) => setForm({ ...form, pozisyon: v })}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {POZISYONLAR.map((p) => (
                    <SelectItem key={p} value={p} className="text-white hover:bg-slate-700">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-300 text-base font-semibold">Erişilebilirlik Ayarları</Label>
              <div className="space-y-3 bg-slate-700/30 rounded-lg p-4 border border-slate-700">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <Checkbox
                      id={key}
                      checked={form.permissions[key]}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          permissions: { ...form.permissions, [key]: !!checked },
                        })
                      }
                      className="border-slate-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <Label htmlFor={key} className="text-slate-300 text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-white">
              İptal
            </Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
              {editingUser ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
