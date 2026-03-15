import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminPermissions {
  // İhale
  ihale_goruntule: boolean;
  ihale_kaldirabilir: boolean;
  ihale_duzenleyebilir: boolean;
  ihale_onaylayabilir: boolean;
  ihale_inceleyebilir: boolean;
  // Ürün
  urun_goruntule: boolean;
  urun_kaldirabilir: boolean;
  urun_duzenleyebilir: boolean;
  urun_onaylayabilir: boolean;
  urun_inceleyebilir: boolean;
  // Şikayet
  sikayet_goruntule: boolean;
  sikayet_detay_goruntule: boolean;
  sikayet_islem_yapabilir: boolean;
  sikayet_kisitlama: boolean;
  sikayet_uzaklastirma: boolean;
  sikayet_yasaklama: boolean;
  // Paket
  paket_olusturabilir: boolean;
  paket_duzenleyebilir: boolean;
  paket_detay_goruntule: boolean;
  paket_ekstra_hak: boolean;
  // Destek
  destek_goruntule: boolean;
  destek_cevap: boolean;
}

interface AdminUser {
  id: string;
  username: string;
  ad: string;
  soyad: string;
  email: string | null;
  telefon: string | null;
  departman: string;
  pozisyon: string;
  is_primary: boolean;
  permissions: AdminPermissions;
  created_at: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  hasPermission: (key: keyof AdminPermissions) => boolean;
  // Impersonation
  impersonatedUser: AdminUser | null;
  originalUser: AdminUser | null;
  impersonateAdmin: (targetUser: AdminUser) => void;
  stopImpersonating: () => void;
  isImpersonating: boolean;
  /** Returns the effective user (impersonated or real) */
  effectiveUser: AdminUser | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Impersonation state
  const [impersonatedUser, setImpersonatedUser] = useState<AdminUser | null>(null);
  const [originalUser, setOriginalUser] = useState<AdminUser | null>(null);

  const isImpersonating = !!impersonatedUser;
  // When impersonating, the "user" seen by the rest of the app is the impersonated user
  // but we keep all permissions of the original (super admin) user
  const effectiveUser = impersonatedUser || user;

  const callEdgeFunction = useCallback(async (action: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(`admin-auth/${action}`, {
      body,
    });
    if (error) throw error;
    return data;
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    if (savedToken) {
      callEdgeFunction("verify", { token: savedToken })
        .then((data) => {
          setUser(data.user);
          setToken(savedToken);

          // Restore impersonation state if any
          const savedImpersonation = sessionStorage.getItem("admin_impersonation");
          if (savedImpersonation && data.user?.is_primary) {
            try {
              const parsed = JSON.parse(savedImpersonation);
              setImpersonatedUser(parsed);
              setOriginalUser(data.user);
            } catch {
              sessionStorage.removeItem("admin_impersonation");
            }
          }
        })
        .catch(() => {
          localStorage.removeItem("admin_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [callEdgeFunction]);

  const login = async (username: string, password: string) => {
    try {
      const data = await callEdgeFunction("login", { username, password });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("admin_token", data.token);
      return {};
    } catch (err: any) {
      return { error: err?.message || "Giriş başarısız" };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setImpersonatedUser(null);
    setOriginalUser(null);
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_impersonation");
  };

  const hasPermission = (key: keyof AdminPermissions) => {
    // When impersonating, super admin keeps all permissions
    const checkUser = originalUser || user;
    if (!checkUser) return false;
    if (checkUser.is_primary) return true;
    return !!checkUser.permissions?.[key];
  };

  const impersonateAdmin = (targetUser: AdminUser) => {
    if (!user?.is_primary) return;
    setOriginalUser(user);
    setImpersonatedUser(targetUser);
    sessionStorage.setItem("admin_impersonation", JSON.stringify(targetUser));
  };

  const stopImpersonating = () => {
    setImpersonatedUser(null);
    setOriginalUser(null);
    sessionStorage.removeItem("admin_impersonation");
  };

  return (
    <AdminAuthContext.Provider value={{
      user: effectiveUser,
      token,
      loading,
      login,
      logout,
      hasPermission,
      impersonatedUser,
      originalUser,
      impersonateAdmin,
      stopImpersonating,
      isImpersonating,
      effectiveUser,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
