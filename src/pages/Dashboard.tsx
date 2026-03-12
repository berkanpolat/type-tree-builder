import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationCount } from "@/hooks/use-notifications";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useProfileCompletion } from "@/hooks/use-profile-completion";
import { usePackageQuota } from "@/hooks/use-package-quota";
import { PRO_FIYATLAR, PAKET_OZELLIKLERI } from "@/lib/package-config";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gavel,
  ShoppingBag,
  MessageSquare,
  Bell,
  UserCheck,
  Pencil,
  Building2,
  MapPin,
  Factory,
  Layers,
  Mail,
  Phone,
  Crown,
  Infinity,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useBanner } from "@/hooks/use-banner";

interface ProfileData {
  ad: string;
  soyad: string;
  iletisim_email: string;
  iletisim_numarasi: string | null;
}

interface FirmaData {
  firma_unvani: string;
  firma_turu_id: string;
  firma_tipi_id: string;
}

const Dashboard = () => {
  const dashboardBanner = useBanner("dashboard-pro-banner");
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [firma, setFirma] = useState<FirmaData | null>(null);
  const [firmaTuruName, setFirmaTuruName] = useState("");
  const [firmaTipiName, setFirmaTipiName] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeIhaleCount, setActiveIhaleCount] = useState(0);
  const [activeUrunCount, setActiveUrunCount] = useState(0);
  const unreadNotifications = useNotificationCount();
  const unreadMessages = useUnreadMessages();
  const { percentage: profileCompletion } = useProfileCompletion();
  const packageInfo = usePackageQuota();

  // Check subscription on page load
  useEffect(() => {
    const checkSub = async () => {
      try {
        await supabase.functions.invoke("check-subscription");
      } catch (e) {
        console.error("Subscription check failed:", e);
      }
    };
    checkSub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/giris-kayit"); return; }

      const [profileRes, firmaRes, ihaleCountRes, urunCountRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("firmalar").select("*").eq("user_id", user.id).single(),
        supabase.from("ihaleler").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("durum", "devam_ediyor"),
        supabase.from("urunler").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("durum", "aktif"),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      setActiveIhaleCount(ihaleCountRes.count || 0);
      setActiveUrunCount(urunCountRes.count || 0);

      if (firmaRes.data) {
        setFirma(firmaRes.data);
        const [turRes, tipRes] = await Promise.all([
          supabase.from("firma_turleri").select("name").eq("id", firmaRes.data.firma_turu_id).single(),
          supabase.from("firma_tipleri").select("name").eq("id", firmaRes.data.firma_tipi_id).single(),
        ]);
        if (turRes.data) setFirmaTuruName(turRes.data.name);
        if (tipRes.data) setFirmaTipiName(tipRes.data.name);
      }

      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const handleUpgrade = async (periyot: "aylik" | "yillik") => {
    try {
      const priceId = STRIPE_CONFIG.pro[periyot].priceId;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      console.error("Checkout error:", err);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      console.error("Portal error:", err);
    }
  };

  const statsCards = [
    { title: "Profil Tamamlama", value: profileCompletion, icon: UserCheck, color: "text-primary", bgColor: "bg-primary/10", isProgress: true, href: "/firma-bilgilerim" },
    { title: "Aktif Ürünler", value: activeUrunCount, subtitle: "Pazar yerinde yayında", icon: ShoppingBag, color: "text-green-500", bgColor: "bg-green-50", href: "/urunlerim" },
    { title: "Aktif İhaleler", value: activeIhaleCount, subtitle: "Teklif bekleyen", icon: Gavel, color: "text-blue-500", bgColor: "bg-blue-50", href: "/ihalelerim" },
    { title: "Mesajlar", value: unreadMessages, subtitle: "Okunmamış", icon: MessageSquare, color: "text-orange-500", bgColor: "bg-orange-50", href: "/mesajlar" },
    { title: "Bildirimler", value: unreadNotifications, subtitle: "İşlem bekleyen", icon: Bell, color: "text-red-500", bgColor: "bg-red-50", href: "/bildirimler" },
  ];

  const formatLimit = (limit: number | null) => {
    if (limit === null) return "∞";
    return limit.toLocaleString("tr-TR");
  };

  if (loading) {
    return (
      <DashboardLayout title="Ana Sayfa">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </DashboardLayout>
    );
  }

  const isPro = packageInfo.paketSlug === "pro";

  return (
    <DashboardLayout title="Ana Sayfa">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Cards: Firma + Kullanıcı */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Firma Kartı */}
          <Card>
           <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground">{firma?.firma_unvani || "Firma Bilgisi Yok"}</h2>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>İstanbul, Ataşehir</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => navigate("/firma-bilgilerim")} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Factory className="w-4 h-4" />
                  <span>{firmaTuruName || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Layers className="w-4 h-4" />
                  <span>{firmaTipiName || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kullanıcı Kartı */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{profile ? `${profile.ad} ${profile.soyad}` : "—"}</h2>
                  <p className="text-sm text-muted-foreground">Firma Yetkilisi</p>
                </div>
                <button onClick={() => navigate("/ayarlar")} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{profile?.iletisim_email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{profile?.iletisim_numarasi || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Özet İstatistik Kartları */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {statsCards.map((stat) => (
            <Card key={stat.title} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => stat.href && navigate(stat.href)}>
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.title}</span>
                  <div className={`p-1.5 sm:p-2 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${stat.color}`} />
                  </div>
                </div>
                {stat.isProgress ? (
                  <div>
                    <span className="text-xl sm:text-2xl font-bold text-foreground">%{stat.value}</span>
                    <Progress value={stat.value as number} className="mt-2 h-2" />
                  </div>
                ) : (
                  <div>
                    <span className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</span>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Paket Bilgisi */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Paket Adı */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={isPro ? "default" : "secondary"} className="text-xs">
                    {isPro ? <Crown className="w-3 h-3 mr-1" /> : null}
                    AKTİF PAKET
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-foreground">{packageInfo.paketAd}</h3>
                {isPro && (
                  <>
                    <p className="text-lg font-semibold text-foreground mt-1">
                      ${packageInfo.periyot === "yillik" ? STRIPE_CONFIG.pro.yillik.fiyat : STRIPE_CONFIG.pro.aylik.fiyat}
                      <span className="text-sm font-normal text-muted-foreground">/ {packageInfo.periyot === "yillik" ? "yıl" : "ay"}</span>
                    </p>
                    {packageInfo.donemBitis && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Bir sonraki yenileme: {new Date(packageInfo.donemBitis).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    )}
                    <Button variant="outline" size="sm" className="mt-3" onClick={handleManageSubscription}>
                      Aboneliği Yönet
                    </Button>
                  </>
                )}
                {!isPro && (
                  <div className="mt-3 space-y-2">
                    <Button size="sm" onClick={() => handleUpgrade("aylik")} className="w-full">
                      PRO'ya Yükselt (${STRIPE_CONFIG.pro.aylik.fiyat}/ay)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleUpgrade("yillik")} className="w-full">
                      Yıllık PRO (${STRIPE_CONFIG.pro.yillik.fiyat}/yıl)
                    </Button>
                  </div>
                )}
              </div>

              {/* Kalan Haklar */}
              <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  {
                    label: "Profil Görüntüleme",
                    used: packageInfo.usage.profil_goruntuleme,
                    total: packageInfo.limits.profil_goruntuleme_limiti,
                    color: "bg-primary",
                  },
                  {
                    label: "Teklif Verme",
                    used: packageInfo.usage.teklif_verme,
                    total: packageInfo.limits.teklif_verme_limiti,
                    color: "bg-blue-500",
                  },
                  {
                    label: "Aktif Ürün",
                    used: packageInfo.usage.aktif_urun,
                    total: packageInfo.limits.aktif_urun_limiti,
                    color: "bg-yellow-500",
                  },
                  {
                    label: "Mesaj Gönderme",
                    used: packageInfo.usage.mesaj,
                    total: packageInfo.limits.mesaj_limiti,
                    color: "bg-destructive",
                  },
                ].map((hak) => (
                  <div key={hak.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{hak.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {hak.used} / {hak.total === null ? "∞" : hak.total === 0 ? "—" : hak.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      {hak.total === null ? (
                        <div className={`h-full rounded-full ${hak.color} w-[5%]`} />
                      ) : hak.total === 0 ? (
                        <div className="h-full rounded-full bg-muted w-full" />
                      ) : (
                        <div
                          className={`h-full rounded-full ${hak.color}`}
                          style={{ width: `${Math.min((hak.used / hak.total) * 100, 100)}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banner alanı - admin panelinden görsel yüklenmişse göster */}
        {dashboardBanner.url && (
          <Card className="overflow-hidden hidden md:block">
            {dashboardBanner.linkUrl ? (
              <a href={dashboardBanner.linkUrl} target="_blank" rel="noopener noreferrer">
                  <img src={dashboardBanner.url} alt="Dashboard Banner" className="w-full h-40 object-cover" style={{ imageRendering: "auto" }} />
              </a>
            ) : (
              <img src={dashboardBanner.url} alt="Dashboard Banner" className="w-full h-40 object-cover" style={{ imageRendering: "auto" }} />
            )}
          </Card>
        )}

        {/* PRO Banner - sadece ücretsiz kullanıcılara göster, admin görseli yoksa */}
        {!isPro && !dashboardBanner.url && (
          <Card className="overflow-hidden hidden md:block">
            <div className="h-40 bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center relative">
              <div className="text-center text-primary-foreground">
                <p className="text-sm uppercase tracking-wider opacity-80">PRO Pakete Yükselt</p>
                <p className="text-3xl font-bold mt-1">Sınırsız Erişim</p>
                <p className="text-sm mt-2 opacity-80">Firma profili, ihale, teklif ve daha fazlası</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
