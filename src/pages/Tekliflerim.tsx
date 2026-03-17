import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Layers, CheckCircle2, XCircle, Search, ImageIcon, Plus,
} from "lucide-react";

const durumLabels: Record<string, string> = {
  inceleniyor: "İnceleniyor",
  kabul_edildi: "Kabul Edildi",
  reddedildi: "Reddedildi",
};

const durumColors: Record<string, string> = {
  inceleniyor: "bg-amber-100 text-amber-700",
  kabul_edildi: "bg-emerald-100 text-emerald-700",
  reddedildi: "bg-red-100 text-red-700",
};

const ihaleTuruLabels: Record<string, string> = {
  urun_alis: "Ürün Alış İhalesi",
  urun_satis: "Ürün Satış İhalesi",
  hizmet_alim: "Hizmet Alım İhalesi",
};

const teklifUsuluLabels: Record<string, string> = {
  acik_indirme: "Açık İndirme",
  acik_arttirma: "Açık Arttırma",
  kapali_teklif: "Kapalı Teklif",
};

interface TeklifRow {
  id: string;
  tutar: number;
  durum: string;
  created_at: string;
  ihale_id: string;
  ihale_no: string;
  ihale_baslik: string;
  ihale_foto_url: string | null;
  ihale_turu: string;
  teklif_usulu: string;
  baslangic_tarihi: string | null;
  bitis_tarihi: string | null;
  teklif_sirasi: number | null;
  ihale_slug: string | null;
}

