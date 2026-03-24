import { useAdminTitle } from "@/components/admin/AdminLayout";
import { useState, useEffect, useCallback, CSSProperties } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAdminApi } from "@/hooks/use-admin-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, CalendarIcon, Building2, Loader2, MoreHorizontal, Trash2, CheckCircle, Clock,
  Search, ChevronLeft, ChevronRight, ClipboardList, CheckCheck, ChevronDown, GripVertical, Users, Navigation,
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isToday, isPast, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import AksiyonEkleDialog from "@/components/admin/AksiyonEkleDialog";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const s = {
  card: { background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))", borderRadius: "0.75rem" } as CSSProperties,
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
  input: { background: "hsl(var(--admin-input-bg))", borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" } as CSSProperties,
};

interface ZiyaretPlan {
  id: string;
  admin_id: string;
  firma_id: string;
  planlanan_tarih: string;
  notlar: string | null;
  durum: string;
  created_at: string;
  firma_unvani: string;
  firma_logo: string | null;
  iptal_sebebi?: string | null;
  sira: number;
}

const DURUM_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planli: { label: "Planlı", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  tamamlandi: { label: "Tamamlandı", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  iptal: { label: "İptal", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

// Sortable plan item component
function SortablePlanItem({ plan, onAksiyonEkle, onDurumChange, onIptal, onEditNote, onDelete }: {
  plan: ZiyaretPlan;
  onAksiyonEkle: (plan: ZiyaretPlan) => void;
  onDurumChange: (id: string, durum: string) => void;
  onIptal: (plan: ZiyaretPlan) => void;
  onEditNote: (plan: ZiyaretPlan) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plan.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const durumC = DURUM_CONFIG[plan.durum] || DURUM_CONFIG.planli;

  return (
    <div ref={setNodeRef} style={{ ...style, background: "hsl(var(--admin-hover))", border: "1px solid hsl(var(--admin-border))" }} className="rounded-lg p-3 group flex items-center gap-3" {...attributes}>
      <div {...listeners} className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-1 -ml-1 rounded hover:bg-white/5">
        <GripVertical className="w-4 h-4" style={{ color: "hsl(var(--admin-muted))" }} />
      </div>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: "hsl(var(--admin-card-bg))" }}>
        {plan.firma_logo ? <img src={plan.firma_logo} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-4 h-4" style={{ color: "hsl(var(--admin-muted))" }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "hsl(var(--admin-text))" }}>{plan.firma_unvani}</p>
        {plan.notlar && <p className="text-xs mt-0.5" style={{ color: "hsl(var(--admin-muted))" }}>{plan.notlar}</p>}
        {plan.durum === "iptal" && plan.iptal_sebebi && (
          <p className="text-[10px] mt-0.5 italic" style={{ color: "#ef4444" }}>İptal: {plan.iptal_sebebi}</p>
        )}
      </div>
      <Badge className="text-[9px] px-2 py-0.5 flex-shrink-0" style={{ background: durumC.bg, color: durumC.color, borderColor: `${durumC.color}40` }}>{durumC.label}</Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <MoreHorizontal className="w-4 h-4" style={{ color: "hsl(var(--admin-muted))" }} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" style={{ background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))", borderRadius: "0.75rem" }} className="min-w-[160px]">
          <DropdownMenuItem onClick={() => onAksiyonEkle(plan)} className="text-xs cursor-pointer">
            <ClipboardList className="w-3.5 h-3.5 mr-2 text-amber-500" /> Aksiyon Ekle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            const q = encodeURIComponent(plan.firma_unvani);
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, "_blank");
          }} className="text-xs cursor-pointer">
            <Navigation className="w-3.5 h-3.5 mr-2 text-blue-500" /> Yol Tarifi
          </DropdownMenuItem>
          {plan.durum === "planli" && (
            <DropdownMenuItem onClick={() => onDurumChange(plan.id, "tamamlandi")} className="text-xs cursor-pointer">
              <CheckCircle className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Tamamlandı
            </DropdownMenuItem>
          )}
          {plan.durum === "planli" && (
            <DropdownMenuItem onClick={() => onIptal(plan)} className="text-xs cursor-pointer">
              <Clock className="w-3.5 h-3.5 mr-2 text-red-500" /> İptal Et
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onEditNote(plan)} className="text-xs cursor-pointer">
            <CalendarIcon className="w-3.5 h-3.5 mr-2" /> Not Düzenle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(plan.id)} className="text-xs cursor-pointer text-red-500 focus:text-red-500">
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const IPTAL_SEBEPLERI = [
  "Müşteri erteledi.",
  "Müşteri iptal etti.",
  "Zaman yetmedi.",
  "Diğer",
];

