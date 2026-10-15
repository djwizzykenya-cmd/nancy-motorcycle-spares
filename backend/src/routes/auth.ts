import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { config } from "../config";
import { AppError, asyncHandler } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { UserType } from "@nancy-motorcycle-spares/shared";

const router = express.Router();

const createToken = (userId: string, userType: string) => {
  const payload = { id: userId, userType: String(userType).toLowerCase() };
  const secret: any = config.jwtSecret;
  return (jwt as any).sign(payload, secret, { expiresIn: config.jwtExpire });
};

const safeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  userType: String(user.userType).toLowerCase(),
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      userType
    } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      !email.trim() ||
      !firstName.trim() ||
      !lastName.trim()
    ) {
      throw new AppError("Missing required fields", 400);
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const requestedUserType = typeof userType === "string" ? userType.toLowerCase() : userType;
    if (requestedUserType === UserType.ADMIN) {
      throw new AppError("Admin accounts must be provisioned through the backend", 403);
    }
    if (requestedUserType === UserType.SELLER) {
      throw new AppError("Seller accounts are not available. Nancy Motorcycle Spares is the only seller.", 403);
    }
    if (requestedUserType !== undefined && requestedUserType !== UserType.CUSTOMER) {
      throw new AppError("Account type must be customer", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new AppError("Enter a valid email address", 400);
    }
    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters", 400);
    }
    if (phone !== undefined && typeof phone !== "string") {
      throw new AppError("Phone number must be text", 400);
    }
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      throw new AppError("Email already in use", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createData: Prisma.UserCreateInput = {
      email: normalizedEmail,
      password: passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : undefined,
      userType: UserType.CUSTOMER,
      customer: { create: {} }
    };

    let user;
    try {
      user = await prisma.user.create({ data: createData });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError("Email already in use", 409);
      }
      throw error;
    }

    const token = createToken(user.id, user.userType);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: safeUser(user)
      }
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new AppError("Invalid credentials", 401);
    }
    if (!user.isActive) {
      throw new AppError("Invalid credentials", 401);
    }
    if (user.userType === UserType.SELLER) {
      throw new AppError("Seller accounts are no longer available. Contact support for assistance.", 403);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    const token = createToken(updatedUser.id, updatedUser.userType);

    res.json({
      success: true,
      data: {
        token,
        user: {
          ...safeUser(updatedUser),
          userType: String(updatedUser.userType).toLowerCase()
        }
      }
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: any, res) => {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.id }
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.json({
      success: true,
      data: safeUser(user)
    });
  })
);

router.post(
  "/logout",
  authenticate,
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      message: "Logout successful"
    });
  })
);

export default router;
