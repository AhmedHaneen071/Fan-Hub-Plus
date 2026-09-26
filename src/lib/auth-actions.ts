"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import { sendPasswordResetEmail } from "@/lib/mail";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { getClientIp, rateLimit, resetRateLimitPrefix } from "@/lib/rate-limit";

// Standard shape returned by every auth action. `redirectTo` tells the client
// where to navigate after a successful action.
export type AuthActionResult =
  | { ok: true; message?: string; redirectTo: string; preview?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]>; preview?: string };

// A strong token lives 30 minutes after generation.
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

// Rate limits. Each entry is [max attempts, window in ms].
const LOGIN_LIMIT = { max: 10, windowMs: 15 * 60 * 1000 };
const REGISTER_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };
const RESET_REQUEST_LIMIT = { max: 3, windowMs: 15 * 60 * 1000 };
const RESET_REQUEST_IP_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };
const RESET_COMPLETE_LIMIT = { max: 10, windowMs: 15 * 60 * 1000 };

function hashToken(rawToken: string): string {
  // We only ever store a SHA-256 hash of the reset token. If the database is
  // leaked, the tokens themselves stay useless to an attacker.
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Only same-site, path-relative URLs are allowed as post-action redirects.
 *
 * Without this check a crafted `?callbackUrl=https://evil.example` would send
 * a freshly signed-in user to an attacker's page. Rejecting anything that is
 * not a plain in-app path also blocks protocol-relative "//evil.example" and
 * backslash tricks that browsers normalise to "//".
 */
function safeRedirectPath(
  candidate: FormDataEntryValue | null | undefined
): string | null {
  if (typeof candidate !== "string") return null;
  const value = candidate.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  if (value.includes("\n") || value.includes("\r")) return null;
  return value;
}

/**
 * Absolute base URL of this deployment, used to build password-reset links.
 * Falls back to the dev server so local testing keeps working when APP_URL is
 * not set, but never silently ships a localhost link to real users: mail.ts
 * warns loudly when the fallback is in use outside development.
 */
function getAppUrl(): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return "http://localhost:3000";
}

