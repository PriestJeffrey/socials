export type LogLevel = "info" | "warn" | "error";

export type LogFields = {
  phase: number;
  component: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  meta?: Record<string, unknown>;
};

const SECRET_KEYS = /password|token|secret|authorization|cookie|ciphertext|hash/i;

function redact(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SECRET_KEYS.test(k) ? "[redacted]" : v;
  }
  return out;
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function log(fields: LogFields): void {
  const payload = {
    ...fields,
    meta: redact(fields.meta),
    ts: new Date().toISOString(),
  };
  const line = JSON.stringify(payload);
  if (fields.level === "error") console.error(line);
  else if (fields.level === "warn") console.warn(line);
  else console.info(line);
}
