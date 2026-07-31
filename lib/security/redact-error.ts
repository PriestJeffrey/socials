import { redactSecrets } from "@/lib/ai/redact";

/** Surface API/publish errors to users/jobs without leaking tokens. */
export function redactErrorMessage(message: string): string {
  return redactSecrets(message)
    .replace(/([?&]access_token=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/\bEAA[A-Za-z0-9]+/g, "[REDACTED]")
    .slice(0, 500);
}

export function toSafeErrorMessage(err: unknown, fallback = "Publish failed"): string {
  const raw = err instanceof Error ? err.message : fallback;
  return redactErrorMessage(raw || fallback);
}
