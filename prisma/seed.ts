/**
 * Local/dev demo user - never use in production.
 * npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

export const DEMO_EMAIL = "demo@pulseboard.local";
export const DEMO_PASSWORD = "pulseboard-demo";

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { email: DEMO_EMAIL, passwordHash },
    update: { passwordHash },
  });
  console.log(`Demo user ready: ${user.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
