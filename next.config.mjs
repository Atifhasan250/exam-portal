import { withSentryConfig } from '@sentry/nextjs';
import path from 'node:path'

function hostnameFromUrl(value) {
  if (!value) return null

  try {
    return new URL(value).hostname
  } catch {
    return null
  }
}

const imageKitHost = hostnameFromUrl(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT)
const sentryDsnHost = hostnameFromUrl(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN)
const imageKitFrameSrc = [
  'https://ik.imagekit.io',
  'https://*.imagekit.io',
  imageKitHost ? `https://${imageKitHost}` : '',
].filter(Boolean).join(' ')
const sentryConnectSrc = [
  'https://*.ingest.sentry.io',
  'https://*.ingest.us.sentry.io',
  sentryDsnHost ? `https://${sentryDsnHost}` : '',
].filter(Boolean).join(' ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      { protocol: 'https', hostname: '**.imagekit.io' },
      imageKitHost ? { protocol: 'https', hostname: imageKitHost } : null,
    ].filter(Boolean),
  },
  async headers() {
    const allowUnsafeEval = process.env.NODE_ENV !== 'production'
    const scriptSrc = [
      "script-src 'self' 'unsafe-inline'",
      allowUnsafeEval ? "'unsafe-eval'" : '',
      // Clerk dev environment
      'https://*.clerk.accounts.dev',
      // Clerk production CDN (used when production keys are active)
      'https://*.clerk.com',
      'https://clerk.com',
      'https://www.youtube.com',
      'https://s.ytimg.com',
    ].filter(Boolean).join(' ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Enforce HTTPS for 1 year (production only — dev uses HTTP)
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          }] : []),
          // Disable unused browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Content Security Policy
          // unsafe-inline / unsafe-eval required for Next.js, GSAP, and Three.js
          // Clerk JS is loaded from *.clerk.accounts.dev — must be in script-src
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Clerk loads its JS bundle from the project's Clerk CDN subdomain
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
              "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com data:",
              // Clerk user avatars come from img.clerk.com and Google/social providers
              "img-src 'self' data: blob: https:",
              // Clerk API, WebSocket, and Vercel analytics
              `connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.dev wss://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.com wss://*.clerk.com https://*.vercel-insights.com https://upload.imagekit.io https://ik.imagekit.io https://*.imagekit.io ${sentryConnectSrc}`,
              "worker-src 'self' blob:",
              `frame-src https://*.clerk.accounts.dev https://*.clerk.com https://www.youtube.com https://www.youtube-nocookie.com ${imageKitFrameSrc}`,
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "fr-softwares-uj",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
