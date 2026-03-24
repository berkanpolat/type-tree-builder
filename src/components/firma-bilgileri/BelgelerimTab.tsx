import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, FileText, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

interface BelgelerimTabProps {
  userId: string;
  onDataChange?: () => void;
}

interface BelgeRecord {
  id: string;
  belge_turu: string;
  dosya_url: string;
  dosya_adi: string;
  durum: string;
  karar_sebebi: string | null;
  created_at: string;
}

const BELGE_TURLERI = [
  { key: "vergi_levhasi", label: "Vergi Levhası" },
  { key: "ticaret_sicil", label: "Ticaret Sicil Gazetesi" },
  { key: "imza_sirkusu", label: "İmza Sirküsü" },
];

export default function BelgelerimTab({ userId, onDataChange }: BelgelerimTabProps) {
  const { toast } = useToast();
  const [belgeler, setBelgeler] = useState<BelgeRecord[]>([]);
  const [firmaId, setFirmaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ turu: string; file: File } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchBelgeler = async () => {
    const { data: firma } = await supabase.from("firmalar").select("id").eq("user_id", userId).single();
    if (!firma) return;
    setFirmaId(firma.id);

    const { data } = await supabase
      .from("firma_belgeler")
      .select("*")
      .eq("firma_id", firma.id);
    setBelgeler((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) fetchBelgeler();
  }, [userId]);

  const handleFileSelect = (turu: string, file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Hata", description: "Sadece PDF formatında dosya yükleyebilirsiniz.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Hata", description: "Dosya boyutu en fazla 10MB olabilir.", variant: "destructive" });
      return;
    }
    setPendingFile({ turu, file });
    setConfirmOpen(true);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile || !firmaId) return;
    setConfirmOpen(false);
    setUploading(pendingFile.turu);

    const { turu, file } = pendingFile;
    const filePath = `${userId}/${turu}_${Date.now()}.pdf`;

    try {
      const { error: uploadErr } = await supabase.storage
        .from("firma-belgeler")
        .upload(filePath, file, { contentType: "application/pdf", upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("firma-belgeler").getPublicUrl(filePath);

      // Upsert the record
      const existing = belgeler.find(b => b.belge_turu === turu);
      if (existing) {
        await supabase.from("firma_belgeler").update({
          dosya_url: filePath,
          dosya_adi: file.name,
          durum: "inceleniyor",
          karar_sebebi: null,
          karar_tarihi: null,
          karar_veren: null,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("firma_belgeler").insert({
          firma_id: firmaId,
          user_id: userId,
          belge_turu: turu,
          dosya_url: filePath,
          dosya_adi: file.name,
          durum: "inceleniyor",
        });
      }

      toast({ title: "Başarılı", description: "Belge yüklendi ve incelemeye alındı." });
      onDataChange?.();
      fetchBelgeler();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Yükleme başarısız", variant: "destructive" });
    } finally {
      setUploading(null);
      setPendingFile(null);
    }
  };

  const allApproved = BELGE_TURLERI.every(bt =>
    belgeler.find(b => b.belge_turu === bt.key)?.durum === "onaylandi"
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {allApproved && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-semibold text-emerald-600">Onaylı Kullanıcı — Tüm belgeleriniz onaylanmıştır.</span>
        </div>
      )}

      <div className="grid gap-4">
        {BELGE_TURLERI.map(bt => {
          const belge = belgeler.find(b => b.belge_turu === bt.key);
          const isUploading = uploading === bt.key;

          return (
            <div key={bt.key} className="border rounded-lg p-5 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-sm">{bt.label}</h4>
                    {belge && (
                      <p className="text-xs text-muted-foreground mt-0.5">{belge.dosya_adi}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {belge ? (
                    <>
                      {belge.durum === "inceleniyor" && (
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-medium">İnceleniyor</span>
                        </div>
                      )}
                      {belge.durum === "onaylandi" && (
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Onaylandı</span>
                        </div>
                      )}
                      {belge.durum === "reddedildi" && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-red-500">
                            <XCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">Reddedildi</span>
                          </div>
                          {belge.karar_sebebi && (
                            <p className="text-xs text-red-400">{belge.karar_sebebi}</p>
                          )}
                        </div>
                      )}
                      {/* Allow re-upload if rejected */}
                      {belge.durum === "reddedildi" && (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileSelect(bt.key, f);
                              e.target.value = "";
                            }}
                          />
                          <Button variant="outline" size="sm" className="text-xs" asChild>
                            <span><Upload className="w-3.5 h-3.5 mr-1" /> Tekrar Yükle</span>
                          </Button>
                        </label>
                      )}
                    </>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileSelect(bt.key, f);
                          e.target.value = "";
                        }}
                      />
                      <Button variant="outline" size="sm" className="text-xs" disabled={isUploading} asChild>
                        <span>
                          {isUploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                          {isUploading ? "Yükleniyor..." : "PDF Yükle"}
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Belge Yükle</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{pendingFile?.file.name}</strong> dosyasını yüklemek istediğinize emin misiniz?
              Yüklenen belge incelemeye alınacaktır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpload}>Evet, Yükle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
