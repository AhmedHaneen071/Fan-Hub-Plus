import type { DefaultSession } from "next-auth";

// Extends the NextAuth types so `session.user` knows about the fields we
// attach in the `session` and `jwt` callbacks (see src/auth.ts).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "VISITOR" | "USER" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role: "VISITOR" | "USER" | "ADMIN";
  }
}

// Same extension for the token shape stored in the session cookie.
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "VISITOR" | "USER" | "ADMIN";
  }
}