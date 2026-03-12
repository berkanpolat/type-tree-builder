import { useEffect, useState, useCallback } from "react";
import { useSessionState } from "@/hooks/use-session-state";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Layers,
  CheckCircle2,
  PauseCircle,
  Plus,
  Search,
  Eye,
  Trash2,
  ExternalLink,
  ImageIcon,
  TrendingUp,
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

interface Ihale {
  id: string;
  ihale_no: string;
  baslik: string;
  foto_url: string | null;
  teklif_usulu: string;
  durum: string;
  baslangic_tarihi: string | null;
  bitis_tarihi: string | null;
  goruntuleme_sayisi: number;
  created_at: string;
}

interface IhaleTeklif {
  ihale_id: string;
  tutar: number;
}

const durumLabels: Record<string, string> = {
  duzenleniyor: "Düzenleniyor",
  onay_bekliyor: "Onay Bekliyor",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
  iptal: "İptal Edildi",
};

const durumColors: Record<string, string> = {
  duzenleniyor: "bg-muted text-muted-foreground",
  onay_bekliyor: "bg-amber-100 text-amber-700",
  devam_ediyor: "bg-emerald-100 text-emerald-700",
  tamamlandi: "bg-blue-100 text-blue-700",
  iptal: "bg-red-100 text-red-700",
};

const teklifUsuluLabels: Record<string, string> = {
  acik_indirme: "Açık İndirme",
  acik_arttirma: "Açık Arttırma",
  kapali_teklif: "Kapalı Teklif",
};

