import { useAdminTitle } from "@/components/admin/AdminLayout";
import { useEffect, useState, useRef, useCallback, CSSProperties } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
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
  Upload,
  X,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const s = {
  card: {
    background: "hsl(var(--admin-card-bg))",
    border: "1px solid hsl(var(--admin-border))",
    borderRadius: "0.75rem",
  } as CSSProperties,
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
  input: {
    background: "hsl(var(--admin-input-bg))",
    borderColor: "hsl(var(--admin-border))",
    color: "hsl(var(--admin-text))",
  } as CSSProperties,
};

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
  cevaplandi: "Cevaplandı",
  cevap_bekliyor: "Cevap Bekliyor",
  cozuldu: "Çözüldü",
};

const durumBadgeStyle: Record<string, { bg: string; text: string; border: string }> = {
  inceleniyor: { bg: "rgba(234,179,8,0.1)", text: "#eab308", border: "rgba(234,179,8,0.25)" },
  cevaplandi: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", border: "rgba(34,197,94,0.25)" },
  cevap_bekliyor: { bg: "rgba(59,130,246,0.1)", text: "#3b82f6", border: "rgba(59,130,246,0.25)" },
  cozuldu: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", border: "rgba(239,68,68,0.25)" },
};

type StatusFilter = "all" | "inceleniyor" | "cozuldu" | "cevaplandi" | "cevap_bekliyor";

