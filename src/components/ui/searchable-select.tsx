import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useLocation, useNavigationType } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

const normalizeOptionText = (value: string) =>
  value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export default function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Seçiniz",
  searchPlaceholder = "Ara...",
  disabled = false,
  className,
  triggerClassName,
}: SearchableSelectProps) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const persistId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const normalizedOptions = React.useMemo(() => {
    const belirtmek: SearchableSelectOption[] = [];
    const diger: SearchableSelectOption[] = [];
    const rest: SearchableSelectOption[] = [];

    for (const option of options) {
      const normalized = normalizeOptionText(option.label);

      if (normalized.includes("belirtmek istemiyorum")) {
        belirtmek.push(option);
      } else if (
        normalized === "diger" ||
        normalized.startsWith("diger ") ||
        normalized.startsWith("diger-") ||
        normalized.startsWith("diger/") ||
        normalized.startsWith("diger(")
      ) {
        diger.push(option);
      } else {
        rest.push(option);
      }
    }

    return [...belirtmek, ...rest, ...diger];
  }, [options]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const normalizedSearch = normalizeOptionText(search);
    return normalizedOptions.filter((o) => normalizeOptionText(o.label).includes(normalizedSearch));
  }, [normalizedOptions, search]);

  const selectedLabel = normalizedOptions.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !value && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", className)} align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ScrollArea className="max-h-60">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Sonuç bulunamadı</div>
          ) : (
            <div className="p-1">
              {filtered.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === option.value && "bg-accent"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
