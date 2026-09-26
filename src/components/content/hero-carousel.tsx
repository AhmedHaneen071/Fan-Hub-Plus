"use client";

// ---------------------------------------------------------------------------
// Fan Hub Plus — Prime-style hero carousel
// Auto-advancing full-bleed slides over wide backdrop art, with arrows, dots
// and a progress bar. Pauses on hover so text stays readable.
// ---------------------------------------------------------------------------

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, CONTENT_TYPE_LABELS } from "@/lib/constants";
import type { ContentCardItem } from "@/lib/queries/content";

const AUTOPLAY_MS = 7000;

export function HeroCarousel({ slides }: { slides: ContentCardItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = slides.length;

  const go = useCallback(
    (dir: 1 | -1) => setIndex((current) => (current + dir + count) % count),
    [count],
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    timer.current = setInterval(() => setIndex((c) => (c + 1) % count), AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, count]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured content"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative h-[62vh] min-h-[480px] max-h-[680px] w-full overflow-hidden bg-foreground"
    >
      {/* Slides */}
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.id}
            aria-hidden={!active}
            className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <div className="absolute inset-0">
              {slide.backdrop_url ? (
                <Image
                  src={slide.backdrop_url}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="object-cover"
                />
              ) : (
                <div className="size-full bg-gradient-to-br from-rose-700/70 via-rose-100 to-accent/40" />
              )}
            </div>
            {/* Cinematic grading: dark edges, rose glow, bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/55 to-foreground/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground via-transparent to-foreground/40" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 top-0 size-[36rem] rounded-full bg-primary/30 blur-3xl"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>
        );
      })}

      {/* Foreground */}
      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-4 pb-24 sm:px-6">
        <div key={index} className="max-w-2xl animate-[fadeUp_0.5s_ease-out_both]">
          {slides[index] && (
            <>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
                <span className="h-px w-8 bg-rose-400" aria-hidden="true" />
                Featured{" "}
                {slides[index].category
                  ? CATEGORY_LABELS[slides[index].category.name]
                  : "fandom"}
              </span>
              <h1 className="mt-2 font-heading text-4xl leading-tight text-foreground drop-shadow-sm sm:text-5xl lg:text-6xl">
                {slides[index].title}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {CONTENT_TYPE_LABELS[slides[index].type]}
                </Badge>
                {slides[index].genre ? (
                  <span>{slides[index].genre}</span>
                ) : null}
                {slides[index].release_date ? (
                  <span>{slides[index].release_date.getFullYear()}</span>
                ) : null}
                <span className="font-semibold text-rose-500 dark:text-rose-300">
                  Heat {slides[index].popularity_score}
                </span>
              </p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground line-clamp-3 sm:text-base">
                {slides[index].description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 gap-2 px-7">
                  <Link href={`/content/${slides[index].id}`}>
                    <Play className="size-5 fill-current" aria-hidden="true" />
                    Watch now
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-foreground/20 px-6 text-foreground hover:bg-foreground/10"
                >
                  <Link href={`/content/${slides[index].id}`}>Details</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground shadow-lg ring-1 ring-ring/20 backdrop-blur transition hover:bg-primary hover:text-white sm:left-5"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground shadow-lg ring-1 ring-ring/20 backdrop-blur transition hover:bg-primary hover:text-white sm:right-5"
          >
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
        </>
      )}

      {/* Dots */}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${i + 1}: ${slide.title}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-8 bg-rose-500"
                  : "w-2 bg-foreground/40 hover:bg-foreground/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}