import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUnreadMessages() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let userId: string | null = null;

    const fetchCount = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;
      userId = user.id;

      // Get conversations where user is a participant
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!convs || convs.length === 0) { setCount(0); return; }

      const convIds = convs.map(c => c.id);

      const { count: unread } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      setCount(unread || 0);
    };

    fetchCount();

    // Listen for new messages to update count
    const channel = supabase
      .channel("unread-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return count;
}
