import { useState, useCallback, useRef, useEffect } from "react";
import { Shield, Lock, CreditCard, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff, RotateCw, DollarSign, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PRO_FIYATLAR } from "@/lib/package-config";
import logoImg from "@/assets/tekstil-as-logo.png";

/* ─── Luhn Algorithm ─── */
function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
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

const BRAND_LABELS: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "AMEX", troy: "Troy" };
const BRAND_COLORS: Record<string, string> = { visa: "#1a1f71", mastercard: "#eb001b", amex: "#006fcf", troy: "#00427a" };

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}
function validateExpiry(val: string): boolean {
  const parts = val.split("/");
  if (parts.length !== 2) return false;
  const month = parseInt(parts[0], 10);
  const year = parseInt("20" + parts[1], 10);
  if (month < 1 || month > 12) return false;
  return new Date(year, month) > new Date();
}

type Period = "aylik" | "yillik";
type Currency = "USD" | "TRY";

const YILLIK_ORIGINAL = PRO_FIYATLAR.aylik.fiyat * 12;
const YILLIK_INDIRIMLI = PRO_FIYATLAR.yillik.fiyat;
const AYLIK_KARSILIK = Math.round((YILLIK_INDIRIMLI / 12) * 100) / 100;

export default function OdemeTest() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const period: Period = searchParams.get("periyot") === "yillik" ? "yillik" : "aylik";
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [showCvv, setShowCvv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [threeDHtml, setThreeDHtml] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>("USD");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const expiryRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);
  const brand = detectBrand(cardNumber);
  const rawDigits = cardNumber.replace(/\D/g, "");

  const usdPrice = period === "aylik" ? PRO_FIYATLAR.aylik.fiyat : YILLIK_INDIRIMLI;
  const kdv = usdPrice * (PRO_FIYATLAR.kdvOrani / 100);
  const totalUsd = usdPrice + kdv;
  const totalTry = exchangeRate ? totalUsd * exchangeRate : null;

  // Currency-aware price formatter
  const p = useCallback((usdAmount: number) => {
    if (currency === "TRY" && exchangeRate) {
      return `₺${fmt(usdAmount * exchangeRate)}`;
    }
    return `$${fmt(usdAmount)}`;
  }, [currency, exchangeRate]);

  // Fetch exchange rate
  const fetchRate = useCallback(async () => {
    setRateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-exchange-rate");
      if (error) throw error;
      if (data?.usd_try) setExchangeRate(data.usd_try);
    } catch {
      setExchangeRate(38.50); // fallback
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => { fetchRate(); }, [fetchRate]);

  // Auto-focus
  useEffect(() => { if (rawDigits.length === 16) expiryRef.current?.focus(); }, [rawDigits]);
  useEffect(() => { if (expiry.replace(/\D/g, "").length === 4) cvvRef.current?.focus(); }, [expiry]);

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

  // Listen for 3D Secure result from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "PAYTR_PAYMENT_RESULT") {
        setThreeDHtml(null);
        if (e.data.result === "basarili") {
          // Verify payment and activate subscription
          supabase.functions.invoke("verify-payment").then(({ data, error }) => {
            if (error) console.error("verify-payment error:", error);
          });
          setSuccess(true);
        } else {
          setPaymentFailed(true);
          toast({ title: "Ödeme Başarısız", description: "Ödeme işlemi tamamlanamadı. Lütfen tekrar deneyin.", variant: "destructive" });
        }
        setLoading(false);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [toast]);

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
    setPaymentFailed(false);

    try {
      // Get user's firma info for payment
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Hata", description: "Lütfen önce giriş yapın", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: firma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", user.id).maybeSingle();

      // Get client IP
      let clientIp = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        clientIp = ipData.ip || "";
      } catch { /* fallback handled server-side */ }

      const expiryParts = expiry.replace(/\D/g, "");
      const expiryMonth = expiryParts.slice(0, 2);
      const expiryYear = expiryParts.slice(2, 4);

      const { data, error } = await supabase.functions.invoke("create-paytr-direct-token", {
        body: {
          periyot: period,
          clientIp,
          forceTestMode: false,
          cc_owner: cardHolder.toUpperCase(),
          card_number: cardNumber.replace(/\s/g, ""),
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          cvv: cvv,
          firma_unvani: firma?.firma_unvani || "",
        },
      });

      if (error) throw new Error(error.message || "Ödeme başlatılamadı");
      if (data?.error) throw new Error(data.error);

      if (data?.html_content) {
        // Show 3D Secure page in iframe
        setThreeDHtml(data.html_content);
      } else {
        throw new Error("3D Secure sayfası oluşturulamadı");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({ title: "Ödeme Hatası", description: err.message || "Ödeme sayfası oluşturulamadı", variant: "destructive" });
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Ödeme Başarılı!</h1>
          <p className="text-sm text-muted-foreground">
            PRO paketiniz başarıyla aktive edildi. Sınırsız erişimin keyfini çıkarın!
          </p>
          <div className="rounded-lg border border-border bg-card p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Paket</span><span className="font-medium">PRO — {period === "aylik" ? "Aylık" : "Yıllık"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tutar</span><span className="font-medium">{p(totalUsd)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kart</span><span className="font-medium font-mono">•••• {rawDigits.slice(-4)}</span></div>
          </div>
          <Button asChild className="w-full"><Link to="/paketim">Paketim Sayfasına Git</Link></Button>
        </div>
      </div>
    );
  }

  // 3D Secure iframe view
  if (threeDHtml) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="w-full max-w-lg space-y-4">
          <h2 className="text-lg font-semibold text-foreground text-center">3D Secure Doğrulama</h2>
          <p className="text-sm text-muted-foreground text-center">Bankanızın güvenlik doğrulamasını tamamlayın.</p>
          <iframe
            ref={iframeRef}
            srcDoc={threeDHtml}
            className="w-full h-[500px] border border-border rounded-lg"
            sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation allow-popups"
            title="3D Secure"
          />
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => { setThreeDHtml(null); setLoading(false); }}
          >
            İptal Et
          </Button>
        </div>
      </div>
    );
  }

  // Payment failed view
  if (paymentFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Ödeme Başarısız</h1>
          <p className="text-sm text-muted-foreground">Ödeme işlemi tamamlanamadı. Lütfen kart bilgilerinizi kontrol ederek tekrar deneyin.</p>
          <Button className="w-full" onClick={() => { setPaymentFailed(false); setLoading(false); }}>Tekrar Dene</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT — Blue branded summary */}
      <div className="lg:w-[40%] shrink-0 bg-[hsl(220,70%,18%)] text-white p-6 lg:p-10 lg:min-h-screen flex flex-col">
        <Link to="/" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity mb-8">
          <ArrowLeft className="w-4 h-4" />
          <img src={logoImg} alt="Tekstil A.Ş." className="h-6 brightness-0 invert" />
        </Link>

        <div className="flex-1 space-y-6">

          <h2 className="text-xl font-bold">PRO Paket — {period === "aylik" ? "Aylık" : "Yıllık"}</h2>

          {/* Currency toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1.5 rounded-l-lg text-xs font-semibold transition-colors ${currency === "USD" ? "bg-white/20 text-white" : "bg-white/5 text-white/40 hover:text-white/60"}`}
            >
              $ USD
            </button>
            <button
              onClick={() => setCurrency("TRY")}
              disabled={!exchangeRate}
              className={`px-3 py-1.5 rounded-r-lg text-xs font-semibold transition-colors ${currency === "TRY" ? "bg-white/20 text-white" : "bg-white/5 text-white/40 hover:text-white/60"} disabled:opacity-30`}
            >
              ₺ TRY
            </button>
          </div>

          {/* Price breakdown */}
          <div className="space-y-3 text-sm">
            {period === "yillik" ? (
              <>
                <div className="flex justify-between">
                  <span className="text-white/60">Ara Toplam</span>
                  <span className="line-through text-white/40">{p(YILLIK_ORIGINAL)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-300">İndirim (%45)</span>
                  <span className="text-emerald-300">-{p(YILLIK_ORIGINAL - YILLIK_INDIRIMLI)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">İndirimli Fiyat</span>
                  <span>{p(YILLIK_INDIRIMLI)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-white/60">Ara Toplam</span>
                <span>{p(usdPrice)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/60">KDV (%{PRO_FIYATLAR.kdvOrani})</span>
              <span>{p(kdv)}</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between font-semibold text-base">
              <span>Toplam</span>
              <span>{p(totalUsd)}</span>
            </div>
            {exchangeRate && (
              <p className="text-[11px] text-white/40">
                1 USD = {fmt(exchangeRate)} TRY · TCMB döviz satış kuru
              </p>
            )}
          </div>

          {/* Savings info for yearly */}
          {period === "yillik" && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-xs text-emerald-300 leading-relaxed">
                💰 Yıllık planı tercih ederek <strong>{p(YILLIK_ORIGINAL - YILLIK_INDIRIMLI)}</strong> tasarruf ediyorsunuz!
              </p>
            </div>
          )}

          {/* Recurring / plan info */}
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-xs text-white/50 leading-relaxed">
              <RotateCw className="w-3 h-3 inline mr-1 -mt-0.5" />
              Bu abonelik <strong className="text-white/70">{period === "aylik" ? "aylık" : "yıllık"} olarak otomatik</strong> yenilenecektir. İstediğiniz zaman paketi değiştirebilirsiniz.
            </p>
          </div>
        </div>

        {/* Security badges at bottom */}
        <div className="flex items-center gap-5 pt-6 mt-6 border-t border-white/10">
          {[
            { icon: Lock, label: "SSL" },
            { icon: Shield, label: "3D Secure" },
            { icon: CreditCard, label: "PCI DSS" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-1 text-[11px] text-white/30">
              <b.icon className="w-3 h-3" />
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Payment Form */}
      <div className="flex-1 bg-background flex items-start justify-center p-6 lg:p-10 lg:items-center">
        <div className="w-full max-w-md space-y-6">
          {/* TEST BADGE */}
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200"><strong>Test Modu</strong> — Gerçek ödeme alınmaz.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">Kart Bilgileri</h2>
            <p className="text-sm text-muted-foreground mt-1">Ödemeniz PayTR altyapısı üzerinden güvenle işlenir.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Card Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Kart Numarası</label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 1234 1234 1234"
                  className={`h-11 pr-16 tracking-wider font-mono text-sm ${touched.cardNumber && errors.cardNumber ? "border-destructive ring-1 ring-destructive" : ""}`}
                  value={formatCardNumber(cardNumber)}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                  onBlur={() => setTouched((p) => ({ ...p, cardNumber: true }))}
                  maxLength={19}
                  autoComplete="off"
                />
                {brand && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest" style={{ color: BRAND_COLORS[brand] }}>
                    {BRAND_LABELS[brand]}
                  </span>
                )}
              </div>
              {touched.cardNumber && errors.cardNumber && <p className="text-xs text-destructive">{errors.cardNumber}</p>}
            </div>

            {/* Card Holder */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Kart Sahibi</label>
              <Input
                type="text"
                placeholder="Ad Soyad"
                className={`h-11 uppercase tracking-wide text-sm ${touched.cardHolder && errors.cardHolder ? "border-destructive ring-1 ring-destructive" : ""}`}
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s]/g, ""))}
                onBlur={() => setTouched((p) => ({ ...p, cardHolder: true }))}
                maxLength={50}
                autoComplete="off"
              />
              {touched.cardHolder && errors.cardHolder && <p className="text-xs text-destructive">{errors.cardHolder}</p>}
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Son Kullanma</label>
                <Input
                  ref={expiryRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="AA / YY"
                  className={`h-11 text-center tracking-widest font-mono text-sm ${touched.expiry && errors.expiry ? "border-destructive ring-1 ring-destructive" : ""}`}
                  value={formatExpiry(expiry)}
                  onChange={(e) => setExpiry(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onBlur={() => setTouched((p) => ({ ...p, expiry: true }))}
                  maxLength={5}
                  autoComplete="off"
                />
                {touched.expiry && errors.expiry && <p className="text-xs text-destructive">{errors.expiry}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">CVV</label>
                <div className="relative">
                  <Input
                    ref={cvvRef}
                    type={showCvv ? "text" : "password"}
                    inputMode="numeric"
                    placeholder="•••"
                    className={`h-11 text-center tracking-widest font-mono text-sm pr-9 ${touched.cvv && errors.cvv ? "border-destructive ring-1 ring-destructive" : ""}`}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onBlur={() => setTouched((p) => ({ ...p, cvv: true }))}
                    maxLength={4}
                    autoComplete="off"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowCvv(!showCvv)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                    {showCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {touched.cvv && errors.cvv && <p className="text-xs text-destructive">{errors.cvv}</p>}
              </div>
            </div>

            {/* Submit */}
            <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-semibold mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  İşleniyor...
                </span>
              ) : (
                <span>{p(totalUsd)} Öde</span>
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground/60 text-center">
              Kart bilgileriniz sunucularımızda saklanmaz.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
