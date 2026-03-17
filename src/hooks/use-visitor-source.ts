import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "visitor_source_tracked";

function detectKanal(utmSource: string | null, utmMedium: string | null, referrer: string): string {
  if (utmSource) {
    const src = utmSource.toLowerCase();
    if (src.includes("google") || src.includes("bing") || src.includes("yahoo") || src.includes("yandex")) {
      return utmMedium?.toLowerCase() === "cpc" ? "ucretli_arama" : "organik_arama";
    }
    if (["facebook", "instagram", "linkedin", "twitter", "tiktok", "x"].some((s) => src.includes(s))) {
      return utmMedium?.toLowerCase() === "cpc" || utmMedium?.toLowerCase() === "paid" ? "ucretli_sosyal" : "sosyal_medya";
    }
    if (src === "email" || src === "newsletter" || src === "postmark") return "email";
    if (src === "referral") return "yonlendirme";
    return "diger_kampanya";
  }

  if (!referrer) return "dogrudan";

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (["google", "bing", "yahoo", "yandex", "duckduckgo"].some((s) => host.includes(s))) return "organik_arama";
    if (["facebook", "instagram", "linkedin", "twitter", "tiktok", "t.co", "lnkd.in"].some((s) => host.includes(s))) return "sosyal_medya";
    return "yonlendirme";
  } catch {
    return "diger";
  }
}

function getSessionId(): string {
  let id = sessionStorage.getItem("visitor_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("visitor_session_id", id);
  }
  return id;
}

export function useVisitorSource() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    const utmTerm = params.get("utm_term");
    const utmContent = params.get("utm_content");
    const referrer = document.referrer || "";
    const kanal = detectKanal(utmSource, utmMedium, referrer);

    sessionStorage.setItem(SESSION_KEY, "1");

    const payload = {
      session_id: getSessionId(),
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: utmTerm,
      utm_content: utmContent,
      referrer: referrer || null,
      kanal,
      landing_page: window.location.pathname,
    };

    const sendTracking = () => {
      void supabase.from("visitor_sources").insert(payload as any);
    };

    if ("requestIdleCallback" in window) {
      const idleId = (window as any).requestIdleCallback(sendTracking, { timeout: 4000 });
      return () => (window as any).cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(sendTracking, 1500);
    return () => window.clearTimeout(timeoutId);
  }, []);
}
