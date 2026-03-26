import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, ShieldCheck, Key, Mail, Phone } from "lucide-react";

export default function ProfilAyarlari() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ad, setAd] = useState("");
  const [soyad, setSoyad] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [authEmail, setAuthEmail] = useState("");

  // Dialogs
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Phone change
  const [newPhone, setNewPhone] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setAuthEmail(user.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      setAd(profile.ad || "");
      setSoyad(profile.soyad || "");
      setTelefon(profile.iletisim_numarasi || "");
      setEmail(profile.iletisim_email || "");
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        ad: ad.trim(),
        soyad: soyad.trim(),
        iletisim_numarasi: telefon.trim(),
        iletisim_email: email.trim(),
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Kaydedildi", description: "Kişisel bilgileriniz güncellendi." });
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Hata", description: "Yeni şifre en az 6 karakter olmalıdır.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor.", variant: "destructive" });
      return;
    }

    setPasswordLoading(true);

    // Re-authenticate with current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: currentPassword,
    });

    if (signInError) {
      toast({ title: "Hata", description: "Mevcut şifre yanlış.", variant: "destructive" });
      setPasswordLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Şifreniz başarıyla değiştirildi." });
      // Send "Şifre Değiştirildi" email + SMS
      try {
        const { data: { user: pwUser } } = await supabase.auth.getUser();
        const { data: myFirma } = await supabase.from("firmalar").select("firma_unvani").eq("user_id", pwUser?.id || "").single();
        await supabase.functions.invoke("send-email", {
          body: {
            type: "sifre_degistirildi",
            to: authEmail,
            templateModel: { firma_unvani: myFirma?.firma_unvani || "" },
          },
        });
        // Send SMS notification
        await supabase.functions.invoke("send-notification-sms", {
          body: { type: "sifre_degistirildi" },
        });
      } catch (e) { console.error("Password change notification failed:", e); }
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  };

  // Email change - password dialog state
  const [emailPassword, setEmailPassword] = useState("");

  const handleEmailChange = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast({ title: "Hata", description: "Geçerli bir e-posta adresi giriniz.", variant: "destructive" });
      return;
    }
    if (!emailPassword) {
      toast({ title: "Hata", description: "Mevcut şifrenizi giriniz.", variant: "destructive" });
      return;
    }

    setEmailLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("change-email", {
        body: { currentPassword: emailPassword, newEmail: newEmail.trim() },
      });

      if (error) {
        const msg = (error as any)?.context?.json?.error || error.message || "E-posta güncellenemedi.";
        toast({ title: "Hata", description: msg, variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Başarılı", description: "E-posta adresiniz başarıyla güncellendi." });
        setAuthEmail(newEmail.trim());
        setEmailOpen(false);
        setNewEmail("");
        setEmailPassword("");
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Beklenmeyen bir hata oluştu.", variant: "destructive" });
    }

    setEmailLoading(false);
  };

  const handlePhoneChange = async () => {
    if (!newPhone.trim()) {
      toast({ title: "Hata", description: "Geçerli bir telefon numarası giriniz.", variant: "destructive" });
      return;
    }

    setPhoneLoading(true);

    // Update phone in profile table
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPhoneLoading(false); return; }

    const { error } = await supabase
      .from("profiles")
      .update({ iletisim_numarasi: newPhone.trim() })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      setTelefon(newPhone.trim());
      toast({ title: "Başarılı", description: "Telefon numaranız başarıyla güncellendi." });
      setPhoneOpen(false);
      setNewPhone("");
    }
    setPhoneLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout title="Profil Ayarları">
        <div className="flex items-center justify-center py-20 text-muted-foreground"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profil Ayarları">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profil Ayarları</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kişisel bilgilerinizi ve hesap güvenlik ayarlarınızı yönetin.
          </p>
        </div>

        {/* Kişisel Bilgiler */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Kişisel Bilgiler</h2>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Ad</Label>
              <Input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ad" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Soyad</Label>
              <Input value={soyad} onChange={(e) => setSoyad(e.target.value)} placeholder="Soyad" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Telefon</Label>
              <Input value={telefon} readOnly disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">E-posta</Label>
              <Input value={email} readOnly disabled className="bg-muted" />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Hesap İşlemleri */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Hesap İşlemleri</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2 px-6 py-5"
              onClick={() => setPasswordOpen(true)}
            >
              <Key className="w-4 h-4" />
              Şifre Değiştir
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 px-6 py-5"
              onClick={() => setEmailOpen(true)}
            >
              <Mail className="w-4 h-4" />
              E-posta Değiştir
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 px-6 py-5"
              onClick={() => setPhoneOpen(true)}
            >
              <Phone className="w-4 h-4" />
              Telefon Numarası Değiştir
            </Button>
          </div>
        </Card>
      </div>

      {/* Şifre Değiştir Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Şifre Değiştir
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Mevcut Şifre</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mevcut şifrenizi giriniz"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Yeni Şifre</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifrenizi giriniz"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Yeni Şifre (Tekrar)</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifrenizi tekrar giriniz"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPasswordOpen(false)}>İptal</Button>
              <Button onClick={handlePasswordChange} disabled={passwordLoading}>
                {passwordLoading ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* E-posta Değiştir Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              E-posta Değiştir
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Mevcut e-posta: <strong className="text-foreground">{authEmail}</strong>
            </p>
            <div className="space-y-1.5">
              <Label>Yeni E-posta Adresi</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="yeni@eposta.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Yeni e-posta adresinize bir onay bağlantısı gönderilecektir.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEmailOpen(false)}>İptal</Button>
              <Button onClick={handleEmailChange} disabled={emailLoading}>
                {emailLoading ? "Gönderiliyor..." : "Onay Gönder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Telefon Değiştir Dialog */}
      <Dialog open={phoneOpen} onOpenChange={setPhoneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Telefon Numarası Değiştir
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Mevcut telefon: <strong className="text-foreground">{telefon || "Belirtilmedi"}</strong>
            </p>
            <div className="space-y-1.5">
              <Label>Yeni Telefon Numarası</Label>
              <Input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPhoneOpen(false)}>İptal</Button>
              <Button onClick={handlePhoneChange} disabled={phoneLoading}>
                {phoneLoading ? "Güncelleniyor..." : "Telefonu Güncelle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
