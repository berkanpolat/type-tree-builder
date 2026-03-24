import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download } from "lucide-react";

interface LeadCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kaynak: string;
}

export default function LeadCaptureDialog({ open, onOpenChange, kaynak }: LeadCaptureDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ad: "", soyad: "", email: "", telefon: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.ad.trim()) e.ad = "Ad zorunludur";
    if (!form.soyad.trim()) e.soyad = "Soyad zorunludur";
    if (!form.email.trim()) e.email = "E-posta zorunludur";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Geçerli bir e-posta girin";
    if (!form.telefon.trim()) e.telefon = "Telefon zorunludur";
    else if (form.telefon.replace(/\D/g, "").length < 10) e.telefon = "Geçerli bir telefon numarası girin";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("lead_basvurular").insert({
        ad: form.ad.trim(),
        soyad: form.soyad.trim(),
        email: form.email.trim().toLowerCase(),
        telefon: form.telefon.trim(),
        kaynak,
      });
      if (error) throw error;
      toast({ title: "Başarılı", description: "Bilgileriniz alındı. PDF indiriliyor..." });
      onOpenChange(false);
      // Trigger PDF download
      const link = document.createElement("a");
      link.href = "/Tekstil_AS_Kurumsal_Sunum_v2.pdf";
      link.download = "Tekstil_AS_Kurumsal_Sunum_v2.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setForm({ ad: "", soyad: "", email: "", telefon: "" });
      setErrors({});
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "İşlem başarısız", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-secondary" />
            Tanıtım PDF İndir
          </DialogTitle>
          <DialogDescription>
            PDF'i indirmek için lütfen bilgilerinizi doldurun.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-ad">Ad *</Label>
              <Input
                id="lead-ad"
                value={form.ad}
                onChange={(e) => setForm(p => ({ ...p, ad: e.target.value }))}
                placeholder="Adınız"
              />
              {errors.ad && <p className="text-xs text-destructive">{errors.ad}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-soyad">Soyad *</Label>
              <Input
                id="lead-soyad"
                value={form.soyad}
                onChange={(e) => setForm(p => ({ ...p, soyad: e.target.value }))}
                placeholder="Soyadınız"
              />
              {errors.soyad && <p className="text-xs text-destructive">{errors.soyad}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-email">E-posta *</Label>
            <Input
              id="lead-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="ornek@firma.com"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-telefon">Telefon *</Label>
            <Input
              id="lead-telefon"
              type="tel"
              value={form.telefon}
              onChange={(e) => setForm(p => ({ ...p, telefon: e.target.value }))}
              placeholder="05XX XXX XX XX"
            />
            {errors.telefon && <p className="text-xs text-destructive">{errors.telefon}</p>}
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {loading ? "Gönderiliyor..." : "İndir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
