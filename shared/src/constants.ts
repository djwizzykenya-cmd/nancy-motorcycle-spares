// User types
export enum UserType {
  CUSTOMER = "customer",
  SELLER = "seller",
  ADMIN = "admin"
}

// Order status
export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled"
}

// Payment status
export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded"
}

// Payment method
export enum PaymentMethod {
  CARD = "card",
  MOBILE_MONEY = "mobile_money",
  BANK_TRANSFER = "bank_transfer",
  CASH_ON_DELIVERY = "cash_on_delivery"
}

// Seller status
export enum SellerStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  PENDING_VERIFICATION = "pending_verification"
}

// Constants
export const PLATFORM_COMMISSION_RATE = 0.10; // 10%
export const DEFAULT_PAGE_SIZE = 20;
export const JWT_EXPIRES_IN = "7d";
export const REFRESH_TOKEN_EXPIRES_IN = "30d";

export const PAYMENT_METHODS = [
  PaymentMethod.CARD,
  PaymentMethod.MOBILE_MONEY,
  PaymentMethod.CASH_ON_DELIVERY
];

export const CATEGORIES = [
  { id: "1", name: "Engine Parts", slug: "engine-parts" },
  { id: "2", name: "Transmission", slug: "transmission" },
  { id: "3", name: "Suspension", slug: "suspension" },
  { id: "4", name: "Brakes", slug: "brakes" },
  { id: "5", name: "Electrical", slug: "electrical" },
  { id: "6", name: "Tires & Wheels", slug: "tires-wheels" },
  { id: "7", name: "Lights", slug: "lights" },
  { id: "8", name: "Accessories", slug: "accessories" }
];

export const ORDER_STATUS_LABELS = {
  [OrderStatus.PENDING]: "Pending",
  [OrderStatus.CONFIRMED]: "Confirmed",
  [OrderStatus.SHIPPED]: "Shipped",
  [OrderStatus.DELIVERED]: "Delivered",
  [OrderStatus.CANCELLED]: "Cancelled"
};

export const PAYMENT_METHOD_LABELS = {
  [PaymentMethod.CARD]: "Credit/Debit Card",
  [PaymentMethod.MOBILE_MONEY]: "Mobile Money (M-Pesa)",
  [PaymentMethod.BANK_TRANSFER]: "Bank Transfer",
  [PaymentMethod.CASH_ON_DELIVERY]: "Cash on Delivery"
};