export default function AdminZiyaretPlanlari() {
  useAdminTitle("Ziyaret Planları");
  const { token, user: adminUser } = useAdminAuth();
  const { toast } = useToast();
  const [planlar, setPlanlar] = useState<ZiyaretPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editPlan, setEditPlan] = useState<ZiyaretPlan | null>(null);
  const [editNotlar, setEditNotlar] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Staff filter for Yönetim Kurulu
  const isYonetimKurulu = adminUser?.departman === "Yönetim Kurulu" || adminUser?.is_primary;
  const [adminList, setAdminList] = useState<{ id: string; ad: string; soyad: string }[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>("own");

  // Aksiyon Ekle state
  const [aksiyonEkleOpen, setAksiyonEkleOpen] = useState(false);
  const [aksiyonPlan, setAksiyonPlan] = useState<ZiyaretPlan | null>(null);

  // İptal reason state (single cancel)
  const [iptalDialogOpen, setIptalDialogOpen] = useState(false);
  const [iptalPlan, setIptalPlan] = useState<ZiyaretPlan | null>(null);
  const [iptalSebep, setIptalSebep] = useState("");
  const [iptalSebepDiger, setIptalSebepDiger] = useState("");
  const [iptalLoading, setIptalLoading] = useState(false);

  // Günü Tamamla flow state
  const [completeDayDialogOpen, setCompleteDayDialogOpen] = useState(false);
  const [completeDayPlans, setCompleteDayPlans] = useState<ZiyaretPlan[]>([]);
  const [completeDayReasons, setCompleteDayReasons] = useState<Record<string, string>>({});
  const [completeDayDigerTexts, setCompleteDayDigerTexts] = useState<Record<string, string>>({});
  const [completeDayLoading, setCompleteDayLoading] = useState(false);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const callApi = useAdminApi();

  // Fetch admin list for Yönetim Kurulu filter
  useEffect(() => {
    if (!isYonetimKurulu || !token) return;
    const fetchAdmins = async () => {
      try {
        const { data, error } = await supabase.rpc("admin_list_admin_users_v2");
        if (error) throw error;
        setAdminList(((data as any) || []).map((u: any) => ({ id: u.id, ad: u.ad, soyad: u.soyad })));
      } catch {
        setAdminList([]);
      }
    };
    fetchAdmins();
  }, [isYonetimKurulu, token]);

  const viewingAdminId = selectedAdminId === "all" ? undefined : (selectedAdminId === "own" ? adminUser?.id : selectedAdminId);
  const isViewingOwnPlans = selectedAdminId === "own";

  const fetchPlanlar = useCallback(async () => {
    if (!token || !adminUser) return;
    try {
      const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
      const { data, error } = await supabase.rpc("admin_list_ziyaret_planlari_v2", {
        p_admin_id: viewingAdminId || undefined,
        p_baslangic: format(selectedWeekStart, "yyyy-MM-dd"),
        p_bitis: format(weekEnd, "yyyy-MM-dd"),
      });
      if (error) throw error;
      setPlanlar((data as any) || []);
    } catch (err) {
      console.error("[ZiyaretPlanlari] fetch error:", err);
      toast({ title: "Hata", description: "Ziyaret planları yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, adminUser, toast, selectedWeekStart, viewingAdminId]);

  useEffect(() => { setLoading(true); fetchPlanlar(); }, [fetchPlanlar]);

  const handleDurumChange = async (planId: string, durum: string, iptalSebebiVal?: string) => {
    try {
      await callApi("update-ziyaret-plani", { token, planId, durum, ...(iptalSebebiVal ? { iptalSebebi: iptalSebebiVal } : {}) });
      toast({ title: "Güncellendi" });
      fetchPlanlar();
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      await callApi("delete-ziyaret-plani", { token, planId });
      toast({ title: "Silindi" });
      fetchPlanlar();
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  const handleSaveNote = async () => {
    if (!editPlan) return;
    try {
      await callApi("update-ziyaret-plani", { token, planId: editPlan.id, notlar: editNotlar });
      toast({ title: "Not güncellendi" });
      setEditPlan(null);
      fetchPlanlar();
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  // Single cancel with reason
  const openIptalDialog = (plan: ZiyaretPlan) => {
    setIptalPlan(plan);
    setIptalSebep("");
    setIptalSebepDiger("");
    setIptalDialogOpen(true);
  };

  const handleIptalConfirm = async () => {
    if (!iptalPlan || !iptalSebep) return;
    const finalSebep = iptalSebep === "Diğer" ? iptalSebepDiger.trim() : iptalSebep;
    if (!finalSebep) return;
    setIptalLoading(true);
    try {
      await callApi("update-ziyaret-plani", { token, planId: iptalPlan.id, durum: "iptal", iptalSebebi: finalSebep });
      toast({ title: "Ziyaret iptal edildi" });
      setIptalDialogOpen(false);
      setIptalPlan(null);
      fetchPlanlar();
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    } finally {
      setIptalLoading(false);
    }
  };

  // Complete day: if pending visits exist, ask reasons for each
  const handleCompleteDay = (plans: ZiyaretPlan[]) => {
    const pendingPlans = plans.filter(p => p.durum === "planli");
    if (pendingPlans.length === 0) {
      toast({ title: "Bilgi", description: "Tamamlanacak ziyaret yok" });
      return;
    }
    // Check if there are visits that have actions added (tamamlandi) vs still pending
    // All pending ones need a cancel reason
    setCompleteDayPlans(pendingPlans);
    setCompleteDayReasons({});
    setCompleteDayDigerTexts({});
    setCompleteDayDialogOpen(true);
  };

  const isCompleteDayValid = () => {
    return completeDayPlans.every(p => {
      const reason = completeDayReasons[p.id];
      if (!reason) return false;
      if (reason === "Diğer") return (completeDayDigerTexts[p.id] || "").trim().length > 0;
      return true;
    });
  };

  const handleCompleteDayConfirm = async () => {
    setCompleteDayLoading(true);
    let success = 0;
    for (const plan of completeDayPlans) {
      const reason = completeDayReasons[plan.id];
      try {
        const finalReason = reason === "Diğer" ? (completeDayDigerTexts[plan.id] || "").trim() : reason;
        await callApi("update-ziyaret-plani", { token, planId: plan.id, durum: "iptal", iptalSebebi: finalReason });
        success++;
      } catch { /* skip */ }
    }
    toast({ title: "Günü Tamamla", description: `${success} ziyaret iptal edildi` });
    setCompleteDayDialogOpen(false);
    setCompleteDayLoading(false);
    fetchPlanlar();
  };

  const handleAksiyonEkle = (plan: ZiyaretPlan) => {
    setAksiyonPlan(plan);
    setAksiyonEkleOpen(true);
  };

  const handleAksiyonSuccess = async () => {
    if (aksiyonPlan && aksiyonPlan.durum === "planli") {
      try {
        await callApi("update-ziyaret-plani", { token, planId: aksiyonPlan.id, durum: "tamamlandi" });
      } catch { /* ignore */ }
    }
    setAksiyonEkleOpen(false);
    setAksiyonPlan(null);
    toast({ title: "Başarılı", description: "Aksiyon eklendi, ziyaret tamamlandı olarak işaretlendi" });
    fetchPlanlar();
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));

  const filteredPlanlar = planlar.filter(p =>
    !searchTerm || p.firma_unvani.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const plansByDate = weekDays.map(day => ({
    date: day,
    dateKey: format(day, "yyyy-MM-dd"),
    plans: filteredPlanlar.filter(p => isSameDay(new Date(p.planlanan_tarih), day)).sort((a, b) => a.sira - b.sira),
  }));

  return (
    <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
              <Input placeholder="Firma ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 w-56 h-9 text-sm" style={s.input} />
            </div>
            {isYonetimKurulu && adminList.length > 0 && (
              <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                <SelectTrigger className="h-9 w-52 text-xs" style={s.input}>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(38 92% 50%)" }} />
                    <SelectValue placeholder="Personel seçin" />
                  </div>
                </SelectTrigger>
                <SelectContent style={{ ...s.card, zIndex: 9999 }}>
                  <SelectItem value="own" className="text-xs">Benim Planlarım</SelectItem>
                  <SelectItem value="all" className="text-xs">Tüm Personeller</SelectItem>
                  {adminList.filter(a => a.id !== adminUser?.id).map(a => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">{a.ad} {a.soyad}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }} onClick={() => setSelectedWeekStart(prev => addDays(prev, -7))}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium min-w-[180px]" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }} onClick={() => setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              {format(selectedWeekStart, "d MMM", { locale: tr })} — {format(addDays(selectedWeekStart, 6), "d MMM yyyy", { locale: tr })}
            </Button>
            <Button variant="outline" size="sm" className="h-8" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }} onClick={() => setSelectedWeekStart(prev => addDays(prev, 7))}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2" style={{ background: "hsl(var(--admin-hover))" }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: "hsl(38 92% 50%)" }} />
              <span style={s.text}>{filteredPlanlar.length} ziyaret</span>
            </div>
            {!isViewingOwnPlans && (
              <div className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2" style={{ background: "rgba(59,130,246,0.1)" }}>
                <Users className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
                <span style={{ color: "#3b82f6" }}>
                  {selectedAdminId === "all" ? "Tüm Personeller" : (() => { const a = adminList.find(x => x.id === selectedAdminId); return a ? `${a.ad} ${a.soyad}` : ""; })()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Weekly View */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
        ) : (
          <div className="space-y-3">
            <div className={cn("grid gap-3", expandedDate ? "grid-cols-1 md:grid-cols-6" : "grid-cols-1 md:grid-cols-7")}>
              {plansByDate.filter(d => d.dateKey !== expandedDate).map(({ date, dateKey, plans }) => {
                const today = isToday(date);
                const past = isPast(date) && !today;
                const hasPending = plans.some(p => p.durum === "planli");
                return (
                  <div key={dateKey} className="rounded-xl p-3 min-h-[120px] cursor-pointer transition-all hover:scale-[1.02]"
                    style={{ ...s.card, ...(today ? { borderColor: "hsl(38 92% 50%)", borderWidth: 2 } : {}), opacity: past ? 0.6 : 1 }}
                    onClick={() => setExpandedDate(dateKey)}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-xs font-semibold" style={today ? { color: "hsl(38 92% 50%)" } : s.text}>{format(date, "EEEE", { locale: tr })}</div>
                        <div className="text-[10px]" style={s.muted}>{format(date, "d MMMM", { locale: tr })}</div>
                      </div>
                      {plans.length > 0 && (
                        <Badge className="text-[9px] px-1.5 py-0" style={{ background: hasPending ? "rgba(59,130,246,0.1)" : "rgba(34,197,94,0.1)", color: hasPending ? "#3b82f6" : "#22c55e", borderColor: hasPending ? "rgba(59,130,246,0.3)" : "rgba(34,197,94,0.3)" }}>
                          {plans.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {plans.slice(0, 3).map(plan => {
                        const durumC = DURUM_CONFIG[plan.durum] || DURUM_CONFIG.planli;
                        return (
                          <div key={plan.id} className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: durumC.color }} />
                            <p className="text-[10px] truncate" style={s.text}>{plan.firma_unvani}</p>
                          </div>
                        );
                      })}
                      {plans.length > 3 && <p className="text-[9px]" style={s.muted}>+{plans.length - 3} daha</p>}
                      {plans.length === 0 && <p className="text-[10px] text-center py-2" style={s.muted}>—</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded day detail */}
            {expandedDate && (() => {
              const dayData = plansByDate.find(d => d.dateKey === expandedDate);
              if (!dayData) return null;
              const { date, plans } = dayData;
              const today = isToday(date);
              const pendingCount = plans.filter(p => p.durum === "planli").length;
              const completedCount = plans.filter(p => p.durum === "tamamlandi").length;
              const cancelledCount = plans.filter(p => p.durum === "iptal").length;


              const handleDragEnd = async (event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const oldIndex = plans.findIndex(p => p.id === active.id);
                const newIndex = plans.findIndex(p => p.id === over.id);
                if (oldIndex === -1 || newIndex === -1) return;
                const reordered = arrayMove(plans, oldIndex, newIndex);
                // Optimistic update
                const newPlanlar = planlar.map(p => {
                  const idx = reordered.findIndex(r => r.id === p.id);
                  if (idx !== -1) return { ...p, sira: idx };
                  return p;
                });
                setPlanlar(newPlanlar);
                // Persist
                try {
                  await callApi("reorder-ziyaret-planlari", {
                    token,
                    items: reordered.map((p, i) => ({ id: p.id, sira: i })),
                  });
                } catch {
                  fetchPlanlar(); // rollback on error
                }
              };

              return (
                <div className="rounded-xl p-5" style={{ ...s.card, ...(today ? { borderColor: "hsl(38 92% 50%)", borderWidth: 2 } : {}) }}>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-sm font-bold" style={today ? { color: "hsl(38 92% 50%)" } : s.text}>{format(date, "EEEE", { locale: tr })}</div>
                        <div className="text-xs" style={s.muted}>{format(date, "d MMMM yyyy", { locale: tr })}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pendingCount > 0 && <Badge className="text-[10px]" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", borderColor: "rgba(59,130,246,0.3)" }}>{pendingCount} bekleyen</Badge>}
                        {completedCount > 0 && <Badge className="text-[10px]" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", borderColor: "rgba(34,197,94,0.3)" }}>{completedCount} tamamlandı</Badge>}
                        {cancelledCount > 0 && <Badge className="text-[10px]" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>{cancelledCount} iptal</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isViewingOwnPlans && pendingCount > 0 && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7" onClick={() => handleCompleteDay(plans)}>
                          <CheckCheck className="w-3.5 h-3.5 mr-1" /> Günü Tamamla
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs" style={s.muted} onClick={() => setExpandedDate(null)}>
                        <ChevronDown className="w-3.5 h-3.5 mr-1 rotate-180" /> Kapat
                      </Button>
                    </div>
                  </div>

                  {plans.length === 0 ? (
                    <p className="text-sm text-center py-8" style={s.muted}>Bu gün için planlanmış ziyaret yok</p>
                  ) : (
                    <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={plans.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {plans.map(plan => (
                            <SortablePlanItem
                              key={plan.id}
                              plan={plan}
                              onAksiyonEkle={handleAksiyonEkle}
                              onDurumChange={handleDurumChange}
                              onIptal={openIptalDialog}
                              onEditNote={(p) => { setEditPlan(p); setEditNotlar(p.notlar || ""); }}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Edit Note Dialog */}
      <Dialog open={!!editPlan} onOpenChange={(o) => !o && setEditPlan(null)}>
        <DialogContent style={s.card} className="max-w-sm">
          <DialogHeader><DialogTitle style={s.text}>Ziyaret Notu</DialogTitle></DialogHeader>
          <Textarea value={editNotlar} onChange={e => setEditNotlar(e.target.value)} placeholder="Ziyaret ile ilgili notlar..." rows={4} style={s.input} />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditPlan(null)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>İptal</Button>
            <Button size="sm" onClick={handleSaveNote} className="bg-amber-500 hover:bg-amber-600 text-white">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single İptal Dialog */}
      <Dialog open={iptalDialogOpen} onOpenChange={(o) => { if (!o) { setIptalDialogOpen(false); setIptalPlan(null); } }}>
        <DialogContent style={s.card} className="max-w-sm">
          <DialogHeader><DialogTitle style={s.text}>Ziyaret İptal Et</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs" style={s.muted}>{iptalPlan?.firma_unvani}</p>
            <div>
              <label className="text-xs font-medium mb-1 block" style={s.text}>İptal Sebebi *</label>
              <Select value={iptalSebep} onValueChange={v => { setIptalSebep(v); if (v !== "Diğer") setIptalSebepDiger(""); }}>
                <SelectTrigger style={s.input} className="text-sm"><SelectValue placeholder="Sebep seçin" /></SelectTrigger>
                <SelectContent style={s.card}>
                  {IPTAL_SEBEPLERI.map(sebep => <SelectItem key={sebep} value={sebep} className="text-xs">{sebep}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {iptalSebep === "Diğer" && (
              <div>
                <label className="text-xs font-medium mb-1 block" style={s.text}>Açıklama *</label>
                <Textarea value={iptalSebepDiger} onChange={e => setIptalSebepDiger(e.target.value)} placeholder="İptal sebebini yazın..." rows={2} style={s.input} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setIptalDialogOpen(false); setIptalPlan(null); }} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>Vazgeç</Button>
            <Button size="sm" onClick={handleIptalConfirm} disabled={iptalLoading || !iptalSebep || (iptalSebep === "Diğer" && !iptalSebepDiger.trim())} className="bg-red-600 hover:bg-red-700 text-white">
              {iptalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "İptal Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Günü Tamamla Dialog */}
      <Dialog open={completeDayDialogOpen} onOpenChange={(o) => { if (!o) setCompleteDayDialogOpen(false); }}>
        <DialogContent style={s.card} className="max-w-lg">
          <DialogHeader><DialogTitle style={s.text}>Günü Tamamla</DialogTitle></DialogHeader>
          <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "hsl(var(--admin-hover))", border: "1px solid hsl(var(--admin-border))" }}>
            <p style={s.text} className="font-medium">⚠️ Aşağıdaki planlarınız için aksiyon alınmamıştır.</p>
            <p style={s.muted}>Günü bu şekilde tamamladığınızda bu planlar <span className="text-red-400 font-medium">iptal edildi</span> olarak gözükecektir. Aşağıda her biri için iptal sebebi seçiniz ya da vazgeçe tıklayıp tamamladığınız her bir ziyaret için aksiyon giriniz.</p>
            <p style={s.muted} className="italic">Aksiyon girilmeyen ziyaretler iptal edildi gözükecektir.</p>
          </div>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {completeDayPlans.map(plan => {
              const reason = completeDayReasons[plan.id] || "";
              return (
                <div key={plan.id} className="rounded-lg p-3 space-y-2" style={{ background: "hsl(var(--admin-hover))", border: "1px solid hsl(var(--admin-border))" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: "hsl(var(--admin-card-bg))" }}>
                      {plan.firma_logo ? <img src={plan.firma_logo} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-3 h-3" style={s.muted} />}
                    </div>
                    <p className="text-xs font-medium flex-1" style={s.text}>{plan.firma_unvani}</p>
                  </div>
                  <Select value={reason} onValueChange={v => {
                    setCompleteDayReasons(prev => ({ ...prev, [plan.id]: v }));
                    if (v !== "Diğer") setCompleteDayDigerTexts(prev => { const n = { ...prev }; delete n[plan.id]; return n; });
                  }}>
                    <SelectTrigger style={s.input} className="text-xs h-8"><SelectValue placeholder="İptal sebebi seçin" /></SelectTrigger>
                    <SelectContent style={{ ...s.card, zIndex: 9999 }} className="pointer-events-auto">
                      {IPTAL_SEBEPLERI.map(sebep => (
                        <SelectItem key={sebep} value={sebep} className="text-xs">
                          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-red-400" /> {sebep}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {reason === "Diğer" && (
                    <Input
                      value={completeDayDigerTexts[plan.id] || ""}
                      onChange={e => setCompleteDayDigerTexts(prev => ({ ...prev, [plan.id]: e.target.value }))}
                      placeholder="İptal sebebini yazın..."
                      className="text-xs h-8"
                      style={s.input}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCompleteDayDialogOpen(false)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>Vazgeç</Button>
            <Button size="sm" onClick={handleCompleteDayConfirm} disabled={completeDayLoading || !isCompleteDayValid()} className="bg-red-600 hover:bg-red-700 text-white">
              {completeDayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "İptal Et ve Tamamla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aksiyon Ekle Dialog */}
      {aksiyonPlan && token && adminUser && (
        <AksiyonEkleDialog
          open={aksiyonEkleOpen}
          onOpenChange={(o) => { if (!o) { setAksiyonEkleOpen(false); setAksiyonPlan(null); } }}
          firmaId={aksiyonPlan.firma_id}
          firmaUnvani={aksiyonPlan.firma_unvani}
          callApi={callApi}
          token={token}
          adminDepartman={adminUser.departman}
          adminIsPrimary={adminUser.is_primary}
          onSuccess={handleAksiyonSuccess}
        />
      )}
  );
}
