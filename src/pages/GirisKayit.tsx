import { useState, useEffect } from "react";
import logoImg from "@/assets/tekstil-as-logo.png";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import authBg from "@/assets/auth-bg.jpg";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import CountryCodeSelect from "@/components/CountryCodeSelect";

// Phone formatting helper: 5XX XXX XX XX
const formatPhoneDisplay = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
};

const GirisKayit = () => {
  const [activeTab, setActiveTab] = useState<"giris" | "kayit">("giris");
  const [registerStep, setRegisterStep] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [selectedTurId, setSelectedTurId] = useState("");
  const [selectedTipId, setSelectedTipId] = useState("");
  const [firmaUnvani, setFirmaUnvani] = useState("");
  const [vergiNumarasi, setVergiNumarasi] = useState("");
  const [vergiDairesi, setVergiDairesi] = useState("");
  const [ad, setAd] = useState("");
  const [soyad, setSoyad] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [countryCode, setCountryCode] = useState("+90");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Phone verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Build full phone number (strip leading 0)
  const getFullPhone = () => {
    const cleaned = telefon.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode}${cleaned}`;
  };

  // Format phone for display with spaces
  const getFormattedPhone = () => {
    const cleaned = telefon.replace(/\D/g, "").replace(/^0+/, "");
    const full = `${countryCode} ${formatPhoneDisplay(cleaned)}`;
    return full;
  };

  // Countdown timer for resend
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Email validation
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSendOtp = async () => {
    const fullPhone = getFullPhone();
    const cleaned = telefon.replace(/\D/g, "").replace(/^0+/, "");
    if (!cleaned || cleaned.length < 7) {
      toast({ title: "Hata", description: "Geçerli bir telefon numarası giriniz", variant: "destructive" });
      return;
    }

    // Check duplicate phone
    const { data: existingPhone } = await supabase
      .from("profiles")
      .select("id")
      .eq("iletisim_numarasi", fullPhone)
      .limit(1);

    if (existingPhone && existingPhone.length > 0) {
      toast({ title: "Hata", description: "Bu telefon numarası ile zaten bir üyelik bulunmaktadır.", variant: "destructive" });
      return;
    }

    setSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { telefon: fullPhone },
      });
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
    if (otpCode.length !== 6) {
      toast({ title: "Hata", description: "6 haneli kodu eksiksiz giriniz", variant: "destructive" });
      return;
    }
    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-otp", {
        body: { telefon: getFullPhone(), kod: otpCode },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.verified) throw new Error("Doğrulama başarısız");

      setPhoneVerified(true);
      // Auto-submit registration after phone verification
      await submitRegistration();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Firma Türü / Tipi queries
  const { data: firmaTurleri } = useQuery({
    queryKey: ["firma_turleri"],
    queryFn: async () => {
      const { data, error } = await supabase.from("firma_turleri").select("*").order("name");
      if (error) throw error;
      return sortFirmaTurleri(data);
    },
  });

  const { data: firmaTipleri } = useQuery({
    queryKey: ["firma_tipleri", selectedTurId],
    queryFn: async () => {
      const { data, error } = await supabase.from("firma_tipleri").select("*").eq("firma_turu_id", selectedTurId).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTurId,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      toast({ title: "Giriş başarılı" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  const submitRegistration = async () => {
    if (!selectedTurId || !selectedTipId) return;
    if (!isValidEmail(email)) return;
    setRegisterLoading(true);
    try {
      // Check duplicate email in profiles
      const { data: existingEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("iletisim_email", email)
        .limit(1);

      if (existingEmail && existingEmail.length > 0) {
        toast({ title: "Hata", description: "Bu e-posta adresi ile zaten bir üyelik bulunmaktadır.", variant: "destructive" });
        setRegisterLoading(false);
        return;
      }

      const fullPhone = getFullPhone();
      const randomPassword = crypto.randomUUID() + "Aa1!";

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: randomPassword,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Kullanıcı oluşturulamadı");

      const { error: rpcError } = await supabase.rpc("register_user", {
        p_user_id: userId,
        p_ad: ad,
        p_soyad: soyad,
        p_iletisim_email: email,
        p_iletisim_numarasi: fullPhone,
        p_firma_turu_id: selectedTurId,
        p_firma_tipi_id: selectedTipId,
        p_firma_unvani: firmaUnvani,
        p_vergi_numarasi: vergiNumarasi,
        p_vergi_dairesi: vergiDairesi,
      });
      if (rpcError) throw rpcError;

      // Send welcome email via Postmark
      try {
        await supabase.functions.invoke("send-welcome-email", {
          body: {
            to: email,
            adSoyad: `${ad} ${soyad}`,
            firmaUnvani,
          },
        });
      } catch (emailErr) {
        console.error("Welcome email failed:", emailErr);
      }

      await supabase.auth.signOut();
      setRegistrationComplete(true);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setRegisterLoading(false);
    }
  };

  const benefits = [
    "Firma ve ürün/hizmetlerin daha fazla paydaş tarafından bulunması",
    "Doğru iş ortaklarına daha hızlı erişim",
    "Doğru Eşleşme ile ihtiyaç–kapasite–uzmanlık uyumu",
    "İletişim sürecinin daha hızlı ve net ilerlemesi",
    "Teklif toplama / karşılaştırma / karar alma akışının düzenlenmesi",
  ];

  // Registration complete full-screen
  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-lg border border-border p-8 space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground">Başvurunuz Alındı!</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Başvurunuz başarıyla alınmıştır. Ekibimiz başvurunuzu inceleyecek ve en kısa sürede sizinle iletişime geçecektir.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Başvurunuz onaylandığında, şifre oluşturma bağlantısı <span className="font-medium text-foreground">{email}</span> adresine gönderilecektir.
            </p>
            <Button
              className="w-full h-12 rounded-xl"
              onClick={() => {
                setRegistrationComplete(false);
                setActiveTab("giris");
                setRegisterStep(1);
                setSelectedTurId(""); setSelectedTipId(""); setFirmaUnvani(""); setVergiNumarasi(""); setVergiDairesi("");
                setAd(""); setSoyad(""); setEmail(""); setTelefon(""); setPhoneVerified(false); setOtpSent(false); setOtpCode("");
              }}
            >
              Giriş Sayfasına Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // OTP minutes/seconds helper (used inline in step 2)
  const otpMinutes = Math.floor(otpCountdown / 60);
  const otpSeconds = otpCountdown % 60;

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-end p-12"
        style={{
          backgroundImage: `url(${authBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
        <div className="relative z-10 text-white space-y-6 mb-12">
          <h1 className="text-3xl font-bold">Dijital Dünyaya İlk Adımı At</h1>
          <p className="text-white/80">Tekstil A.Ş.'ye üye olmanın faydaları:</p>
          <ul className="space-y-3">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <span className="text-sm opacity-90">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-start justify-center p-6 pt-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center mb-2">
            <img src={logoImg} alt="Tekstil A.Ş." className="h-10 object-contain" />
          </div>
          {/* Tab switcher */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setActiveTab("giris")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "giris"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              Giriş
            </button>
            <button
              onClick={() => setActiveTab("kayit")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "kayit"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              Kayıt
            </button>
          </div>

          {activeTab === "giris" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" placeholder="E-posta" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input type="password" placeholder="Şifre" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? "Giriş yapılıyor..." : "Giriş"}
              </Button>
              <p className="text-center text-sm text-muted-foreground cursor-pointer hover:underline">
                Parolamı Unuttum?
              </p>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Step indicators */}
              <div className="flex items-center gap-2">
                {[1, 2].map((step) => (
                  <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      registerStep === step
                        ? "bg-primary text-primary-foreground"
                        : registerStep > step
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {registerStep > step ? <CheckCircle2 className="w-4 h-4" /> : step}
                    </div>
                    <span className="text-xs text-muted-foreground text-center">
                      {step === 1 ? "Firma" : "Kişisel & Başvuru"}
                    </span>
                  </div>
                ))}
              </div>
              <Progress value={(registerStep / 2) * 100} className="h-1.5" />

              {/* Step 1: Firma Bilgileri */}
              {registerStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Firma Bilgileri</h3>
                  <div className="space-y-2">
                    <Label>Firma Türü</Label>
                    <Select value={selectedTurId} onValueChange={(v) => { setSelectedTurId(v); setSelectedTipId(""); }}>
                      <SelectTrigger><SelectValue placeholder="Firma Türü Seçiniz" /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {firmaTurleri?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Firma Tipi</Label>
                    <Select value={selectedTipId} onValueChange={setSelectedTipId} disabled={!selectedTurId}>
                      <SelectTrigger><SelectValue placeholder="Firma Tipi Seçiniz" /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {firmaTipleri?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Firma Ünvanı</Label>
                    <Input placeholder="Firma Ünvanı" value={firmaUnvani} onChange={(e) => setFirmaUnvani(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vergi Numarası</Label>
                    <Input
                      placeholder="Vergi Numarası (maks. 11 hane)"
                      value={vergiNumarasi}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                        setVergiNumarasi(val);
                      }}
                      maxLength={11}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vergi Dairesi</Label>
                    <Input
                      placeholder="Vergi Dairesi"
                      value={vergiDairesi}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s]/g, "");
                        setVergiDairesi(val);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      if (!selectedTurId || !selectedTipId || !firmaUnvani || !vergiNumarasi || !vergiDairesi) {
                        toast({ title: "Hata", description: "Lütfen tüm firma bilgilerini doldurunuz", variant: "destructive" });
                        return;
                      }
                      setRegisterStep(2);
                    }}
                  >
                    Devam Et
                  </Button>
                </div>
              )}

              {/* Step 2: Kişisel Bilgiler */}
              {registerStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Kişisel Bilgiler</h3>
                  <div className="space-y-2">
                    <Label>Ad</Label>
                    <Input placeholder="Ad" value={ad} onChange={(e) => setAd(e.target.value)} disabled={otpSent} />
                  </div>
                  <div className="space-y-2">
                    <Label>Soyad</Label>
                    <Input placeholder="Soyad" value={soyad} onChange={(e) => setSoyad(e.target.value)} disabled={otpSent} />
                  </div>
                  <div className="space-y-2">
                    <Label>İletişim E-Posta Adresi</Label>
                    <Input
                      type="email"
                      placeholder="ornek@firma.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={otpSent}
                    />
                    {email && !isValidEmail(email) && (
                      <p className="text-xs text-destructive">Geçerli bir e-posta adresi giriniz</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>İletişim Numarası</Label>
                    <div className="flex gap-2">
                      <CountryCodeSelect
                        value={countryCode}
                        onChange={(code) => { setCountryCode(code); if (phoneVerified) { setPhoneVerified(false); setOtpSent(false); setOtpCode(""); } }}
                        disabled={phoneVerified || otpSent}
                      />
                      <Input
                        placeholder="532 XXX XX XX"
                        value={telefon}
                        onChange={(e) => {
                          const formatted = formatPhoneDisplay(e.target.value);
                          setTelefon(formatted);
                          if (phoneVerified) { setPhoneVerified(false); setOtpSent(false); setOtpCode(""); }
                        }}
                        disabled={phoneVerified || otpSent}
                        className="flex-1"
                        inputMode="tel"
                      />
                    </div>
                  </div>

                  {/* Inline OTP Verification */}
                  {otpSent && !phoneVerified && (
                    <div className="space-y-4 pt-2 border-t border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Telefon Doğrulama</p>
                          <p className="text-xs text-muted-foreground">
                            {getFormattedPhone()} numaranıza 6 haneli bir kod gönderdik.
                          </p>
                        </div>
                      </div>

                      {otpCountdown > 0 && (
                        <p className="text-center text-xs text-muted-foreground">
                          Kalan Süre: {otpMinutes}:{String(otpSeconds).padStart(2, "0")}
                        </p>
                      )}

                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                          <InputOTPGroup className="gap-2">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot
                                key={i}
                                index={i}
                                className="w-10 h-12 text-base font-semibold rounded-lg border-2 border-border first:rounded-l-lg last:rounded-r-lg"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || otpCode.length !== 6}
                      >
                        {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Doğrula ve Başvuruyu Gönder
                      </Button>

                      <div className="text-center">
                        {otpCountdown > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Kodu alamadınız mı? <span className="text-foreground font-medium">{otpMinutes}:{String(otpSeconds).padStart(2, "0")}</span> sonra tekrar gönderebilirsiniz.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Kodu alamadınız mı?</p>
                            <Button
                              variant="link"
                              className="text-xs text-primary p-0 h-auto"
                              onClick={() => { setOtpCode(""); handleSendOtp(); }}
                              disabled={sendingOtp}
                            >
                              {sendingOtp ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                              Yeniden Kod Gönder
                            </Button>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
                        onClick={() => { setOtpSent(false); setOtpCode(""); }}
                      >
                        <ArrowLeft className="w-3 h-3 mr-1" /> Bilgileri Düzenle
                      </Button>
                    </div>
                  )}

                  {/* Action buttons (hidden when OTP is active) */}
                  {!otpSent && (
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setRegisterStep(1)}>Geri</Button>
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={() => {
                          if (!ad || !soyad || !email || !telefon) {
                            toast({ title: "Hata", description: "Lütfen tüm kişisel bilgileri doldurunuz", variant: "destructive" });
                            return;
                          }
                          if (!isValidEmail(email)) {
                            toast({ title: "Hata", description: "Geçerli bir e-posta adresi giriniz", variant: "destructive" });
                            return;
                          }
                          if (telefon.replace(/\D/g, "").length < 7) {
                            toast({ title: "Hata", description: "Geçerli bir telefon numarası giriniz", variant: "destructive" });
                            return;
                          }
                          handleSendOtp();
                        }}
                        disabled={sendingOtp || !ad || !soyad || !email || !isValidEmail(email) || !telefon}
                      >
                        {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Başvuru Yap
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GirisKayit;