export default function Tekliflerim() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teklifler, setTeklifler] = useState<TeklifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIhaleTuru, setFilterIhaleTuru] = useState("all");
  const [filterTeklifUsulu, setFilterTeklifUsulu] = useState("all");

  useEffect(() => {
    fetchTeklifler();
  }, []);

  const fetchTeklifler = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Get user's teklifler with ihale info
    const { data: userTeklifler, error } = await supabase
      .from("ihale_teklifler")
      .select("id, tutar, durum, created_at, ihale_id")
      .eq("teklif_veren_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !userTeklifler || userTeklifler.length === 0) {
      setTeklifler([]);
      setLoading(false);
      return;
    }

    // Get unique ihale IDs and fetch only the latest teklif per ihale
    const latestPerIhale = new Map<string, typeof userTeklifler[0]>();
    for (const t of userTeklifler) {
      if (!latestPerIhale.has(t.ihale_id)) {
        latestPerIhale.set(t.ihale_id, t);
      }
    }

    const ihaleIds = Array.from(latestPerIhale.keys());
    const { data: ihaleler } = await supabase
      .from("ihaleler")
      .select("id, ihale_no, baslik, foto_url, ihale_turu, teklif_usulu, baslangic_tarihi, bitis_tarihi, slug")
      .in("id", ihaleIds);

    // Get all teklifler for ranking (for open auctions)
    const { data: allTeklifler } = await supabase
      .from("ihale_teklifler")
      .select("ihale_id, tutar, teklif_veren_user_id")
      .in("ihale_id", ihaleIds);

    const ihaleMap = new Map((ihaleler || []).map((i) => [i.id, i]));

    const rows: TeklifRow[] = [];
    for (const [ihaleId, teklif] of latestPerIhale) {
      const ihale = ihaleMap.get(ihaleId);
      if (!ihale) continue;

      // Calculate ranking
      let teklif_sirasi: number | null = null;
      if (allTeklifler) {
        const ihaleTeklifleri = allTeklifler.filter((t) => t.ihale_id === ihaleId);
        // Group by user, get latest (highest/lowest depending on usul)
        const userBests = new Map<string, number>();
        for (const t of ihaleTeklifleri) {
          const existing = userBests.get(t.teklif_veren_user_id);
          if (existing === undefined) {
            userBests.set(t.teklif_veren_user_id, t.tutar);
          } else {
            if (ihale.teklif_usulu === "acik_indirme") {
              userBests.set(t.teklif_veren_user_id, Math.min(existing, t.tutar));
            } else {
              userBests.set(t.teklif_veren_user_id, Math.max(existing, t.tutar));
            }
          }
        }

        const sorted = Array.from(userBests.entries()).sort((a, b) => {
          if (ihale.teklif_usulu === "acik_indirme") return a[1] - b[1];
          return b[1] - a[1];
        });

        const userIndex = sorted.findIndex(([uid]) => uid === user.id);
        if (userIndex >= 0) teklif_sirasi = userIndex + 1;
      }

      rows.push({
        id: teklif.id,
        tutar: teklif.tutar,
        durum: (teklif as any).durum || "inceleniyor",
        created_at: teklif.created_at,
        ihale_id: ihaleId,
        ihale_no: ihale.ihale_no,
        ihale_baslik: ihale.baslik,
        ihale_foto_url: ihale.foto_url,
        ihale_turu: ihale.ihale_turu,
        teklif_usulu: ihale.teklif_usulu,
        baslangic_tarihi: ihale.baslangic_tarihi,
        bitis_tarihi: ihale.bitis_tarihi,
        teklif_sirasi,
        ihale_slug: (ihale as any).slug || null,
      });
    }

    setTeklifler(rows);
    setLoading(false);
  };

  const toplamTeklif = teklifler.length;
  const kazananTeklif = teklifler.filter((t) => t.durum === "kabul_edildi").length;
  const kaybedenTeklif = teklifler.filter((t) => t.durum === "reddedildi").length;

  const filteredTeklifler = teklifler.filter((t) => {
    const matchSearch =
      t.ihale_baslik.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ihale_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTuru = filterIhaleTuru === "all" || t.ihale_turu === filterIhaleTuru;
    const matchUsul = filterTeklifUsulu === "all" || t.teklif_usulu === filterTeklifUsulu;
    return matchSearch && matchTuru && matchUsul;
  });

  return (
    <DashboardLayout title="Tekliflerim">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Tekliflerim</h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Layers className="w-4 h-4 text-primary" />
                Toplam Teklif
              </div>
              <p className="text-3xl font-bold text-foreground">{toplamTeklif}</p>
              <p className="text-xs text-muted-foreground mt-1">Teklif verdiğiniz tüm ihaleler</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Kazanan Teklifler
              </div>
              <p className="text-3xl font-bold text-foreground">{kazananTeklif}</p>
              <p className="text-xs text-muted-foreground mt-1">Kazandığınız tüm ihaleler</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <XCircle className="w-4 h-4 text-destructive" />
                Kaybeden Teklifler
              </div>
              <p className="text-3xl font-bold text-foreground">{kaybedenTeklif}</p>
              <p className="text-xs text-muted-foreground mt-1">Reddedilen tüm teklifleriniz</p>
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
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <Select value={filterIhaleTuru} onValueChange={setFilterIhaleTuru}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="İhale Türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">İhale Türü</SelectItem>
                <SelectItem value="urun_alis">Ürün Alış</SelectItem>
                <SelectItem value="urun_satis">Ürün Satış</SelectItem>
                <SelectItem value="hizmet_alim">Hizmet Alım</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTeklifUsulu} onValueChange={setFilterTeklifUsulu}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Teklif Usulü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Teklif Usulü</SelectItem>
                <SelectItem value="kapali_teklif">Kapalı Teklif</SelectItem>
                <SelectItem value="acik_indirme">Açık İndirme</SelectItem>
                <SelectItem value="acik_arttirma">Açık Arttırma</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Yükleniyor...</div>
          ) : filteredTeklifler.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Henüz teklif bulunmamaktadır.</div>
          ) : (
            filteredTeklifler.map((teklif) => (
              <Card key={teklif.id} className="cursor-pointer" onClick={() => navigate(`/ihaleler/${teklif.ihale_slug || teklif.ihale_id}`)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {teklif.ihale_foto_url ? <img src={teklif.ihale_foto_url} alt="" className="w-full h-full object-cover" /> : <img src={ihaleDefaultCover} alt="" className="w-full h-full object-contain p-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{teklif.ihale_baslik}</p>
                      <p className="text-xs text-muted-foreground">#{teklif.ihale_no}</p>
                    </div>
                    <Badge variant="secondary" className={durumColors[teklif.durum] || ""}>
                      {durumLabels[teklif.durum] || teklif.durum}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Teklifiniz</p>
                      <p className="text-sm font-semibold text-foreground">₺{teklif.tutar.toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Sıranız</p>
                      <p className="text-sm font-semibold text-foreground">{teklif.teklif_sirasi !== null ? teklif.teklif_sirasi : "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px]">{ihaleTuruLabels[teklif.ihale_turu] || teklif.ihale_turu}</Badge>
                      <Badge variant="outline" className="text-[10px]">{teklifUsuluLabels[teklif.teklif_usulu] || teklif.teklif_usulu}</Badge>
                    </div>
                    <div>
                      {teklif.bitis_tarihi && <span className="text-destructive">{format(new Date(teklif.bitis_tarihi), "dd/MM/yy", { locale: tr })}</span>}
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
                  <TableHead>İhale Bilgileri</TableHead>
                  <TableHead>Kategori & Tür</TableHead>
                  <TableHead className="text-center">Teklifiniz</TableHead>
                  <TableHead className="text-center">Teklif Sıranız</TableHead>
                  <TableHead>Süreç</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-center sticky-action-col">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Yükleniyor...</TableCell>
                  </TableRow>
                ) : filteredTeklifler.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Henüz teklif bulunmamaktadır.</TableCell>
                  </TableRow>
                ) : (
                  filteredTeklifler.map((teklif) => (
                    <TableRow key={teklif.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {teklif.ihale_foto_url ? <img src={teklif.ihale_foto_url} alt="" className="w-full h-full object-cover" /> : <img src={ihaleDefaultCover} alt="" className="w-full h-full object-contain p-1" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{teklif.ihale_baslik}</p>
                            <p className="text-xs text-muted-foreground">#{teklif.ihale_no}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit text-xs">{ihaleTuruLabels[teklif.ihale_turu] || teklif.ihale_turu}</Badge>
                          <Badge variant="outline" className="w-fit text-xs">{teklifUsuluLabels[teklif.teklif_usulu] || teklif.teklif_usulu}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium">₺{teklif.tutar.toLocaleString("tr-TR")}</TableCell>
                      <TableCell className="text-center text-sm font-medium">{teklif.teklif_sirasi !== null ? teklif.teklif_sirasi : "-"}</TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {teklif.baslangic_tarihi && <p>{format(new Date(teklif.baslangic_tarihi), "dd/MM/yyyy", { locale: tr })}</p>}
                          {teklif.bitis_tarihi && <p className="text-destructive">{format(new Date(teklif.bitis_tarihi), "dd/MM/yyyy", { locale: tr })}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={durumColors[teklif.durum] || ""}>{durumLabels[teklif.durum] || teklif.durum}</Badge>
                      </TableCell>
                      <TableCell className="text-center sticky-action-col">
                        <Button size="sm" onClick={() => navigate(`/ihaleler/${teklif.ihale_slug || teklif.ihale_id}`)} className="gap-1">
                          <Plus className="w-3 h-3" />Yeni Teklif
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
