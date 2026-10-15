"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api";

export default function BackendStatusBanner() {
  const [status, setStatus] = useState<"unknown" | "ok" | "down" | "notConfigured">("unknown");

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const res = await apiClient.get("/health");
        if (!mounted) return;
        if (res?.data?.data?.success || res?.data?.success) {
          setStatus("ok");
        } else {
          setStatus("down");
        }
      } catch {
        if (!mounted) return;
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "/api").toString();
        if (apiUrl === "/api") {
          setStatus("notConfigured");
        } else {
          setStatus("down");
        }
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "unknown") return null;

  if (status === "ok") {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm text-yellow-800 rounded-md mb-4">
      {status === "notConfigured" ? (
        <div>
          The backend API is not configured. Admin features are unavailable until the API is deployed and `NEXT_PUBLIC_API_URL` is set.
        </div>
      ) : (
        <div>
          The backend API is unreachable. Admin features are unavailable; verify the API deployment and `NEXT_PUBLIC_API_URL`.
        </div>
      )}
    </div>
  );
}
