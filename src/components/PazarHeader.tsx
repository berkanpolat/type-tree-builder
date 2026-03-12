import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/tekstil-as-logo.png";
import {
  ChevronDown,
  LayoutDashboard,
  HelpCircle,
  LogOut,
  Building2,
  Menu,
  X,
} from "lucide-react";
import { useNotificationCount } from "@/hooks/use-notifications";
import HeaderMessagePanel from "@/components/header/HeaderMessagePanel";
import HeaderFavoritesPanel from "@/components/header/HeaderFavoritesPanel";
import HeaderNotificationsPanel from "@/components/header/HeaderNotificationsPanel";
import QuotaReminderBadge from "@/components/QuotaReminderBadge";

interface PazarHeaderProps {
  firmaUnvani: string;
  firmaLogoUrl?: string | null;
}

export default function PazarHeader({ firmaUnvani, firmaLogoUrl }: PazarHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname.startsWith(path);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/giris-kayit");
  };

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Yardım", icon: HelpCircle, path: "/sss" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/tekpazar">
            <img src={logoImg} alt="Tekstil A.Ş." className="h-6 md:h-7 object-contain" />
          </Link>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/firmalar" className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors">TekRehber</Link>
            <Link to="/tekpazar" className="text-sm font-medium text-foreground hover:text-secondary transition-colors">TekPazar</Link>
            <Link to="/ihaleler" className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors">Tekİhale</Link>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Mobile nav links */}
          <nav className="flex md:hidden items-center gap-1 mr-1">
            <Link to="/firmalar" className="text-[11px] font-medium text-muted-foreground px-1.5 py-1 rounded hover:bg-muted">Rehber</Link>
            <Link to="/tekpazar" className="text-[11px] font-medium text-foreground px-1.5 py-1 rounded bg-muted">Pazar</Link>
            <Link to="/ihaleler" className="text-[11px] font-medium text-muted-foreground px-1.5 py-1 rounded hover:bg-muted">İhale</Link>
          </nav>

          {/* Icons */}
          <HeaderFavoritesPanel />
          <HeaderMessagePanel />
          <HeaderNotificationsPanel />

          {/* Quota - hide on very small screens */}
          <div className="hidden sm:block">
            <QuotaReminderBadge />
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1 md:mx-2" />

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 md:gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
                {firmaLogoUrl ? (
                  <img src={firmaLogoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                )}
              </div>
              <span className="hidden md:block text-sm font-medium text-foreground truncate max-w-[200px]">
                {firmaUnvani}
              </span>
              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-lg py-2 z-50">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setMenuOpen(false); navigate(item.path); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
