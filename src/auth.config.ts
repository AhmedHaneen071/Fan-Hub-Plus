import type { NextAuthConfig } from "next-auth";

// Paths that require a signed-in session. /admin additionally requires the
// ADMIN role (enforced again inside the page + every server action).
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/admin"];

// The auth screens themselves must never be blocked even when signed out.
const PUBLIC_AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

/**
 * Edge-safe Auth.js config used by src/proxy.ts. It deliberately has NO
 * providers and NO Prisma imports so it can run on the proxy/edge runtime.
 * src/auth.ts merges this with the Credentials provider for server use.
 *
 * The `authorized` callback decides whether a request may proceed. Returning
 * false makes Auth.js redirect to the sign-in page (auto-adding callbackUrl).
 */
export const authConfig = {
  pages: { signIn: "/login" },
  // Without maxAge the session JWT never expires, so a stolen cookie stays
  // valid forever. Seven days, refreshed at most once a day.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },

  providers: [],

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = PUBLIC_AUTH_PATHS.includes(nextUrl.pathname);
      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        nextUrl.pathname.startsWith(prefix)
      );

      if (!isLoggedIn && isProtected && !isAuthPage) {
        return false; // -> Auth.js redirects to /login
      }
      return true;
    },
  },
} satisfies NextAuthConfig;