import { useEffect, useState } from "react";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useNotificationCount } from "@/hooks/use-notifications";
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
  Headphones,
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
  { title: "Tekİhale", url: "/ihalelerim", icon: Gavel },
  { title: "Tekliflerim", url: "/tekliflerim", icon: FileText },
  { title: "TekPazar", url: "/urunlerim", icon: ShoppingBag },
  { title: "Favoriler", url: "/favoriler", icon: Heart },
  { title: "Mesajlar", url: "/mesajlar", icon: MessageSquare, badgeKey: "mesajlar" },
  { title: "Bildirimler", url: "/bildirimler", icon: Bell, badge: true },
  { title: "Paketim", url: "/paketim", icon: Package },
  { title: "Destek", url: "/destek", icon: Headphones },
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
  const unreadMessages = useUnreadMessages();
  const unreadNotifications = useNotificationCount();

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
      {/* Logo */}
      <div className="px-4 pt-4 pb-4 flex items-center gap-2 border-b border-sidebar-border mb-1">
        <Link to="/tekpazar" className="flex items-center gap-2">
          {!collapsed ? (
            <img src={logoImg} alt="Tekstil A.Ş." className="h-6 object-contain" />
          ) : (
            <div className="w-6 h-6 rounded-full overflow-hidden">
              <img src={logoImg} alt="Tekstil A.Ş." className="h-full object-contain" />
            </div>
          )}
        </Link>
        {!collapsed && (
          <Link
            to="/tekpazar"
            className="ml-auto p-1 rounded-md hover:bg-sidebar-accent transition-colors"
            title="Ana Sayfaya Git"
          >
            <Globe className="w-4 h-4 text-sidebar-foreground/40" />
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
                      {!collapsed && item.badgeKey === "mesajlar" && unreadMessages > 0 && (
                        <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                          {unreadMessages > 99 ? "99+" : unreadMessages}
                        </span>
                      )}
                      {!collapsed && item.badge && unreadNotifications > 0 && (
                        <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                          {unreadNotifications > 99 ? "99+" : unreadNotifications}
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
