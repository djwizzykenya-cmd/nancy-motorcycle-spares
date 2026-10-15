"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import DeliveryMap, { type DeliveryLocation } from "@/components/DeliveryMap";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import apiClient from "@/lib/api";
import { products as localProducts } from "@/data/products";
import { useAuth } from "@/context/AuthContext";

interface QuickBuyProduct {
  id: string;
  name: string;
  price: number;
  images?: string[];
}

const isDeliveryLocation = (value: unknown): value is DeliveryLocation => {
  if (!value || typeof value !== "object") return false;
  const location = value as Partial<DeliveryLocation>;
  const address = location.address;
  return (
    typeof location.lat === "number" &&
    Number.isFinite(location.lat) &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    typeof location.lng === "number" &&
    Number.isFinite(location.lng) &&
    location.lng >= -180 &&
    location.lng <= 180 &&
    !!address &&
    typeof address.street === "string" &&
    typeof address.city === "string" &&
    typeof address.state === "string" &&
    typeof address.postalCode === "string" &&
    typeof address.country === "string" &&
    typeof address.label === "string"
  );
};

export default function CheckoutPage() {
  const { items, total, addItem, clear } = useCart();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams?.get("product") ?? null;

  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null);
  const [deliveryLookupLoading, setDeliveryLookupLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [mpesaAvailable, setMpesaAvailable] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quickBuyLoading, setQuickBuyLoading] = useState(Boolean(productId));
  const [quickBuyError, setQuickBuyError] = useState("");
  const [quickBuyRetry, setQuickBuyRetry] = useState(0);

  const processedQuickBuyIds = useRef(new Set<string>());

  useEffect(() => {
    setMpesaPhone(user?.phone ?? "");
  }, [user?.phone]);

  useEffect(() => {
    let active = true;
    apiClient.get("/payments/mpesa/status")
      .then((response) => {
        const available = response.data?.data?.available;
        if (active && typeof available === "boolean") {
          setMpesaAvailable(available);
        }
      })
      .catch((requestError: unknown) => {
        console.warn("Unable to check M-Pesa availability", requestError);
        if (active) setMpesaAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const savedLocation = localStorage.getItem("deliveryLocation");
      if (!savedLocation) return;

      const parsed: unknown = JSON.parse(savedLocation);
      if (isDeliveryLocation(parsed)) setDeliveryLocation(parsed);
      else console.warn("Ignoring invalid saved delivery location");
    } catch (storageError) {
      console.warn("Unable to read saved delivery location", storageError);
    }
  }, []);

  useEffect(() => {
    if (!productId || processedQuickBuyIds.current.has(productId)) {
      return;
    }

    processedQuickBuyIds.current.add(productId);
    setQuickBuyLoading(true);
    setQuickBuyError("");

    const addQuickBuyItem = (product: { id: string; name: string; price: number; images?: string[] }) => {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.images?.[0]
      });
    };

    const loadProduct = async () => {
      try {
        const res = await apiClient.get(`/products/${productId}`);
        const product: unknown = res.data?.data;
        if (
          typeof product === "object" &&
          product !== null &&
          "id" in product &&
          product.id === productId &&
          "name" in product &&
          typeof product.name === "string" &&
          "price" in product &&
          typeof product.price === "number" &&
          Number.isFinite(product.price) &&
          product.price >= 0
        ) {
          addQuickBuyItem(product as QuickBuyProduct);
          return;
        }
        throw new Error("The product response was invalid.");
      } catch (requestError) {
        console.error("Failed to load product for quick buy via API", requestError);
      }

      if (process.env.NODE_ENV !== "production") {
        const localProduct = localProducts.find((item) => item.id === productId);
        if (localProduct) {
          addQuickBuyItem(localProduct);
          return;
        }
      }

      setQuickBuyError("We couldn’t load this product. Return to the catalog and try again.");
    };

    void loadProduct().finally(() => {
      setQuickBuyLoading(false);
    });
  }, [productId, addItem, quickBuyRetry]);

  const handleSubmit = async () => {
    setError("");

    if (user?.userType !== "customer") {
      setError("Sign in to a customer account before placing your order. Your cart will be kept.");
      return;
    }

    if (paymentMethod === "mobile_money" && !mpesaAvailable) {
      setError("M-Pesa is not available right now. Choose cash on delivery instead.");
      return;
    }

    if (paymentMethod === "mobile_money" && !mpesaPhone.trim()) {
      setError("Enter the Kenyan mobile number that should receive the M-Pesa prompt.");
      return;
    }

    if (!deliveryLocation) {
      setError("Choose your delivery location on the map before continuing.");
      return;
    }

    if (deliveryLookupLoading) {
      setError("Please wait while we find the delivery address for your map pin.");
      return;
    }

    setLoading(true);
    const orderPayload = {
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity, price: item.price })),
      shippingAddress: {
        street: deliveryLocation.address.street,
        city: deliveryLocation.address.city,
        state: deliveryLocation.address.state,
        postalCode: deliveryLocation.address.postalCode,
        country: deliveryLocation.address.country,
        latitude: deliveryLocation.lat,
        longitude: deliveryLocation.lng
      },
      paymentMethod
    };

    try {
      const response = await apiClient.post("/orders", {
        ...orderPayload
      });

      const orderId = response.data.data?.orderId;
      if (response.data.data?.fallback === true) {
        throw new Error("Order service is temporarily unavailable. Your order was not saved; please try again.");
      }
      if (typeof orderId !== "string" || !orderId) {
        throw new Error("The server returned an invalid order confirmation. Please contact support before retrying.");
      }

      if (paymentMethod === "mobile_money") {
        const paymentResponse = await apiClient.post("/payments/mpesa/stk-push", {
          orderId,
          phone: mpesaPhone
        });
        if (paymentResponse.data?.data?.orderId !== orderId) {
          throw new Error("The M-Pesa response did not match this order. Check your order history before retrying.");
        }
      }

      localStorage.setItem("currentOrderId", orderId);
      clear();
      router.push(`/order-success?orderId=${encodeURIComponent(orderId)}`);
    } catch (requestError) {
      console.error("Order creation failed", requestError);
      if (axios.isAxiosError(requestError)) {
        const serverMessage = requestError.response?.data?.error;
        setError(
          typeof serverMessage === "string"
            ? serverMessage
            : requestError.response
              ? "We couldn’t place your order. Check your details and try again."
              : "We couldn’t reach the order service. Your cart is still saved; please try again."
        );
      } else {
        setError(requestError instanceof Error ? requestError.message : "We couldn’t place your order. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && (quickBuyLoading || quickBuyError || !productId)) {
    return (
      <main className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-lg">
          <h1 className="text-3xl font-bold text-slate-900">
            {quickBuyLoading ? "Loading your selected product…" : quickBuyError ? "Couldn’t load this product" : "Your cart is empty"}
          </h1>
          <p className="mt-4 text-slate-600">
            {quickBuyLoading
              ? "Please wait while we prepare checkout."
              : quickBuyError || "Add items from the catalog or use Buy now from any product card."}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {quickBuyError && (
              <button
                type="button"
                onClick={() => {
                  if (productId) {
                    processedQuickBuyIds.current.delete(productId);
                    setQuickBuyLoading(true);
                    setQuickBuyRetry((retry) => retry + 1);
                  }
                }}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600"
              >
                Try again
              </button>
            )}
            <Link href="/products" className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700">
              Browse products
            </Link>
            <Link href="/" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-5 shadow-lg sm:p-8 lg:p-10">
        <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Delivery and payment</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Checkout</h1>
          </div>
          <Link href="/products" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600">
            ← Back to products
          </Link>
        </div>
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:gap-8">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 p-4 sm:p-5" aria-label="Delivery location">
              <DeliveryMap
                initial={deliveryLocation}
                onLocationChange={setDeliveryLocation}
                onLocationLookupChange={setDeliveryLookupLoading}
              />
            </section>

            <section className="rounded-3xl border border-slate-200 p-5 sm:p-6" aria-labelledby="payment-method-heading">
              <h2 id="payment-method-heading" className="mb-4 text-xl font-semibold text-slate-900">Payment method</h2>
              <div className="space-y-3">
                {[
                  { value: "cash_on_delivery", label: "Cash on delivery", available: true },
                  { value: "mobile_money", label: "M-Pesa", available: mpesaAvailable }
                ].map((method) => (
                  <label
                    key={method.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                      paymentMethod === method.value
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={() => method.available && setPaymentMethod(method.value)}
                      disabled={!method.available}
                      className="h-4 w-4 accent-red-600"
                    />
                    <span className={`font-medium ${method.available ? "text-slate-900" : "text-slate-500"}`}>
                      {method.label}{!method.available && " (not available yet)"}
                    </span>
                  </label>
                ))}
              </div>
              {paymentMethod === "mobile_money" && mpesaAvailable && (
                <label className="mt-4 block text-sm font-medium text-slate-700">
                  M-Pesa phone number
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={mpesaPhone}
                    onChange={(event) => setMpesaPhone(event.target.value)}
                    placeholder="0712 345 678"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Enter a Kenyan Safaricom number that can receive an M-Pesa prompt.
                  </span>
                </label>
              )}
            </section>

            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div> : null}
            {user?.userType !== "customer" && (
              <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                Sign in or create a customer account to place your order. Your cart will stay saved on this device.{" "}
                <Link href="/auth" className="font-semibold underline underline-offset-2">Sign in or register</Link>
              </p>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6" aria-labelledby="order-summary-heading">
              <h2 id="order-summary-heading" className="mb-4 text-xl font-semibold text-slate-900">Order summary</h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="shrink-0 font-bold text-red-600">KES {(item.price * item.quantity).toLocaleString("en-KE")}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold text-slate-900">KES {total.toLocaleString("en-KE")}</span>
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || deliveryLookupLoading || !deliveryLocation || user?.userType !== "customer"}
              className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading
                ? paymentMethod === "mobile_money" ? "Requesting M-Pesa payment…" : "Placing order…"
                : deliveryLookupLoading
                  ? "Finding delivery address…"
                  : user?.userType !== "customer"
                    ? "Sign in to place order"
                    : deliveryLocation
                    ? paymentMethod === "mobile_money"
                      ? "Place order and request M-Pesa payment"
                      : "Place cash-on-delivery order"
                    : "Select delivery location to continue"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
