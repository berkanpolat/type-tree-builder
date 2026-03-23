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

  it("ay ve yaş aralıklarını küçükten büyüğe sıralar", () => {
    const input = [
      { name: "9-12 ay", id: "1" },
      { name: "2-3 yaş", id: "2" },
      { name: "0-3 ay", id: "3" },
      { name: "18-24 ay", id: "4" },
    ];
    const result = sortSecenekler(input);
    expect(result.map((r) => r.name)).toEqual(["0-3 ay", "9-12 ay", "18-24 ay", "2-3 yaş"]);
  });

  it("harf bedenleri mantıksal sırada tutar", () => {
    const input = [
      { name: "5XL", id: "1" },
      { name: "M", id: "2" },
      { name: "XS", id: "3" },
      { name: "XXL", id: "4" },
    ];
    const result = sortSecenekler(input);
    expect(result.map((r) => r.name)).toEqual(["XS", "M", "XXL", "5XL"]);
  });

  it("sayısal bedenleri küçükten büyüğe sıralar", () => {
    const input = [
      { name: "50 Üzeri", id: "1" },
      { name: "42", id: "2" },
      { name: "34", id: "3" },
      { name: "36", id: "4" },
    ];
    const result = sortSecenekler(input);
    expect(result.map((r) => r.name)).toEqual(["34", "36", "42", "50 Üzeri"]);
  });
});
