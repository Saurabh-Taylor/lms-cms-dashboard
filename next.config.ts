import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@learnhub/contracts"],
  turbopack: {
    // @learnhub/contracts is a link: dep into the sibling backend repo —
    // Turbopack only resolves symlinks under its root.
    root: path.join(import.meta.dirname, ".."),
  },
};

export default nextConfig;
