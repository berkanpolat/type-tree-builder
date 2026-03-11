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
export function sortSecenekler<T extends { name: string }>(items: T[]): T[] {
  const belirtmek: T[] = [];
  const diger: T[] = [];
  const rest: T[] = [];

  for (const item of items) {
    const lower = item.name.toLowerCase();
    if (lower.includes("belirtmek istemiyorum")) {
      belirtmek.push(item);
    } else if (lower === "diğer" || lower === "diger") {
      diger.push(item);
    } else {
      rest.push(item);
    }
  }

  rest.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return [...belirtmek, ...rest, ...diger];
}
