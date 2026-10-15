import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="min-h-screen bg-slate-50 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-xl text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-red-600">Product not found</p>
        <h1 className="mt-6 text-4xl font-bold text-slate-900">We couldn’t find that part.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          The product you are looking for may have been removed or the link is invalid.
          Try browsing our catalog to find a similar spare part.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/products"
            className="rounded-3xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Back to products
          </Link>
          <Link
            href="/"
            className="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
