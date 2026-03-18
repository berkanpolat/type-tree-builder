import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { X, Send, Loader2, Sparkles, RotateCcw, Minus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
const ReactMarkdown = lazy(() => import("react-markdown"));
import tekbotAvatar from "@/assets/tekbot-avatar.png";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || "Bir hata oluştu.");
    return;
  }

  if (!resp.body) { onError("Stream başlatılamadı."); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

const QUICK_QUESTIONS = [
  { label: "Tekstil A.Ş. nedir?", icon: "🏢" },
  { label: "Nasıl üye olabilirim?", icon: "👤" },
  { label: "İhale nasıl açılır?", icon: "📋" },
  { label: "Paket fiyatları", icon: "💎" },
];

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Drag state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; dragging: boolean }>({
    startX: 0, startY: 0, startPosX: 0, startPosY: 0, dragging: false,
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, minimized]);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = open ? panelRef.current : triggerRef.current;
    if (!el) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);

    const rect = el.getBoundingClientRect();
    const currentX = rect.left;
    const currentY = rect.top;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: currentX,
      startPosY: currentY,
      dragging: false,
    };
  }, [open]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d.startX === 0 && d.startY === 0) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.dragging && Math.abs(dx) + Math.abs(dy) < 5) return;
    d.dragging = true;

    const el = open ? panelRef.current : triggerRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    const newX = clamp(d.startPosX + dx, 0, window.innerWidth - w);
    const newY = clamp(d.startPosY + dy, 0, window.innerHeight - h);
    setPosition({ x: newX, y: newY });
  }, [open]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const wasDragging = dragRef.current.dragging;
    dragRef.current = { startX: 0, startY: 0, startPosX: 0, startPosY: 0, dragging: false };
    const el = open ? panelRef.current : triggerRef.current;
    if (el) el.releasePointerCapture(e.pointerId);
    // If it was a drag, don't trigger click
    if (wasDragging) {
      e.stopPropagation();
    }
  }, [open]);

  // Reset position when toggling open/close
  const handleOpen = () => {
    setPosition(null);
    setOpen(true);
    setMinimized(false);
  };

  const handleClose = () => {
    setPosition(null);
    setOpen(false);
    setMinimized(false);
  };

  const sendMessage = useCallback(async (text: string, prevMessages: Msg[] = messages) => {
    if (!text.trim() || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...prevMessages, userMsg];
    setMessages(allMessages);
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: allMessages,
        onDelta: upsert,
        onDone: () => setLoading(false),
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `⚠️ ${err}` },
          ]);
          setLoading(false);
        },
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Bağlantı hatası oluştu. Lütfen tekrar deneyin." },
      ]);
      setLoading(false);
    }
  }, [loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const triggerStyle: React.CSSProperties = position
    ? { position: "fixed", left: position.x, top: position.y, right: "auto", bottom: "auto", zIndex: 9999, touchAction: "none" }
    : {};

  // Panel always uses default CSS positioning (no drag)
  const panelStyle: React.CSSProperties = {};

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          ref={triggerRef}
          onClick={() => { if (!dragRef.current.dragging) handleOpen(); }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={cn(
            "group",
            !position && "fixed bottom-20 right-5 z-[9999] md:bottom-5"
          )}
          style={triggerStyle}
          aria-label="TekBot Asistan"
        >
          <div className="relative w-[60px] h-[60px] rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-all duration-300 hover:scale-105 overflow-hidden border-2 border-secondary/30 bg-background">
            <img src={tekbotAvatar} alt="TekBot" className="w-full h-full object-contain p-0.5" />
          </div>
          {/* Badge */}
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-secondary rounded-full border-2 border-background flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-secondary-foreground" />
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            "flex flex-col rounded-2xl bg-background shadow-[0_8px_60px_-12px_rgba(0,0,0,0.25)] overflow-hidden border border-border/60",
            "fixed bottom-20 right-5 z-[9999] md:bottom-5",
            minimized ? "w-[280px]" : "w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-6rem)]",
            "animate-in slide-in-from-bottom-5 fade-in duration-300"
          )}
        >
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden select-none">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.15),transparent_60%)]" />
            <div className="relative flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
                <img src={tekbotAvatar} alt="TekBot" className="w-7 h-7 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-primary-foreground">TekBot</p>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                </div>
                {!minimized && (
                  <p className="text-[11px] text-primary-foreground/70">Tekstil A.Ş. Yapay Zeka Asistanı</p>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                {messages.length > 0 && !minimized && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMessages([]); setInput(""); }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-primary-foreground/70 hover:text-primary-foreground"
                    title="Sohbeti sıfırla"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-primary-foreground/70 hover:text-primary-foreground"
                  title={minimized ? "Genişlet" : "Küçült"}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleClose(); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-primary-foreground/70 hover:text-primary-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Body — hidden when minimized */}
          {!minimized && (
            <>
              {/* Messages area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gradient-to-b from-muted/30 to-background">
                
                {/* Welcome state */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-2">
                    <div className="w-20 h-20 mb-4 drop-shadow-lg">
                      <img src={tekbotAvatar} alt="TekBot" className="w-full h-full object-contain" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      Merhaba! 👋
                    </h3>
                    <p className="text-xs text-muted-foreground mb-5 max-w-[260px] leading-relaxed">
                      Ben TekBot, Tekstil A.Ş. yapay zeka asistanıyım. Platformla ilgili her konuda size yardımcı olabilirim.
                    </p>
                    <div className="w-full grid grid-cols-2 gap-2">
                      {QUICK_QUESTIONS.map((q) => (
                        <button
                          key={q.label}
                          onClick={() => sendMessage(q.label, [])}
                          className="flex items-center gap-2 text-left text-[12px] leading-tight px-3 py-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted hover:border-primary/20 transition-all duration-200 text-foreground group"
                        >
                          <span className="text-sm shrink-0">{q.icon}</span>
                          <span className="group-hover:text-primary transition-colors">{q.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat messages */}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2.5 animate-in fade-in duration-200",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 mt-0.5 shadow-sm border border-border/50">
                        <img src={tekbotAvatar} alt="TekBot" className="w-6 h-6 object-contain" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[78%] text-[13px] leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-sm"
                          : "bg-background text-foreground rounded-2xl rounded-bl-sm px-3.5 py-2.5 border border-border/60 shadow-sm"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none [&_p]:m-0 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_a]:text-secondary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_code]:text-[12px] [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded">
                          <Suspense fallback={<span>{msg.content}</span>}><ReactMarkdown>{msg.content}</ReactMarkdown></Suspense>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-2.5 justify-start animate-in fade-in duration-200">
                    <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-border/50">
                      <img src={tekbotAvatar} alt="TekBot" className="w-6 h-6 object-contain" />
                    </div>
                    <div className="bg-background border border-border/60 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="shrink-0 border-t border-border/60 bg-background p-3">
                <div className="flex items-end gap-2 bg-muted/50 rounded-xl p-1.5 border border-border/40 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10 transition-all">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Sorunuzu yazın..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none max-h-20 text-foreground"
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-30 hover:bg-primary/90 transition-all duration-200 disabled:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/50 mt-2 text-center tracking-wide">
                  Yapay zeka destekli · Yanıtlar bilgilendirme amaçlıdır
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
