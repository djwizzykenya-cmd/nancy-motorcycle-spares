import express from "express";
import { randomUUID } from "crypto";
import prisma from "../prisma";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { authenticate, authorize } from "../middleware/auth";
import { OrderStatus, PaymentMethod, UserType } from "@nancy-motorcycle-spares/shared";
import { isMpesaConfigured } from "../services/mpesa";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize(UserType.ADMIN),
  asyncHandler(async (req, res) => {
    const statusFilter = String(req.query.status || "").trim().toLowerCase();
    const where = statusFilter && statusFilter !== "all" ? { status: statusFilter } : {};

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        items: true,
        shippingAddress: true
      }
    });

    const payload = orders.map((order) => ({
      id: order.id,
      orderNumber: order.id,
      customer: order.customer?.user
        ? `${order.customer.user.firstName} ${order.customer.user.lastName}`.trim()
        : "Guest",
      email: order.customer?.user?.email || "guest@example.com",
      items: order.items.length,
      total: order.totalAmount,
      status: String(order.status).toLowerCase(),
      trackingNumber: order.trackingNumber,
      shippingAddress: order.shippingAddress
        ? {
            street: order.shippingAddress.street,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            postalCode: order.shippingAddress.postalCode,
            country: order.shippingAddress.country,
            latitude: order.shippingAddress.latitude,
            longitude: order.shippingAddress.longitude
          }
        : null,
      createdAt: order.createdAt
    }));

    return res.json({ success: true, data: payload });
  })
);

router.get(
  "/mine",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { customer: { userId: (req as any).user.id } },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: { select: { name: true } }
          }
        },
        shippingAddress: true
      }
    });

    return res.json({
      success: true,
      data: orders.map((order) => ({
        id: order.id,
        status: String(order.status).toLowerCase(),
        paymentStatus: String(order.paymentStatus).toLowerCase(),
        paymentMethod: order.paymentMethod,
        trackingNumber: order.trackingNumber,
        total: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.pricePerUnit,
          subtotal: item.subtotal
        })),
        shippingAddress: order.shippingAddress
          ? {
              street: order.shippingAddress.street,
              city: order.shippingAddress.city,
              state: order.shippingAddress.state,
              postalCode: order.shippingAddress.postalCode,
              country: order.shippingAddress.country,
              latitude: order.shippingAddress.latitude,
              longitude: order.shippingAddress.longitude
            }
          : null
      }))
    });
  })
);

router.get(
  "/mine/:id",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id,
        customer: { userId: (req as any).user.id }
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } }
          }
        },
        shippingAddress: true
      }
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    return res.json({
      success: true,
      data: {
        id: order.id,
        status: String(order.status).toLowerCase(),
        paymentStatus: String(order.paymentStatus).toLowerCase(),
        paymentMethod: order.paymentMethod,
        trackingNumber: order.trackingNumber,
        total: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.pricePerUnit,
          subtotal: item.subtotal
        })),
        shippingAddress: order.shippingAddress
          ? {
              street: order.shippingAddress.street,
              city: order.shippingAddress.city,
              state: order.shippingAddress.state,
              postalCode: order.shippingAddress.postalCode,
              country: order.shippingAddress.country,
              latitude: order.shippingAddress.latitude,
              longitude: order.shippingAddress.longitude
            }
          : null
      }
    });
  })
);

router.patch(
  "/:id/status",
  authenticate,
  authorize(UserType.ADMIN),
  asyncHandler(async (req, res) => {
    const status = String(req.body?.status || "").trim().toLowerCase();
    const validStatuses = [...Object.values(OrderStatus), "processing"] as string[];
    if (!validStatuses.includes(status)) {
      throw new AppError("Invalid order status", 400);
    }

    const existingOrder = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existingOrder) {
      throw new AppError("Order not found", 404);
    }

    const trackingNumber = typeof req.body?.trackingNumber === "string"
      ? req.body.trackingNumber.trim()
      : undefined;
    if (trackingNumber !== undefined && trackingNumber.length > 100) {
      throw new AppError("Tracking number must be 100 characters or fewer", 400);
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(trackingNumber !== undefined ? { trackingNumber: trackingNumber || null } : {})
      }
    });

    return res.json({
      success: true,
      data: {
        id: order.id,
        status: String(order.status).toLowerCase(),
        trackingNumber: order.trackingNumber
      }
    });
  })
);

