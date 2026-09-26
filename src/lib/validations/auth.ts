import { z } from "zod";

// These schemas are the single source of truth for auth validation.
// React Hook Form validates with the same schema on the client, and the
// server actions re-validate with these BEFORE touching the database.

// Emails are stored lower-cased. Without this, signing in as
// "User@Fanhub.dev" would fail to match the stored "user@fanhub.dev" row and
// silently create a second account on registration.
const emailSchema = z
  .email({ message: "Enter a valid email address." })
  .transform((value) => value.trim().toLowerCase());

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters." })
    .max(50, { message: "Name must be under 50 characters." }),
  email: emailSchema,
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .regex(/[a-zA-Z]/, { message: "Password must contain a letter." })
    .regex(/[0-9]/, { message: "Password must contain a number." }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required." }),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .regex(/[a-zA-Z]/, { message: "Password must contain a letter." })
    .regex(/[0-9]/, { message: "Password must contain a number." }),
});

// Convenient TypeScript types derived from the schemas.
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;