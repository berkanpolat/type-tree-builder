import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MessageSquare } from "lucide-react";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface ConversationItem {
  id: string;
  otherUserId: string;
  firmaUnvani: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export default function HeaderMessagePanel() {
  const navigate = useNavigate();
  const unreadMessages = useUnreadMessages();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false })
      .limit(10);

    if (!convs || convs.length === 0) { setConversations([]); setLoading(false); return; }

    const items: ConversationItem[] = [];

    for (const conv of convs) {
      const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

      const [firmaRes, msgRes, unreadRes] = await Promise.all([
        supabase.from("firmalar").select("firma_unvani").eq("user_id", otherUserId).single(),
        supabase.from("messages").select("content, created_at").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conv.id).neq("sender_id", user.id).eq("is_read", false),
      ]);

      if (!msgRes.data || msgRes.data.length === 0) continue;

      items.push({
        id: conv.id,
        otherUserId,
        firmaUnvani: firmaRes.data?.firma_unvani || "Bilinmeyen",
        lastMessage: msgRes.data[0].content,
        lastMessageAt: msgRes.data[0].created_at,
        unreadCount: unreadRes.count || 0,
      });
    }

    setConversations(items);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchConversations();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          {unreadMessages > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadMessages > 99 ? "99+" : unreadMessages}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-[380px] sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span>Mesajlar</span>
            <button
              onClick={() => { setOpen(false); navigate("/mesajlar"); }}
              className="text-xs text-primary hover:underline font-normal"
            >
              Tümünü Gör
            </button>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Henüz mesajınız yok.</p>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setOpen(false); navigate("/mesajlar"); }}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${conv.unreadCount > 0 ? "bg-primary/[0.03]" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
                      {conv.firmaUnvani.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm truncate ${conv.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                          {conv.firmaUnvani}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: tr })}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 truncate max-w-[200px] ${conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
