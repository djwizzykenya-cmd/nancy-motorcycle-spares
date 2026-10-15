"use client";

import Image from "next/image";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images: string[];
  category: Category;
  seller: { shopName: string };
}

function AdminProductsContent() {
  const { user, isReady } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    categoryId: "",
    price: "",
    stock: "",
    images: ""
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Upload tasks track per-file progress and allow retrying failed uploads.
  const [uploadTasks, setUploadTasks] = useState<Array<{
    id: string;
    name: string;
    file: File | null;
    progress: number;
    status: "pending" | "uploading" | "success" | "error";
    url?: string;
    error?: string;
  }>>([]);
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      router.replace("/auth");
      return;
    }

    if (user.userType !== "admin") {
      router.replace("/");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          apiClient.get("/products/admin?limit=100"),
          apiClient.get("/products/categories")
        ]);

        setProducts(productsRes.data.data || []);
        setCategories(categoriesRes.data.data || []);
      } catch (err) {
        console.error(err);
        setLoadError("Could not load products and categories. Check the API connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isReady, user, router, reloadCount]);

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormState({
      name: product.name,
      description: product.description || "",
      categoryId: product.category.id,
      price: product.price.toString(),
      stock: product.stock.toString(),
      images: ""
    });
    setUploadedImages(product.images);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const normalizeProduct = (product: Product & { categoryId?: string }): Product => {
    const category =
      product?.category && typeof product.category === "object"
        ? product.category
        : categories.find((item) => item.id === product?.categoryId || item.id === product?.category?.id) || {
            id: product?.categoryId || "uncategorized",
            name: "Uncategorized",
            slug: "uncategorized"
          };

    const seller =
      product?.seller && typeof product.seller === "object"
        ? product.seller
        : { shopName: "Nancy Motorcycle Spares" };

    return {
      ...product,
      images: Array.isArray(product?.images) ? product.images : [],
      category,
      seller
    };
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormState({
      name: "",
      description: "",
      categoryId: "",
      price: "",
      stock: "",
      images: ""
    });
    setUploadedImages([]);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await apiClient.delete(`/products/${productId}`);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      if (editingId === productId) handleCancel();
      setSuccess("Product deleted successfully.");
    } catch (err) {
      console.error(err);
      setError("Could not delete product.");
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const selectedFiles = Array.from(files);
    e.target.value = "";

    if (uploadedImages.length + selectedFiles.length > 5) {
      setError("Upload no more than 5 product images.");
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFile) {
      setError("Each image must be 5 MB or smaller.");
      return;
    }

    setError("");

    // Prepare per-file tasks and keep the File objects so we can retry if needed.
    const tasks = selectedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      file,
      progress: 0,
      status: "pending" as const
    }));

    setUploadTasks((prev) => [...prev, ...tasks]);
    setUploadingImages(true);

    const uploadSingle = async (taskId: string) => {
      const task = uploadTasks.find((t) => t.id === taskId) || tasks.find((t) => t.id === taskId);
      if (!task || !task.file) return;

      // mark uploading
      setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "uploading", progress: 0 } : t)));

      const formData = new FormData();
      formData.append("images", task.file);

      try {
        const response = await apiClient.post("/uploads/images", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent: any) => {
            const loaded = progressEvent.loaded ?? 0;
            const total = progressEvent.total ?? 0;
            if (!total) return;
            const prog = Math.round((loaded / total) * 100);
            setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress: prog } : t)));
          }
        });

        const imageUrls = response.data?.data?.images;
        const url = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : undefined;
        if (!url) throw new Error("Image storage returned an invalid response.");

        setUploadedImages((prev) => [...prev, url]);
        setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "success", progress: 100, url } : t)));
      } catch (err) {
        console.error(err);
        const message = axios.isAxiosError(err)
          ? err.response?.data?.error || err.message
          : err instanceof Error
            ? err.message
            : "Upload failed";
        setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "error", error: message } : t)));
        setError(message || "Image upload failed. Please try again.");
      }
    };

    // Upload in parallel but limit concurrency to avoid saturating the server (3 at a time)
    const concurrency = 3;
    const queue = [...tasks];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i++) {
      const worker = (async () => {
        while (queue.length > 0) {
          const t = queue.shift();
          if (!t) break;
          await uploadSingle(t.id);
        }
      })();
      workers.push(worker);
    }

    await Promise.all(workers);
    setUploadingImages(false);
  };

  const retryUpload = async (taskId: string) => {
    const task = uploadTasks.find((t) => t.id === taskId);
    if (!task || !task.file) return;
    // reset error and retry
    setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "pending", error: undefined, progress: 0 } : t)));

    // call the same uploadSingle logic by emulating selection: create a small uploader
    setUploadingImages(true);
    const formData = new FormData();
    formData.append("images", task.file);
    try {
      setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "uploading", progress: 0 } : t)));
      const response = await apiClient.post("/uploads/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: any) => {
          const loaded = progressEvent.loaded ?? 0;
          const total = progressEvent.total ?? 0;
          if (!total) return;
          const prog = Math.round((loaded / total) * 100);
          setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress: prog } : t)));
        }
      });

      const imageUrls = response.data?.data?.images;
      const url = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls[0] : undefined;
      if (!url) throw new Error("Image storage returned an invalid response.");

      setUploadedImages((prev) => [...prev, url]);
      setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "success", progress: 100, url } : t)));
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : "Upload failed";
      setUploadTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "error", error: message } : t)));
      setError(message || "Image upload failed. Please try again.");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    if (
      !formState.name.trim() ||
      !formState.categoryId ||
      !formState.price.trim() ||
      !formState.stock.trim()
    ) {
      setError("Please fill in all required fields before saving.");
      setSaving(false);
      return;
    }

    const price = Number(formState.price);
    const stock = Number(formState.stock);
    if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      setError("Enter a valid price greater than 0 and a whole-number stock quantity of 0 or more.");
      setSaving(false);
      return;
    }

    try {
      const images = uploadedImages.length > 0
        ? uploadedImages
        : formState.images
            .split(",")
            .map((url) => url.trim())
            .filter(Boolean);

      if (images.length === 0) {
        setError("Please upload or provide at least one image.");
        setSaving(false);
        return;
      }

      const payload = {
        name: formState.name.trim(),
        description: formState.description.trim(),
        categoryId: formState.categoryId,
        price,
        stock,
        images
      };

      if (editingId) {
        const response = await apiClient.put(`/products/${editingId}`, payload);
        const updated = normalizeProduct(response.data.data);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        setSuccess("Product updated successfully.");
        setTimeout(handleCancel, 1200);
      } else {
        const response = await apiClient.post("/products", payload);
        const created = normalizeProduct(response.data.data);
        setProducts((prev) => [created, ...prev]);
        setSuccess("Product added successfully.");
        setFormState({
          name: "",
          description: "",
          categoryId: "",
          price: "",
          stock: "",
          images: ""
        });
        setUploadedImages([]);
      }
    } catch (err) {
      console.error(err);
      setError(editingId ? "Could not update product. Check the fields and try again." : "Could not add product. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isReady || !user) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-20">
        <div className="rounded-3xl bg-white p-10 shadow-lg text-center">
          <p className="text-lg font-semibold text-slate-900">Checking admin access...</p>
        </div>
      </main>
    );
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = [product.name, product.description, product.category.name]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? product.category.id === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = products.filter((product) => product.stock <= 5).length;

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-red-600">Admin Products</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Product Catalog Management</h1>
              <p className="mt-2 text-sm text-slate-500">Add, edit, and organize products for the marketplace.</p>
            </div>
            <Link
              href="/admin"
              className="rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200"
            >
              Back to Admin
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 p-5 shadow-sm border border-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Products</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{products.length}</p>
              <p className="mt-2 text-sm text-slate-500">Total inventory items</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 shadow-sm border border-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Categories</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{categories.length}</p>
              <p className="mt-2 text-sm text-slate-500">Available product categories</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 shadow-sm border border-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Low stock</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{lowStockProducts}</p>
              <p className="mt-2 text-sm text-slate-500">Products with 5 or fewer units</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Products by Category</h2>
                <p className="mt-2 text-sm text-slate-500">Search and filter the product catalog before editing.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_280px] w-full">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products, categories, or descriptions..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 space-y-8">
              {loading ? (
                <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">Loading products…</div>
              ) : loadError ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700" role="alert">
                  <p>{loadError}</p>
                  <button
                    type="button"
                    onClick={() => setReloadCount((count) => count + 1)}
                    className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Try again
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-3xl bg-slate-50 p-6 text-slate-500">
                  <p className="font-semibold text-slate-900">No products match your search.</p>
                  <p className="mt-2 text-sm text-slate-500">Try clearing the search, changing the category filter, or add a new product below.</p>
                </div>
              ) : (
                categories.map((category) => {
                  const categoryProducts = filteredProducts.filter((p) => p.category.id === category.id);
                  if (categoryProducts.length === 0) return null;

                  return (
                    <div key={category.id} className="border-t border-slate-200 pt-6 first:border-t-0 first:pt-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-600"></div>
                            <h3 className="text-lg font-bold text-slate-900">{category.name}</h3>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">{categoryProducts.length} item{categoryProducts.length > 1 ? "s" : ""} found</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                          {categoryProducts.length} products
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {categoryProducts.map((product) => (
                          <div
                            key={product.id}
                            className="grid gap-4 rounded-3xl border border-slate-200 p-4 md:grid-cols-[1fr_auto] md:items-center hover:border-red-300 hover:bg-red-50 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-20 h-20 overflow-hidden rounded-2xl bg-slate-100 border border-slate-200">
                                <Image
                                  src={product.images?.[0] || "/placeholder-product.svg"}
                                  alt={product.name}
                                  width={80}
                                  height={80}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900">{product.name}</h4>
                                <p className="mt-2 text-sm text-slate-500 line-clamp-2">{product.description || "No description added."}</p>
                                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">KES {product.price.toLocaleString()}</span>
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Stock: {product.stock}</span>
                                  <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">{product.category.name}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEdit(product)}
                                className="rounded-full border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="rounded-full border border-red-500 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl h-fit">
            <h2 className="text-xl font-semibold text-slate-900">{editingId ? "Edit Product" : "Add Product"}</h2>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={formState.categoryId}
                  onChange={(e) => handleChange("categoryId", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={formState.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                  placeholder="Add a short product description"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Price</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formState.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Stock</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formState.stock}
                    onChange={(e) => handleChange("stock", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Product Images</label>
                <div className="mt-2">
                  <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-red-400 hover:bg-red-50 transition">
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">📷 Click to upload images</p>
                      <p className="text-xs text-slate-500 mt-1">JPEG, PNG, WebP or GIF; up to 5 MB each, 5 images total</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingImages || saving}
                    />
                  </label>
                </div>

                {uploadTasks.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">Uploading ({uploadTasks.length})</p>
                    <div className="space-y-3">
                      {uploadTasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-slate-700 truncate">{t.name}</div>
                              <div className="text-xs text-slate-500">{t.status}</div>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded overflow-hidden mt-2">
                              <div style={{ width: `${t.progress}%` }} className="h-2 bg-red-600" />
                            </div>
                            {t.error && <div className="text-xs text-red-600 mt-1">{t.error}</div>}
                          </div>
                          {t.status === "error" ? (
                            <button
                              type="button"
                              onClick={() => retryUpload(t.id)}
                              className="rounded-full bg-yellow-500 px-3 py-1 text-xs text-white"
                            >
                              Retry
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadedImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">Uploaded Images ({uploadedImages.length})</p>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedImages.map((image, idx) => (
                        <div key={idx} className="relative group">
                          <Image
                            src={image}
                            alt={`Product ${idx + 1}`}
                            width={160}
                            height={80}
                            className="w-full h-20 object-cover rounded-lg border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-500 mt-2">Or paste image URLs below separated by commas</p>
                <input
                  type="text"
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                  value={formState.images}
                  onChange={(e) => handleChange("images", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 text-xs outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              {uploadingImages && <p className="text-sm text-slate-500">Uploading images to secure storage…</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-emerald-600">{success}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || uploadingImages}
                  className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {uploadingImages ? "Uploading images…" : saving ? "Saving…" : editingId ? "Update Product" : "Add Product"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminProductsPage() {
  return <AdminProductsContent />;
}
