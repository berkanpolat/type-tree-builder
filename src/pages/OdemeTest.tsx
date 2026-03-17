import { useState, useCallback, useRef, useEffect } from "react";
import { Shield, Lock, CreditCard, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import logoImg from "@/assets/tekstil-as-logo.png";

/* ─── Luhn Algorithm ─── */
function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/* ─── Card Brand Detection ─── */
function detectBrand(num: string): string | null {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "visa";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  if (/^9792/.test(d)) return "troy";
  return null;
}

const BRAND_COLORS: Record<string, string> = {
  visa: "#1a1f71",
  mastercard: "#eb001b",
  amex: "#006fcf",
  troy: "#00427a",
};

/* ─── Format Helpers ─── */
function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

/* ─── Validation ─── */
function validateExpiry(val: string): boolean {
  const parts = val.split("/");
  if (parts.length !== 2) return false;
  const month = parseInt(parts[0], 10);
  const year = parseInt("20" + parts[1], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expDate = new Date(year, month);
  return expDate > now;
}

// ─── DEMO PRODUCT ───
const DEMO_PRODUCT = {
  name: "Pro Paket — Aylık",
  description: "Tekstil A.Ş. TekPazar PRO üyelik",
  amount: 999.00,
  currency: "TRY",
};

export default function OdemeTest() {
  const { toast } = useToast();
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [showCvv, setShowCvv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const expiryRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  const brand = detectBrand(cardNumber);
  const rawDigits = cardNumber.replace(/\D/g, "");

  // Auto-focus next field
  useEffect(() => {
    if (rawDigits.length === 16) expiryRef.current?.focus();
  }, [rawDigits]);

  useEffect(() => {
    if (expiry.replace(/\D/g, "").length === 4) cvvRef.current?.focus();
  }, [expiry]);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!rawDigits || rawDigits.length < 13) errs.cardNumber = "Geçerli bir kart numarası girin";
    else if (!luhnCheck(rawDigits)) errs.cardNumber = "Kart numarası geçersiz";
    if (!cardHolder.trim() || cardHolder.trim().length < 3) errs.cardHolder = "Kart sahibi adını girin";
    if (!validateExpiry(expiry)) errs.expiry = "Geçerli bir son kullanma tarihi girin";
    const cvvDigits = cvv.replace(/\D/g, "");
    if (cvvDigits.length < 3 || cvvDigits.length > 4) errs.cvv = "Geçerli bir CVV girin";
    return errs;
  }, [rawDigits, cardHolder, expiry, cvv]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched({ cardNumber: true, cardHolder: true, expiry: true, cvv: true });

    if (Object.keys(errs).length > 0) {
      toast({ title: "Hata", description: "Lütfen form alanlarını kontrol edin", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Simulate payment — in production this calls the Edge Function
    await new Promise((r) => setTimeout(r, 2000));

    // Simulated success
    setSuccess(true);
    setLoading(false);
    // NOTE: In production, NEVER log card data
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, hsl(224 50% 97%), hsl(32 92% 97%))" }}>
        <div className="w-full max-w-md text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Ödeme Başarılı!</h1>
          <p className="text-muted-foreground">
            Test ödemesi başarıyla tamamlandı. Bu bir simülasyondur — gerçek bir ödeme alınmamıştır.
          </p>
          <div className="rounded-xl border border-border bg-card p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ürün</span>
              <span className="font-medium text-foreground">{DEMO_PRODUCT.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tutar</span>
              <span className="font-medium text-foreground">{DEMO_PRODUCT.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kart</span>
              <span className="font-medium text-foreground">•••• {rawDigits.slice(-4)}</span>
            </div>
          </div>
          <Button asChild className="w-full">
            <Link to="/paketim">Paketim Sayfasına Git</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "linear-gradient(135deg, hsl(224 50% 97%), hsl(32 92% 97%))" }}>
      {/* LEFT — Order Summary */}
      <div className="lg:w-[45%] bg-primary text-primary-foreground p-6 sm:p-10 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-8 opacity-80 hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Geri Dön</span>
          </Link>

          <img src={logoImg} alt="Tekstil A.Ş." className="h-8 mb-10 brightness-0 invert" />

          <div className="space-y-6">
            <div>
              <p className="text-sm opacity-60 uppercase tracking-wider mb-1">Ödeme Özeti</p>
              <h1 className="text-3xl font-bold">{DEMO_PRODUCT.name}</h1>
              <p className="text-sm opacity-70 mt-1">{DEMO_PRODUCT.description}</p>
            </div>

            <div className="h-px bg-white/20" />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Ara Toplam</span>
                <span>{(DEMO_PRODUCT.amount / 1.20).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-70">KDV (%20)</span>
                <span>{(DEMO_PRODUCT.amount - DEMO_PRODUCT.amount / 1.20).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
              </div>
              <div className="h-px bg-white/20" />
              <div className="flex justify-between text-lg font-bold">
                <span>Toplam</span>
                <span>{DEMO_PRODUCT.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-10 flex items-center gap-3 opacity-50">
          <Lock className="w-4 h-4" />
          <span className="text-xs">256-bit SSL şifreleme ile korunmaktadır</span>
        </div>
      </div>

      {/* RIGHT — Payment Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-lg">
          {/* TEST BADGE */}
          <div className="mb-6 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Test Modu</p>
              <p className="text-xs text-amber-700 mt-0.5">Bu bir test sayfasıdır. Gerçek ödeme alınmaz. Onayladığınızda canlıya alınacaktır.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-foreground">Güvenli Ödeme</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Card Number */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Kart Numarası</label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  className={`pl-12 pr-16 h-12 text-base tracking-wider font-mono ${touched.cardNumber && errors.cardNumber ? "border-destructive ring-destructive/20 ring-2" : ""}`}
                  value={formatCardNumber(cardNumber)}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                  onBlur={() => setTouched((p) => ({ ...p, cardNumber: true }))}
                  maxLength={19}
                  autoComplete="off"
                />
                {brand && (
                  <span
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-widest"
                    style={{ color: BRAND_COLORS[brand] || "hsl(var(--muted-foreground))" }}
                  >
                    {brand === "troy" ? "Troy" : brand === "amex" ? "AMEX" : brand.charAt(0).toUpperCase() + brand.slice(1)}
                  </span>
                )}
              </div>
              {touched.cardNumber && errors.cardNumber && (
                <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cardNumber}</p>
              )}
            </div>

            {/* Card Holder */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Kart Sahibi</label>
              <Input
                type="text"
                placeholder="AD SOYAD"
                className={`h-12 text-base uppercase tracking-wide ${touched.cardHolder && errors.cardHolder ? "border-destructive ring-destructive/20 ring-2" : ""}`}
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s]/g, ""))}
                onBlur={() => setTouched((p) => ({ ...p, cardHolder: true }))}
                maxLength={50}
                autoComplete="off"
              />
              {touched.cardHolder && errors.cardHolder && (
                <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cardHolder}</p>
              )}
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Son Kullanma</label>
                <Input
                  ref={expiryRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="AA/YY"
                  className={`h-12 text-base text-center tracking-widest font-mono ${touched.expiry && errors.expiry ? "border-destructive ring-destructive/20 ring-2" : ""}`}
                  value={formatExpiry(expiry)}
                  onChange={(e) => setExpiry(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onBlur={() => setTouched((p) => ({ ...p, expiry: true }))}
                  maxLength={5}
                  autoComplete="off"
                />
                {touched.expiry && errors.expiry && (
                  <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.expiry}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">CVV</label>
                <div className="relative">
                  <Input
                    ref={cvvRef}
                    type={showCvv ? "text" : "password"}
                    inputMode="numeric"
                    placeholder="•••"
                    className={`h-12 text-base text-center tracking-widest font-mono pr-10 ${touched.cvv && errors.cvv ? "border-destructive ring-destructive/20 ring-2" : ""}`}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onBlur={() => setTouched((p) => ({ ...p, cvv: true }))}
                    maxLength={4}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCvv(!showCvv)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched.cvv && errors.cvv && (
                  <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cvv}</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-13 text-base font-semibold relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(224 50% 30%))" }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>İşleniyor...</span>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {DEMO_PRODUCT.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺ Öde
                </span>
              )}
            </Button>

            {/* Security Badges */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5" />
                <span>SSL Korumalı</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                <span>3D Secure</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CreditCard className="w-3.5 h-3.5" />
                <span>PCI DSS</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Ödemeniz PayTR altyapısı üzerinden güvenle işlenir. Kart bilgileriniz sunucularımızda saklanmaz.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
