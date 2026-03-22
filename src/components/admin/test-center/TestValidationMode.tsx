import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, FlaskConical, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ValidationResult {
  name: string;
  expected: "fail" | "pass";
  actual: "fail" | "pass";
  correct: boolean;
  detail: string;
}

export default function TestValidationMode() {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [running, setRunning] = useState(false);

  const runValidation = useCallback(async () => {
    setRunning(true);
    const res: ValidationResult[] = [];

    // 1. Auth: wrong password must fail
    {
      const { data } = await supabase.rpc("admin_verify_password", {
        p_username: "__validation_nonexist__",
        p_password: "wrong_password",
      });
      const actual = data === false ? "fail" : "pass";
      res.push({
        name: "Yanlış şifre ile giriş",
        expected: "fail",
        actual,
        correct: actual === "fail",
        detail: actual === "fail" ? "Doğru reddedildi" : "Hatalı kabul edildi!",
      });
    }

    // 2. Dropdown: nonexistent category returns empty
    {
      const { data } = await supabase
        .from("firma_bilgi_secenekleri")
        .select("id")
        .eq("kategori_id", "00000000-0000-0000-0000-000000000000")
        .is("parent_id", null);
      const actual = (data?.length || 0) === 0 ? "fail" : "pass";
      res.push({
        name: "Olmayan kategori için boş dropdown",
        expected: "fail",
        actual,
        correct: actual === "fail",
        detail: actual === "fail" ? "Boş sonuç döndü (doğru)" : "Beklenmeyen veri geldi!",
      });
    }

    // 3. Storage: upload to nonexistent bucket must fail
    {
      const { error } = await supabase.storage
        .from("__nonexistent_bucket__")
        .upload("test.txt", new Uint8Array([0]));
      const actual = error ? "fail" : "pass";
      res.push({
        name: "Olmayan bucket'a upload",
        expected: "fail",
        actual,
        correct: actual === "fail",
        detail: actual === "fail" ? `Doğru reddedildi: ${error?.message?.slice(0, 60)}` : "Hatalı kabul edildi!",
      });
    }

    // 4. Invalid RPC call
    {
      const { error } = await supabase.rpc("check_registration_duplicate", {
        p_email: "",
        p_phone: "",
      });
      // Empty email should return {email_exists: false, phone_exists: false}
      const actual = !error ? "pass" : "fail";
      res.push({
        name: "Boş email/telefon duplikasyon kontrolü",
        expected: "pass",
        actual,
        correct: actual === "pass",
        detail: !error ? "Boş değerler kabul edildi (doğru)" : `Hata: ${error.message}`,
      });
    }

    // 5. Insert without auth should fail (anon can't insert to admin_users)
    {
      const { error } = await supabase.from("admin_users").insert({
        username: "__validation_test__",
        password_hash: "test",
        ad: "Test",
        soyad: "User",
      } as any);
      const actual = error ? "fail" : "pass";
      res.push({
        name: "Yetkisiz admin_users INSERT",
        expected: "fail",
        actual,
        correct: actual === "fail",
        detail: actual === "fail" ? "RLS doğru engelledi" : "RLS açığı! INSERT başarılı oldu!",
      });
    }

    setResults(res);
    setRunning(false);
  }, []);

  const allCorrect = results.length > 0 && results.every(r => r.correct);

  return (
    <Card className="border border-border/60 bg-card">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <FlaskConical className="w-4 h-4" />
            Doğrulama Modu
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={runValidation}
            disabled={running}
            className="h-7 text-xs"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5 mr-1" />}
            {running ? "Çalışıyor..." : "Doğrula"}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Beklenen fail senaryolarını çalıştırarak sistemin doğru engellediğini doğrular.
        </p>
      </CardHeader>
      {results.length > 0 && (
        <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
          {allCorrect && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tüm doğrulama senaryoları başarılı
            </div>
          )}
          {results.map((r, i) => (
            <div key={i} className={`flex items-center justify-between p-1.5 rounded text-xs ${r.correct ? "bg-emerald-50 dark:bg-emerald-500/5" : "bg-red-50 dark:bg-red-500/5"}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                {r.correct ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                )}
                <span className="truncate text-foreground">{r.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  beklenen: {r.expected}
                </Badge>
                <Badge variant={r.correct ? "outline" : "destructive"} className="text-[9px] h-4 px-1">
                  sonuç: {r.actual}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
