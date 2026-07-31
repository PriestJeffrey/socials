#!/bin/sh
set -e

# Always build a percent-encoded DATABASE_URL from POSTGRES_* (Bugbot fix).
# Compose must not interpolate passwords into a URI.
DATABASE_URL="$(
  node -e '
    const user = process.env.POSTGRES_USER || "pulseboard";
    const pass = process.env.POSTGRES_PASSWORD || "pulseboard";
    const db = process.env.POSTGRES_DB || "pulseboard";
    const host = process.env.POSTGRES_HOST || "postgres";
    const port = process.env.POSTGRES_PORT || "5432";
    const enc = encodeURIComponent;
    process.stdout.write(
      `postgresql://${enc(user)}:${enc(pass)}@${host}:${port}/${enc(db)}`,
    );
  '
)"
export DATABASE_URL

echo "Running prisma migrate deploy…"
npx prisma migrate deploy
echo "Starting Pulseboard…"
exec node server.js
