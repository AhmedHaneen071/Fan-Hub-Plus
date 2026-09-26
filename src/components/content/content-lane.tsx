"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/explore/content-card";
import type { ContentCardItem } from "@/lib/queries/content";

const CARD_WIDTH = 264; // w-64 + gap
const SCROLL_STEP = CARD_WIDTH * 2;

// Prime-style horizontal shelf: header + arrow-scrollable row of cards.
export function ContentLane({
  title,
  href,
  items,
}: {
  title: string;
  href?: string;
  items: ContentCardItem[];
}) {
  const railRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scrollBy = (direction: 1 | -1) => {
    railRef.current?.scrollBy({
      left: direction * SCROLL_STEP,
      behavior: "smooth",
    });
  };

  return (
    <section
      aria-label={title}
      className="group/lane w-full overflow-hidden py-1"
    >
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="font-heading text-xl tracking-wide sm:text-2xl">
          {title}
        </h2>
        {href ? (
          <Button asChild variant="link" className="h-auto p-0 text-sm">
            <Link href={href}>
              See all <span aria-hidden="true">→</span>
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label={`Scroll ${title} left`}
          onClick={() => scrollBy(-1)}
          className="absolute -left-3 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg ring-1 ring-ring/20 backdrop-blur transition hover:bg-primary hover:text-white md:flex md:invisible md:group-hover/lane:visible"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>

        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto px-1 pb-2 pt-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={item.id} className="w-64 shrink-0 snap-start">
              <ContentCard item={item} widthClass="w-64" />
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label={`Scroll ${title} right`}
          onClick={() => scrollBy(1)}
          className="absolute -right-3 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg ring-1 ring-ring/20 backdrop-blur transition hover:bg-primary hover:text-white md:flex md:invisible md:group-hover/lane:visible"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}