"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type AuthUser } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import { useCart } from "@/context/CartContext";
import OrderDeliveryMap from "@/components/OrderDeliveryMap";

const accountTypeLabels: Record<AuthUser["userType"], string> = {
  admin: "Administrator",
  seller: "Unavailable account",
  customer: "Customer"
};

type TrackedOrderStatus = "pending" | "processing" | "confirmed" | "shipped" | "delivered" | "cancelled";

interface CustomerOrder {
  id: string;
  status: TrackedOrderStatus;
  paymentStatus: string;
  paymentMethod: string | null;
  trackingNumber: string | null;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{ id: string; name: string; quantity: number; price: number; subtotal: number }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

const orderProgress: Array<{ status: TrackedOrderStatus; label: string }> = [
  { status: "pending", label: "Order placed" },
  { status: "processing", label: "Preparing order" },
  { status: "confirmed", label: "Order confirmed" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" }
];

const statusRank: Record<TrackedOrderStatus, number> = {
  pending: 0,
  processing: 1,
  confirmed: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1
};

export default function AccountPage() {
  const router = useRouter();
  const { user, isReady, logout } = useAuth();
  const { items: cartItems, isReady: cartReady, syncStatus, retrySync } = useCart();
  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [ordersReload, setOrdersReload] = useState(0);
  const [ordersLastChecked, setOrdersLastChecked] = useState<Date | null>(null);
  const orderRequestSequence = useRef(0);
  const activeOrderRequest = useRef<{ customerId: string; requestId: number } | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/auth/me");
      const currentUser = response.data?.data as AuthUser | undefined;
      if (!currentUser?.id || !currentUser.email) {
        throw new Error("The account profile response was incomplete.");
      }
      setProfile(currentUser);
      localStorage.setItem("user", JSON.stringify(currentUser));
    } catch (requestError) {
      console.error("Failed to load account profile", requestError);
      setError("We couldn’t load your account details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async (silent = false) => {
    const customerId = user?.userType === "customer" ? user.id : null;
    if (!customerId) return;
    if (activeOrderRequest.current?.customerId === customerId) return;

    const requestId = ++orderRequestSequence.current;
    activeOrderRequest.current = { customerId, requestId };
    if (!silent) setOrdersLoading(true);
    setOrdersError("");
    try {
      const response = await apiClient.get("/orders/mine");
      const data: unknown = response.data?.data;
      if (!Array.isArray(data)) {
        throw new Error("The order history response was invalid.");
      }
      if (orderRequestSequence.current !== requestId) return;
      setOrders(data as CustomerOrder[]);
      setOrdersLastChecked(new Date());
    } catch (requestError) {
      if (orderRequestSequence.current !== requestId) return;
      console.error("Failed to load customer order history", requestError);
      if (!silent) setOrders([]);
      setOrdersError("We couldn’t load your orders. Please try again.");
    } finally {
      if (activeOrderRequest.current?.requestId === requestId) {
        activeOrderRequest.current = null;
        if (!silent) setOrdersLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    void loadProfile();
  }, [isReady, user, router, loadProfile]);

  useEffect(() => {
    if (!isReady || user?.userType !== "customer") return;
    void loadOrders();
  }, [isReady, user, loadOrders, ordersReload]);

  useEffect(() => {
    if (!isReady || user?.userType !== "customer") return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadOrders(true);
    };
    const intervalId = window.setInterval(refreshWhenVisible, 60_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [isReady, user, loadOrders]);

  const signOut = () => {
    logout();
    router.replace("/");
  };

  if (!isReady || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4">
        <p className="text-sm font-medium text-slate-600">Loading your account…</p>
      </main>
    );
  }

  const displayUser = profile || user;
  const fullName = [displayUser.firstName, displayUser.lastName].filter(Boolean).join(" ") || "Nancy Motorcycle Spares member";
  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-10 text-slate-900 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-red-600">
          <span aria-hidden="true">←</span> Back to store
        </Link>

        <header className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Your Nancy Motorcycle Spares account</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">My profile</h1>
            <p className="mt-2 text-sm text-slate-600">View your account and contact details.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {displayUser.userType === "customer" && (
              <Link
                href="/wishlist"
                className="inline-flex w-fit items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
              >
                My wishlist
              </Link>
            )}
            <button
              type="button"
              onClick={signOut}
              className="inline-flex w-fit items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-6 sm:px-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-lg font-extrabold text-red-700" aria-hidden="true">
              {fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900">{fullName}</h2>
              <p className="mt-0.5 truncate text-sm text-slate-600">{displayUser.email}</p>
            </div>
            <span className="ml-auto hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 sm:inline-flex">
              {accountTypeLabels[displayUser.userType]}
            </span>
          </div>

          {error && (
            <div className="mx-6 mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:mx-8">
              <p>{error}</p>
              <button type="button" onClick={() => void loadProfile()} className="mt-2 font-semibold underline underline-offset-2">
                Try again
              </button>
            </div>
          )}

          <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
            <ProfileField label="First name" value={profile?.firstName || user.firstName} loading={loading && !profile} />
            <ProfileField label="Last name" value={profile?.lastName || user.lastName} loading={loading && !profile} />
            <ProfileField label="Email address" value={profile?.email || user.email} loading={loading && !profile} />
            <ProfileField label="Phone number" value={profile?.phone || user.phone || "Not added"} loading={loading && !profile} />
            <ProfileField label="Account type" value={accountTypeLabels[displayUser.userType]} loading={false} />
            <ProfileField
              label="Member since"
              value={displayUser.createdAt ? new Date(displayUser.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—"}
              loading={loading && !profile}
            />
          </div>

        </section>

        {displayUser.userType === "customer" && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7" aria-labelledby="order-history-heading">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Your purchases</p>
                <h2 id="order-history-heading" className="mt-2 text-xl font-bold text-slate-900">Order history & tracking</h2>
                <p className="mt-1 text-sm text-slate-600">View your order status, delivery details, and tracking reference.</p>
                {ordersLastChecked && (
                  <p className="mt-1 text-xs text-slate-500" aria-live="polite">
                    Status last checked at {ordersLastChecked.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void loadOrders()}
                disabled={ordersLoading}
                className="w-fit rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700 disabled:opacity-60"
              >
                {ordersLoading ? "Refreshing…" : "Refresh orders"}
              </button>
            </div>

            {ordersError && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
                <p>{ordersError}</p>
                <button type="button" onClick={() => setOrdersReload((value) => value + 1)} className="mt-2 font-semibold underline underline-offset-2">
                  Try again
                </button>
              </div>
            )}
            {ordersLoading && orders.length === 0 ? (
              <p className="mt-5 text-sm text-slate-500" role="status">Loading your orders…</p>
            ) : !ordersError && orders.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center">
                <p className="font-semibold text-slate-800">No orders yet</p>
                <p className="mt-1 text-sm text-slate-500">Orders you place will appear here with their delivery progress.</p>
                <Link href="/products" className="mt-4 inline-flex rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                  Browse products
                </Link>
              </div>
            ) : orders.length > 0 ? (
              <div className="mt-5 space-y-4">
                {orders.map((order) => (
                  <CustomerOrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : null}
          </section>
        )}

        {displayUser.userType === "customer" && (
          <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Your shopping cart</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                {!cartReady
                  ? "Loading your cart…"
                  : `${cartItemCount} ${cartItemCount === 1 ? "item" : "items"} ${
                      syncStatus === "error" ? "on this device" : "in cart"
                    }`}
              </h2>
              <p className="mt-1 text-sm text-slate-600" role={syncStatus === "error" ? "alert" : undefined}>
                {syncStatus === "error"
                  ? "Your cart could not sync to your account. Retry to load and save your account cart."
                  : syncStatus === "saving"
                    ? "Saving your cart to this account…"
                    : syncStatus === "saved"
                      ? "Your cart is saved to this account and syncs when you sign in on another device."
                      : "Loading your saved account cart…"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              {syncStatus === "error" && (
                <button
                  type="button"
                  onClick={retrySync}
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                >
                  Retry sync
                </button>
              )}
              <Link href="/cart" className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2">
                View cart
              </Link>
            </div>
          </section>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/products" className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2">
            Browse motorcycle parts
          </Link>
        </div>
      </div>
    </main>
  );
}

function CustomerOrderCard({ order }: { order: CustomerOrder }) {
  const currentRank = statusRank[order.status] ?? 0;
  const cancelled = order.status === "cancelled";

  return (
    <article className="rounded-2xl border border-slate-200 p-4 sm:p-5" aria-label={`Order ${order.id}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="break-all font-bold text-slate-900">Order {order.id}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Placed {new Date(order.createdAt).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-bold text-slate-900">KES {order.total.toLocaleString("en-KE")}</p>
          <p className={`mt-1 text-sm font-semibold capitalize ${cancelled ? "text-red-700" : "text-emerald-700"}`}>
            {order.status === "processing" ? "Preparing order" : order.status}
          </p>
        </div>
      </div>

      {cancelled ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">This order was cancelled. Contact us if you need help.</p>
      ) : (
        <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label={`Tracking progress for order ${order.id}`}>
          {orderProgress.map((step, index) => {
            const completed = statusRank[step.status] <= currentRank;
            return (
              <li key={step.status} className={`border-l-2 pl-3 text-xs sm:border-l-0 sm:border-t-2 sm:pl-0 sm:pt-3 ${completed ? "border-emerald-500 text-emerald-800" : "border-slate-200 text-slate-400"}`}>
                <span className={`mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${completed ? "bg-emerald-100" : "bg-slate-100"}`} aria-hidden="true">
                  {completed ? "✓" : index + 1}
                </span>
                {step.label}
              </li>
            );
          })}
        </ol>
      )}

      {order.trackingNumber && (
        <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Tracking reference: <span className="font-bold">{order.trackingNumber}</span>
        </p>
      )}

      <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Items</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {order.items.map((item) => (
              <li key={item.id}>{item.name} × {item.quantity} <span className="text-slate-500">— KES {item.subtotal.toLocaleString("en-KE")}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Delivering to</h4>
          {order.shippingAddress ? (
            <>
              <p className="mt-2 text-sm text-slate-700">
                {`${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`}
              </p>
              <OrderDeliveryMap
                latitude={order.shippingAddress.latitude}
                longitude={order.shippingAddress.longitude}
                label={`${order.shippingAddress.street}, ${order.shippingAddress.city}`}
              />
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-700">Delivery address unavailable</p>
          )}
          <p className="mt-1 text-xs capitalize text-slate-500">
            {order.paymentMethod?.replace(/_/g, " ") || "Payment method unavailable"} · payment {order.paymentStatus}
          </p>
        </div>
      </div>
    </article>
  );
}

function ProfileField({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="bg-white px-6 py-5 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 min-h-5 break-words text-sm font-semibold text-slate-900">
        {loading ? <span className="inline-block h-4 w-28 animate-pulse rounded bg-slate-200" aria-label="Loading" /> : value}
      </p>
    </div>
  );
}
