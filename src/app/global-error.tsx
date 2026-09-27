"use client";

import Link from "next/link";
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="en"><body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", background: "#fff1f2", color: "#881337" }}>
    <main style={{ maxWidth: 560, padding: 32 }}><h1>Fan Hub Plus needs a moment</h1><p>The page could not be loaded. You can retry safely or return to the home page.</p><button onClick={retry} style={{ padding: "10px 16px", marginRight: 8 }}>Try again</button><Link href="/" style={{ color: "#2563eb" }}>Go home</Link></main>
  </body></html>;
}
