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
 * Beden benzeri değerleri mantıksal sırada tutmak için sıra anahtarı üretir.
 * Desteklenen tipler:
 * - ay aralığı: 0-3 ay, 6-9 ay
 * - yaş aralığı: 2-3 yaş, 10-11 yaş
 * - harf beden: XXS, XS, S, M, L, XL, 2XL...
 * - sayısal beden: 32, 34, 36, 50 Üzeri
 */
const BEDEN_HARF_SIRASI: Record<string, number> = {
  "4xs": 0,
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

type BedenSortKey = {
  group: number;
  order: number;
};

const getBedenSortKey = (name: string): BedenSortKey | null => {
  const normalized = normalizeOptionText(name);
  const compact = normalized.replace(/\s+/g, "");

  if (normalized === "yenidogan") {
    return { group: 0, order: -1 };
  }

  const ayRangeMatch = normalized.match(/^(\d+)\s*-\s*(\d+)\s*ay$/);
  if (ayRangeMatch) {
    return { group: 0, order: Number(ayRangeMatch[1]) };
  }

  const singleAyMatch = normalized.match(/^(\d+)\s*ay$/);
  if (singleAyMatch) {
    return { group: 0, order: Number(singleAyMatch[1]) };
  }

  const yasRangeMatch = normalized.match(/^(\d+)\s*-\s*(\d+)\s*yas$/);
  if (yasRangeMatch) {
    return { group: 1, order: Number(yasRangeMatch[1]) };
  }

  const singleYasMatch = normalized.match(/^(\d+)\s*yas$/);
  if (singleYasMatch) {
    return { group: 1, order: Number(singleYasMatch[1]) };
  }

  const harfOrder = BEDEN_HARF_SIRASI[compact];
  if (harfOrder !== undefined) {
    return { group: 2, order: harfOrder };
  }

  const numericMatch = normalized.match(/^(\d+)$/);
  if (numericMatch) {
    return { group: 3, order: Number(numericMatch[1]) };
  }

  const numericOverMatch = normalized.match(/^(\d+)\s*uzeri$/);
  if (numericOverMatch) {
    return { group: 3, order: Number(numericOverMatch[1]) + 0.5 };
  }

  return null;
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
    const aSize = getBedenSortKey(a.name);
    const bSize = getBedenSortKey(b.name);

    if (aSize && bSize) {
      if (aSize.group !== bSize.group) return aSize.group - bSize.group;
      if (aSize.order !== bSize.order) return aSize.order - bSize.order;
    }

    if (aSize) return -1;
    if (bSize) return 1;

    return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
  });
  return [...belirtmek, ...rest, ...diger];
}
