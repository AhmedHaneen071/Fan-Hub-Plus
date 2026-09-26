import NextAuth from "next-auth";

// The proxy-side instance uses only the edge-safe config from auth.config.ts.
// It stays out of the bundled server routes and needs no Prisma/credentials.
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

// Run the proxy on everything except Next.js internals and static files.
export const config = {
  matcher: ["/((?!_next|_proxy|api|images|favicon.ico|.*\\..*).*)"],
};