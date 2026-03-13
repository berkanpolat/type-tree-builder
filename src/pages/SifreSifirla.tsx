import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/tekstil-as-logo.png";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";

export default function SifreSifirla() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    // 1. If token_hash is in URL, verify it via Supabase OTP verification
    if (tokenHash && type === "recovery") {
      setVerifying(true);
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ data, error }) => {
          if (error) {
            console.error("[SifreSifirla] verifyOtp error:", error.message);
            setValidSession(false);
          } else if (data?.session) {
            setValidSession(true);
          }
        })
        .finally(() => setVerifying(false));
      return;
    }

    // 2. Check recovery hash (legacy flow)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashType = hashParams.get("type");
    
    if (hashType === "recovery") {
      setValidSession(true);
    }

    // 3. Check active session + must_set_password
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setValidSession(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Hata", description: "Şifre en az 6 karakter olmalıdır.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const existingMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
      const { error } = await supabase.auth.updateUser({
        password,
        data: {
          ...existingMetadata,
          must_set_password: false,
        },
      });
      if (error) throw error;
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err: any) {
      let msg = err.message;
      if (msg?.includes("same password")) msg = "Yeni şifreniz mevcut şifrenizle aynı olamaz.";
      toast({ title: "Hata", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground">Şifreniz Güncellendi!</h2>
          <p className="text-sm text-muted-foreground">Yeni şifreniz başarıyla kaydedildi. Artık giriş yapabilirsiniz.</p>
          <Button className="w-full" onClick={() => navigate("/giris-kayit")}>
            Giriş Sayfasına Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border p-8 space-y-6">
        <div className="flex justify-center">
          <img src={logoImg} alt="Tekstil A.Ş." className="h-10 object-contain" />
        </div>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Yeni Şifre Belirle</h1>
          <p className="text-sm text-muted-foreground mt-2">Lütfen yeni şifrenizi giriniz.</p>
        </div>

        {verifying ? (
          <div className="text-center space-y-4">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Bağlantı doğrulanıyor...</p>
          </div>
        ) : !validSession ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">Geçersiz veya süresi dolmuş bağlantı. Lütfen yeniden şifre sıfırlama talebinde bulununuz.</p>
            <Button className="w-full" onClick={() => navigate("/giris-kayit")}>
              Giriş Sayfasına Dön
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <Input
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Şifre Tekrar</Label>
              <Input
                type="password"
                placeholder="Şifrenizi tekrar giriniz"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
