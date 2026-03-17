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
      
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const { data, error } = await supabase.functions.invoke(
            `admin-auth/${action}`,
            { body: enrichedBody }
          );
          if (error) {
            console.error(`[AdminAPI] ${action} error:`, error, "message:", error?.message, "status:", (error as any)?.status, "context:", JSON.stringify((error as any)?.context));
            // Retry on 503/504 (cold start timeouts)
            const status = (error as any)?.status || (error as any)?.context?.status;
            if ((status === 503 || status === 504 || String(error.message).includes("boot")) && attempt < maxRetries) {
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
              continue;
            }
            throw error;
          }
          console.log(`[AdminAPI] ${action} success:`, typeof data, data ? Object.keys(data) : "null");
          return data;
        } catch (err: any) {
          if (attempt < maxRetries && (err?.message?.includes("Failed to fetch") || err?.message?.includes("network"))) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }
    },
    [impersonatedUser]
  );

  return callApi;
}
