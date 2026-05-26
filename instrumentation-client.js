// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
  api_host: '/ingest',
  ui_host: 'https://us.posthog.com',
  defaults: '2026-01-30',
  capture_exceptions: false,
  capture_performance: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_surveys_automatic_display: true,
  capture_dead_clicks: false,
  disable_external_dependency_loading: true,
  debug: false,
});

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
