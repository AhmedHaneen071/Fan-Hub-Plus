import jwt from "jsonwebtoken";
import { User } from "./models.js";

const secret = () => {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)
    throw new Error(
      "AUTH_SECRET must be configured with at least 32 characters.",
    );
  return process.env.AUTH_SECRET;
};
export const issueSession = (user) =>
  jwt.sign({ sub: user.id }, secret(), {
    expiresIn: "7d",
    issuer: "fanhub-plus",
  });
export async function getCurrentUser(req) {
  try {
    const token = req.cookies?.fanhub_session;
    if (!token) return null;
    const claims = jwt.verify(token, secret(), { issuer: "fanhub-plus" });
    const user = await User.findById(claims.sub);
    if (!user || (user.suspendedUntil && user.suspendedUntil > new Date()))
      return null;
    return user;
  } catch {
    return null;
  }
}
export async function requireUser(req, res, next) {
  try {
    const user = await getCurrentUser(req);
    if (!user)
      return res
        .status(401)
        .json({ error: "Your session is no longer valid." });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Your session is no longer valid." });
  }
}
export function requireMember(req, res, next) {
  if (!req.user || req.user.role === "VISITOR")
    return res
      .status(403)
      .json({ error: "This action is available to registered members." });
  next();
}
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN")
    return res.status(403).json({ error: "Administrator access required." });
  next();
}
export const sessionCookie = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
