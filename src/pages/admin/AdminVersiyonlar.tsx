import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminApi } from "@/hooks/use-admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Rocket, RefreshCw, Plus, Clock, User, Tag, GitBranch, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Release {
  id: string;
  versiyon: string;
  baslik: string;
  aciklama: string;
  degisiklikler: any[];
  admin_id: string;
  admin_ad: string;
  ortam: string;
  created_at: string;
}

interface ChangeLog {
  action: string;
  admin_ad: string;
  admin_soyad: string;
  target_type: string;
  target_label: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  firma_onayla: "Firma onaylandı",
  firma_reddet: "Firma reddedildi",
  urun_onayla: "Ürün onaylandı",
  urun_reddet: "Ürün reddedildi",
  ihale_onayla: "İhale onaylandı",
  ihale_reddet: "İhale reddedildi",
  kullanici_olustur: "Kullanıcı oluşturuldu",
  kullanici_sil: "Kullanıcı silindi",
  release_olustur: "Release oluşturuldu",
  seo_kaydi_ekle: "SEO kaydı eklendi",
  seo_kaydi_guncelle: "SEO kaydı güncellendi",
  seo_kaydi_sil: "SEO kaydı silindi",
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, " ");
}

function generateAutoComment(logs: ChangeLog[]): string {
  if (!logs.length) return "Değişiklik bulunamadı.";

  const grouped: Record<string, number> = {};
  for (const log of logs) {
    const key = formatAction(log.action);
    grouped[key] = (grouped[key] || 0) + 1;
  }

  const lines = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([action, count]) => `• ${action}: ${count} adet`);

  return `Son değişiklikler:\n${lines.join("\n")}`;
}

export default function AdminVersiyonlar() {
  const { user } = useAdminAuth();
  const callApi = useAdminApi();
  const { toast } = useToast();

  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  const [versiyon, setVersiyon] = useState("");
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [ortam, setOrtam] = useState("production");
  const [recentLogs, setRecentLogs] = useState<ChangeLog[]>([]);

  const fetchReleases = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await callApi("list-releases", { token: user.token });
      setReleases(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, callApi, toast]);

  useEffect(() => { fetchReleases(); }, [fetchReleases]);

  const suggestVersion = useCallback(() => {
    if (releases.length === 0) return "1.0.0";
    const last = releases[0].versiyon;
    const parts = last.split(".").map(Number);
    if (parts.length === 3) {
      parts[2] += 1;
      return parts.join(".");
    }
    return last + ".1";
  }, [releases]);

  const openNewRelease = () => {
    setVersiyon(suggestVersion());
    setBaslik("");
    setAciklama("");
    setOrtam("production");
    setRecentLogs([]);
    setDialogOpen(true);
  };

  const fetchRecentChanges = async () => {
    if (!user) return;
    setAutoLoading(true);
    try {
      const data = await callApi("get-recent-changes", { token: user.token });
      const logs = data?.logs || [];
      setRecentLogs(logs);
      setAciklama(generateAutoComment(logs));
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setAutoLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !versiyon.trim()) return;
    setSaving(true);
    try {
      await callApi("create-release", {
        token: user.token,
        versiyon: versiyon.trim(),
        baslik: baslik.trim(),
        aciklama: aciklama.trim(),
        degisiklikler: recentLogs,
        ortam,
      });
      toast({ title: "Başarılı", description: `${versiyon} versiyonu oluşturuldu.` });
      setDialogOpen(false);
      fetchReleases();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Versiyonlar">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Versiyonlar</h1>
            <Badge variant="outline">{releases.length} kayıt</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchReleases} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Yenile
            </Button>
            <Button size="sm" onClick={openNewRelease}>
              <Plus className="w-4 h-4 mr-1" />
              Yeni Release
            </Button>
          </div>
        </div>

        {/* Release List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : releases.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Rocket className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>Henüz bir release kaydı yok.</p>
              <p className="text-sm mt-1">İlk versiyonunuzu oluşturmak için "Yeni Release" butonuna tıklayın.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {releases.map((r, i) => (
              <Card key={r.id} className={i === 0 ? "border-primary/40 shadow-md" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={i === 0 ? "default" : "secondary"} className="text-sm font-mono">
                        v{r.versiyon}
                      </Badge>
                      {r.baslik && <CardTitle className="text-base">{r.baslik}</CardTitle>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {r.admin_ad}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {r.ortam}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {r.aciklama && (
                  <CardContent className="pt-0">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                      {r.aciklama}
                    </pre>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Release Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Yeni Release Oluştur
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Versiyon *</label>
                <Input
                  placeholder="1.2.3"
                  value={versiyon}
                  onChange={(e) => setVersiyon(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ortam</label>
                <Select value={ortam} onValueChange={setOrtam}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Başlık</label>
              <Input
                placeholder="Örn: Yeni ürün filtreleme sistemi"
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Açıklama / Değişiklik Notları</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchRecentChanges}
                  disabled={autoLoading}
                  className="text-xs h-7"
                >
                  {autoLoading ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 mr-1" />
                  )}
                  Otomatik Doldur
                </Button>
              </div>
              <Textarea
                rows={8}
                placeholder="Bu versiyonda yapılan değişiklikleri yazın veya otomatik doldurun..."
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreate} disabled={saving || !versiyon.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Rocket className="w-4 h-4 mr-1" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
