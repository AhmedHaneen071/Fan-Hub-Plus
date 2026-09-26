import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/validations/auth";

// ---------------------------------------------------------------- timing fix
// bcrypt.compare() is deliberately slow. When the email does not exist we used
// to bail out immediately, which made "no such account" measurably faster than
// "wrong password" and let an attacker enumerate registered emails. Instead we
// always run a comparison against a real hash: a throwaway one when the account
// is missing, the stored one otherwise. The work is identical either way.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "fan-hub-plus-timing-equalizer",
  10
);

// ---------------------------------------------------------------- auth config
// Merge the shared edge config (pages, session, authorized callback) with the
// server-only parts: the Credentials provider and the session enrichments.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize() runs when a user submits the login form. Returning a user
      // object means the login succeeded; returning null means it failed.
      authorize: async (credentials) => {
        // The shared schema also lower-cases the email, so the lookup below
        // matches the row that registration created.
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });

        // Always spend the same time on the hash comparison.
        const passwordMatches = await bcrypt.compare(
          password,
          user?.password_hash ?? DUMMY_PASSWORD_HASH
        );

        // One generic failure for "no such account" and "wrong password" so the
        // login form cannot be used to probe which emails are registered.
        if (!user || !passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.avatar_url ?? null,
        };
      },
    }),
  ],

  callbacks: {
    // Keep the edge `authorized` callback from auth.config.
    ...authConfig.callbacks,

    // Copy the role + id into the JWT when the user first signs in.
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    // Surface role + id on the session so pages can gate on them.
    //
    // The JWT is a snapshot from sign-in time, so a role change (or a deleted
    // account) would not be reflected until the token expired. We re-read the
    // user from the database on every session build and treat that as the source
    // of truth, falling back to the token values if the query fails so a
    // transient database error cannot lock everyone out of every page.
    session: async ({ session, token }) => {
      if (session.user) {
        const tokenId = token.id as string | undefined;
        const tokenRole =
          (token.role as "VISITOR" | "USER" | "ADMIN" | undefined) ?? "VISITOR";

        session.user.id = tokenId ?? session.user.id;
        session.user.role = tokenRole;

        if (tokenId) {
          try {
            const fresh = await prisma.user.findUnique({
              where: { id: tokenId },
              select: { id: true, name: true, email: true, role: true, avatar_url: true },
            });

            if (fresh) {
              session.user.id = fresh.id;
              session.user.name = fresh.name;
              session.user.email = fresh.email;
              session.user.role = fresh.role;
              session.user.image = fresh.avatar_url ?? null;
            }
          } catch {
            // Leave the token-derived values in place.
          }
        }
      }
      return session;
    },
  },
});
