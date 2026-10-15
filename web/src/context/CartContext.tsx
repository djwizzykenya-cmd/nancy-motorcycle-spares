"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  total: number;
  isReady: boolean;
  syncStatus: "guest" | "loading" | "saving" | "saved" | "error";
  retrySync: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const GUEST_CART_STORAGE_KEY = "nancy-motorcycle-spares-cart";
const accountCartStorageKey = (userId: string) => `${GUEST_CART_STORAGE_KEY}:${userId}`;

const isCartItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    (item.image === undefined || typeof item.image === "string")
  );
};

const readStoredCart = (key: string): CartItem[] => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch (error) {
    console.warn("Failed to load stored cart", error);
    return [];
  }
};

const mergeCartItems = (...cartLists: CartItem[][]): CartItem[] => {
  const merged = new Map<string, CartItem>();
  for (const items of cartLists) {
    for (const item of items) {
      const existing = merged.get(item.productId);
      merged.set(item.productId, {
        ...existing,
        ...item,
        quantity: Math.min(99, (existing?.quantity || 0) + item.quantity)
      });
    }
  }
  return Array.from(merged.values());
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isReady: authReady } = useAuth();
  const accountId = user?.userType === "customer" ? user.id : null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CartContextType["syncStatus"]>("loading");
  const [loadedAccountId, setLoadedAccountId] = useState<string | null | undefined>(undefined);
  const [retryVersion, setRetryVersion] = useState(0);
  const accountIdRef = useRef(accountId);
  const itemsRef = useRef(items);
  const syncStatusRef = useRef(syncStatus);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  accountIdRef.current = accountId;
  itemsRef.current = items;
  syncStatusRef.current = syncStatus;

  useEffect(() => {
    if (!authReady) return;

    let active = true;
    setIsReady(false);
    setLoadedAccountId(undefined);

    if (!accountId) {
      setItems(readStoredCart(GUEST_CART_STORAGE_KEY));
      setLoadedAccountId(null);
      setSyncStatus("guest");
      setIsReady(true);
      return () => {
        active = false;
      };
    }

    const cachedAccountCart = readStoredCart(accountCartStorageKey(accountId));
    const guestCart = readStoredCart(GUEST_CART_STORAGE_KEY);
    setSyncStatus("loading");

    const loadAccountCart = async () => {
      try {
        if (!token) throw new Error("No active customer token is available.");
        const response = await apiClient.get("/cart", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const savedItems: unknown = response.data?.data;
        if (!Array.isArray(savedItems) || !savedItems.every(isCartItem)) {
          throw new Error("The saved cart response was invalid.");
        }
        if (!active) return;
        setItems(mergeCartItems(guestCart, savedItems));
        setSyncStatus("saved");
      } catch (error) {
        console.error("Could not load the saved account cart:", error);
        if (!active) return;
        setItems(mergeCartItems(cachedAccountCart, guestCart));
        setSyncStatus("error");
      } finally {
        if (active) {
          setLoadedAccountId(accountId);
          setIsReady(true);
        }
      }
    };

    void loadAccountCart();
    return () => {
      active = false;
    };
  }, [accountId, authReady, retryVersion, token]);

  useEffect(() => {
    if (!isReady || loadedAccountId !== accountId) return;

    if (!accountId) {
      try {
        localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.warn("Failed to save guest cart", error);
      }
      return;
    }

    try {
      localStorage.setItem(accountCartStorageKey(accountId), JSON.stringify(items));
    } catch (error) {
      console.warn("Failed to cache account cart", error);
    }

    if (syncStatusRef.current === "error") return;

    const timeoutId = window.setTimeout(() => {
      const cartToSave = items.map(({ productId, quantity }) => ({ productId, quantity }));
      if (!token) {
        setSyncStatus("error");
        return;
      }
      setSyncStatus("saving");
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          if (accountIdRef.current !== accountId) return;
          try {
            const response = await apiClient.put(
              "/cart",
              { items: cartToSave },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (accountIdRef.current !== accountId) return;
            const savedItems: unknown = response.data?.data;
            const currentItems = itemsRef.current;
            const contentsStillMatch =
              currentItems.length === cartToSave.length &&
              cartToSave.every((item) =>
                currentItems.some(
                  (currentItem) =>
                    currentItem.productId === item.productId &&
                    currentItem.quantity === item.quantity
                )
              );
            if (
              contentsStillMatch &&
              Array.isArray(savedItems) &&
              savedItems.every(isCartItem) &&
              savedItems.some((savedItem, index) => {
                const currentItem = currentItems[index];
                return !currentItem ||
                  savedItem.productId !== currentItem.productId ||
                  savedItem.name !== currentItem.name ||
                  savedItem.price !== currentItem.price ||
                  savedItem.image !== currentItem.image;
              })
            ) {
              setItems(savedItems);
            }
            localStorage.removeItem(GUEST_CART_STORAGE_KEY);
            setSyncStatus("saved");
          } catch (error) {
            console.error("Could not save the account cart:", error);
            if (accountIdRef.current === accountId) setSyncStatus("error");
          }
        });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [accountId, isReady, items, loadedAccountId, retryVersion, token]);

  const addItem = (item: CartItem) => {
    setItems((previousItems) => {
      const existing = previousItems.find((entry) => entry.productId === item.productId);
      if (existing) {
        return previousItems.map((entry) =>
          entry.productId === item.productId
            ? { ...entry, quantity: Math.min(99, entry.quantity + item.quantity) }
            : entry
        );
      }
      return [...previousItems, { ...item, quantity: Math.min(99, item.quantity) }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((previousItems) => previousItems.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
    } else {
      setItems((previousItems) =>
        previousItems.map((item) =>
          item.productId === productId ? { ...item, quantity: Math.min(99, quantity) } : item
        )
      );
    }
  };

  const clear = () => setItems([]);
  const retrySync = () => {
    if (accountId) setRetryVersion((version) => version + 1);
  };
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clear,
        total,
        isReady,
        syncStatus,
        retrySync
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
