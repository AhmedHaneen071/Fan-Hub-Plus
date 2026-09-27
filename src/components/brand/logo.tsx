import Link from "next/link";
import Image from "next/image";
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
      <Image src="/logo.png" alt="" width={48} height={32} className="h-8 w-12 object-contain" priority />
      <span className={cn("font-heading leading-none tracking-wide", sizes[size])}>
        Fan Hub <span className="text-primary">Plus</span>
      </span>
    </Link>
  );
}
