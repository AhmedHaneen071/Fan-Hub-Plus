import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main id="main-content" className="mx-auto flex min-h-[55vh] w-full max-w-2xl flex-col items-start justify-center gap-4 px-4 py-16">
    <p className="text-sm font-semibold text-primary">404</p>
    <h1 className="text-3xl font-heading font-bold">We couldn&apos;t find that page</h1>
    <p className="text-muted-foreground">The link may be old, or the item may have been removed.</p>
    <div className="flex flex-wrap gap-2"><Button asChild><Link href="/">Go home</Link></Button><Button asChild variant="outline"><Link href="/explore">Explore fandoms</Link></Button></div>
  </main>;
}
