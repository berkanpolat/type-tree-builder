import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Factory, Plus, X, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
}

interface Option {
  id: string;
  name: string;
  parent_id: string | null;
}

interface AddedItem {
  id?: string;
  tur_id: string;
  grup_id: string;
  kategori_id: string;
  tur_name: string;
  grup_name: string;
  kategori_name: string;
}

type RolType = "uretici" | "satici" | "her_ikisi";

const URUN_KATEGORI_ID = "f5f6e209-3d32-4816-9842-d520a756c9f1";

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      options.filter((o) =>
        o.name.toLowerCase().includes(search.toLowerCase())
      ),
    [options, search]
  );

  const selectedName = options.find((o) => o.id === value)?.name;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className={selectedName ? "text-foreground" : "text-muted-foreground"}>
          {selectedName || placeholder}
        </span>
        <Search className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-2 border-b">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground px-3 py-2">Sonuç bulunamadı</p>
            )}
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                  value === o.id && "bg-accent/50 font-medium"
                )}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductSection({
  title,
  tip,
  allOptions,
  items,
  onAdd,
  onRemoveItem,
  onRemoveGroup,
}: {
  title: string;
  tip: string;
  allOptions: Option[];
  items: AddedItem[];
  onAdd: (tip: string, item: AddedItem) => void;
  onRemoveItem: (tip: string, turId: string) => void;
  onRemoveGroup: (tip: string, grupId: string) => void;
}) {
  const [kategoriId, setKategoriId] = useState("");
  const [grupId, setGrupId] = useState("");
  const [selectedTurIds, setSelectedTurIds] = useState<string[]>([]);

  const kategoriler = useMemo(
    () => allOptions.filter((o) => o.parent_id === null),
    [allOptions]
  );

  const gruplar = useMemo(
    () => (kategoriId ? allOptions.filter((o) => o.parent_id === kategoriId) : []),
    [allOptions, kategoriId]
  );

  const turler = useMemo(
    () => (grupId ? allOptions.filter((o) => o.parent_id === grupId) : []),
    [allOptions, grupId]
  );

  // Filter out already added türler
  const availableTurler = useMemo(
    () => turler.filter((t) => !items.some((i) => i.tur_id === t.id)),
    [turler, items]
  );

  const handleKategoriChange = (v: string) => {
    setKategoriId(v);
    setGrupId("");
    setSelectedTurIds([]);
  };

  const handleGrupChange = (v: string) => {
    setGrupId(v);
    setSelectedTurIds([]);
  };

  const toggleTur = (turId: string) => {
    setSelectedTurIds((prev) =>
      prev.includes(turId) ? prev.filter((id) => id !== turId) : [...prev, turId]
    );
  };

  const selectAll = () => setSelectedTurIds(availableTurler.map((t) => t.id));
  const clearAll = () => setSelectedTurIds([]);

  const handleAdd = () => {
    const kategoriName = kategoriler.find((k) => k.id === kategoriId)?.name || "";
    const grupName = gruplar.find((g) => g.id === grupId)?.name || "";

    for (const turId of selectedTurIds) {
      const turName = turler.find((t) => t.id === turId)?.name || "";
      onAdd(tip, {
        tur_id: turId,
        grup_id: grupId,
        kategori_id: kategoriId,
        tur_name: turName,
        grup_name: grupName,
        kategori_name: kategoriName,
      });
    }
    setSelectedTurIds([]);
  };

  // Group items by kategori -> grup
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, AddedItem[]>>();
    for (const item of items) {
      if (!map.has(item.kategori_id)) map.set(item.kategori_id, new Map());
      const grupMap = map.get(item.kategori_id)!;
      if (!grupMap.has(item.grup_id)) grupMap.set(item.grup_id, []);
      grupMap.get(item.grup_id)!.push(item);
    }
    return map;
  }, [items]);

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <h3 className="font-semibold text-foreground">{title}</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Kategori*</Label>
            <SearchableSelect
              options={kategoriler}
              value={kategoriId}
              onChange={handleKategoriChange}
              placeholder="Kategori Seçin"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Grup*</Label>
            <SearchableSelect
              options={gruplar}
              value={grupId}
              onChange={handleGrupChange}
              placeholder="Grup Seçin"
              disabled={!kategoriId}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tür Seçin</Label>
            <SearchableMultiSelect
              options={availableTurler}
              selected={selectedTurIds}
              onToggle={toggleTur}
              placeholder="Tür Seçin"
              disabled={!grupId}
            />
          </div>
        </div>

        {grupId && availableTurler.length > 0 && (
          <div className="flex justify-end gap-3 text-sm">
            <button type="button" onClick={clearAll} className="text-muted-foreground hover:text-foreground">
              Tümünü kaldır
            </button>
            <button type="button" onClick={selectAll} className="text-muted-foreground hover:text-foreground">
              Tümünü seç
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleAdd}
            disabled={selectedTurIds.length === 0}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" /> Ekle
          </Button>
        </div>

        {/* Added items display */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Eklenen Türler</Label>
          <div className="min-h-[60px] rounded-md border border-input bg-muted/30 p-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz ürün türü eklenmedi</p>
            ) : (
              <div className="space-y-3">
                {Array.from(grouped.entries()).map(([katId, grupMap]) => {
                  const katName = items.find((i) => i.kategori_id === katId)?.kategori_name || "";
                  return (
                    <div key={katId} className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {katName}
                      </p>
                      {Array.from(grupMap.entries()).map(([gId, gItems]) => {
                        const gName = gItems[0]?.grup_name || "";
                        return (
                          <div key={gId} className="ml-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground">{gName}</span>
                              <button
                                type="button"
                                onClick={() => onRemoveGroup(tip, gId)}
                                className="text-destructive hover:text-destructive/80"
                                title="Grubun tüm türlerini sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 ml-2">
                              {gItems.map((item) => (
                                <span
                                  key={item.tur_id}
                                  className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full"
                                >
                                  {item.tur_name}
                                  <X
                                    className="w-3 h-3 cursor-pointer hover:text-destructive"
                                    onClick={() => onRemoveItem(tip, item.tur_id)}
                                  />
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchableMultiSelect({
  options,
  selected,
  onToggle,
  placeholder,
  disabled,
}: {
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const selectedNames = options.filter((o) => selected.includes(o.id)).map((o) => o.name);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span className="flex flex-wrap gap-1 flex-1 text-left">
          {selectedNames.length === 0 && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selectedNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full"
            >
              {name}
            </span>
          ))}
        </span>
        <Search className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-2 border-b">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground px-3 py-2">Sonuç bulunamadı</p>
            )}
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onToggle(o.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                    selected.includes(o.id) ? "bg-primary text-primary-foreground" : "opacity-50"
                  )}
                >
                  {selected.includes(o.id) && <span className="text-[10px]">✓</span>}
                </div>
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UretimSatisTab({ userId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firmaId, setFirmaId] = useState("");
  const [rol, setRol] = useState<RolType | "">("");
  const [allOptions, setAllOptions] = useState<Option[]>([]);
  const [uretimItems, setUretimItems] = useState<AddedItem[]>([]);
  const [satisItems, setSatisItems] = useState<AddedItem[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const { data: firma } = await supabase
        .from("firmalar")
        .select("id, uretim_satis_rolu")
        .eq("user_id", userId)
        .single();

      if (!firma) {
        setLoading(false);
        return;
      }
      setFirmaId(firma.id);
      setRol(((firma as any).uretim_satis_rolu as RolType) || "");

      // Fetch all product hierarchy options
      const { data: options } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id, name, parent_id")
        .eq("kategori_id", URUN_KATEGORI_ID)
        .order("name");

      setAllOptions(options || []);

      // Fetch existing selections
      const { data: existing } = await supabase
        .from("firma_uretim_satis")
        .select("id, tip, kategori_id, grup_id, tur_id")
        .eq("firma_id", firma.id);

      if (existing && options) {
        const optMap = new Map(options.map((o) => [o.id, o.name]));
        const uretim: AddedItem[] = [];
        const satis: AddedItem[] = [];

        for (const row of existing) {
          const item: AddedItem = {
            id: row.id,
            tur_id: row.tur_id,
            grup_id: row.grup_id,
            kategori_id: row.kategori_id,
            tur_name: optMap.get(row.tur_id) || "",
            grup_name: optMap.get(row.grup_id) || "",
            kategori_name: optMap.get(row.kategori_id) || "",
          };
          if (row.tip === "uretim") uretim.push(item);
          else satis.push(item);
        }
        setUretimItems(uretim);
        setSatisItems(satis);
      }

      setLoading(false);
    };

    if (userId) fetchAll();
  }, [userId]);

  const handleAdd = (tip: string, item: AddedItem) => {
    if (tip === "uretim") {
      setUretimItems((prev) =>
        prev.some((i) => i.tur_id === item.tur_id) ? prev : [...prev, item]
      );
    } else {
      setSatisItems((prev) =>
        prev.some((i) => i.tur_id === item.tur_id) ? prev : [...prev, item]
      );
    }
  };

  const handleRemoveItem = (tip: string, turId: string) => {
    if (tip === "uretim") {
      setUretimItems((prev) => prev.filter((i) => i.tur_id !== turId));
    } else {
      setSatisItems((prev) => prev.filter((i) => i.tur_id !== turId));
    }
  };

  const handleRemoveGroup = (tip: string, grupId: string) => {
    if (tip === "uretim") {
      setUretimItems((prev) => prev.filter((i) => i.grup_id !== grupId));
    } else {
      setSatisItems((prev) => prev.filter((i) => i.grup_id !== grupId));
    }
  };

  const handleSave = async () => {
    if (!rol) {
      toast({ title: "Uyarı", description: "Lütfen bir rol seçin.", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      // Update role
      await supabase
        .from("firmalar")
        .update({ uretim_satis_rolu: rol } as any)
        .eq("id", firmaId);

      // Delete existing
      await supabase.from("firma_uretim_satis").delete().eq("firma_id", firmaId);

      // Build inserts based on role
      const inserts: any[] = [];

      if (rol === "uretici" || rol === "her_ikisi") {
        for (const item of uretimItems) {
          inserts.push({
            firma_id: firmaId,
            tip: "uretim",
            kategori_id: item.kategori_id,
            grup_id: item.grup_id,
            tur_id: item.tur_id,
          });
        }
      }

      if (rol === "satici" || rol === "her_ikisi") {
        for (const item of satisItems) {
          inserts.push({
            firma_id: firmaId,
            tip: "satis",
            kategori_id: item.kategori_id,
            grup_id: item.grup_id,
            tur_id: item.tur_id,
          });
        }
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("firma_uretim_satis").insert(inserts);
        if (error) throw error;
      }

      toast({ title: "Başarılı", description: "Üretim/Satış bilgileri güncellendi." });
    } catch (e: any) {
      toast({
        title: "Hata",
        description: e?.message || "Bilgiler kaydedilemedi.",
        variant: "destructive",
      });
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
  }

  const showUretim = rol === "uretici" || rol === "her_ikisi";
  const showSatis = rol === "satici" || rol === "her_ikisi";

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Üretim / Satış Bilgileri</h2>
          </div>

          <RadioGroup
            value={rol}
            onValueChange={(v) => setRol(v as RolType)}
            className="flex flex-wrap gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="uretici" id="uretici" />
              <Label htmlFor="uretici" className="cursor-pointer">Üreticiyim</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="satici" id="satici" />
              <Label htmlFor="satici" className="cursor-pointer">Satıcıyım</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="her_ikisi" id="her_ikisi" />
              <Label htmlFor="her_ikisi" className="cursor-pointer">Hem Üretici Hem Satıcıyım</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {showUretim && (
        <ProductSection
          title="Ne Üretiyorsunuz"
          tip="uretim"
          allOptions={allOptions}
          items={uretimItems}
          onAdd={handleAdd}
          onRemoveItem={handleRemoveItem}
          onRemoveGroup={handleRemoveGroup}
        />
      )}

      {showSatis && (
        <ProductSection
          title="Ne Satıyorsunuz"
          tip="satis"
          allOptions={allOptions}
          items={satisItems}
          onAdd={handleAdd}
          onRemoveItem={handleRemoveItem}
          onRemoveGroup={handleRemoveGroup}
        />
      )}

      {rol && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      )}
    </div>
  );
}
