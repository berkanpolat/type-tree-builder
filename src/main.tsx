import { createRoot } from "react-dom/client";
import { installSupabaseProxy } from "./lib/supabase-proxy";
import App from "./App.tsx";
import "./index.css";

// Install Cloudflare proxy before any Supabase calls
installSupabaseProxy();

createRoot(document.getElementById("root")!).render(<App />);
