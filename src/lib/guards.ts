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
// Every mutating action must call requireMember() server-side. Client-side
// checks are only cosmetic, because a server action is a public HTTP endpoint.
// ---------------------------------------------------------------------------

import type { Session } from "next-auth";

type MemberCheck =
  | { ok: true; userId: string }
  | { ok: false; error: string; redirectTo?: string };

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

  if (session.user.role === "VISITOR") {
    return { ok: false, error: readOnly };
  }

  return { ok: true, userId: session.user.id };
}

/** True when the session belongs to an account that may not write. */
export function isReadOnly(session: Session | null | undefined): boolean {
  return session?.user?.role === "VISITOR";
}
