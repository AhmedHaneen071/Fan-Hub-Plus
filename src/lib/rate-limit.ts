// ---------------------------------------------------------------------------
// Fan Hub Plus — in-memory rate limiting
// A small fixed-window limiter used to slow down credential stuffing, mass
// account creation, password-reset spam and chatbot abuse.
//
// TRADE-OFF: the counters live in this process's memory. They reset whenever
// the server restarts and are NOT shared between instances, so on serverless or
// multi-instance hosting the effective limit is (limit x instance count). That
// is an acceptable trade-off for a single-instance deployment. If the app is
// ever scaled horizontally, move these counters into the database (a
// RateLimit model with a unique key) and keep this module's signature.
// ---------------------------------------------------------------------------

import { headers } from "next/headers";

type Bucket = {
  count: number;
  /** Epoch milliseconds at which this window ends. */
  resetAt: number;
};

type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

// Preserved on globalThis so Next.js hot reloads in development do not reset
// everyone's counters on every file save.
const globalForRateLimit = globalThis as unknown as {
  rateLimitBuckets: Map<string, Bucket> | undefined;
};

const buckets: Map<string, Bucket> =
  globalForRateLimit.rateLimitBuckets ?? new Map<string, Bucket>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.rateLimitBuckets = buckets;
}

// Drop expired buckets occasionally so a long-running process cannot grow the
// map without bound. Cheap, and only runs when the map is actually large.
const SWEEP_THRESHOLD = 1000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (buckets.size < SWEEP_THRESHOLD && now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Registers an attempt against `key` and reports whether it is allowed.
 *
 * The window is fixed: once `windowMs` has passed the counter resets to zero.
 * The caller's action is expected to stop when `ok` is false.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  // No bucket, or the previous window has elapsed -> start a fresh one.
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { ok: true, remaining: limit - existing.count };
}

/** Clears a key's counter. Call this after a successful attempt. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Forgets a user's failed-attempt counter after a successful sign-in. */
export function resetRateLimitPrefix(prefix: string) {
  for (const key of buckets.keys()) {
    if (key.startsWith(prefix)) buckets.delete(key);
  }
}

/**
 * Best-effort client IP for use as a rate-limit key.
 *
 * `headers()` is async in this version of Next.js. Behind a proxy the first
 * entry of x-forwarded-for is the original client; on a direct connection that
 * header is absent and we fall back to a constant, which makes the per-IP
 * limits degrade into per-action limits rather than failing open entirely.
 *
 * Note: x-forwarded-for is client-settable unless the platform strips it. That
 * is acceptable here because every protected action is *also* limited by a key
 * that the client cannot forge (the submitted email address).
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;

  return headerList.get("x-real-ip")?.trim() || "unknown";
}
