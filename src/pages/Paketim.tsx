import { useState } from "react";
import { usePackageQuota } from "@/hooks/use-package-quota";
import { STRIPE_CONFIG, PAKET_OZELLIKLERI } from "@/lib/package-config";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  Check,
  Eye,
  Gavel,
  FileText,
  ShoppingBag,
  MessageSquare,
  Loader2,
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
  const [portalLoading, setPortalLoading] = useState(false);

  const handleUpgrade = async (periyot: "aylik" | "yillik") => {
    setUpgradeLoading(periyot);
    try {
      const priceId = STRIPE_CONFIG.pro[periyot].priceId;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
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

  return (
    <DashboardLayout title="Paketim">
      <div className="max-w-5xl mx-auto space-y-6">
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
              </div>
              {isPro && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                    {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Aboneliği Yönet
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                    {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Paketi İptal Et
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isPro && (
              <div className="space-y-1 mb-4">
                <p className="text-lg font-semibold text-foreground">
                  ${pkg.periyot === "yillik" ? STRIPE_CONFIG.pro.yillik.fiyat : STRIPE_CONFIG.pro.aylik.fiyat}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {pkg.periyot === "yillik" ? "yıl" : "ay"}
                  </span>
                </p>
                {pkg.donemBitis && (
                  <p className="text-sm text-muted-foreground">
                    Sonraki yenileme:{" "}
                    {new Date(pkg.donemBitis).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded-md p-2">
                  İptal etmeniz durumunda dönem bitiş tarihine kadar PRO özelliklerini kullanmaya devam edersiniz. Süre dolduğunda hesabınız otomatik olarak Ücretsiz pakete geçirilir.
                </p>
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
                {!isPro && (
                  <Badge variant="outline" className="text-xs">Mevcut Paketiniz</Badge>
                )}
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">
                Ücretsiz
              </p>
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
                {isPro && (
                  <Badge className="text-xs">Mevcut Paketiniz</Badge>
                )}
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-3xl font-bold text-foreground">
                  ${STRIPE_CONFIG.pro.aylik.fiyat}
                  <span className="text-base font-normal text-muted-foreground">/ay</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  veya ${STRIPE_CONFIG.pro.yillik.fiyat}/yıl
                </p>
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
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade("aylik")}
                    disabled={!!upgradeLoading}
                  >
                    {upgradeLoading === "aylik" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Aylık PRO'ya Geç (${STRIPE_CONFIG.pro.aylik.fiyat}/ay)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUpgrade("yillik")}
                    disabled={!!upgradeLoading}
                  >
                    {upgradeLoading === "yillik" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Yıllık PRO'ya Geç (${STRIPE_CONFIG.pro.yillik.fiyat}/yıl)
                  </Button>
                </div>
              )}

              {isPro && pkg.periyot === "aylik" && (
                <div className="pt-2 border-t border-border space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Yıllık plana geçerek tasarruf edin. Mevcut dönem bitiş tarihinizden itibaren 1 yıl geçerli olur.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUpgrade("yillik")}
                    disabled={!!upgradeLoading}
                  >
                    {upgradeLoading === "yillik" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Yıllık Plana Geç (${STRIPE_CONFIG.pro.yillik.fiyat}/yıl)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Paketim;
