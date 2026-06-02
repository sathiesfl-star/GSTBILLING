import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gstbilling-omega.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only public marketing pages belong in the sitemap (app pages are gated/noindex).
  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/register`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/login`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
