import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Loader2, Search, Trash2, ClipboardList } from "lucide-react";
import { TUR_CONFIG, AKSIYON_TURLERI } from "@/lib/aksiyon-config";
import AksiyonDetayDialog, { type AksiyonDetay } from "@/components/admin/AksiyonDetayDialog";

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

interface Aksiyon {
  id: string;
  baslik: string;
  aciklama: string | null;
  tur: string;
  tarih: string;
  durum: string;
  firma_id: string;
  firma_unvani: string;
  admin_ad: string;
  admin_id: string;
  created_at: string;
}

export default function AdminAksiyonlar() {
  const { token, user: adminUser } = useAdminAuth();
  const [aksiyonlar, setAksiyonlar] = useState<Aksiyon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTur, setFilterTur] = useState<string>("all");

  const callApi = useCallback(async (action: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, { body });
    if (error) throw error;
    return data;
  }, []);

  const fetchAksiyonlar = useCallback(async () => {
    if (!token || !adminUser) return;
    setLoading(true);
    try {
      const data = await callApi("list-aksiyonlar", { token, adminId: adminUser.id });
      setAksiyonlar(data.aksiyonlar || []);
    } catch {
      setAksiyonlar([]);
    } finally {
      setLoading(false);
    }
  }, [token, adminUser, callApi]);

  useEffect(() => { fetchAksiyonlar(); }, [fetchAksiyonlar]);

  const deleteAksiyon = async (id: string) => {
    await callApi("delete-aksiyon", { token, aksiyonId: id });
    fetchAksiyonlar();
  };

  const filtered = aksiyonlar.filter(a => {
    if (filterTur !== "all" && a.tur !== filterTur) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!a.baslik.toLowerCase().includes(term) && !a.firma_unvani.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const groupByDate = (items: Aksiyon[]) => {
    const groups: Record<string, Aksiyon[]> = {};
    for (const a of items) {
      const key = format(new Date(a.tarih), "dd MMMM yyyy", { locale: tr });
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }
    return Object.entries(groups);
  };

  return (
    <AdminLayout title="Aksiyonlarım">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={s.muted} />
              <Input placeholder="Aksiyon veya firma ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 w-56 h-9 text-sm" style={s.input} />
            </div>
            <Select value={filterTur} onValueChange={setFilterTur}>
              <SelectTrigger className="w-36 h-9 text-xs" style={s.input}><SelectValue /></SelectTrigger>
              <SelectContent style={s.card}>
                <SelectItem value="all" className="text-xs">Tüm Türler</SelectItem>
                {AKSIYON_TURLERI.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2" style={{ background: "hsl(var(--admin-hover))" }}>
            <ClipboardList className="w-3.5 h-3.5" style={{ color: "hsl(38 92% 50%)" }} />
            <span style={s.text}>{filtered.length} aksiyon</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={s.card}>
            <ClipboardList className="w-10 h-10 mx-auto mb-3" style={s.muted} />
            <p className="text-sm" style={s.muted}>{searchTerm ? "Aramanızla eşleşen aksiyon bulunamadı" : "Henüz aksiyon eklenmemiş"}</p>
            <p className="text-xs mt-1" style={s.muted}>Portföyüm sayfasından firmalara aksiyon ekleyebilirsiniz</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupByDate(filtered).map(([date, items]) => (
              <div key={date}>
                <p className="text-[10px] font-medium mb-1.5 px-1" style={s.muted}>{date}</p>
                <div className="space-y-1.5">
                  {items.map(a => <AksiyonCard key={a.id} aksiyon={a} onDelete={deleteAksiyon} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function AksiyonCard({ aksiyon, onDelete }: { aksiyon: Aksiyon; onDelete: (id: string) => void }) {
  const turConfig = TUR_CONFIG[aksiyon.tur] || TUR_CONFIG.diger;
  const Icon = turConfig.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl transition-colors" style={{ background: "hsl(var(--admin-card-bg))", border: "1px solid hsl(var(--admin-border))" }}>
      <div className="mt-0.5 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${turConfig.color}15`, width: 20, height: 20 }}>
        <Icon className="w-3 h-3" style={{ color: turConfig.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: "hsl(var(--admin-text))" }}>{aksiyon.baslik}</span>
          <Badge className="text-[9px] px-1.5 py-0 ml-auto flex-shrink-0" style={{ background: `${turConfig.color}20`, color: turConfig.color, borderColor: `${turConfig.color}40` }}>{turConfig.label}</Badge>
        </div>
        {aksiyon.aciklama && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "hsl(var(--admin-muted))" }}>{aksiyon.aciklama}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--admin-hover))", color: "hsl(var(--admin-text))" }}>{aksiyon.firma_unvani}</span>
          <span className="text-[10px]" style={{ color: "hsl(var(--admin-muted))" }}>{format(new Date(aksiyon.tarih), "dd MMM HH:mm", { locale: tr })}</span>
        </div>
      </div>
      <button onClick={() => onDelete(aksiyon.id)} className="mt-0.5 opacity-30 hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
    </div>
  );
}
