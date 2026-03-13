import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminTheme } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Bot, Send, Loader2, Pencil, X, GripVertical } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Bilgi = {
  id: string;
  soru: string;
  cevap: string;
  kategori: string;
  aktif: boolean;
  sira: number;
};

type Config = {
  id: string;
  anahtar: string;
  deger: string;
  aciklama: string | null;
};

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`;

export default function AdminTekBot() {
  return (
    <AdminLayout title="TekBot Yönetimi">
      <Inner />
    </AdminLayout>
  );
}

function Inner() {
  const lightMode = useAdminTheme();
  const [bilgiler, setBilgiler] = useState<Bilgi[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Test chat state
  const [testMessages, setTestMessages] = useState<Msg[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Edit modal
  const [editItem, setEditItem] = useState<Bilgi | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSoru, setNewSoru] = useState("");
  const [newCevap, setNewCevap] = useState("");
  const [newKategori, setNewKategori] = useState("Genel");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [b, c] = await Promise.all([
      supabase.from("chatbot_bilgi").select("*").order("sira", { ascending: true }),
      supabase.from("chatbot_config").select("*"),
    ]);
    if (b.data) setBilgiler(b.data as Bilgi[]);
    if (c.data) setConfigs(c.data as Config[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [testMessages]);

  const adminAction = async (action: string, payload: Record<string, unknown>) => {
    const token = localStorage.getItem("admin_token");
    const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, {
      body: { token, ...payload },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  // Save config
  const saveConfig = async (anahtar: string, deger: string) => {
    setSaving(true);
    try {
      await adminAction("update-chatbot-config", { anahtar, deger });
      toast({ title: "Kaydedildi", description: "Ayar başarıyla güncellendi." });
      fetchData();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  // Add bilgi
  const addBilgi = async () => {
    if (!newSoru.trim() || !newCevap.trim()) return;
    setSaving(true);
    try {
      await adminAction("add-chatbot-bilgi", { soru: newSoru, cevap: newCevap, kategori: newKategori });
      setNewSoru(""); setNewCevap(""); setNewKategori("Genel"); setShowAdd(false);
      toast({ title: "Eklendi", description: "Soru-cevap başarıyla eklendi." });
      fetchData();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  // Update bilgi
  const updateBilgi = async (item: Bilgi) => {
    setSaving(true);
    try {
      await adminAction("update-chatbot-bilgi", { id: item.id, soru: item.soru, cevap: item.cevap, kategori: item.kategori, aktif: item.aktif });
      toast({ title: "Güncellendi" });
      setEditItem(null);
      fetchData();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  // Delete bilgi
  const deleteBilgi = async (id: string) => {
    try {
      await adminAction("delete-chatbot-bilgi", { id });
      toast({ title: "Silindi" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    }
  };

  // Toggle active
  const toggleAktif = async (item: Bilgi) => {
    await adminAction("update_chatbot_bilgi", { id: item.id, soru: item.soru, cevap: item.cevap, kategori: item.kategori, aktif: !item.aktif });
    fetchData();
  };

  // Test chat
  const sendTest = async () => {
    const text = testInput.trim();
    if (!text || testLoading) return;
    setTestInput("");
    const userMsg: Msg = { role: "user", content: text };
    setTestMessages(prev => [...prev, userMsg]);
    setTestLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...testMessages, userMsg] }),
      });

      if (!resp.ok || !resp.body) {
        setTestMessages(prev => [...prev, { role: "assistant", content: "⚠️ Hata oluştu." }]);
        setTestLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantSoFar = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistantSoFar += c;
              setTestMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { break; }
        }
      }
    } catch {
      setTestMessages(prev => [...prev, { role: "assistant", content: "⚠️ Bağlantı hatası." }]);
    }
    setTestLoading(false);
  };

  const cardStyle = {
    background: lightMode ? "hsl(0 0% 100%)" : "hsl(217 33% 17%)",
    borderColor: `hsl(var(--admin-border))`,
  };
  const textColor = { color: `hsl(var(--admin-text))` };
  const mutedColor = { color: `hsl(var(--admin-muted))` };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;
  }

  const sistemTalimatlari = configs.find(c => c.anahtar === "sistem_talimatlari");
  const yasakKonular = configs.find(c => c.anahtar === "yasak_konular");

  const kategoriler = [...new Set(bilgiler.map(b => b.kategori))];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="bilgi" className="w-full">
        <TabsList className="grid w-full grid-cols-3" style={{ background: lightMode ? "hsl(0 0% 96%)" : "hsl(217 33% 14%)" }}>
          <TabsTrigger value="bilgi">Soru-Cevap Bankası</TabsTrigger>
          <TabsTrigger value="ayarlar">Sistem Ayarları</TabsTrigger>
          <TabsTrigger value="test">Test Alanı</TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="bilgi" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={mutedColor}>
              {bilgiler.length} soru-cevap kayıtlı • {bilgiler.filter(b => b.aktif).length} aktif
            </p>
            <Button onClick={() => setShowAdd(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Yeni Ekle
            </Button>
          </div>

          {/* Add Form */}
          {showAdd && (
            <div className="rounded-xl border p-4 space-y-3" style={cardStyle}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={textColor}>Yeni Soru-Cevap</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Input
                placeholder="Kategori (örn: Genel, Paketler, İhale)"
                value={newKategori}
                onChange={e => setNewKategori(e.target.value)}
                style={{ ...textColor, background: "transparent" }}
              />
              <Input
                placeholder="Soru"
                value={newSoru}
                onChange={e => setNewSoru(e.target.value)}
                style={{ ...textColor, background: "transparent" }}
              />
              <Textarea
                placeholder="Cevap (Markdown destekli)"
                value={newCevap}
                onChange={e => setNewCevap(e.target.value)}
                rows={4}
                style={{ ...textColor, background: "transparent" }}
              />
              <Button onClick={addBilgi} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
                <Save className="w-4 h-4 mr-1" /> Kaydet
              </Button>
            </div>
          )}

          {/* List by category */}
          {kategoriler.length === 0 && (
            <div className="text-center py-12 rounded-xl border" style={cardStyle}>
              <Bot className="w-12 h-12 mx-auto mb-3 text-amber-500/50" />
              <p className="text-sm" style={mutedColor}>Henüz soru-cevap eklenmemiş.</p>
              <p className="text-xs mt-1" style={mutedColor}>Yukarıdaki "Yeni Ekle" butonuyla başlayın.</p>
            </div>
          )}

          {kategoriler.map(kat => (
            <div key={kat} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider px-1" style={mutedColor}>{kat}</h3>
              {bilgiler.filter(b => b.kategori === kat).map(item => (
                <div key={item.id} className="rounded-lg border p-3 flex items-start gap-3" style={{ ...cardStyle, opacity: item.aktif ? 1 : 0.5 }}>
                  <div className="flex-1 min-w-0">
                    {editItem?.id === item.id ? (
                      <div className="space-y-2">
                        <Input value={editItem.kategori} onChange={e => setEditItem({ ...editItem, kategori: e.target.value })} placeholder="Kategori" style={{ ...textColor, background: "transparent" }} />
                        <Input value={editItem.soru} onChange={e => setEditItem({ ...editItem, soru: e.target.value })} placeholder="Soru" style={{ ...textColor, background: "transparent" }} />
                        <Textarea value={editItem.cevap} onChange={e => setEditItem({ ...editItem, cevap: e.target.value })} rows={3} placeholder="Cevap" style={{ ...textColor, background: "transparent" }} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateBilgi(editItem)} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
                            <Save className="w-3 h-3 mr-1" /> Kaydet
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditItem(null)}>İptal</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium" style={textColor}>{item.soru}</p>
                        <p className="text-xs mt-1 line-clamp-2" style={mutedColor}>{item.cevap}</p>
                      </>
                    )}
                  </div>
                  {editItem?.id !== item.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={item.aktif}
                        onCheckedChange={() => toggleAktif(item)}
                        className="data-[state=checked]:bg-amber-500"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem({ ...item })}>
                        <Pencil className="w-3.5 h-3.5" style={mutedColor} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => deleteBilgi(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="ayarlar" className="space-y-4 mt-4">
          {/* Sistem Talimatları */}
          <div className="rounded-xl border p-4 space-y-3" style={cardStyle}>
            <div>
              <h3 className="text-sm font-semibold" style={textColor}>Ek Sistem Talimatları</h3>
              <p className="text-xs mt-0.5" style={mutedColor}>
                Ana prompt'a ek olarak verilecek talimatlar. Botun davranışını özelleştirmek için kullanın.
              </p>
            </div>
            <Textarea
              value={sistemTalimatlari?.deger || ""}
              onChange={e => {
                setConfigs(prev => prev.map(c => c.anahtar === "sistem_talimatlari" ? { ...c, deger: e.target.value } : c));
              }}
              rows={8}
              placeholder="Örn: Her cevabın sonunda emoji kullan. Fiyat sorulan sorularda mutlaka KDV hariç olduğunu belirt..."
              style={{ ...textColor, background: "transparent" }}
            />
            <Button
              onClick={() => saveConfig("sistem_talimatlari", sistemTalimatlari?.deger || "")}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Save className="w-4 h-4 mr-1" /> Kaydet
            </Button>
          </div>

          {/* Yasak Konular */}
          <div className="rounded-xl border p-4 space-y-3" style={cardStyle}>
            <div>
              <h3 className="text-sm font-semibold" style={textColor}>Yasak Konular</h3>
              <p className="text-xs mt-0.5" style={mutedColor}>
                Botun cevap vermemesi gereken konular. Virgülle ayırarak yazın.
              </p>
            </div>
            <Textarea
              value={yasakKonular?.deger || ""}
              onChange={e => {
                setConfigs(prev => prev.map(c => c.anahtar === "yasak_konular" ? { ...c, deger: e.target.value } : c));
              }}
              rows={4}
              placeholder="Hava durumu, Matematik, Kodlama, Sağlık..."
              style={{ ...textColor, background: "transparent" }}
            />
            <Button
              onClick={() => saveConfig("yasak_konular", yasakKonular?.deger || "")}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Save className="w-4 h-4 mr-1" /> Kaydet
            </Button>
          </div>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="mt-4">
          <div className="rounded-xl border overflow-hidden" style={{ ...cardStyle, height: "500px", display: "flex", flexDirection: "column" }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `hsl(var(--admin-border))`, background: lightMode ? "hsl(0 0% 97%)" : "hsl(217 33% 14%)" }}>
              <Bot className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-semibold" style={textColor}>TekBot Test Alanı</span>
              <span className="text-xs ml-auto" style={mutedColor}>Canlı verilerle test edin</span>
              {testMessages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setTestMessages([])} className="text-xs" style={mutedColor}>
                  Temizle
                </Button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {testMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full">
                  <Bot className="w-10 h-10 text-amber-500/30 mb-2" />
                  <p className="text-sm" style={mutedColor}>Bir soru yazarak botu test edin.</p>
                </div>
              )}
              {testMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-amber-500 text-white rounded-br-md"
                      : "rounded-bl-md"
                  }`} style={msg.role === "assistant" ? { background: lightMode ? "hsl(0 0% 95%)" : "hsl(217 33% 22%)", ...textColor } : undefined}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_a]:text-amber-500 [&_a]:underline [&_strong]:font-semibold">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {testLoading && testMessages[testMessages.length - 1]?.role === "user" && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md px-4 py-3" style={{ background: lightMode ? "hsl(0 0% 95%)" : "hsl(217 33% 22%)" }}>
                    <Loader2 className="w-4 h-4 animate-spin" style={mutedColor} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t p-3" style={{ borderColor: `hsl(var(--admin-border))` }}>
              <div className="flex items-end gap-2">
                <textarea
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTest(); } }}
                  placeholder="Test sorusu yazın..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm max-h-20 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  style={{ ...textColor, background: "transparent", borderColor: `hsl(var(--admin-border))` }}
                />
                <Button
                  onClick={sendTest}
                  disabled={!testInput.trim() || testLoading}
                  className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
