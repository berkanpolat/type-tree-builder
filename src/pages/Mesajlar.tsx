import { useEffect, useState, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send, Building2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  other_user_id: string;
  firma_unvani: string;
  logo_url: string | null;
  last_message?: string;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function Mesajlar() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    initUser();
  }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      await fetchConversations(user.id);
    }
    setLoading(false);
  };

  const fetchConversations = async (userId: string) => {
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    if (!convs || convs.length === 0) {
      setConversations([]);
      return;
    }

    // Get other user IDs
    const otherUserIds = convs.map((c) =>
      c.user1_id === userId ? c.user2_id : c.user1_id
    );

    // Get firma info for other users
    const { data: firmalar } = await supabase
      .from("firmalar")
      .select("user_id, firma_unvani, logo_url")
      .in("user_id", otherUserIds);

    const firmaMap: Record<string, { firma_unvani: string; logo_url: string | null }> = {};
    firmalar?.forEach((f) => { firmaMap[f.user_id] = f; });

    // Get last message for each conversation
    const convIds = convs.map((c) => c.id);
    const { data: lastMessages } = await supabase
      .from("messages")
      .select("conversation_id, content, is_read, sender_id")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const lastMsgMap: Record<string, { content: string; unread: number }> = {};
    convIds.forEach((cid) => {
      const msgs = lastMessages?.filter((m) => m.conversation_id === cid) || [];
      const lastMsg = msgs[0];
      const unread = msgs.filter((m) => !m.is_read && m.sender_id !== userId).length;
      lastMsgMap[cid] = { content: lastMsg?.content || "", unread };
    });

    const mapped: Conversation[] = convs.map((c) => {
      const otherId = c.user1_id === userId ? c.user2_id : c.user1_id;
      const firma = firmaMap[otherId];
      return {
        ...c,
        other_user_id: otherId,
        firma_unvani: firma?.firma_unvani || "Bilinmeyen Firma",
        logo_url: firma?.logo_url || null,
        last_message: lastMsgMap[c.id]?.content || "",
        unread_count: lastMsgMap[c.id]?.unread || 0,
      };
    });

    setConversations(mapped);
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    await fetchMessages(conv.id);

    // Mark messages as read
    if (currentUserId) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", currentUserId)
        .eq("is_read", false);

      setConversations((prev) =>
        prev.map((c) => c.id === conv.id ? { ...c, unread_count: 0 } : c)
      );
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
    setTimeout(scrollToBottom, 100);
  };

  // Realtime subscription for new messages
  useEffect(() => {
    if (!selectedConv) return;

    const channel = supabase
      .channel(`messages-${selectedConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConv.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 100);

          // Mark as read if from other user
          if (currentUserId && newMsg.sender_id !== currentUserId) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv, currentUserId, scrollToBottom]);

  // Realtime for conversation list updates
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("conv-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchConversations(currentUserId);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv || !currentUserId) return;

    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: currentUserId,
      content,
    });

    // Update last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", selectedConv.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConvs = conversations.filter((c) =>
    c.firma_unvani.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return format(date, "HH:mm");

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Dün";

    return format(date, "dd MMM", { locale: tr });
  };

  return (
    <DashboardLayout title="Mesajlar">
      <div className="flex h-[calc(100vh-8rem)] border border-border rounded-lg overflow-hidden bg-background">
        {/* Left: Conversation list */}
        <div className="w-80 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Firma ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Yükleniyor...</p>
            ) : filteredConvs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Henüz konuşma yok.</p>
            ) : (
              filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${
                    selectedConv?.id === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {conv.logo_url ? (
                      <img src={conv.logo_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-foreground truncate">{conv.firma_unvani}</p>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                      {conv.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 ml-2">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Right: Chat area */}
        <div className="flex-1 flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Bir konuşma seçin</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-5 py-3 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {selectedConv.logo_url ? (
                    <img src={selectedConv.logo_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{selectedConv.firma_unvani}</p>
                  <p className="text-xs text-emerald-500">Çevrimiçi</p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-5 py-4">
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {format(new Date(msg.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Bir mesaj yazın..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    size="sm"
                    className="gap-1.5"
                  >
                    Gönder
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
