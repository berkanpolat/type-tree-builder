import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const DEFAULT_TIMEOUT = 15_000; // 15s

/**
 * Shared admin API caller that auto-injects `actingAdminId`
 * when impersonating another admin user.
 */
export function useAdminApi() {
  const { impersonatedUser } = useAdminAuth();

  const callApi = useCallback(
    async (action: string, body: Record<string, unknown>, timeout = DEFAULT_TIMEOUT) => {
      const enrichedBody: Record<string, unknown> = { ...body, action };
      // When impersonating, inject the impersonated user's ID
      if (impersonatedUser) {
        enrichedBody.actingAdminId = impersonatedUser.id;
      }

      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const { data, error } = await supabase.functions.invoke("admin-auth", {
            body: enrichedBody,
          });
          clearTimeout(timer);
          if (error) {
            console.error(`[AdminAPI] ${action} error:`, error, "message:", error?.message, "status:", (error as any)?.status, "context:", JSON.stringify((error as any)?.context));
            const status = (error as any)?.status || (error as any)?.context?.status;
            if ((status === 503 || status === 504 || String(error.message).includes("boot")) && attempt < maxRetries) {
              await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
              continue;
            }
            throw error;
          }
          return data;
        } catch (err: any) {
          clearTimeout(timer);
          if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
            if (attempt < maxRetries) {
              await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
              continue;
            }
            throw new Error("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
          }
          if (attempt < maxRetries && (err?.message?.includes("Failed to fetch") || err?.message?.includes("network"))) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
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
