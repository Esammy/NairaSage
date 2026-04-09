import { SESSION_COOKIE } from "@/lib/session-cookie-constants";

export { SESSION_COOKIE };

const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function setSessionCookieFlag(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearSessionCookieFlag(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}
