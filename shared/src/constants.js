"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYMENT_METHOD_LABELS = exports.ORDER_STATUS_LABELS = exports.CATEGORIES = exports.PAYMENT_METHODS = exports.REFRESH_TOKEN_EXPIRES_IN = exports.JWT_EXPIRES_IN = exports.DEFAULT_PAGE_SIZE = exports.PLATFORM_COMMISSION_RATE = exports.SellerStatus = exports.PaymentMethod = exports.PaymentStatus = exports.OrderStatus = exports.UserType = void 0;
// User types
var UserType;
(function (UserType) {
    UserType["CUSTOMER"] = "customer";
    UserType["SELLER"] = "seller";
    UserType["ADMIN"] = "admin";
})(UserType || (exports.UserType = UserType = {}));
// Order status
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["CONFIRMED"] = "confirmed";
    OrderStatus["SHIPPED"] = "shipped";
    OrderStatus["DELIVERED"] = "delivered";
    OrderStatus["CANCELLED"] = "cancelled";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
// Payment status
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
// Payment method
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "card";
    PaymentMethod["MOBILE_MONEY"] = "mobile_money";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["CASH_ON_DELIVERY"] = "cash_on_delivery";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
// Seller status
var SellerStatus;
(function (SellerStatus) {
    SellerStatus["ACTIVE"] = "active";
    SellerStatus["SUSPENDED"] = "suspended";
    SellerStatus["PENDING_VERIFICATION"] = "pending_verification";
})(SellerStatus || (exports.SellerStatus = SellerStatus = {}));
// Constants
exports.PLATFORM_COMMISSION_RATE = 0.10; // 10%
exports.DEFAULT_PAGE_SIZE = 20;
exports.JWT_EXPIRES_IN = "7d";
exports.REFRESH_TOKEN_EXPIRES_IN = "30d";
exports.PAYMENT_METHODS = [
    PaymentMethod.CARD,
    PaymentMethod.MOBILE_MONEY,
    PaymentMethod.CASH_ON_DELIVERY
];
exports.CATEGORIES = [
    { id: "1", name: "Engine Parts", slug: "engine-parts" },
    { id: "2", name: "Transmission", slug: "transmission" },
    { id: "3", name: "Suspension", slug: "suspension" },
    { id: "4", name: "Brakes", slug: "brakes" },
    { id: "5", name: "Electrical", slug: "electrical" },
    { id: "6", name: "Tires & Wheels", slug: "tires-wheels" },
    { id: "7", name: "Lights", slug: "lights" },
    { id: "8", name: "Accessories", slug: "accessories" }
];
exports.ORDER_STATUS_LABELS = {
    [OrderStatus.PENDING]: "Pending",
    [OrderStatus.CONFIRMED]: "Confirmed",
    [OrderStatus.SHIPPED]: "Shipped",
    [OrderStatus.DELIVERED]: "Delivered",
    [OrderStatus.CANCELLED]: "Cancelled"
};
exports.PAYMENT_METHOD_LABELS = {
    [PaymentMethod.CARD]: "Credit/Debit Card",
    [PaymentMethod.MOBILE_MONEY]: "Mobile Money (M-Pesa)",
    [PaymentMethod.BANK_TRANSFER]: "Bank Transfer",
    [PaymentMethod.CASH_ON_DELIVERY]: "Cash on Delivery"
};
//# sourceMappingURL=constants.js.map