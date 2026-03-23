import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Gavel,
  FileText,
  ShoppingBag,
  MessageSquare,
  Clock,
  CreditCard,
  CheckCheck,
  Bell,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const typeIconMap: Record<string, any> = {
  ihale_onay_bekliyor: Gavel,
  ihale_yayinlandi: Gavel,
  ihale_reddedildi: Gavel,
  ihale_yeni_teklif: Gavel,
  ihale_sure_uyari: Clock,
  ihale_iptal: Gavel,
  teklif_iletildi: FileText,
  teklif_reddedildi: FileText,
  teklif_kabul_edildi: FileText,
  teklif_ihale_durum_degisti: FileText,
  urun_onay_bekliyor: ShoppingBag,
  urun_yayinlandi: ShoppingBag,
  urun_durum_degisti: ShoppingBag,
  odeme_basarili: CreditCard,
  odeme_basarisiz: CreditCard,
  yeni_mesaj: MessageSquare,
};

const typeColorMap: Record<string, string> = {
  ihale_yayinlandi: "text-green-500 bg-green-50",
  teklif_kabul_edildi: "text-green-500 bg-green-50",
  urun_yayinlandi: "text-green-500 bg-green-50",
  odeme_basarili: "text-green-500 bg-green-50",
  ihale_reddedildi: "text-destructive bg-destructive/10",
  teklif_reddedildi: "text-destructive bg-destructive/10",
  ihale_iptal: "text-destructive bg-destructive/10",
  odeme_basarisiz: "text-destructive bg-destructive/10",
  ihale_sure_uyari: "text-orange-500 bg-orange-50",
  ihale_yeni_teklif: "text-blue-500 bg-blue-50",
  yeni_mesaj: "text-blue-500 bg-blue-50",
};

const Bildirimler = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/giris-kayit"); return; }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    setNotifications((data as Notification[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("bildirimler-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) await markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DashboardLayout title="Bildirimler">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : "Tüm bildirimler okundu"}
          </p>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5">
              <CheckCheck className="w-4 h-4" />
              Tümünü Okundu İşaretle
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Henüz bildiriminiz yok.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = typeIconMap[n.type] || Bell;
              const colorClass = typeColorMap[n.type] || "text-muted-foreground bg-muted";

              return (
                <Card
                  key={n.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${!n.is_read ? "border-primary/30 bg-primary/[0.02]" : ""}`}
                  onClick={() => handleClick(n)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-full shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${!n.is_read ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: tr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Bildirimler;
