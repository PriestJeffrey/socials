import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { clock } from "@/lib/clock";

const COOKIE_NAME = process.env.COOKIE_NAME ?? "pulseboard_session";

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionTtlDays(): number {
  const n = Number(process.env.SESSION_TTL_DAYS ?? "14");
  return Number.isFinite(n) && n > 0 ? n : 14;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    clock.now().getTime() + sessionTtlDays() * 24 * 60 * 60 * 1000,
  );
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionTtlDays() * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function destroySessionByToken(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  });
}

export type SessionUser = { id: string; email: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    });

    if (!session) return null;
    if (session.expiresAt <= clock.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }

    return { id: session.user.id, email: session.user.email };
  } catch {
    // DB unreachable (e.g. Postgres down) - treat as logged out
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function getCookieName(): string {
  return COOKIE_NAME;
}
