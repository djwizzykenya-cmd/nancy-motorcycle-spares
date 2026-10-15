"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePhoneKE = exports.validateEmail = exports.generateSlug = exports.truncateString = exports.calculateDiscount = exports.formatDate = exports.formatPrice = void 0;
const formatPrice = (price) => {
    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES"
    }).format(price);
};
exports.formatPrice = formatPrice;
const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(date);
};
exports.formatDate = formatDate;
const calculateDiscount = (original, discount) => {
    return original - (original * discount) / 100;
};
exports.calculateDiscount = calculateDiscount;
const truncateString = (str, length) => {
    if (str.length <= length)
        return str;
    return str.slice(0, length) + "...";
};
exports.truncateString = truncateString;
const generateSlug = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
};
exports.generateSlug = generateSlug;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePhoneKE = (phone) => {
    // Kenya phone format: +254xxxxxxxxx or 0xxxxxxxxx
    const phoneRegex = /^(\+254|0)[17][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
};
exports.validatePhoneKE = validatePhoneKE;
//# sourceMappingURL=utils.js.map