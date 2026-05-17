/** Supabase recovery sessions look like a normal session; we tag them until the user sets a new password. */

const KEY = "bf-password-recovery";
const TTL_MS = 20 * 60 * 1000;

export function markPasswordRecoveryPending(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(KEY, String(Date.now()));
}

export function clearPasswordRecoveryPending(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function isPasswordRecoveryPending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const v = sessionStorage.getItem(KEY);
  if (!v) return false;
  const t = parseInt(v, 10);
  if (Number.isNaN(t)) return true;
  return Date.now() - t < TTL_MS;
}
