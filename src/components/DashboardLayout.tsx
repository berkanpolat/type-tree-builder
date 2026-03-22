import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useLastSeen } from "@/hooks/use-last-seen";
import QuotaReminderBadge from "@/components/QuotaReminderBadge";
import MobileBackButton from "@/components/MobileBackButton";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  useLastSeen();
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 flex items-center border-b bg-background px-4 md:px-6 shrink-0">
            <SidebarTrigger className="mr-4" />
            {title && (
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
            )}
            <div className="ml-auto">
              <QuotaReminderBadge />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
