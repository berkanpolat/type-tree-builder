import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const isRecoveryFlow = () => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";
};

/**
 * Global listener: force users arriving via a recovery link
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate({ pathname: "/sifre-sifirla", hash: window.location.hash }, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return null;
};

export default AuthRedirectHandler;
