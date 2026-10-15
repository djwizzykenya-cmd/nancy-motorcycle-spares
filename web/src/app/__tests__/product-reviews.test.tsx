import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductDetailClient from "@/app/products/[id]/ProductDetailClient";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import apiClient from "@/lib/api";

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/context/CartContext", () => ({
  useCart: jest.fn()
}));

jest.mock("@/components/WishlistButton", () => ({
  __esModule: true,
  default: () => null
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() }
}));

describe("product reviews", () => {
  beforeEach(() => {
    jest.mocked(useAuth).mockReturnValue({
      isReady: true,
      token: "customer-token",
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
    jest.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === "/products/prod-1") {
        return {
          data: {
            data: {
              id: "prod-1",
              name: "Front Brake Disc",
              price: 3200,
              stock: 4,
              images: [],
              description: "Durable brake disc",
              seller: { shopName: "Nancy Motorcycle Spares" }
            }
          }
        };
      }
      if (url === "/products/prod-1/reviews/me") {
        return { data: { data: { eligible: true, review: null } } };
      }
      return {
        data: {
          data: {
            reviews: [],
            rating: null,
            reviewCount: 0
          }
        }
      };
    });
    jest.mocked(apiClient.post).mockResolvedValue({
      data: { data: { rating: 5, reviewCount: 1 } }
    });
  });

  it("lets a customer with a delivered order submit a rating and comment", async () => {
    render(<ProductDetailClient productId="prod-1" />);

    await screen.findByRole("heading", { name: "Front Brake Disc" });
    fireEvent.click(await screen.findByRole("button", { name: "5 stars" }));
    fireEvent.change(screen.getByLabelText(/comment \(optional\)/i), {
      target: { value: "Fits well and arrived in good condition." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save review" }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/products/prod-1/reviews", {
        rating: 5,
        comment: "Fits well and arrived in good condition."
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Your review has been saved.");
  });

  it("does not show the review form before an order is delivered", async () => {
    jest.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === "/products/prod-1") {
        return {
          data: {
            data: {
              id: "prod-1",
              name: "Front Brake Disc",
              price: 3200,
              stock: 4,
              images: [],
              description: "Durable brake disc",
              seller: { shopName: "Nancy Motorcycle Spares" }
            }
          }
        };
      }
      if (url === "/products/prod-1/reviews/me") {
        return { data: { data: { eligible: false, review: null } } };
      }
      return { data: { data: { reviews: [], rating: null, reviewCount: 0 } } };
    });

    render(<ProductDetailClient productId="prod-1" />);

    expect(await screen.findByText(/after an order containing this product has been marked delivered/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save review" })).not.toBeInTheDocument();
  });
});
