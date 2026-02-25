import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const Index = () => {
  const [selectedTurId, setSelectedTurId] = useState<string>("");
  const [selectedTipId, setSelectedTipId] = useState<string>("");

  const { data: firmaTurleri, isLoading: turleriLoading } = useQuery({
    queryKey: ["firma_turleri"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firma_turleri")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: firmaTipleri, isLoading: tipleriLoading } = useQuery({
    queryKey: ["firma_tipleri", selectedTurId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firma_tipleri")
        .select("*")
        .eq("firma_turu_id", selectedTurId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTurId,
  });

  const handleTurChange = (value: string) => {
    setSelectedTurId(value);
    setSelectedTipId("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-6">
        <h1 className="text-2xl font-bold text-center text-foreground">Firma Seçimi</h1>

        <div className="space-y-2">
          <Label htmlFor="firma-turu">Firma Türü</Label>
          <Select value={selectedTurId} onValueChange={handleTurChange}>
            <SelectTrigger id="firma-turu">
              <SelectValue placeholder={turleriLoading ? "Yükleniyor..." : "Firma türü seçiniz"} />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {firmaTurleri?.map((tur) => (
                <SelectItem key={tur.id} value={tur.id}>
                  {tur.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="firma-tipi">Firma Tipi</Label>
          <Select
            value={selectedTipId}
            onValueChange={setSelectedTipId}
            disabled={!selectedTurId}
          >
            <SelectTrigger id="firma-tipi">
              <SelectValue
                placeholder={
                  !selectedTurId
                    ? "Önce firma türü seçiniz"
                    : tipleriLoading
                      ? "Yükleniyor..."
                      : "Firma tipi seçiniz"
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {firmaTipleri?.map((tip) => (
                <SelectItem key={tip.id} value={tip.id}>
                  {tip.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default Index;
