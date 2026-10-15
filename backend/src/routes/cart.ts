import express from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, authorize } from "../middleware/auth";
import { UserType } from "@nancy-motorcycle-spares/shared";

const router = express.Router();

interface StoredCartItem {
  productId: string;
  quantity: number;
}

const toJsonCartItems = (items: StoredCartItem[]): Prisma.InputJsonArray =>
  items.map(({ productId, quantity }) => ({ productId, quantity }));

const readCartItems = (value: unknown): StoredCartItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is StoredCartItem =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as StoredCartItem).productId === "string" &&
      Number.isInteger((item as StoredCartItem).quantity) &&
      (item as StoredCartItem).quantity > 0
  );
};

const getCustomer = async (userId: string) => {
  const customer = await prisma.customer.findUnique({ where: { userId } });
  if (!customer) {
    throw new AppError("Customer profile not found", 404);
  }
  return customer;
};

const getCartProducts = async (cartItems: StoredCartItem[]) => {
  if (!cartItems.length) return [];

  const products = await prisma.product.findMany({
    where: {
      id: { in: cartItems.map((item) => item.productId) },
      isActive: true
    },
    select: {
      id: true,
      name: true,
      price: true,
      images: true
    }
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  return cartItems.flatMap((item) => {
    const product = productById.get(item.productId);
    if (!product) return [];

    let images: unknown = [];
    try {
      images = JSON.parse(product.images);
    } catch (error) {
      console.error(`Could not parse images for cart product ${product.id}:`, error);
    }

    return [{
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      image: Array.isArray(images) && typeof images[0] === "string" ? images[0] : undefined
    }];
  });
};

const getAvailableCartItems = async (cartItems: StoredCartItem[]) => {
  if (!cartItems.length) return [];

  const availableProducts = await prisma.product.findMany({
    where: {
      id: { in: cartItems.map((item) => item.productId) },
      isActive: true
    },
    select: { id: true }
  });
  const availableIds = new Set(availableProducts.map((product) => product.id));
  return cartItems.filter((item) => availableIds.has(item.productId));
};

router.get(
  "/",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    const customer = await getCustomer((req as any).user.id);
    const cartItems = readCartItems(customer.cartItems);
    const availableCartItems = await getAvailableCartItems(cartItems);
    if (availableCartItems.length !== cartItems.length) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { cartItems: toJsonCartItems(availableCartItems) }
      });
    }
    res.json({ success: true, data: await getCartProducts(availableCartItems) });
  })
);

router.put(
  "/",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    if (!Array.isArray(req.body?.items) || req.body.items.length > 100) {
      throw new AppError("Cart items must be a list of at most 100 products", 400);
    }

    const cartItems = req.body.items.map((item: unknown) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as { productId?: unknown }).productId !== "string" ||
        !(item as { productId: string }).productId.trim() ||
        !Number.isInteger((item as { quantity?: unknown }).quantity) ||
        (item as { quantity: number }).quantity < 1 ||
        (item as { quantity: number }).quantity > 99
      ) {
        throw new AppError("Each cart item must have a product ID and quantity between 1 and 99", 400);
      }

      return {
        productId: (item as { productId: string }).productId.trim(),
        quantity: (item as { quantity: number }).quantity
      };
    }) as StoredCartItem[];

    const uniqueItems = Array.from(
      cartItems.reduce((itemsById, item) => {
        const current = itemsById.get(item.productId) || 0;
        itemsById.set(item.productId, Math.min(99, current + item.quantity));
        return itemsById;
      }, new Map<string, number>()),
      ([productId, quantity]) => ({ productId, quantity })
    );

    const availableCartItems = await getAvailableCartItems(uniqueItems);
    if (availableCartItems.length !== uniqueItems.length) {
      throw new AppError("One or more cart products are no longer available. Refresh your cart and try again.", 409);
    }

    const customer = await getCustomer((req as any).user.id);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { cartItems: toJsonCartItems(availableCartItems) }
    });

    res.json({ success: true, data: await getCartProducts(availableCartItems) });
  })
);

export default router;
