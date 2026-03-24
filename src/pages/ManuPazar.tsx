import { useEffect, useState, useCallback } from "react";
import { useSessionState } from "@/hooks/use-session-state";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePackageQuota } from "@/hooks/use-package-quota";
import UpgradeDialog from "@/components/UpgradeDialog";
import {
  Layers, CheckCircle2, XCircle, Plus, Search, Pencil, Trash2, ImageIcon, Copy, Eye, Heart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Urun {
  id: string;
  urun_no: string;
  baslik: string;
  foto_url: string | null;
  urun_kategori_id: string | null;
  urun_grup_id: string | null;
  urun_tur_id: string | null;
  fiyat_tipi: string;
  fiyat: number | null;
  para_birimi: string | null;
  durum: string;
  updated_at: string;
  goruntuleme_sayisi?: number;
  fake_favori_sayisi?: number;
  favori_sayisi?: number; // computed
}

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";

const paraBirimiSymbol: Record<string, string> = {
  TRY: "₺", USD: "$", EUR: "€", GBP: "£",
};

export default function ManuPazar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useSessionState("searchTerm", "");
  const [filterKategori, setFilterKategori] = useSessionState("filterKategori", "all");
  const [filterGrup, setFilterGrup] = useSessionState("filterGrup", "all");
  const [filterTur, setFilterTur] = useSessionState("filterTur", "all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Category options for filters
  const [kategoriler, setKategoriler] = useState<{ id: string; name: string }[]>([]);
  const [gruplar, setGruplar] = useState<{ id: string; name: string }[]>([]);
  const [turler, setTurler] = useState<{ id: string; name: string }[]>([]);
  // Name maps
  const [secenekMap, setSecenekMap] = useState<Record<string, string>>({});
  const packageInfo = usePackageQuota();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  useEffect(() => {
    fetchData();
    fetchKategoriler();
  }, []);

  useEffect(() => {
    if (filterKategori && filterKategori !== "all") {
      fetchGruplar(filterKategori);
    } else {
      setGruplar([]);
      setFilterGrup("all");
      setFilterTur("all");
    }
  }, [filterKategori]);

  useEffect(() => {
    if (filterGrup && filterGrup !== "all") {
      fetchTurler(filterGrup);
    } else {
      setTurler([]);
      setFilterTur("all");
    }
  }, [filterGrup]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("urunler")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      // Get favori counts per urun
      const urunIds = data.map(u => u.id);
      let favCountMap: Record<string, number> = {};
      if (urunIds.length > 0) {
        const { data: favData } = await supabase
          .from("urun_favoriler")
          .select("urun_id")
          .in("urun_id", urunIds);
        favData?.forEach(f => {
          favCountMap[f.urun_id] = (favCountMap[f.urun_id] || 0) + 1;
        });
      }

      const enriched = data.map(u => ({
        ...u,
        favori_sayisi: (favCountMap[u.id] || 0) + (u.fake_favori_sayisi || 0),
      }));
      setUrunler(enriched);
      setUrunler(data);
      // Collect all secenek IDs to resolve names
      const ids = new Set<string>();
      data.forEach((u) => {
        if (u.urun_kategori_id) ids.add(u.urun_kategori_id);
        if (u.urun_grup_id) ids.add(u.urun_grup_id);
        if (u.urun_tur_id) ids.add(u.urun_tur_id);
      });
      if (ids.size > 0) {
        const { data: secenekler } = await supabase
          .from("firma_bilgi_secenekleri")
          .select("id, name")
          .in("id", Array.from(ids));
        if (secenekler) {
          const map: Record<string, string> = {};
          secenekler.forEach((s) => { map[s.id] = s.name; });
          setSecenekMap(map);
        }
      }
    }
    setLoading(false);
  };

  const fetchKategoriler = async () => {
    const { data } = await supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_ID)
      .is("parent_id", null)
      .order("name");
    if (data) setKategoriler(data);
  };

  const fetchGruplar = async (parentId: string) => {
    const { data } = await supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_ID)
      .eq("parent_id", parentId)
      .order("name");
    if (data) setGruplar(data);
  };

  const fetchTurler = async (parentId: string) => {
    const { data } = await supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_ID)
      .eq("parent_id", parentId)
      .order("name");
    if (data) setTurler(data);
  };

  const handleToggleDurum = async (urun: Urun) => {
    const newDurum = urun.durum === "aktif" ? "pasif" : "aktif";
    // If activating, check live active product count
    if (newDurum === "aktif") {
      if (packageInfo.loading) {
        toast({ title: "Paket bilgisi yükleniyor", description: "Lütfen birkaç saniye sonra tekrar deneyin.", variant: "destructive" });
        return;
      }

      const aktifLimit = packageInfo.limits.aktif_urun_limiti;
      const aktifSayisi = urunler.filter((u) => u.durum === "aktif").length;

      if (aktifLimit !== null && aktifSayisi >= aktifLimit) {
        setUpgradeMessage(`Aktif ürün limitiniz dolmuştur (${aktifSayisi}/${aktifLimit}). PRO pakete yükselterek daha fazla aktif ürün yayınlayabilirsiniz.`);
        setUpgradeOpen(true);
        return;
      }
    }
    const { error } = await supabase.from("urunler").update({ durum: newDurum }).eq("id", urun.id);
    if (error) {
      toast({ title: "Hata", description: "Durum güncellenemedi.", variant: "destructive" });
    } else {
      setUrunler((prev) => prev.map((u) => u.id === urun.id ? { ...u, durum: newDurum } : u));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("urunler").delete().eq("id", id);
    if (error) {
      toast({ title: "Hata", description: "Ürün silinemedi.", variant: "destructive" });
    } else {
      toast({ title: "Ürün silindi" });
      setUrunler((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const toplamUrun = urunler.length;
  const aktifUrun = urunler.filter((u) => u.durum === "aktif").length;
  const pasifUrun = urunler.filter((u) => u.durum === "pasif").length;

  const filteredUrunler = urunler.filter((u) => {
    const matchSearch =
      u.baslik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.urun_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchKat = filterKategori === "all" || u.urun_kategori_id === filterKategori;
    const matchGrup = filterGrup === "all" || u.urun_grup_id === filterGrup;
    const matchTur = filterTur === "all" || u.urun_tur_id === filterTur;
    return matchSearch && matchKat && matchGrup && matchTur;
  });

  return (
    <DashboardLayout title="Pazarım">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Pazarım</h2>
            <p className="text-sm text-muted-foreground">Mağazandaki ürünleri yönet, düzenle ve yeni ürün ekle.</p>
          </div>
          <Button onClick={() => navigate("/urunlerim/yeni")} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Yeni Ürün
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Layers className="w-4 h-4 text-primary" />
                Toplam Ürün
              </div>
              <p className="text-3xl font-bold text-foreground">{toplamUrun}</p>
              <p className="text-xs text-muted-foreground mt-1">Tüm ürünler</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Aktif Ürün
              </div>
              <p className="text-3xl font-bold text-foreground">{aktifUrun}</p>
              <p className="text-xs text-muted-foreground mt-1">Aktif ürünler</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <XCircle className="w-4 h-4 text-destructive" />
                Pasif Ürün
              </div>
              <p className="text-3xl font-bold text-foreground">{pasifUrun}</p>
              <p className="text-xs text-muted-foreground mt-1">Pasif ürünler</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ürün adı, SKU/ID, kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-3 sm:flex gap-2 sm:gap-3">
            <Select value={filterKategori} onValueChange={(v) => { setFilterKategori(v); setFilterGrup("all"); setFilterTur("all"); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Tümü</SelectItem>
                {kategoriler.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterGrup} onValueChange={(v) => { setFilterGrup(v); setFilterTur("all"); }} disabled={filterKategori === "all"}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Grup" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Tümü</SelectItem>
                {gruplar.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTur} onValueChange={setFilterTur} disabled={filterGrup === "all"}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Tür" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Tümü</SelectItem>
                {turler.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : filteredUrunler.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Henüz ürün bulunmamaktadır.</div>
          ) : (
            filteredUrunler.map((urun) => (
              <Card key={urun.id} className="cursor-pointer" onClick={() => navigate(`/urunlerim/duzenle/${urun.id}`)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {urun.foto_url ? <img src={urun.foto_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{urun.baslik}</p>
                      <p className="text-xs text-muted-foreground">{urun.urun_no}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        urun.durum === "aktif" ? "bg-emerald-100 text-emerald-700"
                        : urun.durum === "onay_bekliyor" ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                      }
                    >
                      {urun.durum === "aktif" ? "Aktif" : urun.durum === "pasif" ? "Pasif" : urun.durum === "onay_bekliyor" ? "Onay Bekliyor" : "Taslak"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{urun.urun_kategori_id ? secenekMap[urun.urun_kategori_id] || "-" : "-"}</span>
                    <span className="font-medium text-foreground">
                      {urun.fiyat != null
                        ? `${urun.fiyat.toLocaleString("tr-TR")} ${paraBirimiSymbol[urun.para_birimi || "TRY"] || urun.para_birimi}`
                        : urun.fiyat_tipi === "varyasyonlu" ? "Varyasyonlu" : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={urun.durum === "aktif"}
                          onCheckedChange={() => handleToggleDurum(urun)}
                          disabled={urun.durum === "taslak" || urun.durum === "onay_bekliyor"}
                        />
                        <span>{format(new Date(urun.updated_at), "dd MMM yyyy", { locale: tr })}</span>
                      </div>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{urun.goruntuleme_sayisi ?? 0}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{urun.favori_sayisi ?? 0}</span>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/urunlerim/duzenle/${urun.id}`)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Kopyala" onClick={() => navigate(`/urunlerim/yeni?kopyala=${urun.id}`)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(urun.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <Card className="hidden md:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Grup</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead className="text-center">
                    <Eye className="w-3.5 h-3.5 inline mr-1" />Gör.
                  </TableHead>
                  <TableHead className="text-center">
                    <Heart className="w-3.5 h-3.5 inline mr-1" />Fav.
                  </TableHead>
                  <TableHead>Güncelleme</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-center sticky-action-col">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Yükleniyor...</TableCell>
                  </TableRow>
                ) : filteredUrunler.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Henüz ürün bulunmamaktadır.</TableCell>
                  </TableRow>
                ) : (
                  filteredUrunler.map((urun) => (
                    <TableRow key={urun.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {urun.foto_url ? <img src={urun.foto_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm truncate max-w-[200px]">{urun.baslik}</p>
                            <p className="text-xs text-muted-foreground">{urun.urun_no}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">
                        {urun.urun_kategori_id ? secenekMap[urun.urun_kategori_id] || "-" : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">
                        {urun.urun_grup_id ? secenekMap[urun.urun_grup_id] || "-" : "-"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {urun.fiyat != null
                          ? `${urun.fiyat.toLocaleString("tr-TR")} ${paraBirimiSymbol[urun.para_birimi || "TRY"] || urun.para_birimi}`
                          : urun.fiyat_tipi === "varyasyonlu" ? "Varyasyonlu" : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground">{urun.goruntuleme_sayisi ?? 0}</TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground">{urun.favori_sayisi ?? 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(urun.updated_at), "dd MMM yyyy", { locale: tr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={urun.durum === "aktif"}
                            onCheckedChange={() => handleToggleDurum(urun)}
                            disabled={urun.durum === "taslak" || urun.durum === "onay_bekliyor"}
                          />
                          <Badge
                            variant="secondary"
                            className={
                              urun.durum === "aktif" ? "bg-emerald-100 text-emerald-700"
                              : urun.durum === "pasif" ? "bg-muted text-muted-foreground"
                              : urun.durum === "onay_bekliyor" ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-muted-foreground"
                            }
                          >
                            {urun.durum === "aktif" ? "Aktif" : urun.durum === "pasif" ? "Pasif" : urun.durum === "onay_bekliyor" ? "Onay Bekliyor" : "Taslak"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="sticky-action-col">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/urunlerim/duzenle/${urun.id}`)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Kopyala" onClick={() => navigate(`/urunlerim/yeni?kopyala=${urun.id}`)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(urun.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Aktif Ürün Limitiniz Doldu"
        message={upgradeMessage}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünü Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm ilişkili veriler silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null); }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
