import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useLastSeen } from "@/hooks/use-last-seen";
import QuotaReminderBadge from "@/components/QuotaReminderBadge";
import MobileBackButton from "@/components/MobileBackButton";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

function MobileMenuButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="md:hidden flex items-center gap-1.5 mr-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/60 shadow-sm text-foreground active:scale-95 transition-transform"
    >
      <Menu className="h-4 w-4" />
      <span className="text-xs font-medium">Menü</span>
    </button>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  useLastSeen();
  return (
    <SidebarProvider>
      <div className="h-[100dvh] flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-12 md:h-14 flex items-center border-b bg-background px-3 md:px-6 shrink-0">
            <MobileMenuButton />
            <SidebarTrigger className="hidden md:inline-flex mr-2 h-8 w-8" />
            <MobileBackButton />
            {title && (
              <h1 className="text-base md:text-lg font-bold text-foreground truncate">{title}</h1>
            )}
            <div className="ml-auto">
              <QuotaReminderBadge />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted/30 p-3 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
