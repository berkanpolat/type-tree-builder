import { useState, useEffect, useCallback, type CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminApi } from "@/hooks/use-admin-api";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, ShieldCheck, ChevronDown, ChevronRight, Save, Search, Filter,
  Building2, Briefcase, ClipboardList, MapPin, Target, Gavel, Package,
  MessageSquareWarning, HeadphonesIcon, Users, Activity, Map, Megaphone, Bot, CreditCard, ShieldAlert,
  AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  username: string;
  ad: string;
  soyad: string;
  pozisyon: string;
  departman: string;
  is_primary: boolean;
  permissions: Record<string, boolean>;
}

interface PermissionItem {
  key: string;
  label: string;
  parent?: boolean;
  children?: PermissionItem[];
}

interface PermissionGroup {
  label: string;
  icon: React.ElementType;
  items: PermissionItem[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Firmalar",
    icon: Building2,
    items: [
      {
        key: "firma_goruntule", label: "Firmaları görüntüle", parent: true,
        children: [
          { key: "firma_ekle", label: "Firma ekle" },
          { key: "firma_onayla", label: "Onayla / Reddet" },
          { key: "firma_sil", label: "Sil" },
          { key: "firma_belge_dogrula", label: "Belge doğrula" },
          { key: "firma_paket_degistir", label: "Paket değiştir" },
          { key: "firma_impersonate", label: "Firmayı yönet" },
          { key: "firma_sifre_sifirla", label: "Şifre sıfırla" },
          { key: "firma_portfolyo_ata", label: "Portföye ata" },
          { key: "firma_portfolyo_sevk", label: "Portföy sevk et" },
        ],
      },
    ],
  },
  {
    label: "Portföy / CRM",
    icon: Briefcase,
    items: [
      {
        key: "portfolyo_goruntule", label: "Portföyü görüntüle", parent: true,
        children: [
          { key: "portfolyo_aksiyon_ekle", label: "Aksiyon ekle" },
          { key: "portfolyo_ziyaret_ekle", label: "Ziyaret planı ekle" },
          { key: "portfolyo_sevk", label: "Sevk et" },
          { key: "portfolyo_cikar", label: "Çıkar" },
          { key: "portfolyo_yetkili_yonet", label: "Yetkili yönet" },
        ],
      },
    ],
  },
  {
    label: "Aksiyonlar",
    icon: ClipboardList,
    items: [
      { key: "aksiyon_goruntule", label: "Görüntüle" },
      { key: "aksiyon_duzenle", label: "Düzenle / Sil" },
    ],
  },
  {
    label: "Ziyaret Planları",
    icon: MapPin,
    items: [
      { key: "ziyaret_goruntule", label: "Görüntüle" },
      { key: "ziyaret_duzenle", label: "Düzenle / Sil" },
    ],
  },
  {
    label: "PKL & Primler",
    icon: Target,
    items: [
      { key: "hedef_goruntule", label: "Görüntüle" },
      { key: "hedef_ata", label: "Ata / Düzenle" },
    ],
  },
  {
    label: "İhaleler",
    icon: Gavel,
    items: [
      {
        key: "ihale_goruntule", label: "Görüntüle", parent: true,
        children: [
          { key: "ihale_inceleyebilir", label: "İncele" },
          { key: "ihale_onaylayabilir", label: "Onayla" },
          { key: "ihale_duzenleyebilir", label: "Düzenle" },
          { key: "ihale_kaldirabilir", label: "Kaldır" },
        ],
      },
    ],
  },
  {
    label: "Ürünler",
    icon: Package,
    items: [
      {
        key: "urun_goruntule", label: "Görüntüle", parent: true,
        children: [
          { key: "urun_inceleyebilir", label: "İncele" },
          { key: "urun_onaylayabilir", label: "Onayla" },
          { key: "urun_duzenleyebilir", label: "Düzenle" },
          { key: "urun_kaldirabilir", label: "Kaldır" },
        ],
      },
    ],
  },
  {
    label: "Şikayetler",
    icon: MessageSquareWarning,
    items: [
      {
        key: "sikayet_goruntule", label: "Görüntüle", parent: true,
        children: [
          { key: "sikayet_detay_goruntule", label: "Detay görüntüle" },
          {
            key: "sikayet_islem_yapabilir", label: "İşlem yap", parent: true,
            children: [
              { key: "sikayet_kisitlama", label: "Kısıtlama" },
              { key: "sikayet_uzaklastirma", label: "Uzaklaştırma" },
              { key: "sikayet_yasaklama", label: "Yasaklama" },
            ],
          },
        ],
      },
    ],
  },
  {
    label: "Paket Yönetimi",
    icon: CreditCard,
    items: [
      { key: "paket_detay_goruntule", label: "Detay görüntüle" },
      { key: "paket_olusturabilir", label: "Oluştur" },
      { key: "paket_duzenleyebilir", label: "Düzenle" },
      { key: "paket_ekstra_hak", label: "Ekstra hak tanımla" },
    ],
  },
  {
    label: "Destek",
    icon: HeadphonesIcon,
    items: [
      { key: "destek_goruntule", label: "Görüntüle" },
      { key: "destek_cevap", label: "Cevap ver" },
    ],
  },
  {
    label: "Yönetim",
    icon: Users,
    items: [
      {
        key: "kullanici_goruntule", label: "Kullanıcıları görüntüle", parent: true,
        children: [
          { key: "kullanici_ekle", label: "Ekle" },
          { key: "kullanici_duzenle", label: "Düzenle" },
          { key: "kullanici_sil", label: "Sil" },
        ],
      },
      { key: "islem_goruntule", label: "İşlem logları" },
      { key: "harita_goruntule", label: "Canlı harita" },
      {
        key: "reklam_goruntule", label: "Reklam görüntüle", parent: true,
        children: [
          { key: "reklam_duzenle", label: "Banner düzenle" },
        ],
      },
      {
        key: "tekbot_goruntule", label: "TekBot görüntüle", parent: true,
        children: [
          { key: "tekbot_duzenle", label: "TekBot düzenle" },
        ],
      },
      { key: "yaptirim_goruntule", label: "Yaptırımlar" },
      { key: "rapor_goruntule", label: "Raporlar" },
      {
        key: "seo_goruntule", label: "SEO görüntüle", parent: true,
        children: [
          { key: "seo_duzenle", label: "SEO düzenle" },
        ],
      },
    ],
  },
];

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
const ALL_KEYS = getAllPermissionKeys();
const DEFAULT_PERMS = Object.fromEntries(ALL_KEYS.map(k => [k, false]));

