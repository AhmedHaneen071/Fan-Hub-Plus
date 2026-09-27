// ---------------------------------------------------------------------------
// Fan Hub Plus — personal profile  (/profile)
// Edit your display name and change your password. Bookmarks and ratings
// live on the dashboard; this page is the account-tidying corner.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SUSPENDED_PATH, isSuspended } from "@/lib/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { AvatarForm, NameForm, PasswordForm } from "@/components/profile/profile-forms";

export const metadata: Metadata = {
  title: "My profile",
  description: "Manage your Fan Hub Plus account.",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (isSuspended(session)) redirect(SUSPENDED_PATH);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      avatar_url: true,
      email: true,
      role: true,
      suspended_until: true,
      suspension_reason: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <Breadcrumbs crumbs={[{ label: "Profile" }]} />

      <header className="space-y-1">
        <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
          My profile
        </h1>
        <p className="text-muted-foreground">
          {user.email} · {user.role.toLowerCase()} account
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle>Profile picture</CardTitle><CardDescription>Upload an image to use as your avatar. Images are stored in the app&apos;s local public uploads directory.</CardDescription></CardHeader>
        <CardContent><AvatarForm initialAvatar={user.avatar_url} name={user.name} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display name</CardTitle>
          <CardDescription>
            Shown on your welcome banner and, later, on community features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NameForm initialName={user.name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Prefer a longer, unique password you don&apos;t use anywhere else.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Want to see what you&apos;ve saved?{" "}
        <Link href="/dashboard?tab=bookmarks" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Open your bookmarks <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </p>
    </div>
  );
}
