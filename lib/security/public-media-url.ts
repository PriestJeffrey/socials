/**
 * Validate media URLs before Meta fetches them (SSRF harden for live IG).
 * Hostname-only checks — no DNS resolve (avoid TOCTOU); rejects IP literals in private ranges.
 */

function isPrivateOrReservedIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateOrReservedIpv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "::" || h === "::1") return true;
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  // IPv4-mapped / IPv4-compatible
  const v4mapped = /(?:^::ffff:|^::)(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(h);
  if (v4mapped?.[1]) return isPrivateOrReservedIpv4(v4mapped[1]);
  return false;
}

export function assertPublicHttpsMediaUrl(url: string): string {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Instagram media URL must be a valid https link");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Instagram media URL must use https");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Instagram media URL must not include credentials");
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !host ||
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("Instagram media URL cannot target localhost or private hosts");
  }

  if (isPrivateOrReservedIpv4(host) || (host.includes(":") && isPrivateOrReservedIpv6(host))) {
    throw new Error("Instagram media URL cannot target a private or reserved IP");
  }

  return trimmed;
}
