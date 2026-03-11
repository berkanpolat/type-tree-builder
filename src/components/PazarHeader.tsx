import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/tekstil-as-logo.png";
import {
  ChevronDown,
  LayoutDashboard,
  HelpCircle,
  LogOut,
  Building2,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/anasayfa">
            <img src={logoImg} alt="Tekstil A.Ş." className="h-7 object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/tekrehber" className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors">TekRehber</Link>
            <Link to="/anasayfa" className="text-sm font-medium text-foreground hover:text-secondary transition-colors">TekPazar</Link>
            <Link to="/tekihale" className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors">Tekİhale</Link>
          </nav>
        </div>

        {/* Right side: icons + user menu */}
        <div className="flex items-center gap-1">
          {/* Social media icons */}
          <div className="hidden md:flex items-center gap-1 mr-1">
            <a href="https://www.linkedin.com/company/tekstilas/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>
            <a href="https://www.instagram.com/tekstilascom/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://www.facebook.com/tekstilas" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>

          <div className="hidden md:block w-px h-6 bg-border mr-1" />

          {/* Favorites */}
          <HeaderFavoritesPanel />

          {/* Messages */}
          <HeaderMessagePanel />

          {/* Notifications */}
          {/* Notifications */}
          <HeaderNotificationsPanel />

          {/* Quota */}
          <QuotaReminderBadge />

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-2" />

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
                {firmaLogoUrl ? (
                  <img src={firmaLogoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="hidden md:block text-sm font-medium text-foreground truncate max-w-[200px]">
                {firmaUnvani}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
