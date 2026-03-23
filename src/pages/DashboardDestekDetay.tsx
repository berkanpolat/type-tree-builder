import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Download,
  Headphones,
  User,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";

interface DeskTalep {
  id: string;
  talep_no: string;
  departman: string;
  konu: string;
  aciklama: string;
  durum: string;
  created_at: string;
  updated_at: string;
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

interface ProfileData {
  ad: string;
  soyad: string;
  iletisim_email: string;
  iletisim_numarasi: string | null;
}

interface FirmaData {
  firma_unvani: string;
}

// User-side labels: cevaplandi means user sent last (waiting for admin)
// cevap_bekliyor means admin replied (user can respond)
const durumLabels: Record<string, string> = {
  inceleniyor: "İnceleniyor",
  cevaplandi: "Cevap Bekleniyor",
  cevap_bekliyor: "Cevaplandı",
  cozuldu: "Çözüldü",
};

const durumColors: Record<string, string> = {
  inceleniyor: "bg-yellow-100 text-yellow-800",
  cevaplandi: "bg-blue-100 text-blue-800",
  cevap_bekliyor: "bg-green-100 text-green-800",
  cozuldu: "bg-destructive/10 text-destructive",
};

function calcOpenDuration(start: string, end?: string): string {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate.getTime() - startDate.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} gün`);
  if (hours > 0) parts.push(`${hours} sa.`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} dk.`);
  return parts.join(" ");
}

