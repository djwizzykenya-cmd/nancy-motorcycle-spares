"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";

export interface WishlistProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  category?: { id?: string; name: string; slug?: string } | string;
  seller?: { shopName?: string };
}

interface WishlistContextType {
  products: WishlistProduct[];
  isLoading: boolean;
  error: string;
  refresh: () => void;
  hasProduct: (productId: string) => boolean;
  addProduct: (product: WishlistProduct) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const isWishlistProduct = (value: unknown): value is WishlistProduct =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string";

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isReady } = useAuth();
  const customerId = user?.userType === "customer" ? user.id : null;
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(customerId));
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    if (!isReady) return;
    if (!customerId) {
      setProducts([]);
      setError("");
      setIsLoading(false);
      return;
    }

    let active = true;
    setProducts([]);
    setIsLoading(true);
    setError("");
    apiClient.get("/wishlist")
      .then((response) => {
        const data: unknown = response.data?.data;
        if (!Array.isArray(data) || !data.every(isWishlistProduct)) {
          throw new Error("The wishlist response was invalid.");
        }
        if (active) setProducts(data);
      })
      .catch((requestError: unknown) => {
        console.error("Failed to load customer wishlist", requestError);
        if (active) {
          setProducts([]);
          setError("We couldn’t load your wishlist. Please try again.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customerId, isReady, reloadVersion]);

  const hasProduct = useCallback(
    (productId: string) => products.some((product) => product.id === productId),
    [products]
  );

  const addProduct = useCallback(async (product: WishlistProduct) => {
    if (!customerId) throw new Error("Sign in with a customer account to save products.");
    await apiClient.post("/wishlist", { productId: product.id });
    setProducts((current) => current.some((item) => item.id === product.id) ? current : [product, ...current]);
    setError("");
  }, [customerId]);

  const removeProduct = useCallback(async (productId: string) => {
    if (!customerId) throw new Error("Sign in with a customer account to manage your wishlist.");
    await apiClient.delete(`/wishlist/${encodeURIComponent(productId)}`);
    setProducts((current) => current.filter((product) => product.id !== productId));
    setError("");
  }, [customerId]);

  const value = useMemo(() => ({
    products,
    isLoading,
    error,
    refresh: () => setReloadVersion((version) => version + 1),
    hasProduct,
    addProduct,
    removeProduct
  }), [products, isLoading, error, hasProduct, addProduct, removeProduct]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
};
