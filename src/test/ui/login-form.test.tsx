import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
          order: vi.fn().mockResolvedValue({ data: [] }),
        }),
        order: vi.fn().mockResolvedValue({ data: [] }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null }) },
  },
}));

vi.mock("@/hooks/use-seo-meta", () => ({ useSeoMeta: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/assets/tekstil-as-logo.png", () => ({ default: "logo.png" }));
vi.mock("@/assets/auth-bg.jpg", () => ({ default: "bg.jpg" }));

import { supabase } from "@/integrations/supabase/client";

const renderLoginPage = async () => {
  const { default: GirisKayit } = await import("@/pages/GirisKayit");
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <GirisKayit />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe("Login Form UI Tests (L5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form with email and password fields", async () => {
    await renderLoginPage();
    expect(screen.getByPlaceholderText("E-posta")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Şifre")).toBeInTheDocument();
  });

  it("renders login and register tab buttons", async () => {
    await renderLoginPage();
    const allGiris = screen.getAllByText("Giriş");
    expect(allGiris.length).toBeGreaterThanOrEqual(2); // tab + submit button
    expect(screen.getByText("Kayıt")).toBeInTheDocument();
  });

  it("login submit button is present", async () => {
    await renderLoginPage();
    const submitBtn = screen.getByRole("button", { name: /giriş$/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toHaveAttribute("type", "submit");
  });

  it("email field accepts input", async () => {
    await renderLoginPage();
    const emailInput = screen.getByPlaceholderText("E-posta") as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    expect(emailInput.value).toBe("test@test.com");
  });

  it("password field accepts input", async () => {
    await renderLoginPage();
    const passInput = screen.getByPlaceholderText("Şifre") as HTMLInputElement;
    fireEvent.change(passInput, { target: { value: "myPassword123" } });
    expect(passInput.value).toBe("myPassword123");
  });

  it("calls signInWithPassword on form submit", async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    (supabase.auth.signInWithPassword as any) = mockSignIn;

    await renderLoginPage();
    const emailInput = screen.getByPlaceholderText("E-posta");
    const passInput = screen.getByPlaceholderText("Şifre");

    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    fireEvent.change(passInput, { target: { value: "pass123" } });

    const form = emailInput.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "pass123",
      });
    });
  });

  it("shows loading state during login", async () => {
    const mockSignIn = vi.fn().mockImplementation(() => new Promise(() => {}));
    (supabase.auth.signInWithPassword as any) = mockSignIn;

    await renderLoginPage();
    fireEvent.change(screen.getByPlaceholderText("E-posta"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Şifre"), { target: { value: "123" } });

    const form = screen.getByPlaceholderText("E-posta").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Giriş yapılıyor...")).toBeInTheDocument();
    });
  });

  it("switches to register tab when clicked", async () => {
    await renderLoginPage();
    const kayitTab = screen.getByText("Kayıt");
    fireEvent.click(kayitTab);
    await waitFor(() => {
      expect(screen.getByText(/firma türü/i)).toBeInTheDocument();
    });
  });
});
