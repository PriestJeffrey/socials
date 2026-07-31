import { cookies } from "next/headers";
import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes";
import { cookieSecure } from "@/lib/security/cookie-secure";

const COOKIE = "pb_draft_suggest";
const MAX_AGE_SEC = 120;

export type DraftSuggestFlash = {
  userId: string;
  body: string;
  platform: string;
};

export async function setDraftSuggestFlash(
  flash: DraftSuggestFlash,
): Promise<void> {
  const jar = await cookies();
  const payload = encryptAesGcm(
    JSON.stringify({
      userId: flash.userId,
      body: flash.body.slice(0, 4000),
      platform: flash.platform,
    }),
  );
  jar.set(COOKIE, payload, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

/** Read once and clear - never leave draft text in the cookie jar. */
export async function takeDraftSuggestFlash(
  userId: string,
): Promise<Omit<DraftSuggestFlash, "userId"> | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  jar.set(COOKIE, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decryptAesGcm(raw)) as DraftSuggestFlash;
    if (parsed.userId !== userId || typeof parsed.body !== "string") {
      return null;
    }
    return {
      body: parsed.body,
      platform:
        typeof parsed.platform === "string" ? parsed.platform : "instagram",
    };
  } catch {
    return null;
  }
}
