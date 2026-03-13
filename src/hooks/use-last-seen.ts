import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

let lastUpdate = 0;
const THROTTLE_MS = 10_000; // max once per 10 seconds

/** Standalone function to update last_seen (throttled) */
export async function updateLastSeen() {
  const now = Date.now();
  if (now - lastUpdate < THROTTLE_MS) return;
  lastUpdate = now;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ last_seen: new Date().toISOString() } as any)
      .eq("user_id", user.id);
  } catch {
    // silently ignore
  }
}

/**
 * Updates the user's last_seen timestamp:
 * - On mount
 * - On every route change
 * - Every 5 minutes while idle
 */
export function useLastSeen() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const location = useLocation();

  // Update on route change
  useEffect(() => {
    updateLastSeen();
  }, [location.pathname]);

  useEffect(() => {
    // Update immediately on mount
    updateLastSeen();

    // Then every 5 minutes
    intervalRef.current = setInterval(updateLastSeen, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
