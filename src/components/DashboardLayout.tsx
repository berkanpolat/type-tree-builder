import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell } from "lucide-react";
import { useNotificationCount } from "@/hooks/use-notifications";
import HeaderMessagePanel from "@/components/header/HeaderMessagePanel";
import HeaderFavoritesPanel from "@/components/header/HeaderFavoritesPanel";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const unreadNotifications = useNotificationCount();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-6">
            <SidebarTrigger className="mr-4" />
            {title && (
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
            )}
            <div className="ml-auto flex items-center gap-1">
              <HeaderFavoritesPanel />
              <HeaderMessagePanel />
              <button
                onClick={() => navigate("/bildirimler")}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
