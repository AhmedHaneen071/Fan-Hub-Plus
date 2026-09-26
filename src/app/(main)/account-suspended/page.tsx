// ---------------------------------------------------------------------------
// Fan Hub Plus — suspended account notice  (/account-suspended)
//
// A suspended member can still sign in far enough to be told why, which is
// deliberate: silently failing the login would look like a wrong password, and
// "your account is suspended until the 4th, reason: X" is the only way the
// member can act on it. Nothing here is writable.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { logoutUser } from "@/lib/auth-actions";

export const metadata: Metadata = {
  title: "Account suspended",
  description: "Why your Fan Hub Plus account is not currently active.",
};

export default async function AccountSuspendedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Reached by a direct link, or because the ban has since been lifted. Either
  // way there is nothing to say here, so send them somewhere useful.
  if (!session.user.suspendedUntil) redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { suspended_until: true, suspension_reason: true, role: true },
  });

  const until = user?.suspended_until ?? new Date(session.user.suspendedUntil);
  const liftsAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(until);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <Breadcrumbs crumbs={[{ label: "Account suspended" }]} />

      <header className="space-y-1">
        <h1 className="flex items-center gap-3 text-3xl font-heading font-bold tracking-wide sm:text-4xl">
          <ShieldAlert className="size-8 text-destructive" aria-hidden="true" />
          Account suspended
        </h1>
        <p className="text-muted-foreground">
          Your account is read-only until the suspension lifts.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>What happened</CardTitle>
          <CardDescription>
            An administrator suspended this account. Your data is untouched —
            bookmarks, ratings and submissions are all still here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Lifts at</dt>
              <dd className="font-medium">{liftsAt}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Your role</dt>
              <dd className="font-medium">
                {user?.role.toLowerCase() ?? "member"}
              </dd>
            </div>
            {user?.suspension_reason ? (
              <div className="space-y-1">
                <dt className="text-muted-foreground">Reason given</dt>
                <dd className="rounded-lg bg-muted/60 p-3">{user.suspension_reason}</dd>
              </div>
            ) : null}
          </dl>

          <p className="text-sm text-muted-foreground">
            If you think this is a mistake, reply to the message that notified
            you and an admin can lift it straight away.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/">Back to the homepage</Link>
            </Button>
            <form action={logoutUser}>
              <Button type="submit" variant="ghost">
                Sign out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
