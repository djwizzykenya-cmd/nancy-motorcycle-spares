"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWishlist, type WishlistProduct } from "@/context/WishlistContext";

export default function WishlistButton({ product }: { product: WishlistProduct }) {
  const router = useRouter();
  const { user } = useAuth();
  const { hasProduct, addProduct, removeProduct } = useWishlist();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const saved = hasProduct(product.id);

  const toggle = async () => {
    if (user?.userType !== "customer") {
      if (!user) {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        router.push(`/auth?redirect=${encodeURIComponent(returnTo)}`);
      }
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (saved) await removeProduct(product.id);
      else await addProduct(product);
    } catch (requestError) {
      console.error("Failed to update wishlist", requestError);
      setError(requestError instanceof Error ? requestError.message : "Could not update your wishlist.");
    } finally {
      setSaving(false);
    }
  };

  if (user && user.userType !== "customer") return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={saving}
        aria-pressed={saved}
        aria-label={user ? `${saved ? "Remove" : "Add"} ${product.name} ${saved ? "from" : "to"} wishlist` : `Sign in to save ${product.name}`}
        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#171b19]/10 bg-white px-3 py-2 text-sm font-semibold text-[#454c46] transition hover:border-[#b7f34b] hover:bg-[#f6fbed] hover:text-[#171b19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7f34b] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        <span aria-hidden="true" className="mr-1.5 text-base">{saved ? "♥" : "♡"}</span>
        {saved ? "Saved" : user ? "Save" : "Sign in to save"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}
