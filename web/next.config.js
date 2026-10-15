/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  turbopack: {
    root: __dirname
  },
  async rewrites() {
    // If NEXT_PUBLIC_API_URL is set, assume API URL is managed via env and
    // do not apply a development-only proxy rewrite (Vercel will route
    // directly using the provided API URL).
    if (process.env.NEXT_PUBLIC_API_URL) return [];

    // Only apply the local proxy during development when no API env var is set.
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:5000/api/:path*"
        }
      ];
    }

    return [];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

module.exports = nextConfig;
