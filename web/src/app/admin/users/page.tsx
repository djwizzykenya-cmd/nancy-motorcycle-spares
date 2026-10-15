"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import Link from "next/link";
import axios from "axios";

interface User {
  id: string;
  name: string;
  email: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

function AdminUsersContent() {
  const { user, isReady } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

    if (!user || user.userType !== "admin") {
      router.replace("/");
      return;
    }

    let mounted = true;
    const loadUsers = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await apiClient.get("/users");
        const records = response.data?.data;
        if (!Array.isArray(records)) {
          throw new Error("The users response was not a list.");
        }

        const normalizedUsers = records.map((record: Record<string, unknown>, index: number) => {
          const firstName = typeof record.firstName === "string" ? record.firstName.trim() : "";
          const lastName = typeof record.lastName === "string" ? record.lastName.trim() : "";
          const email = typeof record.email === "string" ? record.email : "";
          const name = [firstName, lastName].filter(Boolean).join(" ")
            || (typeof record.name === "string" ? record.name : "")
            || email
            || "Unnamed user";

          return {
            id: typeof record.id === "string" ? record.id : `${email || "user"}-${index}`,
            name,
            email: email || "No email provided",
            userType: typeof record.userType === "string" ? record.userType.toLowerCase() : "unknown",
            isActive: record.isActive === true,
            createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
            lastLoginAt: typeof record.lastLoginAt === "string" ? record.lastLoginAt : null,
            orderCount: typeof record.orderCount === "number" && Number.isFinite(record.orderCount)
              ? record.orderCount
              : 0,
            totalSpent: typeof record.totalSpent === "number" && Number.isFinite(record.totalSpent)
              ? record.totalSpent
              : 0,
            lastOrderAt: typeof record.lastOrderAt === "string" ? record.lastOrderAt : null
          };
        });

        if (mounted) setUsers(normalizedUsers);
      } catch {
        if (mounted) {
          setUsers([]);
          setLoadError("We couldn't load users. Check your connection and try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadUsers();

    return () => {
      mounted = false;
    };
  }, [isReady, user, router, reloadKey]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase())
      || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || u.userType === filterType;
    return matchesSearch && matchesFilter;
  });

  const getUserBadgeColor = (type: string) => {
    switch (type) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "customer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (value: string | null, includeTime = false) => {
    if (!value || Number.isNaN(Date.parse(value))) return "—";
    return new Date(value).toLocaleString(undefined, includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" });
  };

  const deleteUser = async (target: User) => {
    if (target.userType !== "customer" || deletingUserId) return;
    const confirmed = window.confirm(
      `Permanently delete ${target.name} (${target.email})? This also deletes their cart, wishlist, reviews, and all order/payment history. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingUserId(target.id);
    setDeleteError(null);
    try {
      await apiClient.delete(`/users/${encodeURIComponent(target.id)}`);
      setUsers((current) => current.filter((candidate) => candidate.id !== target.id));
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.error
        : requestError instanceof Error
          ? requestError.message
          : undefined;
      setDeleteError(
        typeof message === "string" && message
          ? message
          : `Could not delete ${target.name}. Please try again.`
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  if (!isReady || !user || user.userType !== "admin") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-20">
        <div className="rounded-3xl bg-white p-10 shadow-lg text-center">
          <p className="text-lg font-semibold text-slate-900">Checking admin access...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        {/* Header */}
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-purple-600">Admin Users</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">User Management</h1>
              <p className="mt-2 text-sm text-slate-500">Manage customer and admin accounts.</p>
            </div>
            <Link
              href="/admin"
              className="rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {/* Users Management */}
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  aria-label="Search users by name or email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              >
                <option value="all">All Users</option>
                <option value="customer">Customers</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            {/* Users List */}
            {deleteError && (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
                {deleteError}
              </div>
            )}
            {loading ? (
              <div className="py-12 text-center text-slate-500" role="status">Loading users...</div>
            ) : loadError ? (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center">
                <p className="font-semibold text-red-900">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  className="mt-4 rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
                >
                  Try again
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                {users.length === 0 ? "No users have registered yet." : "No users match your search."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Marketplace users">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Joined</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Last sign-in</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Orders</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Last order</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Order total</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-slate-900 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getUserBadgeColor(u.userType)}`}>
                            {u.userType ? u.userType.charAt(0).toUpperCase() + u.userType.slice(1) : "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {u.lastLoginAt ? formatDate(u.lastLoginAt, true) : "No sign-in recorded"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{u.orderCount}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(u.lastOrderAt)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          KES {u.totalSpent.toLocaleString("en-KE")}
                        </td>
                        <td className="px-4 py-3">
                          {u.userType === "customer" ? (
                            <button
                              type="button"
                              onClick={() => void deleteUser(u)}
                              disabled={deletingUserId !== null}
                              aria-label={`Delete ${u.name}`}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingUserId === u.id ? "Deleting…" : "Delete"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.userType === "customer").length}</p>
                <p className="text-sm text-slate-500 mt-1">👥 Customers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                <p className="text-sm text-slate-500 mt-1">📊 Customers and admins</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminUsersPage() {
  return <AdminUsersContent />;
}
