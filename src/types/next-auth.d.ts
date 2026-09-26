import type { DefaultSession } from "next-auth";

// Extends the NextAuth types so `session.user` knows about the fields we
// attach in the `session` and `jwt` callbacks (see src/auth.ts).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "VISITOR" | "USER" | "ADMIN";
      // ISO timestamp while the account is suspended, null otherwise. Derived
      // from the database on every session build, so it is current even for a
      // session that started before the suspension.
      suspendedUntil?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: "VISITOR" | "USER" | "ADMIN";
    suspendedUntil?: string | null;
  }
}

// Same extension for the token shape stored in the session cookie.
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "VISITOR" | "USER" | "ADMIN";
    suspendedUntil?: string | null;
  }
}
