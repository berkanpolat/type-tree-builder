import { useState, useRef, useEffect } from "react";
import MobileBackButton from "@/components/MobileBackButton";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/tekstil-as-logo.png";
import {
  ChevronDown,
  LayoutDashboard,
  HelpCircle,
  LogOut,
  Menu,
  X,
  LogIn,
} from "lucide-react";
import { useNotificationCount } from "@/hooks/use-notifications";
import HeaderMessagePanel from "@/components/header/HeaderMessagePanel";
import HeaderFavoritesPanel from "@/components/header/HeaderFavoritesPanel";
import HeaderNotificationsPanel from "@/components/header/HeaderNotificationsPanel";
import QuotaReminderBadge from "@/components/QuotaReminderBadge";
import { Button } from "@/components/ui/button";
import FirmaAvatar from "@/components/FirmaAvatar";

interface PazarHeaderProps {
  firmaUnvani: string;
  firmaLogoUrl?: string | null;
}

export default function PazarHeader({ firmaUnvani: propUnvani, firmaLogoUrl: propLogoUrl }: PazarHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [ownFirma, setOwnFirma] = useState<{ firma_unvani: string; logo_url: string | null } | null>(null);

  const firmaUnvani = propUnvani || ownFirma?.firma_unvani || "";
  const firmaLogoUrl = propLogoUrl !== undefined ? propLogoUrl : ownFirma?.logo_url;

  const isActive = (path: string) => location.pathname.startsWith(path);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
      if (session?.user) {
        supabase
          .from("firmalar")
          .select("firma_unvani, logo_url")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setOwnFirma(data);
          });
      }
    });
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
        <div className="flex items-center gap-2 md:gap-8">
          <MobileBackButton />
          <Link to="/tekpazar">
            <img src={logoImg} alt="Tekstil A.Ş." className="h-6 md:h-7 object-contain" />
          </Link>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/firmalar" className={`text-sm font-medium transition-colors ${isActive("/firmalar") ? "text-secondary border-b-2 border-secondary pb-0.5" : "text-muted-foreground hover:text-secondary"}`}>TekRehber</Link>
            <Link to="/tekpazar" className={`text-sm font-medium transition-colors ${isActive("/tekpazar") ? "text-secondary border-b-2 border-secondary pb-0.5" : "text-muted-foreground hover:text-secondary"}`}>TekPazar</Link>
            <Link to="/ihaleler" className={`text-sm font-medium transition-colors ${isActive("/ihaleler") ? "text-secondary border-b-2 border-secondary pb-0.5" : "text-muted-foreground hover:text-secondary"}`}>Tekİhale</Link>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">

          {isLoggedIn ? (
            <>
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
                  <FirmaAvatar
                    firmaUnvani={firmaUnvani || "Firma"}
                    logoUrl={firmaLogoUrl}
                    size="sm"
                    className="w-7 h-7 md:w-8 md:h-8 border border-border"
                  />
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
            </>
          ) : isLoggedIn === false ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate("/giris-kayit")}
              className="flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Giriş Yap</span>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
