"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import Link from "next/link";
import OrderDeliveryMap from "@/components/OrderDeliveryMap";

type OrderStatus = "pending" | "processing" | "confirmed" | "shipped" | "delivered" | "cancelled";

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  items: number;
  total: number;
  status: OrderStatus;
  trackingNumber?: string | null;
  createdAt?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

const statuses: OrderStatus[] = [
  "pending",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled"
];

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

function AdminOrdersContent() {
  const { user, isReady } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | OrderStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [trackingNumbers, setTrackingNumbers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isReady) return;

    if (!user || user.userType !== "admin") {
      router.replace("/");
      return;
    }

    const loadOrders = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const response = await apiClient.get("/orders");
        const loadedOrders = response.data.data || [];
        setOrders(loadedOrders);
        setTrackingNumbers(Object.fromEntries(
          loadedOrders.map((order: Order) => [order.id, order.trackingNumber || ""])
        ));
      } catch (error) {
        console.error("Could not load admin orders:", error);
        setOrders([]);
        setLoadError("Could not load orders. Check the API connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, [isReady, user, router, reloadCount]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = filterStatus === "all" || order.status === filterStatus;
      const matchesSearch =
        !normalizedSearch ||
        [order.orderNumber, order.customer, order.email].some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        );
      return matchesStatus && matchesSearch;
    });
  }, [filterStatus, orders, searchTerm]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, trackingNumber?: string) => {
    setUpdatingOrderId(orderId);
    setUpdateError("");
    try {
      const response = await apiClient.patch(`/orders/${encodeURIComponent(orderId)}/status`, {
        status: newStatus,
        ...(trackingNumber !== undefined ? { trackingNumber } : {})
      });
      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order.id === orderId
            ? { ...order, status: newStatus, trackingNumber: response.data?.data?.trackingNumber ?? order.trackingNumber }
            : order
        )
      );
      if (trackingNumber !== undefined) {
        setTrackingNumbers((previous) => ({
          ...previous,
          [orderId]: response.data?.data?.trackingNumber || ""
        }));
      }
    } catch (error) {
      console.error("Could not update order status:", error);
      setUpdateError("Could not save the order status. Please try again.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (!isReady || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-20">
        <div className="rounded-3xl bg-white p-10 text-center shadow-lg">
          <p className="text-lg font-semibold text-slate-900">Checking admin access...</p>
        </div>
      </main>
    );
  }

  const totalRevenue = orders.reduce(
    (sum, order) => sum + (order.status !== "cancelled" ? order.total : 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <section className="rounded-3xl bg-white p-8 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-orange-600">Admin Orders</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Order Management</h1>
              <p className="mt-2 text-sm text-slate-500">
                Track marketplace orders and save status updates.
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-full bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-slate-200"
            >
              Back to Admin
            </Link>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="w-full lg:max-w-md">
              <span className="sr-only">Search orders</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by order, customer, or email"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <button
              type="button"
              onClick={() => setReloadCount((count) => count + 1)}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh orders"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter orders by status">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              aria-pressed={filterStatus === "all"}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filterStatus === "all"
                  ? "bg-orange-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Orders <span className="ml-1 opacity-75">{orders.length}</span>
            </button>
            {statuses.map((status) => {
              const count = orders.filter((order) => order.status === status).length;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  aria-pressed={filterStatus === status}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filterStatus === status
                      ? "bg-orange-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {statusLabels[status]} <span className="ml-1 opacity-75">{count}</span>
                </button>
              );
            })}
          </div>

          {loadError && (
            <div
              role="alert"
              className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => setReloadCount((count) => count + 1)}
                className="font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {updateError && (
            <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              {updateError}
            </p>
          )}

          <div className="mt-6">
            {loading ? (
              <div className="py-12 text-center text-slate-500" role="status">
                Loading orders...
              </div>
            ) : loadError ? null : filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
                <p className="font-semibold text-slate-800">
                  {orders.length === 0 ? "No orders yet" : "No matching orders"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {orders.length === 0
                    ? "Orders placed by customers will appear here."
                    : "Try another search or status filter."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-2xl border border-slate-200 p-4 transition hover:border-orange-300 hover:bg-orange-50/40 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="break-all text-lg font-bold text-slate-900">
                            {order.orderNumber}
                          </h2>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {statusLabels[order.status] || order.status}
                          </span>
                        </div>
                        <p className="mt-2 break-words text-sm text-slate-600">
                          {order.customer} <span aria-hidden="true">·</span> {order.email}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                          <span>{order.items} {order.items === 1 ? "item" : "items"}</span>
                          <span>KES {(order.total ?? 0).toLocaleString("en-KE")}</span>
                          <span>
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString("en-KE")
                              : "Date unavailable"}
                          </span>
                        </div>
                      </div>
                      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 sm:items-end">
                        Update status
                        <select
                          value={order.status}
                          disabled={updatingOrderId === order.id}
                          onChange={(event) =>
                            void handleUpdateStatus(order.id, event.target.value as OrderStatus)
                          }
                          aria-label={`Update status for order ${order.orderNumber}`}
                          className="min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                        {updatingOrderId === order.id && (
                          <span role="status" className="font-normal">
                            Saving...
                          </span>
                        )}
                      </label>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-end">
                      <label className="flex-1 text-xs font-semibold text-slate-500">
                        Delivery tracking reference
                        <input
                          type="text"
                          value={trackingNumbers[order.id] ?? order.trackingNumber ?? ""}
                          onChange={(event) => setTrackingNumbers((previous) => ({
                            ...previous,
                            [order.id]: event.target.value
                          }))}
                          maxLength={100}
                          placeholder="Add a courier reference (optional)"
                          aria-label={`Delivery tracking reference for order ${order.orderNumber}`}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void handleUpdateStatus(order.id, order.status, trackingNumbers[order.id] ?? order.trackingNumber ?? "")}
                        disabled={updatingOrderId === order.id}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Save tracking reference
                      </button>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Delivery destination</h3>
                      {order.shippingAddress ? (
                        <>
                          <p className="mt-2 text-sm text-slate-700">
                            {`${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`}
                          </p>
                          <OrderDeliveryMap
                            latitude={order.shippingAddress.latitude}
                            longitude={order.shippingAddress.longitude}
                            label={`${order.shippingAddress.street}, ${order.shippingAddress.city}`}
                            allowRoutePlanning
                          />
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">No delivery address is saved for this order.</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                KES {totalRevenue.toLocaleString("en-KE")}
              </p>
              <p className="mt-1 text-sm text-slate-500">Total revenue (excluding cancelled)</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
              <p className="mt-1 text-sm text-slate-500">Total orders</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {orders.filter((order) => order.status === "delivered").length}
              </p>
              <p className="mt-1 text-sm text-slate-500">Delivered</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminOrdersPage() {
  return <AdminOrdersContent />;
}
