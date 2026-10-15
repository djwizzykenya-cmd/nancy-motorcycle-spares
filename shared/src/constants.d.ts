export declare enum UserType {
    CUSTOMER = "customer",
    SELLER = "seller",
    ADMIN = "admin"
}
export declare enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare enum PaymentMethod {
    CARD = "card",
    MOBILE_MONEY = "mobile_money",
    BANK_TRANSFER = "bank_transfer",
    CASH_ON_DELIVERY = "cash_on_delivery"
}
export declare enum SellerStatus {
    ACTIVE = "active",
    SUSPENDED = "suspended",
    PENDING_VERIFICATION = "pending_verification"
}
export declare const PLATFORM_COMMISSION_RATE = 0.1;
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const JWT_EXPIRES_IN = "7d";
export declare const REFRESH_TOKEN_EXPIRES_IN = "30d";
export declare const PAYMENT_METHODS: PaymentMethod[];
export declare const CATEGORIES: {
    id: string;
    name: string;
    slug: string;
}[];
export declare const ORDER_STATUS_LABELS: {
    pending: string;
    confirmed: string;
    shipped: string;
    delivered: string;
    cancelled: string;
};
export declare const PAYMENT_METHOD_LABELS: {
    card: string;
    mobile_money: string;
    bank_transfer: string;
    cash_on_delivery: string;
};
//# sourceMappingURL=constants.d.ts.map