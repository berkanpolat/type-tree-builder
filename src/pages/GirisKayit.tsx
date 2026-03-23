import { useState, useEffect } from "react";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import logoImg from "@/assets/tekstil-as-logo.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";
import authBg from "@/assets/auth-bg.jpg";
import LandingRegistrationForm from "@/components/landing/LandingRegistrationForm";

const GirisKayit = () => {
  useSeoMeta({ slug: "/giris-kayit", fallbackTitle: "Giriş Yap veya Kayıt Ol | Tekstil A.Ş." });
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"giris" | "kayit">(tabParam === "kayit" ? "kayit" : "giris");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tekstilas_remember");
      if (saved) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
        if (savedEmail) setLoginEmail(savedEmail);
        if (savedPassword) setLoginPassword(savedPassword);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  // URL tab param sync
  useEffect(() => {
    if (tabParam === "kayit" || tabParam === "giris") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      if (rememberMe) {
        localStorage.setItem("tekstilas_remember", JSON.stringify({ email: loginEmail, password: loginPassword }));
      } else {
        localStorage.removeItem("tekstilas_remember");
      }
      toast({ title: "Giriş başarılı" });
      navigate("/firmalar");
    } catch (error: any) {
      let msg = error.message;
      if (msg?.includes("Invalid login")) msg = "E-posta veya şifre hatalı.";
      else if (msg?.includes("Email not confirmed")) msg = "E-posta adresiniz henüz doğrulanmamış.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    } finally {
      setLoginLoading(false);
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
              {searchParams.get("odeme") === "basarili" && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center space-y-1">
                  <div className="flex justify-center"><CheckCircle2 className="w-6 h-6 text-green-600" /></div>
                  <p className="text-sm font-medium text-green-800">PRO paketiniz başarıyla aktifleştirildi!</p>
                  <p className="text-xs text-green-700">E-postanıza gönderilen şifre bağlantısıyla giriş yapabilirsiniz.</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" placeholder="E-posta" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input type="password" placeholder="Şifre" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => {
                    setRememberMe(!!checked);
                    if (!checked) localStorage.removeItem("tekstilas_remember");
                  }}
                />
                <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer text-muted-foreground">
                  Giriş bilgilerimi kaydet
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? "Giriş yapılıyor..." : "Giriş"}
              </Button>
              {forgotSent ? (
                <p className="text-center text-sm text-green-600 font-medium py-2">
                  ✓ Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol ediniz.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={forgotLoading}
                  className="w-full text-center text-sm text-muted-foreground cursor-pointer hover:underline disabled:opacity-50"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!loginEmail) {
                      toast({ title: "Hata", description: "Lütfen e-posta adresinizi giriniz.", variant: "destructive" });
                      return;
                    }
                    setForgotLoading(true);
                    try {
                      const { data, error: fnError } = await supabase.functions.invoke("send-password-reset", {
                        body: { email: loginEmail, redirectUrl: window.location.origin },
                      });
                      if (fnError) throw fnError;
                      setForgotSent(true);
                      toast({ title: "Başarılı", description: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." });
                    } catch (err: any) {
                      toast({ title: "Hata", description: err?.message || "Şifre sıfırlama isteği gönderilemedi.", variant: "destructive" });
                    } finally {
                      setForgotLoading(false);
                    }
                  }}
                >
                  {forgotLoading ? "Gönderiliyor..." : "Parolamı Unuttum?"}
                </button>
              )}
            </form>
          ) : (
            <LandingRegistrationForm
              selectedPackage="ucretsiz"
              billingYearly={false}
              onBack={() => setActiveTab("giris")}
              hideHeader
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GirisKayit;
