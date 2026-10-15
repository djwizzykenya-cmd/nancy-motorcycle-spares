"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import BackendStatusBanner from "@/components/BackendStatusBanner";
import { useAuth } from "@/context/AuthContext";

export default function AdminHeader() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-6">
      <BackendStatusBanner />
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
          Back to store
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
