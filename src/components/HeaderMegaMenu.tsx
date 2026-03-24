import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight } from "lucide-react";

const URUN_KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";

interface SubItem {
  id: string;
  name: string;
}

// Caches
const pazarKatCache: SubItem[] = [];
const pazarGrupCache: Record<string, SubItem[]> = {};
const pazarTurCache: Record<string, SubItem[]> = {};
const rehberTurCache: SubItem[] = [];
const rehberTipCache: Record<string, SubItem[]> = {};

type MenuType = "tekpazar" | "tekrehber";

interface Props {
  type: MenuType;
  onClose: () => void;
}

export default function HeaderMegaMenu({ type, onClose }: Props) {
  const navigate = useNavigate();
  const [level1, setLevel1] = useState<SubItem[]>([]);
  const [level2, setLevel2] = useState<SubItem[]>([]);
  const [level3, setLevel3] = useState<SubItem[]>([]);
  const [hoveredL1, setHoveredL1] = useState<string | null>(null);
  const [hoveredL2, setHoveredL2] = useState<string | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [loading3, setLoading3] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const REHBER_ORDER = ["marka", "mümessil ofis", "üretici", "tedarikçi", "fason atölye"];

  const sortRehber = (items: SubItem[]) => {
    return [...items].sort((a, b) => {
      const aIdx = REHBER_ORDER.indexOf(a.name.toLowerCase());
      const bIdx = REHBER_ORDER.indexOf(b.name.toLowerCase());
      if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  };

  // Fetch level 1
  useEffect(() => {
    if (type === "tekpazar") {
      if (pazarKatCache.length > 0) {
        setLevel1(pazarKatCache);
        return;
      }
      setLoading1(true);
      supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .eq("kategori_id", URUN_KATEGORI_ID)
        .is("parent_id", null)
        .order("name")
        .then(({ data }) => {
          const items = data || [];
          pazarKatCache.push(...items);
          setLevel1(items);
          setLoading1(false);
        });
    } else {
      if (rehberTurCache.length > 0) {
        setLevel1(sortRehber(rehberTurCache));
        return;
      }
      setLoading1(true);
      supabase
        .from("firma_turleri")
        .select("id, name")
        .order("name")
        .then(({ data }) => {
          const items = data || [];
          rehberTurCache.push(...items);
          setLevel1(sortRehber(items));
          setLoading1(false);
        });
    }
  }, [type]);

  // Fetch level 2 on hover
  useEffect(() => {
    if (!hoveredL1) {
      setLevel2([]);
      setLevel3([]);
      setHoveredL2(null);
      return;
    }

    if (type === "tekpazar") {
      if (pazarGrupCache[hoveredL1]) {
        setLevel2(pazarGrupCache[hoveredL1]);
        return;
      }
      setLoading2(true);
      supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name")
        .eq("parent_id", hoveredL1)
        .order("name")
        .then(({ data }) => {
          const items = data || [];
          pazarGrupCache[hoveredL1] = items;
          setLevel2(items);
          setLoading2(false);
        });
    } else {
      if (rehberTipCache[hoveredL1]) {
        setLevel2(rehberTipCache[hoveredL1]);
        return;
      }
      setLoading2(true);
      supabase
        .from("firma_tipleri")
        .select("id, name")
        .eq("firma_turu_id", hoveredL1)
        .order("name")
        .then(({ data }) => {
          const items = data || [];
          rehberTipCache[hoveredL1] = items;
          setLevel2(items);
          setLoading2(false);
        });
    }
  }, [hoveredL1, type]);

  // Fetch level 3 (only for tekpazar)
  useEffect(() => {
    if (type !== "tekpazar" || !hoveredL2) {
      setLevel3([]);
      return;
    }
    if (pazarTurCache[hoveredL2]) {
      setLevel3(pazarTurCache[hoveredL2]);
      return;
    }
    setLoading3(true);
    supabase
      .from("firma_bilgi_secenekleri")
      .select("id, name")
      .eq("parent_id", hoveredL2)
      .order("name")
      .then(({ data }) => {
        const items = data || [];
        pazarTurCache[hoveredL2] = items;
        setLevel3(items);
        setLoading3(false);
      });
  }, [hoveredL2, type]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      onClose();
    }, 150);
  };

  const displayName = (name: string) =>
    name === "Hazır Giyim (Satış)" ? "Hazır Giyim" : name;

  const handleL1Click = (item: SubItem) => {
    if (type === "tekpazar") {
      navigate(`/tekpazar`);
    } else {
      navigate(`/firmalar`);
    }
    onClose();
  };

  const handleL2Click = (item: SubItem) => {
    if (type === "tekpazar") {
      navigate(`/tekpazar`);
    } else {
      navigate(`/firmalar`);
    }
    onClose();
  };

  const handleL3Click = (item: SubItem) => {
    navigate(`/tekpazar`);
    onClose();
  };

  const showLevel2 = hoveredL1 && (level2.length > 0 || loading2);
  const showLevel3 = type === "tekpazar" && hoveredL2 && (level3.length > 0 || loading3);

  return (
    <div
      className="absolute left-0 top-full mt-0 bg-background border border-border rounded-b-xl shadow-xl z-50 flex min-w-[280px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Level 1 */}
      <div className={`w-56 py-2 shrink-0 ${showLevel2 ? "border-r border-border" : ""}`}>
        {loading1 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : (
          level1.map((item) => (
            <button
              key={item.id}
              onMouseEnter={() => {
                setHoveredL1(item.id);
                setHoveredL2(null);
              }}
              onClick={() => handleL1Click(item)}
              className={`w-full flex items-center gap-1 pl-4 pr-2 py-2 text-sm transition-colors text-left ${
                hoveredL1 === item.id
                  ? "bg-muted text-secondary font-semibold"
                  : "text-foreground hover:bg-muted/50"
              }`}
            >
              <span className="flex-1">{displayName(item.name)}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* Level 2 */}
      {showLevel2 && (
        <div className={`w-56 py-2 shrink-0 ${showLevel3 ? "border-r border-border" : ""}`}>
          {loading2 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : (
            level2.map((item) => (
              <button
                key={item.id}
                onMouseEnter={() => type === "tekpazar" && setHoveredL2(item.id)}
                onClick={() => handleL2Click(item)}
              className={`w-full flex items-center gap-1 pl-4 pr-2 py-2 text-sm transition-colors text-left ${
                hoveredL2 === item.id
                  ? "bg-muted text-secondary font-semibold"
                  : "text-foreground hover:bg-muted/50"
              }`}
            >
              <span className="flex-1">{item.name}</span>
              {type === "tekpazar" && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Level 3 (tekpazar only) */}
      {showLevel3 && (
        <div className="flex-1 p-4 overflow-y-auto min-w-[200px] max-h-[400px]">
          {loading3 ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : level3.length > 0 ? (
            <div className="grid grid-cols-1 gap-y-0.5">
              {level3.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleL3Click(item)}
                  className="text-sm text-muted-foreground hover:text-secondary py-1.5 text-left transition-colors"
                >
                  {item.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pt-2">Alt kategori bulunmamaktadır.</p>
          )}
        </div>
      )}
    </div>
  );
}
