// ---------------------------------------------------------------------------
// Fan Hub Plus — shared authorization guards
//
// The three roles mean three different things:
//   ADMIN   - everything a member can do, plus the admin console.
//   USER    - a registered member: may save, rate and customise.
//   VISITOR - a registered account that may LOOK but not TOUCH. It exists so
//             the role split is demonstrable, not so visitors get member
//             powers. Before this guard, signing in as VISITOR granted the same
//             write access as USER.
//
// A fourth state cuts across the roles: SUSPENDED. It is not a role, because a
// suspended admin should keep their role and regain it when the ban lifts, but
// it must still stop every write and hide every member page. It is checked here
// so the rule lives in one place instead of in each action.
//
// Every mutating action must call requireMember() server-side. Client-side
// checks are only cosmetic, because a server action is a public HTTP endpoint.
// ---------------------------------------------------------------------------

import type { Session } from "next-auth";

type MemberCheck =
  | { ok: true; userId: string }
  | { ok: false; error: string; redirectTo?: string };

/**
 * True while the account is suspended.
 *
 * The session callback already nulls an expired window, so by the time this
 * runs a non-null value is a live suspension. The `> now` test is kept anyway
 * as the authoritative check: a session object built any other way (a test, a
 * future callback) must not be able to talk its way past the guard.
 */
export function isSuspended(
  session: Session | null | undefined
): boolean {
  const until = session?.user?.suspendedUntil;
  if (!until) return false;
  return new Date(until).getTime() > Date.now();
}

/** The path a suspended account is sent to, with why. */
export const SUSPENDED_PATH = "/account-suspended";

/**
 * Resolves a session to a member who is allowed to write.
 *
 * `readOnly` is the message shown when a VISITOR tries to write; pass a more
 * specific string where a generic one would be confusing.
 */
export function requireMember(
  session: Session | null | undefined,
  readOnly = "This action is for registered members only."
): MemberCheck {
  if (!session?.user?.id) {
    return {
      ok: false,
      error: "Sign in to use bookmarks and ratings.",
      redirectTo: "/login",
    };
  }

  // Checked before the role, so a suspended admin is told what is actually
  // wrong with their account rather than being told visitors cannot write.
  if (isSuspended(session)) {
    return {
      ok: false,
      error: "Your account is suspended.",
      redirectTo: SUSPENDED_PATH,
    };
  }

  if (session.user.role === "VISITOR") {
    return { ok: false, error: readOnly };
  }

  return { ok: true, userId: session.user.id };
}


/** True when the session belongs to an account that may not write. */
export function isReadOnly(session: Session | null | undefined): boolean {
  return session?.user?.role === "VISITOR";
}
