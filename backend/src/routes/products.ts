import express from "express";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { UserType } from "@nancy-motorcycle-spares/shared";

const parseImages = (images: unknown) => {
  if (Array.isArray(images)) {
    return images;
  }

  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const normalizeCategorySlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const isNumericInput = (value: unknown) =>
  typeof value === "number" || (typeof value === "string" && value.trim().length > 0);

const router = express.Router();

const getAdminSellerProfile = (userId: string) =>
  prisma.seller.upsert({
    where: { userId },
    create: {
      user: { connect: { id: userId } },
      shopName: "Nancy Motorcycle Spares",
      shopDescription: "Official Nancy Motorcycle Spares store",
      commissionRate: 0,
      isApproved: true,
      isVerified: true
    },
    update: {
      shopName: "Nancy Motorcycle Spares",
      commissionRate: 0,
      isApproved: true,
      isVerified: true
    }
  });

const triggerFrontendRevalidation = async (paths: string[] = []) => {
  const frontendUrl = process.env.FRONTEND_REVALIDATE_URL; // e.g. https://your-site.com
  const secret = process.env.FRONTEND_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET;
  if (!frontendUrl || !secret) return;

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - global fetch may be available at runtime
    await fetch(`${frontendUrl.replace(/\/+$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ paths })
    });
  } catch (err) {
    console.error("Failed to trigger frontend revalidation:", err);
  }
};

const FALLBACK_PRODUCTS = [
  {
    id: "p1",
    name: "Motorcycle Engine Piston",
    description: "High-performance piston for reliable engine performance.",
    price: 4500,
    stock: 20,
    images: ["https://images.pexels.com/photos/159898/pexels-photo-159898.jpeg"],
    sellerId: "seller-1",
    seller: { id: "seller-1", shopName: "Nancy Motorcycle Spares" },
    category: { id: "cat-1", name: "Engine Parts", slug: "engine-parts" },
    isActive: true
  },
  {
    id: "p2",
    name: "Front Brake Disc",
    description: "Durable braking disc for consistent stopping power.",
    price: 3200,
    stock: 14,
    images: ["https://images.pexels.com/photos/163634/pexels-photo-163634.jpeg"],
    sellerId: "seller-1",
    seller: { id: "seller-1", shopName: "Nancy Motorcycle Spares" },
    category: { id: "cat-4", name: "Brakes", slug: "brakes" },
    isActive: true
  },
  {
    id: "p3",
    name: "LED Headlight",
    description: "Bright LED headlight kit for safer night riding.",
    price: 2400,
    stock: 30,
    images: ["https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg"],
    sellerId: "seller-1",
    seller: { id: "seller-1", shopName: "Nancy Motorcycle Spares" },
    category: { id: "cat-7", name: "Lights", slug: "lights" },
    isActive: true
  },
  {
    id: "p4",
    name: "Shock Absorber (Rear)",
    description: "Premium rear shock absorber for smooth rides.",
    price: 5200,
    stock: 18,
    images: ["https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg"],
    sellerId: "seller-1",
    seller: { id: "seller-1", shopName: "Nancy Motorcycle Spares" },
    category: { id: "cat-3", name: "Suspension", slug: "suspension" },
    isActive: true
  },
  {
    id: "p5",
    name: "Spark Plug Set",
    description: "Reliable spark plug set for smooth ignition.",
    price: 900,
    stock: 40,
    images: ["https://images.pexels.com/photos/163636/pexels-photo-163636.jpeg"],
    sellerId: "seller-1",
    seller: { id: "seller-1", shopName: "Nancy Motorcycle Spares" },
    category: { id: "cat-5", name: "Electrical", slug: "electrical" },
    isActive: true
  },
  {
    id: "p6",
    name: "Motorcycle Tire 17in",
    description: "Quality tire built for long mileage and grip.",
    price: 6800,
    stock: 12,
    images: ["https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg"],
    sellerId: "seller-1",
    seller: { id: "seller-1", shopName: "Nancy Motorcycle Spares" },
    category: { id: "cat-6", name: "Tires & Wheels", slug: "tires-wheels" },
    isActive: true
  }
];

const filterFallbackProducts = (query: any) => {
  let products = [...FALLBACK_PRODUCTS];
  const search = String(query.search || "").trim().toLowerCase();
  const category = normalizeCategorySlug(String(query.category || ""));
  const sellerId = String(query.sellerId || "").trim();

  if (search) {
    products = products.filter((product) => {
      return (
        product.name.toLowerCase().includes(search) ||
        (product.description || "").toLowerCase().includes(search) ||
        product.category.name.toLowerCase().includes(search)
      );
    });
  }

  if (category) {
    products = products.filter((product) => product.category.slug === category);
  }

  if (sellerId) {
    products = products.filter((product) => product.sellerId === sellerId);
  }

  return products;
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 12);
    const search = String(req.query.search || "").trim();
    const category = normalizeCategorySlug(String(req.query.category || ""));
    const sellerId = String(req.query.sellerId || "").trim();

    const where: any = {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(category
        ? {
            category: {
              slug: category
            }
          }
        : {}),
      ...(sellerId ? { sellerId } : {})
    };

    try {
      const total = await prisma.product.count({ where });
      const products = await prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              shopName: true
            }
          },
          category: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      res.json({
        success: true,
        data: products.map((product) => ({
          ...product,
          images: parseImages(product.images)
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Failed to load products from the database:", error);
      if (process.env.NODE_ENV !== "development") {
        throw error;
      }

      const fallback = filterFallbackProducts({ search, category, sellerId });
      const startIndex = (page - 1) * limit;
      const pagedProducts = fallback.slice(startIndex, startIndex + limit);

      res.json({
        success: true,
        data: pagedProducts,
        meta: {
          total: fallback.length,
          page,
          limit,
          totalPages: Math.ceil(fallback.length / limit),
          source: "fallback"
        }
      });
    }
  })
);

router.get(
  "/admin",
  authenticate,
  authorize(UserType.ADMIN),
  asyncHandler(async (req: any, res) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 100);
    const search = String(req.query.search || "").trim();
    const category = normalizeCategorySlug(String(req.query.category || ""));
    const sellerId = String(req.query.sellerId || "").trim();
    const activeFilter = req.query.active?.toString();

    const where: any = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(category
        ? {
            category: {
              slug: category
            }
          }
        : {}),
      ...(sellerId ? { sellerId } : {})
    };

    if (activeFilter === "true") {
      where.isActive = true;
    } else if (activeFilter === "false") {
      where.isActive = false;
    }

    const total = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        seller: {
          select: {
            id: true,
            shopName: true
          }
        },
        category: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json({
      success: true,
      data: products.map((product) => ({
        ...product,
        images: parseImages(product.images)
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  })
);

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" }
    });

    res.json({
      success: true,
      data: categories
    });
  })
);

router.get(
  "/:id/reviews",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { id: true }
    });
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const [reviews, aggregate] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.review.aggregate({
        where: { productId: product.id },
        _avg: { rating: true },
        _count: { _all: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        reviews: reviews.map(({ customer, ...review }) => ({
          ...review,
          reviewer: `${customer.firstName} ${customer.lastName}`.trim()
        })),
        rating: aggregate._avg.rating,
        reviewCount: aggregate._count._all
      }
    });
  })
);

router.get(
  "/:id/reviews/me",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { id: true }
    });
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const [deliveredOrderItem, review] = await Promise.all([
      prisma.orderItem.findFirst({
        where: {
          productId: product.id,
          order: {
            status: "delivered",
            customer: { userId }
          }
        },
        select: { id: true }
      }),
      prisma.review.findUnique({
        where: {
          productId_customerId: {
            productId: product.id,
            customerId: userId
          }
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        eligible: Boolean(deliveredOrderItem),
        review
      }
    });
  })
);

router.post(
  "/:id/reviews",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const rating = Number(req.body?.rating);
    const rawComment = req.body?.comment;

    if (rawComment !== undefined && rawComment !== null && typeof rawComment !== "string") {
      throw new AppError("Review comment must be text", 400);
    }
    const comment = typeof rawComment === "string" ? rawComment.trim() : "";

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError("Rating must be a whole number from 1 to 5", 400);
    }
    if (comment.length > 2000) {
      throw new AppError("Review comments must be 2000 characters or fewer", 400);
    }

    const product = await prisma.product.findFirst({
      where: { id: req.params.id, isActive: true },
      select: { id: true }
    });
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const deliveredOrderItem = await prisma.orderItem.findFirst({
      where: {
        productId: product.id,
        order: {
          status: "delivered",
          customer: { userId }
        }
      },
      select: { id: true }
    });
    if (!deliveredOrderItem) {
      throw new AppError("You can review this product after your order has been delivered", 403);
    }

    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.review.upsert({
        where: {
          productId_customerId: {
            productId: product.id,
            customerId: userId
          }
        },
        create: {
          productId: product.id,
          customerId: userId,
          rating,
          comment: comment || null
        },
        update: {
          rating,
          comment: comment || null
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true
        }
      });
      const aggregate = await tx.review.aggregate({
        where: { productId: product.id },
        _avg: { rating: true },
        _count: { _all: true }
      });
      await tx.product.update({
        where: { id: product.id },
        data: {
          rating: aggregate._avg.rating,
          reviewCount: aggregate._count._all
        }
      });

      return {
        review,
        rating: aggregate._avg.rating,
        reviewCount: aggregate._count._all
      };
    });

    res.json({ success: true, data: result });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: any, res) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
        include: {
          seller: {
            select: {
              id: true,
              shopName: true
            }
          },
          category: true
        }
      });

      if (product) {
        return res.json({
          success: true,
          data: {
            ...product,
            images: parseImages(product.images)
          }
        });
      }
    } catch (error) {
      console.error("Failed to load product from the database:", error);
      if (process.env.NODE_ENV !== "development") {
        throw error;
      }
    }

    if (process.env.NODE_ENV !== "development") {
      throw new AppError("Product not found", 404);
    }

    const fallback = FALLBACK_PRODUCTS.find((product) => product.id === req.params.id);
    if (!fallback) {
      throw new AppError("Product not found", 404);
    }

    res.json({
      success: true,
      data: fallback
    });
  })
);

router.post(
  "/",
  authenticate,
  authorize(UserType.ADMIN),
  asyncHandler(async (req: any, res) => {
    const { name, description, categoryId, price, stock, images } = req.body;
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (typeof name !== "string" || !name.trim() || typeof categoryId !== "string" || !categoryId.trim()) {
      throw new AppError("Name and category are required", 400);
    }
    if (!isNumericInput(price) || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      throw new AppError("Price must be a number greater than 0", 400);
    }
    if (!isNumericInput(stock) || !Number.isInteger(parsedStock) || parsedStock < 0) {
      throw new AppError("Stock must be a whole number of 0 or more", 400);
    }

    const seller = await getAdminSellerProfile(req.user.id);

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        name: name.trim(),
        description,
        categoryId: categoryId.trim(),
        price: parsedPrice,
        stock: parsedStock,
        images: JSON.stringify(Array.isArray(images) ? images : []),
        isActive: true
      },
      include: {
        seller: {
          select: {
            id: true,
            shopName: true
          }
        },
        category: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...product,
        images: parseImages(product.images)
      }
    });
    // Trigger frontend revalidation (best-effort, non-blocking)
    void triggerFrontendRevalidation(["/products", `/products/${product.id}`]);
  })
);

router.put(
  "/:id",
  authenticate,
  authorize(UserType.ADMIN),
  asyncHandler(async (req: any, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const { name, description, categoryId, price, stock, images, isActive } = req.body;
    const parsedPrice = price === undefined ? product.price : Number(price);
    const parsedStock = stock === undefined ? product.stock : Number(stock);

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      throw new AppError("Name cannot be empty", 400);
    }
    if (categoryId !== undefined && (typeof categoryId !== "string" || !categoryId.trim())) {
      throw new AppError("Category is invalid", 400);
    }
    if (price !== undefined && (!isNumericInput(price) || !Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
      throw new AppError("Price must be a number greater than 0", 400);
    }
    if (stock !== undefined && (!isNumericInput(stock) || !Number.isInteger(parsedStock) || parsedStock < 0)) {
      throw new AppError("Stock must be a whole number of 0 or more", 400);
    }
    if (isActive !== undefined && typeof isActive !== "boolean") {
      throw new AppError("Active status must be true or false", 400);
    }

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: name === undefined ? product.name : name.trim(),
        description: description ?? product.description,
        categoryId: categoryId === undefined ? product.categoryId : categoryId.trim(),
        price: parsedPrice,
        stock: parsedStock,
        images: JSON.stringify(
          images !== undefined
            ? Array.isArray(images)
              ? images
              : []
            : parseImages(product.images)
        ),
        ...(isActive !== undefined ? { isActive } : {})
      }
    });

    const updatedProductWithRelations = await prisma.product.findUnique({
      where: { id: updatedProduct.id },
      include: {
        seller: {
          select: {
            id: true,
            shopName: true
          }
        },
        category: true
      }
    });

    res.json({
      success: true,
      data: {
        ...updatedProductWithRelations,
        images: parseImages(updatedProductWithRelations?.images)
      }
    });
    // Trigger frontend revalidation (best-effort, non-blocking)
    void triggerFrontendRevalidation(["/products", `/products/${updatedProduct.id}`]);
  })
);

router.delete(
  "/:id",
  authenticate,
  authorize(UserType.ADMIN),
  asyncHandler(async (req: any, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
    // Trigger frontend revalidation (best-effort, non-blocking)
    void triggerFrontendRevalidation(["/products"]);
  })
);

export default router;
