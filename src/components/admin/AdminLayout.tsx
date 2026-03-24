import { useEffect, useState, useMemo, useCallback, createContext, useContext } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Shield, Users, LogOut, LayoutDashboard, MessageSquareWarning,
  Gavel, Package, HeadphonesIcon, Building2, Menu, Megaphone, Bot, Briefcase, ClipboardList, MapPin, Target, Map, BarChart3, FileBarChart, CalendarDays, Gauge, FlaskConical, Server, Globe, GitBranch, CreditCard, Activity, UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// Title context so child pages can set the header title
const AdminTitleContext = createContext<{ title: string; setTitle: (t: string) => void }>({ title: "", setTitle: () => {} });

export function useAdminTitle(title: string) {
  const { setTitle } = useContext(AdminTitleContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title, setTitle]);
}

// Keep backward compat export (no-op now, always light)
export const useAdminTheme = () => false;

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

type MenuItem = { label: string; path: string; icon: React.ElementType; permission: string | null; primaryOnly: boolean };
type MenuGroup = { groupLabel: string | null; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  {
    groupLabel: null,
    items: [
      { label: "Panel Özeti", path: "/yonetim", icon: LayoutDashboard, permission: null, primaryOnly: false },
      { label: "Firmalar", path: "/yonetim/firmalar", icon: Building2, permission: "firma_goruntule", primaryOnly: false },
    ],
  },
  {
    groupLabel: "Web Site",
    items: [
      { label: "İhaleler", path: "/yonetim/ihaleler", icon: Gavel, permission: "ihale_goruntule", primaryOnly: false },
      { label: "Ürünler", path: "/yonetim/urunler", icon: Package, permission: "urun_goruntule", primaryOnly: false },
      { label: "Destek Talepleri", path: "/yonetim/destek", icon: HeadphonesIcon, permission: "destek_goruntule", primaryOnly: false },
      { label: "Şikayetler", path: "/yonetim/sikayetler", icon: MessageSquareWarning, permission: "sikayet_goruntule", primaryOnly: false },
      { label: "Yaptırımlar", path: "/yonetim/kisitlamalar", icon: Shield, permission: "yaptirim_goruntule", primaryOnly: false },
    ],
  },
  {
    groupLabel: "CRM",
    items: [
      { label: "Portföyüm", path: "/yonetim/portfolyo", icon: Briefcase, permission: "portfolyo_goruntule", primaryOnly: false },
      { label: "Aksiyonlarım", path: "/yonetim/aksiyonlar", icon: ClipboardList, permission: "aksiyon_goruntule", primaryOnly: false },
      { label: "Ziyaret Planları", path: "/yonetim/ziyaret-planlari", icon: MapPin, permission: "ziyaret_goruntule", primaryOnly: false },
      { label: "PKL & Primler", path: "/yonetim/hedefler", icon: Target, permission: "hedef_goruntule", primaryOnly: false },
      { label: "Ajanda", path: "/yonetim/ajanda", icon: CalendarDays, permission: null, primaryOnly: false },
    ],
  },
  {
    groupLabel: "Yönetim",
    items: [
      { label: "Panel Kullanıcıları", path: "/yonetim/kullanicilar", icon: Users, permission: "kullanici_goruntule", primaryOnly: false },
      { label: "Yetkilendirme", path: "/yonetim/yetkilendirme", icon: Shield, permission: "kullanici_goruntule", primaryOnly: false },
      { label: "İşlemler", path: "/yonetim/islemler", icon: Activity, permission: "islem_goruntule", primaryOnly: false },
      { label: "Canlı Harita", path: "/yonetim/canli-harita", icon: Map, permission: "harita_goruntule", primaryOnly: false },
      { label: "Paket Yönetimi", path: "/yonetim/paketler", icon: CreditCard, permission: "paket_detay_goruntule", primaryOnly: false },
      { label: "Reklam", path: "/yonetim/reklam", icon: Megaphone, permission: "reklam_goruntule", primaryOnly: false },
      { label: "TekBot", path: "/yonetim/tekbot", icon: Bot, permission: "tekbot_goruntule", primaryOnly: false },
      { label: "SEO", path: "/yonetim/seo", icon: Globe, permission: "seo_goruntule", primaryOnly: false },
      { label: "Kaynak Raporu", path: "/yonetim/kaynak-raporu", icon: BarChart3, permission: null, primaryOnly: true },
      { label: "Raporlar", path: "/yonetim/raporlar", icon: FileBarChart, permission: "rapor_goruntule", primaryOnly: false },
      { label: "Performans", path: "/yonetim/performans", icon: Gauge, permission: null, primaryOnly: true },
      { label: "Test Merkezi", path: "/yonetim/test-merkezi", icon: FlaskConical, permission: null, primaryOnly: false },
      { label: "Sistem Logları", path: "/yonetim/sistem-loglari", icon: Server, permission: "islem_goruntule", primaryOnly: false },
      { label: "Versiyonlar", path: "/yonetim/versiyonlar", icon: GitBranch, permission: null, primaryOnly: true },
    ],
  },
];

