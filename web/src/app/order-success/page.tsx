"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";

interface ConfirmedOrder {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
}

export default function OrderSuccess() {
  const orderId = useSearchParams()?.get("orderId");
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setOrder(null);
      return;
    }

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    setLoading(true);
    setError("");
    const refreshOrder = () => {
      apiClient.get(`/orders/mine/${encodeURIComponent(orderId)}`)
        .then((response) => {
        const confirmedOrder = response.data?.data as ConfirmedOrder | undefined;
        if (!confirmedOrder?.id || confirmedOrder.id !== orderId) {
          throw new Error("The order response did not match this reference.");
        }
        if (active) {
          setOrder(confirmedOrder);
          setLoading(false);
          if (
            confirmedOrder.paymentMethod === "mobile_money" &&
            confirmedOrder.paymentStatus === "pending" &&
            attempts < 120
          ) {
            attempts += 1;
            retryTimer = setTimeout(refreshOrder, 5000);
          }
        }
        })
        .catch((requestError: unknown) => {
          console.error("Failed to verify order confirmation", requestError);
          if (active) {
            setOrder(null);
            setError("We couldn’t verify this order. Check your order history or try again.");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    refreshOrder();

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [orderId, retryCount]);

  return (
    <main className="min-h-screen bg-slate-50 py-20">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900">
          {loading
            ? "Checking your order…"
            : order?.paymentMethod === "mobile_money" && order.paymentStatus === "completed"
              ? "M-Pesa payment received"
              : order?.paymentMethod === "mobile_money" && order.paymentStatus === "failed"
                ? "M-Pesa payment failed"
                : order
                  ? "Order request received"
                  : "No order confirmation"}
        </h1>
        <p className="mt-4 text-slate-600" role={error ? "alert" : undefined}>
          {loading
            ? "We’re verifying that your order was saved."
            : order
              ? order.paymentMethod === "mobile_money"
                ? order.paymentStatus === "completed"
                  ? "Your M-Pesa payment was received and your order is confirmed."
                  : order.paymentStatus === "failed"
                    ? "The M-Pesa payment was not completed. Your order was cancelled; return to checkout to try again."
                    : "Approve the M-Pesa prompt on your phone. This page will update when Safaricom confirms the payment."
                : "Your cash-on-delivery order has been submitted. Payment is due when your order is delivered."
              : error || "We don’t have a confirmed order for this page. Return to the store to continue shopping."}
        </p>
        {order && (
          <>
            <p className="mt-3 break-all text-sm text-slate-500">
              Order reference: <span className="font-semibold">{order.id}</span>
            </p>
            <p className="mt-2 font-bold text-slate-900">KES {order.total.toLocaleString("en-KE")}</p>
          </>
        )}
        {error && (
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-5 rounded-full border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:border-red-500 hover:text-red-600"
          >
            Try again
          </button>
        )}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {order && (
            <Link href="/account" className="rounded-full bg-red-600 px-5 py-3 text-white">
              Track this order
            </Link>
          )}
          <Link href="/" className="rounded-full border border-slate-200 px-5 py-3 text-slate-700">
            Back to shop
          </Link>
        </div>
      </div>
    </main>
  );
}
