"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api";
import WishlistButton from "@/components/WishlistButton";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category?: Category | string;
  seller: {
    shopName: string;
  };
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "engine-parts", name: "Engine Parts", slug: "engine-parts" },
  { id: "transmission", name: "Transmission", slug: "transmission" },
  { id: "suspension", name: "Suspension", slug: "suspension" },
  { id: "brakes", name: "Brakes", slug: "brakes" },
  { id: "electrical", name: "Electrical", slug: "electrical" },
  { id: "tires-wheels", name: "Tires & Wheels", slug: "tires-wheels" },
  { id: "lights", name: "Lights", slug: "lights" },
  { id: "accessories", name: "Accessories", slug: "accessories" }
];

const updateQuery = (currentQuery: string, key: string, value: string) => {
  const params = new URLSearchParams(currentQuery);
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }

  const query = params.toString();
  return query ? `/products?${query}` : "/products";
};

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() || "";
  const categoryParam = searchParams?.get("category") || "";
  const searchParam = searchParams?.get("search") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [searchInput, setSearchInput] = useState(searchParam);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  useEffect(() => {
    let active = true;

    apiClient.get("/products/categories")
      .then((response) => {
        const data = response.data?.data;
        if (active && Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((categoryError) => {
        console.error("Failed to load product categories", categoryError);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    apiClient.get("/products", {
      params: {
        limit: 100,
        ...(categoryParam ? { category: categoryParam } : {}),
        ...(searchParam ? { search: searchParam } : {})
      }
    })
      .then((response) => {
        const data = response.data?.data;
        if (!Array.isArray(data)) {
          throw new Error("The product catalog returned an invalid response.");
        }
        if (active) setProducts(data);
      })
      .catch((requestError) => {
        console.error("Failed to load products", requestError);
        if (active) {
          setProducts([]);
          setError("We couldn’t load the product catalog. Check your connection and try again.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [categoryParam, searchParam, retryCount]);

  useEffect(() => {
    const normalizedInput = searchInput.trim();
    if (normalizedInput === searchParam) return;

    const timeout = window.setTimeout(() => {
      router.replace(updateQuery(queryString, "search", normalizedInput));
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [router, searchInput, searchParam, queryString]);

  const selectedCategory = categories.find(
    (category) => category.slug === categoryParam || category.name.toLowerCase() === categoryParam.toLowerCase()
  );
  const heading = selectedCategory ? selectedCategory.name : "Browse Products";

  return (
    <main className="min-h-screen bg-[#f3f4ef] py-10 text-[#171b19]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6f991e]">Nancy Motorcycle Spares</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#171b19]">{heading}</h1>
            <p className="mt-2 text-sm text-[#737a74]">
              {selectedCategory
                ? `Shop motorcycle spares in ${selectedCategory.name}.`
                : "Browse motorcycle spares from Nancy Motorcycle Spares."}
            </p>
          </div>
          <Link href="/" className="font-semibold text-[#171b19] hover:text-[#6f991e] hover:underline">
            Back to home
          </Link>
        </div>

        <section className="mb-8 rounded-2xl border border-[#171b19]/[0.07] bg-white p-5" aria-label="Product filters">
          <label htmlFor="product-search" className="mb-2 block text-sm font-medium text-[#171b19]">
            Search products
          </label>
          <input
            id="product-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by product name or description"
            className="w-full rounded-xl border border-[#171b19]/10 bg-[#f3f4ef] px-4 py-3 text-[#171b19] outline-none transition focus:border-[#8cba3b] focus:ring-2 focus:ring-[#b7f34b]/30"
          />

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/products"
              aria-current={!categoryParam ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                !categoryParam ? "bg-[#171b19] text-white" : "bg-[#f0f1ed] text-[#454c46] hover:bg-[#e7f2d9]"
              }`}
            >
              All parts
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={updateQuery(queryString, "category", category.slug)}
                aria-current={selectedCategory?.slug === category.slug ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedCategory?.slug === category.slug
                    ? "bg-[#171b19] text-white"
                    : "bg-[#f0f1ed] text-[#454c46] hover:bg-[#e7f2d9]"
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>

        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-[#737a74]" aria-live="polite">
            {loading ? "Loading products…" : `${products.length} ${products.length === 1 ? "product" : "products"} found`}
          </p>
          {(categoryParam || searchParam) && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                router.push("/products");
              }}
              className="text-sm font-semibold text-[#5c8d12] hover:text-[#171b19]"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#171b19]/[0.07] bg-white py-20 text-center text-[#737a74]" role="status">
            Loading products…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#b7f34b] bg-white p-10 text-center" role="alert">
            <p className="text-[#171b19]">{error}</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mt-4 rounded-xl bg-[#171b19] px-5 py-2 text-sm font-semibold text-white hover:bg-[#343a35]"
            >
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-[#171b19]/[0.07] bg-white py-20 text-center text-[#737a74]">
            <p className="text-lg font-semibold text-[#171b19]">No matching products found.</p>
            <p className="mt-2">Try a different search or browse another category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <article key={product.id} className="group flex h-full flex-col rounded-2xl border border-[#171b19]/[0.07] bg-white p-3 transition hover:-translate-y-1 hover:border-[#b7f34b] hover:shadow-xl hover:shadow-[#171b19]/[0.08] sm:p-4">
                <Link href={`/products/${product.id}`} className="flex flex-1 flex-col">
                  <div className="h-48 overflow-hidden rounded-xl bg-[#eef0eb] sm:h-56">
                    <Image
                      src={product.images?.[0] || "/placeholder-product.svg"}
                      alt={product.name}
                      width={560}
                      height={224}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-4 flex flex-1 flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6f991e]">
                      {typeof product.category === "string" ? product.category : product.category?.name || "Parts"}
                    </p>
                    <h2 className="mt-2 text-base font-semibold text-[#171b19]">{product.name}</h2>
                    <p className="mt-2 text-sm text-[#737a74]">{product.seller?.shopName || "Nancy Motorcycle Spares"}</p>
                    <p className="mt-auto pt-4 text-xl font-bold text-[#171b19]">KES {product.price.toLocaleString("en-KE")}</p>
                  </div>
                </Link>
                <div className="mt-4">
                  <WishlistButton
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      images: product.images || [],
                      category: product.category,
                      seller: product.seller
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
