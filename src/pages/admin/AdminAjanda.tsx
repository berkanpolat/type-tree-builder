import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminTheme } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminApi } from "@/hooks/use-admin-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  { value: "blue", label: "Mavi", bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40", dot: "bg-blue-500" },
  { value: "green", label: "Yeşil", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40", dot: "bg-emerald-500" },
  { value: "red", label: "Kırmızı", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40", dot: "bg-red-500" },
  { value: "amber", label: "Turuncu", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40", dot: "bg-amber-500" },
  { value: "purple", label: "Mor", bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40", dot: "bg-purple-500" },
  { value: "pink", label: "Pembe", bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/40", dot: "bg-pink-500" },
];

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

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

export default function AdminAjanda() {
  const lightMode = useAdminTheme();
  const { user } = useAdminAuth();
  const callApi = useAdminApi();
  const [notes, setNotes] = useState<AjandaNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNote, setEditNote] = useState<AjandaNote | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [noteText, setNoteText] = useState("");
  const [noteColor, setNoteColor] = useState("blue");
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getMonthDays(year, month);
  const today = formatDate(new Date());

  const token = user ? localStorage.getItem("admin_token") || "" : "";

  const fetchNotes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0);
      const lastDayStr = formatDate(lastDay);
      const res = await callApi("list-ajanda", { token, baslangic: firstDay, bitis: lastDayStr });
      setNotes(res.notes || []);
    } catch {
      toast({ title: "Hata", description: "Notlar yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, year, month, callApi]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    setSelectedDate(formatDate(date));
    setEditNote(null);
    setNoteText("");
    setNoteColor("blue");
    setDialogOpen(true);
  };

  const handleEditNote = (note: AjandaNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditNote(note);
    setSelectedDate(note.tarih);
    setNoteText(note.icerik);
    setNoteColor(note.renk);
    setDialogOpen(true);
  };

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await callApi("delete-ajanda", { token, noteId });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast({ title: "Silindi" });
    } catch {
      toast({ title: "Hata", description: "Silinemedi", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      if (editNote) {
        const res = await callApi("update-ajanda", { token, noteId: editNote.id, updates: { icerik: noteText.trim(), renk: noteColor } });
        setNotes((prev) => prev.map((n) => (n.id === editNote.id ? res.note : n)));
        toast({ title: "Güncellendi" });
      } else {
        const res = await callApi("create-ajanda", { token, tarih: selectedDate, icerik: noteText.trim(), renk: noteColor });
        setNotes((prev) => [...prev, res.note]);
        toast({ title: "Not eklendi" });
      }
      setDialogOpen(false);
    } catch {
      toast({ title: "Hata", description: "Kaydedilemedi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const getColor = (c: string) => COLORS.find((cl) => cl.value === c) || COLORS[0];

  const dayNotes = (dateStr: string) => notes.filter((n) => n.tarih === dateStr);

  return (
    <AdminLayout title="Ajanda">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevMonth} style={{ color: `hsl(var(--admin-text))` }}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-bold min-w-[180px] text-center" style={{ color: `hsl(var(--admin-text))` }}>
              {MONTHS[month]} {year}
            </h2>
            <Button variant="ghost" size="icon" onClick={nextMonth} style={{ color: `hsl(var(--admin-text))` }}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToday} className="text-xs" style={{ color: `hsl(var(--admin-text))`, borderColor: `hsl(var(--admin-border))` }}>
            Bugün
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-xl border overflow-hidden" style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold py-2 border-b" style={{ color: `hsl(var(--admin-muted))`, borderColor: `hsl(var(--admin-border))` }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dateStr = day ? formatDate(day) : "";
              const isToday = dateStr === today;
              const dNotes = day ? dayNotes(dateStr) : [];
              return (
                <div
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "min-h-[100px] md:min-h-[120px] p-1.5 border-b border-r cursor-pointer transition-colors relative group",
                    !day && "cursor-default"
                  )}
                  style={{
                    borderColor: `hsl(var(--admin-border))`,
                    background: day ? undefined : `hsl(var(--admin-bg))`,
                  }}
                  onMouseEnter={(e) => { if (day) e.currentTarget.style.background = `hsl(var(--admin-hover))`; }}
                  onMouseLeave={(e) => { if (day) e.currentTarget.style.background = ""; }}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                            isToday && "bg-amber-500 text-white font-bold"
                          )}
                          style={!isToday ? { color: `hsl(var(--admin-text))` } : undefined}
                        >
                          {day.getDate()}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded flex items-center justify-center"
                          style={{ color: `hsl(var(--admin-muted))` }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dNotes.slice(0, 3).map((note) => {
                          const color = getColor(note.renk);
                          return (
                            <div
                              key={note.id}
                              className={cn("text-[10px] leading-tight px-1.5 py-0.5 rounded border flex items-center gap-1 group/note", color.bg, color.border, color.text)}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", color.dot)} />
                              <span className="truncate flex-1">{note.icerik}</span>
                              <button onClick={(e) => handleEditNote(note, e)} className="opacity-0 group-hover/note:opacity-100 shrink-0">
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button onClick={(e) => handleDeleteNote(note.id, e)} className="opacity-0 group-hover/note:opacity-100 shrink-0">
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        })}
                        {dNotes.length > 3 && (
                          <span className="text-[9px] px-1.5" style={{ color: `hsl(var(--admin-muted))` }}>+{dNotes.length - 3} daha</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}>
          <DialogHeader>
            <DialogTitle style={{ color: `hsl(var(--admin-text))` }}>
              {editNote ? "Notu Düzenle" : "Yeni Not"} — {selectedDate && new Date(selectedDate + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Notunuzu yazın..."
              rows={3}
              className="resize-none"
              style={{ background: `hsl(var(--admin-bg))`, color: `hsl(var(--admin-text))`, borderColor: `hsl(var(--admin-border))` }}
            />
            <div>
              <p className="text-xs mb-2" style={{ color: `hsl(var(--admin-muted))` }}>Renk</p>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNoteColor(c.value)}
                    className={cn("w-7 h-7 rounded-full border-2 transition-all", c.dot, noteColor === c.value ? "ring-2 ring-offset-2 ring-amber-500 scale-110" : "opacity-60 hover:opacity-100")}
                    style={{ borderColor: noteColor === c.value ? "hsl(var(--admin-text))" : "transparent" }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} style={{ color: `hsl(var(--admin-muted))` }}>İptal</Button>
            <Button onClick={handleSave} disabled={saving || !noteText.trim()} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? "Kaydediliyor..." : editNote ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
