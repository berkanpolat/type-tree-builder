import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

type FieldValue = string | boolean;

type RouteSnapshot = {
  scrollY: number;
  containerScroll: number;
  fields: Record<string, FieldValue>;
  updatedAt: number;
};

type RouteStateMap = Record<string, RouteSnapshot>;

const STORAGE_KEY = "route-state-v1";
const MAX_ROUTES = 60;

const getRouteKey = (pathname: string, search: string) => `${pathname}${search}`;

const readStore = (): RouteStateMap => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RouteStateMap) : {};
  } catch {
    return {};
  }
};

const writeStore = (store: RouteStateMap) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // no-op
  }
};

const pruneStore = (store: RouteStateMap) => {
  const entries = Object.entries(store);
  if (entries.length <= MAX_ROUTES) return store;

  entries
    .sort((a, b) => (a[1].updatedAt ?? 0) - (b[1].updatedAt ?? 0))
    .slice(0, entries.length - MAX_ROUTES)
    .forEach(([key]) => {
      delete store[key];
    });

  return store;
};

const getFieldKey = (el: Element): string => {
  const dataKey = el.getAttribute("data-restore-key");
  if (dataKey) return `data:${dataKey}`;

  if (el instanceof HTMLInputElement) {
    if (el.type === "radio" && el.name) return `radio:${el.name}:${el.value}`;
    if (el.name) return `name:${el.name}`;
    if (el.id) return `id:${el.id}`;
    if (el.placeholder) return `ph:${el.placeholder}`;
    return "";
  }

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    if (el.name) return `name:${el.name}`;
    if (el.id) return `id:${el.id}`;
    return "";
  }

  return "";
};

const readFieldValue = (el: Element): FieldValue | null => {
  if (el instanceof HTMLInputElement) {
    if (el.type === "password" || el.type === "file" || el.type === "hidden") return null;
    if (el.type === "checkbox" || el.type === "radio") return el.checked;
    return el.value;
  }

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value;
  }

  return null;
};

const emitInputEvents = (el: Element) => {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
};

const applySnapshotToFields = (fields: Record<string, FieldValue>) => {
  const elements = document.querySelectorAll("input, textarea, select, [data-restore-key]");

  elements.forEach((el) => {
    const key = getFieldKey(el);
    if (!key || !(key in fields)) return;

    const value = fields[key];

    if (el instanceof HTMLInputElement) {
      if (el.type === "password" || el.type === "file" || el.type === "hidden") return;
      if (el.type === "checkbox" || el.type === "radio") {
        const checked = Boolean(value);
        if (el.checked !== checked) {
          el.checked = checked;
          emitInputEvents(el);
        }
        return;
      }

      const nextValue = String(value ?? "");
      if (el.value !== nextValue) {
        el.value = nextValue;
        emitInputEvents(el);
      }
      return;
    }

    if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      const nextValue = String(value ?? "");
      if (el.value !== nextValue) {
        el.value = nextValue;
        emitInputEvents(el);
      }
    }
  });
};

/** Find the main scrollable container (DashboardLayout's <main> with overflow-y-auto) */
const getScrollContainer = (): HTMLElement | null => {
  return document.querySelector("main.overflow-y-auto") as HTMLElement | null;
};

const RouteStateManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Skip state management entirely on admin routes — no scroll/field restore needed
  const isAdmin = location.pathname.startsWith("/yonetim");

  const routeKey = getRouteKey(location.pathname, location.search);
  const isPop = useRef(navigationType === "POP");
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update ref on each render
  isPop.current = navigationType === "POP";

  useEffect(() => {
    if (isAdmin) return;

    let rafId: number | null = null;
    let lastSaveTime = 0;
    const THROTTLE_MS = 300;

    const saveScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const now = Date.now();
        if (now - lastSaveTime < THROTTLE_MS) return;
        lastSaveTime = now;
        const container = getScrollContainer();
        const store = readStore();
        const prev = store[routeKey] ?? { scrollY: 0, containerScroll: 0, fields: {}, updatedAt: now };
        store[routeKey] = {
          ...prev,
          scrollY: window.scrollY,
          containerScroll: container?.scrollTop ?? 0,
          updatedAt: now,
        };
        writeStore(pruneStore(store));
      });
    };

    const saveFieldChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const key = getFieldKey(target);
      const value = readFieldValue(target);
      if (!key || value === null) return;

      const container = getScrollContainer();
      const store = readStore();
      const prev = store[routeKey] ?? { scrollY: window.scrollY, containerScroll: container?.scrollTop ?? 0, fields: {}, updatedAt: Date.now() };

      store[routeKey] = {
        scrollY: window.scrollY,
        containerScroll: container?.scrollTop ?? 0,
        fields: {
          ...prev.fields,
          [key]: value,
        },
        updatedAt: Date.now(),
      };

      writeStore(pruneStore(store));
    };

    // Don't save scroll immediately on POP — we want to restore, not overwrite
    if (!isPop.current) {
      saveScroll();
    }

    const container = getScrollContainer();

    window.addEventListener("scroll", saveScroll, { passive: true });
    container?.addEventListener("scroll", saveScroll, { passive: true });
    document.addEventListener("input", saveFieldChange, true);
    document.addEventListener("change", saveFieldChange, true);

    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      window.removeEventListener("scroll", saveScroll);
      container?.removeEventListener("scroll", saveScroll);
      document.removeEventListener("input", saveFieldChange, true);
      document.removeEventListener("change", saveFieldChange, true);
      if (!isPop.current) {
        // Direct save on unmount (no debounce)
        const c = getScrollContainer();
        const st = readStore();
        const prev = st[routeKey] ?? { scrollY: 0, containerScroll: 0, fields: {}, updatedAt: Date.now() };
        st[routeKey] = { ...prev, scrollY: window.scrollY, containerScroll: c?.scrollTop ?? 0, updatedAt: Date.now() };
        writeStore(pruneStore(st));
      }
    };
  }, [routeKey, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    if (navigationType !== "POP") return;

    const snapshot = readStore()[routeKey];
    if (!snapshot) return;

    const restore = () => {
      applySnapshotToFields(snapshot.fields);

      // Restore scroll on both window and container
      window.scrollTo({ top: snapshot.scrollY || 0, behavior: "auto" });
      const container = getScrollContainer();
      if (container && snapshot.containerScroll) {
        container.scrollTop = snapshot.containerScroll;
      }
    };

    const t1 = window.setTimeout(restore, 50);
    const t2 = window.setTimeout(restore, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [routeKey, navigationType, isAdmin]);

  return null;
};

export default RouteStateManager;
