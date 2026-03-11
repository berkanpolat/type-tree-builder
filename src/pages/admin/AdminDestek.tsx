import { useEffect, useState, useRef, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Headphones,
  CheckCircle2,
  Clock,
  Search,
  MessageSquare,
  Eye,
  Send,
  User,
  AlertCircle,
  Download,
  Paperclip,
  X,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface DeskTalep {
  id: string;
  talep_no: string;
  user_id: string;
  departman: string;
  konu: string;
  aciklama: string;
  durum: string;
  created_at: string;
  updated_at: string;
  ek_dosya_url: string | null;
  ek_dosya_adi: string | null;
  profile?: { ad: string; soyad: string; iletisim_email: string; iletisim_numarasi: string | null };
  firma_unvani?: string | null;
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
  cevap_bekliyor: "Cevap Bekliyor",
  cevaplandi: "Cevaplandı",
  cozuldu: "Çözüldü",
};

const durumColors: Record<string, string> = {
  inceleniyor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  cevap_bekliyor: "bg-blue-100 text-blue-800 border-blue-200",
  cevaplandi: "bg-green-100 text-green-800 border-green-200",
  cozuldu: "bg-red-100 text-red-800 border-red-200",
};

type FilterKey = "all" | "inceleniyor" | "cozuldu" | "cevaplandi" | "cevap_bekliyor";

const AdminDestek = () => {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [talepler, setTalepler] = useState<DeskTalep[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  // Detail dialog
  const [selectedTalep, setSelectedTalep] = useState<DeskTalep | null>(null);
  const [mesajlar, setMesajlar] = useState<DeskMesaj[]>([]);
  const [yeniMesaj, setYeniMesaj] = useState("");
  const [sending, setSending] = useState(false);
  const [mesajLoading, setMesajLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const adminCall = useCallback(
    async (action: string, extraBody: Record<string, unknown> = {}) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-auth/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...extraBody }),
      });
      return res.json();
    },
    [token]
  );

  const fetchTalepler = useCallback(async () => {
    const data = await adminCall("list-destek");
    if (data.talepler) setTalepler(data.talepler);
    setLoading(false);
  }, [adminCall]);

  useEffect(() => {
    if (token) fetchTalepler();
  }, [token, fetchTalepler]);

  const filtered = filter === "all" ? talepler : talepler.filter((t) => t.durum === filter);

  const toplam = talepler.length;
  const incelenen = talepler.filter((t) => t.durum === "inceleniyor").length;
  const cozulen = talepler.filter((t) => t.durum === "cozuldu").length;
  const cevaplanan = talepler.filter((t) => t.durum === "cevaplandi").length;
  const cevapBekleyen = talepler.filter((t) => t.durum === "cevap_bekliyor").length;

  const statsCards: { title: string; value: number; icon: any; color: string; bgColor: string; filterKey: FilterKey }[] = [
    { title: "Toplam Talepler", value: toplam, icon: Headphones, color: "text-primary", bgColor: "bg-primary/10", filterKey: "all" },
    { title: "İnceleniyor", value: incelenen, icon: Search, color: "text-yellow-500", bgColor: "bg-yellow-50", filterKey: "inceleniyor" },
    { title: "Çözülen", value: cozulen, icon: CheckCircle2, color: "text-red-500", bgColor: "bg-red-50", filterKey: "cozuldu" },
    { title: "Cevaplanan", value: cevaplanan, icon: MessageSquare, color: "text-green-500", bgColor: "bg-green-50", filterKey: "cevaplandi" },
    { title: "Cevap Bekliyor", value: cevapBekleyen, icon: Clock, color: "text-blue-500", bgColor: "bg-blue-50", filterKey: "cevap_bekliyor" },
  ];

  // Open detail
  const openDetail = async (talep: DeskTalep) => {
    setSelectedTalep(talep);
    setMesajLoading(true);
    setMesajlar([]);
    setYeniMesaj("");
    const data = await adminCall("destek-mesajlar", { destekId: talep.id });
    if (data.mesajlar) setMesajlar(data.mesajlar);
    setMesajLoading(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mesajlar]);

  const handleSendMessage = async () => {
    if (!yeniMesaj.trim() || !selectedTalep) return;
    if (selectedTalep.durum === "cozuldu") return;

    setSending(true);
    const data = await adminCall("destek-mesaj-gonder", {
      destekId: selectedTalep.id,
      content: yeniMesaj.trim(),
    });

    if (data.success) {
      setYeniMesaj("");
      // Refresh messages and talep list
      const msgData = await adminCall("destek-mesajlar", { destekId: selectedTalep.id });
      if (msgData.mesajlar) setMesajlar(msgData.mesajlar);
      setSelectedTalep((prev) => prev ? { ...prev, durum: "cevap_bekliyor" } : null);
      fetchTalepler();
    } else {
      toast({ title: "Hata", description: data.error, variant: "destructive" });
    }
    setSending(false);
  };

  const handleResolve = async () => {
    if (!selectedTalep) return;
    const data = await adminCall("destek-durum-guncelle", {
      destekId: selectedTalep.id,
      durum: "cozuldu",
    });
    if (data.success) {
      toast({ title: "Destek talebi çözüldü olarak işaretlendi" });
      setSelectedTalep((prev) => prev ? { ...prev, durum: "cozuldu" } : null);
      fetchTalepler();
    } else {
      toast({ title: "Hata", description: data.error, variant: "destructive" });
    }
  };

  const calcDuration = (start: string, end?: string) => {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const mins = Math.floor((e.getTime() - s.getTime()) / 60000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d} gün`);
    if (h > 0) parts.push(`${h} sa.`);
    if (m > 0 || !parts.length) parts.push(`${m} dk.`);
    return parts.join(" ");
  };

  return (
    <AdminLayout title="Destek Talepleri">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statsCards.map((stat) => (
            <Card
              key={stat.title}
              className={`cursor-pointer transition-shadow hover:shadow-md ${filter === stat.filterKey ? "ring-2 ring-amber-500" : ""}`}
              onClick={() => setFilter(stat.filterKey)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "hsl(var(--admin-muted))" }}>
                    {stat.title}
                  </span>
                  <div className={`p-1.5 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  </div>
                </div>
                <span className="text-2xl font-bold" style={{ color: "hsl(var(--admin-text))" }}>
                  {stat.value}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p style={{ color: "hsl(var(--admin-muted))" }}>Yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Headphones className="w-12 h-12 mx-auto mb-4" style={{ color: "hsl(var(--admin-muted))" }} />
              <p style={{ color: "hsl(var(--admin-muted))" }}>Bu filtrede destek talebi bulunamadı.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "hsl(var(--admin-border))" }}>
                    {["Talep No", "Tarih", "Departman", "Konu", "Firma", "İlgili Kişi", "Durum", "İşlem"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-xs" style={{ color: "hsl(var(--admin-muted))" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((talep) => (
                    <tr
                      key={talep.id}
                      className="border-b last:border-0 hover:opacity-80 transition-opacity"
                      style={{ borderColor: "hsl(var(--admin-border))" }}
                    >
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "hsl(var(--admin-text))" }}>
                        {talep.talep_no}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "hsl(var(--admin-muted))" }}>
                        {new Date(talep.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">{talep.departman}</Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate" style={{ color: "hsl(var(--admin-text))" }}>
                        {talep.konu}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "hsl(var(--admin-muted))" }}>
                        {talep.firma_unvani || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "hsl(var(--admin-muted))" }}>
                        {talep.profile ? `${talep.profile.ad} ${talep.profile.soyad}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] ${durumColors[talep.durum] || ""}`}>
                          {durumLabels[talep.durum] || talep.durum}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => openDetail(talep)}>
                          <Eye className="w-3 h-3 mr-1" /> Görüntüle
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTalep} onOpenChange={(open) => !open && setSelectedTalep(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Destek Kaydı — {selectedTalep?.talep_no}
              {selectedTalep && (
                <Badge variant="outline" className={`text-[10px] ${durumColors[selectedTalep.durum] || ""}`}>
                  {durumLabels[selectedTalep.durum] || selectedTalep.durum}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTalep && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
              {/* Left: Info */}
              <div className="overflow-y-auto border rounded-lg">
                <div className="px-4 py-3 border-b font-semibold text-sm">Kayıt Bilgileri</div>
                <div className="divide-y text-sm">
                  {[
                    { label: "Kayıt No", value: selectedTalep.talep_no },
                    {
                      label: "Kayıt Tarihi",
                      value: new Date(selectedTalep.created_at).toLocaleDateString("tr-TR", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                      }),
                    },
                    { label: "Departman", value: selectedTalep.departman },
                    { label: "Konu", value: selectedTalep.konu },
                    {
                      label: "İlgili Kişi",
                      value: selectedTalep.profile ? `${selectedTalep.profile.ad} ${selectedTalep.profile.soyad}` : "—",
                    },
                    { label: "İlgili Firma", value: selectedTalep.firma_unvani || "—" },
                    { label: "İletişim E-posta", value: selectedTalep.profile?.iletisim_email || "—" },
                    { label: "İletişim Tel.", value: selectedTalep.profile?.iletisim_numarasi || "—" },
                    {
                      label: "Açık Kalma Süresi",
                      value: calcDuration(
                        selectedTalep.created_at,
                        selectedTalep.durum === "cozuldu" ? selectedTalep.updated_at : undefined
                      ),
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex px-4 py-2.5">
                      <span className="w-36 shrink-0 text-muted-foreground font-medium">{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Açıklama */}
                <div className="px-4 py-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Açıklama</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedTalep.aciklama}</p>
                </div>

                {selectedTalep.ek_dosya_url && (
                  <div className="px-4 py-2 border-t">
                    <a href={selectedTalep.ek_dosya_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Download className="w-3 h-3" /> {selectedTalep.ek_dosya_adi || "Ek dosya"}
                    </a>
                  </div>
                )}

                {/* Resolve button */}
                {selectedTalep.durum !== "cozuldu" && (
                  <div className="px-4 py-3 border-t">
                    <Button size="sm" variant="destructive" onClick={handleResolve} className="w-full">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Çözüldü Olarak İşaretle
                    </Button>
                  </div>
                )}
              </div>

              {/* Right: Messages */}
              <div className="flex flex-col border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b font-semibold text-sm">Mesajlar</div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: "350px" }}>
                  {mesajLoading ? (
                    <p className="text-sm text-center text-muted-foreground py-8">Yükleniyor...</p>
                  ) : mesajlar.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-8">Henüz mesaj yok.</p>
                  ) : (
                    mesajlar.map((m) => {
                      const isAdmin = m.sender_type === "admin";
                      return (
                        <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-lg p-2.5 ${isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              {isAdmin ? <Headphones className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              <span className="text-[10px] font-medium opacity-70">
                                {isAdmin ? "Siz (Destek)" : "Kullanıcı"}
                              </span>
                              <span className="text-[10px] opacity-50 ml-auto">
                                {new Date(m.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}{" "}
                                {new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                            {m.ek_dosya_url && (
                              <a href={m.ek_dosya_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs mt-1 underline opacity-80">
                                <Paperclip className="w-3 h-3" /> {m.ek_dosya_adi || "Dosya"}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input */}
                {selectedTalep.durum === "cozuldu" ? (
                  <div className="border-t p-3">
                    <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 border border-yellow-200">
                      <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
                      <p className="text-xs text-yellow-700">Destek talebi çözüldü. Mesaj gönderilemez.</p>
                    </div>
                  </div>
                ) : (
                  <div className="border-t p-3 flex items-end gap-2">
                    <Textarea
                      placeholder="Yanıt yazın..."
                      value={yeniMesaj}
                      onChange={(e) => setYeniMesaj(e.target.value)}
                      rows={2}
                      className="resize-none flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button size="icon" onClick={handleSendMessage} disabled={sending || !yeniMesaj.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDestek;
