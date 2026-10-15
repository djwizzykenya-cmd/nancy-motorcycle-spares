import { render, screen } from "@testing-library/react";
import OrderSuccess from "@/app/order-success/page";
import PaymentPage from "@/app/payment/page";
import apiClient from "@/lib/api";

const mockOrderId = { value: null as string | null };

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockOrderId.value ? `orderId=${mockOrderId.value}` : "")
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { get: jest.fn() }
}));

describe("order status pages", () => {
  beforeEach(() => {
    mockOrderId.value = null;
    jest.mocked(apiClient.get).mockReset();
  });

  it("does not claim an order was placed without a reference", () => {
    render(<OrderSuccess />);

    expect(screen.getByRole("heading", { name: /no order confirmation/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^order placed$/i })).not.toBeInTheDocument();
  });

  it("verifies the order belongs to the signed-in customer before confirming it", async () => {
    mockOrderId.value = "order-123";
    jest.mocked(apiClient.get).mockResolvedValue({
      data: { data: { id: "order-123", status: "pending", total: 2400 } }
    });

    render(<OrderSuccess />);

    expect(await screen.findByRole("heading", { name: /order request received/i })).toBeInTheDocument();
    expect(screen.getByText("order-123")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith("/orders/mine/order-123");
  });

  it("does not confirm an order reference that cannot be verified", async () => {
    mockOrderId.value = "not-owned-order";
    jest.mocked(apiClient.get).mockRejectedValue(new Error("Not found"));

    render(<OrderSuccess />);

    expect(await screen.findByRole("heading", { name: /no order confirmation/i })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn’t verify this order/i);
  });

  it("directs customers to checkout to begin M-Pesa payment", () => {
    mockOrderId.value = "order-123";

    render(<PaymentPage />);

    expect(screen.getByRole("heading", { name: /start m-pesa payment from checkout/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay now/i })).not.toBeInTheDocument();
    expect(screen.getByText(/m-pesa prompts are sent from checkout/i)).toBeInTheDocument();
  });
});