const AdminDestek = () => {
  const { token, hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [talepler, setTalepler] = useState<DeskTalep[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [departmanFilter, setDepartmanFilter] = useState<string>("all");

  const [selectedTalep, setSelectedTalep] = useState<DeskTalep | null>(null);
  const [mesajlar, setMesajlar] = useState<DeskMesaj[]>([]);
  const [yeniMesaj, setYeniMesaj] = useState("");
  const [sending, setSending] = useState(false);
  const [mesajLoading, setMesajLoading] = useState(false);
  const [ekDosya, setEkDosya] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const departments = [...new Set(talepler.map((t) => t.departman))].sort();

  const filtered = talepler.filter((t) => {
    if (statusFilter !== "all" && t.durum !== statusFilter) return false;
    if (departmanFilter !== "all" && t.departman !== departmanFilter) return false;
    return true;
  });

  const toplam = talepler.length;
  const incelenen = talepler.filter((t) => t.durum === "inceleniyor").length;
  const cozulen = talepler.filter((t) => t.durum === "cozuldu").length;
  const cevaplanan = talepler.filter((t) => t.durum === "cevaplandi").length;
  const cevapBekleyen = talepler.filter((t) => t.durum === "cevap_bekliyor").length;

  const departmanStats = departments.map((dep) => ({
    name: dep,
    count: talepler.filter((t) => t.departman === dep).length,
  }));

  const statsCards: { title: string; value: number; icon: any; color: string; filterKey: StatusFilter }[] = [
    { title: "Toplam Talepler", value: toplam, icon: Headphones, color: "text-amber-500", filterKey: "all" },
    { title: "İnceleniyor", value: incelenen, icon: Search, color: "text-yellow-500", filterKey: "inceleniyor" },
    { title: "Çözülen", value: cozulen, icon: CheckCircle2, color: "text-red-500", filterKey: "cozuldu" },
    { title: "Cevaplanan", value: cevaplanan, icon: MessageSquare, color: "text-green-500", filterKey: "cevaplandi" },
    { title: "Cevap Bekliyor", value: cevapBekleyen, icon: Clock, color: "text-blue-500", filterKey: "cevap_bekliyor" },
  ];

  const openDetail = async (talep: DeskTalep) => {
    setSelectedTalep(talep);
    setMesajLoading(true);
    setMesajlar([]);
    setYeniMesaj("");
    setEkDosya(null);
    const data = await adminCall("destek-mesajlar", { destekId: talep.id });
    if (data.mesajlar) setMesajlar(data.mesajlar);
    setMesajLoading(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mesajlar]);

  const handleSendMessage = async () => {
    if (!hasPermission("destek_cevap")) {
      toast({ title: "Yetkisiz", description: "Buna yetkiniz yok", variant: "destructive" });
      return;
    }
    if (!yeniMesaj.trim() || !selectedTalep) return;
    if (selectedTalep.durum === "cozuldu") return;

    setSending(true);
    setUploading(!!ekDosya);

    let ekDosyaUrl: string | null = null;
    let ekDosyaAdi: string | null = null;

    if (ekDosya) {
      const filePath = `destek/admin/${Date.now()}_${ekDosya.name}`;
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
      setUploading(false);
    }

    const data = await adminCall("destek-mesaj-gonder", {
      destekId: selectedTalep.id,
      content: yeniMesaj.trim(),
      ek_dosya_url: ekDosyaUrl,
      ek_dosya_adi: ekDosyaAdi,
    });

    if (data.success) {
      setYeniMesaj("");
      setEkDosya(null);
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
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const mins = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d} gün`);
    if (h > 0) parts.push(`${h} sa.`);
    if (m > 0 || !parts.length) parts.push(`${m} dk.`);
    return parts.join(" ");
  };

  const renderDurumBadge = (durum: string) => {
    const ds = durumBadgeStyle[durum];
    if (!ds) return <Badge variant="outline" className="text-[10px]">{durum}</Badge>;
    return (
      <Badge variant="outline" className="text-[10px]" style={{ background: ds.bg, color: ds.text, borderColor: ds.border }}>
        {durumLabels[durum] || durum}
      </Badge>
    );
  };

  return (
    <>
    <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statsCards.map((stat) => (
            <div
              key={stat.title}
              className="cursor-pointer transition-shadow hover:shadow-md p-4 rounded-xl"
              style={{
                ...s.card,
                ...(statusFilter === stat.filterKey ? { boxShadow: "0 0 0 2px #f59e0b" } : {}),
              }}
              onClick={() => setStatusFilter(stat.filterKey)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={s.muted}>{stat.title}</span>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
              <span className="text-2xl font-bold" style={s.text}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Department Stats + Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" style={s.muted} />
            <span className="text-sm font-medium" style={s.text}>Departman:</span>
          </div>
          <Badge
            variant="outline"
            className="cursor-pointer text-xs"
            onClick={() => setDepartmanFilter("all")}
            style={departmanFilter === "all"
              ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.3)" }
              : { borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }
            }
          >
            Tümü ({toplam})
          </Badge>
          {departmanStats.map((dep) => (
            <Badge
              key={dep.name}
              variant="outline"
              className="cursor-pointer text-xs"
              onClick={() => setDepartmanFilter(dep.name)}
              style={departmanFilter === dep.name
                ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.3)" }
                : { borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }
              }
            >
              {dep.name} ({dep.count})
            </Badge>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center rounded-xl" style={s.card}>
            <Headphones className="w-12 h-12 mx-auto mb-4" style={s.muted} />
            <p style={s.muted}>Bu filtrede destek talebi bulunamadı.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={s.card}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "hsl(var(--admin-border))" }}>
                    {["Talep No", "Tarih", "Departman", "Konu", "Firma", "İlgili Kişi", "Durum", "İşlem"].map((h) => (
                      <th key={h} className={`text-left px-4 py-3 font-medium text-xs${h === "İşlem" ? " sticky-action-col" : ""}`} style={s.muted}>
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
                      <td className="px-4 py-3 font-mono text-xs" style={s.text}>{talep.talep_no}</td>
                      <td className="px-4 py-3 text-xs" style={s.muted}>
                        {new Date(talep.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>{talep.departman}</Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate" style={s.text}>{talep.konu}</td>
                      <td className="px-4 py-3 text-xs" style={s.muted}>{talep.firma_unvani || "—"}</td>
                      <td className="px-4 py-3 text-xs" style={s.muted}>
                        {talep.profile ? `${talep.profile.ad} ${talep.profile.soyad}` : "—"}
                      </td>
                      <td className="px-4 py-3">{renderDurumBadge(talep.durum)}</td>
                      <td className="px-4 py-3 sticky-action-col">
                        <Button size="sm" variant="outline" onClick={() => openDetail(talep)} style={s.input}>
                          <Eye className="w-3 h-3 mr-1" /> Görüntüle
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTalep} onOpenChange={(open) => !open && setSelectedTalep(null)}>
        <DialogContent
          className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
          style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={s.text}>
              Destek Kaydı — {selectedTalep?.talep_no}
              {selectedTalep && renderDurumBadge(selectedTalep.durum)}
            </DialogTitle>
          </DialogHeader>

          {selectedTalep && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
              {/* Left: Info */}
              <div className="overflow-y-auto rounded-lg" style={{ border: "1px solid hsl(var(--admin-border))" }}>
                <div className="px-4 py-3 font-semibold text-sm" style={{ borderBottom: "1px solid hsl(var(--admin-border))", ...s.text }}>Kayıt Bilgileri</div>
                <div className="text-sm">
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
                    <div key={row.label} className="flex px-4 py-2.5" style={{ borderBottom: "1px solid hsl(var(--admin-border))" }}>
                      <span className="w-36 shrink-0 font-medium" style={s.muted}>{row.label}</span>
                      <span style={s.text}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3" style={{ borderTop: "1px solid hsl(var(--admin-border))" }}>
                  <p className="text-xs font-medium mb-1" style={s.muted}>Açıklama</p>
                  <p className="text-sm whitespace-pre-wrap" style={s.text}>{selectedTalep.aciklama}</p>
                </div>

                {selectedTalep.ek_dosya_url && (
                  <div className="px-4 py-2" style={{ borderTop: "1px solid hsl(var(--admin-border))" }}>
                    <a href={selectedTalep.ek_dosya_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-500 hover:underline">
                      <Download className="w-3 h-3" /> {selectedTalep.ek_dosya_adi || "Ek dosya"}
                    </a>
                  </div>
                )}

                {selectedTalep.durum !== "cozuldu" && (
                  <div className="px-4 py-3" style={{ borderTop: "1px solid hsl(var(--admin-border))" }}>
                    <Button size="sm" variant="destructive" onClick={handleResolve} className="w-full">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Çözüldü Olarak İşaretle
                    </Button>
                  </div>
                )}
              </div>

              {/* Right: Messages */}
              <div className="flex flex-col rounded-lg overflow-hidden" style={{ border: "1px solid hsl(var(--admin-border))" }}>
                <div className="px-4 py-3 font-semibold text-sm" style={{ borderBottom: "1px solid hsl(var(--admin-border))", ...s.text }}>Mesajlar</div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: "350px" }}>
                  {mesajLoading ? (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : mesajlar.length === 0 ? (
                    <p className="text-sm text-center py-8" style={s.muted}>Henüz mesaj yok.</p>
                  ) : (
                    mesajlar.map((m) => {
                      const isAdmin = m.sender_type === "admin";
                      return (
                        <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                          <div
                            className="max-w-[80%] rounded-lg p-2.5"
                            style={isAdmin
                              ? { background: "#f59e0b", color: "#fff" }
                              : { background: "hsl(var(--admin-input-bg))", color: "hsl(var(--admin-text))" }
                            }
                          >
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
                  <div className="p-3" style={{ borderTop: "1px solid hsl(var(--admin-border))" }}>
                    <div className="flex items-center gap-2 p-2 rounded-md" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)" }}>
                      <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                      <p className="text-xs" style={{ color: "#eab308" }}>Destek talebi çözüldü. Mesaj gönderilemez.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 space-y-2" style={{ borderTop: "1px solid hsl(var(--admin-border))" }}>
                    {ekDosya && (
                      <div className="flex items-center gap-2 p-2 rounded-md text-sm" style={{ background: "hsl(var(--admin-input-bg))", border: "1px solid hsl(var(--admin-border))" }}>
                        <Paperclip className="w-3 h-3" style={s.muted} />
                        <span className="truncate flex-1 text-xs" style={s.text}>{ekDosya.name}</span>
                        <button onClick={() => setEkDosya(null)} className="hover:opacity-70" style={s.muted}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <label className="p-2 rounded-md cursor-pointer transition-colors shrink-0 hover:opacity-70" style={s.muted}>
                        <Upload className="w-4 h-4" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => setEkDosya(e.target.files?.[0] || null)}
                        />
                      </label>
                      <Textarea
                        placeholder="Yanıt yazın..."
                        value={yeniMesaj}
                        onChange={(e) => setYeniMesaj(e.target.value)}
                        rows={2}
                        className="resize-none flex-1"
                        style={s.input}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button size="icon" onClick={handleSendMessage} disabled={sending || !yeniMesaj.trim()} className="bg-amber-500 hover:bg-amber-600 text-white">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDestek;
