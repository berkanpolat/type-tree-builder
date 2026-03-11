import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * useState replacement that persists to sessionStorage per route.
 * On POP navigation (browser back/forward), restores previous value.
 * On PUSH/REPLACE navigation, uses the provided initialValue.
 */
export function useSessionState<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const location = useLocation();
  const navigationType = useNavigationType();
  const storageKey = `ss:${location.pathname}:${key}`;

  const [value, setValue] = useState<T>(() => {
    if (navigationType === "POP") {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored !== null) {
          return JSON.parse(stored) as T;
        }
      } catch {
        // ignore
      }
    }
    return initialValue;
  });

  // Persist to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [storageKey, value]);

  return [value, setValue];
}
