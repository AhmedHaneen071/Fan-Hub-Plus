"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main id="main-content" className="mx-auto flex min-h-[55vh] w-full max-w-2xl flex-col items-start justify-center gap-4 px-4 py-16">
    <h1 className="text-3xl font-heading font-bold">This page hit a problem</h1>
    <p className="text-muted-foreground">Your account and saved content are unchanged. Try again, or return to a page that is working.</p>
    <div className="flex flex-wrap gap-2"><Button type="button" onClick={retry}>Try again</Button><Button asChild variant="outline"><Link href="/">Go home</Link></Button><Button asChild variant="outline"><Link href="/dashboard">Dashboard</Link></Button></div>
  </main>;
}
