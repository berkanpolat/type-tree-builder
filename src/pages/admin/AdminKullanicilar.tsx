import { useState, useEffect, useCallback, type CSSProperties } from "react";
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
  departman: string;
  is_primary: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
}

const DEPARTMAN_POZISYON: Record<string, string[]> = {
  "Saha Satış": ["Saha Satış Personeli", "Saha Satış Yöneticisi"],
  "Çağrı Merkezi": ["Çağrı Merkezi Yönetici", "Çağrı Merkezi Personeli"],
  "Kurumsal Satış": ["Kurumsal Satış Yöneticisi", "Kurumsal Satış Personeli"],
  "Yönetim Kurulu": ["Yönetim Kurulu Üyesi"],
};
const DEPARTMANLAR = Object.keys(DEPARTMAN_POZISYON);

/* ── Hierarchical Permission Structure ── */
interface PermissionGroup {
  label: string;
  items: PermissionItem[];
}

interface PermissionItem {
  key: string;
  label: string;
  parent?: boolean; // if true, toggling off hides children
  children?: PermissionItem[];
  parentKey?: string; // show only when this parent is checked
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "İhale",
    items: [
      {
        key: "ihale_goruntule", label: "İhale menüsünü görüntüleyebilir", parent: true,
        children: [
          { key: "ihale_inceleyebilir", label: "İhale inceleyebilir" },
          { key: "ihale_onaylayabilir", label: "İhale onaylayabilir" },
          { key: "ihale_duzenleyebilir", label: "İhale düzenleyebilir" },
          { key: "ihale_kaldirabilir", label: "İhale kaldırabilir" },
        ],
      },
    ],
  },
  {
    label: "Ürünler",
    items: [
      {
        key: "urun_goruntule", label: "Ürünler menüsünü görüntüleyebilir", parent: true,
        children: [
          { key: "urun_inceleyebilir", label: "Ürün inceleyebilir" },
          { key: "urun_onaylayabilir", label: "Ürün onaylayabilir" },
          { key: "urun_duzenleyebilir", label: "Ürün düzenleyebilir" },
          { key: "urun_kaldirabilir", label: "Ürün kaldırabilir" },
        ],
      },
    ],
  },
  {
    label: "Şikayetler",
    items: [
      {
        key: "sikayet_goruntule", label: "Şikayet menüsünü görüntüleyebilir", parent: true,
        children: [
          { key: "sikayet_detay_goruntule", label: "Şikayet detaylarını görüntüleyebilir" },
          {
            key: "sikayet_islem_yapabilir", label: "Şikayet işlemi yapabilir", parent: true,
            children: [
              { key: "sikayet_kisitlama", label: "Kısıtlama işlemi yapabilir" },
              { key: "sikayet_uzaklastirma", label: "Uzaklaştırma işlemi yapabilir" },
              { key: "sikayet_yasaklama", label: "Yasaklama işlemi yapabilir" },
            ],
          },
        ],
      },
    ],
  },
  {
    label: "Paket Yönetimi",
    items: [
      { key: "paket_detay_goruntule", label: "Kullanıcıların paket detaylarını görüntüleyebilir" },
      { key: "paket_olusturabilir", label: "Yeni paket oluşturabilir" },
      { key: "paket_duzenleyebilir", label: "Mevcut paketlerin içeriklerini düzenleyebilir" },
      { key: "paket_ekstra_hak", label: "Kullanıcılara ekstra hak tanımlaması yapabilir" },
    ],
  },
  {
    label: "Destek",
    items: [
      { key: "destek_goruntule", label: "Destek taleplerini görüntüleyebilir" },
      { key: "destek_cevap", label: "Destek taleplerine cevap verebilir" },
    ],
  },
];

// Collect all permission keys for defaults
function getAllPermissionKeys(): string[] {
  const keys: string[] = [];
  function collect(items: PermissionItem[]) {
    for (const item of items) {
      keys.push(item.key);
      if (item.children) collect(item.children);
    }
  }
  PERMISSION_GROUPS.forEach(g => collect(g.items));
  return keys;
}

const ALL_PERMISSION_KEYS = getAllPermissionKeys();
const DEFAULT_PERMISSIONS = Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, false]));

