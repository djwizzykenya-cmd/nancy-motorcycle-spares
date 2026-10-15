"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("orderId");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-20">
      <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-lg sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Payment instructions</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Start M-Pesa payment from checkout</h1>
        <p className="mt-4 text-slate-600">
          M-Pesa prompts are sent from checkout after you choose M-Pesa and enter the phone number to charge. Cash on delivery is also available.
        </p>
        {orderId && (
          <p className="mt-4 break-all text-sm text-slate-500">
            Pending order reference: <span className="font-semibold">{orderId}</span>
          </p>
        )}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/checkout"
            className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Return to checkout
          </Link>
          <Link
            href="/products"
            className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600"
          >
            Browse products
          </Link>
        </div>
      </section>
    </main>
  );
}
