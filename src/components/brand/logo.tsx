import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fan Hub Plus brand mark. `size` picks the text scale so the same logo works
 * in the header, auth pages and footer.
 */
export function Logo({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  } as const;

  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2", className)}
      aria-label="Fan Hub Plus — go to homepage"
    >
      {/* Decorative mark only; the brand name next to it is the readable label */}
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <span className={cn("font-heading leading-none tracking-wide", sizes[size])}>
        Fan Hub <span className="text-primary">Plus</span>
      </span>
    </Link>
  );
}