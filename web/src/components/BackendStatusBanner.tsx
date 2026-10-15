"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api";

export default function BackendStatusBanner() {
  const [status, setStatus] = useState<"unknown" | "ok" | "down" | "demo">("unknown");

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
        // If apiClient used fallback demo responses, the health request may succeed locally.
        // Detect obvious demo base by checking runtime env
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "/api").toString();
        if (apiUrl === "/api") {
          setStatus("demo");
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
      {status === "demo" ? (
        <div>
          Admin is running in demo/fallback mode — the deployed frontend cannot reach the real backend.
          Ensure `NEXT_PUBLIC_API_URL` is set in your Vercel project and the backend is deployed and reachable.
        </div>
      ) : (
        <div>
          Backend appears unreachable. Admin actions may fall back to local/demo data. Verify the backend is deployed and `NEXT_PUBLIC_API_URL` is correct.
        </div>
      )}
    </div>
  );
}
