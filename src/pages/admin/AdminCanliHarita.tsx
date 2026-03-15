import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminGeolocation } from "@/hooks/use-admin-geolocation";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { MapPin, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminTheme } from "@/components/admin/AdminLayout";

const GOOGLE_MAPS_API_KEY = "AIzaSyDGjcnNQRg5RHWYV1N-d6qJ6ztNoVbFXLE";

const MAP_CONTAINER = { width: "100%", height: "100%" };
const TURKEY_CENTER = { lat: 39.0, lng: 35.0 };

interface KonumData {
  admin_id: string;
  lat: number;
  lng: number;
  updated_at: string;
  admin_ad: string;
  admin_soyad: string;
  admin_pozisyon: string;
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d6a" }] },
];

export default function AdminCanliHarita() {
  const { token } = useAdminAuth();
  const lightMode = useAdminTheme();

  // Start sending location every 30s
  useAdminGeolocation(token);

  const [konumlar, setKonumlar] = useState<KonumData[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<KonumData | null>(null);
  const [loading, setLoading] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const fetchKonumlar = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("admin-auth/list-konumlar", {
        body: { token },
      });
      if (data?.konumlar) setKonumlar(data.konumlar);
    } catch (e) {
      console.error("Konum fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchKonumlar();
    const interval = setInterval(fetchKonumlar, 30_000);
    return () => clearInterval(interval);
  }, [fetchKonumlar]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-konumlar-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_konumlar" }, () => {
        fetchKonumlar();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchKonumlar]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getTimeDiff = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff} sn önce`;
    return `${Math.floor(diff / 60)} dk önce`;
  };

  return (
    <AdminLayout title="Canlı Harita">
      <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium" style={{ color: "hsl(var(--admin-text))" }}>
              {konumlar.length} aktif personel
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchKonumlar}
            disabled={loading}
            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>

        {/* Map + sidebar */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Map */}
          <div className="flex-1 rounded-xl overflow-hidden border" style={{ borderColor: "hsl(var(--admin-border))" }}>
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER}
                center={TURKEY_CENTER}
                zoom={6}
                options={{
                  styles: lightMode ? [] : darkMapStyle,
                  disableDefaultUI: false,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true,
                }}
              >
                {konumlar.map((k) => (
                  <Marker
                    key={k.admin_id}
                    position={{ lat: k.lat, lng: k.lng }}
                    onClick={() => setSelectedAdmin(k)}
                    label={{
                      text: (k.admin_ad?.[0] || "") + (k.admin_soyad?.[0] || ""),
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  />
                ))}
                {selectedAdmin && selectedAdmin.lat != null && selectedAdmin.lng != null && (
                  <InfoWindow
                    position={{ lat: Number(selectedAdmin.lat), lng: Number(selectedAdmin.lng) }}
                    onCloseClick={() => setSelectedAdmin(null)}
                  >
                    <div className="p-1 text-sm text-gray-800">
                      <p className="font-bold">{selectedAdmin.admin_ad} {selectedAdmin.admin_soyad}</p>
                      <p className="text-xs text-gray-500">{selectedAdmin.admin_pozisyon}</p>
                      <p className="text-xs mt-1">Son güncelleme: {formatTime(selectedAdmin.updated_at)}</p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            ) : (
              <div className="flex items-center justify-center h-full" style={{ background: "hsl(var(--admin-bg))" }}>
                <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>

          {/* Sidebar list */}
          <div
            className="w-72 hidden lg:flex flex-col rounded-xl border overflow-hidden"
            style={{
              background: "hsl(var(--admin-sidebar))",
              borderColor: "hsl(var(--admin-border))",
            }}
          >
            <div className="px-4 py-3 border-b font-semibold text-sm" style={{ borderColor: "hsl(var(--admin-border))", color: "hsl(var(--admin-text))" }}>
              Personel Konumları
            </div>
            <div className="flex-1 overflow-y-auto">
              {konumlar.length === 0 ? (
                <div className="p-4 text-center text-sm" style={{ color: "hsl(var(--admin-muted))" }}>
                  Aktif konum bulunamadı
                </div>
              ) : (
                konumlar.map((k) => (
                  <button
                    key={k.admin_id}
                    onClick={() => setSelectedAdmin(k)}
                    className="w-full text-left px-4 py-3 border-b transition-colors hover:bg-amber-500/5"
                    style={{ borderColor: "hsl(var(--admin-border))" }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                        {k.admin_ad?.[0]}{k.admin_soyad?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--admin-text))" }}>
                          {k.admin_ad} {k.admin_soyad}
                        </p>
                        <p className="text-xs truncate" style={{ color: "hsl(var(--admin-muted))" }}>
                          {k.admin_pozisyon}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs" style={{ color: "hsl(var(--admin-muted))" }}>
                            {getTimeDiff(k.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
