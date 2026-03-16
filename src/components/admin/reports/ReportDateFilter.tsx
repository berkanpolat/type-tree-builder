import { useState } from "react";
import { format, subDays, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

const presets = [
  { label: "Bu Hafta", getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
  { label: "Bu Ay", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Bu Çeyrek", getRange: () => ({ from: startOfQuarter(new Date()), to: new Date() }) },
  { label: "Bu Yıl", getRange: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: "Son 30 Gün", getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Son 90 Gün", getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
];

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function ReportDateFilter({ value, onChange }: Props) {
  const [activePreset, setActivePreset] = useState<string>("Bu Ay");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Button
          key={p.label}
          size="sm"
          variant={activePreset === p.label ? "default" : "outline"}
          className={cn("text-xs h-8", activePreset === p.label && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500")}
          onClick={() => {
            setActivePreset(p.label);
            onChange(p.getRange());
          }}
        >
          {p.label}
        </Button>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" />
            {format(value.from, "dd MMM", { locale: tr })} – {format(value.to, "dd MMM yyyy", { locale: tr })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setActivePreset("");
                onChange({ from: range.from, to: range.to });
              } else if (range?.from) {
                setActivePreset("");
                onChange({ from: range.from, to: range.from });
              }
            }}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
            locale={tr}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
