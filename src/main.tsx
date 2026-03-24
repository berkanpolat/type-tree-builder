import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Clean up any leftover PWA service workers and caches
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister());
  });
  caches.keys().then((names) => {
    names.forEach((name) => caches.delete(name));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