router.post(
  "/",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    const {
      items,
      shippingAddress,
      paymentMethod = PaymentMethod.CASH_ON_DELIVERY
    } = req.body;
    const dbPaymentMethod = String(paymentMethod).toLowerCase();
    if (![PaymentMethod.CASH_ON_DELIVERY, PaymentMethod.MOBILE_MONEY].includes(dbPaymentMethod as PaymentMethod)) {
      throw new AppError("Choose a supported payment method", 400);
    }
    if (dbPaymentMethod === PaymentMethod.MOBILE_MONEY && !isMpesaConfigured()) {
      throw new AppError("M-Pesa payments are not configured yet.", 503);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Cart items are required", 400);
    }

    if (
      !shippingAddress ||
      !shippingAddress.street ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postalCode
    ) {
      throw new AppError("Shipping address is required", 400);
    }

    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.userType !== UserType.CUSTOMER) {
      throw new AppError("Customer account not found", 401);
    }

    let customer = await prisma.customer.findUnique({ where: { userId: user.id } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { id: randomUUID(), userId: user.id } });
    }

    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { seller: true }
    });

    if (products.length !== items.length) {
      throw new AppError("One or more products were not found", 404);
    }

    const sellerIds = new Set(products.map((product) => product.sellerId));
    if (sellerIds.size > 1) {
      throw new AppError("For now, an order can only contain products from one seller", 400);
    }

    const lineItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId);

      const quantity = Number(item.quantity || 1);
      if (quantity <= 0) {
        throw new AppError("Item quantity must be at least 1", 400);
      }

      if (!product) {
        throw new AppError("Product not found in cart", 404);
      }

      if (product.stock < quantity) {
        throw new AppError(`Product ${product.name} is out of stock`, 400);
      }

      return {
        product,
        quantity,
        pricePerUnit: Number(product.price),
        subtotal: Number(product.price) * quantity
      };
    });

    const totalAmount = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    if (dbPaymentMethod === PaymentMethod.MOBILE_MONEY && !Number.isSafeInteger(totalAmount)) {
      throw new AppError("M-Pesa checkout requires a whole-number KES total.", 400);
    }
    const seller = products[0].seller;
    const sellerId = seller.id;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const address = await tx.address.create({
          data: {
            customerId: customer.id,
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            postalCode: shippingAddress.postalCode,
            country: shippingAddress.country || "KE",
            latitude: shippingAddress.latitude,
            longitude: shippingAddress.longitude
          }
        });

        const order = await tx.order.create({
          data: {
            customerId: customer.id,
            sellerId,
            totalAmount,
            paymentMethod: String(paymentMethod).toLowerCase() as any,
            status: "pending",
            paymentStatus: "pending",
            shippingAddressId: address.id
          }
        });

        const orderItemsData = lineItems.map((item) => ({
          orderId: order.id,
          productId: item.product.id,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          subtotal: item.subtotal
        }));

        await tx.orderItem.createMany({ data: orderItemsData });

        const sellerPayout = totalAmount * (1 - seller.commissionRate);
        const platformCommission = totalAmount * seller.commissionRate;

        await tx.payment.create({
          data: {
            orderId: order.id,
            sellerId,
            amount: totalAmount,
            method: String(paymentMethod).toLowerCase() as any,
            status: "pending",
            sellerPayout,
            platformCommission
          }
        });

        for (const item of lineItems) {
          await tx.product.update({
            where: { id: item.product.id },
            data: { stock: { decrement: item.quantity } }
          });
        }

        return order;
      });

      res.status(201).json({
        success: true,
        data: {
          orderId: result.id,
          total: totalAmount,
          status: result.status
        }
      });
    } catch (err: any) {
      console.error("Order creation failed:", err?.message || err);
      throw new AppError("The order could not be saved. Please try again.", 503);
    }
  })
);

router.post(
  "/:id/pay",
  asyncHandler(async () => {
    throw new AppError("Payment status can only be updated by the payment provider.", 410);
  })
);

export default router;