export default function ManuIhale() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ihaleler, setIhaleler] = useState<Ihale[]>([]);
  const [teklifler, setTeklifler] = useState<IhaleTeklif[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useSessionState("searchTerm", "");
  const [filterDurum, setFilterDurum] = useSessionState("filterDurum", "all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    console.log("ManuIhale fetchData - user:", user?.id);
    if (!user) { setLoading(false); return; }

    const [ihaleRes, teklifRes] = await Promise.all([
      supabase.from("ihaleler").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("ihale_teklifler").select("ihale_id, tutar"),
    ]);

    console.log("ManuIhale fetchData - ihaleRes:", ihaleRes.data?.length, ihaleRes.error);
    console.log("ManuIhale fetchData - teklifRes:", teklifRes.data?.length, teklifRes.error);

    if (ihaleRes.data) setIhaleler(ihaleRes.data);
    if (teklifRes.data) setTeklifler(teklifRes.data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("ihaleler").delete().eq("id", id);
    if (error) {
      toast({ title: "Hata", description: "İhale silinemedi.", variant: "destructive" });
    } else {
      toast({ title: "İhale silindi" });
      setIhaleler((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const toplamIhale = ihaleler.length;
  const aktifIhale = ihaleler.filter((i) => i.durum === "devam_ediyor").length;
  const tamamlananIhale = ihaleler.filter((i) => i.durum === "tamamlandi").length;

  const getTeklifSayisi = (ihaleId: string) =>
    teklifler.filter((t) => t.ihale_id === ihaleId).length;

  const getEnIyiTeklif = (ihale: Ihale) => {
    const ihaleTeklifleri = teklifler.filter((t) => t.ihale_id === ihale.id);
    if (ihaleTeklifleri.length === 0) return null;
    const tutarlar = ihaleTeklifleri.map((t) => t.tutar);
    if (ihale.teklif_usulu === "acik_indirme") return Math.min(...tutarlar);
    return Math.max(...tutarlar);
  };

  const filteredIhaleler = ihaleler.filter((ihale) => {
    const matchSearch =
      ihale.baslik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ihale.ihale_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDurum = filterDurum === "all" || ihale.durum === filterDurum;
    return matchSearch && matchDurum;
  });

  return (
    <DashboardLayout title="İhalelerim">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">İhalelerim</h2>
          <Button onClick={() => navigate("/ihalelerim/yeni")} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Yeni İhale Oluştur
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Layers className="w-4 h-4 text-primary" />
                Toplam İhale
              </div>
              <p className="text-3xl font-bold text-foreground">{toplamIhale}</p>
              <p className="text-xs text-muted-foreground mt-1">Tüm ihaleler</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Aktif İhale
              </div>
              <p className="text-3xl font-bold text-foreground">{aktifIhale}</p>
              <p className="text-xs text-muted-foreground mt-1">Aktif ihaleler</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <PauseCircle className="w-4 h-4 text-destructive" />
                Tamamlanan İhale
              </div>
              <p className="text-3xl font-bold text-foreground">{tamamlananIhale}</p>
              <p className="text-xs text-muted-foreground mt-1">Süresi dolan / tamamlanan ihaleler</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterDurum} onValueChange={setFilterDurum}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="duzenleniyor">Düzenleniyor</SelectItem>
              <SelectItem value="onay_bekliyor">Onay Bekliyor</SelectItem>
              <SelectItem value="devam_ediyor">Devam Ediyor</SelectItem>
              <SelectItem value="tamamlandi">Tamamlandı</SelectItem>
              <SelectItem value="iptal">İptal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Yükleniyor...</div>
          ) : filteredIhaleler.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Henüz ihale bulunmamaktadır.</div>
          ) : (
            filteredIhaleler.map((ihale) => {
              const teklifSayisi = getTeklifSayisi(ihale.id);
              const enIyiTeklif = getEnIyiTeklif(ihale);
              return (
                <Card
                  key={ihale.id}
                  className="cursor-pointer"
                  onClick={() => {
                    if (ihale.durum === "duzenleniyor" || ihale.durum === "onay_bekliyor") navigate(`/ihalelerim/duzenle/${ihale.id}`);
                    else if (ihale.durum === "devam_ediyor" || ihale.durum === "tamamlandi") navigate(`/ihalelerim/takip/${ihale.id}`);
                    else navigate(`/ihaleler/${ihale.slug || ihale.id}`);
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {ihale.foto_url ? <img src={ihale.foto_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{ihale.baslik}</p>
                        <p className="text-xs text-muted-foreground">#{ihale.ihale_no}</p>
                      </div>
                      <Badge variant="secondary" className={durumColors[ihale.durum] || ""}>
                        {durumLabels[ihale.durum] || ihale.durum}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Görüntülenme</p>
                        <p className="text-sm font-semibold text-foreground">{ihale.goruntuleme_sayisi}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Teklif</p>
                        <p className="text-sm font-semibold text-foreground">{teklifSayisi}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">En İyi</p>
                        <p className="text-sm font-semibold text-foreground">{enIyiTeklif !== null ? `₺${enIyiTeklif.toLocaleString("tr-TR")}` : "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div>
                        {ihale.baslangic_tarihi && <span>{format(new Date(ihale.baslangic_tarihi), "dd MMM yyyy", { locale: tr })}</span>}
                        {ihale.bitis_tarihi && <span className="text-destructive"> → {format(new Date(ihale.bitis_tarihi), "dd MMM yyyy", { locale: tr })}</span>}
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {(ihale.durum === "devam_ediyor" || ihale.durum === "tamamlandi") && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="İhale Takip" onClick={() => navigate(`/ihalelerim/takip/${ihale.id}`)}>
                            <TrendingUp className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          if (ihale.durum === "duzenleniyor" || ihale.durum === "onay_bekliyor") navigate(`/ihalelerim/duzenle/${ihale.id}`);
                          else navigate(`/ihaleler/${ihale.id}`);
                        }}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(ihale.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İhale Bilgileri</TableHead>
                  <TableHead className="text-center">Görüntülenme</TableHead>
                  <TableHead className="text-center">Teklif Sayısı</TableHead>
                  <TableHead className="text-center">En İyi Teklif</TableHead>
                  <TableHead>Süreç</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-center">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Yükleniyor...</TableCell>
                  </TableRow>
                ) : filteredIhaleler.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Henüz ihale bulunmamaktadır.</TableCell>
                  </TableRow>
                ) : (
                  filteredIhaleler.map((ihale) => {
                    const teklifSayisi = getTeklifSayisi(ihale.id);
                    const enIyiTeklif = getEnIyiTeklif(ihale);
                    return (
                      <TableRow
                        key={ihale.id}
                        className="cursor-pointer"
                        onClick={() => {
                          if (ihale.durum === "duzenleniyor" || ihale.durum === "onay_bekliyor") navigate(`/ihalelerim/duzenle/${ihale.id}`);
                          else if (ihale.durum === "devam_ediyor" || ihale.durum === "tamamlandi") navigate(`/ihalelerim/takip/${ihale.id}`);
                          else navigate(`/ihaleler/${ihale.id}`);
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                              {ihale.foto_url ? <img src={ihale.foto_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{ihale.baslik}</p>
                              <p className="text-xs text-muted-foreground">#{ihale.ihale_no}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                            <Eye className="w-3.5 h-3.5" />{ihale.goruntuleme_sayisi}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">{teklifSayisi}</TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          {enIyiTeklif !== null ? `₺${enIyiTeklif.toLocaleString("tr-TR")}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {ihale.baslangic_tarihi && <p>{format(new Date(ihale.baslangic_tarihi), "dd MMM yyyy", { locale: tr })}</p>}
                            {ihale.bitis_tarihi && <p className="text-destructive">{format(new Date(ihale.bitis_tarihi), "dd MMM yyyy", { locale: tr })}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={durumColors[ihale.durum] || ""}>{durumLabels[ihale.durum] || ihale.durum}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {(ihale.durum === "devam_ediyor" || ihale.durum === "tamamlandi") && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="İhale Takip" onClick={() => navigate(`/ihalelerim/takip/${ihale.id}`)}>
                                <TrendingUp className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              if (ihale.durum === "duzenleniyor" || ihale.durum === "onay_bekliyor") navigate(`/ihalelerim/duzenle/${ihale.id}`);
                              else navigate(`/ihaleler/${ihale.id}`);
                            }}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(ihale.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İhaleyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ihaleyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm ilişkili veriler silinecektir.
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
