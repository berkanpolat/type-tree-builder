import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const isInvalidRefreshTokenError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: string; message?: string };

  return (
    maybeError.code === "refresh_token_not_found" ||
    maybeError.message?.includes("Invalid Refresh Token") === true
  );
};

export const getSafeUser = async (): Promise<User | null> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return user ?? null;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore local cleanup failures
      }
    }

    return null;
  }
};

export const hasSafeUserSession = async () => Boolean(await getSafeUser());
