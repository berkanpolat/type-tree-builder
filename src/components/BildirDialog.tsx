import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type BildirTur = "mesaj" | "ihale" | "urun" | "profil";

interface BildirDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tur: BildirTur;
  referansId: string;
}

const sebeplerMap: Record<BildirTur, string[]> = {
  mesaj: [
    "Spam / Reklam Mesajı",
    "Dolandırıcılık Şüphesi",
    "Uygunsuz Dil veya Hakaret",
    "Taciz / Rahatsız Edici Mesajlar",
    "Konu Dışı Mesaj",
    "Sahte İş Teklifi",
    "Kötü Amaçlı Link veya Dosya",
    "Sürekli Tekrarlanan Mesajlar",
    "Ticari Etik Dışı Davranış",
    "Diğer",
  ],
  profil: [
    "Sahte Firma / Sahte Profil",
    "Yanlış veya Yanıltıcı Bilgi",
    "Başkasına Ait Firma Bilgileri Kullanımı",
    "Dolandırıcılık Şüphesi",
    "İletişim Bilgileri Sahte",
    "Yetkisiz Hesap (firma çalışanı olmayan biri)",
    "Uygunsuz Profil İçeriği",
    "Marka / Logo Taklidi",
    "Telif Hakkı İhlali",
    "Diğer",
  ],
  ihale: [
    "Sahte İhale",
    "Gerçekçi Olmayan Fiyat Talebi",
    "Yanıltıcı İhale Açıklaması",
    "İhale Kurallarına Aykırı İçerik",
    "Spam Amaçlı İhale",
    "Aynı İhalenin Tekrar Açılması",
    "Dolandırıcılık Şüphesi",
    "İhale Sahibinin Kötü Niyetli Davranışı",
    "İhale İçeriğinde Uygunsuz İçerik",
    "Diğer",
  ],
  urun: [
    "Yanlış Ürün Bilgisi",
    "Sahte Ürün",
    "Telif Hakkı / Marka İhlali",
    "Yanıltıcı Görseller",
    "Gerçekçi Olmayan Fiyat",
    "Uygunsuz Ürün",
    "Yasaklı Ürün",
    "Spam Ürün İlanı",
    "Başkasına Ait Ürün Fotoğrafı",
    "Diğer",
  ],
};

const turLabels: Record<BildirTur, string> = {
  mesaj: "Mesajı Bildir",
  ihale: "İhaleyi Bildir",
  urun: "Ürünü Bildir",
  profil: "Profili Bildir",
};

export default function BildirDialog({ open, onOpenChange, tur, referansId }: BildirDialogProps) {
  const [sebep, setSebep] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sebepler = sebeplerMap[tur];

  const reset = () => {
    setSebep("");
    setAciklama("");
    setFile(null);
    setSubmitting(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "Dosya çok büyük", description: "Maksimum 10MB dosya yükleyebilirsiniz.", variant: "destructive" });
      return;
    }
    setFile(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!sebep) {
      toast({ title: "Şikayet sebebi seçiniz", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Oturum açmanız gerekiyor", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    let ekDosyaUrl: string | null = null;
    let ekDosyaAdi: string | null = null;

    if (file) {
      const ext = file.name.split(".").pop() || "file";
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("sikayet-files").upload(path, file);
      if (uploadError) {
        toast({ title: "Dosya yükleme hatası", description: uploadError.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("sikayet-files").getPublicUrl(path);
      ekDosyaUrl = urlData.publicUrl;
      ekDosyaAdi = file.name;
    }

    const { error } = await supabase.from("sikayetler").insert({
      bildiren_user_id: user.id,
      tur,
      referans_id: referansId,
      sebep,
      aciklama: aciklama || null,
      ek_dosya_url: ekDosyaUrl,
      ek_dosya_adi: ekDosyaAdi,
    });

    if (error) {
      toast({ title: "Bir hata oluştu", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    toast({ title: "Şikayetiniz alınmıştır", description: "En kısa sürede incelenecektir." });
    reset();
    onOpenChange(false);
  };

  const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{turLabels[tur]}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Size daha iyi ve hızlı yardımcı olabilmemiz için yaşadığınız sorunu lütfen detaylıca aktarın.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Sebep dropdown */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Şikayet Sebebi</label>
            <Select value={sebep} onValueChange={setSebep}>
              <SelectTrigger>
                <SelectValue placeholder="Lütfen bir kategori seçiniz.." />
              </SelectTrigger>
              <SelectContent className="z-[201]">
                {sebepler.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Açıklama */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Açıklama</label>
            <Textarea
              placeholder="Yaşadığınız problemi detaylı bir şekilde açıklayın.."
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={4}
            />
          </div>

          {/* Dosya yükleme */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Ekler (İsteğe Bağlı)</label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx"
            />
            {!file ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:border-secondary/50 hover:bg-muted/30 transition-colors"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tıklayın veya dosyayı buraya sürükleyin</span>
                <span className="text-xs text-muted-foreground">SVG, PNG, JPG veya PDF (Maks. 10MB)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5">
                {isImageFile(file.name) ? (
                  <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                <button onClick={() => setFile(null)} className="p-1 rounded-full hover:bg-muted shrink-0">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={submitting}>
              İptal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !sebep}>
              {submitting ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
