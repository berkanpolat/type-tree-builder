import { Link, useLocation } from "react-router-dom";
import { Building2, ShoppingBag, Gavel, LayoutDashboard, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const navTabs = [
  { label: "Rehber", path: "/firmalar", icon: Building2 },
  { label: "Pazar", path: "/tekpazar", icon: ShoppingBag },
  { label: "İhale", path: "/ihaleler", icon: Gavel },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const lastTab = isLoggedIn
    ? { label: "Panel", path: "/dashboard", icon: LayoutDashboard }
    : { label: "Giriş", path: "/giris-kayit", icon: LogIn };

  const allTabs = [...navTabs, lastTab];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around h-14">
        {allTabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-colors ${
                active ? "text-secondary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
