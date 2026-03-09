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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
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
  { title: "Mesajlar", url: "/mesajlar", icon: MessageSquare },
  { title: "Bildirimler", url: "/bildirimler", icon: Bell },
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Çıkış yapıldı" });
    navigate("/giris-kayit");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 flex items-center gap-2">
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-primary-foreground">
            Tekstil A.Ş.
          </span>
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
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
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
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  activeClassName="bg-primary text-primary-foreground hover:bg-primary/90"
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
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
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
