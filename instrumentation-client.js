// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const configuredSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE);
const tracesSampleRate = process.env.NODE_ENV === "production"
  ? (Number.isFinite(configuredSampleRate) ? configuredSampleRate : 0.1)
  : 1;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate,
    enableLogs: process.env.NODE_ENV !== "production",
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
