import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { clock } from "@/lib/clock";

const TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET required for OAuth state (min 16 chars)");
  }
  return s;
}

/**
 * Signed OAuth state (CSRF). Phase 1 Meta flows call create/verify.
 * Payload: userId.timestamp.nonce.sig
 */
export function createOAuthState(userId: string): {
  state: string;
  expiresAt: Date;
} {
  const ts = clock.now().getTime();
  const nonce = randomBytes(16).toString("base64url");
  const body = `${userId}.${ts}.${nonce}`;
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return {
    state: `${body}.${sig}`,
    expiresAt: new Date(ts + TTL_MS),
  };
}

export function verifyOAuthState(state: string): { userId: string } | null {
  const parts = state.split(".");
  if (parts.length !== 4) return null;
  const [userId, tsRaw, nonce, sig] = parts;
  if (!userId || !tsRaw || !nonce || !sig) return null;

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return null;
  if (clock.now().getTime() - ts > TTL_MS) return null;

  const body = `${userId}.${tsRaw}.${nonce}`;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { userId };
}
