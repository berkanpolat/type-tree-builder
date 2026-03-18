import { supabase } from "@/integrations/supabase/client";

let initialized = false;

function getCommonPayload() {
  return {
    url: window.location.href,
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen_width: screen.width,
    screen_height: screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    timestamp: new Date().toISOString(),
  };
}

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch {
    return null;
  }
}

// Debounce to avoid flooding
const recentErrors = new Set<string>();
function isDuplicate(key: string): boolean {
  if (recentErrors.has(key)) return true;
  recentErrors.add(key);
  setTimeout(() => recentErrors.delete(key), 10000);
  return false;
}

async function sendError(payload: Record<string, any>) {
  const key = `${payload.error_message}|${payload.error_source}|${payload.error_line}`;
  if (isDuplicate(key)) return;

  const userId = await getUserId();

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    await fetch(`https://${projectId}.supabase.co/functions/v1/log-client-error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
      },
      body: JSON.stringify({
        ...getCommonPayload(),
        ...payload,
        user_id: userId,
      }),
    });
  } catch {
    // Silently fail - don't create error loops
  }
}

export function initErrorTracker() {
  if (initialized) return;
  initialized = true;

  // Global JS errors
  window.addEventListener("error", (event) => {
    // Ignore script loading errors from extensions
    if (event.filename?.includes("extension")) return;
    
    sendError({
      error_message: event.message,
      error_source: event.filename,
      error_line: event.lineno,
      error_col: event.colno,
      error_stack: event.error?.stack || null,
    });
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : null;

    sendError({
      error_message: message,
      error_source: "unhandled_promise_rejection",
      error_stack: stack,
    });
  });

  // Console.error override
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    originalConsoleError.apply(console, args);

    // Only capture meaningful errors, skip React internal warnings
    const msg = args.map((a) => (typeof a === "string" ? a : String(a))).join(" ");
    if (
      msg.includes("Warning:") ||
      msg.includes("DevTools") ||
      msg.includes("[HMR]") ||
      msg.length < 10
    ) return;

    sendError({
      error_message: msg.substring(0, 500),
      error_source: "console_error",
    });
  };
}

// React Error Boundary helper
export function reportReactError(error: Error, componentStack: string) {
  sendError({
    error_message: error.message,
    error_source: "react_error_boundary",
    error_stack: error.stack,
    component_stack: componentStack,
  });
}
