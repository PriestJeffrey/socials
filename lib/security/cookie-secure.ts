/**
 * Cookie Secure flag: explicit COOKIE_SECURE wins over NODE_ENV.
 * Local Docker runs NODE_ENV=production on http://localhost — need Secure=false.
 */
export function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}
