// ---------------------------------------------------------------------------
// Fan Hub Plus — header search (Phase 10 / Prime redesign)
// A prominent centred search box with an in-field submit button. Sends the
// query straight to the explorer's ?q= parameter, reusing its pipeline.
// ---------------------------------------------------------------------------

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBox({
  className = "relative hidden w-full max-w-md flex-none sm:block xl:max-w-sm",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  }

  return (
    <form
      role="search"
      className={className}
      onSubmit={submit}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search fandoms, shows & more…"
        aria-label="Search the hub"
        className="h-10 w-full rounded-full bg-background pl-10 pr-11 text-sm shadow-sm"
        enterKeyHint="search"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}