import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  let base = "http://localhost:3000";
  try {
    const value = process.env.APP_URL;
    if (value && /^https?:\/\//i.test(value)) base = new URL(value).origin;
  } catch { /* keep local fallback */ }
  return {
    rules: { userAgent: "*", allow: ["/", "/articles/", "/content/", "/characters/", "/merch/"], disallow: ["/admin", "/dashboard", "/profile", "/submit", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
