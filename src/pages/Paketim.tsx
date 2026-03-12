import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { usePackageQuota } from "@/hooks/use-package-quota";
import { PRO_FIYATLAR, PAKET_OZELLIKLERI } from "@/lib/package-config";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  Check,
  Eye,
  Gavel,
  FileText,
  ShoppingBag,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Clock,
} from "lucide-react";

const FEATURES = [
  { key: "profil_goruntuleme", label: "Firma Profili Görüntüleme", icon: Eye },
  { key: "ihale_acma", label: "İhale Açma", icon: Gavel },
  { key: "teklif_verme", label: "Teklif Verme", icon: FileText },
  { key: "aktif_urun", label: "Aktif Ürün", icon: ShoppingBag },
  { key: "mesaj", label: "Mesaj Gönderme", icon: MessageSquare },
] as const;

const Paketim = () => {
  const pkg = usePackageQuota();
  const isPro = pkg.paketSlug === "pro";
  const [upgradeLoading, setUpgradeLoading] = useState<"aylik" | "yillik" | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Sync subscription on page load
  useEffect(() => {
    const syncSubscription = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        if (error) console.error("Subscription sync error:", error);
        if (searchParams.get("checkout") === "success") {
          setSuccessDialogOpen(true);
        }
      } catch (e) {
        console.error("Subscription sync failed:", e);
      }
    };
    syncSubscription();
  }, []);

  const handleUpgrade = async (periyot: "aylik" | "yillik") => {
    setUpgradeLoading(periyot);
    try {
      const { data, error } = await supabase.functions.invoke("create-paytr-token", {
        body: { periyot },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("PayTR error:", err);
      toast({ title: "Hata", description: "Ödeme sayfası oluşturulamadı. Lütfen tekrar deneyin.", variant: "destructive" });
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success) {
        const cancelDate = data.cancel_at
          ? new Date(data.cancel_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
          : "";
        toast({
          title: "Abonelik iptal edildi",
          description: `PRO paketiniz ${cancelDate} tarihine kadar aktif kalacaktır.`,
        });
        setCancelDialogOpen(false);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      console.error("Cancel error:", err);
      toast({ title: "Hata", description: err?.message || "Abonelik iptal edilemedi.", variant: "destructive" });
    } finally {
      setCancelLoading(false);
    }
  };

  if (pkg.loading) {
    return (
      <DashboardLayout title="Paketim">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const usageMap: Record<string, { used: number; limit: number | null }> = {
    profil_goruntuleme: { used: pkg.usage.profil_goruntuleme, limit: pkg.limits.profil_goruntuleme_limiti },
    teklif_verme: { used: pkg.usage.teklif_verme, limit: pkg.limits.teklif_verme_limiti },
    aktif_urun: { used: pkg.usage.aktif_urun, limit: pkg.limits.aktif_urun_limiti },
    mesaj: { used: pkg.usage.mesaj, limit: pkg.limits.mesaj_limiti },
  };

  const cancelDateFormatted = pkg.donemBitis
    ? new Date(pkg.donemBitis).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <DashboardLayout title="Paketim">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* İptal Bekliyor Bilgi Bannerı */}
        {isPro && pkg.cancelAtPeriodEnd && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Aboneliğiniz iptal edilmiştir</p>
                  <p className="text-sm text-muted-foreground">
                    PRO paketiniz <strong className="text-foreground">{cancelDateFormatted}</strong> tarihine kadar aktif kalacaktır. 
                    Bu tarihten sonra hesabınız otomatik olarak <strong className="text-foreground">Ücretsiz pakete</strong> geçirilecek.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aktif Paket */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Badge variant={isPro ? "default" : "secondary"} className="text-sm px-3 py-1">
                  {isPro && <Crown className="w-3.5 h-3.5 mr-1.5" />}
                  {pkg.paketAd}
                </Badge>
                <CardTitle className="text-xl">Aktif Paketiniz</CardTitle>
                {isPro && pkg.cancelAtPeriodEnd && (
                  <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                    İptal Edildi
                  </Badge>
                )}
              </div>
              {isPro && !pkg.cancelAtPeriodEnd && (
                <Button variant="destructive" size="sm" onClick={() => setCancelDialogOpen(true)}>
                  Paketi İptal Et
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isPro && (
              <div className="space-y-1 mb-4">
                <p className="text-lg font-semibold text-foreground">
                  {pkg.periyot === "yillik" ? PRO_FIYATLAR.yillik.fiyat : PRO_FIYATLAR.aylik.fiyat}₺
                  <span className="text-sm font-normal text-muted-foreground">
                    / {pkg.periyot === "yillik" ? "yıl" : "ay"}
                  </span>
                </p>
                {pkg.donemBitis && !pkg.cancelAtPeriodEnd && (
                  <p className="text-sm text-muted-foreground">
                    Dönem bitiş: {cancelDateFormatted}
                  </p>
                )}
              </div>
            )}

            {/* Kullanım */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.filter((f) => f.key !== "ihale_acma").map((f) => {
                const u = usageMap[f.key];
                if (!u) return null;
                const pct = u.limit === null ? 5 : u.limit === 0 ? 0 : Math.min((u.used / u.limit) * 100, 100);
                return (
                  <div key={f.key} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <f.icon className="w-4 h-4 text-muted-foreground" />
                      {f.label}
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-foreground">{u.used}</span>
                      <span className="text-sm text-muted-foreground">
                        / {u.limit === null ? "∞" : u.limit === 0 ? "—" : u.limit}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Paket Karşılaştırma */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ücretsiz */}
          <Card className={!isPro ? "ring-2 ring-primary" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{PAKET_OZELLIKLERI.ucretsiz.ad}</CardTitle>
                {!isPro && <Badge variant="outline" className="text-xs">Mevcut Paketiniz</Badge>}
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">Ücretsiz</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {FEATURES.map((f) => {
                  const val = PAKET_OZELLIKLERI.ucretsiz[f.key as keyof typeof PAKET_OZELLIKLERI.ucretsiz];
                  return (
                    <li key={f.key} className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{f.label}:</span>
                      <span className="font-medium text-foreground ml-auto">{val}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* PRO */}
          <Card className={isPro ? "ring-2 ring-primary" : "border-primary/30"}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{PAKET_OZELLIKLERI.pro.ad}</CardTitle>
                </div>
                {isPro && <Badge className="text-xs">Mevcut Paketiniz</Badge>}
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-3xl font-bold text-foreground">
                  {PRO_FIYATLAR.aylik.kdvli}₺
                  <span className="text-base font-normal text-muted-foreground">/ay</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  veya {PRO_FIYATLAR.yillik.kdvli}₺/yıl
                </p>
                <p className="text-xs text-muted-foreground">Fiyatlara %{PRO_FIYATLAR.kdvOrani} KDV dahildir.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-3">
                {FEATURES.map((f) => {
                  const val = PAKET_OZELLIKLERI.pro[f.key as keyof typeof PAKET_OZELLIKLERI.pro];
                  return (
                    <li key={f.key} className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{f.label}:</span>
                      <span className="font-medium text-foreground ml-auto">{val}</span>
                    </li>
                  );
                })}
              </ul>

              {!isPro && (
                <div className="space-y-2 pt-2">
                  <Button className="w-full" onClick={() => handleUpgrade("aylik")} disabled={!!upgradeLoading}>
                    {upgradeLoading === "aylik" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Aylık PRO'ya Geç ({PRO_FIYATLAR.aylik.fiyat}₺/ay)
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => handleUpgrade("yillik")} disabled={!!upgradeLoading}>
                    {upgradeLoading === "yillik" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Yıllık PRO'ya Geç ({PRO_FIYATLAR.yillik.fiyat}₺/yıl)
                  </Button>
                </div>
              )}

              {isPro && pkg.periyot === "aylik" && !pkg.cancelAtPeriodEnd && (
                <div className="pt-2 border-t border-border space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Yıllık plana geçerek tasarruf edin.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => handleUpgrade("yillik")} disabled={!!upgradeLoading}>
                    {upgradeLoading === "yillik" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Yıllık Plana Geç ({PRO_FIYATLAR.yillik.fiyat}₺/yıl)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ödeme Başarılı Dialogu */}
      <AlertDialog open={successDialogOpen} onOpenChange={(open) => {
        setSuccessDialogOpen(open);
        if (!open) window.location.replace("/paketim");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <AlertDialogTitle className="text-xl">Ödeme Başarılı!</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center text-sm">
              PRO paketiniz başarıyla aktif edildi. Tüm PRO özelliklerini hemen kullanmaya başlayabilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center sm:justify-center">
            <AlertDialogAction onClick={() => {
              setSuccessDialogOpen(false);
              window.location.replace("/paketim");
            }}>
              Tamam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* İptal Onay Dialogu */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <AlertDialogTitle>Aboneliği İptal Et</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 text-sm">
              <p>PRO paketinizi iptal etmek istediğinize emin misiniz?</p>
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <p className="font-medium text-foreground">İptal sonrası neler olacak:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Mevcut dönem bitiş tarihinize ({cancelDateFormatted || "—"}) kadar PRO özelliklerini kullanmaya devam edeceksiniz.</li>
                  <li>Dönem sona erdikten sonra hesabınız otomatik olarak <strong>Ücretsiz pakete</strong> geçirilecektir.</li>
                  <li>Ücretsiz pakette profil görüntüleme, teklif verme ve mesaj hakları sınırlıdır.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Evet, İptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Paketim;
