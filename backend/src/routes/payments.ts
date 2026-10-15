import express from "express";
import prisma from "../prisma";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { authenticate, authorize, type AuthRequest } from "../middleware/auth";
import { OrderStatus, PaymentStatus, UserType } from "@nancy-motorcycle-spares/shared";
import {
  initiateStkPush,
  isMpesaConfigured,
  MpesaError,
  normalizeKenyanPhone
} from "../services/mpesa";

const router = express.Router();

const acceptedCallback = (res: express.Response) =>
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });

router.get("/mpesa/status", (_req, res) => {
  res.json({ success: true, data: { available: isMpesaConfigured() } });
});

router.post(
  "/mpesa/stk-push",
  authenticate,
  authorize(UserType.CUSTOMER),
  asyncHandler(async (req, res) => {
    const { orderId, phone } = req.body ?? {};
    if (typeof orderId !== "string" || !orderId.trim()) {
      throw new AppError("Order reference is required", 400);
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeKenyanPhone(phone);
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : "Enter a valid Kenyan phone number.", 400);
    }

    if (!isMpesaConfigured()) {
      throw new AppError("M-Pesa payments are not configured yet.", 503);
    }

    const authReq = req as AuthRequest;
    const order = await prisma.order.findFirst({
      where: { id: orderId, customer: { userId: authReq.user!.id } },
      include: { payments: true, items: true }
    });
    if (!order) throw new AppError("Order not found", 404);
    if (order.paymentMethod !== "mobile_money") {
      throw new AppError("This order is not set up for M-Pesa payment.", 400);
    }
    if (order.paymentStatus !== PaymentStatus.PENDING || order.status !== OrderStatus.PENDING) {
      throw new AppError("This order is no longer awaiting payment.", 409);
    }
    const payment = order.payments.find((candidate) => candidate.method === "mobile_money");
    if (!payment) throw new AppError("M-Pesa payment record not found", 409);

    const reserved = await prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: PaymentStatus.PENDING,
        providerCheckoutRequestId: null
      },
      data: { status: "initiating", providerPhone: normalizedPhone }
    });
    if (reserved.count !== 1) {
      throw new AppError("An M-Pesa request for this order has already been started.", 409);
    }

    try {
      const result = await initiateStkPush({
        amount: Math.round(order.totalAmount),
        orderId: order.id,
        phone: normalizedPhone
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PENDING,
          providerCheckoutRequestId: result.checkoutRequestId,
          providerMerchantRequestId: result.merchantRequestId
        }
      });
      return res.status(202).json({
        success: true,
        data: {
          orderId: order.id,
          paymentStatus: "pending",
          customerMessage: result.customerMessage
        }
      });
    } catch (error) {
      if (error instanceof MpesaError && error.uncertain) {
        return res.status(202).json({
          success: true,
          data: {
            orderId: order.id,
            paymentStatus: "pending",
            customerMessage:
              "We could not confirm the M-Pesa prompt. Check your phone and order status before trying again."
          }
        });
      }

      await prisma.$transaction(async (tx) => {
        const failed = await tx.payment.updateMany({
          where: { id: payment.id, status: "initiating" },
          data: { status: PaymentStatus.FAILED }
        });
        if (failed.count !== 1) return;

        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.FAILED }
        });
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      });

      if (error instanceof MpesaError) {
        throw new AppError(error.message, 502);
      }
      throw error;
    }
  })
);

router.post(
  "/mpesa/callback",
  asyncHandler(async (req, res) => {
    const callback = req.body?.Body?.stkCallback;
    if (
      !callback ||
      typeof callback.CheckoutRequestID !== "string" ||
      !Number.isInteger(Number(callback.ResultCode))
    ) {
      console.warn("Rejected malformed M-Pesa callback");
      return res.status(400).json({ ResultCode: 1, ResultDesc: "Invalid callback" });
    }

    const checkoutRequestId = callback.CheckoutRequestID as string;
    const payment = await prisma.payment.findUnique({
      where: { providerCheckoutRequestId: checkoutRequestId },
      include: { order: { include: { items: true } } }
    });
    if (!payment) {
      console.warn("Received M-Pesa callback for an unknown checkout request");
      return acceptedCallback(res);
    }

    const resultCode = Number(callback.ResultCode);
    if (resultCode === 0) {
      const metadataItems: unknown = callback.CallbackMetadata?.Item;
      const metadata = Array.isArray(metadataItems) ? metadataItems : [];
      const getMetadata = (name: string) =>
        metadata.find((item) => item && item.Name === name)?.Value;
      const amount = Number(getMetadata("Amount"));
      const receipt = getMetadata("MpesaReceiptNumber");
      const phoneValue = getMetadata("PhoneNumber");
      const callbackPhone =
        typeof phoneValue === "number" || typeof phoneValue === "string"
          ? String(phoneValue)
          : "";
      let normalizedCallbackPhone = "";
      try {
        normalizedCallbackPhone = normalizeKenyanPhone(callbackPhone);
      } catch {
        normalizedCallbackPhone = "";
      }

      if (
        !Number.isFinite(amount) ||
        Math.abs(amount - payment.amount) > 0.01 ||
        typeof receipt !== "string" ||
        !receipt ||
        !payment.providerPhone ||
        normalizedCallbackPhone !== payment.providerPhone
      ) {
        console.error("M-Pesa callback did not match the stored payment details");
        return acceptedCallback(res);
      }

      await prisma.$transaction(async (tx) => {
        const completed = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: { in: [PaymentStatus.PENDING, "initiating"] }
          },
          data: { status: PaymentStatus.COMPLETED, transactionId: receipt }
        });
        if (completed.count !== 1) return;

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.CONFIRMED,
            paymentStatus: PaymentStatus.COMPLETED
          }
        });
        await tx.seller.update({
          where: { id: payment.sellerId },
          data: { totalRevenue: { increment: payment.amount } }
        });
      });
      return acceptedCallback(res);
    }

    await prisma.$transaction(async (tx) => {
      const failed = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: { in: [PaymentStatus.PENDING, "initiating"] }
        },
        data: { status: PaymentStatus.FAILED }
      });
      if (failed.count !== 1) return;

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.FAILED }
      });
      for (const item of payment.order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }
    });
    return acceptedCallback(res);
  })
);

export default router;
