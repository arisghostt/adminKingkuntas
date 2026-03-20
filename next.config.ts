import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => {
    const apiUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
    ).replace(/\/+$/, "");

    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${apiUrl}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;