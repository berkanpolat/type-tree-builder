import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Headphones,
  CheckCircle2,
  Clock,
  Search as SearchIcon,
  Plus,
  Upload,
  X,
  MessageSquare,
  Eye,
} from "lucide-react";

interface DeskTalep {
  id: string;
  talep_no: string;
  departman: string;
  konu: string;
  aciklama: string;
  durum: string;
  created_at: string;
  updated_at: string;
  ek_dosya_url: string | null;
  ek_dosya_adi: string | null;
}

const departmanlar = [
  "Satış",
  "Muhasebe",
  "Teknik",
  "Abonelik",
  "Müşteri İlişkileri",
];

const durumLabels: Record<string, string> = {
  inceleniyor: "İnceleniyor",
  cevap_bekliyor: "Cevap Bekleniyor",
  cevaplandi: "Cevaplandı",
  cozuldu: "Çözüldü",
};

const durumColors: Record<string, string> = {
  inceleniyor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cevap_bekliyor: "bg-blue-100 text-blue-800 border-blue-200",
  cevaplandi: "bg-green-100 text-green-800 border-green-200",
  cozuldu: "bg-muted text-muted-foreground border-border",
};

const DashboardDestek = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [talepler, setTalepler] = useState<DeskTalep[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [departman, setDepartman] = useState("");
  const [konu, setKonu] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [ekDosya, setEkDosya] = useState<File | null>(null);

  const fetchTalepler = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/giris-kayit"); return; }

    const { data } = await supabase
      .from("destek_talepleri" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setTalepler((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTalepler(); }, []);

  const toplam = talepler.length;
  const cozulen = talepler.filter(t => t.durum === "cozuldu").length;
  const cevapBekleyen = talepler.filter(t => t.durum === "cevap_bekliyor").length;
  const incelenen = talepler.filter(t => t.durum === "inceleniyor").length;

  const statsCards = [
    { title: "Toplam Talepler", value: toplam, icon: Headphones, color: "text-primary", bgColor: "bg-primary/10" },
    { title: "Çözülen", value: cozulen, icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-50" },
    { title: "Cevap Bekleniyor", value: cevapBekleyen, icon: Clock, color: "text-blue-500", bgColor: "bg-blue-50" },
    { title: "İnceleniyor", value: incelenen, icon: SearchIcon, color: "text-yellow-500", bgColor: "bg-yellow-50" },
  ];

  const handleSubmit = async () => {
    if (!departman) { toast({ title: "Departman seçiniz", variant: "destructive" }); return; }
    if (!konu.trim()) { toast({ title: "Konu yazınız", variant: "destructive" }); return; }
    if (aciklama.trim().length < 10) { toast({ title: "Açıklama en az 10 karakter olmalıdır", variant: "destructive" }); return; }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let ekDosyaUrl: string | null = null;
    let ekDosyaAdi: string | null = null;

    if (ekDosya) {
      const filePath = `destek/${user.id}/${Date.now()}_${ekDosya.name}`;
      const { error: uploadErr } = await supabase.storage.from("sikayet-files").upload(filePath, ekDosya);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("sikayet-files").getPublicUrl(filePath);
        ekDosyaUrl = urlData.publicUrl;
        ekDosyaAdi = ekDosya.name;
      }
    }

    const { error } = await supabase.from("destek_talepleri" as any).insert({
      user_id: user.id,
      departman,
      konu: konu.trim(),
      aciklama: aciklama.trim(),
      ek_dosya_url: ekDosyaUrl,
      ek_dosya_adi: ekDosyaAdi,
    } as any);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Destek talebi oluşturuldu" });
      setDialogOpen(false);
      setDepartman("");
      setKonu("");
      setAciklama("");
      setEkDosya(null);
      fetchTalepler();
    }
    setSubmitting(false);
  };

  return (
    <DashboardLayout title="Destek">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Özet Kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Aksiyon */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Destek Talepleriniz</h2>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Yeni Destek Talebi Oluştur
          </Button>
        </div>

        {/* Talepler Listesi */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        ) : talepler.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Headphones className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Henüz destek talebiniz bulunmamaktadır.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {talepler.map((talep) => (
              <Card
                key={talep.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/destek/${talep.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{talep.talep_no}</span>
                      <Badge variant="outline" className="text-[10px]">{talep.departman}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${durumColors[talep.durum] || ""}`}>
                        {durumLabels[talep.durum] || talep.durum}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{talep.konu}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(talep.created_at).toLocaleDateString("tr-TR", {
                        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <Eye className="w-5 h-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Yeni Talep Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} modal={true}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Destek Talebi Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Departman *</Label>
              <Select value={departman} onValueChange={setDepartman}>
                <SelectTrigger>
                  <SelectValue placeholder="Departman seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {departmanlar.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Konu *</Label>
              <Input
                placeholder="Destek talebinizin konusu"
                value={konu}
                onChange={e => setKonu(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama * <span className="text-xs text-muted-foreground">(min. 10 karakter)</span></Label>
              <Textarea
                placeholder="Sorununuzu detaylı şekilde açıklayınız..."
                value={aciklama}
                onChange={e => setAciklama(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">{aciklama.length} karakter</p>
            </div>
            <div className="space-y-2">
              <Label>Ek Dosya</Label>
              {ekDosya ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                  <span className="text-sm truncate flex-1">{ekDosya.name}</span>
                  <button onClick={() => setEkDosya(null)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 border border-dashed rounded-md cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Dosya yükle</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={e => setEkDosya(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardDestek;
