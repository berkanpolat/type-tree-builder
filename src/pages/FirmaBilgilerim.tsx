import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import FirmaTabMenu from "@/components/firma-bilgileri/FirmaTabMenu";
import GenelFirmaBilgileri from "@/components/firma-bilgileri/GenelFirmaBilgileri";
import UrunHizmetTab from "@/components/firma-bilgileri/UrunHizmetTab";
import UretimSatisTab from "@/components/firma-bilgileri/UretimSatisTab";
import TesisBilgileriTab from "@/components/firma-bilgileri/TesisBilgileriTab";
import MakineParkuruTab from "@/components/firma-bilgileri/MakineParkuruTab";
import SertifikalarTab from "@/components/firma-bilgileri/SertifikalarTab";
import ReferanslarTab from "@/components/firma-bilgileri/ReferanslarTab";
import GaleriTab from "@/components/firma-bilgileri/GaleriTab";
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
  FolderCheck,
} from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const belgelerimTab: TabItem = { id: "belgelerim", label: "Belgelerim", icon: FolderCheck };

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
    belgelerimTab,
  ],
  "Marka": [
    { id: "genel", label: "Genel Firma\nBilgileri", icon: ClipboardList },
    { id: "urun-hizmet", label: "Ürün / Hizmet", icon: Package },
    { id: "uretim-satis", label: "Üretim/Satış", icon: Factory },
    { id: "tesis", label: "Tesis Bilgileri", icon: Building2 },
    { id: "referanslar", label: "Referanslar", icon: Users },
    { id: "sertifikalar", label: "Sertifikalar", icon: Award },
    { id: "galeri", label: "Galeri", icon: Image },
    belgelerimTab,
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
    belgelerimTab,
  ],
  "Tedarikçi": [
    { id: "genel", label: "Genel Firma\nBilgileri", icon: ClipboardList },
    { id: "urun-hizmet", label: "Ürün / Hizmet", icon: Package },
    { id: "uretim-satis", label: "Üretim/Satış", icon: Factory },
    { id: "tesis", label: "Tesis Bilgileri", icon: Building2 },
    { id: "referanslar", label: "Referanslar", icon: Users },
    { id: "sertifikalar", label: "Sertifikalar", icon: Award },
    { id: "galeri", label: "Galeri", icon: Image },
    belgelerimTab,
  ],
  "Mümessil Ofis": [
    { id: "genel", label: "Genel Firma\nBilgileri", icon: ClipboardList },
    { id: "urun-hizmet", label: "Ürün / Hizmet", icon: Package },
    { id: "uretim-satis", label: "Üretim/Satış", icon: Factory },
    { id: "tesis", label: "Tesis Bilgileri", icon: Building2 },
    { id: "referanslar", label: "Referanslar", icon: Users },
    { id: "sertifikalar", label: "Sertifikalar", icon: Award },
    { id: "galeri", label: "Galeri", icon: Image },
    belgelerimTab,
  ],
};

const FirmaBilgilerim = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("genel");
  const [firmaTuruName, setFirmaTuruName] = useState("");
  const [firmaTurleriMap, setFirmaTurleriMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/giris-kayit"); return; }
      setUserId(user.id);

      const [firmaRes, turleriRes] = await Promise.all([
        supabase.from("firmalar").select("firma_turu_id").eq("user_id", user.id).single(),
        supabase.from("firma_turleri").select("id, name"),
      ]);

      // Build id->name map
      const map: Record<string, string> = {};
      turleriRes.data?.forEach(t => { map[t.id] = t.name; });
      setFirmaTurleriMap(map);

      if (firmaRes.data) {
        setFirmaTuruName(map[firmaRes.data.firma_turu_id] || "");
      }
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  // Called by GenelFirmaBilgileri when firma türü changes
  const handleFirmaTuruChange = (turuId: string) => {
    const name = firmaTurleriMap[turuId];
    if (name) {
      setFirmaTuruName(name);
      // Reset to genel tab if current tab doesn't exist in new menu
      const newTabs = tabsByFirmaTuru[name] || [];
      if (!newTabs.find(t => t.id === activeTab)) {
        setActiveTab("genel");
      }
    }
  };

  const tabs = tabsByFirmaTuru[firmaTuruName] || tabsByFirmaTuru["Hazır Giyim Üreticisi"] || [];

  const renderTabContent = () => {
    switch (activeTab) {
      case "genel":
        return <GenelFirmaBilgileri userId={userId} onFirmaTuruChange={handleFirmaTuruChange} />;
      case "urun-hizmet":
        return <UrunHizmetTab userId={userId} firmaTuruName={firmaTuruName} />;
      case "uretim-satis":
        return <UretimSatisTab userId={userId} />;
      case "tesis":
        return <TesisBilgileriTab userId={userId} />;
      case "makine":
        return <MakineParkuruTab userId={userId} />;
      case "sertifikalar":
        return <SertifikalarTab userId={userId} />;
      case "referanslar":
        return <ReferanslarTab userId={userId} />;
      case "galeri":
        return <GaleriTab userId={userId} />;
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
