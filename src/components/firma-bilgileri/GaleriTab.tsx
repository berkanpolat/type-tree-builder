import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Image as ImageIcon, Upload, Trash2, Pencil, Check, X } from "lucide-react";

interface Foto {
  id: string;
  foto_url: string;
  foto_adi: string;
}

interface GaleriTabProps {
  userId: string;
}

export default function GaleriTab({ userId }: GaleriTabProps) {
  const [firmaId, setFirmaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [fotolar, setFotolar] = useState<Foto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    const load = async () => {
      const firmaRes = await supabase.from("firmalar").select("id").eq("user_id", userId).single();
      if (firmaRes.data) {
        setFirmaId(firmaRes.data.id);
        const { data } = await supabase
          .from("firma_galeri")
          .select("*")
          .eq("firma_id", firmaRes.data.id)
          .order("created_at");
        if (data) setFotolar(data.map(f => ({ id: f.id, foto_url: f.foto_url, foto_adi: f.foto_adi || "" })));
      }
      setLoading(false);
    };
    if (userId) load();
  }, [userId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newFotolar: Foto[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const fileName = `galeri/${firmaId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from("firma-images").upload(fileName, file, { upsert: true });
      if (error) {
        toast({ title: "Yükleme hatası", description: error.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("firma-images").getPublicUrl(fileName);

      const { data, error: dbError } = await supabase.from("firma_galeri").insert({
        firma_id: firmaId,
        foto_url: urlData.publicUrl,
        foto_adi: baseName,
      }).select().single();

      if (dbError) {
        toast({ title: "Kayıt hatası", description: dbError.message, variant: "destructive" });
        continue;
      }

      newFotolar.push({ id: data.id, foto_url: urlData.publicUrl, foto_adi: baseName });
    }

    setFotolar(prev => [...prev, ...newFotolar]);
    if (newFotolar.length > 0) toast({ title: `${newFotolar.length} fotoğraf yüklendi` });
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (foto: Foto) => {
    const { error } = await supabase.from("firma_galeri").delete().eq("id", foto.id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }

    const path = foto.foto_url.split("/firma-images/")[1];
    if (path) await supabase.storage.from("firma-images").remove([path]);

    setFotolar(prev => prev.filter(f => f.id !== foto.id));
    toast({ title: "Fotoğraf silindi" });
  };

  const handleEditName = async (id: string) => {
    const { error } = await supabase.from("firma_galeri").update({ foto_adi: editName }).eq("id", id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    setFotolar(prev => prev.map(f => f.id === id ? { ...f, foto_adi: editName } : f));
    setEditingId(null);
    setEditName("");
    toast({ title: "İsim güncellendi" });
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Galeri</h2>
        </div>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          <div className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            <Upload className="w-4 h-4" />
            {uploading ? "Yükleniyor..." : "Fotoğraf Yükle"}
          </div>
        </label>
      </div>

      {fotolar.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <ImageIcon className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">Henüz fotoğraf eklenmemiş</p>
          <p className="text-xs mt-1">Yukarıdaki butonu kullanarak fotoğraf yükleyebilirsiniz</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {fotolar.map(foto => (
            <div key={foto.id} className="group relative border border-border rounded-lg overflow-hidden bg-background">
              <div className="aspect-square">
                <img src={foto.foto_url} alt={foto.foto_adi} className="w-full h-full object-cover" />
              </div>
              <div className="p-2">
                {editingId === foto.id ? (
                  <div className="flex gap-1">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={e => e.key === "Enter" && handleEditName(foto.id)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleEditName(foto.id)} className="h-7 w-7 shrink-0">
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingId(null); setEditName(""); }} className="h-7 w-7 shrink-0">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground truncate flex-1">{foto.foto_adi || "İsimsiz"}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingId(foto.id); setEditName(foto.foto_adi); }} className="h-6 w-6">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(foto)} className="h-6 w-6 text-destructive hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
