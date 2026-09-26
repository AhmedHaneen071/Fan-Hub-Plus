import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SearchBox } from "./search-box";
import { BrowseMenu } from "./browse-menu";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

const NAV_LINKS = [
  { label: "Explore", href: "/explore" },
  { label: "Characters", href: "/characters" },
  { label: "Merch", href: "/merch" },
  { label: "Events", href: "/events" },
  { label: "Ask the hub", href: "/chatbot" },
];

/**
 * Global site header (Prime-style): logo + Browse dropdown + primary links on
 * the left, search and account controls on the right. Rendered as a server
 * component so it always knows the session without a client-side flash.
 */
export async function SiteHeader() {
  const [session, categories] = await Promise.all([
    auth(),
    prisma.category.findMany({
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: {
        name: true,
        _count: { select: { contents: true } },
      },
    }),
  ]);
  const user = session?.user;

  const browseItems = categories.map((category) => ({
    name: category.name,
    label: CATEGORY_LABELS[category.name as CategoryValue],
    count: category._count.contents,
  }));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-1">
          <MobileNav categories={browseItems} />
          <Logo size="sm" />
        </div>

        <div className="hidden shrink-0 md:block">
          <BrowseMenu items={browseItems} />
        </div>

        {/* Primary navigation (wide viewports only) */}
        <nav className="hidden shrink-0 items-center gap-0.5 xl:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Button key={link.href} asChild variant="ghost">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        {/* Search + account */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SearchBox />
          <ThemeToggle />
          {user ? (
            <UserMenu
              name={user.name ?? "Fan"}
              email={user.email ?? ""}
              avatarUrl={user.image ?? null}
              role={user.role ?? null}
            />
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="h-10">
                <Link href="/register">Join free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}