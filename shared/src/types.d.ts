import { UserType, OrderStatus, PaymentStatus, PaymentMethod } from "./constants";
export interface User {
    id: string;
    email: string;
    phone?: string;
    firstName: string;
    lastName: string;
    userType: UserType;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Seller {
    id: string;
    userId: string;
    shopName: string;
    shopDescription: string;
    shopLogo?: string;
    commissionRate: number;
    bankAccount?: string;
    businessRegNumber?: string;
    isApproved: boolean;
    isVerified: boolean;
    totalRevenue: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Product {
    id: string;
    sellerId: string;
    name: string;
    description: string;
    categoryId: string;
    price: number;
    stock: number;
    images: string[];
    rating?: number;
    reviewCount?: number;
    sku?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Category {
    id: string;
    name: string;
    description?: string;
    slug: string;
    icon?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CartItem {
    productId: string;
    quantity: number;
    price: number;
}
export interface Order {
    id: string;
    customerId: string;
    sellerId: string;
    items: OrderItem[];
    totalAmount: number;
    shippingAddress: Address;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    trackingNumber?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    pricePerUnit: number;
    subtotal: number;
}
export interface Payment {
    id: string;
    orderId: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionId: string;
    sellerPayout: number;
    platformCommission: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Review {
    id: string;
    productId: string;
    customerId: string;
    rating: number;
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Address {
    id?: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault?: boolean;
}
export interface Wishlist {
    id: string;
    customerId: string;
    productId: string;
    createdAt: Date;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: User;
}
//# sourceMappingURL=types.d.ts.map