import { Link, useLocation } from "react-router-dom";
import { Building2, ShoppingBag, Gavel, User } from "lucide-react";

const tabs = [
  { label: "Rehber", path: "/firmalar", icon: Building2 },
  { label: "Pazar", path: "/tekpazar", icon: ShoppingBag },
  { label: "İhale", path: "/ihaleler", icon: Gavel },
  { label: "Giriş", path: "/giris-kayit", icon: User },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
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
