import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountPage from "@/app/account/page";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() })
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn()
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { get: jest.fn() }
}));

describe("customer order history", () => {
  beforeEach(() => {
    jest.mocked(useAuth).mockReturnValue({
      isReady: true,
      token: "test-token",
      isAuthenticated: true,
      user: {
        id: "customer-1",
        email: "rider@example.test",
        firstName: "Rider",
        lastName: "Test",
        name: "Rider Test",
        userType: "customer"
      },
      logout: jest.fn(),
      login: jest.fn(),
      register: jest.fn()
    });
    jest.mocked(useCart).mockReturnValue({
      items: [],
      isReady: true,
      syncStatus: "saved",
      retrySync: jest.fn(),
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clear: jest.fn(),
      total: 0
    });
    jest.mocked(apiClient.get).mockReset();
    jest.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === "/auth/me") {
        return { data: { data: { id: "customer-1", email: "rider@example.test", firstName: "Rider", lastName: "Test", userType: "customer" } } };
      }
      return {
        data: {
          data: [{
            id: "order-123",
            status: "shipped",
            paymentStatus: "pending",
            paymentMethod: "cash_on_delivery",
            trackingNumber: "KE-TRACK-42",
            total: 2400,
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-02T00:00:00.000Z",
            items: [{ id: "item-1", name: "Brake pad", quantity: 2, price: 1200, subtotal: 2400 }],
            shippingAddress: {
              street: "Main Road",
              city: "Nairobi",
              state: "Nairobi",
              postalCode: "00100",
              country: "KE",
              latitude: -1.286389,
              longitude: 36.817223
            }
          }]
        }
      };
    });
  });

  it("shows order status progress, item details, delivery address, and tracking reference", async () => {
    render(<AccountPage />);

    expect(await screen.findByRole("heading", { name: /order history & tracking/i })).toBeInTheDocument();
    expect(await screen.findByText("KE-TRACK-42")).toBeInTheDocument();
    expect(screen.getByText("Brake pad × 2")).toBeInTheDocument();
    expect(screen.getByText(/Main Road, Nairobi/)).toBeInTheDocument();
    expect(screen.getByText("Shipped", { selector: "li" })).toBeInTheDocument();
    expect(await screen.findByRole("application", { name: /main road, nairobi/i })).toBeInTheDocument();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/orders/mine"));
  });

  it("shows a recoverable error when customer order history cannot load", async () => {
    jest.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === "/auth/me") {
        return { data: { data: { id: "customer-1", email: "rider@example.test", firstName: "Rider", lastName: "Test", userType: "customer" } } };
      }
      throw new Error("API unavailable");
    });

    render(<AccountPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load your orders/i);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("refreshes order tracking when the customer returns to the account page", async () => {
    let historyRequest = 0;
    jest.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === "/auth/me") {
        return { data: { data: { id: "customer-1", email: "rider@example.test", firstName: "Rider", lastName: "Test", userType: "customer" } } };
      }
      historyRequest += 1;
      return {
        data: {
          data: [{
            id: "order-123",
            status: historyRequest === 1 ? "pending" : "shipped",
            paymentStatus: "pending",
            paymentMethod: "cash_on_delivery",
            trackingNumber: "KE-TRACK-42",
            total: 2400,
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-02T00:00:00.000Z",
            items: [{ id: "item-1", name: "Brake pad", quantity: 2, price: 1200, subtotal: 2400 }],
            shippingAddress: {
              street: "Main Road",
              city: "Nairobi",
              state: "Nairobi",
              postalCode: "00100",
              country: "KE",
              latitude: -1.286389,
              longitude: 36.817223
            }
          }]
        }
      };
    });

    render(<AccountPage />);
    await screen.findByText("KE-TRACK-42");
    fireEvent.focus(window);

    await waitFor(() => expect(screen.getByText("shipped", { selector: "p" })).toBeInTheDocument());
    expect(historyRequest).toBe(2);
  });
});
