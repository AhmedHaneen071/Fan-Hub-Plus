// ---------------------------------------------------------------------------
// Fan Hub Plus — mobile navigation (client)
// Slide-in sheet with search, main destinations and the fandom list for small
// viewports where the inline header nav is hidden.
// ---------------------------------------------------------------------------

"use client";

import Link from "next/link";
import { ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SearchBox } from "./search-box";
import type { BrowseItem } from "./browse-menu";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Characters", href: "/characters" },
  { label: "Articles", href: "/articles" },
  { label: "Merch", href: "/merch" },
  { label: "Events", href: "/events" },
  { label: "Ask the hub", href: "/chatbot" },
];

export function MobileNav({ categories }: { categories: BrowseItem[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Fan Hub Plus</SheetTitle>
          <SheetDescription>Jump to any corner of the hub.</SheetDescription>
        </SheetHeader>
        <SearchBox className="relative mt-4 block w-full" />
        <nav aria-label="Mobile" className="mt-4 flex flex-col gap-0.5">
          {LINKS.map((link) => (
            <Button key={link.href} asChild variant="ghost" className="justify-start">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>
        {categories.length > 0 ? (
          <div className="mt-5 border-t pt-4">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Browse fandoms
            </p>
            <ul className="flex flex-col">
              {categories.map((category) => (
                <li key={category.name}>
                  <Link
                    href={`/explore?category=${encodeURIComponent(category.name)}`}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {category.label}
                    <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}