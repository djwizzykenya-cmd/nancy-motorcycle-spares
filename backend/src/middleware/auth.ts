import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppError } from "./errorHandler";
import prisma from "../prisma";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userType: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let decoded: { id?: unknown; userType?: unknown };
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new AppError("No token provided", 401);
    }

    decoded = jwt.verify(token, config.jwtSecret) as { id?: unknown; userType?: unknown };
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError("Invalid token", 401));
  }

  if (typeof decoded.id !== "string" || typeof decoded.userType !== "string") {
    return next(new AppError("Invalid token", 401));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, userType: true, isActive: true }
    });
    if (!user || !user.isActive) {
      return next(new AppError("User account is no longer active", 401));
    }
    req.user = { id: user.id, userType: String(user.userType).toLowerCase() };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return next(new AppError("Forbidden", 403));
    }

    next();
  };
};
