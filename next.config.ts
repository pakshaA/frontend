import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

/** Инлайнится при сборке — в Service Worker нет process.env */
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: false,
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: ({ request }: { request: Request }) =>
          request.destination === "style" ||
          request.destination === "script" ||
          request.destination === "font" ||
          request.destination === "image",
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 128,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
      {
        urlPattern: ({ url }: { url: URL }) =>
          url.pathname.startsWith("/api") ||
          url.hostname.includes("localhost") ||
          url.pathname.includes("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "api-network-first",
          networkTimeoutSeconds: 8,
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 60 * 60,
          },
        },
      },
      ...(PUBLIC_API_URL
        ? [
            {
              urlPattern: ({ url }: { url: URL }) =>
                url.href.startsWith(PUBLIC_API_URL),
              handler: "NetworkFirst" as const,
              options: {
                cacheName: "backend-api",
                networkTimeoutSeconds: 8,
                expiration: {
                  maxEntries: 64,
                  maxAgeSeconds: 60 * 30,
                },
              },
            },
          ]
        : []),
    ],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
