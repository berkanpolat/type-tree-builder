import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import {
  Shield, Users, LogOut, LayoutDashboard, MessageSquareWarning,
  Gavel, Package, HeadphonesIcon, Building2, Sun, Moon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const menuItems = [
  { label: "Panel Özeti", path: "/yonetim/panel", icon: LayoutDashboard, permission: null },
  { label: "Firmalar", path: "/yonetim/firmalar", icon: Building2, permission: null },
  { label: "Panel Kullanıcıları", path: "/yonetim/kullanicilar", icon: Users, permission: "kullanici_yonet" as const },
  { label: "Şikayetler", path: "/yonetim/sikayetler", icon: MessageSquareWarning, permission: "sikayet_goruntule" as const },
  { label: "İhaleler", path: "/yonetim/ihaleler", icon: Gavel, permission: "ihale_goruntule" as const },
  { label: "Ürünler", path: "/yonetim/urunler", icon: Package, permission: "urun_goruntule" as const },
  { label: "Destek Talepleri", path: "/yonetim/destek", icon: HeadphonesIcon, permission: "destek_talepleri" as const },
];

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, loading, logout, hasPermission } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [lightMode, setLightMode] = useState(() => {
    return localStorage.getItem("admin-theme") === "light";
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/yonetim");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    localStorage.setItem("admin-theme", lightMode ? "light" : "dark");
  }, [lightMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const visibleMenuItems = menuItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <div className={cn("min-h-screen flex", lightMode ? "admin-light" : "admin-dark")}>
      {/* Sidebar */}
      <aside className={cn(
        "w-64 border-r flex flex-col",
        lightMode ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700"
      )}>
        <div className={cn("p-4 border-b", lightMode ? "border-slate-200" : "border-slate-700")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={cn("text-sm font-bold", lightMode ? "text-slate-900" : "text-white")}>Yönetim Paneli</h2>
              <p className={cn("text-xs", lightMode ? "text-slate-500" : "text-slate-400")}>{user.ad} {user.soyad}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    : lightMode
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={cn("p-3 border-t space-y-1", lightMode ? "border-slate-200" : "border-slate-700")}>
          <Button
            variant="ghost"
            onClick={() => setLightMode(!lightMode)}
            className={cn(
              "w-full justify-start text-xs",
              lightMode ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-slate-700"
            )}
          >
            {lightMode ? <Moon className="w-4 h-4 mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
            {lightMode ? "Koyu Görünüm" : "Aydınlık Görünüm"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => { logout(); navigate("/yonetim"); }}
            className={cn(
              "w-full justify-start",
              lightMode ? "text-slate-500 hover:text-red-600 hover:bg-red-50" : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            )}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className={cn("flex-1 flex flex-col", lightMode ? "bg-slate-50" : "bg-slate-900")}>
        <header className={cn(
          "h-14 flex items-center border-b px-6",
          lightMode ? "bg-white border-slate-200" : "bg-slate-800/50 border-slate-700"
        )}>
          {title && <h1 className={cn("text-lg font-bold", lightMode ? "text-slate-900" : "text-white")}>{title}</h1>}
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
