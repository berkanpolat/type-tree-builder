import { Phone, MapPin, Mail, Share2, PhoneOutgoing, PhoneIncoming, Linkedin, MessageCircle, MoreHorizontal } from "lucide-react";

export const AKSIYON_TURLERI = [
  { value: "ziyaret_ilk", label: "Ziyaret (İlk)" },
  { value: "ziyaret_tekrar", label: "Ziyaret (Tekrar)" },
  { value: "telefon", label: "Telefon" },
  { value: "mail", label: "Mail" },
  { value: "sosyal_medya", label: "Sosyal Medya" },
  { value: "dis_arama_ilk", label: "Dış Arama (İlk)" },
  { value: "dis_arama_tekrar", label: "Dış Arama (Tekrar)" },
  { value: "gelen_cagri", label: "Gelen Çağrı" },
  { value: "linkedin_talep", label: "LinkedIn Talep" },
  { value: "linkedin_mesaj", label: "LinkedIn Mesaj" },
  { value: "diger", label: "Diğer" },
] as const;

export const TUR_CONFIG: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  ziyaret_ilk: { label: "Ziyaret (İlk)", icon: MapPin, color: "#8b5cf6" },
  ziyaret_tekrar: { label: "Ziyaret (Tekrar)", icon: MapPin, color: "#a78bfa" },
  telefon: { label: "Telefon", icon: Phone, color: "#3b82f6" },
  mail: { label: "Mail", icon: Mail, color: "#f59e0b" },
  sosyal_medya: { label: "Sosyal Medya", icon: Share2, color: "#ec4899" },
  dis_arama_ilk: { label: "Dış Arama (İlk)", icon: PhoneOutgoing, color: "#22c55e" },
  dis_arama_tekrar: { label: "Dış Arama (Tekrar)", icon: PhoneOutgoing, color: "#4ade80" },
  gelen_cagri: { label: "Gelen Çağrı", icon: PhoneIncoming, color: "#14b8a6" },
  linkedin_talep: { label: "LinkedIn Talep", icon: Linkedin, color: "#0077b5" },
  linkedin_mesaj: { label: "LinkedIn Mesaj", icon: MessageCircle, color: "#0a66c2" },
  diger: { label: "Diğer", icon: MoreHorizontal, color: "#94a3b8" },
};

// Department-based action type restrictions
const DEPARTMAN_AKSIYONLAR: Record<string, string[]> = {
  "Saha Satış": ["ziyaret_ilk", "ziyaret_tekrar", "telefon", "mail", "sosyal_medya", "diger"],
  "Kurumsal Satış": ["linkedin_talep", "linkedin_mesaj", "ziyaret_ilk", "ziyaret_tekrar", "telefon", "mail", "sosyal_medya", "diger"],
  "Çağrı Merkezi": ["dis_arama_ilk", "dis_arama_tekrar", "gelen_cagri", "mail", "sosyal_medya", "diger"],
  "Yönetim Kurulu": null as unknown as string[], // all
};

export function getAksiyonTurleriForDepartman(departman: string, isPrimary: boolean) {
  // Primary admin and Yönetim Kurulu can add all actions
  if (isPrimary || departman === "Yönetim Kurulu") {
    return AKSIYON_TURLERI;
  }

  const allowed = DEPARTMAN_AKSIYONLAR[departman];
  if (!allowed) return AKSIYON_TURLERI; // fallback: allow all

  return AKSIYON_TURLERI.filter(t => allowed.includes(t.value));
}
