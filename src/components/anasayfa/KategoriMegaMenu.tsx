import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight } from "lucide-react";

const KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";

interface KategoriItem {
  id: string;
  name: string;
}

interface Props {
  kategoriler: string[];
  selectedKategori: string | null;
  onSelect: (kategoriName: string, grupId?: string, turId?: string) => void;
}

// In-memory caches to avoid repeated DB calls
const katMapCache: Record<string, string> = {};
const grupCache: Record<string, KategoriItem[]> = {};
const turCache: Record<string, KategoriItem[]> = {};
let katMapLoaded = false;

export default function KategoriMegaMenu({ kategoriler, selectedKategori, onSelect }: Props) {
  const [hoveredKat, setHoveredKat] = useState<string | null>(null);
  const [hoveredGrup, setHoveredGrup] = useState<string | null>(null);
  const [katMap, setKatMap] = useState<Record<string, string>>(katMapCache);
  const [gruplar, setGruplar] = useState<KategoriItem[]>([]);
  const [turler, setTurler] = useState<KategoriItem[]>([]);
  const [grupLoading, setGrupLoading] = useState(false);
  const [turLoading, setTurLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load category name -> id map (once, cached globally)
  useEffect(() => {
    if (katMapLoaded) return;
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("kategori_id", KATEGORI_ID)
      .is("parent_id", null)
      .then(({ data }) => {
        if (data) {
          data.forEach((d) => { katMapCache[d.name] = d.id; });
          setKatMap({ ...katMapCache });
          katMapLoaded = true;
        }
      });
  }, []);

  // Fetch groups when category hovered (with cache)
  useEffect(() => {
    if (!hoveredKat) { setGruplar([]); setTurler([]); return; }
    const katId = katMap[hoveredKat];
    if (!katId) { setGruplar([]); return; }

    // Check cache first
    if (grupCache[katId]) {
      setGruplar(grupCache[katId]);
      setTurler([]);
      setHoveredGrup(null);
      return;
    }

    setGrupLoading(true);
    setTurler([]);
    setHoveredGrup(null);
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("parent_id", katId)
      .order("name")
      .then(({ data }) => {
        const result = data || [];
        grupCache[katId] = result;
        setGruplar(result);
        setGrupLoading(false);
      });
  }, [hoveredKat, katMap]);

  // Fetch types when group hovered (with cache)
  useEffect(() => {
    if (!hoveredGrup) { setTurler([]); return; }

    if (turCache[hoveredGrup]) {
      setTurler(turCache[hoveredGrup]);
      return;
    }

    setTurLoading(true);
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("parent_id", hoveredGrup)
      .order("name")
      .then(({ data }) => {
        const result = data || [];
        turCache[hoveredGrup] = result;
        setTurler(result);
        setTurLoading(false);
      });
  }, [hoveredGrup]);

  const handleMouseEnterKat = (katName: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHoveredKat(katName);
  };

  const handleMouseLeaveMenu = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredKat(null);
      setHoveredGrup(null);
    }, 150);
  };

  const handleMouseEnterDropdown = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const closeMenu = () => {
    setHoveredKat(null);
    setHoveredGrup(null);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Category bar */}
      <div className="flex items-center justify-center gap-8 overflow-x-auto py-3 scrollbar-hide">
        {kategoriler.map((kat) => (
          <button
            key={kat}
            onMouseEnter={() => handleMouseEnterKat(kat)}
            onMouseLeave={handleMouseLeaveMenu}
            onClick={() => { onSelect(kat); closeMenu(); }}
            className={`whitespace-nowrap text-sm font-medium transition-colors py-1 ${
              selectedKategori === kat
                ? "text-secondary border-b-2 border-secondary"
                : hoveredKat === kat
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {kat === "Hazır Giyim (Satış)" ? "Hazır Giyim" : kat}
          </button>
        ))}
      </div>

      {/* Mega menu dropdown */}
      {hoveredKat && (gruplar.length > 0 || grupLoading) && (
        <div
          className="absolute left-0 right-0 top-full bg-background border border-border rounded-b-xl shadow-xl z-50 flex max-h-[400px]"
          onMouseEnter={handleMouseEnterDropdown}
          onMouseLeave={handleMouseLeaveMenu}
        >
          {grupLoading && gruplar.length === 0 ? (
            <div className="flex items-center justify-center w-full py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Left: Groups */}
              <div className="w-56 border-r border-border py-2 shrink-0 overflow-y-auto">
                {gruplar.map((grup) => (
                  <button
                    key={grup.id}
                    onMouseEnter={() => setHoveredGrup(grup.id)}
                    onClick={() => { onSelect(hoveredKat, grup.id); closeMenu(); }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors text-left ${
                      hoveredGrup === grup.id
                        ? "bg-muted text-secondary font-semibold"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span>{grup.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>

              {/* Right: Types */}
              <div className="flex-1 p-4 overflow-y-auto">
                {hoveredGrup ? (
                  turler.length > 0 ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0.5">
                      {turler.map((tur) => (
                        <button
                          key={tur.id}
                          onClick={() => { onSelect(hoveredKat, hoveredGrup, tur.id); closeMenu(); }}
                          className="text-sm text-muted-foreground hover:text-secondary py-1.5 text-left transition-colors"
                        >
                          {tur.name}
                        </button>
                      ))}
                    </div>
                  ) : turLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground pt-2">Bu grupta tür bulunmamaktadır.</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground pt-2">Grup üzerine gelerek türleri görüntüleyin.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
