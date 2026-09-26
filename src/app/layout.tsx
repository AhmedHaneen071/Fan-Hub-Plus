import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Poppins, Righteous } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

/* Body font — Poppins for readable, friendly UI text */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

/* Display font — Righteous gives headings a bold, fandom-brand feel */
const righteous = Righteous({
  variable: "--font-righteous",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Fan Hub Plus",
    template: "%s | Fan Hub Plus",
  },
  description:
    "Fan Hub Plus — the community hub for anime, gaming, movies, K-pop and more.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${righteous.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}