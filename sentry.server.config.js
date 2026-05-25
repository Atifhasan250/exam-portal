// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const configuredSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE);
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