// ------------------------------------------------------------------ register
export async function registerUser(formData: FormData): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // The schema already lower-cased the email, so `email` matches the stored
  // form exactly.
  const { name, email, password } = parsed.data;

  // Throttled per IP to stop bulk automated sign-ups.
  const ip = await getClientIp();
  const registerLimit = rateLimit(
    `register:ip:${ip}`,
    REGISTER_LIMIT.max,
    REGISTER_LIMIT.windowMs
  );
  if (!registerLimit.ok) {
    return {
      ok: false,
      error: `Too many accounts created from this connection. Try again in ${Math.ceil(registerLimit.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  // One user per email — check uniqueness before hashing to avoid wasted work.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "That email is already registered." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: { name, email, password_hash: passwordHash, role: "USER" },
    });
  } catch {
    // Lost a race with a concurrent signup for the same address.
    return { ok: false, error: "That email is already registered." };
  }

  // Auto sign-in right after register so users don't have to log in twice.
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch {
    // Sign-in should not fail here, but if it does the account still exists.
  }

  return { ok: true, message: "Account created. Welcome!", redirectTo: "/dashboard" };
}

// ------------------------------------------------------------ forgot password
export async function requestPasswordReset(formData: FormData): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = parsed.data.email;
  const ip = await getClientIp();

  // Two independent limits: one an attacker cannot forge (the target address)
  // and one per connection. Both must pass.
  const perEmail = rateLimit(
    `reset:email:${email}`,
    RESET_REQUEST_LIMIT.max,
    RESET_REQUEST_LIMIT.windowMs
  );
  const perIp = rateLimit(
    `reset:ip:${ip}`,
    RESET_REQUEST_IP_LIMIT.max,
    RESET_REQUEST_IP_LIMIT.windowMs
  );

  if (!perEmail.ok || !perIp.ok) {
    const wait = Math.ceil(
      Math.max(perEmail.ok ? 0 : perEmail.retryAfterSeconds, perIp.ok ? 0 : perIp.retryAfterSeconds) / 60
    );
    return {
      ok: false,
      error: `Too many reset requests. Try again in ${wait} minute(s).`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return the same friendly message whether or not the email exists.
  // This prevents attackers from probing which accounts are registered.
  if (!user) {
    return {
      ok: true,
      message: "If that account exists, a reset link is on its way.",
      redirectTo: "/login",
    };
  }

  // Invalidate old tokens for this user, then issue one new token.
  const rawToken = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.updateMany({
    where: { user_id: user.id, used: false },
    data: { used: true },
  });
  await prisma.passwordResetToken.create({
    data: {
      user_id: user.id,
      token_hash: hashToken(rawToken),
      expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  // Build the link the user would click. In dev this is previewed on-screen;
  // in production it arrives by email.
  const resetUrl = `${getAppUrl()}/reset-password?token=${rawToken}`;
  const mail = await sendPasswordResetEmail(email, resetUrl);

  return {
    ok: true,
    message: "If that account exists, a reset link is on its way.",
    redirectTo: "/login",
    preview: mail.ok ? mail.preview : undefined,
  };
}

// ----------------------------------------------------------------- reset
export async function resetPassword(formData: FormData): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Password must be at least 8 characters with a letter and a number.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { token, password } = parsed.data;

  // Throttled so a leaked or guessed token cannot be brute-forced.
  const ip = await getClientIp();
  const completeLimit = rateLimit(
    `reset-complete:ip:${ip}`,
    RESET_COMPLETE_LIMIT.max,
    RESET_COMPLETE_LIMIT.windowMs
  );
  if (!completeLimit.ok) {
    return {
      ok: false,
      error: "Too many attempts. Try again in a few minutes.",
    };
  }

  // Find the matching token by its hash. Expired/used tokens are invalid.
  const record = await prisma.passwordResetToken.findUnique({
    where: { token_hash: hashToken(token) },
    include: { user: true },
  });

  if (!record || record.used || record.expires_at < new Date()) {
    return {
      ok: false,
      error: "This reset link is invalid or has expired. Please request a new one.",
    };
  }

  // Update the password and burn the token so it cannot be reused.
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.user_id },
      data: { password_hash: passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
  ]);

  return { ok: true, message: "Password updated. You can now sign in.", redirectTo: "/login" };
}

// ------------------------------------------------------------------- sign-in
// Thin wrapper so client code has ONE tidy place to call sign-in and receive
// friendly error messages instead of Auth.js internals.
export async function loginUser(formData: FormData): Promise<AuthActionResult> {
  const rawEmail = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const email = rawEmail.trim().toLowerCase();

  // Throttled per email AND per IP. The email key is the important one: it is
  // supplied by us, so an attacker rotating source addresses still runs into
  // the per-account limit after a handful of guesses.
  const ip = await getClientIp();
  const perAccount = rateLimit(
    `login:account:${email}`,
    LOGIN_LIMIT.max,
    LOGIN_LIMIT.windowMs
  );
  const perConnection = rateLimit(
    `login:ip:${ip}`,
    LOGIN_LIMIT.max * 3,
    LOGIN_LIMIT.windowMs
  );

  if (!perAccount.ok) {
    return {
      ok: false,
      error: `Too many sign-in attempts for this account. Try again in ${Math.ceil(perAccount.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  if (!perConnection.ok) {
    return {
      ok: false,
      error: "Too many sign-in attempts from this connection. Try again later.",
    };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch {
    return { ok: false, error: "Email or password is incorrect." };
  }

  // The account made it through, so clear its failure counter.
  resetRateLimitPrefix(`login:account:${email}`);

  // Ignore anything that is not an in-app path.
  const redirectTo =
    safeRedirectPath(formData.get("callbackUrl")) ?? "/dashboard";

  return { ok: true, redirectTo };
}

// ------------------------------------------------------------------ sign-out
export async function logoutUser(): Promise<void> {
  await signOut({ redirectTo: "/" });
}