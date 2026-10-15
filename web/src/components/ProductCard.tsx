"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import WishlistButton from "@/components/WishlistButton";

interface Props {
  id: string;
  name: string;
  price: number;
  images?: string[];
  seller?: { shopName?: string };
  category?: string;
}

export default function ProductCard({ id, name, price, images = [], seller, category }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addItem({
      productId: id,
      name,
      price,
      quantity: 1,
      image: images[0]
    });
    setAdded(true);
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#171b19]/[0.07] bg-white transition duration-200 hover:-translate-y-1 hover:border-[#b7f34b] hover:shadow-xl hover:shadow-[#171b19]/[0.08]">
      <Link href={`/products/${id}`} className="block min-w-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#eef0eb]">
          <Image
            src={images[0] || "/placeholder-product.svg"}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>

        <div className="min-w-0 p-3 sm:p-4">
          {category && <div className="mb-2 inline-flex max-w-full truncate rounded-full bg-[#eff8df] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#527a15]">{category}</div>}
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#171b19] sm:text-base">{name}</h3>
          <p className="mt-2 truncate text-xs text-[#777e78]">{seller?.shopName || "Nancy Motorcycle Spares"}</p>
          <div className="mt-3 text-base font-extrabold text-[#171b19] sm:text-lg">
            KES {price.toLocaleString("en-KE")}
          </div>
        </div>
      </Link>

      <div className="mx-3 mb-3 mt-auto grid gap-2 sm:mx-4 sm:mb-4">
        <WishlistButton
          product={{
            id,
            name,
            price,
            images,
            category,
            seller: { shopName: seller?.shopName || "Nancy Motorcycle Spares" }
          }}
        />
        <button
          type="button"
          onClick={handleAddToCart}
          aria-live="polite"
          className="inline-flex items-center justify-center rounded-xl border border-[#171b19]/15 px-4 py-2.5 text-sm font-semibold text-[#171b19] transition hover:border-[#b7f34b] hover:bg-[#f6fbed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7f34b] focus-visible:ring-offset-2"
        >
          {added ? "Added to cart" : "Add to cart"}
        </button>
        <Link
          href={`/checkout?product=${id}`}
          className="inline-flex items-center justify-center rounded-xl bg-[#171b19] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#343a35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7f34b] focus-visible:ring-offset-2"
        >
          Buy now
        </Link>
      </div>
    </article>
  );
}
