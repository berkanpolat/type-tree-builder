import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PASSWORD_PAGE = "/sifre-sifirla";

const isRecoveryHash = () => {
  try {
    const h = new URLSearchParams(window.location.hash.substring(1));
    const s = new URLSearchParams(window.location.search);
    return h.get("type") === "recovery" || s.get("type") === "recovery";
  } catch {
    return false;
  }
};

/**
 * Bulletproof guard: any user with must_set_password=true OR
 * arriving via a recovery link is forced to /sifre-sifirla.
 */
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const checking = useRef(false);

  const goToPassword = () => {
    if (window.location.pathname !== PASSWORD_PAGE) {
      navigate(PASSWORD_PAGE, { replace: true });
    }
  };

  // Fresh server check — not cached session
  const checkMustSetPassword = async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.must_set_password === true) {
        goToPassword();
      }
    } catch {
      // not logged in — ignore
    } finally {
      checking.current = false;
    }
  };

  useEffect(() => {
    // 1. Synchronous hash check (runs before Supabase processes the hash)
    if (isRecoveryHash()) {
      goToPassword();
      return;
    }

    // 2. Server-side metadata check
    checkMustSetPassword();

    // 3. Listen for auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          goToPassword();
          return;
        }

        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") &&
          session?.user?.user_metadata?.must_set_password === true
        ) {
          goToPassword();
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
};

export default AuthRedirectHandler;
