import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const demoFallbackEnabled = process.env.NODE_ENV !== "production";

type DemoUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: "admin" | "seller" | "customer";
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const demoUsers: Record<string, DemoUser> = {
  "admin@nancy.test": {
    id: "demo-admin",
    email: "admin@nancy.test",
    firstName: "Nancy",
    lastName: "Admin",
    phone: "+254700000001",
    userType: "admin",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  "customer@nancy.test": {
    id: "demo-customer",
    email: "customer@nancy.test",
    firstName: "Jane",
    lastName: "Doe",
    phone: "+254712345678",
    userType: "customer",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

const demoPasswordByEmail: Record<string, string> = {
  "admin@nancy.test": "adminpass",
  "customer@nancy.test": "customerpass"
};

const createDemoToken = (email: string) => `demo-${email.replace(/[^a-zA-Z0-9]/g, "")}`;

const buildDemoUser = (user: DemoUser) => ({
  ...user,
  userType: user.userType
});

const DEMO_PRODUCTS_KEY = "nancy-motorcycle-spares-demo-products";

const initialDemoProducts = [
  {
    id: "prod-1",
    name: "Motorcycle Engine Piston",
    description: "High performance piston compatible with many models.",
    price: 4500,
    stock: 12,
    images: ["https://images.pexels.com/photos/159898/pexels-photo-159898.jpeg"],
    category: { id: "cat-engine", name: "Engine Parts", slug: "engine-parts" },
    seller: { shopName: "Nancy Motorcycle Spares" }
  },
  {
    id: "prod-2",
    name: "Front Brake Disc",
    description: "Durable front brake disc for improved stopping power.",
    price: 3200,
    stock: 20,
    images: ["https://images.pexels.com/photos/163634/pexels-photo-163634.jpeg"],
    category: { id: "cat-brakes", name: "Brakes", slug: "brakes" },
    seller: { shopName: "Nancy Motorcycle Spares" }
  }
];

let demoProducts = [...initialDemoProducts];

const loadPersistedDemoProducts = () => {
  if (typeof window === "undefined") {
    return [...initialDemoProducts];
  }

  try {
    const saved = window.localStorage.getItem(DEMO_PRODUCTS_KEY);
    if (!saved) {
      return [...initialDemoProducts];
    }
    return JSON.parse(saved) as typeof demoProducts;
  } catch {
    return [...initialDemoProducts];
  }
};

const persistDemoProducts = (products: typeof demoProducts) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DEMO_PRODUCTS_KEY, JSON.stringify(products));
  } catch {
    // ignore storage errors
  }
};

if (typeof window !== "undefined") {
  demoProducts = loadPersistedDemoProducts();
}

const demoCategories = [
  { id: "cat-engine", name: "Engine Parts", slug: "engine-parts" },
  { id: "cat-brakes", name: "Brakes", slug: "brakes" },
  { id: "cat-suspension", name: "Suspension", slug: "suspension" },
  { id: "cat-electrical", name: "Electrical", slug: "electrical" }
];

const demoUsersList = [
  { id: "user-1", name: "Jane Doe", email: "customer@nancy.test", userType: "customer", createdAt: "2026-01-15" },
  { id: "user-2", name: "Nancy Admin", email: "admin@nancy.test", userType: "admin", createdAt: "2025-12-01" }
];

const demoOrders = [
  { id: "order-1", orderNumber: "NMS-001", customer: "Jane Doe", email: "customer@nancy.test", itemsCount: 2, totalPrice: 15500, status: "delivered", createdAt: "2026-03-15" }
];