const USERS_PER_PAGE = 10;

export default function AdminKullanicilar() {
  const { token, user: currentUser } = useAdminAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [form, setForm] = useState({
    username: "",
    password: "",
    ad: "",
    soyad: "",
    email: "",
    telefon: "",
    pozisyon: "Çağrı Merkezi Personeli",
    departman: "Çağrı Merkezi",
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
      departman: "Çağrı Merkezi",
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
      departman: u.departman || "Çağrı Merkezi",
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
            departman: form.departman,
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
            departman: form.departman,
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

  const canManage = currentUser?.is_primary;

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = users.slice((safePage - 1) * USERS_PER_PAGE, safePage * USERS_PER_PAGE);

  // Toggle permission with cascade: turning off parent turns off children
  const togglePermission = (key: string, checked: boolean) => {
    const newPerms = { ...form.permissions, [key]: checked };
    if (!checked) {
      // Find and disable all children recursively
      function disableChildren(items: PermissionItem[]) {
        for (const item of items) {
          if (item.key === key && item.children) {
            function disableAll(children: PermissionItem[]) {
              for (const child of children) {
                newPerms[child.key] = false;
                if (child.children) disableAll(child.children);
              }
            }
            disableAll(item.children);
          }
          if (item.children) disableChildren(item.children);
        }
      }
      PERMISSION_GROUPS.forEach(g => disableChildren(g.items));
    }
    setForm({ ...form, permissions: newPerms });
  };

  // Render permission items recursively
  const renderPermissionItems = (items: PermissionItem[], depth = 0) => {
    return items.map((item) => {
      const isChecked = form.permissions[item.key];
      return (
        <div key={item.key}>
          <div className={`flex items-center gap-3 ${depth > 0 ? 'ml-6' : ''}`}>
            <Checkbox
              id={item.key}
              checked={isChecked}
              onCheckedChange={(checked) => togglePermission(item.key, !!checked)}
              className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
              style={{ borderColor: "hsl(var(--admin-border))" }}
            />
            <Label htmlFor={item.key} className="text-sm cursor-pointer" style={{ color: "hsl(var(--admin-text))" }}>{item.label}</Label>
          </div>
          {item.children && isChecked && (
            <div className="mt-2 space-y-2">
              {renderPermissionItems(item.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const sCard = {
    background: "hsl(var(--admin-card-bg))",
    border: "1px solid hsl(var(--admin-border))",
    borderRadius: "0.75rem",
  } as CSSProperties;
  const sText = { color: "hsl(var(--admin-text))" } as CSSProperties;
  const sMuted = { color: "hsl(var(--admin-muted))" } as CSSProperties;
  const sInput = {
    background: "hsl(var(--admin-input-bg))",
    borderColor: "hsl(var(--admin-border))",
    color: "hsl(var(--admin-text))",
  } as CSSProperties;

  return (
    <AdminLayout title="Panel Kullanıcıları">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm" style={sMuted}>Yönetim paneline erişimi olan kullanıcıları yönetin.</p>
          {canManage && (
            <Button onClick={openCreate} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kullanıcı
            </Button>
          )}
        </div>

        <div className="rounded-xl overflow-hidden" style={sCard}>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: "hsl(var(--admin-border))" }} className="hover:bg-transparent">
                     <TableHead style={sMuted}>Kullanıcı</TableHead>
                     <TableHead style={sMuted} className="hidden md:table-cell">Kullanıcı No</TableHead>
                     <TableHead style={sMuted}>Departman</TableHead>
                     <TableHead style={sMuted}>Pozisyon</TableHead>
                     <TableHead style={sMuted} className="hidden lg:table-cell">E-posta</TableHead>
                     <TableHead style={sMuted} className="hidden lg:table-cell">Telefon</TableHead>
                     <TableHead style={sMuted}>Rol</TableHead>
                     {canManage && <TableHead style={sMuted} className="text-right">İşlemler</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((u) => (
                    <TableRow key={u.id} style={{ borderColor: "hsl(var(--admin-border))" }} className="hover:opacity-80">
                      <TableCell style={sText} className="font-medium">
                        <div className="flex items-center gap-2">
                          {u.is_primary ? (
                            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <UserCircle className="w-4 h-4 shrink-0" style={sMuted} />
                          )}
                          <span className="truncate">{u.ad} {u.soyad}</span>
                        </div>
                      </TableCell>
                       <TableCell className="font-mono hidden md:table-cell" style={sMuted}>{u.username}</TableCell>
                       <TableCell>
                         <Badge variant="outline" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>{u.departman || "—"}</Badge>
                       </TableCell>
                       <TableCell>
                         <Badge variant="outline" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>{u.pozisyon}</Badge>
                       </TableCell>
                       <TableCell className="hidden lg:table-cell" style={sMuted}>{u.email || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell" style={sMuted}>{u.telefon || "—"}</TableCell>
                      <TableCell>
                        {u.is_primary ? (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Ana Yönetici</Badge>
                        ) : (
                          <Badge variant="secondary" style={{ background: "hsl(var(--admin-hover))", color: "hsl(var(--admin-text))" }}>Alt Kullanıcı</Badge>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(u)} style={sMuted} className="hover:opacity-80">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {!u.is_primary && currentUser?.is_primary && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(u)} className="text-red-400 hover:text-red-500 hover:bg-red-500/10">
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
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}
              className="text-xs" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>← Önceki</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                typeof p === "string" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs" style={sMuted}>…</span>
                ) : (
                  <Button key={p} size="sm" variant={p === safePage ? "default" : "outline"}
                    onClick={() => setCurrentPage(p as number)}
                    className={p === safePage ? "bg-amber-500 hover:bg-amber-600 text-white text-xs w-8 h-8 p-0" : "text-xs w-8 h-8 p-0"}
                    style={p !== safePage ? { borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" } : undefined}>
                    {p}
                  </Button>
                )
              )}
            <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}
              className="text-xs" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>Sonraki →</Button>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>
          <DialogHeader>
            <DialogTitle style={sText}>{editingUser ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle"}</DialogTitle>
            <DialogDescription style={sMuted}>
              {editingUser ? "Kullanıcı bilgilerini güncelleyin." : "Panele erişim sağlayacak yeni bir kullanıcı oluşturun."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingUser && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label style={sMuted}>Kullanıcı Adı *</Label>
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} style={sInput} placeholder="Kullanıcı no" />
                </div>
                <div className="space-y-2">
                  <Label style={sMuted}>Şifre *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={sInput} placeholder="Şifre" />
                </div>
              </div>
            )}

            {editingUser && (
              <div className="space-y-2">
                <Label style={sMuted}>Yeni Şifre (opsiyonel)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={sInput} placeholder="Değiştirmek için yeni şifre girin" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label style={sMuted}>Ad *</Label>
                <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} style={sInput} />
              </div>
              <div className="space-y-2">
                <Label style={sMuted}>Soyad *</Label>
                <Input value={form.soyad} onChange={(e) => setForm({ ...form, soyad: e.target.value })} style={sInput} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label style={sMuted}>E-posta</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={sInput} />
              </div>
              <div className="space-y-2">
                <Label style={sMuted}>Telefon Numarası</Label>
                <Input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} style={sInput} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label style={sMuted}>Departman *</Label>
                <Select value={form.departman} onValueChange={(v) => setForm({ ...form, departman: v, pozisyon: DEPARTMAN_POZISYON[v]?.[0] || "" })}>
                  <SelectTrigger style={sInput}><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[300]" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                    {DEPARTMANLAR.map((d) => (
                      <SelectItem key={d} value={d} style={sText}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label style={sMuted}>Pozisyon *</Label>
                <Select value={form.pozisyon} onValueChange={(v) => setForm({ ...form, pozisyon: v })}>
                  <SelectTrigger style={sInput}><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[300]" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
                    {(DEPARTMAN_POZISYON[form.departman] || []).map((p) => (
                      <SelectItem key={p} value={p} style={sText}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold" style={sText}>Erişilebilirlik Ayarları</Label>
              <div className="space-y-4 rounded-lg p-4" style={{ background: "hsl(var(--admin-hover))", border: "1px solid hsl(var(--admin-border))" }}>
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">{group.label}</p>
                    <div className="space-y-2">
                      {renderPermissionItems(group.items)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} style={sMuted}>İptal</Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
              {editingUser ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
