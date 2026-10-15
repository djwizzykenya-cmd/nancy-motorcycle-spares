import express from "express";
import prisma from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { UserType } from "@nancy-motorcycle-spares/shared";

const router = express.Router();

const getCustomerId = async (userId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!customer) {
    throw new AppError("Customer account not found", 404);
  }

  return customer.id;
};

router.get(
  "/",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    const customerId = await getCustomerId((req as AuthRequest).user!.id);
    const wishlist = await prisma.wishlist.findMany({
      where: { customerId, product: { isActive: true } },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: {
            category: true,
            seller: { select: { shopName: true } }
          }
        }
      }
    });

    res.json({
      success: true,
      data: wishlist.map(({ product, createdAt }) => ({
        ...product,
        images: (() => {
          try {
            const images: unknown = JSON.parse(product.images);
            return Array.isArray(images) ? images : [];
          } catch {
            return [];
          }
        })(),
        savedAt: createdAt
      }))
    });
  })
);

router.post(
  "/",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    const productId = req.body?.productId;
    if (typeof productId !== "string" || !productId.trim()) {
      throw new AppError("Product ID is required", 400);
    }

    const customerId = await getCustomerId((req as AuthRequest).user!.id);
    const product = await prisma.product.findFirst({
      where: { id: productId.trim(), isActive: true },
      select: { id: true }
    });
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    await prisma.wishlist.upsert({
      where: {
        customerId_productId: {
          customerId,
          productId: product.id
        }
      },
      create: { customerId, productId: product.id },
      update: {}
    });

    res.json({ success: true, data: { productId: product.id, saved: true } });
  })
);

router.delete(
  "/:productId",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    const productId = req.params.productId.trim();
    if (!productId) {
      throw new AppError("Product ID is required", 400);
    }

    const customerId = await getCustomerId((req as AuthRequest).user!.id);
    await prisma.wishlist.deleteMany({
      where: { customerId, productId }
    });

    res.json({ success: true, data: { productId, saved: false } });
  })
);

export default router;
