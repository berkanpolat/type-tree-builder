import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Paperclip, Download, Headphones, User } from "lucide-react";

interface DeskTalep {
  id: string;
  talep_no: string;
  departman: string;
  konu: string;
  aciklama: string;
  durum: string;
  created_at: string;
  ek_dosya_url: string | null;
  ek_dosya_adi: string | null;
}

interface DeskMesaj {
  id: string;
  destek_id: string;
  sender_type: string;
  sender_id: string;
  content: string;
  ek_dosya_url: string | null;
  ek_dosya_adi: string | null;
  created_at: string;
}

const durumLabels: Record<string, string> = {
  inceleniyor: "İnceleniyor",
  cevap_bekliyor: "Cevap Bekleniyor",
  cevaplandi: "Cevaplandı",
  cozuldu: "Çözüldü",
};

const durumColors: Record<string, string> = {
  inceleniyor: "bg-yellow-100 text-yellow-800",
  cevap_bekliyor: "bg-blue-100 text-blue-800",
  cevaplandi: "bg-green-100 text-green-800",
  cozuldu: "bg-muted text-muted-foreground",
};

const DashboardDestekDetay = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [talep, setTalep] = useState<DeskTalep | null>(null);
  const [mesajlar, setMesajlar] = useState<DeskMesaj[]>([]);
  const [yeniMesaj, setYeniMesaj] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/giris-kayit"); return; }
    setUserId(user.id);

    const [talepRes, mesajRes] = await Promise.all([
      supabase.from("destek_talepleri" as any).select("*").eq("id", id).single(),
      supabase.from("destek_mesajlar" as any).select("*").eq("destek_id", id).order("created_at", { ascending: true }),
    ]);

    if (talepRes.data) setTalep(talepRes.data as any);
    if (mesajRes.data) setMesajlar(mesajRes.data as any[]);
  };

  useEffect(() => { fetchData(); }, [id]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`destek-mesaj-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "destek_mesajlar",
        filter: `destek_id=eq.${id}`,
      }, (payload) => {
        setMesajlar(prev => [...prev, payload.new as DeskMesaj]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Realtime for talep status changes
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`destek-talep-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "destek_talepleri",
        filter: `id=eq.${id}`,
      }, (payload) => {
        setTalep(payload.new as any);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mesajlar]);

  const handleSend = async () => {
    if (!yeniMesaj.trim() || !talep) return;
    if (talep.durum === "cozuldu") {
      toast({ title: "Bu talep çözüldü, mesaj gönderilemez", variant: "destructive" });
      return;
    }

    setSending(true);
    const { error: msgErr } = await supabase.from("destek_mesajlar" as any).insert({
      destek_id: talep.id,
      sender_type: "user",
      sender_id: userId,
      content: yeniMesaj.trim(),
    } as any);

    if (!msgErr) {
      // Update status to cevaplandi (user replied)
      await supabase.from("destek_talepleri" as any).update({ durum: "cevaplandi" } as any).eq("id", talep.id);
      setYeniMesaj("");
    } else {
      toast({ title: "Hata", description: msgErr.message, variant: "destructive" });
    }
    setSending(false);
  };

  if (!talep) {
    return (
      <DashboardLayout title="Destek Talebi">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </DashboardLayout>
    );
  }

  const isClosed = talep.durum === "cozuldu";

  return (
    <DashboardLayout title="Destek Talebi">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/destek")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono text-muted-foreground">{talep.talep_no}</span>
              <Badge variant="outline">{talep.departman}</Badge>
              <Badge variant="outline" className={durumColors[talep.durum] || ""}>
                {durumLabels[talep.durum] || talep.durum}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold text-foreground mt-1 truncate">{talep.konu}</h2>
          </div>
        </div>

        {/* Talep Bilgisi */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{talep.aciklama}</p>
            {talep.ek_dosya_url && (
              <a
                href={talep.ek_dosya_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
              >
                <Download className="w-3 h-3" /> {talep.ek_dosya_adi || "Ek dosya"}
              </a>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(talep.created_at).toLocaleDateString("tr-TR", {
                day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </CardContent>
        </Card>

        {/* Mesajlar */}
        <Card className="flex flex-col" style={{ height: "400px" }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {mesajlar.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Henüz mesaj bulunmuyor.</p>
              </div>
            )}
            {mesajlar.map((m) => {
              const isAdmin = m.sender_type === "admin";
              return (
                <div key={m.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-lg p-3 ${isAdmin ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {isAdmin ? (
                        <Headphones className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      <span className="text-[10px] font-medium opacity-70">
                        {isAdmin ? "Destek Ekibi" : "Siz"}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    {m.ek_dosya_url && (
                      <a
                        href={m.ek_dosya_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs mt-1 underline opacity-80"
                      >
                        <Paperclip className="w-3 h-3" /> {m.ek_dosya_adi || "Dosya"}
                      </a>
                    )}
                    <p className={`text-[10px] mt-1 ${isAdmin ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                      {new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          {!isClosed ? (
            <div className="border-t p-3 flex items-end gap-2">
              <Textarea
                placeholder="Mesajınızı yazın..."
                value={yeniMesaj}
                onChange={e => setYeniMesaj(e.target.value)}
                rows={2}
                className="resize-none flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button size="icon" onClick={handleSend} disabled={sending || !yeniMesaj.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="border-t p-3 text-center">
              <p className="text-sm text-muted-foreground">Bu destek talebi çözülmüştür. Mesaj gönderilemez.</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardDestekDetay;
