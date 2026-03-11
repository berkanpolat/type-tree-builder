import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminTheme } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Users,
  Eye,
  Gavel,
  MessageSquare,
  Package,
  ShieldCheck,
  Loader2,
  Infinity,
} from "lucide-react";

interface Paket {
  id: string;
  ad: string;
  slug: string;
  aktif: boolean;
  profil_goruntuleme_limiti: number | null;
  ihale_acma_limiti: number | null;
  teklif_verme_limiti: number | null;
  aktif_urun_limiti: number;
  mesaj_limiti: number | null;
  fiyat_aylik: number | null;
  fiyat_yillik: number | null;
  para_birimi: string;
  stripe_price_aylik_id: string | null;
  stripe_price_yillik_id: string | null;
  created_at: string;
}

const emptyPaket: Omit<Paket, "id" | "created_at"> = {
  ad: "",
  slug: "",
  aktif: true,
  profil_goruntuleme_limiti: null,
  ihale_acma_limiti: null,
  teklif_verme_limiti: null,
  aktif_urun_limiti: 5,
  mesaj_limiti: null,
  fiyat_aylik: 0,
  fiyat_yillik: 0,
  para_birimi: "USD",
  stripe_price_aylik_id: null,
  stripe_price_yillik_id: null,
};

export default function AdminPaketler() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [paketler, setPaketler] = useState<Paket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPaket, setEditingPaket] = useState<Paket | null>(null);
  const [form, setForm] = useState(emptyPaket);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const callAdmin = useCallback(async (action: string, body: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, { body });
    if (error) throw error;
    return data;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        callAdmin("paketler-list", {}),
        callAdmin("paketler-stats", { token }),
      ]);
      setPaketler(listRes.paketler || []);
      setStats(statsRes.stats || {});
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, callAdmin, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateDialog = () => {
    setEditingPaket(null);
    setForm(emptyPaket);
    setDialogOpen(true);
  };

  const openEditDialog = (p: Paket) => {
    setEditingPaket(p);
    setForm({
      ad: p.ad,
      slug: p.slug,
      aktif: p.aktif,
      profil_goruntuleme_limiti: p.profil_goruntuleme_limiti,
      ihale_acma_limiti: p.ihale_acma_limiti,
      teklif_verme_limiti: p.teklif_verme_limiti,
      aktif_urun_limiti: p.aktif_urun_limiti,
      mesaj_limiti: p.mesaj_limiti,
      fiyat_aylik: p.fiyat_aylik,
      fiyat_yillik: p.fiyat_yillik,
      para_birimi: p.para_birimi,
      stripe_price_aylik_id: p.stripe_price_aylik_id,
      stripe_price_yillik_id: p.stripe_price_yillik_id,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.ad || !form.slug) {
      toast({ title: "Hata", description: "Paket adı ve slug zorunludur.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingPaket) {
        await callAdmin("paketler-update", { token, id: editingPaket.id, updates: form });
        toast({ title: "Başarılı", description: "Paket güncellendi." });
      } else {
        await callAdmin("paketler-create", { token, paket: form });
        toast({ title: "Başarılı", description: "Yeni paket oluşturuldu." });
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      const res = await callAdmin("paketler-delete", { token, id: deletingId });
      if (res.error) throw new Error(res.error);
      toast({ title: "Başarılı", description: "Paket silindi." });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderLimit = (val: number | null) => {
    if (val === null) return <span className="flex items-center gap-1"><Infinity className="w-4 h-4" /> Sınırsız</span>;
    if (val === 0) return <Badge variant="secondary" className="text-xs">Kapalı</Badge>;
    return <span>{val}</span>;
  };

  return (
    <AdminLayout title="Paket Yönetimi">
      <PaketContent
        paketler={paketler}
        stats={stats}
        loading={loading}
        saving={saving}
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        editingPaket={editingPaket}
        form={form}
        setForm={setForm}
        openCreateDialog={openCreateDialog}
        openEditDialog={openEditDialog}
        handleSave={handleSave}
        handleDelete={handleDelete}
        renderLimit={renderLimit}
        setDeletingId={setDeletingId}
      />
    </AdminLayout>
  );
}

// Separated component to use useAdminTheme inside AdminLayout
function PaketContent({
  paketler, stats, loading, saving, dialogOpen, setDialogOpen,
  deleteDialogOpen, setDeleteDialogOpen, editingPaket, form, setForm,
  openCreateDialog, openEditDialog, handleSave, handleDelete, renderLimit,
  setDeletingId,
}: any) {
  const lightMode = useAdminTheme();

  const cardStyle = {
    background: `hsl(var(--admin-card))`,
    borderColor: `hsl(var(--admin-border))`,
    color: `hsl(var(--admin-text))`,
  };
  const mutedStyle = { color: `hsl(var(--admin-muted))` };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={cardStyle} className="border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{paketler.length}</p>
              <p className="text-xs" style={mutedStyle}>Toplam Paket</p>
            </div>
          </CardContent>
        </Card>
        <Card style={cardStyle} className="border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{paketler.filter((p: Paket) => p.aktif).length}</p>
              <p className="text-xs" style={mutedStyle}>Aktif Paket</p>
            </div>
          </CardContent>
        </Card>
        <Card style={cardStyle} className="border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Object.values(stats).reduce((a: number, b: any) => a + b, 0)}</p>
              <p className="text-xs" style={mutedStyle}>Toplam Abone</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: `hsl(var(--admin-text))` }}>Paketler</h2>
        <Button onClick={openCreateDialog} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Yeni Paket
        </Button>
      </div>

      {/* Table */}
      <Card style={cardStyle} className="border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: `hsl(var(--admin-border))` }}>
                <TableHead style={mutedStyle}>Paket Adı</TableHead>
                <TableHead style={mutedStyle}>Durum</TableHead>
                <TableHead style={mutedStyle}>Abone</TableHead>
                <TableHead style={mutedStyle} className="text-center"><Eye className="w-4 h-4 inline mr-1" />Profil</TableHead>
                <TableHead style={mutedStyle} className="text-center"><Gavel className="w-4 h-4 inline mr-1" />İhale</TableHead>
                <TableHead style={mutedStyle} className="text-center"><Gavel className="w-4 h-4 inline mr-1" />Teklif</TableHead>
                <TableHead style={mutedStyle} className="text-center"><Package className="w-4 h-4 inline mr-1" />Ürün</TableHead>
                <TableHead style={mutedStyle} className="text-center"><MessageSquare className="w-4 h-4 inline mr-1" />Mesaj</TableHead>
                <TableHead style={mutedStyle}>Aylık Fiyat</TableHead>
                <TableHead style={mutedStyle}>Yıllık Fiyat</TableHead>
                <TableHead style={mutedStyle} className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paketler.map((p: Paket) => (
                <TableRow key={p.id} style={{ borderColor: `hsl(var(--admin-border))` }}>
                  <TableCell style={{ color: `hsl(var(--admin-text))` }}>
                    <div>
                      <span className="font-medium">{p.ad}</span>
                      <span className="text-xs ml-2" style={mutedStyle}>({p.slug})</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={p.aktif ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                      {p.aktif ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ color: `hsl(var(--admin-text))` }}>
                    {stats[p.id] || 0}
                  </TableCell>
                  <TableCell className="text-center" style={{ color: `hsl(var(--admin-text))` }}>{renderLimit(p.profil_goruntuleme_limiti)}</TableCell>
                  <TableCell className="text-center" style={{ color: `hsl(var(--admin-text))` }}>{renderLimit(p.ihale_acma_limiti)}</TableCell>
                  <TableCell className="text-center" style={{ color: `hsl(var(--admin-text))` }}>{renderLimit(p.teklif_verme_limiti)}</TableCell>
                  <TableCell className="text-center" style={{ color: `hsl(var(--admin-text))` }}>{p.aktif_urun_limiti}</TableCell>
                  <TableCell className="text-center" style={{ color: `hsl(var(--admin-text))` }}>{renderLimit(p.mesaj_limiti)}</TableCell>
                  <TableCell style={{ color: `hsl(var(--admin-text))` }}>
                    {p.fiyat_aylik != null ? `${p.fiyat_aylik} ${p.para_birimi}` : "-"}
                  </TableCell>
                  <TableCell style={{ color: `hsl(var(--admin-text))` }}>
                    {p.fiyat_yillik != null ? `${p.fiyat_yillik} ${p.para_birimi}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(p)}
                        className="hover:bg-amber-500/10 hover:text-amber-500" style={{ color: `hsl(var(--admin-muted))` }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setDeletingId(p.id); setDeleteDialogOpen(true); }}
                        className="hover:bg-red-500/10 hover:text-red-500" style={{ color: `hsl(var(--admin-muted))` }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paketler.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8" style={mutedStyle}>Henüz paket bulunmamaktadır.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }}>
          <DialogHeader>
            <DialogTitle style={{ color: `hsl(var(--admin-text))` }}>
              {editingPaket ? "Paketi Düzenle" : "Yeni Paket Oluştur"}
            </DialogTitle>
            <DialogDescription style={mutedStyle}>
              Paket özelliklerini ve kısıtlamalarını belirleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* Basic info */}
            <div className="space-y-2">
              <Label style={mutedStyle}>Paket Adı *</Label>
              <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })}
                placeholder="PRO" style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>
            <div className="space-y-2">
              <Label style={mutedStyle}>Slug *</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="pro" style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>

            {/* Prices */}
            <div className="space-y-2">
              <Label style={mutedStyle}>Aylık Fiyat</Label>
              <Input type="number" value={form.fiyat_aylik ?? ""} onChange={(e) => setForm({ ...form, fiyat_aylik: e.target.value ? Number(e.target.value) : null })}
                placeholder="199" style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>
            <div className="space-y-2">
              <Label style={mutedStyle}>Yıllık Fiyat</Label>
              <Input type="number" value={form.fiyat_yillik ?? ""} onChange={(e) => setForm({ ...form, fiyat_yillik: e.target.value ? Number(e.target.value) : null })}
                placeholder="1299" style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>
            <div className="space-y-2">
              <Label style={mutedStyle}>Para Birimi</Label>
              <Input value={form.para_birimi} onChange={(e) => setForm({ ...form, para_birimi: e.target.value })}
                placeholder="USD" style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>
            <div className="flex items-end gap-3 pb-1">
              <div className="flex items-center gap-2">
                <Switch checked={form.aktif} onCheckedChange={(v) => setForm({ ...form, aktif: v })}
                  className="data-[state=checked]:bg-green-500" />
                <Label style={{ color: `hsl(var(--admin-text))` }}>Aktif</Label>
              </div>
            </div>

            {/* Limits - full width section */}
            <div className="col-span-2 pt-2">
              <h3 className="text-sm font-semibold mb-3" style={{ color: `hsl(var(--admin-text))` }}>
                Kısıtlama Modülleri
              </h3>
              <p className="text-xs mb-4" style={mutedStyle}>
                Boş bırakılan alanlar "sınırsız", 0 ise "kapalı" olarak işlenir.
              </p>
            </div>

            <div className="space-y-2">
              <Label style={mutedStyle} className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Profil Görüntüleme Limiti</Label>
              <Input type="number" value={form.profil_goruntuleme_limiti ?? ""} onChange={(e) => setForm({ ...form, profil_goruntuleme_limiti: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="Sınırsız" style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>
            <div className="space-y-2">
              <Label style={mutedStyle} className="flex items-center gap-1"><Gavel className="w-3.5 h-3.5" /> İhale Açma Limiti</Label>
              <Input type="number" value={form.ihale_acma_limiti ?? ""} onChange={(e) => setForm({ ...form, ihale_acma_limiti: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="Sınırsız" style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>
            <div className="space-y-2">
              <Label style={mutedStyle} className="flex items-center gap-1"><Gavel className="w-3.5 h-3.5" /> Teklif Verme Limiti</Label>
              <Input type="number" value={form.teklif_verme_limiti ?? ""} onChange={(e) => setForm({ ...form, teklif_verme_limiti: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="Sınırsız" style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>
            <div className="space-y-2">
              <Label style={mutedStyle} className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Aktif Ürün Limiti</Label>
              <Input type="number" value={form.aktif_urun_limiti} onChange={(e) => setForm({ ...form, aktif_urun_limiti: Number(e.target.value) || 0 })}
                placeholder="5" style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>
            <div className="space-y-2">
              <Label style={mutedStyle} className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Mesaj Limiti</Label>
              <Input type="number" value={form.mesaj_limiti ?? ""} onChange={(e) => setForm({ ...form, mesaj_limiti: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="Sınırsız" style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>

            {/* Stripe IDs */}
            <div className="col-span-2 pt-2">
              <h3 className="text-sm font-semibold mb-3" style={{ color: `hsl(var(--admin-text))` }}>
                Stripe Entegrasyonu
              </h3>
            </div>
            <div className="space-y-2">
              <Label style={mutedStyle}>Stripe Aylık Price ID</Label>
              <Input value={form.stripe_price_aylik_id ?? ""} onChange={(e) => setForm({ ...form, stripe_price_aylik_id: e.target.value || null })}
                placeholder="price_..." style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>
            <div className="space-y-2">
              <Label style={mutedStyle}>Stripe Yıllık Price ID</Label>
              <Input value={form.stripe_price_yillik_id ?? ""} onChange={(e) => setForm({ ...form, stripe_price_yillik_id: e.target.value || null })}
                placeholder="price_..." style={{ background: `hsl(var(--admin-bg))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }} />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}
              style={{ borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }}>
              İptal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPaket ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }}>
          <DialogHeader>
            <DialogTitle style={{ color: `hsl(var(--admin-text))` }}>Paketi Sil</DialogTitle>
            <DialogDescription style={mutedStyle}>
              Bu paketi silmek istediğinizden emin misiniz? Abone olan kullanıcılar varsa silme işlemi yapılamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}
              style={{ borderColor: `hsl(var(--admin-border))`, color: `hsl(var(--admin-text))` }}>
              İptal
            </Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-500 hover:bg-red-600 text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
