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
import { CheckCircle2, Loader2 } from "lucide-react";
import authBg from "@/assets/auth-bg.jpg";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import CountryCodeSelect from "@/components/CountryCodeSelect";

const GirisKayit = () => {
  const [activeTab, setActiveTab] = useState<"giris" | "kayit">("giris");
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
  const [password, setPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  // Phone verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Build full phone number (strip leading 0)
  const getFullPhone = () => {
    const cleaned = telefon.replace(/\s/g, "").replace(/^0+/, "");
    return `${countryCode}${cleaned}`;
  };

  // Countdown timer for resend
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    if (!telefon || telefon.length < 10) {
      toast({ title: "Hata", description: "Geçerli bir telefon numarası giriniz", variant: "destructive" });
      return;
    }
    setSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { telefon },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setOtpSent(true);
      setOtpCountdown(120); // 2 minute cooldown
      toast({ title: "Kod gönderildi", description: `${telefon} numarasına doğrulama kodu gönderildi.` });
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
        body: { telefon, kod: otpCode },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.verified) throw new Error("Doğrulama başarısız");

      setPhoneVerified(true);
      toast({ title: "Doğrulandı", description: "Telefon numaranız başarıyla doğrulandı." });
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
      return data;
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurId || !selectedTipId) {
      toast({ title: "Hata", description: "Firma türü ve tipi seçiniz", variant: "destructive" });
      return;
    }
    if (!phoneVerified) {
      toast({ title: "Hata", description: "Lütfen telefon numaranızı doğrulayın", variant: "destructive" });
      return;
    }
    setRegisterLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
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
        p_iletisim_numarasi: telefon,
        p_firma_turu_id: selectedTurId,
        p_firma_tipi_id: selectedTipId,
        p_firma_unvani: firmaUnvani,
        p_vergi_numarasi: vergiNumarasi,
        p_vergi_dairesi: vergiDairesi,
      });
      if (rpcError) throw rpcError;

      toast({ title: "Kayıt başarılı", description: "Lütfen e-posta adresinizi doğrulayın." });
      setActiveTab("giris");
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
                <Input
                  type="email"
                  placeholder="E-posta"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input
                  type="password"
                  placeholder="Şifre"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? "Giriş yapılıyor..." : "Giriş"}
              </Button>
              <p className="text-center text-sm text-muted-foreground cursor-pointer hover:underline">
                Parolamı Unuttum?
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Firma Türü */}
              <div className="space-y-2">
                <Label>Firma Türü</Label>
                <Select
                  value={selectedTurId}
                  onValueChange={(v) => {
                    setSelectedTurId(v);
                    setSelectedTipId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Firma Türü Seçiniz" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {firmaTurleri?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Firma Tipi */}
              <div className="space-y-2">
                <Label>Firma Tipi</Label>
                <Select
                  value={selectedTipId}
                  onValueChange={setSelectedTipId}
                  disabled={!selectedTurId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Firma Tipi Seçiniz" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {firmaTipleri?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Firma Ünvanı */}
              <div className="space-y-2">
                <Label>Firma Ünvanı</Label>
                <Input placeholder="Firma Ünvanı" value={firmaUnvani} onChange={(e) => setFirmaUnvani(e.target.value)} required />
              </div>

              {/* Vergi Numarası */}
              <div className="space-y-2">
                <Label>Vergi Numarası</Label>
                <Input placeholder="Vergi Numarası" value={vergiNumarasi} onChange={(e) => setVergiNumarasi(e.target.value)} required />
              </div>

              {/* Vergi Dairesi */}
              <div className="space-y-2">
                <Label>Vergi Dairesi</Label>
                <Input placeholder="Vergi Dairesi" value={vergiDairesi} onChange={(e) => setVergiDairesi(e.target.value)} required />
              </div>

              {/* Ad */}
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input placeholder="Ad" value={ad} onChange={(e) => setAd(e.target.value)} required />
              </div>

              {/* Soyad */}
              <div className="space-y-2">
                <Label>Soyad</Label>
                <Input placeholder="Soyad" value={soyad} onChange={(e) => setSoyad(e.target.value)} required />
              </div>

              {/* İletişim E-Posta */}
              <div className="space-y-2">
                <Label>İletişim E-Posta Adresi</Label>
                <Input type="email" placeholder="İletişim E-Posta Adresi" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              {/* İletişim Numarası + Doğrulama */}
              <div className="space-y-2">
                <Label>İletişim Numarası</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="05XX XXX XX XX"
                    value={telefon}
                    onChange={(e) => {
                      setTelefon(e.target.value);
                      if (phoneVerified) {
                        setPhoneVerified(false);
                        setOtpSent(false);
                        setOtpCode("");
                      }
                    }}
                    disabled={phoneVerified}
                    className="flex-1"
                    required
                  />
                  {!phoneVerified && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || otpCountdown > 0 || !telefon || telefon.length < 10}
                      className="shrink-0"
                    >
                      {sendingOtp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : otpCountdown > 0 ? (
                        `${Math.floor(otpCountdown / 60)}:${String(otpCountdown % 60).padStart(2, "0")}`
                      ) : otpSent ? (
                        "Tekrar Gönder"
                      ) : (
                        "Kod Gönder"
                      )}
                    </Button>
                  )}
                  {phoneVerified && (
                    <div className="flex items-center gap-1 text-sm text-green-600 shrink-0 px-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Doğrulandı
                    </div>
                  )}
                </div>

                {/* OTP Input */}
                {otpSent && !phoneVerified && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground">
                      {telefon} numarasına gönderilen 6 haneli kodu giriniz:
                    </p>
                    <div className="flex items-center gap-3">
                      <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || otpCode.length !== 6}
                      >
                        {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Doğrula"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Şifre */}
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input type="password" placeholder="Şifre (min 6 karakter)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>

              <Button type="submit" className="w-full" disabled={registerLoading || !phoneVerified}>
                {registerLoading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default GirisKayit;
