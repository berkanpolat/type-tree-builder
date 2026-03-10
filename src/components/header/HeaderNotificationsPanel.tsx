import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Gavel, FileText, ShoppingBag, MessageSquare, Clock, CreditCard, CheckCheck, Trash2 } from "lucide-react";
import { useNotificationCount } from "@/hooks/use-notifications";
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
  ihale_onay_bekliyor: Gavel, ihale_yayinlandi: Gavel, ihale_reddedildi: Gavel,
  ihale_yeni_teklif: Gavel, ihale_sure_uyari: Clock, ihale_iptal: Gavel,
  teklif_iletildi: FileText, teklif_reddedildi: FileText, teklif_kabul_edildi: FileText,
  teklif_ihale_durum_degisti: FileText, urun_onay_bekliyor: ShoppingBag,
  urun_yayinlandi: ShoppingBag, urun_durum_degisti: ShoppingBag,
  odeme_basarili: CreditCard, odeme_basarisiz: CreditCard, yeni_mesaj: MessageSquare,
};

const typeColorMap: Record<string, string> = {
  ihale_yayinlandi: "text-green-500 bg-green-50", teklif_kabul_edildi: "text-green-500 bg-green-50",
  urun_yayinlandi: "text-green-500 bg-green-50", odeme_basarili: "text-green-500 bg-green-50",
  ihale_reddedildi: "text-destructive bg-destructive/10", teklif_reddedildi: "text-destructive bg-destructive/10",
  ihale_iptal: "text-destructive bg-destructive/10", odeme_basarisiz: "text-destructive bg-destructive/10",
  ihale_sure_uyari: "text-orange-500 bg-orange-50", ihale_yeni_teklif: "text-blue-500 bg-blue-50",
  yeni_mesaj: "text-blue-500 bg-blue-50",
};

export default function HeaderNotificationsPanel() {
  const navigate = useNavigate();
  const unreadCount = useNotificationCount();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);

    setNotifications((data as Notification[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    fetchNotifications();
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="font-semibold text-sm">Bildirimler</h3>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> Okundu
              </button>
            )}
            <button
              onClick={() => { setOpen(false); navigate("/bildirimler"); }}
              className="text-xs text-primary hover:underline"
            >
              Tümünü Gör
            </button>
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-xs text-muted-foreground">Yükleniyor...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <Bell className="w-8 h-8 text-muted-foreground/30 mb-1" />
              <p className="text-xs text-muted-foreground">Henüz bildiriminiz yok.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const Icon = typeIconMap[n.type] || Bell;
                const colorClass = typeColorMap[n.type] || "text-muted-foreground bg-muted";
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${!n.is_read ? "bg-primary/[0.03]" : ""}`}
                  >
                    <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${!n.is_read ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: tr })}
                      </p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
