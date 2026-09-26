import type { ReactNode } from "react";
import { Compass, Star, Globe2, CalendarDays } from "lucide-react";
import { Logo } from "@/components/brand/logo";

/**
 * Shared layout for the auth screens (login/register/password flows).
 * A branded left panel sells the product while the right side hosts the form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* ---- Brand panel (hidden on small screens to keep forms focused) ---- */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <Logo size="md" />

        <div>
          <h2 className="max-w-sm font-heading text-4xl leading-tight text-primary-foreground">
            Every fandom, one hub.
          </h2>
          <p className="mt-4 max-w-sm text-primary-foreground/85">
            Anime, gaming, movies, K-pop and more — bookmarks, ratings, events
            and fan content in one beautifully organised place.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <Feature icon={Compass} text="Discover content by your favourite fandoms" />
            <Feature icon={Star} text="Rate, bookmark and comment in one click" />
            <Feature icon={CalendarDays} text="Find fandom events happening near you" />
            <Feature icon={Globe2} text="8 categories from anime to cosplay" />
          </ul>
        </div>

        <p className="text-xs text-primary-foreground/70">
          Fan Hub Plus — TechWiz 7 end-to-end web showcase
        </p>
      </aside>

      {/* ---- Form panel ---- */}
      <main className="flex items-center justify-center bg-background px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo size="sm" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof Star; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </li>
  );
}