export default function AdminLayout({ children, title: propTitle }: AdminLayoutProps) {
  const { user, loading, logout, hasPermission, isImpersonating, impersonatedUser, stopImpersonating, originalUser } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contextTitle, setContextTitle] = useState("");

  const displayTitle = propTitle || contextTitle;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/yonetim/giris");
    }
  }, [user, loading, navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Ensure portal-rendered elements (dropdown, popover, select, context menu)
  // have solid opaque backgrounds by overriding :root CSS variables for admin pages
  useEffect(() => {
    const root = document.documentElement;
    // Standard shadcn tokens for portal elements
    root.style.setProperty("--popover", "0 0% 100%");
    root.style.setProperty("--popover-foreground", "228 49% 24%");
    root.style.setProperty("--background", "0 0% 100%");
    root.style.setProperty("--foreground", "228 49% 24%");
    root.style.setProperty("--card", "0 0% 100%");
    root.style.setProperty("--card-foreground", "228 49% 24%");
    root.style.setProperty("--muted", "220 20% 96%");
    root.style.setProperty("--muted-foreground", "0 0% 40%");
    root.style.setProperty("--accent", "32 92% 54%");
    root.style.setProperty("--accent-foreground", "0 0% 100%");
    root.style.setProperty("--border", "220 20% 90%");
    // Admin-specific tokens for portal-rendered admin dialogs/popovers
    root.style.setProperty("--admin-bg", "220 14% 96%");
    root.style.setProperty("--admin-sidebar", "0 0% 100%");
    root.style.setProperty("--admin-card-bg", "0 0% 100%");
    root.style.setProperty("--admin-header", "0 0% 100%");
    root.style.setProperty("--admin-text", "217 33% 17%");
    root.style.setProperty("--admin-text-secondary", "215 16% 47%");
    root.style.setProperty("--admin-muted", "215 16% 57%");
    root.style.setProperty("--admin-border", "220 13% 91%");
    root.style.setProperty("--admin-input-bg", "220 14% 96%");
    root.style.setProperty("--admin-hover", "220 14% 93%");
    root.classList.add("admin-portal-fix");
    return () => {
      const props = [
        "--popover", "--popover-foreground", "--background", "--foreground",
        "--card", "--card-foreground", "--muted", "--muted-foreground",
        "--accent", "--accent-foreground", "--border",
        "--admin-bg", "--admin-sidebar", "--admin-card-bg", "--admin-header",
        "--admin-text", "--admin-text-secondary", "--admin-muted",
        "--admin-border", "--admin-input-bg", "--admin-hover",
      ];
      props.forEach((p) => root.style.removeProperty(p));
      root.classList.remove("admin-portal-fix");
    };
  }, []);

  const visibleGroups = useMemo(() => {
    if (!user) return [];
    const filterItem = (item: MenuItem) => {
      const checkUser = originalUser || user;
      if (item.primaryOnly) return checkUser?.is_primary ?? false;
      if (item.permission) return hasPermission(item.permission as any);
      return true;
    };
    return menuGroups
      .map((g) => ({ ...g, items: Array.isArray(g.items) ? g.items.filter(filterItem) : [] }))
      .filter((g) => Array.isArray(g.items) && g.items.length > 0);
  }, [user, originalUser, hasPermission]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const renderLink = (item: MenuItem) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {item.label}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate text-foreground">Yönetim Paneli</h2>
            <p className="text-xs truncate text-muted-foreground">{user.ad} {user.soyad}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleGroups.map((group, gi) => (
          <div key={gi}>
            {group.groupLabel && (
              <>
                {gi > 0 && <div className="my-2 border-t border-border" />}
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.groupLabel}
                </p>
              </>
            )}
            {group.items.map(renderLink)}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
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
    <AdminTitleContext.Provider value={{ title: contextTitle, setTitle: setContextTitle }}>
      <div className="admin-light h-screen flex overflow-hidden bg-muted/30">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-64 border-r border-border flex flex-col shrink-0 h-full bg-background">
            {sidebarContent}
          </aside>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Impersonation Banner */}
          {isImpersonating && impersonatedUser && (
            <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-amber-50 border-b border-amber-200">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  {impersonatedUser.ad} {impersonatedUser.soyad} olarak görüntülüyorsunuz
                </span>
                <span className="text-xs text-amber-600/70">
                  ({impersonatedUser.departman} — {impersonatedUser.pozisyon})
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { stopImpersonating(); navigate("/yonetim/kullanicilar"); }}
                className="text-xs border-amber-400 text-amber-700 hover:bg-amber-100"
              >
                Kendi Hesabıma Dön
              </Button>
            </div>
          )}

          <header className="h-14 flex items-center border-b border-border px-4 md:px-6 gap-3 shrink-0 bg-background">
            {isMobile && (
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 flex flex-col bg-background border-border">
                  {sidebarContent}
                </SheetContent>
              </Sheet>
            )}
            {displayTitle && <h1 className="text-base md:text-lg font-bold truncate text-foreground">{displayTitle}</h1>}
          </header>
          <main className="flex-1 overflow-y-auto p-3 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminTitleContext.Provider>
  );
}
