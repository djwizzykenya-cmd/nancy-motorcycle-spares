import { act, render, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() }
}));

function CartStatus() {
  const { syncStatus } = useCart();
  return <div>{syncStatus}</div>;
}

describe("CartProvider synchronization", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.mocked(useAuth).mockReturnValue({
      user: { id: "customer-1", userType: "customer" },
      token: "customer-token",
      isReady: true
    } as ReturnType<typeof useAuth>);
    jest.mocked(apiClient.get).mockResolvedValue({
      data: { data: [{ productId: "product-1", name: "Test part", price: 12, quantity: 2 }] }
    });
    jest.mocked(apiClient.put).mockResolvedValue({
      data: { data: [{ productId: "product-1", name: "Test part", price: 12, quantity: 2 }] }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("saves the account cart once instead of looping on sync-status updates", async () => {
    const { getByText } = render(
      <CartProvider>
        <CartStatus />
      </CartProvider>
    );

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/cart", expect.anything()));

    await waitFor(() => expect(apiClient.put).toHaveBeenCalledTimes(1));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 1500)));

    expect(getByText("saved")).toBeInTheDocument();
    expect(apiClient.put).toHaveBeenCalledTimes(1);
  });
});
