import express from "express";
import prisma from "../prisma";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { authenticate, authorize } from "../middleware/auth";
import { UserType } from "@nancy-motorcycle-spares/shared";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize(UserType.ADMIN),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: {
        userType: { in: [UserType.ADMIN, UserType.CUSTOMER] }
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        userType: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { id: true } }
      }
    });

    const customerIds = users.flatMap((user) => user.customer ? [user.customer.id] : []);
    const orderActivity = customerIds.length
      ? await prisma.order.groupBy({
          by: ["customerId"],
          where: { customerId: { in: customerIds } },
          _count: { _all: true },
          _sum: { totalAmount: true },
          _max: { createdAt: true }
        })
      : [];
    const activityByCustomerId = new Map(orderActivity.map((activity) => [
      activity.customerId,
      {
        orderCount: activity._count._all,
        totalSpent: activity._sum.totalAmount ?? 0,
        lastOrderAt: activity._max.createdAt
      }
    ]));

    res.json({
      success: true,
      data: users.map(({ customer, ...user }) => ({
        ...user,
        orderCount: customer ? activityByCustomerId.get(customer.id)?.orderCount ?? 0 : 0,
        totalSpent: customer ? activityByCustomerId.get(customer.id)?.totalSpent ?? 0 : 0,
        lastOrderAt: customer ? activityByCustomerId.get(customer.id)?.lastOrderAt ?? null : null
      }))
    });
  })
);

router.delete(
  "/:id",
  authenticate,
  authorize(UserType.ADMIN),
  asyncHandler(async (req, res) => {
    const userId = req.params.id.trim();
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, userType: true }
    });
    if (!target) {
      throw new AppError("User not found", 404);
    }
    if (target.userType !== UserType.CUSTOMER) {
      throw new AppError("Only customer accounts can be permanently deleted", 403);
    }

    const deletion = await prisma.user.deleteMany({
      where: { id: target.id, userType: UserType.CUSTOMER }
    });
    if (deletion.count !== 1) {
      throw new AppError("Customer account could not be found for deletion", 404);
    }

    return res.json({ success: true, data: { id: target.id, deleted: true } });
  })
);

export default router;
