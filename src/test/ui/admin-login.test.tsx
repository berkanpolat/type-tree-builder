import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Mock modules
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/contexts/AdminAuthContext", () => ({
  useAdminAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import AdminGiris from "@/pages/admin/AdminGiris";

const renderAdminLogin = () =>
  render(
    <BrowserRouter>
      <AdminGiris />
    </BrowserRouter>
  );

describe("Admin Login Page (L5 RTL)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders username and password fields", () => {
    renderAdminLogin();
    expect(screen.getByPlaceholderText("Kullanıcı numaranızı girin")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Şifrenizi girin")).toBeInTheDocument();
  });

  it("renders submit button disabled when fields empty", () => {
    renderAdminLogin();
    const btn = screen.getByRole("button", { name: /giriş yap/i });
    expect(btn).toBeDisabled();
  });

  it("enables submit button when both fields filled", () => {
    renderAdminLogin();
    fireEvent.change(screen.getByPlaceholderText("Kullanıcı numaranızı girin"), {
      target: { value: "admin1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Şifrenizi girin"), {
      target: { value: "pass123" },
    });
    const btn = screen.getByRole("button", { name: /giriş yap/i });
    expect(btn).not.toBeDisabled();
  });

  it("calls login function on submit", async () => {
    mockLogin.mockResolvedValue({ error: null });
    renderAdminLogin();
    fireEvent.change(screen.getByPlaceholderText("Kullanıcı numaranızı girin"), {
      target: { value: "admin1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Şifrenizi girin"), {
      target: { value: "pass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /giriş yap/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin1", "pass123");
    });
  });

  it("navigates to panel on successful login", async () => {
    mockLogin.mockResolvedValue({ error: null });
    renderAdminLogin();
    fireEvent.change(screen.getByPlaceholderText("Kullanıcı numaranızı girin"), {
      target: { value: "admin1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Şifrenizi girin"), {
      target: { value: "pass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /giriş yap/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/yonetim");
    });
  });

  it("toggles password visibility", () => {
    renderAdminLogin();
    const passInput = screen.getByPlaceholderText("Şifrenizi girin");
    expect(passInput).toHaveAttribute("type", "password");

    // Find the eye toggle button
    const toggleBtn = passInput.parentElement!.querySelector("button")!;
    fireEvent.click(toggleBtn);
    expect(passInput).toHaveAttribute("type", "text");

    fireEvent.click(toggleBtn);
    expect(passInput).toHaveAttribute("type", "password");
  });
});
