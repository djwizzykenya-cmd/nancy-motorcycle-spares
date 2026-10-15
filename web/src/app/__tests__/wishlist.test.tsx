import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WishlistButton from "@/components/WishlistButton";
import WishlistPage from "@/app/wishlist/page";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() })
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/context/WishlistContext", () => ({
  useWishlist: jest.fn()
}));

jest.mock("@/components/ProductCard", () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => <article>{name}</article>
}));

const product = {
  id: "product-1",
  name: "Brake disc",
  price: 3200,
  images: ["/brake-disc.jpg"],
  category: "Brakes"
};

describe("customer wishlist", () => {
  const addProduct = jest.fn();
  const removeProduct = jest.fn();
  const refresh = jest.fn();

  beforeEach(() => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: "customer-1", userType: "customer" },
      isReady: true
    } as ReturnType<typeof useAuth>);
    jest.mocked(useWishlist).mockReturnValue({
      products: [],
      isLoading: false,
      error: "",
      refresh,
      hasProduct: () => false,
      addProduct,
      removeProduct
    });
  });

  it("saves a product and exposes its wishlist state accessibly", async () => {
    addProduct.mockResolvedValue(undefined);
    render(<WishlistButton product={product} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Brake disc to wishlist" }));

    await waitFor(() => expect(addProduct).toHaveBeenCalledWith(product));
  });

  it("removes a saved product", async () => {
    removeProduct.mockResolvedValue(undefined);
    jest.mocked(useWishlist).mockReturnValue({
      products: [product],
      isLoading: false,
      error: "",
      refresh,
      hasProduct: () => true,
      addProduct,
      removeProduct
    });
    render(<WishlistButton product={product} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Brake disc from wishlist" }));

    await waitFor(() => expect(removeProduct).toHaveBeenCalledWith(product.id));
  });

  it("shows an empty state and a browsing link", () => {
    jest.mocked(useWishlist).mockReturnValue({
      products: [],
      isLoading: false,
      error: "",
      refresh,
      hasProduct: () => false,
      addProduct,
      removeProduct
    });
    render(<WishlistPage />);

    expect(screen.getByText("Your wishlist is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse products" })).toHaveAttribute("href", "/products");
  });

  it("renders the customer’s saved products", () => {
    jest.mocked(useWishlist).mockReturnValue({
      products: [product],
      isLoading: false,
      error: "",
      refresh,
      hasProduct: () => true,
      addProduct,
      removeProduct
    });
    render(<WishlistPage />);

    expect(screen.getByRole("article")).toHaveTextContent("Brake disc");
  });
});
