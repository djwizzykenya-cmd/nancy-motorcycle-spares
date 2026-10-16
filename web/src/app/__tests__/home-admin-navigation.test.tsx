import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import apiClient from "@/lib/api";

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn()
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { get: jest.fn(() => new Promise(() => {})) }
}));

jest.mock("@/components/ProductCard", () => ({
  __esModule: true,
  default: () => null
}));

describe("HomePage admin navigation", () => {
  beforeEach(() => {
    jest.mocked(useCart).mockReturnValue({
      items: [],
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clear: jest.fn(),
      total: 0,
      isReady: true,
      syncStatus: "guest",
      retrySync: jest.fn()
    } as ReturnType<typeof useCart>);
  });

  it("shows an admin dashboard link that is not hidden on narrow screens", () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { userType: "admin" }
    } as ReturnType<typeof useAuth>);

    render(<HomePage />);

    const adminLink = screen.getByRole("link", { name: "Admin" });
    expect(adminLink).toHaveAttribute("href", "/admin");
    expect(adminLink).not.toHaveClass("hidden");
    expect(adminLink).toHaveClass("inline-flex");
  });

  it("does not show the admin dashboard link to customers", () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { userType: "customer" }
    } as ReturnType<typeof useAuth>);

    render(<HomePage />);

    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
  });

  it("shows helpful navigation when the catalogue is empty", async () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { userType: "customer" }
    } as ReturnType<typeof useAuth>);
    jest.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } });

    render(<HomePage />);

    await screen.findByRole("heading", { name: "We’re getting the parts catalogue ready." });
    expect(
      screen.getAllByRole("link", { name: /explore categories/i }).some((link) => link.getAttribute("href") === "#categories")
    ).toBe(true);
    expect(screen.getByRole("link", { name: "Browse all parts" })).toHaveAttribute("href", "/products");
  });
});
