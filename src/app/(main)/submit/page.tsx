import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMember, isSuspended, SUSPENDED_PATH } from "@/lib/guards";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { SubmissionForm } from "@/components/dashboard/submission-form";

export const metadata: Metadata = { title: "Share with the fandom", description: "Submit fan content for review." };

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fsubmit");
  if (isSuspended(session)) redirect(SUSPENDED_PATH);
  const member = requireMember(session);
  if (!member.ok) redirect("/dashboard");
  const [categories, submissions] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.fanSubmission.findMany({ where: { user_id: member.userId }, select: { id: true, title: true, status: true, created_at: true }, orderBy: { created_at: "desc" }, take: 10 }),
  ]);

  return <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6">
    <Breadcrumbs crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Share with the fandom" }]} />
    <header><h1 className="text-3xl font-heading font-bold">Share with the fandom</h1><p className="mt-2 text-muted-foreground">Send fan content to the team for review and publication.</p></header>
    <SubmissionForm categories={categories} />
    <section aria-labelledby="your-submissions"><h2 id="your-submissions" className="mb-3 text-xl font-semibold">Your recent submissions</h2>
      {submissions.length ? <ul className="space-y-2">{submissions.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 rounded-lg border bg-card p-3"><span>{item.title}</span><span className="text-sm text-muted-foreground">{item.status.toLowerCase()} · {item.created_at.toLocaleDateString()}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">You have not submitted anything yet.</p>}
    </section>
  </div>;
}
