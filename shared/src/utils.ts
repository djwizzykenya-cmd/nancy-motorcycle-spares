export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES"
  }).format(price);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
};

export const calculateDiscount = (original: number, discount: number): number => {
  return original - (original * discount) / 100;
};

export const truncateString = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneKE = (phone: string): boolean => {
  // Kenya phone format: +254xxxxxxxxx or 0xxxxxxxxx
  const phoneRegex = /^(\+254|0)[17][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};
