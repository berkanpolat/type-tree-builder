import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FirmaAvatar from "@/components/FirmaAvatar";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, Building2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FavFirma {
  id: string;
  firma_id: string;
  firma: {
    firma_unvani: string;
    logo_url: string | null;
    kurulus_il_id: string | null;
    kurulus_ilce_id: string | null;
    firma_tipi_id: string;
    slug: string | null;
  };
}

interface FavUrun {
  id: string;
  urun_id: string;
  urun: {
    baslik: string;
    foto_url: string | null;
    urun_kategori_id: string | null;
    urun_grup_id: string | null;
    user_id: string;
    slug: string | null;
  };
}

export default function Favoriler() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState("firmalar");
  const [favFirmalar, setFavFirmalar] = useState<FavFirma[]>([]);
  const [favUrunler, setFavUrunler] = useState<FavUrun[]>([]);
  const [loading, setLoading] = useState(true);
  const [secenekMap, setSecenekMap] = useState<Record<string, string>>({});
  const [firmaTipiMap, setFirmaTipiMap] = useState<Record<string, string>>({});
  const [firmaAdMap, setFirmaAdMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Fetch firma favorites
    const { data: fFirmalar } = await supabase
      .from("firma_favoriler")
      .select("id, firma_id, firmalar(firma_unvani, logo_url, kurulus_il_id, kurulus_ilce_id, firma_tipi_id, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch urun favorites
    const { data: fUrunler } = await supabase
      .from("urun_favoriler")
      .select("id, urun_id, urunler(baslik, foto_url, urun_kategori_id, urun_grup_id, user_id, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const parsedFirmalar: FavFirma[] = (fFirmalar || []).map((f: any) => ({
      id: f.id,
      firma_id: f.firma_id,
      firma: f.firmalar,
    }));

    const parsedUrunler: FavUrun[] = (fUrunler || []).map((u: any) => ({
      id: u.id,
      urun_id: u.urun_id,
      urun: u.urunler,
    }));

    setFavFirmalar(parsedFirmalar);
    setFavUrunler(parsedUrunler);

    // Resolve secenek names (il, ilce, kategori, grup)
    const ids = new Set<string>();
    parsedFirmalar.forEach((f) => {
      if (f.firma?.kurulus_il_id) ids.add(f.firma.kurulus_il_id);
      if (f.firma?.kurulus_ilce_id) ids.add(f.firma.kurulus_ilce_id);
    });
    parsedUrunler.forEach((u) => {
      if (u.urun?.urun_kategori_id) ids.add(u.urun.urun_kategori_id);
      if (u.urun?.urun_grup_id) ids.add(u.urun.urun_grup_id);
    });

    if (ids.size > 0) {
      const { data: secenekler } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .in("id", Array.from(ids));
      if (secenekler) {
        const map: Record<string, string> = {};
        secenekler.forEach((s) => { map[s.id] = s.name; });
        setSecenekMap(map);
      }
    }

    // Resolve firma tipi names
    const tipiIds = new Set<string>();
    parsedFirmalar.forEach((f) => {
      if (f.firma?.firma_tipi_id) tipiIds.add(f.firma.firma_tipi_id);
    });
    if (tipiIds.size > 0) {
      const { data: tipler } = await supabase
        .from("firma_tipleri")
        .select("id, name")
        .in("id", Array.from(tipiIds));
      if (tipler) {
        const map: Record<string, string> = {};
        tipler.forEach((t) => { map[t.id] = t.name; });
        setFirmaTipiMap(map);
      }
    }

    // Resolve firma names for urun owners
    const firmaUserIds = new Set<string>();
    parsedUrunler.forEach((u) => {
      if (u.urun?.user_id) firmaUserIds.add(u.urun.user_id);
    });
    if (firmaUserIds.size > 0) {
      const { data: firmalar } = await supabase
        .from("firmalar")
        .select("user_id, firma_unvani")
        .in("user_id", Array.from(firmaUserIds));
      if (firmalar) {
        const map: Record<string, string> = {};
        firmalar.forEach((f) => { map[f.user_id] = f.firma_unvani; });
        setFirmaAdMap(map);
      }
    }

    setLoading(false);
  };

  const removeFirmaFav = async (id: string) => {
    const { error } = await supabase.from("firma_favoriler").delete().eq("id", id);
    if (error) {
      toast({ title: "Hata", description: "Favori kaldırılamadı.", variant: "destructive" });
    } else {
      setFavFirmalar((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "Favoriden kaldırıldı" });
    }
  };

  const removeUrunFav = async (id: string) => {
    const { error } = await supabase.from("urun_favoriler").delete().eq("id", id);
    if (error) {
      toast({ title: "Hata", description: "Favori kaldırılamadı.", variant: "destructive" });
    } else {
      setFavUrunler((prev) => prev.filter((u) => u.id !== id));
      toast({ title: "Favoriden kaldırıldı" });
    }
  };

  const getLocation = (ilId: string | null, ilceId: string | null) => {
    const il = ilId ? secenekMap[ilId] : "";
    const ilce = ilceId ? secenekMap[ilceId] : "";
    if (il && ilce) return `${il}, ${ilce}`;
    if (il) return il;
    return ",";
  };

  return (
    <DashboardLayout title="Favoriler">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Favoriler</h2>
          <p className="text-sm text-muted-foreground">Kaydettiğiniz firmaları ve ürünleri tek ekrandan yönetin</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="firmalar">Favori Firmalar</TabsTrigger>
              <TabsTrigger value="urunler">Favori Ürünler</TabsTrigger>
            </TabsList>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {tab === "firmalar"
                ? `${favFirmalar.length} firma`
                : `${favUrunler.length} ürün`}
            </p>
          </div>

          <TabsContent value="firmalar" className="mt-4">
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : favFirmalar.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">Henüz favori firma eklenmemiş.</p>
            ) : (
              <div className="divide-y divide-border">
                {favFirmalar.map((fav) => (
                  <div key={fav.id} className="flex items-center gap-3 sm:gap-4 py-3 sm:py-4 px-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => fav.firma?.slug && navigate(`/${fav.firma.slug}`)}>
                     <FirmaAvatar firmaUnvani={fav.firma?.firma_unvani || "-"} logoUrl={fav.firma?.logo_url} size="md" className="sm:w-12 sm:h-12 sm:text-base" />
                     <div className="flex-1 min-w-0">
                       <p className="font-semibold text-foreground text-sm sm:text-base truncate">{fav.firma?.firma_unvani || "-"}</p>
                       <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-0.5 flex-wrap">
                         <span className="flex items-center gap-1 truncate">
                           📍 {getLocation(fav.firma?.kurulus_il_id, fav.firma?.kurulus_ilce_id)}
                         </span>
                         <span className="hidden sm:flex items-center gap-1">
                           🏢 {fav.firma?.firma_tipi_id ? firmaTipiMap[fav.firma.firma_tipi_id] || "-" : "-"}
                         </span>
                       </div>
                     </div>
                     <Button variant="outline" size="sm" className="shrink-0 hidden sm:flex" onClick={(e) => { e.stopPropagation(); fav.firma?.slug && navigate(`/${fav.firma.slug}`); }}>
                       Profili Gör
                     </Button>
                     <button
                       onClick={(e) => { e.stopPropagation(); removeFirmaFav(fav.id); }}
                       className="shrink-0 p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors"
                     >
                       <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-destructive fill-destructive" />
                     </button>
                   </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="urunler" className="mt-4">
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : favUrunler.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">Henüz favori ürün eklenmemiş.</p>
            ) : (
              <div className="divide-y divide-border">
                {favUrunler.map((fav) => (
                  <div key={fav.id} className="flex items-center gap-3 sm:gap-4 py-3 sm:py-4 px-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => fav.urun?.slug && navigate(`/urun/${fav.urun.slug}`)}>
                     <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                       {fav.urun?.foto_url ? (
                         <img src={fav.urun.foto_url} alt="" className="w-full h-full object-cover" />
                       ) : (
                         <ImageIcon className="w-5 h-5 text-muted-foreground" />
                       )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 flex-wrap">
                         <p className="font-semibold text-foreground text-sm sm:text-base truncate">{fav.urun?.baslik || "-"}</p>
                       </div>
                       <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                         🏢 {fav.urun?.user_id ? firmaAdMap[fav.urun.user_id] || "-" : "-"}
                       </p>
                     </div>
                     <Button variant="outline" size="sm" className="shrink-0 hidden sm:flex" onClick={(e) => { e.stopPropagation(); fav.urun?.slug && navigate(`/urun/${fav.urun.slug}`); }}>
                       Ürünü Gör
                     </Button>
                     <button
                       onClick={(e) => { e.stopPropagation(); removeUrunFav(fav.id); }}
                       className="shrink-0 p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors"
                     >
                       <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-destructive fill-destructive" />
                     </button>
                   </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
