import { handlers } from "@/auth";

// NextAuth v5 exposes its own HTTP handlers. Mounting them as catch-all
// API routes gives us /api/auth/* (login, session, signout endpoints).
export const { GET, POST } = handlers;