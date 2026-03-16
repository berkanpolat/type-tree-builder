import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
}

export default function ReportKPICard({ title, value, subtitle, icon: Icon, color }: Props) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: `hsl(var(--admin-card))`, borderColor: `hsl(var(--admin-border))` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: `hsl(var(--admin-muted))` }}>{title}</span>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: `hsl(var(--admin-text))` }}>{value}</div>
      {subtitle && <p className="text-xs mt-1" style={{ color: `hsl(var(--admin-muted))` }}>{subtitle}</p>}
    </div>
  );
}
