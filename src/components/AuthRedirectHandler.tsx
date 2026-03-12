import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const isRecoveryFlow = () => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";
};

const mustSetPassword = (user: { user_metadata?: Record<string, unknown> } | null | undefined) =>
  user?.user_metadata?.must_set_password === true;

/**
 * Global listener: force users with recovery/must_set_password
 * to land on /sifre-sifirla before normal app usage.
 */
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isRecoveryFlow() && location.pathname !== "/sifre-sifirla") {
      navigate({ pathname: "/sifre-sifirla", hash: window.location.hash }, { replace: true });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mustSetPassword(session?.user) && location.pathname !== "/sifre-sifirla") {
        navigate("/sifre-sifirla", { replace: true });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate({ pathname: "/sifre-sifirla", hash: window.location.hash }, { replace: true });
        return;
      }

      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && mustSetPassword(session?.user)) {
        navigate("/sifre-sifirla", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return null;
};

export default AuthRedirectHandler;
