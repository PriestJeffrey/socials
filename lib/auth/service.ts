import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  createSession,
  destroySessionByToken,
  getCookieName,
  setSessionCookie,
} from "@/lib/auth/session";
import { credentialsSchema, normalizeEmail } from "@/lib/auth/validation";
import { writeAudit } from "@/lib/audit/log";
import { rateLimiter } from "@/lib/rate-limit";
import { log, createRequestId } from "@/lib/logging/logger";
import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";

export type AuthOk = { ok: true; user: { id: string; email: string } };
export type AuthErr = {
  ok: false;
  code: "VALIDATION" | "INVALID_CREDENTIALS" | "EMAIL_TAKEN" | "RATE_LIMITED";
  message: string;
};

function clientKey(ip: string, bucket: string): string {
  return `${bucket}:${ip}`;
}

export async function signup(
  input: unknown,
  ip = "unknown",
): Promise<AuthOk | AuthErr> {
  const requestId = createRequestId();
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: "Invalid email or password" };
  }

  const limit = await rateLimiter.check(clientKey(ip, "signup"), 5, 15 * 60 * 1000);
  if (!limit.ok) {
    await writeAudit({ action: "auth.signup_rate_limited", metadata: { ip } });
    return { ok: false, code: "RATE_LIMITED", message: "Too many attempts. Try again later." };
  }

  const email = normalizeEmail(parsed.data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, code: "EMAIL_TAKEN", message: "Email already registered" };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  let user;
  try {
    user = await prisma.user.create({
      data: { email, passwordHash },
    });
  } catch (err) {
    // Unique email race (P2002) - concurrent signup
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return { ok: false, code: "EMAIL_TAKEN", message: "Email already registered" };
    }
    throw err;
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);
  await writeAudit({ userId: user.id, action: "auth.signup" });
  log({
    phase: 0,
    component: "auth.signup",
    level: "info",
    message: "signup ok",
    requestId,
    userId: user.id,
  });

  return { ok: true, user: { id: user.id, email: user.email } };
}

export async function login(
  input: unknown,
  ip = "unknown",
): Promise<AuthOk | AuthErr> {
  const requestId = createRequestId();
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: "Invalid email or password" };
  }

  const limit = await rateLimiter.check(clientKey(ip, "login"), 20, 15 * 60 * 1000);
  if (!limit.ok) {
    await writeAudit({ action: "auth.login_rate_limited", metadata: { ip } });
    return { ok: false, code: "RATE_LIMITED", message: "Too many attempts. Try again later." };
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  const valid =
    user && (await verifyPassword(parsed.data.password, user.passwordHash));

  if (!user || !valid) {
    await writeAudit({
      userId: user?.id,
      action: "auth.login_failed",
      metadata: { reason: "invalid_credentials" },
    });
    log({
      phase: 0,
      component: "auth.login",
      level: "warn",
      message: "login failed",
      requestId,
      meta: { reason: "invalid_credentials" },
    });
    return { ok: false, code: "INVALID_CREDENTIALS", message: "Invalid email or password" };
  }

  // Phase 0: one active session per user (revoke others on login)
  await prisma.session.deleteMany({ where: { userId: user.id } });
  const token = await createSession(user.id);
  await setSessionCookie(token);
  await writeAudit({ userId: user.id, action: "auth.login" });
  log({
    phase: 0,
    component: "auth.login",
    level: "info",
    message: "login ok",
    requestId,
    userId: user.id,
  });

  return { ok: true, user: { id: user.id, email: user.email } };
}

export async function logout(): Promise<{ ok: true }> {
  const jar = await cookies();
  const token = jar.get(getCookieName())?.value;
  let userId: string | undefined;
  if (token) {
    const { hashSessionToken } = await import("@/lib/auth/session");
    const session = await prisma.session
      .findUnique({ where: { tokenHash: hashSessionToken(token) } })
      .catch(() => null);
    userId = session?.userId;
    await destroySessionByToken(token);
  }
  await clearSessionCookie();
  await writeAudit({ userId, action: "auth.logout" });
  return { ok: true };
}
