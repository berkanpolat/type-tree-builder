import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

type FieldValue = string | boolean;

type RouteSnapshot = {
  scrollY: number;
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

const RouteStateManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const routeKey = getRouteKey(location.pathname, location.search);

  useEffect(() => {
    const saveScroll = () => {
      const store = readStore();
      const prev = store[routeKey] ?? { scrollY: 0, fields: {}, updatedAt: Date.now() };
      store[routeKey] = {
        ...prev,
        scrollY: window.scrollY,
        updatedAt: Date.now(),
      };
      writeStore(pruneStore(store));
    };

    const saveFieldChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const key = getFieldKey(target);
      const value = readFieldValue(target);
      if (!key || value === null) return;

      const store = readStore();
      const prev = store[routeKey] ?? { scrollY: window.scrollY, fields: {}, updatedAt: Date.now() };

      store[routeKey] = {
        scrollY: window.scrollY,
        fields: {
          ...prev.fields,
          [key]: value,
        },
        updatedAt: Date.now(),
      };

      writeStore(pruneStore(store));
    };

    saveScroll();

    window.addEventListener("scroll", saveScroll, { passive: true });
    document.addEventListener("input", saveFieldChange, true);
    document.addEventListener("change", saveFieldChange, true);

    return () => {
      window.removeEventListener("scroll", saveScroll);
      document.removeEventListener("input", saveFieldChange, true);
      document.removeEventListener("change", saveFieldChange, true);
      saveScroll();
    };
  }, [routeKey]);

  useEffect(() => {
    if (navigationType !== "POP") return;

    const snapshot = readStore()[routeKey];
    if (!snapshot) return;

    const restore = () => {
      applySnapshotToFields(snapshot.fields);
      window.scrollTo({ top: snapshot.scrollY || 0, behavior: "auto" });
    };

    const t1 = window.setTimeout(restore, 0);
    const t2 = window.setTimeout(restore, 220);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [routeKey, navigationType]);

  return null;
};

export default RouteStateManager;
