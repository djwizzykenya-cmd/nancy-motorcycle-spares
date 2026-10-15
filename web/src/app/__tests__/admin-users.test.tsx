import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminUsersPage from "@/app/admin/users/page";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const mockDelete = jest.mocked(apiClient.delete);

jest.mock("next/navigation", () => {
  const router = { replace: jest.fn() };
  return { useRouter: () => router };
});

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: { get: jest.fn(), delete: jest.fn() }
}));

describe("AdminUsersPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockDelete.mockReset();
    jest.mocked(useAuth).mockReturnValue({
      isReady: true,
      user: { id: "admin-1", userType: "admin" }
    } as ReturnType<typeof useAuth>);
    jest.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [{
          id: "customer-1",
          firstName: "Test",
          lastName: "Customer",
          email: "customer@example.test",
          userType: "customer",
          isActive: true,
          createdAt: "2026-10-01T00:00:00.000Z",
          lastLoginAt: "2026-10-06T12:30:00.000Z",
          orderCount: 2,
          totalSpent: 1250,
          lastOrderAt: "2026-10-05T12:30:00.000Z"
        }, {
          id: "admin-1",
          firstName: "Marketplace",
          lastName: "Admin",
          email: "admin@example.test",
          userType: "admin",
          isActive: true,
          createdAt: "2026-09-01T00:00:00.000Z",
          lastLoginAt: null,
          orderCount: 0,
          totalSpent: 0,
          lastOrderAt: null
        }]
      }
    });
  });

  it("lists users without showing an inactive view action", async () => {
    render(<AdminUsersPage />);

    expect(await screen.findByText("customer@example.test")).toBeInTheDocument();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/users"));
    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Marketplace users" })).toBeInTheDocument();
    const customerRow = screen.getByRole("row", { name: /Test Customer/ });
    expect(within(customerRow).getByText("2")).toBeInTheDocument();
    expect(within(customerRow).getByText("KES 1,250")).toBeInTheDocument();
    expect(within(customerRow).getByText(/Oct 6, 2026/)).toBeInTheDocument();
    expect(screen.getByText("Protected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Marketplace Admin" })).not.toBeInTheDocument();
  });

  it("permanently deletes a customer only after explicit confirmation", async () => {
    const confirmation = jest.spyOn(window, "confirm").mockReturnValue(true);
    mockDelete.mockResolvedValue({ data: { success: true } });
    render(<AdminUsersPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete Test Customer" }));

    await waitFor(() => {
      expect(confirmation).toHaveBeenCalledWith(expect.stringContaining("all order/payment history"));
      expect(mockDelete).toHaveBeenCalledWith("/users/customer-1");
      expect(screen.queryByText("customer@example.test")).not.toBeInTheDocument();
    });
    confirmation.mockRestore();
  });

  it("does not delete an account when the admin cancels the confirmation", async () => {
    const confirmation = jest.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminUsersPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete Test Customer" }));

    expect(confirmation).toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByText("customer@example.test")).toBeInTheDocument();
    confirmation.mockRestore();
  });

  it("shows an API error when customer deletion fails", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    mockDelete.mockRejectedValue(new Error("Deletion is unavailable."));
    render(<AdminUsersPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete Test Customer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Deletion is unavailable.");
    expect(screen.getByText("customer@example.test")).toBeInTheDocument();
  });
});
