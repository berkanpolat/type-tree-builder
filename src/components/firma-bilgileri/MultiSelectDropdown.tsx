import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

interface Props {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MultiSelectDropdown({ options, selected, onChange, placeholder = "Seçiniz", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const selectedNames = options.filter(o => selected.includes(o.id)).map(o => o.name);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="flex flex-wrap gap-1 flex-1 text-left">
          {selectedNames.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
          {selectedNames.map(name => (
            <span key={name} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {name}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={e => { e.stopPropagation(); toggle(options.find(o => o.name === name)!.id); }}
              />
            </span>
          ))}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {options.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <div className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                selected.includes(opt.id) ? "bg-primary text-primary-foreground" : "opacity-50"
              )}>
                {selected.includes(opt.id) && <Check className="h-3 w-3" />}
              </div>
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
