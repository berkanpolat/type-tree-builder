import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

/**
 * Shared admin API caller that auto-injects `actingAdminId`
 * when impersonating another admin user.
 */
export function useAdminApi() {
  const { impersonatedUser } = useAdminAuth();

  const callApi = useCallback(
    async (action: string, body: Record<string, unknown>) => {
      const enrichedBody = { ...body };
      // When impersonating, inject the impersonated user's ID
      if (impersonatedUser) {
        enrichedBody.actingAdminId = impersonatedUser.id;
      }
      const { data, error } = await supabase.functions.invoke(
        `admin-auth/${action}`,
        { body: enrichedBody }
      );
      if (error) throw error;
      return data;
    },
    [impersonatedUser]
  );

  return callApi;
}
