import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PASSWORD_PAGE = "/sifre-sifirla";
const PHONE_VERIFY_PAGE = "/telefon-dogrulama";

// Pages that should be excluded from phone verification redirect
const EXCLUDED_PATHS = [PASSWORD_PAGE, PHONE_VERIFY_PAGE, "/giris-kayit", "/sifre-sifirla"];
// Admin paths should also be excluded
const isAdminPath = (path: string) => path.startsWith("/yonetim");

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
 * Also forces phone verification for unverified users.
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

  const goToPhoneVerify = () => {
    if (window.location.pathname !== PHONE_VERIFY_PAGE) {
      navigate(PHONE_VERIFY_PAGE, { replace: true });
    }
  };

  // Fresh server check — not cached session
  const checkUserStatus = async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Password check first (higher priority)
      if (user.user_metadata?.must_set_password === true) {
        goToPassword();
        return;
      }

      // Phone verification check (skip for excluded paths and admin paths)
      const currentPath = window.location.pathname;
      if (EXCLUDED_PATHS.includes(currentPath) || isAdminPath(currentPath)) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("telefon_dogrulandi")
        .eq("user_id", user.id)
        .single();

      if (profile && profile.telefon_dogrulandi === false) {
        goToPhoneVerify();
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

    // 2. Server-side metadata + phone check
    checkUserStatus();

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
          return;
        }

        // On sign in, check phone verification
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          // Small delay to let profile data be available
          setTimeout(() => checkUserStatus(), 500);
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
};

export default AuthRedirectHandler;
