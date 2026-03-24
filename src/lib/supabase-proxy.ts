/**
 * Cloudflare Worker proxy interceptor.
 * Rewrites all fetch calls to supabase.co through api.tekstilas.com
 * to bypass Turkish ISP throttling.
 */

const SUPABASE_HOST = "bctoawgovyyueifnmwhq.supabase.co";
const PROXY_HOST = "api.tekstilas.com";

// Only enable proxy on the real production domain, never in Lovable preview/local environments
const isProduction =
  typeof window !== "undefined" &&
  !window.location.hostname.includes("localhost") &&
  !window.location.hostname.includes("lovable.app") &&
  !window.location.hostname.includes("lovable.dev") &&
  !window.location.hostname.includes("lovableproject.com");

export function installSupabaseProxy() {
  if (!isProduction) return;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (typeof input === "string" && input.includes(SUPABASE_HOST)) {
      input = input.replace(SUPABASE_HOST, PROXY_HOST);
    } else if (input instanceof URL && input.hostname === SUPABASE_HOST) {
      input = new URL(input.toString().replace(SUPABASE_HOST, PROXY_HOST));
    } else if (input instanceof Request && input.url.includes(SUPABASE_HOST)) {
      const newUrl = input.url.replace(SUPABASE_HOST, PROXY_HOST);
      input = new Request(newUrl, input);
    }

    return originalFetch.call(globalThis, input, init);
  };
}
