// ---------------------------------------------------------------------------
// Fan Hub Plus — profile & dashboard server actions
// Favorite-fandom toggling, display name editing and password changes. All
// actions verify the session and re-validate input server-side.
// ---------------------------------------------------------------------------

"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/guards";
import { CATEGORY_NAMES, type CategoryValue } from "@/lib/constants";

const categorySchema = z.enum(CATEGORY_NAMES);
const nameSchema = z.string().trim().min(1, "Name is required.").max(80);

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include a letter.")
      .regex(/\d/, "Include a number."),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "The new password must be different from the current one.",
    path: ["newPassword"],
  });

export type ProfileActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

// ----------------------------------------------------- favorite fandom toggle
export async function toggleFavoriteCategory(
  category: CategoryValue,
): Promise<ProfileActionResult> {
  const parsed = categorySchema.safeParse(category);
  if (!parsed.success) return { ok: false, error: "Unknown fandom." };

  // Choosing a favourite fandom is a member power, so a VISITOR account is
  // read-only here.
  const member = requireMember(
    await auth(),
    "Your account is in visitor mode, so your fandoms are view-only. Register a member account to customise them.",
  );
  if (!member.ok) return { ok: false, error: member.error };

  const user = await prisma.user.findUnique({
    where: { id: member.userId },
    include: { favoriteCategories: { select: { name: true } } },
  });
  if (!user) return { ok: false, error: "Account not found." };

  const isFavourite = user.favoriteCategories.some(
    (favourite) => favourite.name === parsed.data,
  );

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        favoriteCategories: isFavourite
          ? { disconnect: { name: parsed.data } }
          : { connect: { name: parsed.data } },
      },
    });
  } catch {
    return { ok: false, error: "That fandom could not be updated." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return {
    ok: true,
    message: isFavourite ? "Removed from favorites." : "Added to favorites.",
  };
}

// ------------------------------------------------------------ display name
export async function updateDisplayName(name: string): Promise<ProfileActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: "Name is required." };

  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to continue." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile updated." };
}

// ------------------------------------------------------------ change password
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ProfileActionResult> {
  const parsed = passwordSchema.safeParse({ currentPassword, newPassword });
  if (!parsed.success) {
    const message = parsed.error.flatten().fieldErrors.newPassword?.[0];
    return { ok: false, error: message ?? "Enter a valid new password." };
  }

  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to continue." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: "Account not found." };

  const currentMatches = await bcrypt.compare(
    parsed.data.currentPassword,
    user.password_hash,
  );
  if (!currentMatches) return { ok: false, error: "Current password is wrong." };

  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });

  return { ok: true, message: "Password updated." };
}