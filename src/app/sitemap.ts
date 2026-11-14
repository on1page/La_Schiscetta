// =====================================================================
// sitemap.ts - Sitemap dinamica (rigenerata a ogni build/request).
// In questa build sandbox l'app è servita da "/" con navigazione hash;
// in produzione ogni vista mappa a una rotta reale del App Router e
// va aggiunta qui con lastModified da DB (menu/blog).
// =====================================================================
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://laschiscetta.example.it";
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
