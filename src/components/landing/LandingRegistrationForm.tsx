import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import {
  Loader2,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

type SelectedPackage = "ucretsiz" | "pro";

interface Props {
  selectedPackage: SelectedPackage;
  billingYearly: boolean;
  onBack: () => void;
}

const formatPhoneDisplay = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
};

const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

/* ─── Card Utilities ─── */
function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0, alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

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

export default function LandingRegistrationForm({ selectedPackage, billingYearly, onBack }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form fields
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [ad, setAd] = useState("");
  const [soyad, setSoyad] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [countryCode, setCountryCode] = useState("+90");
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [emailConsentAccepted, setEmailConsentAccepted] = useState(false);

  // Duplicate checks
  const [emailDuplicate, setEmailDuplicate] = useState(false);
  const [phoneDuplicate, setPhoneDuplicate] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Registration
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Card fields (PRO only) - prefill test card in preview
  const isPreviewEnv = typeof window !== "undefined" && (window.location.hostname.includes("preview") || window.location.hostname === "localhost");
  const [cardNumber, setCardNumber] = useState(isPreviewEnv ? "9792030394440796" : "");
  const [cardHolder, setCardHolder] = useState(isPreviewEnv ? "TEST KARTI" : "");
  const [expiry, setExpiry] = useState(isPreviewEnv ? "1230" : "");
  const [cvv, setCvv] = useState(isPreviewEnv ? "000" : "");
  const [showCvv, setShowCvv] = useState(false);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [cardTouched, setCardTouched] = useState<Record<string, boolean>>({});
  const expiryRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  // 3D Secure
  const [threeDHtml, setThreeDHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const brand = detectBrand(cardNumber);
  const rawDigits = cardNumber.replace(/\D/g, "");

  const getFullPhone = () => {
    const cleaned = telefon.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode}${cleaned}`;
  };

  const getFormattedPhone = () => {
    const cleaned = telefon.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode} ${formatPhoneDisplay(cleaned)}`;
  };

  // Countdown
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [otpCountdown]);

  // Email duplicate check
  useEffect(() => {
    if (!email || !isValidEmail(email)) { setEmailDuplicate(false); return; }
    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const { data } = await supabase.rpc("check_registration_duplicate", { p_email: email });
        setEmailDuplicate(!!(data && (data as any).email_exists));
      } catch { setEmailDuplicate(false); }
      finally { setCheckingEmail(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  // Phone duplicate check
  useEffect(() => {
    const cleaned = telefon.replace(/\D/g, "").replace(/^0+/, "");
    if (!cleaned || cleaned.length < 7) { setPhoneDuplicate(false); return; }
    const fullPhone = `${countryCode}${cleaned}`;
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc("check_registration_duplicate", { p_email: "", p_phone: fullPhone });
        setPhoneDuplicate(!!(data && (data as any).phone_exists));
      } catch { setPhoneDuplicate(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [telefon, countryCode]);

  // Card auto-focus
  useEffect(() => { if (rawDigits.length === 16) expiryRef.current?.focus(); }, [rawDigits]);
  useEffect(() => { if (expiry.replace(/\D/g, "").length === 4) cvvRef.current?.focus(); }, [expiry]);

  // Sync card holder with ad/soyad
  useEffect(() => {
    if (!cardTouched.cardHolder && ad && soyad) {
      setCardHolder(`${ad} ${soyad}`.toUpperCase());
    }
  }, [ad, soyad]);

  const handleSendOtp = async () => {
    const fullPhone = getFullPhone();
    const cleaned = telefon.replace(/\D/g, "").replace(/^0+/, "");
    if (!cleaned || cleaned.length < 7) {
      toast({ title: "Hata", description: "Geçerli bir telefon numarası giriniz", variant: "destructive" });
      return;
    }
    const { data: dupCheck } = await supabase.rpc("check_registration_duplicate", { p_email: "", p_phone: fullPhone });
    if (dupCheck && (dupCheck as any).phone_exists) {
      setPhoneDuplicate(true);
      toast({ title: "Hata", description: "Bu telefon numarası ile zaten bir üyelik bulunmaktadır.", variant: "destructive" });
      return;
    }
    setSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-otp", { body: { telefon: fullPhone } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      setOtpCountdown(120);
      toast({ title: "Kod gönderildi", description: `${fullPhone} numarasına doğrulama kodu gönderildi.` });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-otp", {
        body: { telefon: getFullPhone(), kod: otpCode },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.verified) throw new Error("Doğrulama başarısız");
      setPhoneVerified(true);
      toast({ title: "Başarılı", description: "Telefon numaranız doğrulandı." });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const validateCard = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!rawDigits || rawDigits.length < 13) errs.cardNumber = "Geçerli bir kart numarası girin";
    else if (!luhnCheck(rawDigits)) errs.cardNumber = "Kart numarası geçersiz";
    if (!cardHolder.trim() || cardHolder.trim().length < 3) errs.cardHolder = "Kart sahibi adını girin";
    if (!validateExpiry(expiry)) errs.expiry = "Geçerli bir son kullanma tarihi girin";
    const cvvDigits = cvv.replace(/\D/g, "");
    if (cvvDigits.length < 3 || cvvDigits.length > 4) errs.cvv = "Geçerli bir CVV girin";
    return errs;
  }, [rawDigits, cardHolder, expiry, cvv]);

  const isPro = selectedPackage === "pro";
  const canSubmit = firmaUnvani && ad && soyad && email && isValidEmail(email) && !emailDuplicate && phoneVerified && kvkkAccepted;
  const canSubmitPro = canSubmit && Object.keys(validateCard()).length === 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Validate card for PRO
    if (isPro) {
      const errs = validateCard();
      setCardErrors(errs);
      setCardTouched({ cardNumber: true, cardHolder: true, expiry: true, cvv: true });
      if (Object.keys(errs).length > 0) {
        toast({ title: "Hata", description: "Lütfen kart bilgilerini kontrol edin", variant: "destructive" });
        return;
      }
    }

    setRegisterLoading(true);
    try {
      const fullPhone = getFullPhone();

      // Final duplicate check
      const { data: dupResult } = await supabase.rpc("check_registration_duplicate", { p_email: email, p_phone: fullPhone });
      if (dupResult && (dupResult as any).email_exists) {
        setEmailDuplicate(true);
        toast({ title: "Hata", description: "Bu e-posta adresi ile zaten bir üyelik bulunmaktadır.", variant: "destructive" });
        setRegisterLoading(false);
        return;
      }
      if (dupResult && (dupResult as any).phone_exists) {
        setPhoneDuplicate(true);
        toast({ title: "Hata", description: "Bu telefon numarası ile zaten bir üyelik bulunmaktadır.", variant: "destructive" });
        setRegisterLoading(false);
        return;
      }

      const randomPassword = crypto.randomUUID() + "Aa1!";
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: randomPassword,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("Kullanıcı oluşturulamadı");

      const { error: rpcError } = await supabase.rpc("register_user_simple" as any, {
        p_user_id: userId,
        p_ad: ad,
        p_soyad: soyad,
        p_iletisim_email: email,
        p_iletisim_numarasi: fullPhone,
        p_firma_unvani: firmaUnvani,
      });
      if (rpcError) throw rpcError;

      // Send emails/SMS
      try { await supabase.functions.invoke("send-email", { body: { type: "basvuru_alindi", to: email, templateModel: { firma_unvani: firmaUnvani } } }); } catch { }
      try { await supabase.functions.invoke("send-notification-sms", { body: { type: "kayit_alindi", telefon: fullPhone, firmaUnvani } }); } catch { }

      if (!isPro) {
        await supabase.auth.signOut();
        setRegistrationComplete(true);
      } else {
        // PRO: Send card details to PayTR Direct API
        await initiateDirectPayment();
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg?.includes("already been registered") || msg?.includes("already registered")) msg = "Bu e-posta adresi ile zaten bir hesap bulunmaktadır.";
      else if (msg?.includes("rate limit")) msg = "Çok fazla istek gönderildi. Lütfen birkaç dakika bekleyiniz.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    } finally {
      setRegisterLoading(false);
    }
  };

  const initiateDirectPayment = async () => {
    try {
      const periyot = billingYearly ? "yillik" : "aylik";
      const expiryParts = expiry.split("/");
      const expiryMonth = expiryParts[0] || "";
      const expiryYear = expiryParts[1] || "";

      let clientIp = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        clientIp = ipData.ip || "";
      } catch { }

      const { data, error } = await supabase.functions.invoke("create-paytr-direct-token", {
        body: {
          periyot,
          clientIp,
          forceTestMode: false,
          cc_owner: cardHolder,
          card_number: cardNumber.replace(/\s/g, ""),
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          cvv,
        },
      });

      if (error) throw new Error(error.message || "Ödeme başlatılamadı");
      if (data?.error) throw new Error(data.error);
      if (!data?.html_content) throw new Error("3D Secure sayfası alınamadı");

      // Show 3D Secure page in iframe
      setThreeDHtml(data.html_content);

    } catch (err: any) {
      toast({ title: "Ödeme Hatası", description: err.message, variant: "destructive" });
      await handlePaymentFailure(err.message);
    }
  };

  const handlePaymentFailure = async (reason: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke("log-client-error", {
        body: {
          error_message: `PRO ödeme başarısız - ücretsiz pakete düşürüldü: ${reason}`,
          error_source: "landing_payment_fail",
          url: window.location.href,
          user_id: session?.user?.id,
        },
      });
    } catch { }
    await supabase.auth.signOut();
    setThreeDHtml(null);
    setRegistrationComplete(true);
    toast({
      title: "Bilgi",
      description: "Ödeme tamamlanamadı. Kaydınız ücretsiz paket ile oluşturuldu. Admin onayı sonrası giriş yapabilirsiniz.",
    });
  };

  // Write 3D Secure HTML into iframe
  useEffect(() => {
    if (threeDHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(threeDHtml);
        doc.close();
      }
    }
  }, [threeDHtml]);

  // Registration complete screen
  if (registrationComplete) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-foreground">Başvurunuz Alındı!</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Başvurunuz başarıyla alınmıştır. Ekibimiz başvurunuzu inceleyecek ve en kısa sürede sizinle iletişime geçecektir.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Başvurunuz onaylandığında, şifre oluşturma bağlantısı <span className="font-medium text-foreground">{email}</span> adresine gönderilecektir.
        </p>
        <Button onClick={() => navigate("/giris-kayit")} className="w-full">Giriş Sayfasına Dön</Button>
      </div>
    );
  }

  // 3D Secure iframe screen
  if (threeDHtml) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>3D Secure doğrulamasını tamamlayın</span>
        </div>
        <div className="rounded-xl overflow-hidden border border-border" style={{ minHeight: 500 }}>
          <iframe
            ref={iframeRef}
            className="w-full border-0"
            style={{ height: 500 }}
            title="3D Secure Doğrulama"
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
          />
        </div>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:underline"
          onClick={() => handlePaymentFailure("Kullanıcı ödemeyi iptal etti")}
        >
          Ödemeyi atla, ücretsiz paket ile devam et
        </button>
      </div>
    );
  }

  const otpMinutes = Math.floor(otpCountdown / 60);
  const otpSeconds = otpCountdown % 60;
  const cleanedPhone = telefon.replace(/\D/g, "").replace(/^0+/, "");
  const formattedExpiry = formatExpiry(expiry);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-foreground">
          {isPro ? `PRO Paket — ${billingYearly ? "Yıllık" : "Aylık"} Kayıt` : "Ücretsiz Paket — Kayıt Formu"}
        </h3>
      </div>

      {/* Firma Ünvanı */}
      <div className="space-y-1.5">
        <Label>Firma Ünvanı</Label>
        <Input
          placeholder="Firma Ünvanınız"
          value={firmaUnvani}
          onChange={(e) => {
            const val = e.target.value.split(' ').map(w => w.length > 0 ? w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1) : w).join(' ');
            setFirmaUnvani(val);
          }}
        />
      </div>

      {/* Ad / Soyad */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Ad</Label>
          <Input placeholder="Ad" value={ad} onChange={(e) => setAd(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Soyad</Label>
          <Input placeholder="Soyad" value={soyad} onChange={(e) => setSoyad(e.target.value)} />
        </div>
      </div>

      {/* E-posta */}
      <div className="space-y-1.5">
        <Label>E-posta</Label>
        <Input
          type="email"
          placeholder="ornek@firma.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={emailDuplicate ? "border-destructive" : ""}
        />
        {email && !isValidEmail(email) && <p className="text-xs text-destructive">Geçerli bir e-posta adresi giriniz</p>}
        {emailDuplicate && <p className="text-xs text-destructive">Bu e-posta adresi ile zaten bir üyelik bulunmaktadır.</p>}
      </div>

      {/* Telefon + OTP inline */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Cep Telefonu</Label>
          <div className="flex gap-2">
            <CountryCodeSelect value={countryCode} onChange={setCountryCode} disabled={phoneVerified} />
            <Input
              placeholder="532 XXX XX XX"
              value={formatPhoneDisplay(telefon)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
                setTelefon(digits);
              }}
              className={`flex-1 ${phoneDuplicate ? "border-destructive" : ""}`}
              inputMode="tel"
              disabled={phoneVerified}
            />
            {!phoneVerified && !otpSent && (
              <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs px-3"
                onClick={handleSendOtp} disabled={sendingOtp || phoneDuplicate || cleanedPhone.length < 7}>
                {sendingOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : "Kod Gönder"}
              </Button>
            )}
            {phoneVerified && (
              <div className="flex items-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            )}
          </div>
          {phoneDuplicate && <p className="text-xs text-destructive">Bu telefon numarası ile zaten bir üyelik bulunmaktadır.</p>}
        </div>

        {/* Inline OTP */}
        {otpSent && !phoneVerified && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-medium text-foreground">{getFormattedPhone()}</span> numaranıza gönderilen 6 haneli kodu giriniz
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                <InputOTPGroup className="gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="w-9 h-10 text-sm font-semibold rounded-md border border-border" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" className="flex-1" onClick={handleVerifyOtp} disabled={verifyingOtp || otpCode.length !== 6}>
                {verifyingOtp ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
                Doğrula
              </Button>
            </div>
            <div className="text-center">
              {otpCountdown > 0 ? (
                <p className="text-[11px] text-muted-foreground">Tekrar gönder: {otpMinutes}:{String(otpSeconds).padStart(2, "0")}</p>
              ) : (
                <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => { setOtpCode(""); handleSendOtp(); }}>Yeniden Kod Gönder</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Card Details (PRO only) ─── */}
      {isPro && (
        <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Kart Bilgileri</span>
            <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="w-3 h-3" /> 3D Secure
            </div>
          </div>

          {/* Card Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kart Numarası</label>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="1234 1234 1234 1234"
                className={`h-10 pr-16 tracking-wider font-mono text-sm ${cardTouched.cardNumber && cardErrors.cardNumber ? "border-destructive ring-1 ring-destructive" : ""}`}
                value={formatCardNumber(cardNumber)}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                onBlur={() => setCardTouched((p) => ({ ...p, cardNumber: true }))}
                maxLength={19}
                autoComplete="off"
              />
              {brand && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest" style={{ color: BRAND_COLORS[brand] }}>
                  {BRAND_LABELS[brand]}
                </span>
              )}
            </div>
            {cardTouched.cardNumber && cardErrors.cardNumber && <p className="text-xs text-destructive">{cardErrors.cardNumber}</p>}
          </div>

          {/* Card Holder */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Kart Sahibi</label>
            <Input
              type="text"
              placeholder="Ad Soyad"
              className={`h-10 uppercase tracking-wide text-sm ${cardTouched.cardHolder && cardErrors.cardHolder ? "border-destructive ring-1 ring-destructive" : ""}`}
              value={cardHolder}
              onChange={(e) => { setCardHolder(e.target.value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s]/g, "")); setCardTouched((p) => ({ ...p, cardHolder: true })); }}
              onBlur={() => setCardTouched((p) => ({ ...p, cardHolder: true }))}
              maxLength={50}
              autoComplete="off"
            />
            {cardTouched.cardHolder && cardErrors.cardHolder && <p className="text-xs text-destructive">{cardErrors.cardHolder}</p>}
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
                className={`h-10 text-center tracking-widest font-mono text-sm ${cardTouched.expiry && cardErrors.expiry ? "border-destructive ring-1 ring-destructive" : ""}`}
                value={formattedExpiry}
                onChange={(e) => setExpiry(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onBlur={() => setCardTouched((p) => ({ ...p, expiry: true }))}
                maxLength={5}
                autoComplete="off"
              />
              {cardTouched.expiry && cardErrors.expiry && <p className="text-xs text-destructive">{cardErrors.expiry}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">CVV</label>
              <div className="relative">
                <Input
                  ref={cvvRef}
                  type={showCvv ? "text" : "password"}
                  inputMode="numeric"
                  placeholder="•••"
                  className={`h-10 text-center tracking-widest font-mono text-sm pr-9 ${cardTouched.cvv && cardErrors.cvv ? "border-destructive ring-1 ring-destructive" : ""}`}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onBlur={() => setCardTouched((p) => ({ ...p, cvv: true }))}
                  maxLength={4}
                  autoComplete="off"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowCvv(!showCvv)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                  {showCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {cardTouched.cvv && cardErrors.cvv && <p className="text-xs text-destructive">{cardErrors.cvv}</p>}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center">
            Kart bilgileriniz sunucularımızda saklanmaz. Ödeme PayTR altyapısı üzerinden güvenle işlenir.
          </p>
        </div>
      )}

      {/* KVKK */}
      <div className="space-y-3 pt-1">
        <div className="flex items-start gap-2.5">
          <Checkbox id="kvkk-landing" checked={kvkkAccepted} onCheckedChange={(v) => setKvkkAccepted(v === true)} className="mt-0.5" />
          <label htmlFor="kvkk-landing" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
            <a href="/kvkk-aydinlatma" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary/80">KVKK Aydınlatma Metni</a>'ni okudum ve kabul ediyorum. <span className="text-destructive">*</span>
          </label>
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox id="email-consent-landing" checked={emailConsentAccepted} onCheckedChange={(v) => setEmailConsentAccepted(v === true)} className="mt-0.5" />
          <label htmlFor="email-consent-landing" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
            E-posta ile bildirim ve haber bülteni almayı kabul ediyorum.
          </label>
        </div>
      </div>

      {/* Submit */}
      <Button
        type="button"
        className="w-full h-12 text-sm font-semibold"
        onClick={handleSubmit}
        disabled={(!isPro ? !canSubmit : !canSubmit) || registerLoading}
      >
        {registerLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> İşleniyor...</>
        ) : isPro ? (
          <><CreditCard className="w-4 h-4 mr-2" /> Ödeme Yap ve Kaydı Tamamla</>
        ) : (
          "Kaydı Tamamla"
        )}
      </Button>

      <p className="text-[11px] text-center text-muted-foreground">
        Zaten hesabınız var mı?{" "}
        <a href="/giris-kayit" className="text-primary hover:underline">Giriş Yap</a>
      </p>
    </div>
  );
}
