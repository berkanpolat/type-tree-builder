import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Updates the user's last_seen timestamp every 5 minutes while they are active.
 */
export function useLastSeen() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const update = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    };

    // Update immediately on mount
    update();

    // Then every 5 minutes
    intervalRef.current = setInterval(update, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