const fallbackResponse = <T,>(status: number, data: T, meta?: Record<string, unknown>) => ({
  data: {
    success: true,
    data,
    ...(meta ? { meta } : {})
  },
  status,
  statusText: "OK"
});

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Provide local demo responses when the live backend is unavailable.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const rawUrl = error?.config?.url || "";
    let fullPath = rawUrl;
    try {
      const parsedUrl = new URL(rawUrl, "http://localhost");
      fullPath = parsedUrl.pathname.replace(/^\//, "") + parsedUrl.search;
    } catch {
      fullPath = rawUrl.replace(/^\//, "");
    }
    const requestPath = fullPath.replace(/^api\//, "").split("?")[0];
    const method = (error?.config?.method || "get").toLowerCase();
    const status = error.response?.status;
    const serverError = !error.response || status >= 500;
    const shouldFallback = serverError || status === 404;

    const productReviewPath = requestPath.match(/^products\/([^/]+)\/reviews$/);
    if (demoFallbackEnabled && productReviewPath && method === "get" && shouldFallback) {
      return Promise.resolve(fallbackResponse(200, { reviews: [], rating: null, reviewCount: 0 }));
    }

    if (
      demoFallbackEnabled &&
      requestPath.match(/^products\/([^/]+)\/reviews\/me$/) &&
      method === "get" &&
      shouldFallback
    ) {
      return Promise.resolve(fallbackResponse(200, { eligible: false, review: null }));
    }

    if (status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/auth";
      }
      return Promise.reject(error);
    }

    if (!demoFallbackEnabled) {
      return Promise.reject(error);
    }

    if (requestPath === "auth/login" && method === "post" && shouldFallback) {
      const { email, password } = error.config.data ? JSON.parse(error.config.data) : {};
      const user = demoUsers[email as keyof typeof demoUsers];
      if (user && demoPasswordByEmail[email as keyof typeof demoPasswordByEmail] === password) {
        return Promise.resolve(
          fallbackResponse(200, {
            token: createDemoToken(email),
            user: buildDemoUser(user)
          })
        );
      }
      return Promise.reject(new Error("Invalid credentials"));
    }

    if (requestPath === "auth/me" && method === "get" && shouldFallback) {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        const email = token.replace("demo-", "");
        const user = demoUsers[email as keyof typeof demoUsers];
        if (user) {
          return Promise.resolve(fallbackResponse(200, buildDemoUser(user)));
        }
      }
      return Promise.reject(new Error("Not authenticated"));
    }

    if (requestPath === "products" && method === "get" && shouldFallback) {
      return Promise.resolve(fallbackResponse(200, demoProducts));
    }

    if (requestPath === "products/admin" && method === "get" && shouldFallback) {
      const params = error.config.params || {};
      const limit = Number(params.limit || 100);
      const data = demoProducts.slice(0, limit);
      return Promise.resolve(
        fallbackResponse(200, data, {
          total: demoProducts.length,
          page: 1,
          limit,
          totalPages: Math.ceil(demoProducts.length / limit)
        })
      );
    }

    if (requestPath === "products/categories" && method === "get" && shouldFallback) {
      return Promise.resolve(fallbackResponse(200, demoCategories));
    }

    if (requestPath === "users" && method === "get" && shouldFallback) {
      return Promise.resolve(fallbackResponse(200, demoUsersList));
    }

    if (requestPath === "orders" && method === "get" && serverError) {
      return Promise.resolve(fallbackResponse(200, demoOrders));
    }

    if (requestPath.startsWith("products/") && !requestPath.includes("/reviews") && method === "get" && shouldFallback) {
      const id = requestPath.split("/")[1];
      const product = demoProducts.find((p) => p.id === id);
      if (product) {
        return Promise.resolve(fallbackResponse(200, product));
      }
      return Promise.reject(error);
    }

    if (requestPath === "products" && (method === "post" || method === "put") && serverError) {
      const payload = error.config.data ? JSON.parse(error.config.data) : {};
      const created = {
        id: `prod-${Date.now()}`,
        ...payload,
        category: demoCategories.find((c) => c.id === payload.categoryId) || demoCategories[0],
        seller: { shopName: "Nancy Motorcycle Spares" }
      };
      demoProducts.unshift(created);
      persistDemoProducts(demoProducts);
      return Promise.resolve(fallbackResponse(201, created));
    }

    if (requestPath.startsWith("products/") && method === "put" && serverError) {
      const id = requestPath.split("/")[1];
      const payload = error.config.data ? JSON.parse(error.config.data) : {};
      const index = demoProducts.findIndex((product) => product.id === id);
      if (index >= 0) {
        demoProducts[index] = {
          ...demoProducts[index],
          ...payload,
          category: demoCategories.find((c) => c.id === payload.categoryId) || demoProducts[index].category,
          seller: demoProducts[index].seller
        };
        persistDemoProducts(demoProducts);
        return Promise.resolve(fallbackResponse(200, demoProducts[index]));
      }
    }

    if (requestPath.startsWith("products/") && method === "delete" && serverError) {
      const id = requestPath.split("/")[1];
      const index = demoProducts.findIndex((product) => product.id === id);
      if (index >= 0) {
        demoProducts.splice(index, 1);
        persistDemoProducts(demoProducts);
      }
      return Promise.resolve(fallbackResponse(200, { success: true }));
    }

    if (requestPath === "orders" && method === "post" && serverError) {
      const payload = error.config.data ? JSON.parse(error.config.data) : {};
      const order = {
        id: `order-${Date.now()}`,
        orderNumber: `NMS-${Date.now().toString().slice(-3)}`,
        ...payload,
        status: "pending",
        createdAt: new Date().toISOString().slice(0, 10)
      };
      demoOrders.unshift(order);
      return Promise.resolve(fallbackResponse(201, order));
    }

    if (requestPath.startsWith("orders/") && method === "put" && serverError) {
      const id = requestPath.split("/")[1];
      const payload = error.config.data ? JSON.parse(error.config.data) : {};
      const index = demoOrders.findIndex((order) => order.id === id);
      if (index >= 0) {
        demoOrders[index] = { ...demoOrders[index], ...payload };
        return Promise.resolve(fallbackResponse(200, demoOrders[index]));
      }
    }

    if (requestPath.startsWith("orders/") && method === "post" && serverError) {
      return Promise.resolve(fallbackResponse(200, { success: true }));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
