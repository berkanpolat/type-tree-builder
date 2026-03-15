import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const INTERVAL_MS = 30_000; // 30 seconds

export function useAdminGeolocation(token: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token || !navigator.geolocation) return;

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await supabase.functions.invoke("admin-auth/update-konum", {
              body: {
                token,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              },
            });
          } catch (e) {
            console.error("[Geolocation] update failed:", e);
          }
        },
        (err) => console.warn("[Geolocation] denied:", err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // Send immediately, then every 30s
    sendLocation();
    intervalRef.current = setInterval(sendLocation, INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token]);
}
