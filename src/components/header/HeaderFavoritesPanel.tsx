import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Building2, ShoppingBag } from "lucide-react";

interface FavFirma {
  id: string;
  firma_id: string;
  firma_unvani: string;
  slug: string | null;
}

interface FavUrun {
  id: string;
  urun_id: string;
  baslik: string;
  foto_url: string | null;
  slug: string | null;
}

export default function HeaderFavoritesPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [firmalar, setFirmalar] = useState<FavFirma[]>([]);
  const [urunler, setUrunler] = useState<FavUrun[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFavorites = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [firmaRes, urunRes] = await Promise.all([
      supabase.from("firma_favoriler").select("id, firma_id").eq("user_id", user.id).limit(10),
      supabase.from("urun_favoriler").select("id, urun_id").eq("user_id", user.id).limit(10),
    ]);

    const firmaItems: FavFirma[] = [];
    if (firmaRes.data) {
      for (const f of firmaRes.data) {
        const { data: firma } = await supabase.from("firmalar").select("firma_unvani, slug").eq("id", f.firma_id).single();
        firmaItems.push({ id: f.id, firma_id: f.firma_id, firma_unvani: firma?.firma_unvani || "—", slug: firma?.slug || null });
      }
    }

    const urunItems: FavUrun[] = [];
    if (urunRes.data) {
      for (const u of urunRes.data) {
        const { data: urun } = await supabase.from("urunler").select("baslik, foto_url, slug").eq("id", u.urun_id).single();
        urunItems.push({ id: u.id, urun_id: u.urun_id, baslik: urun?.baslik || "—", foto_url: urun?.foto_url || null, slug: urun?.slug || null });
      }
    }

    setFirmalar(firmaItems);
    setUrunler(urunItems);
    setTotalCount((firmaRes.data?.length || 0) + (urunRes.data?.length || 0));
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchFavorites();
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Heart className="w-5 h-5 text-muted-foreground" />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="font-semibold text-sm">Favorilerim</h3>
          <button
            onClick={() => { setOpen(false); navigate("/favoriler"); }}
            className="text-xs text-primary hover:underline"
          >
            Tümünü Gör
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">Yükleniyor...</p>
          </div>
        ) : (
          <Tabs defaultValue="firmalar" className="w-full">
            <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0">
              <TabsTrigger value="firmalar" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2">
                Firmalar ({firmalar.length})
              </TabsTrigger>
              <TabsTrigger value="urunler" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2">
                Ürünler ({urunler.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="firmalar" className="m-0 max-h-[280px] overflow-y-auto">
              {firmalar.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <Building2 className="w-8 h-8 text-muted-foreground/30 mb-1" />
                  <p className="text-xs text-muted-foreground">Favori firma yok.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {firmalar.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setOpen(false); navigate(`/${f.slug || f.firma_id}`); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm truncate">{f.firma_unvani}</span>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="urunler" className="m-0 max-h-[280px] overflow-y-auto">
              {urunler.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <ShoppingBag className="w-8 h-8 text-muted-foreground/30 mb-1" />
                  <p className="text-xs text-muted-foreground">Favori ürün yok.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {urunler.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { setOpen(false); navigate(`/urunler/${u.slug || u.urun_id}`); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-2.5"
                    >
                      <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
                        {u.foto_url ? (
                          <img src={u.foto_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm truncate">{u.baslik}</span>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
}
