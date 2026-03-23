import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAdminApi } from "@/hooks/use-admin-api";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users } from "lucide-react";
import AdminLogPanel from "@/components/admin/AdminLogPanel";
import UserActivityPanel from "@/components/admin/UserActivityPanel";

const s = {
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
};

export default function AdminIslemler() {
  const { token, user, hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"yonetim" | "kullanicilar">("yonetim");

  // Admin logs
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);

  // User activities
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);

  const callApi = useAdminApi();

  // Load admin logs on mount
  useEffect(() => {
    if (!token) return;
    setAdminLoading(true);
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc("admin_list_activity_log_v2");
        if (error) throw error;
        setAdminLogs((data as any) || []);
      } catch {
        toast({ title: "Hata", description: "İşlem geçmişi yüklenemedi", variant: "destructive" });
      } finally {
        setAdminLoading(false);
      }
    };
    load();
  }, [token, toast]);

  // Load user activities when tab switches (still uses edge function - complex query)
  useEffect(() => {
    if (activeTab !== "kullanicilar" || !token || userLoaded) return;
    setUserLoading(true);
    callApi("list-user-activity", { token })
      .then((data) => { setUserActivities(data.activities || []); setUserLoaded(true); })
      .catch(() => toast({ title: "Hata", description: "Kullanıcı aktiviteleri yüklenemedi", variant: "destructive" }))
      .finally(() => setUserLoading(false));
  }, [activeTab, token, userLoaded, callApi, toast]);

  if (!hasPermission("islem_goruntule")) {
    return (
      <AdminLayout title="İşlemler">
        <div className="flex items-center justify-center h-64" style={s.text}>
          <p>Bu sayfayı görüntülemek için yetkiniz bulunmamaktadır.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="İşlem Geçmişi">
      <div className="space-y-4">
        {/* Tab Switch */}
        <div className="flex items-center rounded-lg p-1 gap-1" style={{ background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))" }}>
          <button
            onClick={() => setActiveTab("yonetim")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: activeTab === "yonetim" ? "hsl(var(--admin-hover))" : "transparent",
              color: activeTab === "yonetim" ? "hsl(var(--admin-text))" : "hsl(var(--admin-muted))",
              border: activeTab === "yonetim" ? "1px solid hsl(var(--admin-border))" : "1px solid transparent",
            }}
          >
            <Shield className="w-4 h-4" />
            Yönetim
          </button>
          <button
            onClick={() => setActiveTab("kullanicilar")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: activeTab === "kullanicilar" ? "hsl(var(--admin-hover))" : "transparent",
              color: activeTab === "kullanicilar" ? "hsl(var(--admin-text))" : "hsl(var(--admin-muted))",
              border: activeTab === "kullanicilar" ? "1px solid hsl(var(--admin-border))" : "1px solid transparent",
            }}
          >
            <Users className="w-4 h-4" />
            Kullanıcılar
          </button>
        </div>

        {/* Panel Content */}
        {activeTab === "yonetim" ? (
          <AdminLogPanel logs={adminLogs} loading={adminLoading} />
        ) : (
          <UserActivityPanel activities={userActivities} loading={userLoading} />
        )}
      </div>
    </AdminLayout>
  );
}
