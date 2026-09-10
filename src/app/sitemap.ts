import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://goaledge.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  // Include shared bet slip pages
  try {
    const slips = await db.sharedSlip.findMany({
      select: { slug: true, updatedAt: true },
      take: 200,
    });
    const slipRoutes: MetadataRoute.Sitemap = slips.map((s) => ({
      url: `${baseUrl}/slip/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
    return [...staticRoutes, ...slipRoutes];
  } catch {
    return staticRoutes;
  }
}
