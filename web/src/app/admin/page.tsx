"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import apiClient from "@/lib/api";

interface RecentProduct {
  id: string;
  name: string;
  createdAt: string;
}

function AdminDashboard() {
  const { user, isReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [counts, setCounts] = useState<{
    products: number | null;
    users: number | null;
    orders: number | null;
  }>({ products: null, users: null, orders: null });
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isReady) return;

    if (!user || user.userType !== "admin") {
      router.replace("/");
      return;
    }

    if (pathname !== "/admin") return;

    let mounted = true;

    const loadStats = async () => {
      setStatsLoading(true);
      setStatsError(null);

      try {
        const [productsRes, usersRes, ordersRes] = await Promise.all([
          apiClient.get("/products/admin?limit=3"),
          apiClient.get("/users"),
          apiClient.get("/orders")
        ]);

        const productsData = productsRes.data?.data;
        const productsTotal = productsRes.data?.meta?.total;
        if (!Array.isArray(productsData) || typeof productsTotal !== "number") {
          throw new Error("The products response did not contain a valid count.");
        }

        const usersTotal = Array.isArray(usersRes.data?.data) ? usersRes.data.data.length : null;
        const ordersTotal = Array.isArray(ordersRes.data?.data) ? ordersRes.data.data.length : null;
        const latestProducts = productsData
          .filter((product: unknown): product is Record<string, unknown> =>
            typeof product === "object" && product !== null
          )
          .map((product) => ({
            id: typeof product.id === "string" ? product.id : "",
            name: typeof product.name === "string" ? product.name : "Unnamed product",
            createdAt: typeof product.createdAt === "string" ? product.createdAt : ""
          }))
          .filter((product) => product.id);

        if (!mounted) return;
        setCounts({ products: productsTotal, users: usersTotal, orders: ordersTotal });
        setRecentProducts(latestProducts);
      } catch (err: unknown) {
        console.warn("Failed to load admin stats", err);
        if (!mounted) return;
        setCounts({ products: null, users: null, orders: null });
        setRecentProducts([]);
        setStatsError("Could not load the latest dashboard data.");
      } finally {
        if (mounted) setStatsLoading(false);
      }
    };

    setCounts({ products: null, users: null, orders: null });
    void loadStats();

    const handleRefresh = () => {
      if (document.visibilityState === "visible") void loadStats();
    };
    window.addEventListener("focus", handleRefresh);
    window.addEventListener("pageshow", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("pageshow", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, [isReady, user, router, pathname, refreshKey]);

  if (!isReady || !user) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-20">
        <div className="rounded-3xl bg-white p-10 shadow-lg text-center">
          <p className="text-lg font-semibold text-slate-900">Checking admin access...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4">
        {/* Welcome Header */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-blue-800 p-8 shadow-xl text-white">
          <h1 className="text-4xl font-bold mb-2">
            Welcome, {user.firstName || user.lastName ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Admin"}!
          </h1>
          <p className="text-blue-100 text-lg">Manage your e-commerce marketplace with ease</p>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Marketplace overview</h2>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={statsLoading}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
          >
            {statsLoading ? "Refreshing…" : "Refresh stats"}
          </button>
        </div>
        {statsError && (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {statsError} Use “Refresh stats” to try again.
          </p>
        )}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-blue-500">
            <p className="text-slate-600 text-sm font-semibold uppercase">Total Products</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{statsLoading ? "Loading..." : counts.products ?? "—"}</p>
            <p className="text-slate-500 text-xs mt-2">Live catalog count</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-green-500">
            <p className="text-slate-600 text-sm font-semibold uppercase">Total Users</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{statsLoading ? "Loading..." : counts.users ?? "—"}</p>
            <p className="text-slate-500 text-xs mt-2">Registered accounts</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-orange-500">
            <p className="text-slate-600 text-sm font-semibold uppercase">Total Orders</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{statsLoading ? "Loading..." : counts.orders ?? "—"}</p>
            <p className="text-slate-500 text-xs mt-2">Marketplace orders</p>
          </div>
        </div>

        {/* Management Sections */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Management Sections</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Products Card */}
            <Link
              href="/admin/products"
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all hover:scale-105 p-6 border-l-4 border-blue-500 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900">Products</h3>
                <span className="text-4xl">📦</span>
              </div>
              <p className="text-slate-600 text-sm">Add, edit, delete products with images and categories</p>
              <div className="mt-4 flex items-center text-blue-600 font-semibold text-sm hover:text-blue-800">
                Go to Products →
              </div>
            </Link>

            {/* Users Card */}
            <Link
              href="/admin/users"
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all hover:scale-105 p-6 border-l-4 border-green-500 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900">Users</h3>
                <span className="text-4xl">👥</span>
              </div>
              <p className="text-slate-600 text-sm">View and manage customer accounts and profiles</p>
              <div className="mt-4 flex items-center text-green-600 font-semibold text-sm hover:text-green-800">
                Go to Users →
              </div>
            </Link>

            {/* Orders Card */}
            <Link
              href="/admin/orders"
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all hover:scale-105 p-6 border-l-4 border-orange-500 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900">Orders</h3>
                <span className="text-4xl">📋</span>
              </div>
              <p className="text-slate-600 text-sm">Track, update and manage all marketplace orders</p>
              <div className="mt-4 flex items-center text-orange-600 font-semibold text-sm hover:text-orange-800">
                Go to Orders →
              </div>
            </Link>
          </div>
        </div>

        {/* Recently Added Products */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">Recently Added Products</h2>
            <Link href="/admin/products" className="text-sm font-semibold text-red-600 hover:text-red-700">
              Manage products
            </Link>
          </div>
          {statsLoading ? (
            <p className="py-4 text-sm text-slate-500" role="status">Loading recent products…</p>
          ) : recentProducts.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {recentProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{product.name}</span>
                  <time className="shrink-0 text-xs text-slate-500">
                    {product.createdAt && !Number.isNaN(Date.parse(product.createdAt))
                      ? new Date(product.createdAt).toLocaleDateString()
                      : "Date unavailable"}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-slate-500">
              {statsError ? "Recent products are unavailable." : "No products have been added yet."}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-slate-600 text-sm py-6">
          <p>Nancy Motorcycle Spares Admin Dashboard • Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </main>
  );
}

export default AdminDashboard;
