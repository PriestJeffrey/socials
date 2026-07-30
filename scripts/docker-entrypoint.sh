#!/bin/sh
set -e
echo "Running prisma migrate deploy…"
npx prisma migrate deploy
echo "Starting Pulseboard…"
exec node server.js
