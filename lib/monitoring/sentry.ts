/**
 * Optional Sentry wiring - no-op unless SENTRY_DSN is set.
 * Keeps Phase 8 monitoring seam without forcing a paid SDK in V1.
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) {
    if (process.env.LOG_LEVEL === "debug") {
      console.error("[sentry-stub]", err, context);
    }
    return;
  }
  // Human can swap this stub for @sentry/nextjs init in a follow-up.
  console.error("[sentry]", err instanceof Error ? err.message : err, {
    dsnConfigured: true,
    ...context,
  });
}

export function sentryConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim());
}
