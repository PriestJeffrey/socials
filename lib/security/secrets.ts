/**
 * Reject known placeholder / weak secrets (gstack harden).
 * Used for SESSION_SECRET, CRON_SECRET, and similar.
 */
const KNOWN_PLACEHOLDERS = new Set(
  [
    "replace-with-long-random-string-min-32-chars",
    "dev-cron-secret-change-me",
    "change-me",
    "changeme",
    "secret",
    "password",
    "cron-secret",
    "session-secret",
    "test-session-secret-min-32-characters-long", // allow in tests only via bypass
  ].map((s) => s.toLowerCase()),
);

/** Placeholders that must never be used outside vitest / NODE_ENV=test. */
const ALWAYS_REJECT = new Set(
  [
    "replace-with-long-random-string-min-32-chars",
    "dev-cron-secret-change-me",
    "change-me",
    "changeme",
    "secret",
    "password",
    "cron-secret",
    "session-secret",
  ].map((s) => s.toLowerCase()),
);

export function isWeakSecret(value: string | undefined | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (trimmed.length < 16) return true;
  const lower = trimmed.toLowerCase();
  if (ALWAYS_REJECT.has(lower)) return true;
  if (
    process.env.NODE_ENV !== "test" &&
    KNOWN_PLACEHOLDERS.has(lower)
  ) {
    return true;
  }
  return false;
}

export function requireStrongSecret(
  name: string,
  value: string | undefined | null,
): string {
  if (isWeakSecret(value)) {
    throw new Error(
      `${name} is missing, too short (<16), or a known placeholder - set a strong random value`,
    );
  }
  return value!.trim();
}
