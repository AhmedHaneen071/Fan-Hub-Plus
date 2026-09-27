import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const categoryLinks = [
  { label: "Anime", href: "/explore?category=ANIME" },
  { label: "Gaming", href: "/explore?category=GAMING" },
  { label: "Movies", href: "/explore?category=MOVIES" },
  { label: "TV Shows", href: "/explore?category=TV_SHOWS" },
  { label: "K-Pop", href: "/explore?category=KPOP" },
  { label: "Comics", href: "/explore?category=COMICS" },
  { label: "Manga", href: "/explore?category=MANGA" },
  { label: "Cosplay", href: "/explore?category=COSPLAY" },
];

const resourceLinks = [
  { label: "Content Explorer", href: "/explore" },
  { label: "Upcoming releases", href: "/upcoming" },
  { label: "Characters", href: "/characters" },
  { label: "Articles", href: "/articles" },
  { label: "Merchandise", href: "/merch" },
  { label: "Events", href: "/events" },
  { label: "Chat with the hub", href: "/chatbot" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Sitemap", href: "/sitemap" },
];

/**
 * Footer with the category sitemap required by Phase 2 (kept linked now so the
 * homepage has a visible site map of every fandom from day one).
 */
export function SiteFooter() {
  return (
    <footer className="border-t bg-foreground text-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand + blurb */}
          <div className="space-y-4">
            <div className="[&_a]:text-background">
              <Logo size="sm" />
            </div>
            <p className="max-w-xs text-sm text-background/75">
              The community hub for anime, gaming, movies, TV, K-pop, comics,
              manga and cosplay.
            </p>
          </div>

          {/* Category sitemap */}
          <nav aria-label="Fandoms">
            <h2 className="font-heading text-sm tracking-wide text-background/90">
              Fandoms
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-background/75">
              {categoryLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition-colors hover:text-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Other resources */}
          <nav aria-label="Resources">
            <h2 className="font-heading text-sm tracking-wide text-background/90">
              Explore
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-background/75">
              {resourceLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition-colors hover:text-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-background/15 pt-6 text-xs text-background/60">
          <p>
            © {new Date().getFullYear()} Fan Hub Plus · Student showcase ·
            TechWiz 7 — End-to-End Web Solutions.
          </p>
        </div>
      </div>
    </footer>
  );
}
