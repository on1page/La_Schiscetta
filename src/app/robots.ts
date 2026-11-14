// =====================================================================
// robots.ts - Esclude l'area admin e indica la sitemap (spec 6.1).
// Nota deploy: in produzione, con rotte reali lato server, estendere
// l'elenco alle pagine pubbliche; l'area admin resta SEMPRE esclusa.
// =====================================================================
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/admin/"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://laschiscetta.example.it"}/sitemap.xml`,
  };
}
