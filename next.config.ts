import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the user home dir makes Next mis-infer the workspace root.
  turbopack: {
    root: path.join(__dirname),
  },
  // Bundling pdf-parse breaks pdfjs's worker resolution — load it from node_modules.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
