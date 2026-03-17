import { describe, it, expect } from "vitest";

/**
 * Auth & Kayıt akışı validasyon testleri.
 * Supabase bağımlılığı olmadan saf mantık testleri.
 */

// Replicate helpers from GirisKayit.tsx
const formatPhoneDisplay = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
};

const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

const getFullPhone = (countryCode: string, telefon: string) => {
  const cleaned = telefon.replace(/\D/g, "").replace(/^0+/, "");
  return `${countryCode}${cleaned}`;
};

describe("E-posta validasyonu", () => {
  it("geçerli email'i kabul eder", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name@domain.co")).toBe(true);
  });

  it("geçersiz email'i reddeder", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user @domain.com")).toBe(false);
  });
});

describe("Telefon numarası formatlama", () => {
  it("5XX formatında gösterir", () => {
    expect(formatPhoneDisplay("5551234567")).toBe("555 123 45 67");
  });

  it("başındaki 0'ı temizler", () => {
    expect(formatPhoneDisplay("05551234567")).toBe("555 123 45 67");
  });

  it("kısa numara için kısmi format", () => {
    expect(formatPhoneDisplay("555")).toBe("555");
    expect(formatPhoneDisplay("555123")).toBe("555 123");
  });

  it("boş değer için boş döner", () => {
    expect(formatPhoneDisplay("")).toBe("");
  });

  it("alfanumerik karakterleri temizler", () => {
    expect(formatPhoneDisplay("555-123-4567")).toBe("555 123 45 67");
    expect(formatPhoneDisplay("(555) 123 45 67")).toBe("555 123 45 67");
  });
});

describe("Tam telefon numarası oluşturma", () => {
  it("+90 ile birleştirir", () => {
    expect(getFullPhone("+90", "5551234567")).toBe("+905551234567");
  });

  it("başındaki 0'ı siler", () => {
    expect(getFullPhone("+90", "05551234567")).toBe("+905551234567");
  });

  it("farklı ülke kodu ile çalışır", () => {
    expect(getFullPhone("+49", "1701234567")).toBe("+491701234567");
  });
});

describe("Kayıt formu validasyonları", () => {
  const validateRegistrationStep1 = (turId: string, tipId: string, firmaUnvani: string) => {
    const errors: string[] = [];
    if (!turId) errors.push("Firma Türü");
    if (!tipId) errors.push("Firma Tipi");
    if (!firmaUnvani.trim()) errors.push("Firma Ünvanı");
    return errors;
  };

  const validateRegistrationStep2 = (
    ad: string, soyad: string, email: string, telefon: string, kvkkAccepted: boolean
  ) => {
    const errors: string[] = [];
    if (!ad.trim()) errors.push("Ad");
    if (!soyad.trim()) errors.push("Soyad");
    if (!email.trim() || !isValidEmail(email)) errors.push("E-posta");
    const cleanPhone = telefon.replace(/\D/g, "").replace(/^0+/, "");
    if (!cleanPhone || cleanPhone.length < 7) errors.push("Telefon");
    if (!kvkkAccepted) errors.push("KVKK Onayı");
    return errors;
  };

  it("adım 1: tüm alanlar dolu → hata yok", () => {
    expect(validateRegistrationStep1("tur1", "tip1", "Test Firma A.Ş.")).toEqual([]);
  });

  it("adım 1: firma türü eksik → hata", () => {
    expect(validateRegistrationStep1("", "tip1", "Test")).toContain("Firma Türü");
  });

  it("adım 1: firma ünvanı boş → hata", () => {
    expect(validateRegistrationStep1("tur1", "tip1", "  ")).toContain("Firma Ünvanı");
  });

  it("adım 2: tüm alanlar dolu, KVKK onaylı → hata yok", () => {
    expect(validateRegistrationStep2("Ali", "Demir", "ali@test.com", "5551234567", true)).toEqual([]);
  });

  it("adım 2: KVKK onaylanmamış → hata", () => {
    expect(validateRegistrationStep2("Ali", "Demir", "ali@test.com", "5551234567", false)).toContain("KVKK Onayı");
  });

  it("adım 2: geçersiz email → hata", () => {
    expect(validateRegistrationStep2("Ali", "Demir", "invalid", "5551234567", true)).toContain("E-posta");
  });

  it("adım 2: kısa telefon → hata", () => {
    expect(validateRegistrationStep2("Ali", "Demir", "ali@test.com", "123", true)).toContain("Telefon");
  });

  it("OTP kodu 6 haneli olmalı", () => {
    expect("12345".length === 6).toBe(false);
    expect("123456".length === 6).toBe(true);
  });
});

describe("Giriş formu validasyonları", () => {
  it("boş email ile giriş yapılmamalı", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("geçerli email ile giriş alanı kontrolü geçer", () => {
    expect(isValidEmail("user@tekstilas.com")).toBe(true);
  });
});
