import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
