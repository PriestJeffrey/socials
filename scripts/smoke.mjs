#!/usr/bin/env node
/**
 * Phase 8 smoke - hits public pages. Requires `npm run dev` or `npm start`.
 * Usage: node scripts/smoke.mjs [baseUrl]
 */
const base = (process.argv[2] || process.env.APP_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

async function check(path, expectStatus = 200) {
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: "manual" });
  const ok =
    res.status === expectStatus ||
    (expectStatus === 200 && (res.status === 307 || res.status === 302));
  if (!ok) {
    throw new Error(`${path} → ${res.status} (expected ${expectStatus})`);
  }
  console.log(`ok ${path} (${res.status})`);
}

async function main() {
  console.log(`Smoke against ${base}`);
  await check("/");
  await check("/login");
  await check("/signup");
  await check("/api/health");
  // Protected without cookie should bounce to login
  await check("/overview", 307);
  console.log("Smoke passed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
