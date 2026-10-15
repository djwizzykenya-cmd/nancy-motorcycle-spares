"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const formatPrice = (price: number) =>
  `KES ${price.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;

export default function CartPage() {
  const { items, total, updateQuantity, removeItem, clear, isReady, syncStatus, retrySync } = useCart();
  const { user } = useAuth();
  const [confirmClear, setConfirmClear] = useState(false);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  if (!isReady) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-4 py-16">
        <div className="mx-auto max-w-5xl animate-pulse rounded-3xl bg-white p-8 shadow-sm">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="mt-8 h-28 rounded-2xl bg-slate-100" />
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-4 py-16">
        <section className="mx-auto max-w-2xl rounded-3xl bg-white px-6 py-14 text-center shadow-sm sm:px-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-8 w-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h2l2.2 11.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 8H6" />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">Your cart is empty</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
            Browse motorcycle parts and accessories, then come back here to review your items.
          </p>
          {user?.userType === "customer" && (
            <CartSyncNotice status={syncStatus} onRetry={retrySync} />
          )}
          <Link
            href="/products"
            className="mt-7 inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            Browse products
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Your selection</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Shopping cart</h1>
            <p className="mt-2 text-sm text-slate-600">
              {itemCount} {itemCount === 1 ? "item" : "items"} ready for checkout
            </p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-slate-700 transition hover:text-red-600">
            ← Continue shopping
          </Link>
        </div>

        {user?.userType === "customer" && (
          <CartSyncNotice status={syncStatus} onRetry={retrySync} />
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-label="Cart items" className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <p className="text-sm font-semibold text-slate-700">
                {items.length} {items.length === 1 ? "product" : "products"}
              </p>
              {confirmClear ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-600">Remove everything?</span>
                  <button
                    type="button"
                    onClick={() => {
                      clear();
                      setConfirmClear(false);
                    }}
                    className="font-semibold text-red-600 hover:text-red-700"
                  >
                    Yes, clear cart
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-sm font-semibold text-slate-500 transition hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                >
                  Clear cart
                </button>
              )}
            </div>
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.productId} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        unoptimized
                        sizes="96px"
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl" role="img" aria-label="No product image">
                        🏍️
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-slate-900">
                      <Link href={`/products/${encodeURIComponent(item.productId)}`} className="rounded-sm hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
                        {item.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{formatPrice(item.price)} each</p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="mt-3 text-sm font-semibold text-red-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:flex-col sm:items-end">
                    <div className="inline-flex items-center rounded-full border border-slate-200">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-l-full text-lg font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                      >
                        −
                      </button>
                      <span aria-live="polite" className="min-w-9 text-center text-sm font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-r-full text-lg font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-600"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-bold tabular-nums text-slate-900">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="rounded-3xl bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-bold text-slate-900">Order summary</h2>
            <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
              <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
              <span className="font-semibold tabular-nums text-slate-900">{formatPrice(total)}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Delivery and payment details are selected at checkout.
            </p>
            <div className="my-5 border-t border-slate-100" />
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-xl font-extrabold tabular-nums text-slate-900">{formatPrice(total)}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              Continue to checkout
            </Link>
            <p className="mt-4 text-center text-xs text-slate-500">Secure checkout · Prices shown in KES</p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function CartSyncNotice({
  status,
  onRetry
}: {
  status: "guest" | "loading" | "saving" | "saved" | "error";
  onRetry: () => void;
}) {
  if (status === "guest") {
    return (
      <p className="mx-auto mt-5 max-w-md rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Sign in to save your cart to your account and access it on other devices.{" "}
        <Link href="/auth" className="font-semibold text-red-700 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    );
  }

  if (status === "loading") {
    return <p role="status" className="mb-5 text-sm text-slate-500">Loading your saved cart…</p>;
  }

  if (status === "saving") {
    return <p role="status" className="mb-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">Saving your cart to your account…</p>;
  }

  if (status === "saved") {
    return <p className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved to your account · available when you sign in on another device.</p>;
  }

  return (
    <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p>Your cart could not sync to your account. Your current cart is still available on this device.</p>
      <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
        Try again
      </button>
    </div>
  );
}
