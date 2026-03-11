import { useState, useEffect, useCallback, CSSProperties } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Activity, XCircle, Clock, FileEdit, Ban, Users, ShoppingBag, Tag, Building2
} from "lucide-react";

const s = {
  card: {
    background: "hsl(var(--admin-card-bg))",
    border: "1px solid hsl(var(--admin-border))",
    borderRadius: "0.75rem",
  } as CSSProperties,
  text: { color: "hsl(var(--admin-text))" } as CSSProperties,
  muted: { color: "hsl(var(--admin-muted))" } as CSSProperties,
};

interface UrunStats {
  total: number;
  aktif: number;
  pasif: number;
  onayBekleyen: number;
  reddedilen: number;
  taslak: number;
  totalUsers: number;
  usersWithProducts: number;
  kategoriDagilimi: { id: string; name: string; count: number }[];
  firmaTuruDagilimi: { id: string; name: string; count: number }[];
  firmaTipiDagilimi: { id: string; name: string; count: number }[];
}

function MiniStatCard({ label, value, icon, color }: {
  label: string; value: number | string; icon: React.ReactNode; color: string;
}) {
  return (
    <div style={s.card} className="p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-[10px] font-medium truncate" style={s.muted}>{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function AdminUrunler() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<UrunStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth/urun-stats", {
        body: { token },
      });
      if (error) throw error;
      setStats(data);
    } catch {
      toast({ title: "Hata", description: "İstatistikler yüklenemedi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <AdminLayout title="Ürünler">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Ürünler">
      <div className="space-y-5">
        {stats && (
          <div className="space-y-3">
            {/* Status cards */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              <MiniStatCard
                label="Toplam Ürün"
                value={stats.total}
                icon={<Package className="w-3.5 h-3.5" />}
                color="text-blue-500"
              />
              <MiniStatCard
                label="Aktif"
                value={stats.aktif}
                icon={<Activity className="w-3.5 h-3.5" />}
                color="text-emerald-500"
              />
              <MiniStatCard
                label="Pasif"
                value={stats.pasif}
                icon={<Ban className="w-3.5 h-3.5" />}
                color="text-slate-400"
              />
              <MiniStatCard
                label="Onay Bekleyen"
                value={stats.onayBekleyen}
                icon={<Clock className="w-3.5 h-3.5" />}
                color="text-amber-500"
              />
              <MiniStatCard
                label="Reddedilen"
                value={stats.reddedilen}
                icon={<XCircle className="w-3.5 h-3.5" />}
                color="text-red-500"
              />
              <MiniStatCard
                label="Taslak"
                value={stats.taslak}
                icon={<FileEdit className="w-3.5 h-3.5" />}
                color="text-slate-400"
              />
            </div>

            {/* User stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div style={s.card} className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[11px] font-medium" style={s.muted}>Toplam Kullanıcı / Ürünü Olan</p>
                  <p className="text-lg font-bold" style={s.text}>
                    {stats.totalUsers} <span className="text-sm font-normal" style={s.muted}>/</span>{" "}
                    <span className="text-emerald-500">{stats.usersWithProducts}</span>
                  </p>
                </div>
              </div>
              <div style={s.card} className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-[11px] font-medium" style={s.muted}>Ortalama Ürün / Kullanıcı</p>
                  <p className="text-lg font-bold text-purple-500">
                    {stats.usersWithProducts > 0 ? (stats.total / stats.usersWithProducts).toFixed(1) : "0"}
                  </p>
                </div>
              </div>
            </div>

            {/* Category distribution */}
            <div style={s.card} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-semibold" style={s.text}>Ana Ürün Kategorisi Dağılımı</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stats.kategoriDagilimi.map((cat) => (
                  <span
                    key={cat.id}
                    className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md"
                    style={{
                      background: "hsl(var(--admin-hover))",
                      color: "hsl(var(--admin-text))",
                      border: "1px solid transparent",
                    }}
                  >
                    <span className="truncate max-w-[140px]">{cat.name}</span>
                    <span className="font-bold text-purple-500">{cat.count}</span>
                  </span>
                ))}
                {stats.kategoriDagilimi.length === 0 && (
                  <span className="text-[11px]" style={s.muted}>Henüz veri yok</span>
                )}
              </div>
            </div>

            {/* Firma Türü & Tipi distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div style={s.card} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-semibold" style={s.text}>Firma Türü Ürün Dağılımı</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.firmaTuruDagilimi.map((item) => (
                    <span
                      key={item.id}
                      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md"
                      style={{
                        background: "hsl(var(--admin-hover))",
                        color: "hsl(var(--admin-text))",
                        border: "1px solid transparent",
                      }}
                    >
                      <span className="truncate max-w-[120px]">{item.name}</span>
                      <span className="font-bold text-orange-500">{item.count}</span>
                    </span>
                  ))}
                  {stats.firmaTuruDagilimi.length === 0 && (
                    <span className="text-[11px]" style={s.muted}>Henüz veri yok</span>
                  )}
                </div>
              </div>

              <div style={s.card} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-xs font-semibold" style={s.text}>Firma Tipi Ürün Dağılımı</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.firmaTipiDagilimi.map((item) => (
                    <span
                      key={item.id}
                      className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md"
                      style={{
                        background: "hsl(var(--admin-hover))",
                        color: "hsl(var(--admin-text))",
                        border: "1px solid transparent",
                      }}
                    >
                      <span className="truncate max-w-[120px]">{item.name}</span>
                      <span className="font-bold text-cyan-500">{item.count}</span>
                    </span>
                  ))}
                  {stats.firmaTipiDagilimi.length === 0 && (
                    <span className="text-[11px]" style={s.muted}>Henüz veri yok</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
