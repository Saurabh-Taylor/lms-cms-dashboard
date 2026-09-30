import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone bundle for the production Docker image (deploy/compose.prod.yml).
  output: "standalone",
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@microshala/contracts"],
  turbopack: {
    // @microshala/contracts is a link: dep into the sibling backend repo —
    // Turbopack only resolves symlinks under its root.
    root: path.join(import.meta.dirname, ".."),
  },
};

export default nextConfig;
