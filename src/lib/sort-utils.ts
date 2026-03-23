/**
 * Firma Türleri için sabit sıralama.
 * DB'den gelen name alanına göre eşleştirilir.
 */
export const FIRMA_TURU_SIRASI = [
  "Marka",
  "Mümessil Ofis",
  "Hazır Giyim Üreticisi",
  "Tedarikçi",
  "Fason Atölye",
];

const normalizeOptionText = (value: string) =>
  value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function sortFirmaTurleri<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ai = FIRMA_TURU_SIRASI.indexOf(a.name);
    const bi = FIRMA_TURU_SIRASI.indexOf(b.name);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

/**
 * Dropdown seçeneklerini sıralar:
 * - "Belirtmek İstemiyorum" her zaman en üstte
 * - "Diğer" her zaman en altta
 * - Geri kalanlar alfabetik
 */
/**
 * Beden benzeri değerleri mantıksal sırada tutmak için sabit sıra haritası.
 * Burada olmayanlar alfabetik sıralanır.
 */
const BEDEN_SIRASI: Record<string, number> = {
  "3xs": 1, "xxxs": 1,
  "2xs": 2, "xxs": 2,
  "xs": 3,
  "s": 4,
  "m": 5,
  "l": 6,
  "xl": 7,
  "2xl": 8, "xxl": 8,
  "3xl": 9, "xxxl": 9,
  "4xl": 10, "xxxxl": 10,
  "5xl": 11,
  "6xl": 12,
};

const getBedenOrder = (name: string): number | null => {
  const key = name.trim().toLowerCase().replace(/\s+/g, "");
  return BEDEN_SIRASI[key] ?? null;
};

export function sortSecenekler<T extends { name: string }>(items: T[]): T[] {
  const belirtmek: T[] = [];
  const diger: T[] = [];
  const rest: T[] = [];

  for (const item of items) {
    const normalized = normalizeOptionText(item.name);

    if (normalized.includes("belirtmek istemiyorum")) {
      belirtmek.push(item);
    } else if (
      normalized === "diger" ||
      normalized.startsWith("diger ") ||
      normalized.startsWith("diger-") ||
      normalized.startsWith("diger/") ||
      normalized.startsWith("diger(")
    ) {
      diger.push(item);
    } else {
      rest.push(item);
    }
  }

  rest.sort((a, b) => {
    const aSize = getBedenOrder(a.name);
    const bSize = getBedenOrder(b.name);
    // Both are sizes → sort by size order
    if (aSize !== null && bSize !== null) return aSize - bSize;
    // Only one is a size → size first
    if (aSize !== null) return -1;
    if (bSize !== null) return 1;
    // Neither → alphabetical
    return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
  });
  return [...belirtmek, ...rest, ...diger];
}
