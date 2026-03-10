import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminUser {
  id: string;
  username: string;
  ad: string;
  soyad: string;
  email: string | null;
  telefon: string | null;
  pozisyon: string;
  is_primary: boolean;
  permissions: {
    kullanici_ekle: boolean;
    kullanici_yonet: boolean;
    destek_talepleri: boolean;
    sikayet_goruntule: boolean;
    ihale_goruntule: boolean;
    urun_goruntule: boolean;
  };
  created_at: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  hasPermission: (key: keyof AdminUser["permissions"]) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    localStorage.removeItem("admin_token");
  };

  const hasPermission = (key: keyof AdminUser["permissions"]) => {
    if (!user) return false;
    if (user.is_primary) return true;
    return !!user.permissions?.[key];
  };

  return (
    <AdminAuthContext.Provider value={{ user, token, loading, login, logout, hasPermission }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
