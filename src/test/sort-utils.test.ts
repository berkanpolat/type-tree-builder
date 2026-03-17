import { describe, it, expect } from "vitest";
import { sortFirmaTurleri, sortSecenekler, FIRMA_TURU_SIRASI } from "@/lib/sort-utils";

describe("sortFirmaTurleri", () => {
  it("sabit sıraya göre sıralar", () => {
    const input = [
      { name: "Fason Atölye", id: "5" },
      { name: "Marka", id: "1" },
      { name: "Hazır Giyim Üreticisi", id: "3" },
    ];
    const result = sortFirmaTurleri(input);
    expect(result.map((r) => r.name)).toEqual([
      "Marka",
      "Hazır Giyim Üreticisi",
      "Fason Atölye",
    ]);
  });

  it("bilinmeyen türleri sona atar", () => {
    const input = [
      { name: "Bilinmeyen Tür", id: "x" },
      { name: "Marka", id: "1" },
    ];
    const result = sortFirmaTurleri(input);
    expect(result[0].name).toBe("Marka");
    expect(result[1].name).toBe("Bilinmeyen Tür");
  });

  it("boş dizi için hata vermez", () => {
    expect(sortFirmaTurleri([])).toEqual([]);
  });
});

describe("sortSecenekler", () => {
  it("'Belirtmek İstemiyorum' en üstte, 'Diğer' en altta olur", () => {
    const input = [
      { name: "Pamuk", id: "2" },
      { name: "Diğer", id: "3" },
      { name: "Belirtmek İstemiyorum", id: "1" },
      { name: "Polyester", id: "4" },
    ];
    const result = sortSecenekler(input);
    expect(result[0].name).toBe("Belirtmek İstemiyorum");
    expect(result[result.length - 1].name).toBe("Diğer");
  });

  it("geri kalanları Türkçe alfabetik sıralar", () => {
    const input = [
      { name: "Çorap", id: "1" },
      { name: "Aksesuar", id: "2" },
      { name: "Baskı", id: "3" },
    ];
    const result = sortSecenekler(input);
    expect(result.map((r) => r.name)).toEqual(["Aksesuar", "Baskı", "Çorap"]);
  });

  it("'Diğer' varyantlarını tanır (diger-, diger/)", () => {
    const input = [
      { name: "Diğer/Özel", id: "1" },
      { name: "Normal", id: "2" },
    ];
    const result = sortSecenekler(input);
    expect(result[0].name).toBe("Normal");
    expect(result[1].name).toBe("Diğer/Özel");
  });
});
