"use server";

import { redirect } from "next/navigation";
import { login, logout, signup, type AuthErr, type AuthOk } from "@/lib/auth/service";
import { headers } from "next/headers";

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

export async function signupAction(
  formData: FormData,
): Promise<AuthOk | AuthErr> {
  const result = await signup(
    {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    },
    await clientIp(),
  );
  if (!result.ok) return result;
  redirect("/overview");
}

export async function loginAction(
  formData: FormData,
): Promise<AuthOk | AuthErr> {
  const result = await login(
    {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    },
    await clientIp(),
  );
  if (!result.ok) return result;
  redirect("/overview");
}

export async function logoutAction() {
  await logout();
  redirect("/");
}
