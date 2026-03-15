import { useEffect, useState, createContext, useContext } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Shield, Users, LogOut, LayoutDashboard, MessageSquareWarning,
  Gavel, Package, HeadphonesIcon, Building2, Sun, Moon, CreditCard, Activity, Menu, Megaphone, Bot, Briefcase, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const AdminThemeContext = createContext<boolean>(false);
export const useAdminTheme = () => useContext(AdminThemeContext);

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const menuItems = [
  { label: "Panel Özeti", path: "/yonetim/panel", icon: LayoutDashboard, permission: null, primaryOnly: false },
  { label: "Firmalar", path: "/yonetim/firmalar-v2", icon: Building2, permission: null, primaryOnly: false },
  { label: "Portföyüm", path: "/yonetim/portfolyo", icon: Briefcase, permission: null, primaryOnly: false },
  { label: "Aksiyonlarım", path: "/yonetim/aksiyonlar", icon: ClipboardList, permission: null, primaryOnly: false },
  { label: "Yaptırımlar", path: "/yonetim/kisitlamalar", icon: Shield, permission: "sikayet_kisitlama" as const },
  { label: "Panel Kullanıcıları", path: "/yonetim/kullanicilar", icon: Users, permission: null, primaryOnly: true },
  { label: "İşlemler", path: "/yonetim/islemler", icon: Activity, permission: null, primaryOnly: true },
  { label: "Şikayetler", path: "/yonetim/sikayetler", icon: MessageSquareWarning, permission: "sikayet_goruntule" as const },
  { label: "İhaleler", path: "/yonetim/ihaleler", icon: Gavel, permission: "ihale_goruntule" as const },
  { label: "Ürünler", path: "/yonetim/urunler", icon: Package, permission: "urun_goruntule" as const },
  { label: "Paket Yönetimi", path: "/yonetim/paketler", icon: CreditCard, permission: "paket_detay_goruntule" as const },
  { label: "Destek Talepleri", path: "/yonetim/destek", icon: HeadphonesIcon, permission: "destek_goruntule" as const },
  { label: "Reklam", path: "/yonetim/reklam", icon: Megaphone, permission: null, primaryOnly: true },
  { label: "TekBot", path: "/yonetim/tekbot", icon: Bot, permission: null, primaryOnly: true },
];

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, loading, logout, hasPermission } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
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
    const root = document.documentElement;
    root.classList.remove("admin-dark", "admin-light");
    root.classList.add(lightMode ? "admin-light" : "admin-dark");
    return () => {
      root.classList.remove("admin-dark", "admin-light");
    };
  }, [lightMode]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(217 33% 12%)" }}>
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.primaryOnly) return user.is_primary;
    if (item.permission) return hasPermission(item.permission);
    return true;
  });

  const t = lightMode;

  const sidebarContent = (
    <>
      <div className="p-4 border-b" style={{ borderColor: `hsl(var(--admin-border))` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate" style={{ color: `hsl(var(--admin-text))` }}>Yönetim Paneli</h2>
            <p className="text-xs truncate" style={{ color: `hsl(var(--admin-muted))` }}>{user.ad} {user.soyad}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive && "bg-amber-500/10 text-amber-600 border border-amber-500/20"
              )}
              style={!isActive ? { color: `hsl(var(--admin-muted))` } : undefined}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = `hsl(var(--admin-hover))`;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t space-y-3" style={{ borderColor: `hsl(var(--admin-border))` }}>
        <div className="flex items-center justify-between px-3 py-1">
          <div className="flex items-center gap-2">
            {lightMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-400" />}
            <span className="text-xs" style={{ color: `hsl(var(--admin-muted))` }}>
              {lightMode ? "Aydınlık" : "Koyu"}
            </span>
          </div>
          <Switch
            checked={lightMode}
            onCheckedChange={setLightMode}
            className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-slate-600"
          />
        </div>

        <Button
          variant="ghost"
          onClick={() => { logout(); navigate("/yonetim"); }}
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Çıkış Yap
        </Button>
      </div>
    </>
  );

  return (
    <AdminThemeContext.Provider value={lightMode}>
      <div className={cn("h-screen flex overflow-hidden", t ? "admin-light" : "admin-dark")}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside
            className="w-64 border-r flex flex-col shrink-0 h-full"
            style={{
              background: `hsl(var(--admin-sidebar))`,
              borderColor: `hsl(var(--admin-border))`,
            }}
          >
            {sidebarContent}
          </aside>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: `hsl(var(--admin-bg))` }}>
          <header
            className="h-14 flex items-center border-b px-4 md:px-6 gap-3 shrink-0"
            style={{
              background: `hsl(var(--admin-header))`,
              borderColor: `hsl(var(--admin-border))`,
            }}
          >
            {isMobile && (
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0" style={{ color: `hsl(var(--admin-text))` }}>
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-64 p-0 flex flex-col"
                  style={{
                    background: `hsl(var(--admin-sidebar))`,
                    borderColor: `hsl(var(--admin-border))`,
                  }}
                >
                  {sidebarContent}
                </SheetContent>
              </Sheet>
            )}
            {title && <h1 className="text-base md:text-lg font-bold truncate" style={{ color: `hsl(var(--admin-text))` }}>{title}</h1>}
          </header>
          <main className="flex-1 overflow-y-auto p-3 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminThemeContext.Provider>
  );
}
