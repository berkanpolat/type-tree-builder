import { useEffect, useState } from "react";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import logoImg from "@/assets/tekstil-as-logo.png";
import {
  Home,
  Building2,
  Gavel,
  FileText,
  ShoppingBag,
  Heart,
  MessageSquare,
  Bell,
  Package,
  Settings,
  LogOut,
  ChevronDown,
  Globe,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Ana Sayfa", url: "/dashboard", icon: Home },
  { title: "Firma Bilgilerim", url: "/firma-bilgilerim", icon: Building2 },
  { title: "Manuİhale", url: "/manuihale", icon: Gavel },
  { title: "Tekliflerim", url: "/tekliflerim", icon: FileText },
  { title: "ManuPazar", url: "/manupazar", icon: ShoppingBag },
  { title: "Favoriler", url: "/favoriler", icon: Heart },
  { title: "Mesajlar", url: "/mesajlar", icon: MessageSquare, badgeKey: "mesajlar" },
  { title: "Bildirimler", url: "/bildirimler", icon: Bell, badge: true },
  { title: "Paketler", url: "/paketler", icon: Package },
];

const bottomItems = [
  { title: "Ayarlar", url: "/ayarlar", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Çıkış yapıldı" });
    navigate("/giris-kayit");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      {/* User email dropdown area */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-1 text-xs text-sidebar-foreground/60 border border-sidebar-border rounded-md px-2 py-1.5">
            <span className="truncate flex-1">{userEmail || "..."}</span>
            <ChevronDown className="w-3 h-3 shrink-0" />
          </div>
          <p className="text-[10px] text-sidebar-foreground/50 mt-1 px-0.5 truncate">{userEmail}</p>
        </div>
      )}

      {/* Logo */}
      <div className="px-4 pt-2 pb-3 flex items-center gap-2">
        <Link to="/anasayfa" className="flex items-center gap-2">
          {!collapsed ? (
            <img src={logoImg} alt="Tekstil A.Ş." className="h-8 object-contain" />
          ) : (
            <div className="w-7 h-7 rounded-full overflow-hidden">
              <img src={logoImg} alt="Tekstil A.Ş." className="h-full object-contain" />
            </div>
          )}
        </Link>
        {!collapsed && (
          <Link
            to="/anasayfa"
            className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
            title="Ana Sayfaya Git"
          >
            <Globe className="w-4 h-4 text-sidebar-foreground/60" />
          </Link>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:text-secondary-foreground"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <span className="flex-1">{item.title}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                          0
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  activeClassName="bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:text-secondary-foreground"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Çıkış</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
