import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CountryCode {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: "TR", name: "Türkiye", dial: "+90", flag: "🇹🇷" },
  { code: "US", name: "ABD", dial: "+1", flag: "🇺🇸" },
  { code: "GB", name: "Birleşik Krallık", dial: "+44", flag: "🇬🇧" },
  { code: "DE", name: "Almanya", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "Fransa", dial: "+33", flag: "🇫🇷" },
  { code: "IT", name: "İtalya", dial: "+39", flag: "🇮🇹" },
  { code: "ES", name: "İspanya", dial: "+34", flag: "🇪🇸" },
  { code: "NL", name: "Hollanda", dial: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belçika", dial: "+32", flag: "🇧🇪" },
  { code: "AT", name: "Avusturya", dial: "+43", flag: "🇦🇹" },
  { code: "CH", name: "İsviçre", dial: "+41", flag: "🇨🇭" },
  { code: "SE", name: "İsveç", dial: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norveç", dial: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Danimarka", dial: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finlandiya", dial: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Polonya", dial: "+48", flag: "🇵🇱" },
  { code: "CZ", name: "Çekya", dial: "+420", flag: "🇨🇿" },
  { code: "GR", name: "Yunanistan", dial: "+30", flag: "🇬🇷" },
  { code: "PT", name: "Portekiz", dial: "+351", flag: "🇵🇹" },
  { code: "RO", name: "Romanya", dial: "+40", flag: "🇷🇴" },
  { code: "BG", name: "Bulgaristan", dial: "+359", flag: "🇧🇬" },
  { code: "HU", name: "Macaristan", dial: "+36", flag: "🇭🇺" },
  { code: "RU", name: "Rusya", dial: "+7", flag: "🇷🇺" },
  { code: "UA", name: "Ukrayna", dial: "+380", flag: "🇺🇦" },
  { code: "AZ", name: "Azerbaycan", dial: "+994", flag: "🇦🇿" },
  { code: "GE", name: "Gürcistan", dial: "+995", flag: "🇬🇪" },
  { code: "SA", name: "Suudi Arabistan", dial: "+966", flag: "🇸🇦" },
  { code: "AE", name: "BAE", dial: "+971", flag: "🇦🇪" },
  { code: "EG", name: "Mısır", dial: "+20", flag: "🇪🇬" },
  { code: "MA", name: "Fas", dial: "+212", flag: "🇲🇦" },
  { code: "TN", name: "Tunus", dial: "+216", flag: "🇹🇳" },
  { code: "CN", name: "Çin", dial: "+86", flag: "🇨🇳" },
  { code: "JP", name: "Japonya", dial: "+81", flag: "🇯🇵" },
  { code: "KR", name: "Güney Kore", dial: "+82", flag: "🇰🇷" },
  { code: "IN", name: "Hindistan", dial: "+91", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladeş", dial: "+880", flag: "🇧🇩" },
  { code: "IR", name: "İran", dial: "+98", flag: "🇮🇷" },
  { code: "IQ", name: "Irak", dial: "+964", flag: "🇮🇶" },
  { code: "IL", name: "İsrail", dial: "+972", flag: "🇮🇱" },
  { code: "BR", name: "Brezilya", dial: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Meksika", dial: "+52", flag: "🇲🇽" },
  { code: "AU", name: "Avustralya", dial: "+61", flag: "🇦🇺" },
  { code: "CA", name: "Kanada", dial: "+1", flag: "🇨🇦" },
  { code: "UZ", name: "Özbekistan", dial: "+998", flag: "🇺🇿" },
  { code: "TM", name: "Türkmenistan", dial: "+993", flag: "🇹🇲" },
  { code: "KZ", name: "Kazakistan", dial: "+7", flag: "🇰🇿" },
  { code: "KG", name: "Kırgızistan", dial: "+996", flag: "🇰🇬" },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export default function CountryCodeSelect({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = COUNTRY_CODES.find((c) => c.dial === value) || COUNTRY_CODES[0];

  const filtered = useMemo(() => {
    if (!search) return COUNTRY_CODES;
    const q = search.toLowerCase();
    return COUNTRY_CODES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-[100px] justify-between px-2 shrink-0"
          type="button"
        >
          <span className="flex items-center gap-1 text-sm">
            <span>{selected.flag}</span>
            <span>{selected.dial}</span>
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0 bg-popover z-50" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ülke ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="h-[200px]">
          {filtered.map((country) => (
            <button
              key={country.code + country.dial}
              type="button"
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left",
                value === country.dial && "bg-muted"
              )}
              onClick={() => {
                onChange(country.dial);
                setOpen(false);
                setSearch("");
              }}
            >
              <span>{country.flag}</span>
              <span className="flex-1">{country.name}</span>
              <span className="text-muted-foreground">{country.dial}</span>
              {value === country.dial && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sonuç bulunamadı</p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
