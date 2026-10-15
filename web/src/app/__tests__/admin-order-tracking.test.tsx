import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminOrdersPage from "@/app/admin/orders/page";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const mockRouter = { replace: jest.fn() };

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn() }
}));

jest.mock("@/components/OrderDeliveryMap", () => ({
  __esModule: true,
  default: ({ label }: { label: string }) => `Delivery destination map: ${label}`
}));

describe("admin order tracking references", () => {
  beforeEach(() => {
    jest.mocked(useAuth).mockReturnValue({
      isReady: true,
      user: { id: "admin-1", userType: "admin" }
    } as ReturnType<typeof useAuth>);
    jest.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [{
          id: "order-123",
          orderNumber: "order-123",
          customer: "Rider Test",
          email: "rider@example.test",
          items: 1,
          total: 2400,
          status: "shipped",
          trackingNumber: null,
          createdAt: "2026-10-01T00:00:00.000Z",
          shippingAddress: {
            street: "Main Road",
            city: "Nairobi",
            state: "Nairobi",
            postalCode: "00100",
            latitude: -1.286389,
            longitude: 36.817223
          }
        }]
      }
    });
    jest.mocked(apiClient.patch).mockResolvedValue({
      data: { data: { id: "order-123", status: "shipped", trackingNumber: "KE-TRACK-42" } }
    });
  });

  it("saves a courier reference without changing the order status", async () => {
    render(<AdminOrdersPage />);

    const input = await screen.findByRole("textbox", { name: /delivery tracking reference for order/i });
    expect(await screen.findByText(/delivery destination map: main road, nairobi/i)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "KE-TRACK-42" } });
    fireEvent.click(screen.getByRole("button", { name: /save tracking reference/i }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith(
      "/orders/order-123/status",
      { status: "shipped", trackingNumber: "KE-TRACK-42" }
    ));
  });
});
