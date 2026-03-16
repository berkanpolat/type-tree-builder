import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminTheme } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminApi } from "@/hooks/use-admin-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  { value: "blue", bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500", light_bg: "bg-blue-50", light_text: "text-blue-700", light_border: "border-blue-200", light_dot: "bg-blue-500" },
  { value: "green", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500", light_bg: "bg-emerald-50", light_text: "text-emerald-700", light_border: "border-emerald-200", light_dot: "bg-emerald-500" },
  { value: "red", bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-500", light_bg: "bg-red-50", light_text: "text-red-700", light_border: "border-red-200", light_dot: "bg-red-500" },
  { value: "amber", bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500", light_bg: "bg-amber-50", light_text: "text-amber-700", light_border: "border-amber-200", light_dot: "bg-amber-500" },
  { value: "purple", bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-500", light_bg: "bg-purple-50", light_text: "text-purple-700", light_border: "border-purple-200", light_dot: "bg-purple-500" },
  { value: "pink", bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/30", dot: "bg-pink-500", light_bg: "bg-pink-50", light_text: "text-pink-700", light_border: "border-pink-200", light_dot: "bg-pink-500" },
];

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAY_FULL = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

interface AjandaNote {
  id: string;
  admin_id: string;
  tarih: string;
  icerik: string;
  renk: string;
  created_at: string;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function AdminAjanda() {
  const lightMode = useAdminTheme();
  const { user } = useAdminAuth();
  const callApi = useAdminApi();
  const [allNotes, setAllNotes] = useState<AjandaNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNote, setEditNote] = useState<AjandaNote | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteColor, setNoteColor] = useState("blue");
  const [saving, setSaving] = useState(false);

  const token = user ? localStorage.getItem("admin_token") || "" : "";

  // Fetch notes for the selected month range (wide range to cover navigation)
  const fetchNotes = useCallback(async (centerDate: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const d = parseDate(centerDate);
      const from = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 2, 0);
      const res = await callApi("list-ajanda", { token, baslangic: formatDate(from), bitis: formatDate(to) });
      setAllNotes(res.notes || []);
    } catch {
      toast({ title: "Hata", description: "Notlar yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, callApi]);

  useEffect(() => { fetchNotes(selectedDate); }, [selectedDate, fetchNotes]);

  const dayNotes = allNotes.filter((n) => n.tarih === selectedDate);
  const selDateObj = parseDate(selectedDate);

  const goDay = (offset: number) => {
    const d = parseDate(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(formatDate(d));
  };

  const goToday = () => {
    const today = formatDate(new Date());
    setSelectedDate(today);
    setCalendarMonth(new Date());
  };

  const handleCalendarDayClick = (day: Date) => {
    setSelectedDate(formatDate(day));
    setCalendarOpen(false);
  };

  const openAddDialog = () => {
    setEditNote(null);
    setNoteText("");
    setNoteColor("blue");
    setDialogOpen(true);
  };

  const openEditDialog = (note: AjandaNote) => {
    setEditNote(note);
    setNoteText(note.icerik);
    setNoteColor(note.renk);
    setDialogOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    try {
      await callApi("delete-ajanda", { token, noteId });
      setAllNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast({ title: "Not silindi" });
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      if (editNote) {
        const res = await callApi("update-ajanda", { token, noteId: editNote.id, updates: { icerik: noteText.trim(), renk: noteColor } });
        setAllNotes((prev) => prev.map((n) => (n.id === editNote.id ? res.note : n)));
        toast({ title: "Güncellendi" });
      } else {
        const res = await callApi("create-ajanda", { token, tarih: selectedDate, icerik: noteText.trim(), renk: noteColor });
        setAllNotes((prev) => [...prev, res.note]);
        toast({ title: "Not eklendi" });
      }
      setDialogOpen(false);
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getColor = (c: string) => COLORS.find((cl) => cl.value === c) || COLORS[0];
  const isToday = selectedDate === formatDate(new Date());

  // Mini calendar
  const calYear = calendarMonth.getFullYear();
  const calMonth = calendarMonth.getMonth();
  const calDays = getMonthDays(calYear, calMonth);
  const todayStr = formatDate(new Date());

  // Count notes per day for dots
  const noteCounts: Record<string, string[]> = {};
  allNotes.forEach((n) => {
    if (!noteCounts[n.tarih]) noteCounts[n.tarih] = [];
    if (!noteCounts[n.tarih].includes(n.renk)) noteCounts[n.tarih].push(n.renk);
  });

  return (
    <AdminLayout title="Ajanda">
      <div className="max-w-3xl mx-auto">
        {/* Day Navigation */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => goDay(-1)} style={{ color: `hsl(var(--admin-text))` }}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center min-w-[200px]">
              <h2 className="text-lg font-bold" style={{ color: `hsl(var(--admin-text))` }}>
                {selDateObj.getDate()} {MONTHS[selDateObj.getMonth()]} {selDateObj.getFullYear()}
              </h2>
              <p className="text-xs" style={{ color: `hsl(var(--admin-muted))` }}>
                {WEEKDAY_FULL[selDateObj.getDay()]}
                {isToday && <span className="ml-1.5 text-amber-500 font-semibold">• Bugün</span>}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => goDay(1)} style={{ color: `hsl(var(--admin-text))` }}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {!isToday && (
              <Button variant="outline" size="sm" onClick={goToday} className="text-xs" style={{ color: `hsl(var(--admin-text))`, borderColor: `hsl(var(--admin-border))` }}>
                Bugün
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCalendarMonth(selDateObj); setCalendarOpen(!calendarOpen); }}
              className="text-xs gap-1.5"
              style={{ color: `hsl(var(--admin-text))`, borderColor: `hsl(var(--admin-border))` }}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Takvim
            </Button>
          </div>
        </div>

        {/* Mini Calendar (collapsible) */}
        {calendarOpen && (
          <div className="mb-5 rounded-xl border p-4" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(new Date(calYear, calMonth - 1, 1))} style={{ color: `hsl(var(--admin-text))` }}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold" style={{ color: `hsl(var(--admin-text))` }}>
                {MONTHS[calMonth]} {calYear}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(new Date(calYear, calMonth + 1, 1))} style={{ color: `hsl(var(--admin-text))` }}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: `hsl(var(--admin-muted))` }}>{d}</div>
              ))}
              {calDays.map((day, i) => {
                if (!day) return <div key={i} />;
                const ds = formatDate(day);
                const isSelected = ds === selectedDate;
                const isTodayCal = ds === todayStr;
                const dots = noteCounts[ds] || [];
                return (
                  <button
                    key={i}
                    onClick={() => handleCalendarDayClick(day)}
                    className={cn(
                      "relative flex flex-col items-center py-1.5 rounded-lg text-xs transition-all",
                      isSelected && "bg-amber-500 text-white font-bold",
                      !isSelected && isTodayCal && "font-bold"
                    )}
                    style={!isSelected ? { color: isTodayCal ? "hsl(var(--admin-text))" : `hsl(var(--admin-muted))` } : undefined}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = `hsl(var(--admin-hover))`; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = ""; }}
                  >
                    {day.getDate()}
                    {dots.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dots.slice(0, 3).map((c, ci) => {
                          const color = getColor(c);
                          return <span key={ci} className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/70" : color.dot)} />;
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Day Notes List */}
        <div className="rounded-xl border" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: `hsl(var(--admin-border))` }}>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold" style={{ color: `hsl(var(--admin-text))` }}>Notlar</h3>
              {dayNotes.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-semibold">{dayNotes.length}</span>
              )}
            </div>
            <Button size="sm" onClick={openAddDialog} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs h-8">
              <Plus className="w-3.5 h-3.5" />
              Not Ekle
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : dayNotes.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: `hsl(var(--admin-muted))` }} />
              <p className="text-sm" style={{ color: `hsl(var(--admin-muted))` }}>Bu gün için henüz not yok</p>
              <Button variant="ghost" size="sm" onClick={openAddDialog} className="mt-2 text-amber-500 hover:text-amber-400 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> İlk notu ekle
              </Button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: `hsl(var(--admin-border))` }}>
              {dayNotes.map((note) => {
                const color = getColor(note.renk);
                const cBg = lightMode ? color.light_bg : color.bg;
                const cText = lightMode ? color.light_text : color.text;
                const cBorder = lightMode ? color.light_border : color.border;
                const cDot = lightMode ? color.light_dot : color.dot;
                return (
                  <div
                    key={note.id}
                    className="group flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{ borderColor: `hsl(var(--admin-border))` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `hsl(var(--admin-hover))`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                  >
                    <span className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0", cDot)} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-2 border", cBg, cText, cBorder)}>
                        {note.icerik}
                      </p>
                      <span className="text-[10px] mt-1 block" style={{ color: `hsl(var(--admin-muted))` }}>
                        {new Date(note.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                      <button onClick={() => openEditDialog(note)} className="p-1 rounded hover:bg-amber-500/10" style={{ color: `hsl(var(--admin-muted))` }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(note.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" style={{ background: "hsl(var(--admin-card-bg))", borderColor: "hsl(var(--admin-border))" }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold" style={{ color: "hsl(var(--admin-text))" }}>
              {editNote ? "Notu Düzenle" : "Yeni Not"}
            </DialogTitle>
            <p className="text-xs" style={{ color: "hsl(var(--admin-muted))" }}>
              {selDateObj.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {/* Not İçeriği */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "hsl(var(--admin-muted))" }}>Not</label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Notunuzu yazın..."
                rows={3}
                className="text-sm min-h-[60px] resize-none"
                style={{ background: "hsl(var(--admin-input-bg))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}
                autoFocus
              />
            </div>

            {/* Renk Seçimi */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "hsl(var(--admin-muted))" }}>Renk</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNoteColor(c.value)}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all",
                      c.dot,
                      noteColor === c.value ? "ring-2 ring-offset-1 ring-amber-500 scale-110" : "opacity-50 hover:opacity-100"
                    )}
                    style={{ borderColor: noteColor === c.value ? "hsl(var(--admin-text))" : "transparent" }}
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSave}
              disabled={saving || !noteText.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white h-9 text-sm"
            >
              {saving ? "Kaydediliyor..." : editNote ? "Güncelle" : "Not Ekle"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
