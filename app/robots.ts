import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gstbilling-omega.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Don't crawl the authenticated app or API — only marketing pages.
      disallow: ["/dashboard", "/invoices", "/invoice/", "/customers", "/items", "/reports", "/settings", "/onboarding", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