const DashboardDestekDetay = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [talep, setTalep] = useState<DeskTalep | null>(null);
  const [mesajlar, setMesajlar] = useState<DeskMesaj[]>([]);
  const [yeniMesaj, setYeniMesaj] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [firma, setFirma] = useState<FirmaData | null>(null);
  const [ekDosya, setEkDosya] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/giris-kayit");
      return;
    }
    setUserId(user.id);

    const [talepRes, mesajRes, profileRes, firmaRes] = await Promise.all([
      supabase
        .from("destek_talepleri" as any)
        .select("*")
        .eq("id", id)
        .single(),
      supabase
        .from("destek_mesajlar" as any)
        .select("*")
        .eq("destek_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("ad, soyad, iletisim_email, iletisim_numarasi")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("firmalar")
        .select("firma_unvani")
        .eq("user_id", user.id)
        .single(),
    ]);

    if (talepRes.data) setTalep(talepRes.data as any);
    if (mesajRes.data) setMesajlar(mesajRes.data as any[]);
    if (profileRes.data) setProfile(profileRes.data);
    if (firmaRes.data) setFirma(firmaRes.data);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Realtime for messages
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`destek-mesaj-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "destek_mesajlar",
          filter: `destek_id=eq.${id}`,
        },
        (payload) => {
          setMesajlar((prev) => [...prev, payload.new as DeskMesaj]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Realtime for talep status
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`destek-talep-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "destek_talepleri",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setTalep(payload.new as any);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [mesajlar]);

  const handleSend = async () => {
    if (!yeniMesaj.trim() || !talep) return;
    if (talep.durum === "cozuldu") {
      toast({
        title: "Bu talep çözüldü, mesaj gönderilemez",
        variant: "destructive",
      });
      return;
    }
    // User can send when admin replied (cevap_bekliyor = admin sent last)
    if (talep.durum !== "cevap_bekliyor") {
      toast({
        title: "Mesaj gönderemezsiniz",
        description: "Destek ekibinden yanıt bekleyiniz.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    let ekDosyaUrl: string | null = null;
    let ekDosyaAdi: string | null = null;

    if (ekDosya) {
      const filePath = `destek/${userId}/${Date.now()}_${ekDosya.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("sikayet-files")
        .upload(filePath, ekDosya);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("sikayet-files")
          .getPublicUrl(filePath);
        ekDosyaUrl = urlData.publicUrl;
        ekDosyaAdi = ekDosya.name;
      }
    }

    const { error: msgErr } = await supabase
      .from("destek_mesajlar" as any)
      .insert({
        destek_id: talep.id,
        sender_type: "user",
        sender_id: userId,
        content: yeniMesaj.trim(),
        ek_dosya_url: ekDosyaUrl,
        ek_dosya_adi: ekDosyaAdi,
      } as any);

    if (!msgErr) {
      // User replied → status becomes cevaplandi (user sent last, waiting for admin)
      await supabase
        .from("destek_talepleri" as any)
        .update({ durum: "cevaplandi" } as any)
        .eq("id", talep.id);
      setYeniMesaj("");
      setEkDosya(null);
    } else {
      toast({
        title: "Hata",
        description: msgErr.message,
        variant: "destructive",
      });
    }
    setSending(false);
  };

  if (!talep) {
    return (
      <DashboardLayout title="Destek Kaydı Detayları">
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const isClosed = talep.durum === "cozuldu";
  // User can send when status is cevap_bekliyor (admin sent last, user's turn)
  const canSendMessage = talep.durum === "cevap_bekliyor";

  const infoRows = [
    { label: "Kayıt No", value: talep.talep_no },
    {
      label: "Kayıt Tarihi",
      value: new Date(talep.created_at).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    { label: "Departman", value: talep.departman },
    { label: "Konu", value: talep.konu },
    {
      label: "İlgili Kişi",
      value: profile ? `${profile.ad} ${profile.soyad}` : "—",
    },
    { label: "İlgili Firma", value: firma?.firma_unvani || "—" },
    {
      label: "İletişim E-posta",
      value: profile?.iletisim_email || "—",
    },
    {
      label: "İletişim Cep Telefonu",
      value: profile?.iletisim_numarasi || "—",
    },
    {
      label: "Açık Kalma Süresi",
      value: calcOpenDuration(
        talep.created_at,
        isClosed ? talep.updated_at : undefined
      ),
    },
    { label: "İlgili Personel", value: "—" },
  ];

  return (
    <DashboardLayout title="Destek Kaydı Detayları">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/destek")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Destek Kaydı Detayları
            </h2>
            <p className="text-xs text-muted-foreground">
              Destek → Destek Kayıtlarım → Destek Kaydı Detayları
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sol: Kayıt Bilgileri */}
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b">
                <h3 className="text-base font-semibold text-foreground">
                  Kayıt Bilgileri
                </h3>
              </div>
              <div className="divide-y">
                {infoRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start px-6 py-3 text-sm"
                  >
                    <span className="w-44 shrink-0 text-muted-foreground font-medium">
                      {row.label}
                    </span>
                    <span className="text-foreground">{row.value}</span>
                  </div>
                ))}
                {/* Durum row */}
                <div className="flex items-center px-6 py-3 text-sm">
                  <span className="w-44 shrink-0 text-muted-foreground font-medium">
                    Durumu
                  </span>
                  <Badge
                    variant="outline"
                    className={durumColors[talep.durum] || ""}
                  >
                    {durumLabels[talep.durum] || talep.durum}
                  </Badge>
                </div>
              </div>

              {/* Ek dosya */}
              {talep.ek_dosya_url && (
                <div className="px-6 py-3 border-t">
                  <a
                    href={talep.ek_dosya_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Download className="w-3 h-3" />{" "}
                    {talep.ek_dosya_adi || "Ek dosya"}
                  </a>
                </div>
              )}

              {/* Açıklama */}
              <div className="px-6 py-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Açıklama
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {talep.aciklama}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sağ: Mesajlar */}
          <Card className="flex flex-col" style={{ minHeight: "500px" }}>
            <div className="px-6 py-4 border-b">
              <h3 className="text-base font-semibold text-foreground">
                Mesajlar
              </h3>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {mesajlar.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">
                    Henüz mesaj bulunmuyor.
                  </p>
                </div>
              )}
              {mesajlar.map((m) => {
                const isAdmin = m.sender_type === "admin";
                return (
                  <div
                    key={m.id}
                    className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isAdmin ? "bg-muted" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {isAdmin ? (
                          <Headphones className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        <span className="text-[10px] font-medium opacity-70">
                          {isAdmin ? "Destek Ekibi" : "Siz"}
                        </span>
                        <span className="text-[10px] opacity-50 ml-auto">
                          {new Date(m.created_at).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                          {new Date(m.created_at).toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                          <Paperclip className="w-3 h-3" />{" "}
                          {m.ek_dosya_adi || "Dosya"}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            {isClosed ? (
              <div className="border-t p-4">
                <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200">
                  <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
                  <p className="text-sm text-yellow-700">
                    Destek kaydının durumu Çözüldü olduğu için mesaj eklenemez.
                  </p>
                </div>
              </div>
            ) : !canSendMessage ? (
              <div className="border-t p-4">
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted border border-border">
                  <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Destek ekibinden yanıt bekleniyor. Yanıt geldiğinde mesaj gönderebilirsiniz.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-t p-3 space-y-2">
                {ekDosya && (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 text-sm">
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate flex-1">{ekDosya.name}</span>
                    <button
                      onClick={() => setEkDosya(null)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <label className="p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        setEkDosya(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                  <Textarea
                    placeholder="Mesajınızı yazın..."
                    value={yeniMesaj}
                    onChange={(e) => setYeniMesaj(e.target.value)}
                    rows={2}
                    className="resize-none flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={sending || !yeniMesaj.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardDestekDetay;
