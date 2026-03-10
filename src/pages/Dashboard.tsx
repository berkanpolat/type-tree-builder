import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationCount } from "@/hooks/use-notifications";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useProfileCompletion } from "@/hooks/use-profile-completion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

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

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/giris-kayit");
        return;
      }

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

  const statsCards = [
    {
      title: "Profil Tamamlama",
      value: profileCompletion,
      subtitle: "",
      icon: UserCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
      isProgress: true,
      href: "/firma-bilgilerim",
    },
    {
      title: "Aktif Ürünler",
      value: activeUrunCount,
      subtitle: "Pazar yerinde yayında",
      icon: ShoppingBag,
      color: "text-green-500",
      bgColor: "bg-green-50",
      href: "/manupazar",
    },
    {
      title: "Aktif İhaleler",
      value: activeIhaleCount,
      subtitle: "Teklif bekleyen",
      icon: Gavel,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      href: "/manuihale",
    },
    {
      title: "Mesajlar",
      value: unreadMessages,
      subtitle: "Okunmamış",
      icon: MessageSquare,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      href: "/mesajlar",
    },
    {
      title: "Bildirimler",
      value: unreadNotifications,
      subtitle: "İşlem bekleyen",
      icon: Bell,
      color: "text-red-500",
      bgColor: "bg-red-50",
      href: "/bildirimler",
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Ana Sayfa">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Ana Sayfa">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Cards: Firma + Kullanıcı */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Firma Kartı */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground">
                      {firma?.firma_unvani || "Firma Bilgisi Yok"}
                    </h2>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>İstanbul, Ataşehir</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/firma-bilgilerim")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
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
                  <h2 className="text-lg font-semibold text-foreground">
                    {profile ? `${profile.ad} ${profile.soyad}` : "—"}
                  </h2>
                  <p className="text-sm text-muted-foreground">Firma Yetkilisi</p>
                </div>
                <button
                  onClick={() => navigate("/profil-ayarlari")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statsCards.map((stat) => (
            <Card
              key={stat.title}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => stat.href && navigate(stat.href)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </span>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
                {stat.isProgress ? (
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      %{stat.value}
                    </span>
                    <Progress value={stat.value} className="mt-2 h-2" />
                  </div>
                ) : (
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.subtitle}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Banner */}
        <Card className="overflow-hidden">
          <div className="h-40 bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center relative">
            <div className="text-center text-primary-foreground">
              <p className="text-sm uppercase tracking-wider opacity-80">
                Tüm Kumaş Çeşitlerinde
              </p>
              <p className="text-4xl font-bold mt-1">%30 İndirim</p>
            </div>
          </div>
        </Card>

        {/* Paket Bilgisi */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Paket Adı */}
              <div>
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-destructive text-destructive-foreground mb-2">
                  AKTİF PAKET
                </span>
                <h3 className="text-2xl font-bold text-foreground">Elit</h3>
                <p className="text-lg font-semibold text-foreground mt-1">
                  ₺199.99<span className="text-sm font-normal text-muted-foreground">/ ay</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Bir sonraki ödemeniz: 15.04.2026
                </p>
              </div>

              {/* Kalan Haklar */}
              <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Mesaj Hakkı", used: 450, total: 1000, color: "bg-primary" },
                  { label: "İhale Oluşturma", used: 0, total: 9999999, color: "bg-primary" },
                  { label: "İhale Katılım", used: 1, total: 9999999, color: "bg-yellow-500" },
                  { label: "Ürün Sergileme", used: 88, total: 9999999, color: "bg-destructive" },
                ].map((hak) => (
                  <div key={hak.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{hak.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {hak.used} / {hak.total.toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${hak.color}`}
                        style={{
                          width: `${Math.min((hak.used / hak.total) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
