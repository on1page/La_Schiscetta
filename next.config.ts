import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // pdfkit porta file .afm e xlsx moduli CJS: vanno risolti a runtime
  // da node_modules senza essere bundlizzati da Turbopack/webpack.
  serverExternalPackages: ["pdfkit", "xlsx"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
