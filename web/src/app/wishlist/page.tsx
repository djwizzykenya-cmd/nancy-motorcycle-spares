"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ProductCard from "@/components/ProductCard";
import { useWishlist } from "@/context/WishlistContext";

export default function WishlistPage() {
  const { user, isReady } = useAuth();
  const { products, isLoading, error, refresh } = useWishlist();

  if (!isReady || (user?.userType === "customer" && isLoading && products.length === 0)) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <p className="text-sm font-medium text-slate-600" role="status">Loading your wishlist…</p>
      </main>
    );
  }

  if (!user || user.userType !== "customer") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-16">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Sign in to view your wishlist</h1>
          <p className="mt-3 text-sm text-slate-600">Save motorcycle parts and find them here when you’re ready to shop.</p>
          <Link
            href={`/auth?redirect=${encodeURIComponent("/wishlist")}`}
            className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">Saved for later</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">My wishlist</h1>
            <p className="mt-2 text-sm text-slate-600">Products you’ve saved to come back to.</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-red-600 hover:text-red-700">
            Continue shopping
          </Link>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center" role="alert">
            <p className="text-sm text-red-800">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">Your wishlist is empty</p>
            <p className="mt-2 text-sm text-slate-600">Save products while browsing and they’ll appear here.</p>
            <Link href="/products" className="mt-5 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700">
              Browse products
            </Link>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                images={product.images}
                category={typeof product.category === "string" ? product.category : product.category?.name}
                seller={product.seller}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
