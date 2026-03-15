import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, CalendarIcon, Building2, Loader2, MoreHorizontal, Trash2, CheckCircle, Clock,
  Search, ChevronLeft, ChevronRight, ClipboardList, CheckCheck, ChevronDown,
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isToday, isPast, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import AksiyonEkleDialog from "@/components/admin/AksiyonEkleDialog";

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
}

const DURUM_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planli: { label: "Planlı", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  tamamlandi: { label: "Tamamlandı", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  iptal: { label: "İptal", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

export default function AdminZiyaretPlanlari() {
  const { token, user: adminUser } = useAdminAuth();
  const { toast } = useToast();
  const [planlar, setPlanlar] = useState<ZiyaretPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editPlan, setEditPlan] = useState<ZiyaretPlan | null>(null);
  const [editNotlar, setEditNotlar] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Aksiyon Ekle state
  const [aksiyonEkleOpen, setAksiyonEkleOpen] = useState(false);
  const [aksiyonPlan, setAksiyonPlan] = useState<ZiyaretPlan | null>(null);

  const callApi = useCallback(async (action: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, { body });
    if (error) throw error;
    return data;
  }, []);

  const fetchPlanlar = useCallback(async () => {
    if (!token || !adminUser) return;
    try {
      const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
      const data = await callApi("list-ziyaret-planlari", {
        token,
        adminId: adminUser.id,
        baslangic: format(selectedWeekStart, "yyyy-MM-dd"),
        bitis: format(weekEnd, "yyyy-MM-dd"),
      });
      setPlanlar(data?.planlar || []);
    } catch (err) {
      console.error("[ZiyaretPlanlari] fetch error:", err);
      toast({ title: "Hata", description: "Ziyaret planları yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, adminUser, callApi, toast, selectedWeekStart]);

  useEffect(() => { setLoading(true); fetchPlanlar(); }, [fetchPlanlar]);

  const handleDurumChange = async (planId: string, durum: string) => {
    try {
      await callApi("update-ziyaret-plani", { token, planId, durum });
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

  const handleCompleteDay = async (plans: ZiyaretPlan[]) => {
    const pendingPlans = plans.filter(p => p.durum === "planli");
    if (pendingPlans.length === 0) {
      toast({ title: "Bilgi", description: "Tamamlanacak ziyaret yok" });
      return;
    }
    let success = 0;
    for (const plan of pendingPlans) {
      try {
        await callApi("update-ziyaret-plani", { token, planId: plan.id, durum: "tamamlandi" });
        success++;
      } catch { /* skip */ }
    }
    toast({ title: "Günü Tamamla", description: `${success} ziyaret tamamlandı olarak işaretlendi` });
    fetchPlanlar();
  };

  const handleAksiyonEkle = (plan: ZiyaretPlan) => {
    setAksiyonPlan(plan);
    setAksiyonEkleOpen(true);
  };

  const handleAksiyonSuccess = async () => {
    // Auto-mark visit as completed when an action is added
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
    plans: filteredPlanlar.filter(p => isSameDay(new Date(p.planlanan_tarih), day)),
  }));

  return (
    <AdminLayout title="Ziyaret Planları">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
              <Input
                placeholder="Firma ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 w-56 h-9 text-sm"
                style={s.input}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8"
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}
              onClick={() => setSelectedWeekStart(prev => addDays(prev, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium min-w-[180px]"
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}
              onClick={() => setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              {format(selectedWeekStart, "d MMM", { locale: tr })} — {format(addDays(selectedWeekStart, 6), "d MMM yyyy", { locale: tr })}
            </Button>
            <Button variant="outline" size="sm" className="h-8"
              style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}
              onClick={() => setSelectedWeekStart(prev => addDays(prev, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2" style={{ background: "hsl(var(--admin-hover))" }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: "hsl(38 92% 50%)" }} />
              <span style={s.text}>{filteredPlanlar.length} ziyaret</span>
            </div>
          </div>
        </div>

        {/* Weekly View */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Compact row for non-expanded days */}
            <div className={cn("grid gap-3", expandedDate ? "grid-cols-1 md:grid-cols-6" : "grid-cols-1 md:grid-cols-7")}>
              {plansByDate.filter(d => d.dateKey !== expandedDate).map(({ date, dateKey, plans }) => {
                const today = isToday(date);
                const past = isPast(date) && !today;
                const hasPending = plans.some(p => p.durum === "planli");
                return (
                  <div
                    key={dateKey}
                    className="rounded-xl p-3 min-h-[120px] cursor-pointer transition-all hover:scale-[1.02]"
                    style={{
                      ...s.card,
                      ...(today ? { borderColor: "hsl(38 92% 50%)", borderWidth: 2 } : {}),
                      opacity: past ? 0.6 : 1,
                    }}
                    onClick={() => setExpandedDate(dateKey)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-xs font-semibold" style={today ? { color: "hsl(38 92% 50%)" } : s.text}>
                          {format(date, "EEEE", { locale: tr })}
                        </div>
                        <div className="text-[10px]" style={s.muted}>
                          {format(date, "d MMMM", { locale: tr })}
                        </div>
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
                      {plans.length > 3 && (
                        <p className="text-[9px]" style={s.muted}>+{plans.length - 3} daha</p>
                      )}
                      {plans.length === 0 && (
                        <p className="text-[10px] text-center py-2" style={s.muted}>—</p>
                      )}
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

              return (
                <div className="rounded-xl p-5" style={{ ...s.card, ...(today ? { borderColor: "hsl(38 92% 50%)", borderWidth: 2 } : {}) }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-sm font-bold" style={today ? { color: "hsl(38 92% 50%)" } : s.text}>
                          {format(date, "EEEE", { locale: tr })}
                        </div>
                        <div className="text-xs" style={s.muted}>
                          {format(date, "d MMMM yyyy", { locale: tr })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pendingCount > 0 && (
                          <Badge className="text-[10px]" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", borderColor: "rgba(59,130,246,0.3)" }}>
                            {pendingCount} bekleyen
                          </Badge>
                        )}
                        {completedCount > 0 && (
                          <Badge className="text-[10px]" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", borderColor: "rgba(34,197,94,0.3)" }}>
                            {completedCount} tamamlandı
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingCount > 0 && (
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
                    <div className="space-y-2">
                      {plans.map(plan => {
                        const durumC = DURUM_CONFIG[plan.durum] || DURUM_CONFIG.planli;
                        return (
                          <div key={plan.id} className="rounded-lg p-3 group flex items-center gap-3" style={{ background: "hsl(var(--admin-hover))", border: "1px solid hsl(var(--admin-border))" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: "hsl(var(--admin-card-bg))" }}>
                              {plan.firma_logo ? (
                                <img src={plan.firma_logo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Building2 className="w-4 h-4" style={s.muted} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={s.text}>{plan.firma_unvani}</p>
                              {plan.notlar && (
                                <p className="text-xs mt-0.5" style={s.muted}>{plan.notlar}</p>
                              )}
                            </div>
                            <Badge className="text-[9px] px-2 py-0.5 flex-shrink-0" style={{ background: durumC.bg, color: durumC.color, borderColor: `${durumC.color}40` }}>
                              {durumC.label}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <MoreHorizontal className="w-4 h-4" style={s.muted} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" style={s.card} className="min-w-[160px]">
                                <DropdownMenuItem onClick={() => handleAksiyonEkle(plan)} className="text-xs cursor-pointer">
                                  <ClipboardList className="w-3.5 h-3.5 mr-2 text-amber-500" /> Aksiyon Ekle
                                </DropdownMenuItem>
                                {plan.durum === "planli" && (
                                  <DropdownMenuItem onClick={() => handleDurumChange(plan.id, "tamamlandi")} className="text-xs cursor-pointer">
                                    <CheckCircle className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Tamamlandı
                                  </DropdownMenuItem>
                                )}
                                {plan.durum === "planli" && (
                                  <DropdownMenuItem onClick={() => handleDurumChange(plan.id, "iptal")} className="text-xs cursor-pointer">
                                    <Clock className="w-3.5 h-3.5 mr-2 text-red-500" /> İptal Et
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => { setEditPlan(plan); setEditNotlar(plan.notlar || ""); }} className="text-xs cursor-pointer">
                                  <CalendarIcon className="w-3.5 h-3.5 mr-2" /> Not Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(plan.id)} className="text-xs cursor-pointer text-red-500 focus:text-red-500">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                    </div>
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
          <DialogHeader>
            <DialogTitle style={s.text}>Ziyaret Notu</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editNotlar}
            onChange={e => setEditNotlar(e.target.value)}
            placeholder="Ziyaret ile ilgili notlar..."
            rows={4}
            style={s.input}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditPlan(null)} style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>İptal</Button>
            <Button size="sm" onClick={handleSaveNote} className="bg-amber-500 hover:bg-amber-600 text-white">Kaydet</Button>
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
    </AdminLayout>
  );
}