function countEnabled(perms: Record<string, boolean>, items: PermissionItem[]): { total: number; enabled: number } {
  let total = 0, enabled = 0;
  function walk(list: PermissionItem[]) {
    for (const item of list) {
      total++;
      if (perms[item.key]) enabled++;
      if (item.children) walk(item.children);
    }
  }
  walk(items);
  return { total, enabled };
}

export default function AdminYetkilendirme() {
  const { token, user: currentUser, originalUser, hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const callApi = useAdminApi();
  const realUser = originalUser || currentUser;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({ ...DEFAULT_PERMS });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(PERMISSION_GROUPS.map(g => g.label)));

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const { data, error } = await supabase.rpc("admin_list_admin_users_v2");
      if (error) throw error;
      setUsers((data as any) || []);
    } catch {
      toast({ title: "Hata", description: "Kullanıcılar yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const trySelectUser = (u: AdminUser) => {
    if (dirty && u.id !== selectedUserId) {
      setPendingUserId(u.id);
      setShowUnsavedDialog(true);
      return;
    }
    doSelectUser(u.id);
  };

  const doSelectUser = (userId: string) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    setSelectedUserId(u.id);
    setPerms({ ...DEFAULT_PERMS, ...u.permissions });
    setDirty(false);
    setPendingUserId(null);
  };

  const handleDiscardAndSwitch = () => {
    setShowUnsavedDialog(false);
    if (pendingUserId) doSelectUser(pendingUserId);
  };

  const selectedUser = users.find(u => u.id === selectedUserId) || null;

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const togglePerm = (key: string, checked: boolean) => {
    const next = { ...perms, [key]: checked };
    if (!checked) {
      function disableChildren(items: PermissionItem[]) {
        for (const item of items) {
          if (item.key === key && item.children) {
            function off(children: PermissionItem[]) {
              for (const c of children) { next[c.key] = false; if (c.children) off(c.children); }
            }
            off(item.children);
          }
          if (item.children) disableChildren(item.children);
        }
      }
      PERMISSION_GROUPS.forEach(g => disableChildren(g.items));
    }
    setPerms(next);
    setDirty(true);
  };

  const toggleAllGroup = (group: PermissionGroup, enable: boolean) => {
    const next = { ...perms };
    function walk(items: PermissionItem[]) {
      for (const item of items) { next[item.key] = enable; if (item.children) walk(item.children); }
    }
    walk(group.items);
    setPerms(next);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selectedUser || !token) return;
    setSaving(true);
    try {
      await callApi("update-user", {
        token,
        userId: selectedUser.id,
        updates: { permissions: perms },
      });
      toast({ title: "Başarılı", description: `${selectedUser.ad} ${selectedUser.soyad} yetkileri güncellendi` });
      setDirty(false);
      // Update local state
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, permissions: perms } : u));
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Kaydedilemedi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canManage = realUser?.is_primary || hasPermission("kullanici_duzenle");
  const filteredUsers = users.filter(u =>
    !search || `${u.ad} ${u.soyad} ${u.username} ${u.departman}`.toLowerCase().includes(search.toLowerCase())
  );

  const sCard: CSSProperties = { background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))", borderRadius: "0.75rem" };
  const sText: CSSProperties = { color: "hsl(var(--admin-text))" };
  const sMuted: CSSProperties = { color: "hsl(var(--admin-muted))" };
  const sInput: CSSProperties = { background: "hsl(var(--admin-input-bg))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" };

  const filterItems = (items: PermissionItem[], query: string): PermissionItem[] => {
    if (!query) return items;
    return items.reduce<PermissionItem[]>((acc, item) => {
      const matchesSelf = item.label.toLowerCase().includes(query);
      const filteredChildren = item.children ? filterItems(item.children, query) : [];
      if (matchesSelf || filteredChildren.length > 0) {
        acc.push({ ...item, children: item.children ? (matchesSelf ? item.children : filteredChildren) : undefined });
      }
      return acc;
    }, []);
  };

  const permQuery = permSearch.toLowerCase();

  const renderItems = (items: PermissionItem[], depth = 0): React.ReactNode => {
    return items.map(item => {
      const checked = perms[item.key];
      const disabled = !canManage || (selectedUser?.is_primary ?? false);
      return (
        <div key={item.key}>
          <div className={cn("flex items-center gap-3 py-1.5 rounded-lg px-2 transition-colors hover:bg-amber-500/5", depth > 0 && "ml-5")}>
            <Checkbox
              id={`perm-${item.key}`}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(c) => togglePerm(item.key, !!c)}
              className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
              style={{ borderColor: "hsl(var(--admin-border))" }}
            />
            <Label htmlFor={`perm-${item.key}`} className={cn("text-sm cursor-pointer select-none", disabled && "opacity-50")} style={sText}>
              {item.label}
            </Label>
          </div>
          {item.children && checked && (
            <div className="space-y-0.5">{renderItems(item.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <AdminLayout title="Yetkilendirme">
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
        {/* Left: User List */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3" style={{ maxHeight: "100%" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={sMuted} />
            <Input
              placeholder="Kullanıcı ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10"
              style={sInput}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1" style={{ minHeight: 0 }}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-center py-8" style={sMuted}>Kullanıcı bulunamadı</p>
            ) : (
              filteredUsers.map(u => {
                const isSelected = u.id === selectedUserId;
                const enabledCount = Object.values(u.permissions || {}).filter(Boolean).length;
                return (
                  <button
                    key={u.id}
                    onClick={() => trySelectUser(u)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl transition-all duration-200 group",
                      isSelected
                        ? "ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/10"
                        : "hover:shadow-md"
                    )}
                    style={{
                      ...sCard,
                      ...(isSelected ? { background: "hsl(var(--admin-card-bg))", borderColor: "hsl(30 100% 50% / 0.4)" } : {}),
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold",
                        u.is_primary
                          ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white"
                          : "text-amber-500"
                      )} style={!u.is_primary ? { background: "hsl(30 100% 50% / 0.1)" } : undefined}>
                        {u.is_primary ? <ShieldCheck className="w-4 h-4" /> : u.ad[0]}{!u.is_primary && u.soyad[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={sText}>{u.ad} {u.soyad}</p>
                        <p className="text-xs truncate" style={sMuted}>{u.departman} · {u.pozisyon}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {u.is_primary ? (
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 text-[10px] px-2 py-0">
                          Süperadmin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0 border-amber-500/30 text-amber-500">
                          {enabledCount} yetki aktif
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Permission Grid */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center rounded-xl" style={sCard}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-600/10 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-base font-semibold" style={sText}>Yetkilendirme Paneli</p>
              <p className="text-sm mt-1" style={sMuted}>Düzenlemek istediğiniz kullanıcıyı seçin</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 rounded-t-xl shrink-0" style={{ ...sCard, borderRadius: "0.75rem 0.75rem 0 0", borderBottom: "none" }}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                    selectedUser.is_primary
                      ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white"
                      : "text-amber-500"
                  )} style={!selectedUser.is_primary ? { background: "hsl(30 100% 50% / 0.1)" } : undefined}>
                    {selectedUser.is_primary ? <ShieldCheck className="w-5 h-5" /> : `${selectedUser.ad[0]}${selectedUser.soyad[0]}`}
                  </div>
                  <div>
                    <p className="font-semibold" style={sText}>{selectedUser.ad} {selectedUser.soyad}</p>
                    <p className="text-xs" style={sMuted}>{selectedUser.departman} · {selectedUser.pozisyon}</p>
                  </div>
                  {selectedUser.is_primary && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 text-xs ml-2">
                      Süperadmin — Tüm yetkiler açık
                    </Badge>
                  )}
                </div>
                {canManage && !selectedUser.is_primary && dirty && (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                )}
              </div>

              {/* Permission Groups */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 rounded-b-xl" style={{ ...sCard, borderRadius: "0 0 0.75rem 0.75rem", borderTop: "none" }}>
               {/* Permission Search */}
               {!selectedUser.is_primary && (
                 <div className="relative mb-3">
                   <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={sMuted} />
                   <Input
                     placeholder="Yetki ara..."
                     value={permSearch}
                     onChange={e => setPermSearch(e.target.value)}
                     className="pl-9 h-9 text-sm"
                     style={sInput}
                   />
                 </div>
               )}
                {selectedUser.is_primary ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <ShieldAlert className="w-12 h-12 text-amber-500/40 mb-3" />
                    <p className="text-sm font-medium" style={sText}>Süperadmin hesabı tüm yetkilere sahiptir</p>
                    <p className="text-xs mt-1" style={sMuted}>Bu hesabın yetkileri değiştirilemez</p>
                  </div>
                ) : (
                  (() => {
                    const filteredGroups = PERMISSION_GROUPS.map(group => ({
                      ...group,
                      filteredItems: filterItems(group.items, permQuery),
                    })).filter(g => g.filteredItems.length > 0);

                    return filteredGroups.length === 0 ? (
                      <p className="text-sm text-center py-8" style={sMuted}>Eşleşen yetki bulunamadı</p>
                    ) : filteredGroups.map(group => {
                    const expanded = expandedGroups.has(group.label) || !!permQuery;
                    const { total, enabled } = countEnabled(perms, group.items);
                    const Icon = group.icon;
                    const allOn = enabled === total;
                    return (
                      <div key={group.label} className="rounded-xl overflow-hidden transition-all" style={{ background: "hsl(var(--admin-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                        <button
                          onClick={() => toggleGroup(group.label)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-amber-500/5 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(30 100% 50% / 0.1)" }}>
                            <Icon className="w-4 h-4 text-amber-500" />
                          </div>
                          <span className="text-sm font-semibold flex-1 text-left" style={sText}>{group.label}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2 py-0 border-0",
                              allOn ? "bg-emerald-500/10 text-emerald-500" : enabled > 0 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-400"
                            )}
                          >
                            {enabled}/{total}
                          </Badge>
                          {expanded ? <ChevronDown className="w-4 h-4" style={sMuted} /> : <ChevronRight className="w-4 h-4" style={sMuted} />}
                        </button>
                        {expanded && (
                          <div className="px-3 pb-3 space-y-0.5">
                            {canManage && !permQuery && (
                              <div className="flex gap-2 mb-2">
                                <button
                                  onClick={() => toggleAllGroup(group, true)}
                                  className="text-[11px] font-medium px-2 py-0.5 rounded text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                >
                                  Tümünü Aç
                                </button>
                                <button
                                  onClick={() => toggleAllGroup(group, false)}
                                  className="text-[11px] font-medium px-2 py-0.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  Tümünü Kapat
                                </button>
                              </div>
                            )}
                            {renderItems(group.filteredItems)}
                          </div>
                        )}
                      </div>
                    );
                  });
                  })()
                )}
              </div>
            </div>
          )}
        </div>

        {/* Unsaved changes dialog */}
        <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <AlertDialogContent style={{ background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))" }}>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2" style={{ color: "hsl(var(--admin-text))" }}>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Kaydedilmemiş Değişiklikler
              </AlertDialogTitle>
              <AlertDialogDescription style={{ color: "hsl(var(--admin-muted))" }}>
                Yetki değişiklikleri henüz kaydedilmedi. Kaydetmeden devam ederseniz değişiklikler kaybolacak.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>
                Geri Dön
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDiscardAndSwitch}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              >
                Kaydetmeden Geç
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
