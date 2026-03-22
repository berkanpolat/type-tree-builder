import { cn } from "@/lib/utils";
import type { TabItem } from "@/pages/FirmaBilgilerim";
import ScrollHintWrapper from "@/components/ScrollHintWrapper";

interface FirmaTabMenuProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export default function FirmaTabMenu({ tabs, activeTab, onTabChange }: FirmaTabMenuProps) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-center justify-center gap-0 overflow-x-auto py-2">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <div key={tab.id} className="flex items-center">
              {index > 0 && <div className="w-8 h-px bg-border shrink-0" />}
              <button onClick={() => onTabChange(tab.id)} className="flex flex-col items-center gap-1.5 group w-[90px]">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors", isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground group-hover:border-primary/50")}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn("text-[11px] leading-tight text-center whitespace-pre-line w-[90px] h-[28px] flex items-center justify-center", isActive ? "text-primary font-semibold" : "text-muted-foreground")}>{tab.label}</span>
              </button>
            </div>
          );
        })}
      </div>
      {/* Mobile with scroll hint */}
      <ScrollHintWrapper>
        <div className="flex items-center gap-0 py-2">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab;
            const Icon = tab.icon;
            return (
              <div key={tab.id} className="flex items-center">
                {index > 0 && <div className="w-6 h-px bg-border shrink-0" />}
                <button onClick={() => onTabChange(tab.id)} className="flex flex-col items-center gap-1 group w-[72px] shrink-0">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors", isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground group-hover:border-primary/50")}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={cn("text-[10px] leading-tight text-center whitespace-pre-line w-[72px] flex items-center justify-center", isActive ? "text-primary font-semibold" : "text-muted-foreground")}>{tab.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </ScrollHintWrapper>
    </>
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <div key={tab.id} className="flex items-center">
            {/* Connector line */}
            {index > 0 && (
              <div className="w-8 h-px bg-border shrink-0" />
            )}
            {/* Tab button */}
            <button
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1.5 group w-[90px]"
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground group-hover:border-primary/50"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-[11px] leading-tight text-center whitespace-pre-line w-[90px] h-[28px] flex items-center justify-center",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {tab.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
