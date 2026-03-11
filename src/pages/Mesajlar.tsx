import { useEffect, useState, useRef, useCallback } from "react";
import { usePackageQuota, canPerformAction } from "@/hooks/use-package-quota";
import UpgradeDialog from "@/components/UpgradeDialog";
import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send, Building2, Paperclip, X, FileText, Image as ImageIcon, Download, Trash2, Flag, MoreVertical } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BildirDialog from "@/components/BildirDialog";

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  other_user_id: string;
  firma_unvani: string;
  logo_url: string | null;
  last_message?: string;
  last_message_sender_id?: string;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
}

interface QuoteData {
  urunBaslik: string;
  urunNo: string;
  fiyat: string;
  moq: number | null;
  fotoUrl: string | null;
}

export default function Mesajlar() {
  const location = useLocation();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [deleteConvTarget, setDeleteConvTarget] = useState<Conversation | null>(null);
  const [bildirOpen, setBildirOpen] = useState(false);
  const packageInfo = usePackageQuota();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    initUser();
  }, []);

  // Handle navigation state (from "Satıcıya Sor") and query param (from notifications)
  const handledStateRef = useRef(false);

  useEffect(() => {
    if (handledStateRef.current) return;
    if (!currentUserId) return;
    if (loading) return;

    // Check URL query param ?conv=xxx (from notification click)
    const searchParams = new URLSearchParams(location.search);
    const convFromQuery = searchParams.get("conv");

    const state = location.state as {
      openConversationId?: string;
      otherUserId?: string;
      quote?: QuoteData;
    } | null;

    const targetConvId = state?.openConversationId || convFromQuery;

    console.log("[Mesajlar] State handler:", { targetConvId, otherUserId: state?.otherUserId, conversationsCount: conversations.length });

    if (!targetConvId) return;

    handledStateRef.current = true;

    if (state?.quote) {
      setQuote(state.quote);
    }

    const conv = conversations.find((c) => c.id === targetConvId);
    if (conv) {
      console.log("[Mesajlar] Found existing conversation, selecting it");
      selectConversation(conv);
    } else if (state?.otherUserId) {
      console.log("[Mesajlar] Conversation not in list, fetching and opening");
      fetchAndOpenConversation(targetConvId, state.otherUserId);
    } else {
      console.log("[Mesajlar] Conversation not found and no otherUserId provided");
    }

    // Clear the state/query so it doesn't re-trigger
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [currentUserId, loading, conversations, location.state, location.search]);

  const fetchAndOpenConversation = async (convId: string, otherUserId: string) => {
    const { data: firmaData } = await supabase
      .from("firmalar")
      .select("user_id, firma_unvani, logo_url")
      .eq("user_id", otherUserId)
      .single();

    const conv: Conversation = {
      id: convId,
      user1_id: "",
      user2_id: "",
      last_message_at: new Date().toISOString(),
      other_user_id: otherUserId,
      firma_unvani: firmaData?.firma_unvani || "Bilinmeyen Firma",
      logo_url: firmaData?.logo_url || null,
      last_message: "",
      unread_count: 0,
    };

    setConversations((prev) => {
      if (prev.find((c) => c.id === convId)) return prev;
      return [conv, ...prev];
    });
    selectConversation(conv);
  };

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

    const convIds = convs.map((c) => c.id);

    // Batch: get last message per conversation + unread count in fewer queries
    // Get only the latest message per conversation (limit to one per conv using a single query)
    const { data: allLastMsgs } = await supabase
      .from("messages")
      .select("conversation_id, content, sender_id, is_read, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    // Build maps efficiently
    const lastMsgMap: Record<string, { content: string; senderId: string }> = {};
    const unreadMap: Record<string, number> = {};
    const hasMessages = new Set<string>();

    if (allLastMsgs) {
      for (const m of allLastMsgs) {
        hasMessages.add(m.conversation_id);
        if (!lastMsgMap[m.conversation_id]) {
          lastMsgMap[m.conversation_id] = { content: m.content, senderId: m.sender_id };
        }
        if (!m.is_read && m.sender_id !== userId) {
          unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
        }
      }
    }

    const filteredConvs = convs.filter((c) => hasMessages.has(c.id));

    const otherUserIds = filteredConvs.map((c) =>
      c.user1_id === userId ? c.user2_id : c.user1_id
    );

    const { data: firmalar } = await supabase
      .from("firmalar")
      .select("user_id, firma_unvani, logo_url")
      .in("user_id", otherUserIds);

    const firmaMap: Record<string, { firma_unvani: string; logo_url: string | null }> = {};
    firmalar?.forEach((f) => { firmaMap[f.user_id] = f; });

    const mapped: Conversation[] = filteredConvs.map((c) => {
      const otherId = c.user1_id === userId ? c.user2_id : c.user1_id;
      const firma = firmaMap[otherId];
      return {
        ...c,
        other_user_id: otherId,
        firma_unvani: firma?.firma_unvani || "Bilinmeyen Firma",
        logo_url: firma?.logo_url || null,
        last_message: lastMsgMap[c.id]?.content || "",
        last_message_sender_id: lastMsgMap[c.id]?.senderId || "",
        unread_count: unreadMap[c.id] || 0,
      };
    });

    setConversations(mapped);
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    await fetchMessages(conv.id);

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

    setMessages((data as Message[]) || []);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Dosya çok büyük", description: "Maksimum 10MB dosya yükleyebilirsiniz.", variant: "destructive" });
      return;
    }
    setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string } | null> => {
    const ext = file.name.split(".").pop() || "file";
    const path = `${currentUserId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("chat-files").upload(path, file);
    if (error) {
      toast({ title: "Yükleme hatası", description: error.message, variant: "destructive" });
      return null;
    }

    const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name };
  };

  const handleSend = async () => {
    console.log("[Mesajlar] handleSend called", { 
      hasMessage: !!newMessage.trim(), 
      hasPendingFile: !!pendingFile, 
      hasQuote: !!quote, 
      selectedConvId: selectedConv?.id, 
      currentUserId 
    });
    
    if ((!newMessage.trim() && !pendingFile && !quote) || !selectedConv || !currentUserId) {
      console.log("[Mesajlar] handleSend early return - missing data");
      return;
    }

    // Check if this is a new conversation (no messages from current user yet)
    const existingMessages = messages.filter(m => m.sender_id === currentUserId);
    console.log("[Mesajlar] existingMessages count:", existingMessages.length, "total messages:", messages.length);
    
    if (existingMessages.length === 0) {
      // This is initiating a new conversation - check quota
      const check = canPerformAction(packageInfo.limits, packageInfo.usage, "mesaj");
      console.log("[Mesajlar] Quota check result:", check);
      if (!check.allowed) {
        setUpgradeMessage(check.message || "Mesaj gönderme hakkınız dolmuştur.");
        setUpgradeOpen(true);
        return;
      }

      // Also check: if user hasn't received any reply yet, block second message
      const otherMessages = messages.filter(m => m.sender_id !== currentUserId);
      if (messages.length > 0 && otherMessages.length === 0) {
        console.log("[Mesajlar] Blocked - waiting for reply");
        toast({ title: "Yanıt bekleniyor", description: "Karşı taraf yanıt verene kadar ikinci mesaj gönderemezsiniz.", variant: "destructive" });
        return;
      }
    } else {
      // User already sent messages in this conversation
      const firstMessage = messages[0];
      if (firstMessage?.sender_id === currentUserId) {
        const otherMessages = messages.filter(m => m.sender_id !== currentUserId);
        if (otherMessages.length === 0) {
          console.log("[Mesajlar] Blocked - waiting for reply (existing conv)");
          toast({ title: "Yanıt bekleniyor", description: "Karşı taraf yanıt verene kadar ikinci mesaj gönderemezsiniz.", variant: "destructive" });
          return;
        }
      }
    }

    setUploading(true);
    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (pendingFile) {
      const result = await uploadFile(pendingFile);
      if (!result) { setUploading(false); return; }
      fileUrl = result.url;
      fileName = result.name;
      setPendingFile(null);
    }

    // Build content with quote if present
    let content = newMessage.trim();
    if (quote) {
      const isIhale = quote.urunNo && !quote.urunNo.startsWith("#");
      const quoteParts = [
        isIhale ? `📋 İhale Hakkında Bilgi Talebi` : `📦 Ürün Hakkında Bilgi Talebi`,
        `━━━━━━━━━━━━━━━━`,
        `🏷️ ${quote.urunBaslik}`,
        isIhale ? `🔢 İhale No: #${quote.urunNo}` : `🔢 Ürün No: ${quote.urunNo}`,
      ];
      if (quote.fiyat) quoteParts.push(isIhale ? `💰 Başlangıç Fiyatı: ${quote.fiyat}` : `💰 Fiyat: ${quote.fiyat}`);
      if (quote.moq) quoteParts.push(`📦 Min. Sipariş: ${quote.moq} Adet`);
      quoteParts.push(`━━━━━━━━━━━━━━━━`);
      if (content) quoteParts.push(`\n${content}`);

      content = quoteParts.join("\n");
      setQuote(null);
    }

    if (!content && !fileUrl) { setUploading(false); return; }

    setNewMessage("");

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: currentUserId,
      content: content || (fileName ? `📎 ${fileName}` : ""),
      file_url: fileUrl,
      file_name: fileName,
    });

    if (insertError) {
      console.error("[Mesajlar] Message insert error:", insertError);
      toast({ title: "Mesaj gönderilemedi", description: insertError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    console.log("[Mesajlar] Message inserted successfully");

    const { error: updateError } = await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", selectedConv.id);

    if (updateError) {
      console.error("[Mesajlar] Conversation update error:", updateError);
    }

    setUploading(false);
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

  const handleDeleteMessage = async () => {
    if (!deleteTarget || !currentUserId) return;
    await supabase.from("messages").delete().eq("id", deleteTarget.id);
    setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
    if (currentUserId) fetchConversations(currentUserId);
  };

  const handleDeleteConversation = async () => {
    if (!deleteConvTarget || !currentUserId) return;
    await supabase.from("messages").delete().eq("conversation_id", deleteConvTarget.id);
    await supabase.from("conversations").delete().eq("id", deleteConvTarget.id);
    setConversations((prev) => prev.filter((c) => c.id !== deleteConvTarget.id));
    if (selectedConv?.id === deleteConvTarget.id) {
      setSelectedConv(null);
      setMessages([]);
    }
    setDeleteConvTarget(null);
    toast({ title: "Sohbet silindi" });
  };

  const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  const renderMessageContent = (msg: Message, isMine: boolean) => {
    return (
      <>
        {/* File attachment */}
        {msg.file_url && msg.file_name && (
          <div className="mb-1.5">
            {isImageFile(msg.file_name) ? (
              <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={msg.file_url}
                  alt={msg.file_name}
                  className="max-w-[240px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <a
                href={msg.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                  isMine
                    ? "border-primary-foreground/20 hover:bg-primary-foreground/10"
                    : "border-border hover:bg-background"
                }`}
              >
                <FileText className="w-5 h-5 shrink-0" />
                <span className="text-xs truncate max-w-[160px]">{msg.file_name}</span>
                <Download className="w-4 h-4 shrink-0 ml-auto" />
              </a>
            )}
          </div>
        )}
        {/* Text content */}
        {msg.content && !(msg.file_url && msg.content === `📎 ${msg.file_name}`) && (
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        )}
        <p
          className={`text-[10px] mt-1 ${
            isMine ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {format(new Date(msg.created_at), "HH:mm")}
        </p>
      </>
    );
  };

  return (
    <DashboardLayout title="Mesajlar">
      <div className="flex h-[calc(100vh-8rem)] border border-border rounded-lg overflow-hidden bg-background">
        {/* Left: Conversation list */}
        <div className="w-80 border-r border-border flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
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
            <div className="px-2.5 py-2">
            {loading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Yükleniyor...</p>
            ) : filteredConvs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Henüz konuşma yok.</p>
            ) : (
              <div className="space-y-0.5">
              {filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-lg hover:bg-muted/60 transition-colors text-left border border-transparent ${
                    selectedConv?.id === conv.id ? "bg-muted border-border" : ""
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {conv.logo_url ? (
                      <img src={conv.logo_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate max-w-[130px] ${conv.unread_count > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>{conv.firma_unvani}</p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs truncate max-w-[150px] ${
                        conv.unread_count > 0 && conv.last_message_sender_id !== currentUserId
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground"
                      }`}>{conv.last_message}</p>
                      {conv.unread_count > 0 && (
                        <span className="min-w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 ml-2 px-1">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              </div>
            )}
            </div>
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
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">{selectedConv.firma_unvani}</p>
                  <p className="text-xs text-emerald-500">Çevrimiçi</p>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setBildirOpen(true)} className="gap-2 text-foreground">
                        <Flag className="w-4 h-4" />
                        Bildir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteConvTarget(selectedConv)} className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4" />
                        Sohbeti Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                        className={`flex group ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        {isMine && (
                          <button
                            onClick={() => setDeleteTarget(msg)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-2 p-1.5 rounded-full hover:bg-destructive/10"
                            title="Mesajı sil"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        )}
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          {renderMessageContent(msg, isMine)}
                        </div>
                        {!isMine && (
                          <button
                            onClick={() => setDeleteTarget(msg)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-2 p-1.5 rounded-full hover:bg-destructive/10"
                            title="Mesajı sil"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quote preview */}
              {quote && (
                <div className="px-4 pt-3 border-t border-border">
                  <div className="flex items-start gap-3 bg-muted/60 rounded-lg p-3 border-l-4 border-primary relative">
                    {quote.fotoUrl && (
                      <img src={quote.fotoUrl} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{quote.urunBaslik}</p>
                      <p className="text-xs text-muted-foreground">Ürün No: {quote.urunNo}</p>
                      {quote.fiyat && <p className="text-xs text-muted-foreground">Fiyat: {quote.fiyat}</p>}
                    </div>
                    <button
                      onClick={() => setQuote(null)}
                      className="p-1 rounded-full hover:bg-muted transition-colors shrink-0"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}

              {/* Pending file preview */}
              {pendingFile && (
                <div className="px-4 pt-2">
                  <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2 border border-border">
                    {isImageFile(pendingFile.name) ? (
                      <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm text-foreground truncate flex-1">{pendingFile.name}</span>
                    <button onClick={() => setPendingFile(null)} className="p-1 rounded-full hover:bg-muted shrink-0">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="px-4 py-3 border-t border-border">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Paperclip className="w-5 h-5 text-muted-foreground" />
                  </Button>
                  <Input
                    placeholder="Bir mesaj yazın..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                    disabled={uploading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={(!newMessage.trim() && !pendingFile && !quote) || uploading}
                    size="sm"
                    className="gap-1.5"
                  >
                    {uploading ? "..." : "Gönder"}
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mesajı silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Mesaj kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConvTarget} onOpenChange={(open) => !open && setDeleteConvTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sohbeti silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Tüm mesajlar kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedConv && (
        <BildirDialog
          open={bildirOpen}
          onOpenChange={setBildirOpen}
          tur="mesaj"
          referansId={selectedConv.id}
        />
      )}

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Mesaj Gönderme Hakkınız Doldu"
        message={upgradeMessage}
      />
    </DashboardLayout>
  );
}
