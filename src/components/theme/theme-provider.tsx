// ---------------------------------------------------------------------------
// Fan Hub Plus — theme provider (Phase 8 dark mode)
// Thin wrapper around next-themes so the root layout stays a server
// component. Class-based theming so the design tokens in globals.css apply.
// ---------------------------------------------------------------------------

"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}