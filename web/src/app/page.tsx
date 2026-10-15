"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import apiClient, { isApiConfigured } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  seller: { shopName: string };
  category?: string | { name: string };
}

const CATEGORIES = [
  { name: "Engine Parts", slug: "engine-parts", icon: "⚙️" },
  { name: "Transmission", slug: "transmission", icon: "🔧" },
  { name: "Suspension", slug: "suspension", icon: "🏍️" },
  { name: "Brakes", slug: "brakes", icon: "🛑" },
  { name: "Electrical", slug: "electrical", icon: "⚡" },
  { name: "Tires & Wheels", slug: "tires-wheels", icon: "🛞" },
  { name: "Lights", slug: "lights", icon: "💡" },
  { name: "Accessories", slug: "accessories", icon: "🪝" },
];

const BENEFITS = [
  { icon: "🏍️", title: "Made for riders", description: "Find parts and accessories for the road ahead." },
  { icon: "🧰", title: "Browse with ease", description: "Explore products by the part you need." },
  { icon: "🇰🇪", title: "A Kenyan marketplace", description: "Shop motorcycle essentials in one place." },
];

export default function HomePage() {
  const { user } = useAuth();
  const { items } = useCart();
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setProductsError("");
      try {
        const response = await apiClient.get("/products?limit=12");
        const data = response.data?.data;
        if (!Array.isArray(data)) {
          throw new Error("Product catalog returned an invalid response.");
        }
        if (isMounted) setProducts(data);
      } catch (err) {
        console.error("Failed to load products", err);
        if (isMounted) {
          setProducts([]);
          setProductsError(
            isApiConfigured
              ? "We couldn’t load products right now. Please try again."
              : "Our live product catalogue is being prepared. Online ordering is not available yet."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const getCategoryName = (product: Product) => {
    if (typeof product.category === "string") return product.category;
    return product.category?.name || "Parts";
  };

  return (
    <main className="min-h-screen bg-[#f3f4ef] text-[#171b19]">
      <div className="bg-[#b7f34b] px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#171b19] sm:text-xs">
        Parts, gear &amp; essentials <span className="mx-2 opacity-40">/</span> Built for Kenya’s riders
      </div>
      <header className="border-b border-[#171b19]/10 bg-white">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Nancy Motorcycle Spares home">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#171b19] text-lg font-black text-[#b7f34b]">
              N<span className="text-white">.</span>
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-extrabold tracking-[0.04em] text-[#171b19] sm:hidden">NANCY SPARES</span>
              <span className="hidden text-sm font-extrabold tracking-[0.06em] text-[#171b19] sm:block sm:text-[15px]">NANCY MOTORCYCLE SPARES</span>
              <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.18em] text-[#777e78] sm:block">Parts. Gear. Go.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#505752] md:flex" aria-label="Main navigation">
            <Link href="/products" className="transition hover:text-[#5c8d12]">Shop parts</Link>
            <Link href="/products" className="transition hover:text-[#5c8d12]">Explore categories</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {user?.userType === "admin" ? (
              <Link href="/admin" className="inline-flex rounded-full px-2.5 py-2 text-xs font-semibold text-[#171b19] transition hover:bg-[#f0f1ed] sm:px-4 sm:text-sm">
                Admin
              </Link>
            ) : user ? (
              <Link href="/account" className="rounded-full px-3 py-2 text-sm font-semibold text-[#171b19] transition hover:bg-[#f0f1ed] sm:px-4">
                My account
              </Link>
            ) : (
              <Link href="/auth" className="rounded-full px-3 py-2 text-sm font-semibold text-[#171b19] transition hover:bg-[#f0f1ed] sm:px-4">
                Sign in
              </Link>
            )}
            <Link
              href="/cart"
              aria-label={`Shopping cart${cartCount ? `, ${cartCount} ${cartCount === 1 ? "item" : "items"}` : ", empty"}`}
              className="relative inline-flex items-center gap-2 rounded-full bg-[#171b19] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#343a35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7f34b] focus-visible:ring-offset-2 sm:px-4"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h2l2.2 11.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 8H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b7f34b] px-1 text-[11px] font-bold leading-none text-[#171b19] ring-2 ring-white"
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-8">
        <section className="grid overflow-hidden rounded-[24px] bg-[#171b19] shadow-[0_24px_70px_-30px_rgba(23,27,25,0.45)] md:min-h-[440px] md:grid-cols-[0.88fr_1.12fr] lg:min-h-[540px]">
          <div className="relative z-10 flex flex-col justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-14">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#d8ded7]">
                <span className="h-2 w-2 rounded-full bg-[#b7f34b]" />
                Your ride. Your rules.
              </div>
              <h1 className="mt-6 max-w-xl text-[3rem] font-black uppercase leading-[0.95] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.35rem]">
                Parts that
                <span className="mt-1 block text-[#b7f34b]">keep you</span>
                moving<span className="text-white">.</span>
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#c0c8c1] sm:text-base">
                Find reliable motorcycle spares, gear up, and get back out there. Everything your next ride needs, all in one place.
              </p>

              <form action="/products" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:flex-row">
                <label htmlFor="home-product-search" className="sr-only">Search motorcycle parts</label>
                <input
                  id="home-product-search"
                  name="search"
                  type="search"
                  placeholder="What part are you looking for?"
                  className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-[#171b19] outline-none placeholder:text-[#858b85] focus:ring-2 focus:ring-[#b7f34b]/60"
                />
                <button type="submit" className="rounded-xl bg-[#b7f34b] px-6 py-3 text-sm font-extrabold text-[#171b19] transition hover:bg-[#a4df38]">
                  Find your part <span aria-hidden="true">↗</span>
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#c0c8c1]">
                <span className="inline-flex items-center gap-2"><span className="text-[#b7f34b]">✓</span> Rider-first service</span>
                <span className="inline-flex items-center gap-2"><span className="text-[#b7f34b]">✓</span> Delivery across Kenya</span>
              </div>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="relative min-h-[260px] overflow-hidden bg-cover bg-[center_58%] sm:min-h-[340px] md:min-h-full"
            style={{ backgroundImage: "linear-gradient(90deg, rgba(23,27,25,.18), rgba(23,27,25,0) 45%), url('https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1400&q=85&fit=crop')" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#111512]/55 via-transparent to-transparent" />
            <div className="absolute bottom-5 right-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-[#171b19]/75 px-4 py-3 text-white shadow-xl backdrop-blur-md sm:bottom-8 sm:right-8">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b7f34b] text-lg text-[#171b19]">↗</span>
              <span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.17em] text-[#b7f34b]">Ride ready</span>
                <span className="mt-0.5 block text-sm font-semibold">Find your next part</span>
              </span>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16" aria-label="Marketplace benefits">
          <div className="grid gap-3 md:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-4 rounded-2xl border border-[#171b19]/[0.07] bg-white p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff8df] text-xl" aria-hidden="true">{benefit.icon}</span>
                <div>
                  <h2 className="font-bold text-[#171b19]">{benefit.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#737a74]">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="categories-heading">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6f991e]">Shop your way</p>
              <h2 id="categories-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-[#171b19] sm:text-4xl">Find your next upgrade</h2>
              <p className="mt-2 text-sm text-[#737a74]">All the essentials, sorted by what you need.</p>
            </div>
            <Link href="/products" className="inline-flex items-center gap-2 text-sm font-bold text-[#171b19] transition hover:text-[#6f991e]">
              View all products <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${encodeURIComponent(category.slug)}`}
                className="group flex min-h-[116px] items-center gap-3 rounded-2xl border border-[#171b19]/[0.07] bg-white p-4 transition hover:-translate-y-1 hover:border-[#b7f34b] hover:shadow-lg hover:shadow-[#171b19]/[0.06] sm:gap-4 sm:p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff8df] text-xl sm:h-12 sm:w-12 sm:text-2xl" aria-hidden="true">
                  {category.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[#171b19] transition group-hover:text-[#6f991e] sm:text-base">{category.name}</span>
                  <span className="mt-1 block text-xs text-[#737a74]">Explore parts <span aria-hidden="true">↗</span></span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="pt-14 sm:pt-20" aria-labelledby="popular-heading">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6f991e]">Hand-picked for the road</p>
              <h2 id="popular-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-[#171b19] sm:text-4xl">Rider favourites</h2>
              <p className="mt-2 text-sm text-[#737a74]">Reliable essentials from Nancy Motorcycle Spares.</p>
            </div>
            <Link href="/products" className="inline-flex items-center gap-2 text-sm font-bold text-[#171b19] transition hover:text-[#6f991e]">
              Browse all <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {loading ? (
              <div className="col-span-full rounded-2xl border border-[#171b19]/[0.07] bg-white p-10 text-center text-sm text-[#737a74]" role="status">
                Loading products…
              </div>
            ) : productsError ? (
              <div className="col-span-full rounded-2xl border border-[#b7f34b] bg-white p-8 text-center" role="alert">
                <p className="text-sm text-[#171b19]">{productsError}</p>
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                  className="mt-4 rounded-xl bg-[#171b19] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#343a35]"
                >
                  Try again
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-[#171b19]/[0.07] bg-white p-10 text-center text-sm text-[#737a74]">
                No products are available right now.
              </div>
            ) : (
              products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  images={product.images}
                  seller={product.seller}
                  category={getCategoryName(product)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
