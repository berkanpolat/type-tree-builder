import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, ShieldCheck, Phone } from "lucide-react";
import logoImg from "@/assets/tekstil-as-logo.png";

const formatPhoneDisplay = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
};

export default function TelefonDogrulama() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [telefon, setTelefon] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [existingPhone, setExistingPhone] = useState<string | null>(null);

  // Check if user is logged in and needs verification
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/giris-kayit", { replace: true });
        return;
      }
      setUserId(user.id);

      // Check if already verified
      const { data: profile } = await supabase
        .from("profiles")
        .select("telefon_dogrulandi, iletisim_numarasi")
        .eq("user_id", user.id)
        .single();

      if (profile?.telefon_dogrulandi) {
        navigate("/dashboard", { replace: true });
        return;
      }

      if (profile?.iletisim_numarasi) {
        // Pre-fill existing phone (strip country code if starts with +90)
        let ph = profile.iletisim_numarasi.replace(/\D/g, "");
        if (ph.startsWith("90") && ph.length === 12) ph = ph.slice(2);
        if (ph.startsWith("0") && ph.length === 11) ph = ph.slice(1);
        setExistingPhone(profile.iletisim_numarasi);
        setTelefon(ph);
      }

      setLoading(false);
    };
    check();
  }, [navigate]);

  // Countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setInterval(() => setOtpCountdown((p) => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(t);
  }, [otpCountdown]);

  const rawPhone = telefon.replace(/\D/g, "").replace(/^0+/, "");
  const fullPhone = "+90" + rawPhone;

  const handleSendOtp = async () => {
    if (rawPhone.length !== 10) {
      toast({ title: "Hata", description: "Geçerli bir telefon numarası giriniz", variant: "destructive" });
      return;
    }
    setSendingOtp(true);
    try {
      // Update phone number in profile first
      const formattedPhone = `+90${rawPhone}`;
      await supabase.from("profiles").update({ iletisim_numarasi: formattedPhone }).eq("user_id", userId);

      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { telefon: formattedPhone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      setOtpCountdown(120);
      toast({ title: "Başarılı", description: "Doğrulama kodu gönderildi" });
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "SMS gönderilemedi", variant: "destructive" });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-otp", {
        body: { telefon: fullPhone, kod: otpCode },
      });
      console.log("[OTP-VERIFY] response:", { data, error });
      if (error) {
        const errMsg = typeof error === 'object' && error !== null
          ? (error as any)?.message || (error as any)?.context?.error || "Doğrulama başarısız"
          : String(error);
        throw new Error(errMsg);
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.verified) throw new Error("Doğrulama başarısız");

      // Mark phone as verified
      const { error: updateError } = await supabase.from("profiles").update({ telefon_dogrulandi: true }).eq("user_id", userId);
      if (updateError) console.error("[OTP-VERIFY] profile update error:", updateError);

      toast({ title: "Başarılı", description: "Telefon numaranız doğrulandı!" });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error("[OTP-VERIFY] error:", err);
      toast({ title: "Hata", description: err?.message || "Doğrulama başarısız", variant: "destructive" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/giris-kayit", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const otpMinutes = Math.floor(otpCountdown / 60);
  const otpSeconds = otpCountdown % 60;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center mb-4">
          <img src={logoImg} alt="Tekstil A.Ş." className="h-10 object-contain" />
        </div>

        <div className="border border-border rounded-xl p-6 bg-card shadow-sm space-y-5">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-7 h-7 text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground">Telefon Doğrulama</h1>
            <p className="text-sm text-muted-foreground">
              Hesabınızı kullanabilmek için cep telefonu numaranızı doğrulamanız gerekmektedir.
            </p>
          </div>

          {!otpSent ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cep Telefonu</Label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center h-10 px-3 rounded-md border border-input bg-muted text-sm font-medium shrink-0">
                    🇹🇷 +90
                  </div>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="5XX XXX XX XX"
                    value={formatPhoneDisplay(telefon)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
                      setTelefon(digits);
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
              <Button
                onClick={handleSendOtp}
                disabled={sendingOtp || rawPhone.length !== 10}
                className="w-full"
              >
                {sendingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gönderiliyor...
                  </>
                ) : (
                  "Doğrulama Kodu Gönder"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">+90 {formatPhoneDisplay(telefon)}</span> numarasına gönderilen 6 haneli kodu giriniz
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otpCode.length !== 6}
                className="w-full"
              >
                {verifyingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Doğrulanıyor...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" /> Doğrula
                  </>
                )}
              </Button>
              <div className="text-center">
                {otpCountdown > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Tekrar gönder: {otpMinutes}:{String(otpSeconds).padStart(2, "0")}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Tekrar Kod Gönder
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-center text-sm text-muted-foreground hover:underline"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
