import { useMemo } from "react";
import { cn } from "@/lib/utils";

const KISALTMA_KELIMELERI = [
  "san", "san.", "dış", "dis", "tic", "tic.", "ltd", "ltd.", "şti", "sti",
  "aş", "a.ş", "a.ş.", "a.s.", "a.s", "as", "ve", "ve.", "gıda", "gida",
  "iç", "ic", "paz", "paz.", "müh", "muh", "ins", "inş", "dan", "dan.",
  "org", "tur", "ith", "ihr", "tek", "nak", "kim", "oto", "elk",
  "bil", "giy", "teks", "koz", "mob", "end", "mak", "hay",
];

const AVATAR_COLORS = [
  { bg: "hsl(24, 95%, 53%)", fg: "#fff" },   // turuncu
  { bg: "hsl(220, 70%, 45%)", fg: "#fff" },   // lacivert
  { bg: "hsl(160, 60%, 40%)", fg: "#fff" },   // yeşil
  { bg: "hsl(340, 65%, 50%)", fg: "#fff" },   // pembe-kırmızı
  { bg: "hsl(270, 50%, 50%)", fg: "#fff" },   // mor
  { bg: "hsl(200, 70%, 45%)", fg: "#fff" },   // mavi
  { bg: "hsl(45, 85%, 48%)", fg: "#fff" },    // altın sarı
  { bg: "hsl(10, 70%, 50%)", fg: "#fff" },    // kızıl
  { bg: "hsl(180, 55%, 40%)", fg: "#fff" },   // teal
  { bg: "hsl(300, 40%, 45%)", fg: "#fff" },   // eflatun
];

const FACTORY_ICON_URL = "https://3ec4e864fb14267d6ec2c165d3e0214a.cdn.bubble.io/f1771401095822x404156736390628400/bos_firma.png";

function isFactoryIcon(url: string | null | undefined): boolean {
  if (!url) return true;
  return url.includes("bos_firma.png");
}

function generateInitials(firmaUnvani: string): string {
  if (!firmaUnvani) return "?";
  
  const words = firmaUnvani.trim().split(/\s+/);
  const meaningfulWords = words.filter(
    (w) => !KISALTMA_KELIMELERI.includes(w.toLowerCase().replace(/\.$/, "").replace(/\.$/, ""))
      && !KISALTMA_KELIMELERI.includes(w.toLowerCase())
  );

  if (meaningfulWords.length >= 2) {
    return (meaningfulWords[0][0] + meaningfulWords[1][0]).toUpperCase();
  }

  // Tek anlamlı kelime → ünsüzlerden kısaltma
  const word = meaningfulWords[0] || words[0];
  if (!word) return "?";

  const turkishVowels = "aeıioöuüAEIİOÖUÜ";
  const firstChar = word[0].toUpperCase();
  const consonants = word
    .slice(1)
    .split("")
    .filter((c) => !turkishVowels.includes(c) && /[a-zA-ZçğışşöüÇĞİŞÖÜ]/i.test(c));

  if (consonants.length >= 2) {
    return (firstChar + consonants[0] + consonants[1]).toUpperCase();
  }
  if (consonants.length === 1) {
    return (firstChar + consonants[0]).toUpperCase();
  }
  // Çok kısa kelime
  return word.slice(0, 2).toUpperCase();
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

interface FirmaAvatarProps {
  firmaUnvani: string;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-14 h-14 text-lg",
};

export default function FirmaAvatar({ firmaUnvani, logoUrl, size = "md", className }: FirmaAvatarProps) {
  const hasRealLogo = logoUrl && !isFactoryIcon(logoUrl);

  const { initials, color } = useMemo(() => {
    const initials = generateInitials(firmaUnvani);
    const colorIndex = hashString(firmaUnvani) % AVATAR_COLORS.length;
    return { initials, color: AVATAR_COLORS[colorIndex] };
  }, [firmaUnvani]);

  if (hasRealLogo) {
    return (
      <div className={cn("rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0", sizeClasses[size], className)}>
        <img src={logoUrl} alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" />
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-full flex items-center justify-center shrink-0 font-bold select-none", sizeClasses[size], className)}
      style={{ backgroundColor: color.bg, color: color.fg }}
    >
      {initials}
    </div>
  );
}

export { generateInitials, isFactoryIcon, FACTORY_ICON_URL };
