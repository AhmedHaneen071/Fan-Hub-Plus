"use client";

// ---------------------------------------------------------------------------
// Fan Hub Plus — Browse dropdown (Prime-style category menu)
// Lets visitors jump straight into any fandom column from the header.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { ChevronDown, LayoutGrid } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type BrowseItem = {
  name: string;
  label: string;
  count: number;
};

export function BrowseMenu({ items }: { items: BrowseItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <LayoutGrid className="size-4" aria-hidden="true" />
        Browse
        <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 p-1.5">
        <DropdownMenuLabel>Fandoms</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.name} asChild>
            <Link
              href={`/explore?category=${encodeURIComponent(item.name)}`}
              className="justify-between"
            >
              <span>{item.label}</span>
              <span className="text-xs text-muted-foreground">
                {item.count}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/explore" className="font-semibold text-primary">
            All content →
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}