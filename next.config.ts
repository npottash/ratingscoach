import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry build-time config. Source-map upload only runs when SENTRY_AUTH_TOKEN
// is set (CI / Vercel); local builds without it skip upload silently.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: "the-ratings-coach",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // Route Sentry ingestion through our own domain to dodge ad blockers.
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
