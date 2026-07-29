import { describe, expect, it } from "vitest";
import { randomBytes } from "crypto";
import { decryptAesGcm, encryptAesGcm } from "@/lib/crypto/aes";

describe("AES-256-GCM", () => {
  const key = randomBytes(32);

  it("round-trips plaintext", () => {
    const plain = "oauth-refresh-token-example";
    const cipher = encryptAesGcm(plain, key);
    expect(cipher).not.toEqual(plain);
    expect(decryptAesGcm(cipher, key)).toEqual(plain);
  });

  it("fails on tampered ciphertext", () => {
    const cipher = encryptAesGcm("secret", key);
    const buf = Buffer.from(cipher, "base64url");
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString("base64url");
    expect(() => decryptAesGcm(tampered, key)).toThrow();
  });

  it("refuses missing key from env", () => {
    const prev = process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptAesGcm("x")).toThrow(/TOKEN_ENCRYPTION_KEY/);
    if (prev) process.env.TOKEN_ENCRYPTION_KEY = prev;
  });
});
