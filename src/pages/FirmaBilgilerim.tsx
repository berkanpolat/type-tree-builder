import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import FirmaTabMenu from "@/components/firma-bilgileri/FirmaTabMenu";
import GenelFirmaBilgileri from "@/components/firma-bilgileri/GenelFirmaBilgileri";
import PlaceholderTab from "@/components/firma-bilgileri/PlaceholderTab";
import {
  ClipboardList,
  Package,
  Factory,
  Building2,
  Cog,
  Users,
  Award,
  Image,
  ShoppingCart,
  Truck,
  BarChart3,
} from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const tabsByFirmaTuru: Record<string, TabItem[]> = {
  "Hazır Giyim Üreticisi": [
    { id: "genel", label: "Genel Firma\nBilgileri", icon: ClipboardList },
    { id: "urun-hizmet", label: "Ürün / Hizmet", icon: Package },
    { id: "uretim-satis", label: "Üretim/Satış", icon: Factory },
    { id: "tesis", label: "Tesis Bilgileri", icon: Building2 },
    { id: "makine", label: "Makine Parkuru\nve Teknik Altyapı", icon: Cog },
    { id: "referanslar", label: "Referanslar", icon: Users },
    { id: "sertifikalar", label: "Sertifikalar", icon: Award },
    { id: "galeri", label: "Galeri", icon: Image },
  ],
  "Marka": [
    { id: "genel", label: "Genel Firma\nBilgileri", icon: ClipboardList },
    { id: "urun-hizmet", label: "Ürün / Hizmet", icon: Package },
    { id: "uretim-satis", label: "Üretim/Satış", icon: Factory },
    { id: "pazar", label: "Pazar ve Satış\nKanalları", icon: ShoppingCart },
    { id: "tedarik", label: "Üretim ve Tedarik\nYaklaşımı", icon: Truck },
    { id: "tesis", label: "Tesis Bilgileri", icon: Building2 },
    { id: "referanslar", label: "Referanslar", icon: Users },
    { id: "sertifikalar", label: "Sertifikalar", icon: Award },
    { id: "galeri", label: "Galeri", icon: Image },
  ],
  "Fason Atölye": [
    { id: "genel", label: "Genel Firma\nBilgileri", icon: ClipboardList },
    { id: "urun-hizmet", label: "Ürün / Hizmet", icon: Package },
    { id: "uretim-satis", label: "Üretim/Satış", icon: Factory },
    { id: "tesis", label: "Tesis Bilgileri", icon: Building2 },
    { id: "makine", label: "Makine Parkuru\nve Teknik Altyapı", icon: Cog },
    { id: "referanslar", label: "Referanslar", icon: Users },
    { id: "sertifikalar", label: "Sertifikalar", icon: Award },
    { id: "galeri", label: "Galeri", icon: Image },
  ],
  "Tedarikçi": [
    { id: "genel", label: "Genel Firma\nBilgileri", icon: ClipboardList },
    { id: "urun-hizmet", label: "Ürün / Hizmet", icon: Package },
    { id: "uretim-satis", label: "Üretim/Satış", icon: Factory },
    { id: "kapasite", label: "Kapasite ve Tedarik\nYetkinliği", icon: BarChart3 },
    { id: "tesis", label: "Tesis Bilgileri", icon: Building2 },
    { id: "referanslar", label: "Referanslar", icon: Users },
    { id: "sertifikalar", label: "Sertifikalar", icon: Award },
    { id: "galeri", label: "Galeri", icon: Image },
  ],
  "Mümessil Ofis": [
    { id: "genel", label: "Genel Firma\nBilgileri", icon: ClipboardList },
    { id: "urun-hizmet", label: "Ürün / Hizmet", icon: Package },
    { id: "uretim-satis", label: "Üretim/Satış", icon: Factory },
    { id: "tesis", label: "Tesis Bilgileri", icon: Building2 },
    { id: "referanslar", label: "Referanslar", icon: Users },
    { id: "sertifikalar", label: "Sertifikalar", icon: Award },
    { id: "galeri", label: "Galeri", icon: Image },
  ],
};

const FirmaBilgilerim = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("genel");
  const [firmaTuruName, setFirmaTuruName] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const fetchFirmaTuru = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/giris-kayit"); return; }
      setUserId(user.id);

      const { data: firma } = await supabase
        .from("firmalar")
        .select("firma_turu_id")
        .eq("user_id", user.id)
        .single();

      if (firma) {
        const { data: tur } = await supabase
          .from("firma_turleri")
          .select("name")
          .eq("id", firma.firma_turu_id)
          .single();
        if (tur) setFirmaTuruName(tur.name);
      }
      setLoading(false);
    };
    fetchFirmaTuru();
  }, [navigate]);

  const tabs = tabsByFirmaTuru[firmaTuruName] || tabsByFirmaTuru["Hazır Giyim Üreticisi"] || [];

  const renderTabContent = () => {
    switch (activeTab) {
      case "genel":
        return <GenelFirmaBilgileri userId={userId} />;
      default:
        return <PlaceholderTab label={tabs.find(t => t.id === activeTab)?.label || activeTab} />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Firma Profil Bilgilerim">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Firma Profil Bilgilerim">
      <div className="max-w-7xl mx-auto space-y-6">
        <FirmaTabMenu tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        {renderTabContent()}
      </div>
    </DashboardLayout>
  );
};

export default FirmaBilgilerim;
