"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import apiClient from "@/lib/api";
import { products as localProducts } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import NotFoundPage from "./not-found";
import WishlistButton from "@/components/WishlistButton";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  stock: number;
  sku?: string | null;
  rating?: number | null;
  reviewCount?: number;
  category?: { name: string } | string;
  seller: { shopName: string };
}

interface ProductReview {
  id: string;
  rating: number;
  comment: string | null;
  reviewer: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailClient({ productId }: { productId: string }) {
  const { addItem } = useCart();
  const { token, user, isReady } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewEligible, setReviewEligible] = useState(false);
  const [reviewEligibilityLoading, setReviewEligibilityLoading] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewListError, setReviewListError] = useState("");
  const [reviewEligibilityError, setReviewEligibilityError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    let active = true;

    const loadProduct = async () => {
      setLoading(true);
      setNotFound(false);
      setLoadError("");
      setActiveImageIndex(0);
      setFailedImages([]);
      setAddedToCart(false);
      if (!productId) {
        setProduct(null);
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(`/products/${productId}`);
        const apiProduct = response.data?.data as Product | null;
        if (active && apiProduct) {
          setProduct(apiProduct);
          setLoading(false);
          return;
        }
        if (active && process.env.NODE_ENV === "production") {
          setNotFound(true);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.warn("Product API fetch failed, falling back to local product data", error);
        if (active && process.env.NODE_ENV === "production") {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            setNotFound(true);
          } else {
            setLoadError("We couldn’t load this product right now. Check your connection and try again.");
          }
          setLoading(false);
          return;
        }
      }

      const local = localProducts.find((item) => item.id === productId);
      if (!active) return;

      if (local) {
        setProduct(local as Product);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };

    loadProduct();

    return () => {
      active = false;
    };
  }, [productId, retryCount]);

  useEffect(() => {
    let active = true;
    apiClient.get(`/products/${productId}/reviews`)
      .then((response) => {
        if (!active) return;
        const data = response.data?.data;
        setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
        setAverageRating(typeof data?.rating === "number" ? data.rating : null);
        setReviewCount(Number(data?.reviewCount) || 0);
      })
      .catch(() => {
        if (active) setReviewListError("Reviews could not be loaded. Please try again later.");
      });
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    let active = true;
    setReviewEligibilityLoading(false);
    setReviewEligible(false);
    setReviewEligibilityError("");
    setReviewRating(0);
    setReviewComment("");

    if (!isReady || user?.userType !== "customer" || !token) {
      return () => {
        active = false;
      };
    }

    if (token.startsWith("demo-")) {
      setReviewEligibilityError("Verified reviews require an account connected to the live backend.");
      return () => {
        active = false;
      };
    }

    setReviewEligibilityLoading(true);
    apiClient.get(`/products/${productId}/reviews/me`)
      .then((response) => {
        if (!active) return;
        const data = response.data?.data;
        setReviewEligible(Boolean(data?.eligible));
        if (data?.review) {
          setReviewRating(data.review.rating);
          setReviewComment(data.review.comment || "");
        }
      })
      .catch(() => {
        if (active) setReviewEligibilityError("Your review eligibility could not be checked. Please try again.");
      })
      .finally(() => {
        if (active) setReviewEligibilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId, isReady, token, user?.userType]);

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewRating) {
      setReviewError("Choose a star rating before submitting.");
      return;
    }

    setReviewSaving(true);
    setReviewError("");
    setReviewMessage("");
    try {
      const response = await apiClient.post(`/products/${productId}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined
      });
      const result = response.data?.data;
      setReviewMessage("Your review has been saved.");
      setAverageRating(typeof result?.rating === "number" ? result.rating : null);
      setReviewCount(Number(result?.reviewCount) || 0);

      try {
        const reviewsResponse = await apiClient.get(`/products/${productId}/reviews`);
        const data = reviewsResponse.data?.data;
        setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
        setAverageRating(typeof data?.rating === "number" ? data.rating : null);
        setReviewCount(Number(data?.reviewCount) || 0);
        setReviewListError("");
      } catch {
        setReviewListError("Your review was saved, but the review list could not be refreshed.");
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error
        : null;
      setReviewError(typeof message === "string" ? message : "Your review could not be saved. Please try again.");
    } finally {
      setReviewSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-xl text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Loading product</p>
          <h1 className="mt-6 text-4xl font-bold text-slate-900">Please wait while we load the details</h1>
        </div>
      </main>
    );
  }

  if (notFound || !product) {
    if (loadError) {
      return (
        <main className="min-h-screen bg-slate-50 py-16">
          <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 text-center shadow-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-red-600">Product unavailable</p>
            <h1 className="mt-6 text-3xl font-bold text-slate-900">{loadError}</h1>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="rounded-3xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Try again
              </button>
              <Link
                href="/products"
                className="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600"
              >
                Back to products
              </Link>
            </div>
          </div>
        </main>
      );
    }
    return <NotFoundPage />;
  }

  const categoryName = typeof product.category === "string" ? product.category : product.category?.name;
  const productImages = product.images?.filter((image) => typeof image === "string" && image.length > 0) ?? [];
  const selectedImage = productImages[activeImageIndex];
  const activeImage = selectedImage && !failedImages.includes(selectedImage) ? selectedImage : "/placeholder-product.svg";
  const isAvailable = product.stock > 0;

  const markImageFailed = (src: string) => {
    setFailedImages((images) => images.includes(src) ? images : [...images, src]);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.24em] text-red-600">Product details</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{product.name}</h1>
            <p className="mt-2 text-sm text-slate-600">Sold by {product.seller.shopName}</p>
          </div>
          <Link href="/products" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-red-500 hover:text-red-600">
            ← Back to products
          </Link>
        </div>

        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <section aria-label="Product images" className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-50">
              <Image
                src={activeImage}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 767px) 100vw, (max-width: 1152px) 58vw, 700px"
                className="object-contain p-4 sm:p-6"
                onError={() => {
                  if (selectedImage) markImageFailed(selectedImage);
                }}
              />
            </div>
            {productImages.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1" aria-label="Choose product image">
                {productImages.map((src, index) => !failedImages.includes(src) && (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      aria-label={`Show product image ${index + 1}`}
                      aria-pressed={activeImageIndex === index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 transition sm:h-24 sm:w-24 ${
                        activeImageIndex === index ? "border-red-600" : "border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-contain p-2"
                        onError={() => markImageFailed(src)}
                      />
                    </button>
                  ))}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Category</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{categoryName || "Parts"}</p>
                </div>
                <div className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${isAvailable ? "bg-emerald-700" : "bg-slate-500"}`}>
                  {isAvailable ? `${product.stock} in stock` : "Out of stock"}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Price</p>
                <p className="mt-2 text-3xl font-bold text-red-600 sm:text-4xl">
                  KES {product.price.toLocaleString("en-KE")}
                </p>
                {product.sku && <p className="mt-3 text-xs text-slate-500">Item code: {product.sku}</p>}
              </div>

              <div className="mt-5">
                <WishlistButton
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    images: product.images,
                    category: product.category,
                    seller: product.seller
                  }}
                />
              </div>

              {isAvailable ? (
                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      addItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: 1,
                        image: product.images?.[0]
                      });
                      setAddedToCart(true);
                    }}
                    aria-live="polite"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-red-600 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                  >
                    {addedToCart ? "Added to cart" : "Add to cart"}
                  </button>
                  <Link
                    href={`/checkout?product=${product.id}`}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                  >
                    Buy now
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl bg-slate-300 px-6 py-4 text-sm font-semibold text-slate-600"
                >
                  Out of stock
                </button>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Product Description</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{product.description || "A motorcycle spare part selected for reliable performance and value from Nancy Motorcycle Spares."}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Payment</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">Cash on delivery</p>
          </div>
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Delivery</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">Delivery across Kenya</p>
          </div>
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Seller</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{product.seller.shopName}</p>
          </div>
        </div>

        <section aria-labelledby="product-reviews-heading" className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Customer feedback</p>
              <h2 id="product-reviews-heading" className="mt-2 text-2xl font-semibold text-slate-900">Reviews &amp; ratings</h2>
            </div>
            <p className="text-sm text-slate-600" aria-live="polite">
              {averageRating !== null
                ? <><span className="font-semibold text-amber-600">★ {averageRating.toFixed(1)} / 5</span> · {reviewCount} {reviewCount === 1 ? "review" : "reviews"}</>
                : "No ratings yet"}
            </p>
          </div>

          {isReady && user?.userType === "customer" && token ? (
            <div className="mt-6">
              {token.startsWith("demo-") ? (
                <p className="text-sm text-amber-800">{reviewEligibilityError || "Verified reviews require an account connected to the live backend."}</p>
              ) : reviewEligibilityLoading ? (
                <p className="text-sm text-slate-600">Checking your order eligibility…</p>
              ) : reviewEligibilityError ? (
                <p role="alert" className="text-sm text-red-700">{reviewEligibilityError}</p>
              ) : reviewEligible ? (
                <form onSubmit={submitReview} className="space-y-4 rounded-2xl bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900">{reviewRating ? "Update your review" : "Rate this product"}</h3>
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-slate-700">Your rating</legend>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                          aria-pressed={reviewRating === rating}
                          onClick={() => setReviewRating(rating)}
                          className={`text-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${rating <= reviewRating ? "text-amber-500" : "text-slate-300"}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label className="block text-sm font-medium text-slate-700">
                    Comment (optional)
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      maxLength={2000}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
                      placeholder="Share your experience with this part"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={reviewSaving || reviewRating === 0}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {reviewSaving ? "Saving review…" : reviewRating ? "Save review" : "Choose a rating"}
                  </button>
                  {reviewMessage && <p role="status" className="text-sm text-emerald-700">{reviewMessage}</p>}
                  {reviewError && <p role="alert" className="text-sm text-red-700">{reviewError}</p>}
                </form>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
                  You can leave a review after an order containing this product has been marked delivered.
                </p>
              )}
            </div>
          ) : isReady ? (
            <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
              <Link href="/auth" className="font-semibold text-red-600 hover:text-red-700">Sign in as a customer</Link> to review this product after delivery.
            </p>
          ) : null}

          <div className="mt-6 space-y-4">
            {reviewListError && <p role="alert" className="text-sm text-red-700">{reviewListError}</p>}
            {reviews.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No reviews yet. Be the first to share your experience after delivery.</p>
            ) : reviews.map((review) => (
              <article key={review.id} className="border-b border-slate-100 pb-4 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">{review.reviewer}</h3>
                  <time dateTime={review.createdAt} className="text-sm text-slate-500">
                    {new Date(review.createdAt).toLocaleDateString("en-KE")}
                  </time>
                </div>
                <p className="mt-1 text-amber-500" aria-label={`${review.rating} out of 5 stars`}>
                  {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                </p>
                {review.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{review.comment}</p>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
